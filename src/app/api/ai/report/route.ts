import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';
import { callLLM, parseJSONResponse } from '@/lib/ai-agent';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

// ──────────────────────────────────────
// POST /api/ai/report — Generate performance report
// ──────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const { period = 'daily' } = body;

    if (!['daily', 'weekly', 'monthly'].includes(period)) {
      return NextResponse.json(
        { error: 'period must be daily, weekly, or monthly' },
        { status: 400 },
      );
    }

    // Calculate date range
    const now = new Date();
    let startDate = new Date(now);
    if (period === 'daily') {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'weekly') {
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate.setDate(now.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
    }

    // Fetch stats
    const where = {
      createdAt: { gte: startDate, lte: now },
      ...(session.user.role === 'SALES_REP' ? { assignedRepId: session.user.id } : {}),
    };

    const [
      totalLeads,
      newLeads,
      convertedLeads,
      lostLeads,
      totalCalls,
      answeredCalls,
      followUps,
      completedFollowUps,
      escalatedFollowUps,
    ] = await Promise.all([
      db.lead.count({ where }),
      db.lead.count({ where: { ...where, status: 'NEW' } }),
      db.lead.count({ where: { ...where, status: 'BOOKED' } }),
      db.lead.count({ where: { ...where, status: 'LOST' } }),
      db.call.count({ where: { callTimestamp: { gte: startDate, lte: now } } }),
      db.call.count({ where: { callTimestamp: { gte: startDate, lte: now }, outcome: 'ANSWERED' } }),
      db.followUp.count({ where: { createdAt: { gte: startDate, lte: now } } }),
      db.followUp.count({ where: { createdAt: { gte: startDate, lte: now }, status: 'COMPLETED' } }),
      db.followUp.count({ where: { createdAt: { gte: startDate, lte: now }, status: 'ESCALATED' } }),
    ]);

    const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : '0.0';
    const callAnswerRate = totalCalls > 0 ? ((answeredCalls / totalCalls) * 100).toFixed(1) : '0.0';
    const followUpRate = followUps > 0 ? ((completedFollowUps / followUps) * 100).toFixed(1) : '0.0';

    // Rep performance (for admin/super admin)
    let repPerformance = '';
    if (session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN') {
      const reps = await db.user.findMany({
        where: { role: 'SALES_REP', isActive: true },
        select: { id: true, name: true },
      });

      const repStats = await Promise.all(
        reps.map(async (rep) => {
          const repCalls = await db.call.count({
            where: { repId: rep.id, callTimestamp: { gte: startDate, lte: now } },
          });
          const repConversions = await db.lead.count({
            where: { assignedRepId: rep.id, status: 'BOOKED', updatedAt: { gte: startDate, lte: now } },
          });
          const repLeads = await db.lead.count({
            where: { assignedRepId: rep.id, createdAt: { gte: startDate, lte: now } },
          });
          return `${rep.name}: ${repLeads} leads, ${repCalls} calls, ${repConversions} conversions`;
        }),
      );
      repPerformance = repStats.join('\n');
    }

    // Lead source breakdown
    const leadSources = await db.lead.groupBy({
      by: ['source'],
      where: { createdAt: { gte: startDate, lte: now } },
      _count: { id: true },
    });
    const sourceBreakdown = leadSources.map((s) => `${s.source}: ${s._count.id}`).join(', ');

    const prompt = `Generate a ${period} performance report for Sports Pavilion Rawalpindi CRM.

Period: ${period} (${startDate.toLocaleDateString()} to ${now.toLocaleDateString()})

Key Metrics:
- Total Leads: ${totalLeads}
- New Leads: ${newLeads}
- Conversions (BOOKED): ${convertedLeads}
- Lost Leads: ${lostLeads}
- Conversion Rate: ${conversionRate}%
- Total Calls: ${totalCalls}
- Calls Answered: ${answeredCalls} (${callAnswerRate}%)
- Follow-ups Created: ${followUps}
- Follow-ups Completed: ${completedFollowUps} (${followUpRate}%)
- Escalations: ${escalatedFollowUps}
- Lead Sources: ${sourceBreakdown}
${repPerformance ? `\nRep Performance:\n${repPerformance}` : ''}

Please generate a comprehensive performance report with analysis and recommendations.`;

    const systemPrompt = `You are the Reporting Agent for Sports Pavilion Rawalpindi CRM. Generate professional performance reports.

Include:
1. Executive summary (3-4 sentences)
2. Key metrics with context
3. Trend observations
4. Rep performance highlights (if available)
5. 3-5 specific, actionable recommendations
6. Pipeline health assessment

RESPOND ONLY WITH JSON:
{
  "summary": "<executive summary>",
  "metrics": {"totalLeads": <n>, "conversions": <n>, "conversionRate": "<%>", "calls": <n>, "callAnswerRate": "<%>"},
  "trends": [{"metric": "<name>", "observation": "<observation>"}],
  "topReps": [{"name": "<name>", "calls": <n>, "conversions": <n>}],
  "recommendations": ["<rec1>", "<rec2>", "<rec3>"],
  "pipelineHealth": "<HEALTHY|WARNING|CRITICAL>",
  "detailedReport": "<markdown formatted full report>"
}`;

    const llmResponse = await callLLM(prompt, systemPrompt, { temperature: 0.5, maxTokens: 800 });

    let report;
    try {
      report = parseJSONResponse(llmResponse) as {
        summary: string;
        metrics: Record<string, unknown>;
        trends: { metric: string; observation: string }[];
        topReps: { name: string; calls: number; conversions: number }[];
        recommendations: string[];
        pipelineHealth: string;
        detailedReport: string;
      };
    } catch {
      // Fallback report
      report = {
        summary: `${period.charAt(0).toUpperCase() + period.slice(1)} report: ${totalLeads} leads with ${conversionRate}% conversion rate. ${escalatedFollowUps} escalations need attention.`,
        metrics: { totalLeads, conversions: convertedLeads, conversionRate: `${conversionRate}%`, calls: totalCalls, callAnswerRate: `${callAnswerRate}%` },
        trends: [{ metric: 'Conversions', observation: `${convertedLeads} out of ${totalLeads}` }],
        topReps: [],
        recommendations: [
          escalatedFollowUps > 0 ? 'Address escalated follow-ups immediately' : 'Continue current follow-up cadence',
          parseInt(callAnswerRate) < 50 ? 'Improve call answer rate with better timing' : 'Good call engagement, maintain it',
          'Focus on hot leads for quick conversions',
        ],
        pipelineHealth: convertedLeads > lostLeads ? 'HEALTHY' : 'WARNING',
        detailedReport: `## ${period.toUpperCase()} PERFORMANCE REPORT\n\n### Summary\n${totalLeads} leads processed, ${convertedLeads} converted (${conversionRate}%).\n\n### Recommendations\n- Address escalated follow-ups\n- Improve call follow-through`,
      };
    }

    // Create AI insight with the report summary
    await db.aIInsight.create({
      data: {
        agentId: 5,
        insightType: 'SUGGESTION',
        description: `${period.charAt(0).toUpperCase() + period.slice(1)} Report: ${report.summary}`,
        dataPoints: totalLeads + totalCalls + followUps,
        confidenceScore: 0.85,
        proposedChange: report.recommendations.join('; '),
        expectedImpact: 'Improved sales performance',
        status: 'PENDING_REVIEW',
      },
    });

    // Audit log
    await createAuditLog({
      actorType: 'AI_AGENT',
      actorId: '5',
      actorName: 'Reporting Agent',
      entityType: 'SETTING',
      action: 'UPDATE',
      fieldChanged: 'performance_report',
      newValue: `${period} report generated - Pipeline: ${report.pipelineHealth}`,
      remarks: report.summary,
    });

    return NextResponse.json({
      report,
      period,
      generatedAt: new Date().toISOString(),
      dateRange: {
        from: startDate.toISOString(),
        to: now.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    const message = error instanceof Error ? error.message : 'Failed to generate report';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

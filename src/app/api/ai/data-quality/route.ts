import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth-helpers';
import { callLLM, parseJSONResponse, AI_AGENT_DEFINITIONS } from '@/lib/ai-agent';

export async function POST() {
  try {
    const session = await requireRole('ADMIN');

    // Gather data quality metrics
    const totalLeads = await db.lead.count();
    const leadsMissingEmail = await db.lead.count({ where: { email: null } });
    const leadsMissingBudget = await db.lead.count({ where: { budgetRange: null } });
    const leadsUnassigned = await db.lead.count({ where: { assignedRepId: null } });
    const hotLeads = await db.lead.count({ where: { temperature: 'HOT' } });
    const coldLeads = await db.lead.count({ where: { temperature: 'COLD' } });

    const twoDaysAgo = new Date();
    twoDaysAgo.setHours(twoDaysAgo.getHours() - 48);
    const overdueFollowUps = await db.followUp.count({
      where: { status: 'PENDING', dueDatetime: { lt: twoDaysAgo } }
    });
    const pendingFollowUps = await db.followUp.count({ where: { status: 'PENDING' } });
    const escalatedFollowUps = await db.followUp.count({ where: { status: 'ESCALATED' } });

    const totalCalls = await db.call.count();
    const callsWithAnalysis = await db.call.count({ where: { aiSentiment: { not: null } } });

    // Get agent definition
    const agent = AI_AGENT_DEFINITIONS.find(a => a.id === 6);

    // Build prompt with real data
    const prompt = `Analyze this CRM data quality:

Total Leads: ${totalLeads}
Leads Missing Email: ${leadsMissingEmail}
Leads Missing Budget: ${leadsMissingBudget}
Unassigned Leads: ${leadsUnassigned}
Hot Leads: ${hotLeads}
Cold Leads: ${coldLeads}
Total Follow-Ups Pending: ${pendingFollowUps}
Overdue Follow-Ups (>48h): ${overdueFollowUps}
Escalated Follow-Ups: ${escalatedFollowUps}
Total Calls: ${totalCalls}
Calls with AI Analysis: ${callsWithAnalysis}

Provide a comprehensive data quality audit.`;

    const response = await callLLM(prompt, agent?.systemPrompt ?? '', {
      temperature: agent?.temperature ?? 0.3,
      maxTokens: agent?.maxTokens ?? 600,
    });

    const result = parseJSONResponse(response);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: 'Data quality analysis failed' }, { status: 500 });
  }
}

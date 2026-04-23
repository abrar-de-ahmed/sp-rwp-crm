import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';
import { callLLM, parseJSONResponse } from '@/lib/ai-agent';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

// ──────────────────────────────────────
// POST /api/ai/followup-suggest — Suggest follow-up
// ──────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const { leadId } = body;

    if (!leadId) {
      return NextResponse.json(
        { error: 'leadId is required' },
        { status: 400 },
      );
    }

    // Fetch lead with related data
    const lead = await db.lead.findUnique({
      where: { id: leadId },
      include: {
        assignedRep: { select: { name: true } },
        calls: {
          orderBy: { callTimestamp: 'desc' },
          take: 3,
          select: { outcome: true, repRemarks: true, callTimestamp: true, aiSummary: true },
        },
        conversations: {
          orderBy: { timestamp: 'desc' },
          take: 5,
          select: { messageText: true, direction: true, channel: true, timestamp: true },
        },
        followUps: {
          orderBy: { dueDatetime: 'desc' },
          take: 3,
          select: { status: true, priority: true, dueDatetime: true, completionNotes: true },
        },
      },
    });

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 },
      );
    }

    // Build context for the AI
    const facilities = JSON.parse(lead.interestedFacilities || '[]') as string[];
    const lastInteraction = [
      ...lead.conversations.map((c) => ({ type: 'message', time: c.timestamp })),
      ...lead.calls.map((c) => ({ type: 'call', time: c.callTimestamp })),
    ].sort((a, b) => b.time.getTime() - a.time.getTime())[0];

    const hoursSinceLastInteraction = lastInteraction
      ? (Date.now() - lastInteraction.time.getTime()) / (1000 * 60 * 60)
      : 999;

    const prompt = `Suggest a follow-up plan for this lead:

Lead Info:
- Name: ${lead.firstName} ${lead.lastName}
- Score: ${lead.leadScore} (${lead.temperature})
- Status: ${lead.status}
- Source: ${lead.source}
- Type: ${lead.leadType}
- Budget: ${lead.budgetRange || 'Not disclosed'}
- Interested in: ${facilities.join(', ') || 'Not specified'}
- Assigned to: ${lead.assignedRep?.name || 'Unassigned'}
- Hours since last interaction: ${Math.round(hoursSinceLastInteraction)}

Recent Calls:
${lead.calls.map((c) => `- ${c.outcome} on ${c.callTimestamp.toLocaleDateString()}: ${c.repRemarks || c.aiSummary || 'No notes'}`).join('\n') || 'No calls yet'}

Recent Messages:
${lead.conversations.map((c) => `- ${c.direction} (${c.channel}) on ${c.timestamp.toLocaleDateString()}: "${c.messageText.substring(0, 100)}"`).join('\n') || 'No messages yet'}

Past Follow-ups:
${lead.followUps.map((f) => `- ${f.status} (priority: ${f.priority}) due ${f.dueDatetime.toLocaleDateString()}: ${f.completionNotes || 'No notes'}`).join('\n') || 'No follow-ups yet'}

Now: ${new Date().toLocaleString()}

Please suggest the optimal follow-up plan.`;

    const systemPrompt = `You are the Follow-Up Agent for Sports Pavilion Rawalpindi CRM. Suggest follow-up timing and messaging.

Rules:
- HOT leads (score >= 70): Follow up within 1 hour, priority URGENT
- WARM leads (score 40-69): Follow up within 24 hours, priority HIGH
- COLD leads (score < 40): Follow up within 3 days, priority NORMAL
- If last interaction > 48 hours ago: Increase urgency by one level
- Provide a personalized message based on the lead's interests
- Channel choice: Use WhatsApp for most leads, Phone for HOT, Email for corporate

RESPOND ONLY WITH JSON:
{
  "suggestedDatetime": "<ISO datetime>",
  "priority": "<URGENT|HIGH|NORMAL|LOW>",
  "message": "<suggested message>",
  "channel": "<WHATSAPP|PHONE|EMAIL>",
  "reason": "<brief explanation>"
}`;

    const llmResponse = await callLLM(prompt, systemPrompt, { temperature: 0.4, maxTokens: 300 });

    let suggestion;
    try {
      suggestion = parseJSONResponse(llmResponse) as {
        suggestedDatetime: string;
        priority: string;
        message: string;
        channel: string;
        reason: string;
      };
    } catch {
      // Fallback suggestion
      const now = new Date();
      let hoursToAdd = lead.temperature === 'HOT' ? 1 : lead.temperature === 'WARM' ? 24 : 72;
      if (hoursSinceLastInteraction > 48) hoursToAdd = Math.min(hoursToAdd, 4);

      suggestion = {
        suggestedDatetime: new Date(now.getTime() + hoursToAdd * 60 * 60 * 1000).toISOString(),
        priority: lead.temperature === 'HOT' ? 'URGENT' : lead.temperature === 'WARM' ? 'HIGH' : 'NORMAL',
        message: `Hi ${lead.firstName}, this is ${lead.assignedRep?.name || 'the team'} from Sports Pavilion Rawalpindi. ${lead.temperature === 'HOT' ? 'Following up on your recent inquiry about ' + (facilities[0] || 'our facilities') + '. Would you like to schedule a visit?' : 'We wanted to check if you\'re still interested in our ' + (facilities.join(', ') || 'facilities') + '. Feel free to reach out!'}`,
        channel: lead.temperature === 'HOT' ? 'PHONE' : 'WHATSAPP',
        reason: `Based on ${lead.temperature} temperature (${lead.leadScore} score) and ${Math.round(hoursSinceLastInteraction)}h since last interaction.`,
      };
    }

    // Audit log
    await createAuditLog({
      actorType: 'AI_AGENT',
      actorId: '4',
      actorName: 'Follow-Up Agent',
      entityType: 'LEAD',
      entityId: leadId,
      action: 'UPDATE',
      fieldChanged: 'followup_suggestion',
      newValue: `${suggestion.priority} at ${suggestion.suggestedDatetime} via ${suggestion.channel}`,
      remarks: suggestion.reason,
    });

    return NextResponse.json({
      suggestion: {
        ...suggestion,
        leadId,
        leadName: `${lead.firstName} ${lead.lastName}`,
        leadScore: lead.leadScore,
        temperature: lead.temperature,
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    const message = error instanceof Error ? error.message : 'Failed to generate follow-up suggestion';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

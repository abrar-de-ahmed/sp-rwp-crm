import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';
import { callLLM, parseJSONResponse, calculateLeadScore } from '@/lib/ai-agent';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

// ──────────────────────────────────────
// POST /api/ai/score-lead — Score a lead
// ──────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const { leadId, firstName, lastName, messageText, source, leadType, interestedFacilities, budgetRange, messageCount, conversationHistory } = body;

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: 'firstName and lastName are required' },
        { status: 400 },
      );
    }

    // Calculate rule-based score first
    const ruleBasedScore = calculateLeadScore({
      firstName,
      lastName,
      messageText,
      source,
      leadType,
      interestedFacilities,
      budgetRange,
      messageCount,
      conversationHistory,
    });

    // Build prompt for AI scoring
    const scoringInput = {
      firstName,
      lastName,
      source: source || 'MANUAL_IMPORT',
      leadType: leadType || 'OTHER',
      interestedFacilities: interestedFacilities || [],
      budgetRange: budgetRange || null,
      messageCount: messageCount || 1,
      recentMessages: messageText || conversationHistory || 'No messages yet',
    };

    const prompt = `Score this lead for Sports Pavilion Rawalpindi:

Lead Info:
- Name: ${scoringInput.firstName} ${scoringInput.lastName}
- Source: ${scoringInput.source}
- Type: ${scoringInput.leadType}
- Budget: ${scoringInput.budgetRange || 'Not disclosed'}
- Facilities: ${scoringInput.interestedFacilities.join(', ') || 'None specified'}
- Message count: ${scoringInput.messageCount}
- Recent messages: "${scoringInput.recentMessages}"

Rule-based pre-score: ${ruleBasedScore.score} (${ruleBasedScore.temperature})
Rule-based factors: ${ruleBasedScore.factors.map((f) => `${f.criterion}: ${f.points > 0 ? '+' : ''}${f.points}`).join(', ')}

Please analyze this lead and provide your final score, temperature, and reasoning.`;

    const systemPrompt = `You are the Lead Scoring Engine for Sports Pavilion Rawalpindi CRM. Analyze the lead data and return a JSON score.

Scoring criteria (additive, clamp to 0-100):
- Mentions specific facility: +15
- States budget: +20
- Wants family membership: +15
- Immediate urgency: +25
- Corporate inquiry: +20
- From paid Meta Ad: +10
- Referred: +15
- Asked about pricing: +10
- Multiple messages: +5 per msg beyond first
- Weekend/day pass only: -10

Temperature: HOT (>=70), WARM (40-69), COLD (<40)

Consider the rule-based pre-score but use your judgment to adjust if needed.

RESPOND ONLY WITH JSON: {"score": <number>, "temperature": "<HOT|WARM|COLD>", "reason": "<brief explanation>"}`;

    const llmResponse = await callLLM(prompt, systemPrompt, { temperature: 0.2, maxTokens: 200 });

    let aiScore;
    try {
      aiScore = parseJSONResponse(llmResponse) as { score: number; temperature: string; reason: string };
    } catch {
      // Fallback to rule-based score
      aiScore = {
        score: ruleBasedScore.score,
        temperature: ruleBasedScore.temperature,
        reason: 'AI analysis unavailable. Used rule-based scoring.',
      };
    }

    const finalScore = Math.max(0, Math.min(100, aiScore.score || ruleBasedScore.score));
    const finalTemperature = ['HOT', 'WARM', 'COLD'].includes(aiScore.temperature)
      ? aiScore.temperature
      : ruleBasedScore.temperature;

    // Update lead in DB if leadId provided
    if (leadId) {
      // Ownership check: SALES_REP can only score their own leads
      if (session.user.role === 'SALES_REP') {
        const lead = await db.lead.findUnique({ where: { id: leadId }, select: { assignedRepId: true } });
        if (!lead || lead.assignedRepId !== session.user.id) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }
      await db.lead.update({
        where: { id: leadId },
        data: {
          leadScore: finalScore,
          temperature: finalTemperature,
        },
      });

      // Create audit log
      await createAuditLog({
        actorType: 'AI_AGENT',
        actorId: '1',
        actorName: 'Lead Scoring Engine',
        entityType: 'LEAD',
        entityId: leadId,
        action: 'UPDATE',
        fieldChanged: 'lead_score',
        newValue: `${finalScore} (${finalTemperature})`,
        remarks: aiScore.reason || 'AI lead scoring completed',
      });
    }

    return NextResponse.json({
      score: finalScore,
      temperature: finalTemperature,
      reason: aiScore.reason || 'Scoring completed',
      ruleBasedScore: ruleBasedScore.score,
      factors: ruleBasedScore.factors,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    const message = error instanceof Error ? error.message : 'Failed to score lead';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

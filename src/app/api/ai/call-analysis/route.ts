import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';
import { callLLM, parseJSONResponse } from '@/lib/ai-agent';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

// ──────────────────────────────────────
// POST /api/ai/call-analysis — Analyze call recording
// ──────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const { callId, recordingUrl, transcriptText } = body;

    if (!callId) {
      return NextResponse.json(
        { error: 'callId is required' },
        { status: 400 },
      );
    }

    // Fetch call details
    const call = await db.call.findUnique({
      where: { id: callId },
      include: {
        lead: {
          select: { firstName: true, lastName: true, source: true, interestedFacilities: true },
        },
        rep: {
          select: { name: true },
        },
      },
    });

    if (!call) {
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 },
      );
    }

    // Ownership check: SALES_REP can only analyze their own calls
    if (session.user.role === 'SALES_REP' && call.repId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Use provided transcript or existing one
    const transcript = transcriptText || call.transcriptText || '';

    if (!transcript.trim()) {
      return NextResponse.json(
        { error: 'No transcript available for analysis. Please provide transcriptText or recordingUrl.' },
        { status: 400 },
      );
    }

    const prompt = `Analyze this phone call transcript for Sports Pavilion Rawalpindi:

Call Details:
- Lead: ${call.lead.firstName} ${call.lead.lastName}
- Source: ${call.lead.source}
- Rep: ${call.rep.name}
- Duration: ${call.durationSeconds}s
- Direction: ${call.direction}
- Outcome: ${call.outcome}

Transcript:
"${transcript}"

Please extract structured analysis from this call.`;

    const systemPrompt = `You are the Call Monitoring Agent for Sports Pavilion Rawalpindi CRM. Analyze call transcripts and extract structured data.

Extract:
1. Customer interest: Which facilities are they interested in?
2. Budget: Any budget mentioned or implied?
3. Objections: What concerns did the customer raise?
4. Timeline: When do they want to start/visit?
5. Sentiment: POSITIVE, NEUTRAL, or NEGATIVE
6. Coaching flags: Did the rep miss opportunities or need improvement?
7. Summary: A 2-3 sentence summary

RESPOND ONLY WITH JSON:
{
  "interest": ["<facility1>", "<facility2>"],
  "budget": "<budget mention or null>",
  "objections": ["<objection1>"],
  "timeline": "<timeline or null>",
  "sentiment": "<POSITIVE|NEUTRAL|NEGATIVE>",
  "coachingFlag": <boolean>,
  "coachingNote": "<suggestion or null>",
  "summary": "<2-3 sentence summary>"
}`;

    const llmResponse = await callLLM(prompt, systemPrompt, { temperature: 0.3, maxTokens: 400 });

    let analysis;
    try {
      analysis = parseJSONResponse(llmResponse) as {
        interest: string[];
        budget: string | null;
        objections: string[];
        timeline: string | null;
        sentiment: string;
        coachingFlag: boolean;
        coachingNote: string | null;
        summary: string;
      };
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse AI analysis. Please try again.' },
        { status: 500 },
      );
    }

    // Update the call record with AI analysis
    await db.call.update({
      where: { id: callId },
      data: {
        aiSummary: analysis.summary || null,
        aiExtractedInterest: JSON.stringify(analysis.interest || []),
        aiExtractedBudget: analysis.budget || null,
        aiExtractedObjections: JSON.stringify(analysis.objections || []),
        aiExtractedTimeline: analysis.timeline || null,
        aiSentiment: ['POSITIVE', 'NEUTRAL', 'NEGATIVE'].includes(analysis.sentiment)
          ? analysis.sentiment
          : 'NEUTRAL',
        aiCoachingFlag: !!analysis.coachingFlag,
        aiCoachingNote: analysis.coachingNote || null,
      },
    });

    // Audit log
    await createAuditLog({
      actorType: 'AI_AGENT',
      actorId: '3',
      actorName: 'Call Monitor',
      entityType: 'CALL',
      entityId: callId,
      action: 'UPDATE',
      fieldChanged: 'ai_analysis',
      newValue: `Sentiment: ${analysis.sentiment}, Coaching: ${analysis.coachingFlag}`,
      remarks: analysis.summary || 'Call analysis completed',
    });

    // Create AI insight if coaching flag is true
    if (analysis.coachingFlag && analysis.coachingNote) {
      await db.aIInsight.create({
        data: {
          agentId: 3,
          insightType: 'COACHING',
          description: `Call with ${call.lead.firstName} ${call.lead.lastName}: ${analysis.coachingNote}`,
          dataPoints: 1,
          confidenceScore: 0.7,
          proposedChange: analysis.coachingNote,
          expectedImpact: 'Improved call handling and conversion rate',
          status: 'PENDING_REVIEW',
        },
      });
    }

    return NextResponse.json({
      analysis,
      callId,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    const message = error instanceof Error ? error.message : 'Failed to analyze call';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

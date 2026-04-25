import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';
import { suggestSmartResponse } from '@/lib/ai-learning';
import { db } from '@/lib/db';

// ──────────────────────────────────────
// POST /api/ai/learning/suggest — Any auth
// Body: { message, leadId? }
// Returns suggested smart response
// ──────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();

    const { message, leadId } = body;

    if (!message?.trim()) {
      return NextResponse.json(
        { error: 'message is required' },
        { status: 400 }
      );
    }

    // Fetch lead data if leadId provided
    let lead: { id: string; status: string; temperature: string } | null = null;
    if (leadId) {
      lead = await db.lead.findUnique({
        where: { id: leadId },
        select: { id: true, status: true, temperature: true },
      });
    }

    const result = await suggestSmartResponse(message, lead);

    return NextResponse.json({
      success: true,
      suggestion: result,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    const message = error instanceof Error ? error.message : 'Failed to generate suggestion';
    console.error('[Learning API] Suggest error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';
import { submitResponseFeedback } from '@/lib/ai-learning';
import { db } from '@/lib/db';

// ──────────────────────────────────────
// POST /api/ai/learning/feedback — Any auth
// Body: { learningId, feedback, notes? }
// ──────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const { learningId, feedback, notes } = body;

    if (!learningId || !feedback) {
      return NextResponse.json(
        { error: 'learningId and feedback are required' },
        { status: 400 }
      );
    }

    if (!['positive', 'negative', 'neutral'].includes(feedback)) {
      return NextResponse.json(
        { error: 'feedback must be positive, negative, or neutral' },
        { status: 400 }
      );
    }

    // Verify the learning record exists
    const existing = await db.aILearning.findUnique({
      where: { id: learningId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Learning record not found' },
        { status: 404 }
      );
    }

    await submitResponseFeedback({
      learningId,
      feedback,
      reviewedById: session.user.id,
      notes,
    });

    // Return the updated record
    const updated = await db.aILearning.findUnique({
      where: { id: learningId },
      include: {
        reviewedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      record: updated,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    const message = error instanceof Error ? error.message : 'Failed to submit feedback';
    console.error('[Learning API] Feedback error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

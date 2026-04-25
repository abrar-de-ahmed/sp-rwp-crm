import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-helpers';
import { db } from '@/lib/db';

// ──────────────────────────────────────
// GET /api/ai/learning/faqs — Admin+
// Returns FAQ candidates pending review
// ──────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    await requireRole('ADMIN');

    const faqCandidates = await db.aILearning.findMany({
      where: {
        type: 'FAQ_CANDIDATE',
        status: 'PENDING_REVIEW',
      },
      orderBy: [{ frequency: 'desc' }, { confidence: 'desc' }],
      take: 50,
    });

    return NextResponse.json({
      candidates: faqCandidates,
      total: faqCandidates.length,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    const message = error instanceof Error ? error.message : 'Failed to fetch FAQ candidates';
    console.error('[Learning API] FAQs GET error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ──────────────────────────────────────
// PUT /api/ai/learning/faqs — Admin+
// Body: { learningId, action: 'approve'|'reject' }
// Approve or reject FAQ candidates
// ──────────────────────────────────────
export async function PUT(request: NextRequest) {
  try {
    const session = await requireRole('ADMIN');
    const body = await request.json();

    const { learningId, action } = body;

    if (!learningId || !action) {
      return NextResponse.json(
        { error: 'learningId and action are required' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be approve or reject' },
        { status: 400 }
      );
    }

    const existing = await db.aILearning.findUnique({
      where: { id: learningId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'FAQ candidate not found' },
        { status: 404 }
      );
    }

    if (existing.type !== 'FAQ_CANDIDATE') {
      return NextResponse.json(
        { error: 'This record is not an FAQ candidate' },
        { status: 400 }
      );
    }

    const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';

    const updated = await db.aILearning.update({
      where: { id: learningId },
      data: {
        status: newStatus,
        reviewedById: session.user.id,
        reviewedAt: new Date(),
        deployedAt: action === 'approve' ? new Date() : undefined,
        updatedAt: new Date(),
      },
    });

    // If approved, convert to a KNOWLEDGE_UPDATE so it gets used in future responses
    if (action === 'approve') {
      await db.aILearning.update({
        where: { id: learningId },
        data: {
          type: 'KNOWLEDGE_UPDATE',
          confidence: Math.max(updated.confidence, 0.85),
        },
      });

      console.log(`[Learning] FAQ candidate approved and deployed: "${updated.input.substring(0, 60)}"`);
    } else {
      console.log(`[Learning] FAQ candidate rejected: "${updated.input.substring(0, 60)}"`);
    }

    return NextResponse.json({
      success: true,
      record: updated,
      action,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    const message = error instanceof Error ? error.message : 'Failed to process FAQ action';
    console.error('[Learning API] FAQs PUT error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-helpers';
import { db } from '@/lib/db';

// ──────────────────────────────────────
// GET /api/ai/learning/[id] — Admin+
// Get single learning record details
// ──────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole('ADMIN');
    const { id } = await params;

    const record = await db.aILearning.findUnique({
      where: { id },
      include: {
        reviewedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!record) {
      return NextResponse.json(
        { error: 'Learning record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ record });
  } catch (error) {
    if (error instanceof Response) return error;
    const message = error instanceof Error ? error.message : 'Failed to fetch learning record';
    console.error('[Learning API] [id] GET error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ──────────────────────────────────────
// PUT /api/ai/learning/[id] — Admin+
// Update learning record (status, review notes, etc.)
// ──────────────────────────────────────
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole('ADMIN');
    const { id } = await params;
    const body = await request.json();

    const { status, reviewNotes, feedback, category } = body;

    // Verify the record exists
    const existing = await db.aILearning.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Learning record not found' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      reviewedById: session.user.id,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    };

    if (status) {
      const validStatuses = ['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'AUTO_APPROVED', 'DEPLOYED'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
      updateData.status = status;
      if (status === 'APPROVED' || status === 'DEPLOYED') {
        updateData.deployedAt = new Date();
      }
    }

    if (reviewNotes !== undefined) {
      updateData.reviewNotes = reviewNotes;
    }

    if (feedback) {
      const validFeedback = ['positive', 'negative', 'neutral'];
      if (!validFeedback.includes(feedback)) {
        return NextResponse.json(
          { error: `Invalid feedback. Must be one of: ${validFeedback.join(', ')}` },
          { status: 400 }
        );
      }
      updateData.feedback = feedback;
    }

    if (category) {
      const validCategories = [
        'question_answer', 'objection_handling', 'pricing_response',
        'facility_info', 'booking_flow', 'sentiment_pattern', 'conversion_strategy',
      ];
      if (!validCategories.includes(category)) {
        return NextResponse.json(
          { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
          { status: 400 }
        );
      }
      updateData.category = category;
    }

    const updated = await db.aILearning.update({
      where: { id },
      data: updateData,
      include: {
        reviewedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    console.log(`[Learning] Record ${id} updated: status=${updateData.status}, feedback=${updateData.feedback ?? 'unchanged'}`);

    return NextResponse.json({
      success: true,
      record: updated,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    const message = error instanceof Error ? error.message : 'Failed to update learning record';
    console.error('[Learning API] [id] PUT error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

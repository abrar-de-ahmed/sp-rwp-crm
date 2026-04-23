import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

// ──────────────────────────────────────
// GET /api/ai/insights — List AI insights with filters
// ──────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = request.nextUrl;

    const agentId = searchParams.get('agentId');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));

    const where: Record<string, unknown> = {};

    if (agentId) where.agentId = parseInt(agentId, 10);
    if (type) where.insightType = type;
    if (status) where.status = status;

    // Sales reps only see their own insights (or public ones)
    // For MVP, all insights are visible to all authenticated users

    const [insights, total] = await Promise.all([
      db.aIInsight.findMany({
        where,
        select: {
          id: true,
          agentId: true,
          insightType: true,
          description: true,
          dataPoints: true,
          confidenceScore: true,
          proposedChange: true,
          expectedImpact: true,
          status: true,
          reviewedById: true,
          reviewedBy: {
            select: { name: true },
          },
          reviewedAt: true,
          reviewNotes: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.aIInsight.count({ where }),
    ]);

    return NextResponse.json({
      insights,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Failed to fetch insights' },
      { status: 500 },
    );
  }
}

// ──────────────────────────────────────
// PUT /api/ai/insights — Review/approve/reject insight (SUPER_ADMIN)
// ──────────────────────────────────────
export async function PUT(request: NextRequest) {
  try {
    const session = await requireRole('SUPER_ADMIN');
    const body = await request.json();

    const { insightId, action: reviewAction, reviewNotes } = body;

    if (!insightId || !reviewAction) {
      return NextResponse.json(
        { error: 'insightId and action are required' },
        { status: 400 },
      );
    }

    if (!['APPROVE', 'REJECT', 'DEPLOY'].includes(reviewAction)) {
      return NextResponse.json(
        { error: 'action must be APPROVE, REJECT, or DEPLOY' },
        { status: 400 },
      );
    }

    const insight = await db.aIInsight.findUnique({
      where: { id: insightId },
    });

    if (!insight) {
      return NextResponse.json(
        { error: 'Insight not found' },
        { status: 404 },
      );
    }

    const statusMap: Record<string, string> = {
      APPROVE: 'APPROVED',
      REJECT: 'REJECTED',
      DEPLOY: 'DEPLOYED',
    };

    const updated = await db.aIInsight.update({
      where: { id: insightId },
      data: {
        status: statusMap[reviewAction],
        reviewedById: session.user.id,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes || null,
      },
    });

    // Audit log
    await createAuditLog({
      actorType: session.user.role,
      actorId: session.user.id,
      actorName: session.user.name,
      entityType: 'SETTING',
      entityId: insightId,
      action: 'STATUS_CHANGE',
      fieldChanged: 'ai_insight_status',
      oldValue: insight.status,
      newValue: statusMap[reviewAction],
      remarks: `${reviewAction}D insight: "${insight.description.substring(0, 100)}"${reviewNotes ? `. Notes: ${reviewNotes}` : ''}`,
    });

    return NextResponse.json({ insight: updated });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Failed to update insight' },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-helpers';
import { db } from '@/lib/db';

// ──────────────────────────────────────
// GET /api/ai/learning/patterns — Admin+
// Query params: status, category, type, page, limit
// ──────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    await requireRole('ADMIN');

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') ?? 'all';
    const category = searchParams.get('category');
    const type = searchParams.get('type');
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (status && status !== 'all') {
      where.status = status;
    }
    if (category) {
      where.category = category;
    }
    if (type) {
      where.type = type;
    }

    const [records, total] = await Promise.all([
      db.aILearning.findMany({
        where,
        include: {
          reviewedBy: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: [{ frequency: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      db.aILearning.count({ where }),
    ]);

    return NextResponse.json({
      records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    const message = error instanceof Error ? error.message : 'Failed to fetch learning patterns';
    console.error('[Learning API] Patterns error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

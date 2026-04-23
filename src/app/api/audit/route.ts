import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth-helpers';

// ──────────────────────────────────────
// GET /api/audit — List audit logs with filters
// ──────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    // Only SUPER_ADMIN and ADMIN can access
    await requireRole('ADMIN');

    const { searchParams } = request.nextUrl;

    const actorType = searchParams.get('actorType') ?? '';
    const entityType = searchParams.get('entityType') ?? '';
    const search = searchParams.get('search') ?? '';
    const dateFrom = searchParams.get('dateFrom') ?? '';
    const dateTo = searchParams.get('dateTo') ?? '';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '25', 10)));

    // Build where clause
    const where: Record<string, unknown> = {};

    if (actorType) where.actorType = actorType;
    if (entityType) where.entityType = entityType;

    if (search) {
      where.actorName = { contains: search };
    }

    if (dateFrom || dateTo) {
      const createdAt: Record<string, unknown> = {};
      if (dateFrom) createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        // Include the entire end date
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        createdAt.lte = endDate;
      }
      where.createdAt = createdAt;
    }

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        select: {
          id: true,
          actorType: true,
          actorId: true,
          actorName: true,
          entityType: true,
          entityId: true,
          action: true,
          fieldChanged: true,
          oldValue: true,
          newValue: true,
          remarks: true,
          ipAddress: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.auditLog.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      logs,
      total,
      page,
      totalPages,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 },
    );
  }
}

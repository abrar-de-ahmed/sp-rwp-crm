import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth-helpers';

// ──────────────────────────────────────
// GET /api/calls — List calls with filters
// ──────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = request.nextUrl;

    const outcome = searchParams.get('outcome') ?? '';
    const direction = searchParams.get('direction') ?? '';
    const search = searchParams.get('search') ?? '';
    const dateFrom = searchParams.get('dateFrom') ?? '';
    const dateTo = searchParams.get('dateTo') ?? '';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '25', 10)));

    // Build where clause
    const where: Record<string, unknown> = {};

    // Role-based filtering
    if (session.user.role === 'SALES_REP') {
      where.repId = session.user.id;
    } else if (session.user.role === 'ADMIN') {
      // Admins see their own + all sales reps' calls
      where.OR = [
        { repId: session.user.id },
        { rep: { role: 'SALES_REP' } },
      ];
    }
    // SUPER_ADMIN sees everything

    if (outcome) where.outcome = outcome;
    if (direction) where.direction = direction;

    // Search by lead name
    if (search) {
      where.lead = {
        OR: [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
        ],
      };
    }

    // Date range filter
    if (dateFrom || dateTo) {
      const callTimestamp: Record<string, unknown> = {};
      if (dateFrom) callTimestamp.gte = new Date(dateFrom);
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        callTimestamp.lte = endDate;
      }
      where.callTimestamp = callTimestamp;
    }

    const [calls, total] = await Promise.all([
      db.call.findMany({
        where,
        select: {
          id: true,
          leadId: true,
          repId: true,
          direction: true,
          callTimestamp: true,
          durationSeconds: true,
          status: true,
          outcome: true,
          recordingUrl: true,
          transcriptText: true,
          aiSummary: true,
          aiExtractedInterest: true,
          aiExtractedBudget: true,
          aiExtractedObjections: true,
          aiExtractedTimeline: true,
          aiSentiment: true,
          aiCoachingFlag: true,
          aiCoachingNote: true,
          repRemarks: true,
          createdAt: true,
          lead: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          rep: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { callTimestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.call.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      calls,
      total,
      page,
      totalPages,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Failed to fetch calls' },
      { status: 500 },
    );
  }
}

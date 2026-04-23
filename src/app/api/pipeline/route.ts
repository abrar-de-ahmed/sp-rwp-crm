import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth-helpers';

// ──────────────────────────────────────
// GET /api/pipeline — All leads grouped by status
// ──────────────────────────────────────

const PIPELINE_STATUSES = ['NEW', 'CONTACTED', 'INTERESTED', 'NEGOTIATION', 'BOOKED', 'LOST'];

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = request.nextUrl;

    const myLeads = searchParams.get('myLeads') === 'true';
    const search = searchParams.get('search') ?? '';

    // Build where clause
    const where: Record<string, unknown> = {
      status: { in: PIPELINE_STATUSES },
    };

    // Role-based filtering
    if (session.user.role === 'SALES_REP' || myLeads) {
      where.assignedRepId = session.user.id;
    }

    // Search filter
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
      ];
    }

    // Fetch all matching leads
    const leads = await db.lead.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        source: true,
        leadScore: true,
        temperature: true,
        status: true,
        assignedRepId: true,
        assignedRep: {
          select: { id: true, name: true },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Group by status
    const columns: Record<string, typeof leads> = {};
    for (const status of PIPELINE_STATUSES) {
      columns[status] = leads.filter((l) => l.status === status);
    }

    return NextResponse.json({ columns });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Failed to fetch pipeline data' },
      { status: 500 },
    );
  }
}

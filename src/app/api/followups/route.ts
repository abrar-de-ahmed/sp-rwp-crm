import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth-helpers';
import { createAuditLog } from '@/lib/audit';

// ──────────────────────────────────────
// GET /api/followups — List follow-ups with filters
// ──────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = request.nextUrl;

    const status = searchParams.get('status') ?? '';
    const priority = searchParams.get('priority') ?? '';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));

    // Build where clause
    const where: Record<string, unknown> = {};

    // Role-based filtering
    if (session.user.role === 'SALES_REP') {
      where.assignedToId = session.user.id;
    } else if (session.user.role === 'ADMIN') {
      // Admins see their own + all sales reps' follow-ups
      where.OR = [
        { assignedToId: session.user.id },
        { assignedTo: { role: 'SALES_REP' } },
      ];
    }
    // SUPER_ADMIN sees everything

    if (status) where.status = status;
    if (priority) where.priority = priority;

    const [followUps, total] = await Promise.all([
      db.followUp.findMany({
        where,
        select: {
          id: true,
          leadId: true,
          dueDatetime: true,
          priority: true,
          status: true,
          reason: true,
          lastCallSummary: true,
          completedAt: true,
          completionNotes: true,
          escalatedAt: true,
          createdAt: true,
          updatedAt: true,
          assignedTo: {
            select: { id: true, name: true },
          },
          lead: {
            select: { id: true, firstName: true, lastName: true },
          },
          escalatedTo: {
            select: { id: true, name: true },
          },
        },
        orderBy: { dueDatetime: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.followUp.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      followUps,
      total,
      page,
      totalPages,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Failed to fetch follow-ups' },
      { status: 500 },
    );
  }
}

// ──────────────────────────────────────
// POST /api/followups — Create a new follow-up
// ──────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { leadId, assignedToId, dueDatetime, priority, reason, lastCallSummary } = body;

    // Validate required fields
    if (!leadId || !assignedToId || !dueDatetime) {
      return NextResponse.json(
        { error: 'leadId, assignedToId, and dueDatetime are required' },
        { status: 400 },
      );
    }

    // Validate the lead exists
    const lead = await db.lead.findUnique({
      where: { id: leadId },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 },
      );
    }

    // Validate the assigned user exists
    const assignee = await db.user.findUnique({
      where: { id: assignedToId },
      select: { id: true, name: true, role: true },
    });

    if (!assignee) {
      return NextResponse.json(
        { error: 'Assigned user not found' },
        { status: 404 },
      );
    }

    // Sales reps can only create follow-ups for themselves
    if (session.user.role === 'SALES_REP' && assignedToId !== session.user.id) {
      return NextResponse.json(
        { error: 'Sales reps can only create follow-ups for themselves' },
        { status: 403 },
      );
    }

    const validPriorities = ['URGENT', 'HIGH', 'NORMAL', 'LOW'];
    const finalPriority = validPriorities.includes(priority) ? priority : 'NORMAL';

    // Create the follow-up
    const followUp = await db.followUp.create({
      data: {
        leadId,
        assignedToId,
        dueDatetime: new Date(dueDatetime),
        priority: finalPriority,
        reason: reason?.trim() || null,
        lastCallSummary: lastCallSummary?.trim() || null,
      },
    });

    // Create audit log
    await createAuditLog({
      actorType: session.user.role,
      actorId: session.user.id,
      actorName: session.user.name,
      entityType: 'FOLLOW_UP',
      entityId: followUp.id,
      action: 'CREATE',
      remarks: `Created follow-up for ${lead.firstName} ${lead.lastName} due ${dueDatetime}`,
    });

    return NextResponse.json({ followUp }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Failed to create follow-up' },
      { status: 500 },
    );
  }
}

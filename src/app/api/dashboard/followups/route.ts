import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth-helpers';

export async function GET() {
  try {
    const session = await requireAuth();
    const role = session.user.role;
    const userId = session.user.id;

    const where: Record<string, unknown> = {
      status: 'PENDING',
      dueDatetime: { gte: new Date() },
    };
    if (role === 'SALES_REP') {
      where.assignedToId = userId;
    }

    const followUps = await db.followUp.findMany({
      where,
      select: {
        id: true,
        dueDatetime: true,
        priority: true,
        status: true,
        reason: true,
        lead: {
          select: { firstName: true, lastName: true, phone: true },
        },
      },
      orderBy: { dueDatetime: 'asc' },
      take: 20,
    });

    const result = followUps.map((fu) => ({
      id: fu.id,
      dueDatetime: fu.dueDatetime.toISOString(),
      priority: fu.priority,
      status: fu.status,
      reason: fu.reason,
      leadFirstName: fu.lead.firstName,
      leadLastName: fu.lead.lastName,
      leadPhone: fu.lead.phone,
    }));

    return NextResponse.json({ followUps: result });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Failed to fetch follow-ups' },
      { status: 500 },
    );
  }
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth-helpers';

export async function GET() {
  try {
    const session = await requireAuth();
    const role = session.user.role;
    const userId = session.user.id;

    const where: Record<string, unknown> = { temperature: 'HOT' };
    if (role === 'SALES_REP') {
      where.assignedRepId = userId;
    }

    const hotLeads = await db.lead.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        leadScore: true,
        temperature: true,
        status: true,
        phone: true,
        source: true,
      },
      orderBy: { leadScore: 'desc' },
      take: 20,
    });

    return NextResponse.json({ hotLeads });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Failed to fetch hot leads' },
      { status: 500 },
    );
  }
}

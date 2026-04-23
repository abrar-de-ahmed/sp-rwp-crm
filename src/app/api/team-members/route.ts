import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth-helpers';

// ──────────────────────────────────────
// GET /api/team-members — List active team members (accessible to ADMIN+)
// ──────────────────────────────────────
export async function GET() {
  try {
    const session = await requireAuth();
    const role = session.user.role;

    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 },
      );
    }

    const members = await db.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ members });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 },
    );
  }
}

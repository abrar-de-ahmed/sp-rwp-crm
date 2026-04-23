import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth-helpers';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ──────────────────────────────────────
// POST /api/notifications/[id]/read — Mark single notification as read
// ──────────────────────────────────────
export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    await db.notification.updateMany({
      where: {
        id,
        userId: session.user.id,
      },
      data: {
        isRead: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Failed to mark notification as read' },
      { status: 500 },
    );
  }
}

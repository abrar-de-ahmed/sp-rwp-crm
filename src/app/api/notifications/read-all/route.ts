import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth-helpers';

// ──────────────────────────────────────
// POST /api/notifications/read-all — Mark all notifications as read
// ──────────────────────────────────────
export async function POST() {
  try {
    const session = await requireAuth();

    await db.notification.updateMany({
      where: {
        userId: session.user.id,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Failed to mark notifications as read' },
      { status: 500 },
    );
  }
}

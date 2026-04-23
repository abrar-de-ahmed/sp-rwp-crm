import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth-helpers';

// ──────────────────────────────────────
// GET /api/notifications — List notifications for current user
// ──────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = request.nextUrl;

    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));

    const [notifications, unreadCount] = await Promise.all([
      db.notification.findMany({
        where: { userId: session.user.id },
        select: {
          id: true,
          type: true,
          title: true,
          message: true,
          link: true,
          isRead: true,
          createdAt: true,
        },
        orderBy: [
          { isRead: 'asc' },
          { createdAt: 'desc' },
        ],
        take: limit,
      }),
      db.notification.count({
        where: {
          userId: session.user.id,
          isRead: false,
        },
      }),
    ]);

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 },
    );
  }
}

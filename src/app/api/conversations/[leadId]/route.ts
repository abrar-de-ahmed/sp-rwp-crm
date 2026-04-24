import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth-helpers';

// ──────────────────────────────────────
// GET /api/conversations/[leadId] — Get messages for a specific lead
// ──────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> },
) {
  try {
    const session = await requireAuth();
    const { leadId } = await params;
    const { searchParams } = request.nextUrl;

    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));

    // Verify the lead exists and is accessible (role-based)
    const lead = await db.lead.findFirst({
      where: {
        id: leadId,
        ...(session.user.role === 'SALES_REP' ? { assignedRepId: session.user.id } : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        whatsappNumber: true,
        source: true,
        status: true,
        temperature: true,
        leadScore: true,
        remarks: true,
        tags: true,
      },
    });

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 },
      );
    }

    // Mark unread messages as read
    await db.conversation.updateMany({
      where: {
        leadId,
        isRead: false,
        direction: 'INBOUND',
      },
      data: { isRead: true },
    });

    // Fetch messages with sender info
    const [messages, total] = await Promise.all([
      db.conversation.findMany({
        where: { leadId },
        select: {
          id: true,
          leadId: true,
          channel: true,
          direction: true,
          messageText: true,
          mediaUrl: true,
          sentBy: true,
          senderId: true,
          isRead: true,
          timestamp: true,
          sender: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { timestamp: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.conversation.count({
        where: { leadId },
      }),
    ]);

    // Fetch last 3 follow-ups for the lead info panel
    const recentFollowUps = await db.followUp.findMany({
      where: { leadId },
      select: {
        id: true,
        reason: true,
        status: true,
        dueDatetime: true,
        completionNotes: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    // Fetch last call
    const lastCall = await db.call.findFirst({
      where: { leadId },
      select: {
        id: true,
        callTimestamp: true,
        outcome: true,
        durationSeconds: true,
        aiSummary: true,
      },
      orderBy: { callTimestamp: 'desc' },
    });

    return NextResponse.json({
      messages,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      lead,
      recentFollowUps,
      lastCall,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 },
    );
  }
}

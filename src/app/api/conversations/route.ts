import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth-helpers';

// ──────────────────────────────────────
// GET /api/conversations — List conversations grouped by lead
// Query params: channel, unread, search, page, limit
// ──────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = request.nextUrl;

    const channel = searchParams.get('channel') ?? '';
    const unreadOnly = searchParams.get('unread') === 'true';
    const search = searchParams.get('search') ?? '';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));

    // Build lead filter
    const leadWhere: Record<string, unknown> = {};

    // Role-based filtering: SALES_REP sees only their assigned leads
    if (session.user.role === 'SALES_REP') {
      leadWhere.assignedRepId = session.user.id;
    }

    if (search) {
      leadWhere.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    // Build conversation filter
    const convWhere: Record<string, unknown> = {};
    if (channel) convWhere.channel = channel;
    if (unreadOnly) convWhere.isRead = false;

    // Get all conversations with lead info, then group in-memory
    const conversations = await db.conversation.findMany({
      where: {
        ...convWhere,
        ...(Object.keys(leadWhere).length > 0 ? { lead: leadWhere } : {}),
      },
      select: {
        id: true,
        leadId: true,
        channel: true,
        messageText: true,
        direction: true,
        sentBy: true,
        isRead: true,
        timestamp: true,
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            status: true,
            temperature: true,
            leadScore: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    // Group conversations by leadId, keeping the latest per lead as the "summary"
    const leadMap = new Map<string, {
      leadId: string;
      leadName: string;
      leadPhone: string;
      channel: string;
      lastMessage: string;
      lastMessageAt: string;
      unreadCount: number;
      temperature: string;
      status: string;
    }>();

    for (const conv of conversations) {
      const existing = leadMap.get(conv.leadId);
      if (existing) {
        // Count unread
        if (!conv.isRead) existing.unreadCount++;
        // Keep the earliest entry (since sorted desc, first one has latest message)
      } else {
        leadMap.set(conv.leadId, {
          leadId: conv.leadId,
          leadName: `${conv.lead.firstName} ${conv.lead.lastName}`,
          leadPhone: conv.lead.phone,
          channel: conv.channel,
          lastMessage: conv.messageText,
          lastMessageAt: conv.timestamp.toISOString(),
          unreadCount: conv.isRead ? 0 : 1,
          temperature: conv.lead.temperature,
          status: conv.lead.status,
        });
      }
    }

    // Sort: unread first, then by lastMessageAt desc
    const sorted = Array.from(leadMap.values()).sort((a, b) => {
      // Unread first
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
      // Then by timestamp desc
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    });

    const total = sorted.length;
    const paginated = sorted.slice((page - 1) * limit, page * limit);

    return NextResponse.json({
      conversations: paginated,
      total,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 },
    );
  }
}

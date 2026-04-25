import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth-helpers';
import { createAuditLog } from '@/lib/audit';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

// ──────────────────────────────────────
// WhatsApp Session Management
// ──────────────────────────────────────
// GET  — List all active WhatsApp conversations (one per lead, last message)
// POST — Send a manual message from a sales rep via WhatsApp

// ──────────────────────────────────────
// GET /api/messaging/whatsapp/sessions
// ──────────────────────────────────────
// Returns all leads that have WhatsApp conversations, with their most recent message,
// ordered by the timestamp of the last message (most recent first).
// Sales reps only see their own leads; admins see all.

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));

    // Build base where clause — role-based filtering
    const leadWhere: Record<string, unknown> = {};
    if (session.user.role === 'SALES_REP') {
      leadWhere.assignedRepId = session.user.id;
    }

    // Optional search filter
    const search = searchParams.get('search')?.trim();
    if (search) {
      leadWhere.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { phone: { contains: search } },
        { whatsappNumber: { contains: search } },
      ];
    }

    // Get all leads that have at least one WhatsApp conversation
    const whatsappLeads = await db.lead.findMany({
      where: {
        ...leadWhere,
        conversations: {
          some: { channel: 'WHATSAPP' },
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        whatsappNumber: true,
        phone: true,
        status: true,
        temperature: true,
        leadScore: true,
        assignedRep: {
          select: { id: true, name: true },
        },
        conversations: {
          where: { channel: 'WHATSAPP' },
          select: {
            id: true,
            messageText: true,
            direction: true,
            sentBy: true,
            isRead: true,
            timestamp: true,
          },
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
      orderBy: {
        conversations: {
          _count: 'desc',
        },
      },
    });

    // Build session objects with last message
    const sessions = whatsappLeads.map((lead) => {
      const lastMessage = lead.conversations[0] || null;

      // Count unread inbound messages
      const unreadCount = lead.conversations.filter(
        (c) => !c.isRead && c.direction === 'INBOUND',
      ).length;

      return {
        leadId: lead.id,
        leadName: `${lead.firstName} ${lead.lastName}`,
        whatsappNumber: lead.whatsappNumber || lead.phone,
        status: lead.status,
        temperature: lead.temperature,
        leadScore: lead.leadScore,
        assignedRep: lead.assignedRep,
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              text: lastMessage.messageText,
              direction: lastMessage.direction,
              sentBy: lastMessage.sentBy,
              isRead: lastMessage.isRead,
              timestamp: lastMessage.timestamp,
            }
          : null,
        unreadCount,
      };
    });

    // Sort by last message timestamp (most recent first)
    sessions.sort((a, b) => {
      const aTime = a.lastMessage?.timestamp?.getTime() ?? 0;
      const bTime = b.lastMessage?.timestamp?.getTime() ?? 0;
      return bTime - aTime;
    });

    // Paginate
    const total = sessions.length;
    const paginatedSessions = sessions.slice((page - 1) * limit, page * limit);

    return NextResponse.json({
      sessions: paginatedSessions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Failed to fetch WhatsApp sessions' },
      { status: 500 },
    );
  }
}

// ──────────────────────────────────────
// POST /api/messaging/whatsapp/sessions
// ──────────────────────────────────────
// Send a manual message from a sales rep via WhatsApp to a lead.
// Body: { leadId: string, message: string }

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const { leadId, message } = body;

    // Validate inputs
    if (!leadId?.trim()) {
      return NextResponse.json(
        { error: 'leadId is required' },
        { status: 400 },
      );
    }

    if (!message?.trim()) {
      return NextResponse.json(
        { error: 'message is required' },
        { status: 400 },
      );
    }

    // Find the lead and verify access
    const lead = await db.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        whatsappNumber: true,
        phone: true,
        assignedRepId: true,
      },
    });

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 },
      );
    }

    // Sales reps can only send to their own leads (unless admin/super_admin)
    if (
      session.user.role === 'SALES_REP' &&
      lead.assignedRepId !== session.user.id
    ) {
      return NextResponse.json(
        { error: 'You can only send messages to leads assigned to you' },
        { status: 403 },
      );
    }

    // Determine the WhatsApp number to send to
    const recipientNumber = lead.whatsappNumber || lead.phone;

    if (!recipientNumber) {
      return NextResponse.json(
        { error: 'Lead has no WhatsApp number or phone number' },
        { status: 400 },
      );
    }

    // Send the message via WhatsApp Cloud API
    const sendResult = await sendWhatsAppMessage(recipientNumber, message.trim());

    if (!sendResult.success) {
      console.error('[WhatsApp Session] Send failed:', sendResult.error);
      return NextResponse.json(
        { error: `Failed to send WhatsApp message: ${sendResult.error}` },
        { status: 502 },
      );
    }

    // Save the outbound conversation to the database
    const conversation = await db.conversation.create({
      data: {
        leadId: lead.id,
        channel: 'WHATSAPP',
        direction: 'OUTBOUND',
        messageText: message.trim(),
        sentBy: 'SALES_REP',
        senderId: session.user.id,
        aiAgentId: null,
        isRead: true,
      },
    });

    // Audit log
    await createAuditLog({
      actorType: session.user.role,
      actorId: session.user.id,
      actorName: session.user.name,
      entityType: 'CONVERSATION',
      entityId: conversation.id,
      action: 'CREATE',
      remarks: `Sales rep sent WhatsApp message to ${lead.firstName} ${lead.lastName} (${recipientNumber}): ${message.slice(0, 100)}`,
    });

    console.log(
      `[WhatsApp Session] ${session.user.name} sent message to ${lead.firstName} ${lead.lastName} (${recipientNumber})`,
    );

    return NextResponse.json({
      success: true,
      conversation: {
        id: conversation.id,
        messageId: sendResult.messageId,
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[WhatsApp Session] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to send WhatsApp message' },
      { status: 500 },
    );
  }
}

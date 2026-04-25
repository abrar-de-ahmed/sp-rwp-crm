import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth-helpers';
import { createAuditLog } from '@/lib/audit';
import {
  sendFacebookMessage,
  sendInstagramMessage,
  sendWhatsAppMessage,
} from '@/lib/meta';

// ──────────────────────────────────────
// POST /api/messaging/send — Unified Outbound Messaging
// ──────────────────────────────────────
//
// Send a message to a lead via their connected channel (WhatsApp, Facebook, Instagram).
// Access: SALES_REP and above.
//
// Accepts: { leadId, message, channel }
// Returns: { success, messageId?, error? }
//

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const { leadId, message, channel } = body as {
      leadId: string;
      message: string;
      channel: string;
    };

    // Validate inputs
    if (!leadId || !message?.trim() || !channel) {
      return NextResponse.json(
        { error: 'leadId, message, and channel are required' },
        { status: 400 },
      );
    }

    if (!['FACEBOOK', 'INSTAGRAM', 'WHATSAPP'].includes(channel)) {
      return NextResponse.json(
        { error: 'Channel must be FACEBOOK, INSTAGRAM, or WHATSAPP' },
        { status: 400 },
      );
    }

    // ─── Fetch the lead ───
    const lead = await db.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        assignedRepId: true,
        whatsappNumber: true,
        tags: true,
      },
    });

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 },
      );
    }

    // ─── Authorization check ───
    // SALES_REP can only send to their own leads; ADMIN/SUPER_ADMIN can send to any lead
    if (
      session.user.role === 'SALES_REP' &&
      lead.assignedRepId !== session.user.id
    ) {
      return NextResponse.json(
        { error: 'You can only send messages to leads assigned to you' },
        { status: 403 },
      );
    }

    // ─── Determine recipient ID based on channel ───
    let sendResult: { success: boolean; messageId?: string; error?: string };

    if (channel === 'FACEBOOK') {
      const recipientId = extractSocialId(lead.tags, 'facebookSenderId');
      if (!recipientId) {
        return NextResponse.json(
          { error: 'This lead does not have a Facebook sender ID. They must have sent a Facebook message first.' },
          { status: 400 },
        );
      }
      sendResult = await sendFacebookMessage(recipientId, message.trim());

    } else if (channel === 'INSTAGRAM') {
      const recipientId = extractSocialId(lead.tags, 'instagramSenderId');
      if (!recipientId) {
        return NextResponse.json(
          { error: 'This lead does not have an Instagram sender ID. They must have sent an Instagram DM first.' },
          { status: 400 },
        );
      }
      sendResult = await sendInstagramMessage(recipientId, message.trim());

    } else if (channel === 'WHATSAPP') {
      const recipientPhone = lead.whatsappNumber || lead.phone;
      if (!recipientPhone) {
        return NextResponse.json(
          { error: 'This lead does not have a WhatsApp/phone number on file.' },
          { status: 400 },
        );
      }

      // Get WhatsApp credentials from channel connection
      const waConnection = await db.channelConnection.findFirst({
        where: { channel: 'WHATSAPP', status: 'CONNECTED' },
        select: { accessToken: true, metadata: true },
      });

      if (!waConnection?.accessToken) {
        return NextResponse.json(
          { error: 'WhatsApp is not connected. Please configure WhatsApp in channel settings.' },
          { status: 400 },
        );
      }

      let waPhoneNumberId: string | null = null;
      if (waConnection.metadata) {
        try {
          const meta = JSON.parse(waConnection.metadata);
          waPhoneNumberId = meta?.phoneNumberId || meta?.whatsappPhoneNumberId || null;
        } catch {
          // ignore parse error
        }
      }

      if (!waPhoneNumberId) {
        return NextResponse.json(
          { error: 'WhatsApp phone number ID not configured. Please reconnect WhatsApp in channel settings.' },
          { status: 400 },
        );
      }

      // Clean phone number (remove non-numeric chars, ensure country code)
      const cleanPhone = recipientPhone.replace(/[^\d+]/g, '');
      sendResult = await sendWhatsAppMessage(cleanPhone, message.trim(), waPhoneNumberId, waConnection.accessToken);
    } else {
      return NextResponse.json({ error: 'Unsupported channel' }, { status: 400 });
    }

    // ─── Save the outbound message as a conversation record ───
    if (sendResult.success) {
      await db.conversation.create({
        data: {
          leadId,
          channel,
          direction: 'OUTBOUND',
          messageText: message.trim(),
          sentBy: session.user.role,
          senderId: session.user.id,
        },
      });

      // Audit log
      await createAuditLog({
        actorType: session.user.role,
        actorId: session.user.id,
        actorName: session.user.name,
        entityType: 'CONVERSATION',
        entityId: leadId,
        action: 'CREATE',
        newValue: `Message sent via ${channel}`,
        remarks: `Sent message to ${lead.firstName} ${lead.lastName} via ${channel}`,
      });
    }

    return NextResponse.json({
      success: sendResult.success,
      messageId: sendResult.messageId,
      error: sendResult.error,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    const message = error instanceof Error ? error.message : 'Failed to send message';
    console.error('[messaging/send] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ──────────────────────────────────────
// Helper: Extract social media ID from lead tags
// ──────────────────────────────────────

/**
 * Extract a social media sender ID from the lead's tags JSON.
 * Tags are stored as a JSON array of strings like:
 *   ["facebookSenderId:12345", "instagramSenderId:67890"]
 *
 * @param tagsJson    — The raw JSON string from lead.tags
 * @param tagField    — The tag field to look for (e.g. "facebookSenderId")
 * @returns The extracted ID, or null if not found
 */
function extractSocialId(tagsJson: string | null, tagField: string): string | null {
  if (!tagsJson) return null;

  try {
    const tags = JSON.parse(tagsJson) as string[];
    const prefix = `${tagField}:`;
    const match = tags.find((t) => t.startsWith(prefix));
    return match ? match.slice(prefix.length) : null;
  } catch {
    // If tags is not valid JSON, try to search the raw string
    const prefix = `${tagField}:`;
    const regex = new RegExp(`"${prefix}([^"]+)"`);
    const match = tagsJson.match(regex);
    return match?.[1] || null;
  }
}

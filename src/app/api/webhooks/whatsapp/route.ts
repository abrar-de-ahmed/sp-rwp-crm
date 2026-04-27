import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import {
  verifyWhatsAppWebhook,
  sendWhatsAppMessage,
  markWhatsAppAsRead,
  verifyWebhookSignature,
} from '@/lib/whatsapp';
import { matchFAQ, shouldHandoffToHuman, callLLM, parseJSONResponse } from '@/lib/ai-agent';

// ──────────────────────────────────────
// WhatsApp Cloud API Webhook Receiver
// ──────────────────────────────────────
// Handles:
//   GET  → Webhook verification challenge from Meta
//   POST → Incoming messages, status updates, and events

const AI_CHAT_AGENT_ID = 2;

// ──────────────────────────────────────
// Types for WhatsApp Cloud API payloads
// ──────────────────────────────────────

interface WhatsAppText {
  body: string;
  preview_url?: boolean;
}

interface WhatsAppInteractive {
  type: string;
  list_reply?: { id: string; title: string; description?: string };
  button_reply?: { id: string; title: string };
}

interface WhatsAppMedia {
  caption?: string;
  id: string;
  mime_type: string;
  sha256: string;
  filename?: string;
}

interface WhatsAppLocation {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

interface WhatsAppContact {
  wa_id: string;
  profile?: { name: string };
}

interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string; // text, interactive, image, document, audio, video, location, contacts, sticker, reaction, unknown
  text?: WhatsAppText;
  interactive?: WhatsAppInteractive;
  image?: WhatsAppMedia;
  document?: WhatsAppMedia;
  audio?: WhatsAppMedia;
  video?: WhatsAppMedia;
  location?: WhatsAppLocation;
  contacts?: Array<{ phones?: Array<{ phone?: string }> }>;
  context?: { forwarded?: boolean; frequently_forwarded?: boolean; from?: string; id?: string };
  errors?: Array<{ code: number; title: string; message: string }>;
}

interface WhatsAppStatus {
  id: string;
  recipient_id: string;
  status: string; // sent, delivered, read, failed
  timestamp: string;
  errors?: Array<{ code: number; title: string; message: string }>;
}

interface WhatsAppChangeValue {
  messaging_product: string;
  metadata?: { display_phone_number?: string; phone_number_id?: string };
  messages?: WhatsAppMessage[];
  contacts?: WhatsAppContact[];
  statuses?: WhatsAppStatus[];
  errors?: Array<{ code: number; title: string; message: string }>;
}

interface WhatsAppEntry {
  id: string;
  changes: Array<{
    field: string;
    value: WhatsAppChangeValue;
  }>;
}

interface WhatsAppWebhookPayload {
  object: string;
  entry: WhatsAppEntry[];
}

// ──────────────────────────────────────
// GET: Webhook Verification
// ──────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const mode = searchParams.get('hub.mode') || '';
  const token = searchParams.get('hub.verify_token') || '';
  const challenge = searchParams.get('hub.challenge') || '';

  const result = verifyWhatsAppWebhook(mode, token, challenge);

  if (result.success && result.challenge) {
    return new NextResponse(result.challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return NextResponse.json(
    { error: 'Forbidden — verification failed' },
    { status: 403 },
  );
}

// ──────────────────────────────────────
// POST: Event Receiver
// ──────────────────────────────────────
// Processes incoming WhatsApp messages and status updates.
// Returns 200 immediately and processes messages asynchronously.

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    // Verify webhook signature if app secret is configured
    const signature = request.headers.get('x-hub-signature-256');
    if (!(await verifyWebhookSignature(rawBody, signature))) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 403 },
      );
    }

    // Parse the payload
    let payload: WhatsAppWebhookPayload;
    try {
      payload = JSON.parse(rawBody) as WhatsAppWebhookPayload;
    } catch {
      console.error('[WhatsApp Webhook] Invalid JSON payload');
      return NextResponse.json({ success: true });
    }

    // Validate it's a WhatsApp event
    if (payload.object !== 'whatsapp_business_account') {
      return NextResponse.json({ success: true });
    }

    // Fire-and-forget: process all entries asynchronously
    processWebhookPayload(payload).catch((err) => {
      console.error('[WhatsApp Webhook] Async processing error:', err);
    });

    // ALWAYS return 200 immediately — Meta retries on non-200
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[WhatsApp Webhook] Fatal error:', error);
    // Still return 200 to avoid Meta retries on crash errors
    return NextResponse.json({ success: true });
  }
}

// ──────────────────────────────────────
// Async Message Processing
// ──────────────────────────────────────

async function processWebhookPayload(payload: WhatsAppWebhookPayload): Promise<void> {
  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      const value = change.value;

      // Process incoming messages
      if (value.messages && value.messages.length > 0) {
        for (const msg of value.messages) {
          // Skip messages with errors
          if (msg.errors && msg.errors.length > 0) {
            console.warn('[WhatsApp] Message error:', msg.errors[0]);
            continue;
          }

          const contactName = value.contacts?.[0]?.profile?.name || '';
          await processIncomingMessage(msg, contactName);
        }
      }

      // Process status updates
      if (value.statuses && value.statuses.length > 0) {
        for (const status of value.statuses) {
          await processStatusUpdate(status);
        }
      }

      // Process errors
      if (value.errors && value.errors.length > 0) {
        console.warn('[WhatsApp] Webhook error:', value.errors[0]);
      }
    }
  }
}

// ──────────────────────────────────────
// Process Incoming Message
// ──────────────────────────────────────

async function processIncomingMessage(
  message: WhatsAppMessage,
  contactName: string,
): Promise<void> {
  const { from: phoneNumber, id: whatsappMessageId, type, timestamp } = message;

  console.log(`[WhatsApp] Incoming ${type} message from ${phoneNumber} (${contactName})`);

  try {
    // Extract message text based on type
    const messageText = extractMessageText(message);
    const mediaUrl = extractMediaUrl(message, type);

    // Mark incoming message as read
    await markWhatsAppAsRead(whatsappMessageId).catch(() => {});

    // Find or create the lead
    const lead = await findOrCreateLead(phoneNumber, contactName);

    if (!lead) {
      console.error(`[WhatsApp] Could not find/create lead for ${phoneNumber}`);
      return;
    }

    // Save the inbound conversation
    await db.conversation.create({
      data: {
        leadId: lead.id,
        channel: 'WHATSAPP',
        direction: 'INBOUND',
        messageText: messageText || `[${type} message received]`,
        mediaUrl: mediaUrl || null,
        sentBy: 'CUSTOMER',
        senderId: null,
        aiAgentId: null,
        isRead: false,
        timestamp: new Date(parseInt(timestamp, 10) * 1000),
      },
    });

    // Update lead status from NEW to CONTACTED
    if (lead.status === 'NEW') {
      await db.lead.update({
        where: { id: lead.id },
        data: { status: 'CONTACTED' },
      });

      await createAuditLog({
        actorType: 'SYSTEM',
        actorId: null,
        actorName: 'WhatsApp Webhook',
        entityType: 'LEAD',
        entityId: lead.id,
        action: 'STATUS_CHANGE',
        fieldChanged: 'status',
        oldValue: 'NEW',
        newValue: 'CONTACTED',
        remarks: `Lead contacted via WhatsApp (${phoneNumber})`,
      });
    }

    // Create notification for assigned rep
    if (lead.assignedRepId) {
      await db.notification.create({
        data: {
          userId: lead.assignedRepId,
          type: 'NEW_LEAD',
          title: 'New WhatsApp Message',
          message: `${contactName || phoneNumber} sent a WhatsApp message: ${(messageText || '').slice(0, 80)}`,
          link: `leads:${lead.id}`,
          isRead: false,
          sentVia: 'IN_APP',
        },
      });
    }

    // Run AI auto-response (only for text-like messages)
    if (messageText && messageText.trim()) {
      await handleAIResponse(lead, messageText.trim(), contactName, phoneNumber);
    }

    console.log(`[WhatsApp] Message from ${phoneNumber} processed successfully`);
  } catch (error) {
    console.error(`[WhatsApp] Error processing message from ${phoneNumber}:`, error);
  }
}

// ──────────────────────────────────────
// Extract Message Text
// ──────────────────────────────────────

function extractMessageText(message: WhatsAppMessage): string {
  switch (message.type) {
    case 'text':
      return message.text?.body || '';
    case 'interactive':
      if (message.interactive?.list_reply) {
        return message.interactive.list_reply.title || '[List selection]';
      }
      if (message.interactive?.button_reply) {
        return message.interactive.button_reply.title || '[Button selection]';
      }
      return '[Interactive message]';
    case 'image':
      return message.image?.caption || '[Image]';
    case 'document':
      return message.document?.caption || `[Document: ${message.document?.filename || 'unknown'}]`;
    case 'audio':
      return '[Audio message]';
    case 'video':
      return message.video?.caption || '[Video]';
    case 'location':
      return `[Location: ${message.location?.name || message.location?.address || 'shared'}]`;
    case 'contacts':
      return '[Contact(s) shared]';
    case 'sticker':
      return '[Sticker]';
    default:
      return `[${message.type} message]`;
  }
}

// ──────────────────────────────────────
// Extract Media URL (for media messages)
// ──────────────────────────────────────

function extractMediaUrl(message: WhatsAppMessage, type: string): string | null {
  const mediaTypes = ['image', 'document', 'audio', 'video', 'sticker'];
  if (!mediaTypes.includes(type)) return null;

  const media = message[type as 'image' | 'document' | 'audio' | 'video' | 'sticker'];
  if (media && 'id' in media) {
    return `whatsapp://media/${media.id}`;
  }
  return null;
}

// ──────────────────────────────────────
// Find or Create Lead
// ──────────────────────────────────────

async function findOrCreateLead(
  phoneNumber: string,
  contactName: string,
): Promise<{
    id: string;
    status: string;
    firstName: string;
    lastName: string;
    assignedRepId: string | null;
  } | null> {
  try {
    // 1. Search by whatsappNumber
    let lead = await db.lead.findFirst({
      where: { whatsappNumber: phoneNumber },
      select: { id: true, status: true, firstName: true, lastName: true, assignedRepId: true },
    });

    // 2. Fallback: search by phone
    if (!lead) {
      lead = await db.lead.findFirst({
        where: { phone: phoneNumber },
        select: { id: true, status: true, firstName: true, lastName: true, assignedRepId: true },
      });

      // If found by phone but no whatsappNumber, update it
      if (lead) {
        await db.lead.update({
          where: { id: lead.id },
          data: { whatsappNumber: phoneNumber },
        });
      }
    }

    // 3. Create new lead if not found
    if (!lead) {
      const nameParts = (contactName || '').split(' ').filter(Boolean);
      const firstName = nameParts[0] || 'WhatsApp';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'User';

      // Auto-assign using round-robin: pick the rep with fewest active leads
      const assignedRepId = await getRoundRobinRepId();

      lead = await db.lead.create({
        data: {
          firstName,
          lastName,
          phone: phoneNumber,
          whatsappNumber: phoneNumber,
          source: 'WHATSAPP',
          status: 'NEW',
          assignedRepId,
          remarks: `Lead created from WhatsApp message. Contact name: ${contactName || 'Unknown'}`,
        },
        select: { id: true, status: true, firstName: true, lastName: true, assignedRepId: true },
      });

      // Audit log for new lead creation
      await createAuditLog({
        actorType: 'SYSTEM',
        actorId: null,
        actorName: 'WhatsApp Webhook',
        entityType: 'LEAD',
        entityId: lead.id as string,
        action: 'CREATE',
        remarks: `Auto-created lead from WhatsApp: ${firstName} ${lastName} (${phoneNumber})`,
      });

      // Notify assigned rep about new lead
      if (assignedRepId) {
        await db.notification.create({
          data: {
            userId: assignedRepId,
            type: 'NEW_LEAD',
            title: 'New WhatsApp Lead',
            message: `${firstName} ${lastName} messaged on WhatsApp. Assigned to you.`,
            link: `leads:${lead.id}`,
            isRead: false,
            sentVia: 'IN_APP',
          },
        });
      }

      console.log(`[WhatsApp] Created new lead: ${firstName} ${lastName} (${phoneNumber})`);
    }

    return lead;
  } catch (error) {
    console.error('[WhatsApp] findOrCreateLead error:', error);
    return null;
  }
}

/**
 * Get next sales rep ID using round-robin based on lead count.
 * Picks the active SALES_REP with the fewest non-LOST leads.
 */
async function getRoundRobinRepId(): Promise<string | null> {
  try {
    const activeReps = await db.user.findMany({
      where: { role: 'SALES_REP', isActive: true },
      select: { id: true },
      orderBy: { lastLogin: 'desc' },
    });

    if (activeReps.length === 0) return null;

    // Count leads per rep and pick the one with fewest
    const repCounts = await Promise.all(
      activeReps.map(async (rep) => {
        const count = await db.lead.count({
          where: { assignedRepId: rep.id, status: { not: 'LOST' } },
        });
        return { id: rep.id, count };
      }),
    );

    repCounts.sort((a, b) => a.count - b.count);
    return repCounts[0].id;
  } catch (error) {
    console.error('[WhatsApp] getRoundRobinRepId error:', error);
    return null;
  }
}

// ──────────────────────────────────────
// AI Auto-Response Flow
// ──────────────────────────────────────

async function handleAIResponse(
  lead: Record<string, unknown>,
  messageText: string,
  _contactName: string,
  phoneNumber: string,
): Promise<void> {
  const leadId = lead.id as string;

  try {
    // Step 1: Check if the message should be handed off to a human
    if (shouldHandoffToHuman(messageText)) {
      console.log(`[WhatsApp AI] Handoff triggered for ${phoneNumber}`);

      const handoffMessage =
        'I\'ll connect you with one of our team members who can help you better. Please hold on for a moment. 🙏';

      // Send handoff message
      const sendResult = await sendWhatsAppMessage(phoneNumber, handoffMessage);

      // Save AI response as outbound conversation
      await db.conversation.create({
        data: {
          leadId,
          channel: 'WHATSAPP',
          direction: 'OUTBOUND',
          messageText: handoffMessage,
          sentBy: 'AI_AGENT',
          aiAgentId: AI_CHAT_AGENT_ID,
          isRead: true,
        },
      });

      // Create urgent escalation notification for assigned rep
      if (lead.assignedRepId) {
        await db.notification.create({
          data: {
            userId: lead.assignedRepId as string,
            type: 'ESCALATION',
            title: '🚨 WhatsApp Escalation',
            message: `Customer ${_contactName || phoneNumber} requested human assistance. Immediate attention required.`,
            link: `leads:${leadId}`,
            isRead: false,
            sentVia: 'BOTH',
          },
        });
      }

      console.log(`[WhatsApp AI] Handoff message sent to ${phoneNumber}`);
      return;
    }

    // Step 2: Check FAQ knowledge base
    const faqResult = matchFAQ(messageText);
    if (faqResult) {
      console.log(`[WhatsApp AI] FAQ matched for ${phoneNumber}:`, faqResult.answer.slice(0, 50));

      // Send FAQ answer
      const sendResult = await sendWhatsAppMessage(phoneNumber, faqResult.answer);

      // Save AI response as outbound conversation
      await db.conversation.create({
        data: {
          leadId,
          channel: 'WHATSAPP',
          direction: 'OUTBOUND',
          messageText: faqResult.answer,
          sentBy: 'AI_AGENT',
          aiAgentId: AI_CHAT_AGENT_ID,
          isRead: true,
        },
      });

      console.log(`[WhatsApp AI] FAQ response sent to ${phoneNumber}`);
      return;
    }

    // Step 3: Use LLM for a contextual response
    // Fetch last 5 conversations for context
    const recentConversations = await db.conversation.findMany({
      where: { leadId, channel: 'WHATSAPP' },
      select: { direction: true, sentBy: true, messageText: true, timestamp: true },
      orderBy: { timestamp: 'desc' },
      take: 5,
    });

    // Build conversation history for context
    const conversationHistory = recentConversations
      .reverse()
      .map((c) => {
        const role = c.direction === 'INBOUND' ? 'Customer' : c.sentBy === 'AI_AGENT' ? 'Bot' : 'Agent';
        return `${role}: ${c.messageText}`;
      })
      .join('\n');

    // Build LLM prompt with context
    const prompt = `Customer message: "${messageText}"

Recent conversation:
${conversationHistory || '(No previous messages)'}

Customer info:
- Name: ${lead.firstName} ${lead.lastName}
- Lead status: ${lead.status}
- Source: WhatsApp

Respond to the customer's message helpfully. Keep your response concise and conversational.`;

    const systemPrompt = `You are the AI Customer Bot for Sports Pavilion Rawalpindi. You handle customer inquiries on WhatsApp.

BUSINESS INFO:
- Location: Sports Pavilion, Rawalpindi, Pakistan
- Timings: Mon-Sat 6:00 AM - 11:00 PM, Sunday 7:00 AM - 10:00 PM
- Facilities: Cricket nets, Football ground, Gym, Swimming pool, Tennis courts, Basketball court, Squash courts, Jogging track
- Memberships: Monthly (₨5,000-8,000), Bi-Annual (₨25,000-40,000), Annual (₨45,000-70,000), Family packages available
- Day passes: ₨500 per person, ₨800 family of 4
- Corporate packages available with custom pricing

RULES:
1. Detect the language (English, Urdu script, or Roman Urdu) and reply in the same language.
2. Be polite, professional, and helpful at all times.
3. Answer FAQs accurately using the business info above.
4. If a customer asks about pricing, mention our plans briefly and suggest they visit for a tour.
5. For booking/tours, collect: name, phone number, preferred date/time, and which facilities interest them.
6. NEVER make up pricing or information not provided above.
7. Keep responses concise — maximum 2-3 sentences.

RESPOND ONLY with JSON: {"message": "<your reply>", "handoffNeeded": <boolean>}`;

    const llmResponse = await callLLM(prompt, systemPrompt, {
      temperature: 0.5,
      maxTokens: 300,
    });

    // Parse the LLM response
    let aiMessage = messageText; // fallback
    let handoffNeeded = false;

    try {
      const parsed = parseJSONResponse(llmResponse) as {
        message?: string;
        handoffNeeded?: boolean;
      };
      aiMessage = parsed?.message || aiMessage;
      handoffNeeded = parsed?.handoffNeeded === true;
    } catch {
      // If parsing fails, use raw LLM response
      aiMessage = llmResponse.trim();
    }

    // If LLM indicates handoff needed
    if (handoffNeeded) {
      const handoffMsg =
        'I\'ll connect you with one of our team members who can help you better. Please hold on for a moment. 🙏';

      await sendWhatsAppMessage(phoneNumber, handoffMsg);

      await db.conversation.create({
        data: {
          leadId,
          channel: 'WHATSAPP',
          direction: 'OUTBOUND',
          messageText: handoffMsg,
          sentBy: 'AI_AGENT',
          aiAgentId: AI_CHAT_AGENT_ID,
          isRead: true,
        },
      });

      if (lead.assignedRepId) {
        await db.notification.create({
          data: {
            userId: lead.assignedRepId as string,
            type: 'ESCALATION',
            title: '🚨 WhatsApp Escalation',
            message: `AI Bot flagged conversation with ${lead.firstName} ${lead.lastName} for human review.`,
            link: `leads:${leadId}`,
            isRead: false,
            sentVia: 'BOTH',
          },
        });
      }

      console.log(`[WhatsApp AI] LLM handoff triggered for ${phoneNumber}`);
      return;
    }

    // Send AI response
    await sendWhatsAppMessage(phoneNumber, aiMessage);

    // Save AI response as outbound conversation
    await db.conversation.create({
      data: {
        leadId,
        channel: 'WHATSAPP',
        direction: 'OUTBOUND',
        messageText: aiMessage,
        sentBy: 'AI_AGENT',
        aiAgentId: AI_CHAT_AGENT_ID,
        isRead: true,
      },
    });

    console.log(`[WhatsApp AI] LLM response sent to ${phoneNumber}: ${aiMessage.slice(0, 60)}...`);
  } catch (error) {
    console.error(`[WhatsApp AI] Auto-response error for ${phoneNumber}:`, error);
  }
}

// ──────────────────────────────────────
// Process Status Updates
// ──────────────────────────────────────

async function processStatusUpdate(status: WhatsAppStatus): Promise<void> {
  try {
    const { id: messageId, status: messageStatus, recipient_id } = status;

    // Update conversation isRead when WhatsApp reports "read"
    if (messageStatus === 'read') {
      await db.conversation.updateMany({
        where: {
          channel: 'WHATSAPP',
          direction: 'OUTBOUND',
          messageText: { not: '' },
        },
        data: { isRead: true },
      });

      console.log(`[WhatsApp] Status update: message ${messageId} is READ`);
    } else {
      console.log(`[WhatsApp] Status update: message ${messageId} is ${messageStatus} (to ${recipient_id})`);
    }
  } catch (error) {
    console.error('[WhatsApp] processStatusUpdate error:', error);
  }
}

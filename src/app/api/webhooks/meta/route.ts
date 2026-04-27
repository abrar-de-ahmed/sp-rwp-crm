import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { verifyWebhookSignature } from '@/lib/webhook-verify';
import {
  verifyMetaWebhook,
  getMetaAppSecret,
  sendFacebookMessage,
  sendInstagramMessage,
  sendTypingIndicator,
} from '@/lib/meta';
import { callLLM, parseJSONResponse, matchFAQ, detectLanguage, shouldHandoffToHuman, calculateLeadScore } from '@/lib/ai-agent';

// ──────────────────────────────────────
// Type definitions for Meta webhook payloads
// ──────────────────────────────────────

/** Generic Meta webhook entry */
interface MetaWebhookEntry {
  id: string;
  time: number;
  changes?: Array<{
    field: string;
    value: Record<string, unknown>;
  }>;
  messaging?: Array<Record<string, unknown>>;
  standbys?: unknown[];
}

/** Facebook Messenger message event from entries[].messaging[] */
interface FBMessagingEvent {
  sender?: { id: string };
  recipient?: { id: string };
  timestamp?: number;
  message?: {
    mid?: string;
    text?: string;
    attachments?: Array<{ type: string; payload: Record<string, unknown> }>;
  };
  postback?: {
    payload: string;
  };
}

/** Instagram message from entries[].changes[].value.messages[] */
interface IGMessage {
  text?: string;
  from?: { id: string };
  to?: { id: string };
  mid?: string;
  is_echo?: boolean;
}

// ──────────────────────────────────────
// Round-robin lead assignment
// ──────────────────────────────────────

/**
 * Get the next active SALES_REP for round-robin assignment.
 * Counts total leads per rep and assigns to the one with the fewest.
 *
 * @returns The userId of the selected rep, or null if no active reps exist
 */
async function getNextRepForAssignment(): Promise<string | null> {
  try {
    const activeReps = await db.user.findMany({
      where: { role: 'SALES_REP', isActive: true },
      select: {
        id: true,
        _count: { select: { assignedLeads: { where: { status: { not: 'LOST' } } } } },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (activeReps.length === 0) return null;

    // Pick the rep with fewest active (non-lost) leads
    const sorted = activeReps.sort((a, b) => a._count.assignedLeads - b._count.assignedLeads);
    return sorted[0].id;
  } catch (error) {
    console.error('[meta-webhook] Failed to find rep for assignment:', error);
    return null;
  }
}

// ──────────────────────────────────────
// Find or create a lead from social media sender
// ──────────────────────────────────────

/**
 * Find an existing lead matching the social sender, or create a new one.
 * Checks:
 * 1. Lead tags JSON for stored social media IDs (e.g. facebookSenderId, instagramSenderId)
 * 2. Creates a new lead with source=FACEBOOK/INSTAGRAM if not found
 *
 * @param senderId    — The sender's platform-scoped ID (PSID for FB, IGSID for IG)
 * @param channel     — "FACEBOOK" or "INSTAGRAM"
 * @param senderName  — Optional display name from Meta
 * @returns The lead record
 */
async function findOrCreateLead(
  senderId: string,
  channel: 'FACEBOOK' | 'INSTAGRAM',
  senderName?: string,
) {
  const tagField = channel === 'FACEBOOK' ? 'facebookSenderId' : 'instagramSenderId';

  // Search for existing lead by social media ID stored in tags
  const existingLeads = await db.lead.findMany({
    where: { tags: { contains: senderId } },
    take: 10,
  });

  let lead = existingLeads.find((l) => {
    try {
      const tags = JSON.parse(l.tags || '[]');
      return tags.some(
        (t: string) => t === `${tagField}:${senderId}`,
      );
    } catch {
      return false;
    }
  });

  if (!lead) {
    // Auto-assign to next rep via round-robin
    const repId = await getNextRepForAssignment();

    // Split senderName into first/last name
    const nameParts = (senderName || 'Unknown').split(' ');
    const firstName = nameParts[0] || 'Unknown';
    const lastName = nameParts.slice(1).join(' ') || '';

    lead = await db.lead.create({
      data: {
        firstName,
        lastName,
        phone: `social_${senderId}`, // Placeholder — no phone from social
        source: channel,
        leadType: 'OTHER',
        status: 'NEW',
        leadScore: 30,
        temperature: 'COLD',
        assignedRepId: repId,
        tags: JSON.stringify([`${tagField}:${senderId}`]),
        remarks: `Auto-created from ${channel} message (sender: ${senderId})`,
      },
    });

    console.log(`[meta-webhook] New lead created: ${lead.id} from ${channel}`);

    // Notify the assigned rep about new lead
    if (repId) {
      await db.notification.create({
        data: {
          userId: repId,
          type: 'NEW_LEAD',
          title: `New ${channel} Lead`,
          message: `${firstName} ${lastName} just sent a message via ${channel}. Click to view details.`,
          link: `leads:${lead.id}`,
          sentVia: 'IN_APP',
        },
      });
    }

    // Audit log
    await createAuditLog({
      actorType: 'SYSTEM',
      actorName: 'Meta Webhook',
      entityType: 'LEAD',
      entityId: lead.id,
      action: 'CREATE',
      newValue: `${channel} lead auto-created`,
      remarks: `New lead from ${channel} sender ${senderId}`,
    });
  }

  return lead;
}

// ──────────────────────────────────────
// AI auto-response handler
// ──────────────────────────────────────

/**
 * Process an incoming message with the AI customer bot and send back a response.
 *
 * 1. Check for handoff triggers
 * 2. Try FAQ matching first (fast path)
 * 3. Build conversation context from last 5 messages
 * 4. Call LLM for a contextual response
 * 5. Send the AI response back via the appropriate channel
 * 6. Save the AI response as a Conversation record
 *
 * @param leadId      — The lead's database ID
 * @param messageText — The customer's incoming message
 * @param senderId    — The platform-scoped sender ID (for replying)
 * @param channel     — "FACEBOOK" or "INSTAGRAM"
 */
async function triggerAIResponse(
  leadId: string,
  messageText: string,
  senderId: string,
  channel: 'FACEBOOK' | 'INSTAGRAM',
) {
  try {
    // 1. Check for handoff triggers
    if (shouldHandoffToHuman(messageText)) {
      const lang = detectLanguage(messageText);
      const handoffMessages: Record<string, string> = {
        english: "I'll connect you with one of our team members who can help you better. Please hold on for a moment!",
        urdu: 'میں آپ کو ہماری ٹیم کے کسی رکن سے جوڑ دوں گا جو آپ کی بہتر مدد کر سکے۔ براہ کرم ایک لمحہ انتظار کریں!',
        roman_urdu: 'Main aap ko hamare team ke kisi member se connect kar doon ga jo aap ki behtar madad kar sake. Bara karm ek lamha intezar karein!',
      };
      const handoffMsg = handoffMessages[lang];

      // Send handoff message
      const sendFn = channel === 'FACEBOOK' ? sendFacebookMessage : sendInstagramMessage;
      await sendFn(senderId, handoffMsg);

      // Save AI handoff response
      await db.conversation.create({
        data: {
          leadId,
          channel,
          direction: 'OUTBOUND',
          messageText: handoffMsg,
          sentBy: 'AI_AGENT',
          aiAgentId: 2,
        },
      });

      // Notify assigned rep for human handoff
      const lead = await db.lead.findUnique({ where: { id: leadId }, select: { assignedRepId: true, firstName: true } });
      if (lead?.assignedRepId) {
        await db.notification.create({
          data: {
            userId: lead.assignedRepId,
            type: 'ESCALATION',
            title: `${channel} Handoff Request`,
            message: `${lead.firstName} requested to speak with a human agent via ${channel}. Please respond promptly.`,
            link: `leads:${leadId}`,
            sentVia: 'IN_APP',
          },
        });
      }

      await createAuditLog({
        actorType: 'AI_AGENT',
        actorId: '2',
        actorName: 'Customer Bot',
        entityType: 'CONVERSATION',
        entityId: leadId,
        action: 'UPDATE',
        remarks: `Handoff triggered on ${channel} for lead ${leadId}`,
      });

      return;
    }

    // 2. Send typing indicator while we process
    await sendTypingIndicator(senderId, channel);

    // 3. Try FAQ matching first
    const faqMatch = matchFAQ(messageText);
    let aiMessage: string | null = null;
    let handoffNeeded = false;

    if (faqMatch) {
      aiMessage = faqMatch.answer;
    } else {
      // 4. Build conversation history context (last 5 messages)
      const recentMessages = await db.conversation.findMany({
        where: { leadId },
        orderBy: { timestamp: 'desc' },
        take: 5,
        select: { messageText: true, direction: true, sentBy: true },
      });

      let conversationHistory = '';
      if (recentMessages.length > 0) {
        conversationHistory = recentMessages
          .reverse()
          .map((m) => `[${m.direction === 'INBOUND' ? 'Customer' : m.sentBy}]: ${m.messageText}`)
          .join('\n');
      }

      // 5. Call LLM
      const detectedLang = detectLanguage(messageText);
      const prompt = `Incoming message from ${channel}:
${conversationHistory ? `Conversation history:\n${conversationHistory}\n\n` : ''}Customer: ${messageText}

Detected language: ${detectedLang}
Lead ID: ${leadId}

Please respond to the customer's message. Remember to:
- Reply in the same language detected (${detectedLang})
- Answer questions about Sports Pavilion Rawalpindi
- If they seem interested in facilities, note which ones
- If they ask about pricing, provide ranges and suggest a visit
- Keep responses concise but friendly`;

      const systemPrompt = `You are the AI Customer Bot for Sports Pavilion Rawalpindi. You handle customer inquiries on WhatsApp, Instagram, and Facebook.

BUSINESS INFO:
- Location: Sports Pavilion, Rawalpindi, Pakistan
- Timings: Mon-Sat 6:00 AM - 11:00 PM, Sunday 7:00 AM - 10:00 PM
- Facilities: Cricket nets, Football ground, Gym, Swimming pool, Tennis courts, Basketball court, Squash courts, Jogging track
- Memberships: Monthly (₨5,000-8,000), Bi-Annual (₨25,000-40,000), Annual (₨45,000-70,000), Family packages available
- Day passes: ₨500 per person, ₨800 family of 4
- Corporate packages available with custom pricing

RULES:
1. Detect language (English, Urdu script, Roman Urdu) and reply in same language
2. Be polite, professional, and helpful
3. Answer FAQs accurately
4. For pricing, mention plans briefly and suggest a visit
5. Collect lead info if interested: name, phone, preferred date/time
6. NEVER make up pricing or info not provided
7. If frustrated/complaint/negotiation: handoff with "I'll connect you with a team member"

RESPOND ONLY WITH JSON: {"message": "<your reply>", "handoffNeeded": <boolean>, "leadData": {"interestedFacilities": ["<facilities>"], "urgency": "<low|medium|high>", "budgetInterest": <boolean>} or null}`;

      const llmResponse = await callLLM(prompt, systemPrompt, { temperature: 0.5, maxTokens: 500 });

      try {
        const result = parseJSONResponse(llmResponse) as {
          message: string;
          handoffNeeded: boolean;
          leadData?: { interestedFacilities: string[]; urgency: string; budgetInterest: boolean };
        };
        aiMessage = result.message;
        handoffNeeded = result.handoffNeeded ?? false;

        // Update lead data if AI extracted useful info
        if (result.leadData) {
          const updates: Record<string, unknown> = {};
          if (result.leadData.interestedFacilities?.length) {
            updates.interestedFacilities = JSON.stringify(result.leadData.interestedFacilities);
          }
          if (result.leadData.budgetInterest) {
            updates.budgetRange = 'NOT_DISCLOSED';
          }

          // Re-score the lead
          const scoring = calculateLeadScore({
            firstName: '', lastName: '',
            messageText,
            source: channel,
            interestedFacilities: result.leadData.interestedFacilities,
          });
          updates.leadScore = scoring.score;
          updates.temperature = scoring.temperature;

          if (Object.keys(updates).length > 0) {
            await db.lead.update({
              where: { id: leadId },
              data: updates as Record<string, string | number>,
            });
          }
        }
      } catch {
        aiMessage = llmResponse || 'Thank you for your interest in Sports Pavilion Rawalpindi!';
      }
    }

    // 6. Send the AI response back
    if (aiMessage) {
      const sendFn = channel === 'FACEBOOK' ? sendFacebookMessage : sendInstagramMessage;
      const sendResult = await sendFn(senderId, aiMessage);

      // Save AI response as conversation record
      if (sendResult.success) {
        await db.conversation.create({
          data: {
            leadId,
            channel,
            direction: 'OUTBOUND',
            messageText: aiMessage,
            sentBy: 'AI_AGENT',
            aiAgentId: 2,
          },
        });
      }

      // If AI flagged handoff, notify rep
      if (handoffNeeded) {
        const lead = await db.lead.findUnique({ where: { id: leadId }, select: { assignedRepId: true, firstName: true } });
        if (lead?.assignedRepId) {
          await db.notification.create({
            data: {
              userId: lead.assignedRepId,
              type: 'ESCALATION',
              title: `AI Handoff — ${channel}`,
              message: `AI flagged a conversation with ${lead.firstName} for human review on ${channel}.`,
              link: `leads:${leadId}`,
              sentVia: 'IN_APP',
            },
          });
        }
      }

      await createAuditLog({
        actorType: 'AI_AGENT',
        actorId: '2',
        actorName: 'Customer Bot',
        entityType: 'CONVERSATION',
        entityId: leadId,
        action: 'UPDATE',
        remarks: `AI auto-response sent via ${channel}`,
      });
    }
  } catch (error) {
    console.error(`[meta-webhook] AI auto-response failed for lead ${leadId}:`, error);
  }
}

// ──────────────────────────────────────
// Process a single incoming message
// ──────────────────────────────────────

/**
 * Core message processing logic for a single incoming message.
 * Finds/creates lead, saves conversation, updates lead status, triggers AI.
 *
 * @param senderId    — Platform-scoped sender ID
 * @param messageText — The message text
 * @param channel     — "FACEBOOK" or "INSTAGRAM"
 * @param senderName  — Optional display name
 */
async function processIncomingMessage(
  senderId: string,
  messageText: string,
  channel: 'FACEBOOK' | 'INSTAGRAM',
  senderName?: string,
) {
  try {
    // 1. Find or create lead
    const lead = await findOrCreateLead(senderId, channel, senderName);

    // 2. Save the inbound conversation
    await db.conversation.create({
      data: {
        leadId: lead.id,
        channel,
        direction: 'INBOUND',
        messageText,
        sentBy: 'CUSTOMER',
        senderId,
      },
    });

    // 3. Update lead status from NEW → CONTACTED
    if (lead.status === 'NEW') {
      await db.lead.update({
        where: { id: lead.id },
        data: { status: 'CONTACTED' },
      });

      await createAuditLog({
        actorType: 'SYSTEM',
        actorName: 'Meta Webhook',
        entityType: 'LEAD',
        entityId: lead.id,
        action: 'STATUS_CHANGE',
        oldValue: 'NEW',
        newValue: 'CONTACTED',
        remarks: `Auto-updated from ${channel} message`,
      });
    }

    // 4. Trigger AI auto-response (fire-and-forget — already in async context)
    await triggerAIResponse(lead.id, messageText, senderId, channel);
  } catch (error) {
    console.error('[meta-webhook] Failed to process incoming message:', error);
  }
}

// ──────────────────────────────────────
// Process a comment (Facebook or Instagram)
// ──────────────────────────────────────

/**
 * Process an incoming comment from Facebook or Instagram.
 * Creates a lead and conversation record but does NOT trigger AI auto-response
 * (comments require manual review).
 *
 * @param commentId   — The comment ID
 * @param commentText — The comment text
 * @param channel     — "FACEBOOK" or "INSTAGRAM"
 * @param fromUser    — User info { id, name? }
 * @param postId      — The post ID the comment was on
 */
async function processComment(
  commentId: string,
  commentText: string,
  channel: 'FACEBOOK' | 'INSTAGRAM',
  fromUser: { id: string; name?: string },
  postId?: string,
) {
  try {
    const lead = await findOrCreateLead(fromUser.id, channel, fromUser.name);

    await db.conversation.create({
      data: {
        leadId: lead.id,
        channel: `${channel}_COMMENT` as string,
        direction: 'INBOUND',
        messageText: `[Comment on ${postId || 'post'}]: ${commentText}`,
        sentBy: 'CUSTOMER',
        senderId: fromUser.id,
      },
    });

    // Update lead status
    if (lead.status === 'NEW') {
      await db.lead.update({
        where: { id: lead.id },
        data: { status: 'CONTACTED' },
      });
    }

    // Notify assigned rep about the comment
    if (lead.assignedRepId) {
      await db.notification.create({
        data: {
          userId: lead.assignedRepId,
          type: 'SYSTEM_ALERT',
          title: `New ${channel} Comment`,
          message: `${fromUser.name || 'Someone'} commented: "${commentText.substring(0, 100)}${commentText.length > 100 ? '...' : ''}"`,
          link: `leads:${lead.id}`,
          sentVia: 'IN_APP',
        },
      });
    }

    console.log(`[meta-webhook] ${channel} comment processed for lead ${lead.id}`);
  } catch (error) {
    console.error(`[meta-webhook] Failed to process ${channel} comment:`, error);
  }
}

// ──────────────────────────────────────
// GET Handler — Webhook Verification
// ──────────────────────────────────────

/**
 * GET /api/webhooks/meta
 *
 * Meta sends this during initial webhook setup to verify ownership.
 * Query params: hub.mode, hub.verify_token, hub.challenge
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const mode = searchParams.get('hub.mode') || '';
  const token = searchParams.get('hub.verify_token') || '';
  const challenge = searchParams.get('hub.challenge') || '';

  console.log('[meta-webhook] Verification request received', { mode, hasToken: !!token });

  const result = verifyMetaWebhook(mode, token, challenge);

  if (result.success && result.challenge) {
    return new NextResponse(result.challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return NextResponse.json(
    { error: 'Forbidden — invalid verification token' },
    { status: 403 },
  );
}

// ──────────────────────────────────────
// POST Handler — Event Receiver
// ──────────────────────────────────────

/**
 * POST /api/webhooks/meta
 *
 * Receives webhook events from Meta (Facebook Messenger, Instagram DMs, comments).
 *
 * Event types handled:
 * 1. Facebook Messenger messages: entries[].messaging[]
 * 2. Instagram DM messages: entries[].changes[].value.messages[]
 * 3. Facebook comments: entries[].changes[].value (comment field)
 * 4. Instagram comments: entries[].changes[].value (text field, media_id)
 *
 * IMPORTANT: Always returns 200 to Meta. Processing happens asynchronously.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Read raw body for signature verification
    const rawBody = await request.text();

    // 2. Verify X-Hub-Signature-256 header
    const signature = request.headers.get('x-hub-signature-256') || '';
    const appSecret = await getMetaAppSecret();

    if (appSecret && signature) {
      const isValid = await verifyWebhookSignature(rawBody, signature, appSecret);
      if (!isValid) {
        console.warn('[meta-webhook] Invalid webhook signature — rejecting');
        // Still return 200 to avoid Meta retrying, but log the event
        return NextResponse.json({ status: 'invalid_signature' }, { status: 200 });
      }
    } else if (!appSecret) {
      console.warn('[meta-webhook] No app secret configured — skipping signature verification');
    }

    // 3. Parse the body
    let body: { object: string; entry: MetaWebhookEntry[] };
    try {
      body = JSON.parse(rawBody);
    } catch {
      console.error('[meta-webhook] Failed to parse webhook body');
      return NextResponse.json({ status: 'ok' }, { status: 200 });
    }

    // 4. Only process "page" and "instagram" objects
    const object = body.object || '';
    if (object !== 'page' && object !== 'instagram') {
      console.log(`[meta-webhook] Ignoring unsupported object type: ${object}`);
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    // 5. Process events — FIRE AND FORGET
    // Always respond 200 immediately, then process in background
    Promise.allSettled(
      (body.entry || []).map(async (entry) => {
        // Handle Facebook Messenger events (messaging array)
        if (entry.messaging && entry.messaging.length > 0) {
          for (const msgEvent of entry.messaging) {
            const event = msgEvent as unknown as FBMessagingEvent;

            // Skip echo messages (our own outgoing messages)
            if (event.sender?.id === event.recipient?.id) continue;

            // Handle text messages only
            if (event.message?.text && event.sender?.id) {
              console.log('[meta-webhook] FB Messenger message:', {
                senderId: event.sender.id,
                text: event.message.text.substring(0, 80),
              });

              await processIncomingMessage(
                event.sender.id,
                event.message.text,
                'FACEBOOK',
              );
            }
          }
        }

        // Handle Instagram DMs and Comments (changes array)
        if (entry.changes && entry.changes.length > 0) {
          for (const change of entry.changes) {
            const value = change.value;

            // Instagram DM messages
            if (
              change.field === 'messages' &&
              Array.isArray(value.messages) &&
              value.messages.length > 0
            ) {
              for (const igMsg of value.messages as IGMessage[]) {
                // Skip echo messages
                if (igMsg.is_echo) continue;

                if (igMsg.text && igMsg.from?.id) {
                  console.log('[meta-webhook] Instagram DM:', {
                    senderId: igMsg.from.id,
                    text: igMsg.text.substring(0, 80),
                  });

                  await processIncomingMessage(
                    igMsg.from.id,
                    igMsg.text,
                    'INSTAGRAM',
                  );
                }
              }
            }

            // Instagram Comments
            if (change.field === 'comments' && value.id && value.text) {
              const fromId = (value.from as Record<string, unknown>)?.id as string | undefined;
              const fromName = (value.from as Record<string, unknown>)?.name as string | undefined;
              const mediaId = value.media_id as string | undefined;

              console.log('[meta-webhook] Instagram comment:', {
                commentId: value.id,
                text: (value.text as string).substring(0, 80),
              });

              if (fromId) {
                await processComment(
                  value.id as string,
                  value.text as string,
                  'INSTAGRAM',
                  { id: fromId, name: fromName },
                  mediaId,
                );
              }
            }

            // Facebook Comments
            if (
              change.field === 'feed' &&
              value.comment_id &&
              value.message &&
              value.from
            ) {
              const from = value.from as { id: string; name?: string };

              console.log('[meta-webhook] Facebook comment:', {
                commentId: value.comment_id,
                text: (value.message as string).substring(0, 80),
              });

              await processComment(
                value.comment_id as string,
                value.message as string,
                'FACEBOOK',
                { id: from.id, name: from.name },
                value.post_id as string | undefined,
              );
            }
          }
        }
      }),
    ).then((results) => {
      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length > 0) {
        console.error(`[meta-webhook] ${failures.length} event(s) failed to process`);
        failures.forEach((f, i) => {
          console.error(`[meta-webhook] Failure ${i + 1}:`, f.reason);
        });
      }
    });

    // 6. Always return 200 immediately
    return NextResponse.json({ status: 'received' }, { status: 200 });
  } catch (error) {
    // CRITICAL: Even on unexpected errors, return 200 to Meta
    // to prevent webhook deactivation
    console.error('[meta-webhook] Unhandled error in POST handler:', error);
    return NextResponse.json({ status: 'error_handled' }, { status: 200 });
  }
}

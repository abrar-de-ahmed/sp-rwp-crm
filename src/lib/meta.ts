import { db } from '@/lib/db';

// ──────────────────────────────────────
// Meta Graph API Configuration
// ──────────────────────────────────────

/** Meta Graph API base URL (v19.0) */
const META_GRAPH_API = 'https://graph.facebook.com/v19.0';

/** Default verify token used for webhook handshake when META_VERIFY_TOKEN env is not set */
const DEFAULT_VERIFY_TOKEN = 'sp-rwp-crm-meta-verify';

// ──────────────────────────────────────
// Webhook Verification
// ──────────────────────────────────────

/**
 * Verify a Meta webhook subscription request (GET handler).
 *
 * During initial webhook setup, Meta sends a GET request with hub.mode,
 * hub.verify_token, and hub.challenge. We must return the challenge
 * string to confirm ownership.
 *
 * @param mode      — hub.mode (must be "subscribe")
 * @param token     — hub.verify_token (must match our META_VERIFY_TOKEN)
 * @param challenge — hub.challenge (echo back on success)
 * @returns Object with success flag and optional challenge string
 */
export function verifyMetaWebhook(
  mode: string,
  token: string,
  challenge: string,
): { success: boolean; challenge?: string } {
  const verifyToken = process.env.META_VERIFY_TOKEN || DEFAULT_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[meta] Webhook verified successfully');
    return { success: true, challenge };
  }

  console.warn('[meta] Webhook verification failed', { mode, tokenProvided: !!token });
  return { success: false };
}

// ──────────────────────────────────────
// Token & Secret Helpers
// ──────────────────────────────────────

/**
 * Retrieve the stored Facebook Page access token from ChannelConnection.
 * Looks for the FACEBOOK channel connection record.
 *
 * @returns The page access token string, or null if not found/disconnected
 */
export async function getPageAccessToken(): Promise<string | null> {
  try {
    const connection = await db.channelConnection.findFirst({
      where: { channel: 'FACEBOOK', status: 'CONNECTED' },
      select: { accessToken: true },
    });

    return connection?.accessToken ?? null;
  } catch (error) {
    console.error('[meta] Failed to get page access token:', error);
    return null;
  }
}

/**
 * Retrieve the Meta App Secret from channel metadata.
 * Stored as JSON string in ChannelConnection.metadata for the FACEBOOK channel.
 *
 * @returns The app secret string, or null if not found
 */
export async function getMetaAppSecret(): Promise<string | null> {
  try {
    const connection = await db.channelConnection.findFirst({
      where: { channel: 'FACEBOOK' },
      select: { metadata: true },
    });

    if (!connection?.metadata) return null;

    const meta = JSON.parse(connection.metadata);
    return meta?.appSecret ?? process.env.META_APP_SECRET ?? null;
  } catch (error) {
    console.error('[meta] Failed to get app secret:', error);
    return process.env.META_APP_SECRET ?? null;
  }
}

// ──────────────────────────────────────
// Token Verification
// ──────────────────────────────────────

/**
 * Verify a Facebook Page access token is valid by calling the Meta Graph API.
 * Uses the /me endpoint which returns page info for valid tokens.
 *
 * @param accessToken — The page access token to verify
 * @returns Object with validity flag, page name, page ID, or error message
 */
export async function verifyPageToken(accessToken: string): Promise<{
  valid: boolean;
  pageName?: string;
  pageId?: string;
  error?: string;
}> {
  try {
    const url = `${META_GRAPH_API}/me?fields=name,id&access_token=${encodeURIComponent(accessToken)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json() as Record<string, unknown>;

    if (data.error) {
      const err = data.error as { message?: string; code?: number };
      console.error('[meta] Token verification failed:', err.message);
      return {
        valid: false,
        error: err.message || `Meta API error (code: ${err.code || 'unknown'})`,
      };
    }

    return {
      valid: true,
      pageName: data.name as string,
      pageId: data.id as string,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[meta] Token verification request failed:', message);
    return { valid: false, error: message };
  }
}

// ──────────────────────────────────────
// Instagram Business Account
// ──────────────────────────────────────

/**
 * Get the Instagram Business Account linked to a Facebook Page.
 * Uses the /me/accounts endpoint to find connected IG business accounts.
 *
 * @param accessToken — A valid Facebook Page access token
 * @returns Object with IG user ID and username, or null if not found/linked
 */
export async function getInstagramBusinessAccount(accessToken: string): Promise<{
  id: string;
  username: string;
} | null> {
  try {
    const url = `${META_GRAPH_API}/me/accounts?fields=instagram_business_account{id,username}&access_token=${encodeURIComponent(accessToken)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json() as Record<string, unknown>;

    if (data.error) {
      const err = data.error as { message?: string };
      console.error('[meta] Failed to fetch IG business account:', err.message);
      return null;
    }

    const accounts = data.data as Array<{ instagram_business_account?: { id: string; username: string } }> | undefined;

    if (!accounts || accounts.length === 0) {
      console.warn('[meta] No accounts found or no IG business account linked');
      return null;
    }

    // Use the first account that has an IG business account
    for (const account of accounts) {
      if (account.instagram_business_account) {
        return account.instagram_business_account;
      }
    }

    return null;
  } catch (error) {
    console.error('[meta] Instagram business account lookup failed:', error);
    return null;
  }
}

// ──────────────────────────────────────
// Facebook Messenger API
// ──────────────────────────────────────

/**
 * Send a message via Facebook Messenger.
 *
 * POST to /{pageId}/messages with:
 *   - recipient: { id: psid }
 *   - message: { text: messageText }
 *   - access_token: pageAccessToken
 *
 * @param recipientPsid — The PSID (Page-Scoped ID) of the message recipient
 * @param messageText   — The text message to send
 * @param accessToken   — Optional; falls back to stored page access token
 * @returns Object with success flag, message ID (on success), or error
 */
export async function sendFacebookMessage(
  recipientPsid: string,
  messageText: string,
  accessToken?: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const token = accessToken || await getPageAccessToken();
    if (!token) {
      return { success: false, error: 'No Facebook page access token available' };
    }

    // Use /me/messages which maps to the page associated with the token
    const url = `${META_GRAPH_API}/me/messages?access_token=${encodeURIComponent(token)}`;

    const body = {
      recipient: { id: recipientPsid },
      message: { text: messageText },
      messaging_type: 'RESPONSE',
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json() as Record<string, unknown>;

    if (data.error) {
      const err = data.error as { message?: string; code?: number };
      console.error('[meta] Facebook message send failed:', err.message);
      return { success: false, error: err.message || 'Meta API error' };
    }

    const messageId = data.message_id as string | undefined;
    console.log('[meta] Facebook message sent:', messageId);
    return { success: true, messageId };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[meta] Facebook message send exception:', message);
    return { success: false, error: message };
  }
}

// ──────────────────────────────────────
// Instagram DM API
// ──────────────────────────────────────

/**
 * Send a message via Instagram DM.
 *
 * POST to /{igUserId}/messages with:
 *   - recipient: { id: recipientId }
 *   - message: { text: messageText }
 *   - access_token: pageAccessToken
 *
 * Instagram DMs use the same Page access token as Facebook Messenger.
 *
 * @param recipientId — The Instagram Scrape ID (IGSID) of the recipient
 * @param messageText — The text message to send
 * @param accessToken — Optional; falls back to stored page access token
 * @returns Object with success flag, message ID (on success), or error
 */
export async function sendInstagramMessage(
  recipientId: string,
  messageText: string,
  accessToken?: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const token = accessToken || await getPageAccessToken();
    if (!token) {
      return { success: false, error: 'No page access token available for Instagram' };
    }

    // Look up the IG user ID from the Instagram channel connection metadata
    const igConnection = await db.channelConnection.findFirst({
      where: { channel: 'INSTAGRAM', status: 'CONNECTED' },
      select: { id: true, metadata: true },
    });

    let igUserId: string | null = null;
    if (igConnection?.metadata) {
      const meta = JSON.parse(igConnection.metadata);
      igUserId = meta?.igUserId || meta?.instagramBusinessAccountId || null;
    }

    if (!igUserId) {
      // Try to look it up from the FB token
      const igAccount = await getInstagramBusinessAccount(token);
      if (!igAccount) {
        return { success: false, error: 'No Instagram Business Account linked to this page' };
      }
      igUserId = igAccount.id;

      // Cache it
      if (igConnection) {
        await db.channelConnection.update({
          where: { id: igConnection.id },
          data: {
            metadata: JSON.stringify({
              ...JSON.parse(igConnection.metadata || '{}'),
              igUserId: igAccount.id,
              igUsername: igAccount.username,
            }),
          },
        });
      }
    }

    const url = `${META_GRAPH_API}/${igUserId}/messages?access_token=${encodeURIComponent(token)}`;

    const body = {
      recipient: { id: recipientId },
      message: { text: messageText },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json() as Record<string, unknown>;

    if (data.error) {
      const err = data.error as { message?: string; code?: number };
      console.error('[meta] Instagram message send failed:', err.message);
      return { success: false, error: err.message || 'Meta API error' };
    }

    const messageId = data.message_id as string | undefined;
    console.log('[meta] Instagram message sent:', messageId);
    return { success: true, messageId };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[meta] Instagram message send exception:', message);
    return { success: false, error: message };
  }
}

// ──────────────────────────────────────
// Typing Indicator
// ──────────────────────────────────────

/**
 * Send a typing indicator to show the customer that a response is being composed.
 * Facebook Messenger and Instagram DMs support this via the sender_action field.
 *
 * For Facebook: POST /me/messages with sender_action: "typing_on"
 * For Instagram: POST /{igUserId}/messages with sender_action: "typing_on"
 *
 * @param recipientId — The PSID (Facebook) or IGSID (Instagram) of the recipient
 * @param channel     — Which channel to send the indicator on
 * @param accessToken — Optional; falls back to stored page access token
 */
export async function sendTypingIndicator(
  recipientId: string,
  channel: 'FACEBOOK' | 'INSTAGRAM',
  accessToken?: string,
): Promise<void> {
  try {
    const token = accessToken || await getPageAccessToken();
    if (!token) {
      console.warn('[meta] Cannot send typing indicator: no access token');
      return;
    }

    let url: string;
    if (channel === 'INSTAGRAM') {
      const igConnection = await db.channelConnection.findFirst({
        where: { channel: 'INSTAGRAM', status: 'CONNECTED' },
        select: { metadata: true },
      });

      let igUserId: string | null = null;
      if (igConnection?.metadata) {
        const meta = JSON.parse(igConnection.metadata);
        igUserId = meta?.igUserId || null;
      }

      if (!igUserId) {
        const igAccount = await getInstagramBusinessAccount(token);
        if (!igAccount) {
          console.warn('[meta] Cannot send IG typing indicator: no IG business account');
          return;
        }
        igUserId = igAccount.id;
      }

      url = `${META_GRAPH_API}/${igUserId}/messages?access_token=${encodeURIComponent(token)}`;
    } else {
      url = `${META_GRAPH_API}/me/messages?access_token=${encodeURIComponent(token)}`;
    }

    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientId },
        sender_action: 'typing_on',
      }),
    });

    console.log(`[meta] Typing indicator sent via ${channel}`);
  } catch (error) {
    console.error(`[meta] Failed to send typing indicator via ${channel}:`, error);
  }
}

// ──────────────────────────────────────
// Webhook Subscription
// ──────────────────────────────────────

/**
 * Subscribe the Meta app to a Facebook Page's messages webhook.
 * This enables the app to receive message events for the page.
 *
 * POST to /{pageId}/subscribed_apps with:
 *   - subscribed_fields: "messages,messaging_postbacks"
 *   - access_token: pageAccessToken
 *
 * @param pageId      — The Facebook Page ID to subscribe to
 * @param accessToken — A valid page access token with pages_messaging permission
 * @returns Object with success flag and optional error
 */
export async function subscribeAppToPage(
  pageId: string,
  accessToken: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `${META_GRAPH_API}/${pageId}/subscribed_apps`;

    const body = {
      access_token: accessToken,
      subscribed_fields: [
        'messages',
        'messaging_postbacks',
        'message_deliveries',
        'message_reads',
      ],
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json() as Record<string, unknown>;

    if (data.error) {
      const err = data.error as { message?: string; code?: number };
      console.error('[meta] Page subscription failed:', err.message);
      return { success: false, error: err.message || 'Subscription failed' };
    }

    const success = data.success as boolean;
    console.log('[meta] App subscribed to page:', pageId, success);
    return { success: success ?? true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[meta] Page subscription exception:', message);
    return { success: false, error: message };
  }
}

// ──────────────────────────────────────
// WhatsApp Cloud API (helper)
// ──────────────────────────────────────

/**
 * Send a WhatsApp message via the WhatsApp Cloud API.
 * Used by the unified messaging endpoint.
 *
 * @param recipientPhone — The recipient's phone number in international format
 * @param messageText    — The text message to send
 * @param phoneNumberId  — The WhatsApp Business phone number ID
 * @param accessToken    — The WhatsApp Business access token
 * @returns Object with success flag, message ID (on success), or error
 */
export async function sendWhatsAppMessage(
  recipientPhone: string,
  messageText: string,
  phoneNumberId: string,
  accessToken: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

    const body = {
      messaging_product: 'whatsapp',
      to: recipientPhone,
      type: 'text',
      text: { body: messageText },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json() as Record<string, unknown>;

    if (data.error) {
      const err = data.error as { message?: string; code?: number };
      console.error('[meta] WhatsApp message send failed:', err.message);
      return { success: false, error: err.message || 'WhatsApp API error' };
    }

    const messages = data.messages as Array<{ id: string }> | undefined;
    const messageId = messages?.[0]?.id;
    console.log('[meta] WhatsApp message sent:', messageId);
    return { success: true, messageId };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[meta] WhatsApp message send exception:', message);
    return { success: false, error: message };
  }
}

import { db } from '@/lib/db';

// ──────────────────────────────────────
// WhatsApp Cloud API Client
// ──────────────────────────────────────
// Comprehensive client for Meta WhatsApp Business Cloud API v19.0
// Handles message sending, template messages, interactive messages,
// typing indicators, and read receipts.

const WHATSAPP_API_BASE = 'https://graph.facebook.com/v19.0';

/**
 * Verify webhook challenge from Meta during webhook setup.
 * Meta sends GET with hub.mode, hub.verify_token, hub.challenge.
 * We must respond with the challenge string and 200 status.
 */
export function verifyWhatsAppWebhook(
  mode: string,
  token: string,
  challenge: string,
): { success: boolean; challenge?: string } {
  const expectedMode = 'subscribe';
  const expectedToken =
    process.env.WHATSAPP_VERIFY_TOKEN || 'sp-rwp-crm-whatsapp-verify';

  if (mode === expectedMode && token === expectedToken) {
    console.log('[WhatsApp] Webhook verification successful');
    return { success: true, challenge };
  }

  console.warn('[WhatsApp] Webhook verification failed — invalid mode or token');
  return { success: false };
}

/**
 * Retrieve the stored WhatsApp access token from ChannelConnection table.
 */
export async function getWhatsAppAccessToken(): Promise<string | null> {
  try {
    const connection = await db.channelConnection.findFirst({
      where: { channel: 'WHATSAPP', status: 'CONNECTED' },
      select: { accessToken: true },
    });

    return connection?.accessToken ?? null;
  } catch (error) {
    console.error('[WhatsApp] Failed to fetch access token:', error);
    return null;
  }
}

/**
 * Retrieve the WhatsApp Phone Number ID from channel metadata.
 * The metadata JSON should contain { phoneNumberId: "..." }.
 */
export async function getWhatsAppPhoneNumberId(): Promise<string | null> {
  try {
    const connection = await db.channelConnection.findFirst({
      where: { channel: 'WHATSAPP', status: 'CONNECTED' },
      select: { metadata: true },
    });

    if (!connection?.metadata) return null;

    const meta = JSON.parse(connection.metadata) as Record<string, unknown>;
    return (meta.phoneNumberId as string) ?? null;
  } catch (error) {
    console.error('[WhatsApp] Failed to fetch phone number ID:', error);
    return null;
  }
}

/**
 * Verify that a WhatsApp access token and phone number ID are valid
 * by calling the Graph API's phone number endpoint.
 */
export async function verifyWhatsAppToken(
  accessToken: string,
  phoneNumberId: string,
): Promise<{ valid: boolean; displayPhone?: string; error?: string }> {
  try {
    const url = `${WHATSAPP_API_BASE}/${phoneNumberId}?fields=verified_name,display_phone_number`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const errData = (await response.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      return {
        valid: false,
        error: errData?.error?.message || `API returned ${response.status}`,
      };
    }

    const data = (await response.json()) as {
      display_phone_number?: string;
      verified_name?: string;
    };

    console.log('[WhatsApp] Token verified for phone:', data.display_phone_number);
    return {
      valid: true,
      displayPhone: data.display_phone_number,
    };
  } catch (error) {
    console.error('[WhatsApp] Token verification failed:', error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send a text message via WhatsApp Cloud API.
 * Phone number must include country code without + (e.g., "923001234567").
 */
export async function sendWhatsAppMessage(
  to: string,
  messageText: string,
  accessToken?: string,
  phoneNumberId?: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const token =
      accessToken || (await getWhatsAppAccessToken()) || undefined;
    const phoneId =
      phoneNumberId || (await getWhatsAppPhoneNumberId()) || undefined;

    if (!token || !phoneId) {
      console.error('[WhatsApp] Missing access token or phone number ID');
      return { success: false, error: 'WhatsApp not configured' };
    }

    const url = `${WHATSAPP_API_BASE}/${phoneId}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: messageText },
      }),
    });

    if (!response.ok) {
      const errData = (await response.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      const errorMsg = errData?.error?.message || `API returned ${response.status}`;
      console.error('[WhatsApp] Send message failed:', errorMsg);
      return { success: false, error: errorMsg };
    }

    const data = (await response.json()) as {
      messages?: { id: string }[];
    };
    const messageId = data?.messages?.[0]?.id;

    console.log(`[WhatsApp] Message sent to ${to}, ID: ${messageId}`);
    return { success: true, messageId };
  } catch (error) {
    console.error('[WhatsApp] sendWhatsAppMessage error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send a WhatsApp template message.
 * Templates must be pre-approved in the Meta Business Manager.
 */
export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  languageCode: string,
  parameters?: string[],
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const token = await getWhatsAppAccessToken();
    const phoneId = await getWhatsAppPhoneNumberId();

    if (!token || !phoneId) {
      return { success: false, error: 'WhatsApp not configured' };
    }

    const url = `${WHATSAPP_API_BASE}/${phoneId}/messages`;

    // Build components array for template parameters
    const components: Array<Record<string, unknown>> = [];

    if (parameters && parameters.length > 0) {
      components.push({
        type: 'body',
        parameters: parameters.map((p) => ({
          type: 'text',
          text: p,
        })),
      });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          ...(components.length > 0 ? { components } : {}),
        },
      }),
    });

    if (!response.ok) {
      const errData = (await response.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      const errorMsg = errData?.error?.message || `API returned ${response.status}`;
      console.error('[WhatsApp] Template send failed:', errorMsg);
      return { success: false, error: errorMsg };
    }

    const data = (await response.json()) as {
      messages?: { id: string }[];
    };
    const messageId = data?.messages?.[0]?.id;

    console.log(`[WhatsApp] Template "${templateName}" sent to ${to}, ID: ${messageId}`);
    return { success: true, messageId };
  } catch (error) {
    console.error('[WhatsApp] sendWhatsAppTemplate error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send a typing indicator to show the customer that a response is being composed.
 * Typing indicators expire after ~20 seconds, so this is best used right before sending.
 */
export async function sendWhatsAppTyping(to: string): Promise<void> {
  try {
    const token = await getWhatsAppAccessToken();
    const phoneId = await getWhatsAppPhoneNumberId();

    if (!token || !phoneId) {
      console.error('[WhatsApp] Cannot send typing — not configured');
      return;
    }

    const url = `${WHATSAPP_API_BASE}/${phoneId}/messages`;

    await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'reaction',
      }),
    });

    console.log(`[WhatsApp] Typing indicator sent to ${to}`);
  } catch (error) {
    console.error('[WhatsApp] sendWhatsAppTyping error:', error);
  }
}

/**
 * Send an interactive WhatsApp message (list, buttons, reply buttons).
 *
 * @param to - Recipient phone number with country code
 * @param type - Interactive type: "list", "button", "product_list", "product"
 * @param content - The interactive content object per WhatsApp API spec
 */
export async function sendWhatsAppInteractive(
  to: string,
  type: string,
  content: Record<string, unknown>,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const token = await getWhatsAppAccessToken();
    const phoneId = await getWhatsAppPhoneNumberId();

    if (!token || !phoneId) {
      return { success: false, error: 'WhatsApp not configured' };
    }

    const url = `${WHATSAPP_API_BASE}/${phoneId}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'interactive',
        interactive: {
          type,
          ...content,
        },
      }),
    });

    if (!response.ok) {
      const errData = (await response.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      const errorMsg = errData?.error?.message || `API returned ${response.status}`;
      console.error('[WhatsApp] Interactive message failed:', errorMsg);
      return { success: false, error: errorMsg };
    }

    const data = (await response.json()) as {
      messages?: { id: string }[];
    };
    const messageId = data?.messages?.[0]?.id;

    console.log(`[WhatsApp] Interactive (${type}) sent to ${to}, ID: ${messageId}`);
    return { success: true, messageId };
  } catch (error) {
    console.error('[WhatsApp] sendWhatsAppInteractive error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Mark a WhatsApp message as read.
 * Uses the /messages endpoint with the message ID and status "read".
 */
export async function markWhatsAppAsRead(messageId: string): Promise<void> {
  try {
    const token = await getWhatsAppAccessToken();
    const phoneId = await getWhatsAppPhoneNumberId();

    if (!token || !phoneId) {
      console.error('[WhatsApp] Cannot mark as read — not configured');
      return;
    }

    const url = `${WHATSAPP_API_BASE}/${phoneId}/messages`;

    await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      }),
    });

    console.log(`[WhatsApp] Message ${messageId} marked as read`);
  } catch (error) {
    console.error('[WhatsApp] markWhatsAppAsRead error:', error);
  }
}

/**
 * Verify the webhook signature using HMAC-SHA256.
 * Meta sends X-Hub-Signature-256 header for verification.
 * Uses Web Crypto API for compatibility with Cloudflare Workers.
 */
export async function verifyWebhookSignature(
  body: string,
  signature: string | null,
): Promise<boolean> {
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  // If no app secret configured, skip verification (dev mode)
  if (!appSecret) {
    console.warn('[WhatsApp] No WHATSAPP_APP_SECRET set — skipping signature verification');
    return true;
  }

  if (!signature) {
    console.warn('[WhatsApp] No X-Hub-Signature-256 header received');
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(appSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const signed = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(body),
    );
    const expectedSignature = `sha256=${Array.from(new Uint8Array(signed))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')}`;

    // Constant-time comparison
    const sigBuf = encoder.encode(signature);
    const expBuf = encoder.encode(expectedSignature);

    if (sigBuf.length !== expBuf.length) {
      return false;
    }

    const sigArr = new Uint8Array(sigBuf);
    const expArr = new Uint8Array(expBuf);
    let result = 0;
    for (let i = 0; i < sigArr.length; i++) {
      result |= sigArr[i] ^ expArr[i];
    }

    if (result !== 0) {
      console.error('[WhatsApp] Webhook signature mismatch');
    }

    return result === 0;
  } catch (error) {
    console.error('[WhatsApp] Signature verification error:', error);
    return false;
  }
}

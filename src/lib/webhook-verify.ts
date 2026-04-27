// ──────────────────────────────────────
// Webhook Signature Verification
// ──────────────────────────────────────

/**
 * Verify an incoming webhook request's X-Hub-Signature-256 header.
 *
 * Meta (Facebook/Instagram) signs webhook payloads using HMAC-SHA256:
 *   signature = "sha256=" + HMAC-SHA256(appSecret, rawBody)
 *
 * Uses Web Crypto API which works on both Node.js and Cloudflare Workers.
 */
export async function verifyWebhookSignature(
  payload: string,
  signature: string,
  appSecret: string,
): Promise<boolean> {
  if (!payload || !signature || !appSecret) {
    console.warn('[webhook-verify] Missing payload, signature, or appSecret');
    return false;
  }

  // The signature from Meta always starts with "sha256="
  const expectedPrefix = 'sha256=';
  if (!signature.startsWith(expectedPrefix)) {
    console.warn('[webhook-verify] Signature does not start with "sha256="');
    return false;
  }

  const providedHash = signature.slice(expectedPrefix.length);

  try {
    // Use Web Crypto API (works on both Node.js and Cloudflare Workers)
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
      encoder.encode(payload),
    );
    const computedHash = Array.from(new Uint8Array(signed))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Constant-time comparison
    if (providedHash.length !== computedHash.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < providedHash.length; i++) {
      result |= providedHash.charCodeAt(i) ^ computedHash.charCodeAt(i);
    }
    return result === 0;
  } catch {
    console.warn('[webhook-verify] Signature verification failed');
    return false;
  }
}

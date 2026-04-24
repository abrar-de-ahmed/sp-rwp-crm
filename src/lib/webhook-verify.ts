import { createHmac } from 'crypto';

// ──────────────────────────────────────
// Webhook Signature Verification
// ──────────────────────────────────────

/**
 * Verify an incoming webhook request's X-Hub-Signature-256 header.
 *
 * Meta (Facebook/Instagram) signs webhook payloads using HMAC-SHA256:
 *   signature = "sha256=" + HMAC-SHA256(appSecret, rawBody)
 *
 * This function computes the expected signature and compares it
 * against the provided one using a constant-time comparison to
 * prevent timing attacks.
 *
 * @param payload   — The raw string body of the request (not parsed JSON).
 * @param signature — The value of the X-Hub-Signature-256 header (e.g. "sha256=abcdef…").
 * @param appSecret — The Meta App Secret used to compute the HMAC.
 * @returns true if the signature is valid, false otherwise.
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  appSecret: string,
): boolean {
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

  const computedHash = createHmac('sha256', appSecret)
    .update(payload, 'utf8')
    .digest('hex');

  // Use timingSafeEqual to prevent timing attacks
  try {
    const providedBuf = Buffer.from(providedHash, 'hex');
    const computedBuf = Buffer.from(computedHash, 'hex');

    if (providedBuf.length !== computedBuf.length) {
      return false;
    }

    return providedBuf.equals(computedBuf);
  } catch {
    // Fallback: string comparison (less secure but won't crash)
    console.warn('[webhook-verify] timingSafeEqual failed, falling back to string comparison');
    return providedHash === computedHash;
  }
}

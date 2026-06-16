/**
 * Creem.io webhook signature verification.
 *
 * Creem signs the raw request body with HMAC-SHA256 using the webhook
 * secret (Developers → Webhooks in the Creem dashboard) and sends the
 * hex digest in the `creem-signature` header. We must verify the raw
 * body BEFORE parsing JSON — otherwise anyone could POST fake events and
 * grant themselves subscriptions. Uses Web Crypto so it runs on Workers.
 */

async function hmacSha256Hex(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Constant-time hex comparison — `===` short-circuits on the first
// differing byte, leaking match-prefix length through response timing.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyCreemSignature(
  rawBody: string,
  signature: string,
  secret: string
): Promise<boolean> {
  if (!signature || !secret) return false;
  const expected = await hmacSha256Hex(rawBody, secret);
  return timingSafeEqual(expected.toLowerCase(), signature.trim().toLowerCase());
}

// Stripe webhook signature verification (Web Crypto API, Workers-compatible).
//
// Stripe sends a `Stripe-Signature` header of the form:
//   t=<timestamp>,v1=<hex hmac sha256>,v1=<...>
// We compute HMAC-SHA256(secret, `${timestamp}.${rawBody}`) and reject the
// payload unless at least one v1 candidate matches in constant time AND
// the timestamp is within the replay tolerance window.

interface ParsedHeader {
  t: string;
  v1: string[];
}

function parseStripeSigHeader(header: string): ParsedHeader | null {
  const t: string[] = [];
  const v1: string[] = [];
  for (const part of header.split(',')) {
    const [k, v] = part.split('=', 2);
    if (k === 't' && v) t.push(v);
    else if (k === 'v1' && v) v1.push(v);
  }
  if (t.length !== 1 || v1.length === 0) return null;
  return { t: t[0], v1 };
}

function hexToBytes(hex: string): Uint8Array | null {
  if (hex.length % 2 !== 0) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    const byte = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) return null;
    out[i] = byte;
  }
  return out;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function verifyStripeSignature(
  rawBody: string,
  header: string,
  secret: string,
  toleranceSeconds: number = 300
): Promise<boolean> {
  if (!header || !secret) return false;
  const parsed = parseStripeSigHeader(header);
  if (!parsed) return false;

  const ts = parseInt(parsed.t, 10);
  if (!Number.isFinite(ts)) return false;
  const skewSeconds = Math.abs(Math.floor(Date.now() / 1000) - ts);
  if (skewSeconds > toleranceSeconds) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const expected = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${parsed.t}.${rawBody}`))
  );

  for (const candidate of parsed.v1) {
    const sig = hexToBytes(candidate);
    if (sig && timingSafeEqual(sig, expected)) return true;
  }
  return false;
}

// Test helper — produces a valid Stripe-Signature header for the given
// payload. Used only from tests; not imported by runtime code.
export async function signStripePayload(
  rawBody: string,
  secret: string,
  timestamp: number = Math.floor(Date.now() / 1000)
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${rawBody}`))
  );
  const hex = Array.from(sig)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `t=${timestamp},v1=${hex}`;
}

import type { JWTPayload, User } from '../types';

// PBKDF2 iteration counts.
//   - V1 (legacy `$pbkdf2$...`): 100,000 — original baseline.
//   - V2 (`$pbkdf2v2$<iters>$...`): 600,000 — OWASP 2023 minimum for
//     PBKDF2-HMAC-SHA256.
// Existing DB rows in the V1 format MUST keep verifying. New hashes
// always go out in the V2 format; callers can lazily upgrade legacy
// rows via `needsRehash()` after a successful login.
const PBKDF2_V1_ITERATIONS = 100000;
export const PBKDF2_TARGET_ITERATIONS = 600000;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
  const match = hex.match(/.{2}/g);
  if (!match) return new Uint8Array(0);
  return new Uint8Array(match.map((b) => parseInt(b, 16)));
}

async function derivePbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  // Cast through `BufferSource` — the lib.dom variant of `Uint8Array` is
  // generic over its backing buffer (ArrayBuffer vs SharedArrayBuffer) and
  // doesn't structurally match `BufferSource` without help.
  const hash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  return bytesToHex(new Uint8Array(hash));
}

// PBKDF2-SHA256 password hashing using Web Crypto API (Workers compatible).
// Always emits the V2 format with PBKDF2_TARGET_ITERATIONS.
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hashHex = await derivePbkdf2(password, salt, PBKDF2_TARGET_ITERATIONS);
  return `$pbkdf2v2$${PBKDF2_TARGET_ITERATIONS}$${bytesToHex(salt)}$${hashHex}`;
}

// Parse a stored hash and figure out which iteration count was used.
// Returns null for unrecognised / malformed input.
interface ParsedHash {
  version: 'v1' | 'v2';
  iterations: number;
  salt: Uint8Array;
  hashHex: string;
}

function parseStoredHash(stored: string): ParsedHash | null {
  if (!stored || stored.includes('SEED_PLACEHOLDER')) return null;

  const parts = stored.split('$');
  // V1: ``, `pbkdf2`, salt, hash → 4 parts
  if (parts.length === 4 && parts[1] === 'pbkdf2') {
    if (!/^[0-9a-f]+$/i.test(parts[2]) || !/^[0-9a-f]+$/i.test(parts[3])) return null;
    return {
      version: 'v1',
      iterations: PBKDF2_V1_ITERATIONS,
      salt: hexToBytes(parts[2]),
      hashHex: parts[3].toLowerCase(),
    };
  }
  // V2: ``, `pbkdf2v2`, iters, salt, hash → 5 parts
  if (parts.length === 5 && parts[1] === 'pbkdf2v2') {
    const iters = parseInt(parts[2], 10);
    if (!Number.isFinite(iters) || iters < 1 || iters > 10_000_000) return null;
    if (!/^[0-9a-f]+$/i.test(parts[3]) || !/^[0-9a-f]+$/i.test(parts[4])) return null;
    return {
      version: 'v2',
      iterations: iters,
      salt: hexToBytes(parts[3]),
      hashHex: parts[4].toLowerCase(),
    };
  }
  return null;
}

// Constant-time string comparison — `===` short-circuits on the first
// differing byte, which leaks match-prefix length through response timing.
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parsed = parseStoredHash(stored);
  if (!parsed) return false;

  const computed = await derivePbkdf2(password, parsed.salt, parsed.iterations);
  return timingSafeEqualHex(computed, parsed.hashHex);
}

// True when the stored hash is below the current target — either the
// legacy V1 format or a V2 hash from an older era with fewer iterations.
// Callers should re-hash with `hashPassword()` after a successful
// `verifyPassword()` and update the DB row.
export function needsRehash(stored: string): boolean {
  const parsed = parseStoredHash(stored);
  if (!parsed) return false; // unknown / placeholder — leave alone
  if (parsed.version === 'v1') return true;
  return parsed.iterations < PBKDF2_TARGET_ITERATIONS;
}

// Deterministic SHA-256 hash for API keys — enables a single-row lookup
// in api_keys.key_hash. Don't reuse hashPassword here: PBKDF2 with random
// salt would force scanning every row to verify.
export async function hashApiKey(rawKey: string): Promise<string> {
  const bytes = new TextEncoder().encode(rawKey);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// JWT implementation using Web Crypto API
export async function createToken(payload: Omit<JWTPayload, 'iat' | 'exp'>, secret: string, expiresInSeconds: number): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);

  const fullPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput));
  const encodedSignature = base64UrlEncodeBuffer(signature);

  return `${signingInput}.${encodedSignature}`;
}

// Same as createToken but stamps a `jti` (JWT id) claim so the token can be
// individually revoked via KV. Caller is responsible for generating the jti
// (typically crypto.randomUUID()).
export function createTokenWithJti(
  payload: Omit<JWTPayload, 'iat' | 'exp' | 'jti'>,
  secret: string,
  expiresInSeconds: number,
  jti: string,
): Promise<string> {
  return createToken({ ...payload, jti }, secret, expiresInSeconds);
}

// Revoke a token by its jti. Writes `revoked:${jti}` to KV with a TTL that
// matches the token's remaining lifetime — once the token would expire on its
// own, the KV entry vanishes too, so the blocklist stays bounded.
// No-op when CACHE binding isn't configured (kv undefined).
export async function revokeToken(
  kv: KVNamespace | undefined,
  jti: string,
  expiresAt: number,
): Promise<void> {
  if (!kv) return;
  const now = Math.floor(Date.now() / 1000);
  // KV requires a TTL of at least 60s. If the token is already expired or
  // about to expire, still write a short entry so concurrent in-flight
  // requests see the revocation.
  const ttl = Math.max(60, expiresAt - now);
  await kv.put(`revoked:${jti}`, '1', { expirationTtl: ttl });
}

// Returns true when the given jti has been revoked. Returns false when KV
// isn't configured — callers must decide whether that's acceptable for their
// deployment (we do: revocation degrades gracefully to "tokens expire on
// their own").
export async function isRevoked(
  kv: KVNamespace | undefined,
  jti: string,
): Promise<boolean> {
  if (!kv) return false;
  const hit = await kv.get(`revoked:${jti}`);
  return hit !== null;
}

export async function verifyToken(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signatureBuffer = base64UrlDecodeToBuffer(encodedSignature);
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBuffer,
      new TextEncoder().encode(signingInput)
    );

    if (!valid) return null;

    const payload: JWTPayload = JSON.parse(base64UrlDecode(encodedPayload));

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return null;

    return payload;
  } catch {
    return null;
  }
}

export function createAccessToken(user: User, secret: string): Promise<string> {
  return createTokenWithJti(
    { sub: user.id, email: user.email, role: user.role, display_name: user.display_name },
    secret,
    900, // 15 minutes
    crypto.randomUUID(),
  );
}

export function createRefreshToken(user: User, secret: string): Promise<string> {
  return createTokenWithJti(
    { sub: user.id, email: user.email, role: user.role, display_name: user.display_name },
    secret,
    604800, // 7 days
    crypto.randomUUID(),
  );
}

// Base64URL helpers
function base64UrlEncode(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return atob(str);
}

function base64UrlEncodeBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecodeToBuffer(str: string): ArrayBuffer {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

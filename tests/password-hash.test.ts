import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  needsRehash,
  PBKDF2_TARGET_ITERATIONS,
} from '../src/lib/auth';

// Build a legacy V1 (`$pbkdf2$<salt>$<hash>`) hash the same way the
// pre-upgrade code did: PBKDF2-SHA256 at 100,000 iterations. We hand-roll
// this once per test rather than importing legacy code paths so the test
// stays valid even if the production helpers are refactored further.
async function makeV1Hash(password: string, saltHex: string): Promise<string> {
  const saltBytes = new Uint8Array((saltHex.match(/.{2}/g) || []).map((b) => parseInt(b, 16)));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256,
  );
  const hashHex = Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `$pbkdf2$${saltHex}$${hashHex}`;
}

// Same construction as `makeV1Hash` but with a caller-chosen iteration
// count and the V2 envelope. Used to assert needsRehash() behaviour against
// V2 hashes that came from an older iteration target.
async function makeV2Hash(password: string, saltHex: string, iterations: number): Promise<string> {
  const saltBytes = new Uint8Array((saltHex.match(/.{2}/g) || []).map((b) => parseInt(b, 16)));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations, hash: 'SHA-256' },
    keyMaterial,
    256,
  );
  const hashHex = Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `$pbkdf2v2$${iterations}$${saltHex}$${hashHex}`;
}

const FIXED_SALT = '0123456789abcdef0123456789abcdef';

describe('PBKDF2 versioned hash format', () => {
  it('hashPassword emits V2 with the current target iteration count', async () => {
    const hash = await hashPassword('correct horse battery staple');
    expect(hash.startsWith(`$pbkdf2v2$${PBKDF2_TARGET_ITERATIONS}$`)).toBe(true);

    const parts = hash.split('$');
    expect(parts).toHaveLength(5);
    expect(parts[1]).toBe('pbkdf2v2');
    expect(parts[2]).toBe(String(PBKDF2_TARGET_ITERATIONS));
    expect(parts[3]).toMatch(/^[0-9a-f]{32}$/); // 16-byte salt → 32 hex chars
    expect(parts[4]).toMatch(/^[0-9a-f]{64}$/); // 32-byte derived key → 64 hex chars
  });

  it('uses 100,000 iterations (Cloudflare Workers PBKDF2 cap)', () => {
    // Workers' crypto.subtle.deriveBits rejects iteration counts above
    // 100,000, so the target is pinned to that ceiling (see src/lib/auth.ts).
    expect(PBKDF2_TARGET_ITERATIONS).toBe(100000);
  });

  it('verifies a V2 hash it just produced', async () => {
    const hash = await hashPassword('hunter2');
    expect(await verifyPassword('hunter2', hash)).toBe(true);
  });

  it('verifies a legacy V1 hash from an existing DB row', async () => {
    // A real-shape hash that an existing production user would have.
    const legacy = await makeV1Hash('hunter2', FIXED_SALT);
    expect(legacy.startsWith('$pbkdf2$')).toBe(true);
    expect(legacy.split('$')).toHaveLength(4);
    expect(await verifyPassword('hunter2', legacy)).toBe(true);
  });

  it('rejects wrong password against a legacy V1 hash', async () => {
    const legacy = await makeV1Hash('hunter2', FIXED_SALT);
    expect(await verifyPassword('wrong', legacy)).toBe(false);
  });

  it('rejects wrong password against a fresh V2 hash', async () => {
    const hash = await hashPassword('hunter2');
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });

  it('two V2 hashes of the same password use different salts and so differ', async () => {
    const a = await hashPassword('same');
    const b = await hashPassword('same');
    expect(a).not.toBe(b);
  });
});

describe('needsRehash', () => {
  it('returns true for legacy V1 hashes', async () => {
    const legacy = await makeV1Hash('hunter2', FIXED_SALT);
    expect(needsRehash(legacy)).toBe(true);
  });

  it('returns true for V2 hashes below the target iteration count', async () => {
    const oldV2 = await makeV2Hash('hunter2', FIXED_SALT, 50000);
    expect(needsRehash(oldV2)).toBe(true);
  });

  it('returns false for V2 hashes at the target iteration count', async () => {
    const fresh = await hashPassword('hunter2');
    expect(needsRehash(fresh)).toBe(false);
  });

  it('returns false for V2 hashes above the target iteration count', async () => {
    const future = await makeV2Hash('hunter2', FIXED_SALT, PBKDF2_TARGET_ITERATIONS + 100000);
    expect(needsRehash(future)).toBe(false);
  });

  it('returns false for malformed input (no spurious rehash storm)', () => {
    expect(needsRehash('')).toBe(false);
    expect(needsRehash('not-a-hash')).toBe(false);
    expect(needsRehash('$pbkdf2$SEED_PLACEHOLDER$x')).toBe(false);
    expect(needsRehash('$pbkdf2v2$abc$salt$hash')).toBe(false); // non-numeric iters
  });
});

describe('verifyPassword malformed inputs', () => {
  it('rejects empty string', async () => {
    expect(await verifyPassword('x', '')).toBe(false);
  });

  it('rejects unknown scheme prefix', async () => {
    expect(await verifyPassword('x', '$bcrypt$10$abc')).toBe(false);
  });

  it('rejects non-hex salt/hash in V2 envelope', async () => {
    expect(await verifyPassword('x', '$pbkdf2v2$600000$NOTHEX$NOTHEX')).toBe(false);
  });

  it('rejects V2 envelope with absurd iteration count', async () => {
    // Iters cap at 10M to keep a single login from burning seconds of CPU.
    expect(await verifyPassword('x', `$pbkdf2v2$99999999$${FIXED_SALT}$${'00'.repeat(32)}`)).toBe(false);
  });
});

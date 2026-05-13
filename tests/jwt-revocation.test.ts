import { describe, it, expect } from 'vitest';
import {
  createToken,
  createTokenWithJti,
  createAccessToken,
  createRefreshToken,
  verifyToken,
  revokeToken,
  isRevoked,
} from '../src/lib/auth';
import type { User } from '../src/types';

const SECRET = 'unit-test-secret-do-not-ship';

const FAKE_USER: User = {
  id: 42,
  email: 'bob@example.com',
  password_hash: '$pbkdf2$dead$beef',
  display_name: 'Bob',
  role: 'editor',
  avatar_r2_key: null,
  avatar_url: null,
  totp_secret: null,
  totp_enabled: 0,
  language: 'tr',
  max_sites: 0,
  max_editors: 0,
  max_writers: 0,
  ai_enabled: 0,
  ai_use_global: 0,
  created_by: null,
  last_login: null,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
};

// Minimal in-memory KV mock — only implements the surface the auth helpers
// touch (get/put with optional expirationTtl). Good enough for unit tests;
// production code paths through the real Cloudflare KV runtime.
function makeKvMock() {
  const store = new Map<string, { value: string; expiresAt: number | null }>();
  return {
    store,
    kv: {
      async get(key: string): Promise<string | null> {
        const entry = store.get(key);
        if (!entry) return null;
        if (entry.expiresAt !== null && entry.expiresAt <= Math.floor(Date.now() / 1000)) {
          store.delete(key);
          return null;
        }
        return entry.value;
      },
      async put(
        key: string,
        value: string,
        opts?: { expirationTtl?: number },
      ): Promise<void> {
        const expiresAt =
          opts?.expirationTtl !== undefined
            ? Math.floor(Date.now() / 1000) + opts.expirationTtl
            : null;
        store.set(key, { value, expiresAt });
      },
    } as unknown as KVNamespace,
  };
}

describe('createTokenWithJti', () => {
  it('embeds jti in the verified payload', async () => {
    const jti = 'abc-123';
    const token = await createTokenWithJti(
      { sub: 1, email: 'a@b.c', role: 'admin', display_name: 'A' },
      SECRET,
      60,
      jti,
    );
    const payload = await verifyToken(token, SECRET);
    expect(payload?.jti).toBe(jti);
  });

  it('createToken without jti round-trips with jti undefined (backward compat)', async () => {
    const token = await createToken(
      { sub: 1, email: 'a@b.c', role: 'admin', display_name: 'A' },
      SECRET,
      60,
    );
    const payload = await verifyToken(token, SECRET);
    expect(payload).not.toBeNull();
    expect(payload?.jti).toBeUndefined();
  });
});

describe('createAccessToken / createRefreshToken', () => {
  it('access token carries a unique jti', async () => {
    const t1 = await createAccessToken(FAKE_USER, SECRET);
    const t2 = await createAccessToken(FAKE_USER, SECRET);
    const p1 = await verifyToken(t1, SECRET);
    const p2 = await verifyToken(t2, SECRET);
    expect(p1?.jti).toBeTruthy();
    expect(p2?.jti).toBeTruthy();
    expect(p1?.jti).not.toBe(p2?.jti);
  });

  it('refresh token carries a unique jti distinct from the access token', async () => {
    const access = await createAccessToken(FAKE_USER, SECRET);
    const refresh = await createRefreshToken(FAKE_USER, SECRET);
    const a = await verifyToken(access, SECRET);
    const r = await verifyToken(refresh, SECRET);
    expect(r?.jti).toBeTruthy();
    expect(r?.jti).not.toBe(a?.jti);
  });
});

describe('isRevoked / revokeToken', () => {
  it('returns false before revocation, true after', async () => {
    const { kv } = makeKvMock();
    const jti = 'token-1';
    const exp = Math.floor(Date.now() / 1000) + 900;

    expect(await isRevoked(kv, jti)).toBe(false);

    await revokeToken(kv, jti, exp);

    expect(await isRevoked(kv, jti)).toBe(true);
  });

  it('isRevoked is a no-op (false) when KV is undefined', async () => {
    expect(await isRevoked(undefined, 'any-jti')).toBe(false);
  });

  it('revokeToken is a no-op when KV is undefined (does not throw)', async () => {
    await expect(
      revokeToken(undefined, 'any-jti', Math.floor(Date.now() / 1000) + 60),
    ).resolves.toBeUndefined();
  });

  it('uses revoked: prefix in KV', async () => {
    const { store, kv } = makeKvMock();
    await revokeToken(kv, 'xyz', Math.floor(Date.now() / 1000) + 600);
    expect(store.has('revoked:xyz')).toBe(true);
    expect(store.has('xyz')).toBe(false);
  });

  it('TTL matches remaining lifetime (minimum 60s)', async () => {
    const { store, kv } = makeKvMock();
    const now = Math.floor(Date.now() / 1000);

    // 600s of life left -> ttl is ~600s.
    await revokeToken(kv, 'long', now + 600);
    const longEntry = store.get('revoked:long')!;
    expect(longEntry.expiresAt).not.toBeNull();
    expect(longEntry.expiresAt! - now).toBeGreaterThanOrEqual(595);
    expect(longEntry.expiresAt! - now).toBeLessThanOrEqual(605);

    // Already-expired token still gets the 60s minimum so in-flight
    // requests see the revocation.
    await revokeToken(kv, 'expired', now - 10);
    const expiredEntry = store.get('revoked:expired')!;
    expect(expiredEntry.expiresAt! - now).toBeGreaterThanOrEqual(55);
    expect(expiredEntry.expiresAt! - now).toBeLessThanOrEqual(65);
  });

  it('isRevoked only matches the exact jti, not partial keys', async () => {
    const { kv } = makeKvMock();
    await revokeToken(kv, 'aaa', Math.floor(Date.now() / 1000) + 600);
    expect(await isRevoked(kv, 'aaa')).toBe(true);
    expect(await isRevoked(kv, 'bbb')).toBe(false);
    expect(await isRevoked(kv, 'aa')).toBe(false);
  });
});

describe('end-to-end: access token revocation flow', () => {
  it('mirrors what authMiddleware does — issue, revoke, re-check', async () => {
    const { kv } = makeKvMock();
    const token = await createAccessToken(FAKE_USER, SECRET);
    const payload = await verifyToken(token, SECRET);
    expect(payload?.jti).toBeTruthy();

    // Before logout: token valid, not revoked.
    expect(await isRevoked(kv, payload!.jti!)).toBe(false);

    // Logout: write to KV.
    await revokeToken(kv, payload!.jti!, payload!.exp);

    // After logout: middleware would now reject.
    expect(await isRevoked(kv, payload!.jti!)).toBe(true);
  });
});

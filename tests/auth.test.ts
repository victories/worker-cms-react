import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  hashApiKey,
  createToken,
  verifyToken,
} from '../src/lib/auth';

const FAKE_USER = {
  id: 1,
  email: 'alice@example.com',
  role: 'admin' as const,
  display_name: 'Alice',
};
const SECRET = 'unit-test-secret-do-not-ship';

describe('hashPassword / verifyPassword', () => {
  it('round-trips a correct password', async () => {
    const hash = await hashPassword('hunter2');
    // New hashes go out in the V2 format with the iteration count inlined.
    expect(hash.startsWith('$pbkdf2v2$')).toBe(true);
    expect(await verifyPassword('hunter2', hash)).toBe(true);
  });

  it('rejects wrong password', async () => {
    const hash = await hashPassword('hunter2');
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });

  it('rejects seed placeholder', async () => {
    expect(await verifyPassword('anything', '$pbkdf2$SEED_PLACEHOLDER$x')).toBe(false);
  });

  it('rejects malformed stored hash', async () => {
    expect(await verifyPassword('x', 'not-a-real-hash')).toBe(false);
  });

  it('uses random salt — two hashes of the same password differ', async () => {
    const a = await hashPassword('same');
    const b = await hashPassword('same');
    expect(a).not.toBe(b);
  });
});

describe('hashApiKey', () => {
  it('returns deterministic SHA-256 hex', async () => {
    const a = await hashApiKey('wcms_abc123');
    const b = await hashApiKey('wcms_abc123');
    expect(a).toBe(b);
    expect(a.length).toBe(64); // SHA-256 hex
    expect(/^[0-9a-f]{64}$/.test(a)).toBe(true);
  });

  it('produces different hashes for different inputs', async () => {
    expect(await hashApiKey('a')).not.toBe(await hashApiKey('b'));
  });
});

describe('createToken / verifyToken', () => {
  it('round-trips a payload', async () => {
    const token = await createToken(FAKE_USER as any, SECRET, 60);
    const payload = await verifyToken(token, SECRET);
    expect(payload).not.toBeNull();
    expect(payload?.email).toBe('alice@example.com');
    expect(payload?.role).toBe('admin');
  });

  it('rejects tokens signed with a different secret', async () => {
    const token = await createToken(FAKE_USER as any, SECRET, 60);
    expect(await verifyToken(token, 'wrong-secret')).toBeNull();
  });

  it('rejects an expired token', async () => {
    // 1-second TTL, sleep past it.
    const token = await createToken(FAKE_USER as any, SECRET, -10);
    expect(await verifyToken(token, SECRET)).toBeNull();
  });

  it('rejects a tampered payload', async () => {
    const token = await createToken(FAKE_USER as any, SECRET, 60);
    const parts = token.split('.');
    // Swap the payload segment for something that decodes to different JSON.
    parts[1] = btoa(JSON.stringify({ ...FAKE_USER, role: 'super_admin', exp: Date.now() / 1000 + 60, iat: Date.now() / 1000 }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const tampered = parts.join('.');
    expect(await verifyToken(tampered, SECRET)).toBeNull();
  });

  it('rejects a malformed token', async () => {
    expect(await verifyToken('not-a-jwt', SECRET)).toBeNull();
    expect(await verifyToken('a.b', SECRET)).toBeNull();
    expect(await verifyToken('', SECRET)).toBeNull();
  });
});

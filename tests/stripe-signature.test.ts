import { describe, it, expect, vi, afterEach } from 'vitest';
import { verifyStripeSignature, signStripePayload } from '../src/lib/stripe-signature';

const SECRET = 'whsec_test';
const PAYLOAD = '{"id":"evt_1","type":"checkout.session.completed"}';

describe('verifyStripeSignature', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('accepts a signature freshly produced with the same secret', async () => {
    const header = await signStripePayload(PAYLOAD, SECRET);
    expect(await verifyStripeSignature(PAYLOAD, header, SECRET)).toBe(true);
  });

  it('rejects a signature from a different secret', async () => {
    const header = await signStripePayload(PAYLOAD, 'other-secret');
    expect(await verifyStripeSignature(PAYLOAD, header, SECRET)).toBe(false);
  });

  it('rejects when the payload is mutated after signing', async () => {
    const header = await signStripePayload(PAYLOAD, SECRET);
    expect(await verifyStripeSignature(PAYLOAD + 'tamper', header, SECRET)).toBe(false);
  });

  it('rejects when the secret is empty', async () => {
    const header = await signStripePayload(PAYLOAD, SECRET);
    expect(await verifyStripeSignature(PAYLOAD, header, '')).toBe(false);
  });

  it('rejects when the header is missing', async () => {
    expect(await verifyStripeSignature(PAYLOAD, '', SECRET)).toBe(false);
  });

  it('rejects malformed headers', async () => {
    expect(await verifyStripeSignature(PAYLOAD, 'garbage', SECRET)).toBe(false);
    expect(await verifyStripeSignature(PAYLOAD, 't=123', SECRET)).toBe(false);
    expect(await verifyStripeSignature(PAYLOAD, 'v1=deadbeef', SECRET)).toBe(false);
  });

  it('rejects when the timestamp is outside the replay window', async () => {
    // Sign for "now"
    const now = Math.floor(Date.now() / 1000);
    const header = await signStripePayload(PAYLOAD, SECRET, now - 600); // 10 min old
    expect(await verifyStripeSignature(PAYLOAD, header, SECRET)).toBe(false);
  });

  it('accepts multiple v1 candidates when at least one matches', async () => {
    const ts = Math.floor(Date.now() / 1000);
    const valid = await signStripePayload(PAYLOAD, SECRET, ts);
    // Append a bogus second v1 — verification should still succeed.
    const header = `${valid},v1=deadbeef`;
    expect(await verifyStripeSignature(PAYLOAD, header, SECRET)).toBe(true);
  });
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import { verifyTOTP, generateTOTPSecret, generateTOTPUri } from '../src/lib/totp';

// RFC 6238 Appendix B test vectors (SHA-1, 30-second step). The shared
// secret is ASCII "12345678901234567890" — base32:
const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

describe('verifyTOTP — RFC 6238 vectors', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('accepts the code for T=59', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(59 * 1000));
    expect(await verifyTOTP(RFC_SECRET, '287082')).toBe(true);
  });

  it('accepts the code for T=1111111109', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(1111111109 * 1000));
    expect(await verifyTOTP(RFC_SECRET, '081804')).toBe(true);
  });

  it('accepts the code for T=1111111111', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(1111111111 * 1000));
    expect(await verifyTOTP(RFC_SECRET, '050471')).toBe(true);
  });

  it('accepts the code for T=1234567890', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(1234567890 * 1000));
    expect(await verifyTOTP(RFC_SECRET, '005924')).toBe(true);
  });

  it('rejects wrong code at correct time', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(59 * 1000));
    expect(await verifyTOTP(RFC_SECRET, '000000')).toBe(false);
  });

  it('rejects malformed codes', async () => {
    expect(await verifyTOTP(RFC_SECRET, '12345')).toBe(false);
    expect(await verifyTOTP(RFC_SECRET, 'abcdef')).toBe(false);
    expect(await verifyTOTP(RFC_SECRET, '')).toBe(false);
  });
});

describe('generateTOTPSecret', () => {
  it('returns 32-char base32 (20 random bytes)', () => {
    const s = generateTOTPSecret();
    expect(s.length).toBe(32);
    expect(/^[A-Z2-7]+$/.test(s)).toBe(true);
  });

  it('produces different secrets each call', () => {
    expect(generateTOTPSecret()).not.toBe(generateTOTPSecret());
  });
});

describe('generateTOTPUri', () => {
  it('formats otpauth:// URL with required params', () => {
    const uri = generateTOTPUri('JBSWY3DPEHPK3PXP', 'alice@example.com', 'ExampleCo');
    expect(uri).toMatch(/^otpauth:\/\/totp\//);
    expect(uri).toContain('secret=JBSWY3DPEHPK3PXP');
    expect(uri).toContain('issuer=ExampleCo');
    expect(uri).toContain('alice%40example.com');
    expect(uri).toContain('digits=6');
    expect(uri).toContain('period=30');
  });
});

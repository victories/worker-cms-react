// TOTP (Time-based One-Time Password) implementation
// Compatible with Cloudflare Workers runtime (Web Crypto API only, no Node.js crypto)
// Implements RFC 6238 (TOTP) and RFC 4226 (HOTP)

// --- Base32 encoding/decoding (RFC 4648) ---

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(data: Uint8Array): string {
  let result = '';
  let bits = 0;
  let value = 0;

  for (let i = 0; i < data.length; i++) {
    value = (value << 8) | data[i];
    bits += 8;

    while (bits >= 5) {
      bits -= 5;
      result += BASE32_ALPHABET[(value >>> bits) & 0x1f];
    }
  }

  if (bits > 0) {
    result += BASE32_ALPHABET[(value << (5 - bits)) & 0x1f];
  }

  return result;
}

function base32Decode(encoded: string): Uint8Array {
  // Strip padding and normalize to uppercase
  const input = encoded.replace(/=+$/, '').toUpperCase();
  const output: number[] = [];
  let bits = 0;
  let value = 0;

  for (let i = 0; i < input.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(input[i]);
    if (idx === -1) {
      throw new Error(`Invalid base32 character: ${input[i]}`);
    }
    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bits -= 8;
      output.push((value >>> bits) & 0xff);
    }
  }

  return new Uint8Array(output);
}

// --- Counter encoding ---

function intToBytes(counter: number): Uint8Array {
  // Encode counter as big-endian 8-byte integer
  const bytes = new Uint8Array(8);
  // JavaScript bitwise operators work on 32-bit integers,
  // so we handle the upper and lower 32 bits separately
  let remaining = counter;
  for (let i = 7; i >= 0; i--) {
    bytes[i] = remaining & 0xff;
    remaining = Math.floor(remaining / 256);
  }
  return bytes;
}

// --- Dynamic truncation (RFC 4226 Section 5.4) ---

function dynamicTruncate(hmacResult: Uint8Array): number {
  // Use the low-order 4 bits of the last byte as the offset
  const offset = hmacResult[hmacResult.length - 1] & 0x0f;

  // Extract 4 bytes starting at the offset
  const code =
    ((hmacResult[offset] & 0x7f) << 24) |
    ((hmacResult[offset + 1] & 0xff) << 16) |
    ((hmacResult[offset + 2] & 0xff) << 8) |
    (hmacResult[offset + 3] & 0xff);

  // Return 6-digit code
  return code % 1_000_000;
}

// --- HOTP computation using Web Crypto API ---

async function computeHOTP(secret: Uint8Array, counter: number): Promise<string> {
  // Import the secret as an HMAC-SHA1 key
  const key = await crypto.subtle.importKey(
    'raw',
    secret,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  // Sign the counter value
  const counterBytes = intToBytes(counter);
  const signature = await crypto.subtle.sign('HMAC', key, counterBytes);
  const hmacResult = new Uint8Array(signature);

  // Apply dynamic truncation to get 6-digit code
  const code = dynamicTruncate(hmacResult);

  // Pad to 6 digits with leading zeros
  return code.toString().padStart(6, '0');
}

// --- Exported functions ---

/**
 * Generate a random base32-encoded TOTP secret.
 * Uses 20 random bytes, producing a 32-character base32 string.
 */
export function generateTOTPSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return base32Encode(bytes);
}

/**
 * Verify a 6-digit TOTP code against a base32-encoded secret.
 * Allows 1 step tolerance: checks the current, previous, and next 30-second windows.
 */
export async function verifyTOTP(secret: string, code: string): Promise<boolean> {
  // Normalize: strip whitespace and ensure 6 digits
  const normalizedCode = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(normalizedCode)) {
    return false;
  }

  const secretBytes = base32Decode(secret);
  const currentCounter = Math.floor(Date.now() / 1000 / 30);

  // Check current window and +/- 1 step for clock drift tolerance
  for (let offset = -1; offset <= 1; offset++) {
    const candidate = await computeHOTP(secretBytes, currentCounter + offset);
    // Constant-time comparison to prevent timing attacks
    if (timingSafeEqual(candidate, normalizedCode)) {
      return true;
    }
  }

  return false;
}

/**
 * Generate a TOTP provisioning URI for use in QR codes.
 * Compatible with Google Authenticator, Authy, and other TOTP apps.
 *
 * Format: otpauth://totp/{issuer}:{account}?secret={secret}&issuer={issuer}&digits=6&period=30
 */
export function generateTOTPUri(
  secret: string,
  account: string,
  issuer: string = 'WP-CMS'
): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedAccount = encodeURIComponent(account);
  const label = `${encodedIssuer}:${encodedAccount}`;

  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodedIssuer}&digits=6&period=30`;
}

// --- Timing-safe comparison ---

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

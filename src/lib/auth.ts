import type { JWTPayload, User } from '../types';

// scrypt-based password hashing using Web Crypto API (Workers compatible)
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const hash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');

  return `$pbkdf2$${saltHex}$${hashHex}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  // Handle seed placeholder
  if (stored.includes('SEED_PLACEHOLDER')) return false;

  const parts = stored.split('$');
  if (parts.length !== 4 || parts[1] !== 'pbkdf2') return false;

  const salt = new Uint8Array(parts[2].match(/.{2}/g)!.map(b => parseInt(b, 16)));
  const storedHash = parts[3];

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const hash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  const hashHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex === storedHash;
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
  return createToken(
    { sub: user.id, email: user.email, role: user.role, display_name: user.display_name },
    secret,
    900 // 15 minutes
  );
}

export function createRefreshToken(user: User, secret: string): Promise<string> {
  return createToken(
    { sub: user.id, email: user.email, role: user.role, display_name: user.display_name },
    secret,
    604800 // 7 days
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

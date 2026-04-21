import crypto from 'crypto';

interface MobileTokenPayload {
  sub: string;
  role: string;
  aud: 'mobile-api';
  iat: number;
  exp: number;
}

const DEFAULT_TTL_SECONDS = 60 * 60 * 24; // 24 hours

function getSecret() {
  const secret = process.env.MOBILE_API_TOKEN_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('MOBILE_API_TOKEN_SECRET (or NEXTAUTH_SECRET) is required');
  }
  return secret;
}

function base64urlEncode(input: Buffer | string) {
  const buffer = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buffer
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64urlDecode(input: string) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, 'base64');
}

function sign(content: string, secret: string) {
  return base64urlEncode(crypto.createHmac('sha256', secret).update(content).digest());
}

export function createMobileAccessToken(userId: string, role: string, ttlSeconds = DEFAULT_TTL_SECONDS) {
  const now = Math.floor(Date.now() / 1000);
  const payload: MobileTokenPayload = {
    sub: userId,
    role,
    aud: 'mobile-api',
    iat: now,
    exp: now + ttlSeconds,
  };

  const encodedPayload = base64urlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload, getSecret());
  return `${encodedPayload}.${signature}`;
}

export function verifyMobileAccessToken(token: string): MobileTokenPayload | null {
  try {
    const [encodedPayload, signature] = token.split('.');
    if (!encodedPayload || !signature) return null;

    const expected = sign(encodedPayload, getSecret());
    const signatureBytes = new TextEncoder().encode(signature);
    const expectedBytes = new TextEncoder().encode(expected);
    if (signatureBytes.length !== expectedBytes.length) {
      return null;
    }
    if (!crypto.timingSafeEqual(signatureBytes, expectedBytes)) {
      return null;
    }

    const payload = JSON.parse(base64urlDecode(encodedPayload).toString('utf8')) as MobileTokenPayload;

    if (payload.aud !== 'mobile-api') return null;
    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp <= now) return null;
    if (!payload.sub) return null;

    return payload;
  } catch {
    return null;
  }
}

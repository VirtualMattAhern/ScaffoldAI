import crypto from 'crypto';

type SessionPayload = {
  sub: string;
  email: string;
  displayName?: string;
  iat: number;
  exp: number;
  iss: 'skafold-email';
};

const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 14;

function getSessionSecret() {
  return process.env.SESSION_SECRET || process.env.AUTH_SESSION_SECRET || 'skafold-dev-session-secret';
}

function base64UrlEncode(input: Buffer | string) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(input: string) {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=');
  return Buffer.from(padded, 'base64').toString('utf8');
}

export function createSessionToken(data: { userId: string; email: string; displayName?: string }) {
  const now = Math.floor(Date.now() / 1000);
  const ttl = parseInt(process.env.SESSION_TTL_SECONDS || '', 10) || DEFAULT_TTL_SECONDS;
  const payload: SessionPayload = {
    sub: data.userId,
    email: data.email,
    displayName: data.displayName,
    iat: now,
    exp: now + ttl,
    iss: 'skafold-email',
  };

  const encoded = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encoded)
    .digest();

  return `${encoded}.${base64UrlEncode(signature)}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const [encodedPayload, encodedSignature] = token.split('.');
  if (!encodedPayload || !encodedSignature) return null;

  const expectedSignature = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encodedPayload)
    .digest();

  const actualSignature = Buffer.from(
    encodedSignature.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(encodedSignature.length / 4) * 4, '='),
    'base64',
  );

  if (actualSignature.length !== expectedSignature.length) return null;
  if (!crypto.timingSafeEqual(actualSignature, expectedSignature)) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as SessionPayload;
    if (payload.iss !== 'skafold-email') return null;
    if (!payload.sub || !payload.email) return null;
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

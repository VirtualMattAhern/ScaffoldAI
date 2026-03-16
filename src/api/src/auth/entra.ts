/**
 * Microsoft Entra ID (Azure AD) JWT validation.
 * Validates Bearer tokens and extracts user info for /api/auth/me.
 */

import * as jose from 'jose';
import { getDb } from '../db/client.js';

const ENTRA_TENANT_ID = process.env.ENTRA_TENANT_ID;
const ENTRA_CLIENT_ID = process.env.ENTRA_CLIENT_ID;

export function isEntraConfigured(): boolean {
  return !!(ENTRA_TENANT_ID && ENTRA_CLIENT_ID);
}

const JWKS_URL = (tenantId: string) =>
  `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`;

export interface EntraUser {
  id: string;
  email: string;
  displayName: string;
}

export async function validateEntraToken(token: string): Promise<EntraUser | null> {
  if (!ENTRA_TENANT_ID || !ENTRA_CLIENT_ID) return null;

  try {
    const JWKS = jose.createRemoteJWKSet(
      new URL(JWKS_URL(ENTRA_TENANT_ID))
    );
    const { payload } = await jose.jwtVerify(token, JWKS, {
      issuer: `https://login.microsoftonline.com/${ENTRA_TENANT_ID}/v2.0`,
      audience: ENTRA_CLIENT_ID,
    });

    const oid = payload.oid as string | undefined;
    const email = (payload.preferred_username ?? payload.email ?? payload.upn) as string | undefined;
    const name = (payload.name ?? payload.given_name) as string | undefined;

    if (!oid || !email) return null;

    const displayName = name?.trim() || email.split('@')[0];
    const db = await getDb();

    // Find or create user by oid (we use oid as id for Entra users)
    const existing = await db.get<{ id: string; email: string; display_name: string | null }>(
      'SELECT id, email, display_name FROM users WHERE id = ?',
      [oid]
    );

    if (existing) {
      return {
        id: existing.id,
        email: existing.email,
        displayName: existing.display_name ?? existing.email.split('@')[0],
      };
    }

    // Create new user
    const id = oid;
    await db.run(
      'INSERT INTO users (id, email, display_name) VALUES (?, ?, ?)',
      [id, email.toLowerCase(), displayName]
    );

    return { id, email: email.toLowerCase(), displayName };
  } catch {
    return null;
  }
}

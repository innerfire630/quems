// =============================================================================
// src/lib/auth-utils.ts — Authentication utility functions (server-only)
// =============================================================================
// Provides credential verification, refresh-token lifecycle management, and
// access-token issuance. All functions touch the database or use Node crypto
// and must NEVER be imported from a client component.
//
// Security notes:
// - Refresh tokens are 48-byte cryptographically random strings.
// - Only the SHA-256 hash is stored in the database (in RefreshToken.token).
// - Refresh tokens use SHA-256 (not bcrypt) because they are already
//   high-entropy random values; a fast hash is sufficient and avoids
//   unnecessary latency during refresh operations.
// =============================================================================

import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import type { User, RefreshToken } from '@prisma/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UserWithRoles {
  id: string;
  username: string;
  email: string;
  name: string;
  avatar: string | null;
  status: string;
  mustChangePassword: boolean;
  createdAt: Date;
  updatedAt: Date;
  roles: string[];
  permissions: string[];
}

export interface ValidRefreshToken extends RefreshToken {
  user: UserWithRoles;
}

// ---------------------------------------------------------------------------
// Credential verification (used by NextAuth credentials provider)
// ---------------------------------------------------------------------------

/**
 * Result of credential verification.
 * - { ok: true, user } — valid credentials, active user
 * - { ok: false, reason: 'invalid' } — wrong username or password
 * - { ok: false, reason: 'deactivated' | 'suspended' } — account disabled
 */
export type CredentialResult =
  | { ok: true; user: Omit<User, 'password'> }
  | { ok: false; reason: 'invalid' | 'deactivated' | 'suspended' };

/**
 * Verifies email + password against the User table.
 * Returns a discriminated result so callers can show specific error messages.
 */
export async function verifyCredentials(
  username: string,
  password: string,
): Promise<CredentialResult> {
  const user = await prisma.user.findUnique({ where: { username } });

  if (!user) return { ok: false, reason: 'invalid' };
  if (user.status === 'INACTIVE') return { ok: false, reason: 'deactivated' };
  if (user.status === 'SUSPENDED') return { ok: false, reason: 'suspended' };

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return { ok: false, reason: 'invalid' };

  // Strip password before returning
  const { password: _pw, ...safeUser } = user;
  return { ok: true, user: safeUser };
}

// ---------------------------------------------------------------------------
// Role & permission loading (used during token enrichment)
// ---------------------------------------------------------------------------

/**
 * Fetches the user's effective roles and permissions via the join tables.
 * Returns a flat list of role names and a flat list of permission strings.
 */
export async function fetchUserRolesAndPermissions(
  userId: string,
): Promise<{ roles: string[]; permissions: string[] }> {
  const userWithRoles = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true },
              },
            },
          },
        },
      },
    },
  });

  if (!userWithRoles) return { roles: [], permissions: [] };

  const roles: string[] = [];
  const permissionSet = new Set<string>();

  for (const ur of userWithRoles.roles) {
    roles.push(ur.role.name);
    for (const rp of ur.role.permissions) {
      permissionSet.add(rp.permission.name);
    }
  }

  return { roles, permissions: Array.from(permissionSet) };
}

// ---------------------------------------------------------------------------
// Refresh token utilities
// ---------------------------------------------------------------------------

const REFRESH_TOKEN_BYTES = 48;
const DEFAULT_EXPIRY_DAYS = 7;

function getExpiryDays(): number {
  const fromEnv = process.env['REFRESH_TOKEN_EXPIRY_DAYS'];
  if (fromEnv) {
    const parsed = Number.parseInt(fromEnv, 10);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }
  return DEFAULT_EXPIRY_DAYS;
}

/**
 * Generates a cryptographically random refresh token string (URL-safe).
 */
export function generateRefreshToken(): string {
  return crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
}

/**
 * Hashes a refresh token with SHA-256. The digest is stored in the DB.
 */
export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Creates a new RefreshToken record, stores the hash, and returns the
 * plaintext token (to be sent to the client once) along with its expiry.
 */
export async function createRefreshTokenForUser(
  userId: string,
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateRefreshToken();
  const tokenHash = hashRefreshToken(token);
  const expiresAt = new Date(Date.now() + getExpiryDays() * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      token: tokenHash,
      userId,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

/**
 * Validates an incoming plaintext refresh token.
 * Returns the DB record (with user) on success, null otherwise.
 */
export async function validateRefreshToken(
  plaintextToken: string,
): Promise<ValidRefreshToken | null> {
  const tokenHash = hashRefreshToken(plaintextToken);

  const record = await prisma.refreshToken.findUnique({
    where: { token: tokenHash },
    include: {
      user: true,
    },
  });

  if (!record) return null;
  if (record.isRevoked) return null;
  if (record.expiresAt <= new Date()) return null;

  // Reject inactive or suspended users — their status may have changed after login
  if (record.user.status === 'INACTIVE' || record.user.status === 'SUSPENDED') return null;

  // Attach roles/permissions to the user
  const { roles, permissions } = await fetchUserRolesAndPermissions(record.userId);

  return {
    ...record,
    user: { ...record.user, email: record.user.email ?? '', roles, permissions } as UserWithRoles,
  };
}

/**
 * Revokes a refresh token (marks isRevoked, sets revokedAt).
 */
export async function revokeRefreshToken(
  tokenId: string,
  replacedByTokenId?: string,
): Promise<void> {
  await prisma.refreshToken.update({
    where: { id: tokenId },
    data: {
      isRevoked: true,
      revokedAt: new Date(),
      ...(replacedByTokenId ? { replacedByToken: replacedByTokenId } : {}),
    },
  });
}

/**
 * Rotates a refresh token: validates, creates a new one, revokes the old one.
 * Returns the new plaintext token, expiry, and user on success. Null on failure.
 */
export async function rotateRefreshToken(
  plaintextToken: string,
): Promise<{ newToken: string; newExpiresAt: Date; user: UserWithRoles } | null> {
  const valid = await validateRefreshToken(plaintextToken);
  if (!valid) return null;

  const { token: newToken, expiresAt: newExpiresAt } = await createRefreshTokenForUser(
    valid.userId,
  );

  await revokeRefreshToken(valid.id);

  return { newToken, newExpiresAt, user: valid.user };
}

// ---------------------------------------------------------------------------
// Access-token issuance (JWT signed with NEXTAUTH_SECRET)
// ---------------------------------------------------------------------------

/**
 * Issues a signed JWT access token (15-minute expiry) using NextAuth's encode.
 * This is a convenience wrapper — the token is normally issued through the
 * NextAuth JWT callback, but mobile flows need programmatic issuance.
 */
export async function issueAccessToken(user: UserWithRoles): Promise<{
  accessToken: string;
  expiresIn: number;
}> {
  // Use NextAuth's JWT encode (imported dynamically to avoid circular deps)
  const { encode } = await import('next-auth/jwt');

  const accessToken = await encode({
    token: {
      sub: user.id,
      userId: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles,
      permissions: user.permissions,
    },
    secret: process.env['NEXTAUTH_SECRET'] ?? 'fallback-dev-secret',
    salt: user.email,
    maxAge: 15 * 60, // 15 minutes
  });

  return { accessToken, expiresIn: 900 };
}

// ---------------------------------------------------------------------------
// Cookie configuration
// ---------------------------------------------------------------------------

export function getRefreshTokenCookieName(): string {
  return process.env['NODE_ENV'] === 'production' ? '__Secure-refresh-token' : 'refresh-token';
}

export function getRefreshTokenCookieOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict';
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: getExpiryDays() * 24 * 60 * 60,
  };
}

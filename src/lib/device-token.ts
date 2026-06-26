// =============================================================================
// src/lib/device-token.ts — Centralised DeviceToken operations (4.1.2)
// =============================================================================
// Owns all DeviceToken table queries. Used by the registration/removal API
// routes, the FCM cleanup listener, and the dispatch layer (4.1.3).
//
// Exports:
// - registerToken({ counterOfficerId, token, platform, deviceInfo? })
// - removeToken(tokenId, requestingOfficerId)
// - deactivateToken(token)
// - getActiveTokensForOfficer(counterOfficerId)
// - getDeviceTokenByToken(token)
// - DeviceTokenOwnershipError
// =============================================================================

import { prisma as db } from '@/lib/db';
import type { Prisma, DeviceToken } from '@prisma/client';

// ---------------------------------------------------------------------------
// Custom error for ownership violations
// ---------------------------------------------------------------------------

export class DeviceTokenOwnershipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeviceTokenOwnershipError';
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Idempotent device token registration. If a token with the same string already
 * exists, the existing record is updated (ownership transferred, re-activated,
 * deviceInfo refreshed). Otherwise a new record is created.
 *
 * The caller is responsible for writing AuditLog rows.
 */
export async function registerToken(input: {
  counterOfficerId: string;
  token: string;
  platform: 'ANDROID' | 'IOS' | 'WEB';
  deviceInfo?: Record<string, unknown>;
}): Promise<DeviceToken> {
  const existing = await db.deviceToken.findUnique({
    where: { token: input.token },
  });

  if (existing) {
    return db.deviceToken.update({
      where: { id: existing.id },
      data: {
        counterOfficerId: input.counterOfficerId,
        platform: input.platform,
        deviceInfo:
          (input.deviceInfo as Prisma.InputJsonValue) ??
          (existing.deviceInfo as Prisma.InputJsonValue),
        isActive: true,
        lastUsedAt: null,
      },
    });
  }

  return db.deviceToken.create({
    data: {
      counterOfficerId: input.counterOfficerId,
      token: input.token,
      platform: input.platform,
      deviceInfo: input.deviceInfo as Prisma.InputJsonValue,
      isActive: true,
    },
  });
}

/**
 * Removes a DeviceToken by ID. Throws DeviceTokenOwnershipError if the token
 * belongs to a different officer. Returns false if not found.
 */
export async function removeToken(tokenId: string, requestingOfficerId: string): Promise<boolean> {
  const record = await db.deviceToken.findUnique({
    where: { id: tokenId },
    include: { counterOfficer: true },
  });

  if (!record) return false;

  if (record.counterOfficer.userId !== requestingOfficerId) {
    throw new DeviceTokenOwnershipError('You can only remove your own device tokens.');
  }

  await db.deviceToken.delete({ where: { id: tokenId } });
  return true;
}

/**
 * Sets `isActive = false` on the DeviceToken matching the given token string.
 * Silent no-op if the token is not found or already inactive. Never throws.
 * Called by the FCM cleanup listener when FCM returns INVALID_REGISTRATION.
 */
export async function deactivateToken(token: string): Promise<void> {
  try {
    const record = await db.deviceToken.findUnique({ where: { token } });
    if (record && record.isActive) {
      await db.deviceToken.update({
        where: { id: record.id },
        data: { isActive: false },
      });
      console.info(`[FCM cleanup] Deactivated token: ${token.substring(0, 8)}...`);
    }
  } catch (error) {
    console.error('[FCM cleanup] Failed to deactivate token:', error);
  }
}

/**
 * Returns all active device tokens for a counter officer, ordered by most
 * recently used first. Used by the dispatch layer (4.1.3) to find recipients.
 */
export async function getActiveTokensForOfficer(counterOfficerId: string): Promise<DeviceToken[]> {
  return db.deviceToken.findMany({
    where: { counterOfficerId, isActive: true },
    orderBy: { lastUsedAt: 'desc' },
  });
}

/**
 * Single-record lookup by token string. Returns null if not found.
 */
export async function getDeviceTokenByToken(token: string): Promise<DeviceToken | null> {
  return db.deviceToken.findUnique({ where: { token } });
}

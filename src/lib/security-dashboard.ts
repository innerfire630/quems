// =============================================================================
// src/lib/security-dashboard.ts — Security screen data loader (4.3.3)
// =============================================================================

import { prisma } from '@/lib/db';
import { getActiveBroadcasts } from '@/lib/broadcast';
import type { SecurityDashboardData, BroadcastEntry } from '@/types/security-dashboard.types';
import { ROLE_SECURITY_OFFICER } from '@/lib/permissions';

// ---------------------------------------------------------------------------
// Custom error
// ---------------------------------------------------------------------------

export class UnauthorizedSecurityAccessError extends Error {
  public readonly code = 'FORBIDDEN' as const;
  constructor() {
    super('You do not have permission to access the security screen');
    this.name = 'UnauthorizedSecurityAccessError';
  }
}

// ---------------------------------------------------------------------------
// Data loader
// ---------------------------------------------------------------------------

/**
 * Loads the initial data for the security officer screen.
 * Validates the caller has the SECURITY_OFFICER role.
 * All queries run in parallel via Promise.all.
 */
export async function getSecurityDashboardData(
  userId: string,
  userRoles: string[],
): Promise<SecurityDashboardData> {
  // Role guard
  if (!userRoles.includes(ROLE_SECURITY_OFFICER)) {
    throw new UnauthorizedSecurityAccessError();
  }

  // Load in parallel
  const [user, activeBroadcasts] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    }),
    getActiveBroadcasts(50),
  ]);

  // Map broadcasts to feed entries
  const recentBroadcasts: BroadcastEntry[] = activeBroadcasts.map((b) => ({
    type: 'BROADCAST' as const,
    broadcastId: b.id,
    message: b.message,
    senderName: b.senderDisplayName,
    createdAt: b.createdAt.toISOString(),
    expiresAt: b.expiresAt?.toISOString() ?? null,
    isRead: false, // client hydrates from localStorage
  }));

  return {
    user: user ?? { id: userId, name: null, email: null },
    recentBroadcasts,
    initialReadBroadcastIds: [],
  };
}

// =============================================================================
// src/lib/broadcast.ts — Centralised broadcast module (4.3.2 full / 4.3.1 stub)
// =============================================================================
// This file is the single source of truth for BroadcastMessage creation and
// SSE emission. It is called as a post-commit step by 4.3.1's reply endpoint.
// =============================================================================

import { prisma } from '@/lib/db';
import { broadcastRoutedEvent } from '@/lib/events';
import { writeAuditLog } from '@/lib/audit-log';
import type { NotificationReply, BroadcastMessage } from '@prisma/client';

// ---------------------------------------------------------------------------
// Module-scope constants
// ---------------------------------------------------------------------------

export const DEFAULT_DISPLAY_DURATION_SECONDS = 10;
export const DEFAULT_EXPIRY_MINUTES = 5;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateDirectBroadcastInput {
  message: string;
  senderOfficerId: string;
  senderDisplayName: string;
  targetDisplayBoardId?: string | null;
  displayDurationSeconds?: number;
  expiresAt?: Date;
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if the broadcast is currently visible (active and not expired).
 * Pure function — safe to call from both server and client.
 */
export function isBroadcastVisible(
  broadcast: Pick<BroadcastMessage, 'isActive' | 'expiresAt'>,
  now: Date = new Date(),
): boolean {
  if (!broadcast.isActive) return false;
  if (broadcast.expiresAt === null) return true; // no expiry = always visible
  return broadcast.expiresAt > now;
}

// ---------------------------------------------------------------------------
// Internal: emit the SSE event for a broadcast
// ---------------------------------------------------------------------------

async function emitBroadcastEvent(broadcast: BroadcastMessage): Promise<void> {
  try {
    if (!isBroadcastVisible(broadcast)) {
      console.warn('[broadcast] Skipping emit for inactive or expired broadcast', {
        broadcastId: broadcast.id,
        isActive: broadcast.isActive,
        expiresAt: broadcast.expiresAt,
      });
      return;
    }

    const payload = {
      broadcastId: broadcast.id,
      message: broadcast.message,
      senderName: broadcast.senderDisplayName,
      displaySeconds: broadcast.displayDurationSeconds,
    };

    broadcastRoutedEvent('BROADCAST_MESSAGE', payload, {});
  } catch (error) {
    console.error('[broadcast] Failed to emit broadcast event:', error);
  }
}

// ---------------------------------------------------------------------------
// Core: create a broadcast from an officer reply
// ---------------------------------------------------------------------------

type ReplyWithRelations = NotificationReply & {
  counterOfficer: {
    user: { name: string | null };
    counter: { id: string; name: string; number: number };
  };
};

/**
 * Creates a BroadcastMessage from a NotificationReply.
 * Called by 4.3.1 as a post-commit step (outside the reply transaction).
 *
 * @returns The created BroadcastMessage, or null on failure.
 */
export async function createBroadcastFromReply(
  reply: ReplyWithRelations,
  replyingOfficerDisplayName: string,
): Promise<BroadcastMessage | null> {
  try {
    const expiresAt = new Date(Date.now() + DEFAULT_EXPIRY_MINUTES * 60 * 1000);
    const displayDurationSeconds = DEFAULT_DISPLAY_DURATION_SECONDS;

    // Step 1: Create the BroadcastMessage record
    const broadcast = await prisma.broadcastMessage.create({
      data: {
        message: reply.message,
        senderOfficerId: reply.counterOfficerId,
        senderDisplayName: replyingOfficerDisplayName,
        sourceReplyId: reply.id,
        targetDisplayBoardId: null,
        displayDurationSeconds,
        expiresAt,
        isActive: true,
      },
    });

    // Step 2: Emit the BROADCAST_MESSAGE SSE event
    await emitBroadcastEvent(broadcast);

    // Step 3: Update NotificationReply.broadcastAt
    try {
      await prisma.notificationReply.update({
        where: { id: reply.id },
        data: { broadcastAt: new Date() },
      });
    } catch (err) {
      console.error('[broadcast] Failed to update reply.broadcastAt:', err);
    }

    // Step 4: Write audit log (best-effort)
    try {
      await writeAuditLog({
        action: 'BROADCAST_MESSAGE_SENT',
        actorId: reply.counterOfficerId,
        entity: 'Notification',
        description: 'Officer reply broadcast to display board and security screen',
        metadata: {
          broadcastId: broadcast.id,
          sourceReplyId: reply.id,
          notificationId: reply.notificationId,
          message: broadcast.message,
          senderOfficerId: broadcast.senderOfficerId,
          senderDisplayName: broadcast.senderDisplayName,
          expiresAt: broadcast.expiresAt?.toISOString() ?? null,
          displayDurationSeconds: broadcast.displayDurationSeconds,
          isActive: broadcast.isActive,
        },
      });
    } catch (err) {
      console.error('[broadcast] Failed to write audit log:', err);
    }

    return broadcast;
  } catch (error) {
    console.error('[broadcast] Failed to create broadcast from reply:', error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Core: create a direct broadcast (for future admin use — Phase 5)
// ---------------------------------------------------------------------------

/**
 * Creates a BroadcastMessage directly (not from a reply).
 * Reserved for future admin-initiated broadcasts (Phase 5).
 */
export async function createDirectBroadcast(
  input: CreateDirectBroadcastInput,
): Promise<BroadcastMessage | null> {
  try {
    const displayDurationSeconds = input.displayDurationSeconds ?? DEFAULT_DISPLAY_DURATION_SECONDS;
    const expiresAt = input.expiresAt ?? new Date(Date.now() + DEFAULT_EXPIRY_MINUTES * 60 * 1000);

    const broadcast = await prisma.broadcastMessage.create({
      data: {
        message: input.message,
        senderOfficerId: input.senderOfficerId,
        senderDisplayName: input.senderDisplayName,
        sourceReplyId: null,
        targetDisplayBoardId: input.targetDisplayBoardId ?? null,
        displayDurationSeconds,
        expiresAt,
        isActive: true,
      },
    });

    await emitBroadcastEvent(broadcast);

    try {
      await writeAuditLog({
        action: 'BROADCAST_MESSAGE_SENT',
        actorId: input.senderOfficerId,
        entity: 'Notification',
        description: 'Direct broadcast sent',
        metadata: {
          broadcastId: broadcast.id,
          message: broadcast.message,
          senderOfficerId: broadcast.senderOfficerId,
          senderDisplayName: broadcast.senderDisplayName,
          expiresAt: broadcast.expiresAt?.toISOString() ?? null,
          displayDurationSeconds: broadcast.displayDurationSeconds,
          isActive: broadcast.isActive,
          source: 'direct',
        },
      });
    } catch (err) {
      console.error('[broadcast] Failed to write audit log for direct broadcast:', err);
    }

    return broadcast;
  } catch (error) {
    console.error('[broadcast] Failed to create direct broadcast:', error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Query: get active broadcasts for initial data load (used by 4.3.3)
// ---------------------------------------------------------------------------

/**
 * Fetches the most recent active (non-expired) broadcasts.
 * Used by the security officer screen (4.3.3) for its initial data load.
 */
export async function getActiveBroadcasts(limit: number = 50): Promise<BroadcastMessage[]> {
  return prisma.broadcastMessage.findMany({
    where: {
      isActive: true,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

// =============================================================================
// src/lib/notification-reply.ts — Centralised reply module (4.3.1)
// =============================================================================
// Single source of truth for officer reply operations: validation,
// authorisation, creation inside a Prisma transaction, and post-commit
// broadcast trigger delegation to 4.3.2's lib/broadcast.ts.
// =============================================================================

import { prisma } from '@/lib/db';
import { createBroadcastFromReply } from '@/lib/broadcast';
import type { Notification, NotificationReply, BroadcastMessage } from '@prisma/client';

// ---------------------------------------------------------------------------
// Custom error classes
// ---------------------------------------------------------------------------

export class NotificationNotFoundError extends Error {
  public readonly code = 'NOT_FOUND' as const;
  constructor() {
    super('Notification not found');
    this.name = 'NotificationNotFoundError';
  }
}

export class NotAuthorizedToReplyError extends Error {
  public readonly code = 'FORBIDDEN' as const;
  constructor() {
    super('You are not authorized to reply to this notification');
    this.name = 'NotAuthorizedToReplyError';
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateReplyInput {
  notificationId: string;
  counterOfficerId: string;
  message: string;
}

type ReplyWithCounterOfficer = NotificationReply & {
  counterOfficer: {
    user: { name: string | null };
    counter: { id: string; name: string; number: number };
  };
};

export interface CreateReplyResult {
  reply: ReplyWithCounterOfficer;
  broadcast: BroadcastMessage | null;
}

// ---------------------------------------------------------------------------
// Pre-flight check (fast fail before opening transaction)
// ---------------------------------------------------------------------------

/**
 * Fetches a notification and verifies the caller is the recipient.
 * Returns null if the notification doesn't exist or the caller is not the
 * recipient. This is a fast pre-flight check — the authoritative TOCTOU-safe
 * check is inside createReply's transaction.
 */
export async function getNotificationForOfficer(
  notificationId: string,
  counterOfficerId: string,
): Promise<Notification | null> {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    include: { counterOfficer: { include: { user: true } } },
  });

  if (!notification) return null;
  if (notification.counterOfficerId !== counterOfficerId) return null;

  return notification;
}

// ---------------------------------------------------------------------------
// Pure validation helper
// ---------------------------------------------------------------------------

export function validateReplyMessage(
  message: string,
): { valid: true; trimmed: string } | { valid: false; reason: 'EMPTY' | 'TOO_LONG' } {
  const trimmed = message.trim();
  if (trimmed.length === 0) return { valid: false, reason: 'EMPTY' };
  if (trimmed.length > 500) return { valid: false, reason: 'TOO_LONG' };
  return { valid: true, trimmed };
}

// ---------------------------------------------------------------------------
// Core: create a reply (authoritative — inside transaction)
// ---------------------------------------------------------------------------

/**
 * Creates a NotificationReply inside a Prisma transaction.
 *
 * The transaction includes the TOCTOU-safe authorisation re-check (the
 * calling CounterOfficer must be the notification's recipient). After the
 * transaction commits, the broadcast is created as a post-commit step.
 *
 * @returns The created reply and (if successful) the broadcast.
 */
export async function createReply(input: CreateReplyInput): Promise<CreateReplyResult> {
  // Step 1: Create the reply inside a transaction
  const replyWithOfficer = await prisma.$transaction(async (tx) => {
    // Authorisation re-check (TOCTOU-safe — inside the transaction)
    const notification = await tx.notification.findUnique({
      where: { id: input.notificationId },
      include: { counterOfficer: { include: { user: true } } },
    });

    if (!notification) {
      throw new NotificationNotFoundError();
    }

    if (notification.counterOfficerId !== input.counterOfficerId) {
      throw new NotAuthorizedToReplyError();
    }

    // Create the NotificationReply
    const reply = await tx.notificationReply.create({
      data: {
        notificationId: input.notificationId,
        counterOfficerId: input.counterOfficerId,
        message: input.message.trim(),
        isDisplayBroadcast: true,
        isSecurityBroadcast: false,
      },
      include: {
        counterOfficer: {
          include: {
            user: { select: { name: true } },
            counter: { select: { id: true, name: true, number: true } },
          },
        },
      },
    });

    return reply;
  });

  // Step 2: Post-commit — create the broadcast via 4.3.2's module
  const officerName = replyWithOfficer.counterOfficer.user.name ?? 'Unknown Officer';

  let broadcast: BroadcastMessage | null = null;
  try {
    broadcast = await createBroadcastFromReply(replyWithOfficer, officerName);
  } catch (error) {
    console.error('[notification-reply] Broadcast creation failed (non-fatal):', error);
  }

  return { reply: replyWithOfficer, broadcast };
}

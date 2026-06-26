// =============================================================================
// src/lib/notification-dispatch.ts — Notification dispatch & retry (4.1.3)
// =============================================================================
// Central dispatch orchestrator. Determines recipients, creates Notification
// records (PENDING), dispatches via FCM with retry logic, transitions status
// to SENT/FAILED, and writes audit log entries.
//
// Exports:
// - notifyOfficers(input): Promise<NotificationDispatchSummary>
// - buildNotificationPayload(input, notificationId)
// - NotifyOfficersInput, NotificationDispatchSummary
// =============================================================================

import { prisma as db } from '@/lib/db';
import { sendNotification } from '@/lib/notification-service';
import type { SendNotificationInput } from '@/lib/notification-service';
import { getActiveTokensForOfficer } from '@/lib/device-token';
import { writeAuditLog } from '@/lib/audit-log';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Input shape for notifyOfficers — built by the caller (ticket issuance/recall). */
export interface NotifyOfficersInput {
  ticketId: string;
  ticketNumber: string;
  serviceId: string;
  serviceName: string;
  counterId: string | null;
  counterName: string | null;
  type: 'TICKET_ISSUED' | 'TICKET_RECALLED';
  recipientCounterOfficerIds: string[];
}

/** Summary returned by notifyOfficers after all dispatches complete. */
export interface NotificationDispatchSummary {
  notificationsCreated: number;
  notificationsSent: number;
  notificationsFailed: number;
  recipientsSkipped: number;
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Retry delays in milliseconds: 1s, 5s, 30s. */
const RETRY_DELAYS_MS: readonly number[] = [1000, 5000, 30000];

/** Maximum retry attempts (1 initial + 3 retries = 4 total). */
const MAX_RETRY_ATTEMPTS = 3;

/** Title by notification type. */
const NOTIFICATION_TITLE_BY_TYPE: Record<NotifyOfficersInput['type'], string> = {
  TICKET_ISSUED: 'New Ticket',
  TICKET_RECALLED: 'Ticket Recalled',
};

// ---------------------------------------------------------------------------
// buildNotificationPayload
// ---------------------------------------------------------------------------

/**
 * Constructs the title, body, and data payload for a notification.
 * The `data` values are all strings (FCM requirement).
 */
export function buildNotificationPayload(
  input: NotifyOfficersInput,
  notificationId: string,
): { title: string; body: string; data: Record<string, string> } {
  const title = NOTIFICATION_TITLE_BY_TYPE[input.type];

  const body =
    input.type === 'TICKET_ISSUED'
      ? `Ticket ${input.ticketNumber} for ${input.serviceName}`
      : `Ticket ${input.ticketNumber} has been recalled`;

  const data: Record<string, string> = {
    type: input.type,
    notificationId,
    ticketId: input.ticketId,
    ticketNumber: input.ticketNumber,
    serviceId: input.serviceId,
    serviceName: input.serviceName,
    counterId: input.counterId ?? '',
    counterName: input.counterName ?? '',
    replyUrl: `/api/notifications/${notificationId}/reply`,
  };

  return { title, body, data };
}

// ---------------------------------------------------------------------------
// sendNotificationWithRetry (internal)
// ---------------------------------------------------------------------------

/**
 * Wraps sendNotification with retry logic for TRANSIENT_ERROR.
 * Handles the Notification.status transition to SENT or FAILED.
 */
async function sendNotificationWithRetry(
  notificationId: string,
  token: string,
  payload: SendNotificationInput,
): Promise<{ success: boolean; error?: string; fcmMessageId?: string }> {
  // First attempt
  let result = await sendNotification(payload);

  if (result.success) {
    await db.notification
      .update({
        where: { id: notificationId },
        data: { status: 'SENT', sentAt: new Date(), fcmMessageId: result.messageId },
      })
      .catch(() => {});

    // Refresh device token lastUsedAt
    await db.deviceToken
      .updateMany({ where: { token }, data: { lastUsedAt: new Date() } })
      .catch(() => {});

    return { success: true, fcmMessageId: result.messageId };
  }

  // Non-retriable errors — short-circuit
  if (result.error !== 'TRANSIENT_ERROR') {
    await db.notification
      .update({
        where: { id: notificationId },
        data: { status: 'FAILED', sentAt: new Date() },
      })
      .catch(() => {});
    return { success: false, error: result.error };
  }

  // Retry loop for TRANSIENT_ERROR
  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
    const delay = RETRY_DELAYS_MS[attempt] ?? 30000;
    console.warn(
      `[Notification] Retrying dispatch for notification ${notificationId} (attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS + 1}) after ${delay}ms`,
    );

    await new Promise((resolve) => setTimeout(resolve, delay));
    result = await sendNotification(payload);

    if (result.success) {
      await db.notification
        .update({
          where: { id: notificationId },
          data: { status: 'SENT', sentAt: new Date(), fcmMessageId: result.messageId },
        })
        .catch(() => {});

      await db.deviceToken
        .updateMany({ where: { token }, data: { lastUsedAt: new Date() } })
        .catch(() => {});

      return { success: true, fcmMessageId: result.messageId };
    }

    // If error changed from TRANSIENT to something non-retriable, short-circuit
    if (result.error !== 'TRANSIENT_ERROR') {
      await db.notification
        .update({
          where: { id: notificationId },
          data: { status: 'FAILED', sentAt: new Date() },
        })
        .catch(() => {});
      return { success: false, error: result.error };
    }
  }

  // All retries exhausted
  await db.notification
    .update({
      where: { id: notificationId },
      data: { status: 'FAILED', sentAt: new Date() },
    })
    .catch(() => {});

  return { success: false, error: 'TRANSIENT_ERROR' };
}

// ---------------------------------------------------------------------------
// notifyOfficers (exported)
// ---------------------------------------------------------------------------

/**
 * Main entry point for notification dispatch. Called by ticket issuance (2.2.1)
 * and recall (2.3.1) after the transaction commits and SSE broadcast.
 *
 * Best-effort: never throws. Failures are logged; the summary is always returned.
 */
export async function notifyOfficers(
  input: NotifyOfficersInput,
): Promise<NotificationDispatchSummary> {
  const startTime = Date.now();
  const summary: NotificationDispatchSummary = {
    notificationsCreated: 0,
    notificationsSent: 0,
    notificationsFailed: 0,
    recipientsSkipped: 0,
    durationMs: 0,
  };

  try {
    for (const counterOfficerId of input.recipientCounterOfficerIds) {
      // Look up officer
      const officer = await db.counterOfficer.findUnique({
        where: { id: counterOfficerId },
      });

      if (!officer) {
        summary.recipientsSkipped++;
        continue;
      }

      // Defensive check: skip if notifications disabled
      if (!officer.notificationsEnabled) {
        summary.recipientsSkipped++;
        continue;
      }

      // Look up active device tokens
      const tokens = await getActiveTokensForOfficer(counterOfficerId);

      if (tokens.length === 0) {
        summary.recipientsSkipped++;
        continue;
      }

      // Create a Notification record for the officer (one per officer)
      const { title, body, data } = buildNotificationPayload(
        input,
        'placeholder', // will be overwritten by the created record's ID
      );

      const notification = await db.notification.create({
        data: {
          ticketId: input.ticketId,
          counterOfficerId,
          type: input.type,
          title,
          body,
          data,
          status: 'PENDING',
        },
      });

      summary.notificationsCreated++;

      // Update the data payload with the real notification ID
      const payloadWithId = buildNotificationPayload(input, notification.id);

      // Dispatch to each active device token
      for (const deviceToken of tokens) {
        const fcmInput: SendNotificationInput = {
          token: deviceToken.token,
          title: payloadWithId.title,
          body: payloadWithId.body,
          data: payloadWithId.data,
        };

        const dispatchResult = await sendNotificationWithRetry(
          notification.id,
          deviceToken.token,
          fcmInput,
        );

        if (dispatchResult.success) {
          summary.notificationsSent++;
        } else {
          summary.notificationsFailed++;
        }
      }
    }
  } catch (error) {
    console.error('[Notification] Unexpected error in notifyOfficers:', error);
    // Summary still returned with partial counts
  }

  summary.durationMs = Date.now() - startTime;

  // Audit log — best-effort
  try {
    if (summary.notificationsSent > 0) {
      await writeAuditLog({
        action: 'NOTIFICATION_DISPATCHED',
        actorId: '',
        description: `Dispatched ${summary.notificationsSent} notification(s) for ${input.type} ticket ${input.ticketNumber}`,
        metadata: {
          type: input.type,
          ticketId: input.ticketId,
          ticketNumber: input.ticketNumber,
          ...summary,
        },
      });
    } else if (summary.notificationsCreated > 0 && summary.notificationsFailed > 0) {
      await writeAuditLog({
        action: 'NOTIFICATION_FAILED',
        actorId: '',
        description: `Failed to dispatch notifications for ${input.type} ticket ${input.ticketNumber}`,
        metadata: {
          type: input.type,
          ticketId: input.ticketId,
          ticketNumber: input.ticketNumber,
          ...summary,
        },
      });
    }
  } catch {
    // Best-effort — log swallowed
  }

  return summary;
}

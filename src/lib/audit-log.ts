// =============================================================================
// src/lib/audit-log.ts — Audit log best-effort writer (1.3.3)
// =============================================================================
// Single entry point for writing AuditLog rows. Every mutating user-management
// action in 1.3.3 calls `writeAuditLog()`. Phase 2+ extends the AuditAction
// union with service/counter/ticket actions.
//
// BEST-EFFORT GUARANTEE: failure to write an audit log row does NOT fail the
// calling action. Errors are logged to console.error and silently swallowed.
// =============================================================================

import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** All audit action types (extensible — add new entries as modules grow). */
export type AuditAction =
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DEACTIVATED'
  | 'USER_REACTIVATED'
  | 'PASSWORD_RESET_BY_ADMIN'
  | 'ROLE_ASSIGNED'
  | 'ROLE_REMOVED'
  // Phase 2.1.1 — Service actions
  | 'SERVICE_CREATED'
  | 'SERVICE_UPDATED'
  | 'SERVICE_DEACTIVATED'
  // Phase 2.1.2 — Counter actions
  | 'COUNTER_CREATED'
  | 'COUNTER_UPDATED'
  | 'COUNTER_DEACTIVATED'
  // Phase 2.1.3 — Service-Counter assignment actions
  | 'SERVICE_ASSIGNED_TO_COUNTER'
  | 'SERVICE_UNASSIGNED_FROM_COUNTER'
  // Phase 2.3.3 — Daily reset
  | 'DAILY_RESET_MANUAL'
  // Phase 3.2.3 — Display board configuration
  | 'DISPLAY_BOARD_CREATED'
  | 'DISPLAY_BOARD_UPDATED'
  | 'DISPLAY_BOARD_DELETED'
  | 'DISPLAY_BOARD_DEFAULT_CHANGED'
  // Phase 4.1.2 — Device token actions
  | 'DEVICE_TOKEN_REGISTERED'
  | 'DEVICE_TOKEN_REMOVED'
  // Phase 4.1.3 — Notification dispatch actions
  | 'NOTIFICATION_DISPATCHED'
  | 'NOTIFICATION_FAILED'
  // Phase 4.2.1 — Counter status changed by an officer (open/close transitions)
  | 'COUNTER_STATUS_CHANGED'
  // Phase 4.2.2 — Notification toggle changed by an officer
  | 'NOTIFICATIONS_TOGGLED'
  // Phase 4.3.1 — Officer reply to a notification
  | 'NOTIFICATION_REPLIED'
  // Phase 4.3.2 — Broadcast message sent to display board and security screen
  | 'BROADCAST_MESSAGE_SENT';

export interface AuditLogEntry {
  action: AuditAction;
  actorId: string;
  actorName?: string;
  targetUserId?: string;
  targetUserName?: string;
  description: string;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Writer
// ---------------------------------------------------------------------------

/**
 * Writes an AuditLog row. Best-effort — never throws.
 */
export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.actorId,
        userDisplayName: entry.actorName ?? null,
        action: entry.action,
        entity: 'USER',
        entityId: entry.targetUserId ?? null,
        after: entry.metadata
          ? (JSON.parse(JSON.stringify(entry.metadata)) as Prisma.InputJsonValue)
          : undefined,
      },
    });
  } catch (error) {
    // Best-effort: log to console but don't fail the calling action
    console.error(
      `[audit-log] Failed to write audit entry [${entry.action}] for actor ${entry.actorId}:`,
      error instanceof Error ? error.message : error,
    );
  }
}

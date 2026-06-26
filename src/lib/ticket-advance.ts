// =============================================================================
// src/lib/ticket-advance.ts — Auto-advance helper (2.3.2)
// =============================================================================
// Encapsulates the auto-advance logic used after a no-show to automatically
// call the next waiting ticket for a service. Also provides helpers for
// reading the no-show grace period and auto-advance enablement settings.
// =============================================================================

import 'server-only';
import { prisma as db } from '@/lib/db';
import { callTicket } from '@/lib/ticket-service';
import { findNextWaitingTicketForCounter } from '@/lib/ticket-officer';
import type { ResolvedOfficer } from '@/lib/ticket-officer';
import type { TicketDetail } from '@/types/ticket.types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AdvanceResult {
  ticket: TicketDetail | null;
  attempted: boolean;
}

// ---------------------------------------------------------------------------
// getAutoAdvanceEnabled
// ---------------------------------------------------------------------------

/**
 * Reads SystemSetting.queue.auto_advance_on_no_show.
 * Falls back to true when the setting is not present.
 * (2.3.3 seeds the setting; until then this fallback takes effect.)
 */
export async function getAutoAdvanceEnabled(): Promise<boolean> {
  const setting = await db.systemSetting.findUnique({
    where: { key: 'queue.auto_advance_on_no_show' },
  });
  if (!setting) return true;
  return setting.value === 'true';
}

// ---------------------------------------------------------------------------
// getNoShowGracePeriodSeconds
// ---------------------------------------------------------------------------

/**
 * Reads SystemSetting.queue.no_show_grace_period_seconds.
 * Falls back to 60 when the setting is not present.
 */
export async function getNoShowGracePeriodSeconds(): Promise<number> {
  const setting = await db.systemSetting.findUnique({
    where: { key: 'queue.no_show_grace_period_seconds' },
  });
  if (!setting) return 60;
  const parsed = Number(setting.value);
  return Number.isNaN(parsed) ? 60 : parsed;
}

// ---------------------------------------------------------------------------
// advanceToNextWaitingTicket
// ---------------------------------------------------------------------------

/**
 * Finds and calls the next waiting ticket for a service at a counter.
 * Called AFTER the no-show transaction commits — NOT inside it.
 *
 * If the auto-advance callTicket fails, the error is caught and logged;
 * the no-show itself remains committed and unaffected.
 */
export async function advanceToNextWaitingTicket(
  serviceId: string,
  counterId: string,
  officer: ResolvedOfficer,
): Promise<AdvanceResult> {
  try {
    const nextTicket = await findNextWaitingTicketForCounter(counterId, serviceId);

    if (!nextTicket) {
      return { ticket: null, attempted: true };
    }

    const called = await callTicket({ ticketId: nextTicket.id, counterId }, officer);

    return { ticket: called, attempted: true };
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[advanceToNextWaitingTicket] Auto-advance failed:', error);
    }
    return { ticket: null, attempted: true };
  }
}

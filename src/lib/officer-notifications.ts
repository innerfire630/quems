// =============================================================================
// src/lib/officer-notifications.ts — Notification toggle module (4.2.2)
// =============================================================================
// Centralised functions for reading and writing CounterOfficer.notificationsEnabled.
//
// Exports:
// - setNotificationsEnabled(input): Promise<CounterOfficer>
// - getNotificationsState(userId): Promise<NotificationsStateEntry[]>
// - findCounterOfficerForUserAndCounter(userId, counterId): Promise<CounterOfficer | null>
// - CounterOfficerNotFoundError
// =============================================================================

import 'server-only';
import { prisma as db } from '@/lib/db';
import type { CounterOfficer } from '@prisma/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SetNotificationsEnabledInput {
  counterOfficerId: string;
  enabled: boolean;
}

export interface NotificationsStateEntry {
  counterOfficerId: string;
  counterId: string;
  counterName: string;
  counterNumber: number;
  notificationsEnabled: boolean;
}

// ---------------------------------------------------------------------------
// Custom error class
// ---------------------------------------------------------------------------

export class CounterOfficerNotFoundError extends Error {
  constructor(counterOfficerId: string) {
    super(`CounterOfficer record not found: ${counterOfficerId}`);
    this.name = 'CounterOfficerNotFoundError';
  }
}

// ---------------------------------------------------------------------------
// setNotificationsEnabled
// ---------------------------------------------------------------------------

/**
 * Atomically updates CounterOfficer.notificationsEnabled for a single
 * officer-counter pair. No transaction needed for a single update.
 *
 * Throws CounterOfficerNotFoundError if the record does not exist.
 */
export async function setNotificationsEnabled(
  input: SetNotificationsEnabledInput,
): Promise<CounterOfficer> {
  const existing = await db.counterOfficer.findUnique({
    where: { id: input.counterOfficerId },
  });

  if (!existing) {
    throw new CounterOfficerNotFoundError(input.counterOfficerId);
  }

  return db.counterOfficer.update({
    where: { id: input.counterOfficerId },
    data: { notificationsEnabled: input.enabled },
  });
}

// ---------------------------------------------------------------------------
// getNotificationsState
// ---------------------------------------------------------------------------

/**
 * Returns the full notification state across all of an officer's counter
 * assignments, ordered by Counter.number asc.
 */
export async function getNotificationsState(userId: string): Promise<NotificationsStateEntry[]> {
  const records = await db.counterOfficer.findMany({
    where: { userId },
    include: { counter: { select: { name: true, number: true } } },
    orderBy: { counter: { number: 'asc' } },
  });

  return records.map((officer) => ({
    counterOfficerId: officer.id,
    counterId: officer.counterId,
    counterName: officer.counter.name,
    counterNumber: officer.counter.number,
    notificationsEnabled: officer.notificationsEnabled,
  }));
}

// ---------------------------------------------------------------------------
// findCounterOfficerForUserAndCounter
// ---------------------------------------------------------------------------

/**
 * Looks up the CounterOfficer record for a given user and counter.
 * Returns null if no assignment exists.
 */
export async function findCounterOfficerForUserAndCounter(
  userId: string,
  counterId: string,
): Promise<CounterOfficer | null> {
  return db.counterOfficer.findUnique({
    where: { userId_counterId: { userId, counterId } },
  });
}

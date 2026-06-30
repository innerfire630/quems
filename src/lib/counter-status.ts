// =============================================================================
// src/lib/counter-status.ts — Centralised counter status module (4.2.1)
// =============================================================================
// All CounterStatusEvent and CounterOfficer.currentStatus operations.
//
// Exports:
// - getCurrentStatus(counterId): Promise<CounterStatusSnapshot | null>
// - setCounterStatus(input): Promise<CounterStatusEventWithOfficer>
// - isCounterClosed(counterId): Promise<boolean>
// - getRecentStatusEvents(counterId, limit): Promise<CounterStatusEventWithOfficer[]>
// - Custom error classes
// =============================================================================

import 'server-only';
import { prisma as db } from '@/lib/db';
import type { CounterOfficerStatus } from '@prisma/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SetCounterStatusInput {
  counterId: string;
  officerId: string;
  newStatus: 'AVAILABLE' | 'CLOSED';
  reason?: string | null;
}

export interface CounterStatusSnapshot {
  status: 'OPENED' | 'CLOSED';
  reason: string | null;
  lastChangedAt: Date;
  changedByOfficerId: string | null;
  changedByOfficerName: string | null;
}

export interface CounterStatusEventWithOfficer {
  id: string;
  counterId: string;
  counterOfficerId: string;
  status: string;
  reason: string | null;
  createdAt: Date;
  changedByOfficerName: string;
}

// ---------------------------------------------------------------------------
// Custom error classes
// ---------------------------------------------------------------------------

export class InvalidCounterStatusTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCounterStatusTransitionError';
  }
}

export class OfficerNotAssignedToCounterError extends Error {
  constructor(counterId: string) {
    super(`You are not assigned to counter ${counterId}.`);
    this.name = 'OfficerNotAssignedToCounterError';
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function mapApiStatusToDbStatus(apiStatus: 'OPENED' | 'CLOSED'): 'AVAILABLE' | 'CLOSED' {
  return apiStatus === 'OPENED' ? 'AVAILABLE' : 'CLOSED';
}

function mapDbStatusToApiStatus(dbStatus: CounterOfficerStatus | string): 'OPENED' | 'CLOSED' {
  // CounterOfficerStatus enum: AVAILABLE, SERVING → open; CLOSED, OFFLINE → closed
  // CounterEventStatus enum:  OPENED, REOPENED → open; CLOSED_TEMPORARY, CLOSED_PERMANENT → closed
  return dbStatus === 'AVAILABLE' ||
    dbStatus === 'SERVING' ||
    dbStatus === 'OPENED' ||
    dbStatus === 'REOPENED'
    ? 'OPENED'
    : 'CLOSED';
}

// ---------------------------------------------------------------------------
// getCurrentStatus
// ---------------------------------------------------------------------------

/**
 * Returns the current counter status derived from the most recent
 * CounterStatusEvent, falling back to the active CounterOfficer record.
 * Returns null if no officer is on duty.
 */
export async function getCurrentStatus(counterId: string): Promise<CounterStatusSnapshot | null> {
  // Try the most recent CounterStatusEvent first
  const lastEvent = await db.counterStatusEvent.findFirst({
    where: { counterId },
    orderBy: { createdAt: 'desc' },
    include: { counterOfficer: { include: { user: { select: { name: true } } } } },
  });

  if (lastEvent) {
    return {
      status: mapDbStatusToApiStatus(lastEvent.status),
      reason: lastEvent.reason,
      lastChangedAt: lastEvent.createdAt,
      changedByOfficerId: lastEvent.counterOfficerId,
      changedByOfficerName: lastEvent.counterOfficer.user.name,
    };
  }

  // Fallback: check the active CounterOfficer record
  const officer = await db.counterOfficer.findFirst({
    where: { counterId, isOnDuty: true },
    include: { user: { select: { name: true } } },
  });

  if (!officer) return null;

  return {
    status: mapDbStatusToApiStatus(officer.currentStatus),
    reason: officer.closureReason,
    lastChangedAt: officer.closedAt ?? officer.updatedAt,
    changedByOfficerId: officer.id,
    changedByOfficerName: officer.user.name,
  };
}

// ---------------------------------------------------------------------------
// setCounterStatus
// ---------------------------------------------------------------------------

/**
 * Atomically updates the CounterOfficer.currentStatus and creates a
 * CounterStatusEvent record inside a single Prisma transaction.
 *
 * Throws:
 * - InvalidCounterStatusTransitionError if the transition is illegal.
 * - OfficerNotAssignedToCounterError if the officer doesn't belong to this counter.
 */
export async function setCounterStatus(
  input: SetCounterStatusInput,
): Promise<CounterStatusEventWithOfficer> {
  const dbStatus = mapApiStatusToDbStatus(input.newStatus === 'AVAILABLE' ? 'OPENED' : 'CLOSED') as
    | 'AVAILABLE'
    | 'CLOSED';

  return db.$transaction(async (tx) => {
    // Resolve the officer's CounterOfficer record
    const officer = await tx.counterOfficer.findUnique({
      where: {
        userId_counterId: {
          userId: input.officerId,
          counterId: input.counterId,
        },
      },
      include: { user: { select: { name: true } } },
    });

    if (!officer) {
      throw new OfficerNotAssignedToCounterError(input.counterId);
    }

    // Validate the transition
    const currentDbStatus = officer.currentStatus as string;
    if (currentDbStatus === dbStatus) {
      const apiLabel = mapDbStatusToApiStatus(dbStatus);
      throw new InvalidCounterStatusTransitionError(
        `Counter is already ${apiLabel.toLowerCase()}.`,
      );
    }

    // Update the officer status and optionally the closure fields
    const updateData: {
      currentStatus: CounterOfficerStatus;
      isOnDuty?: boolean;
      closureReason?: string | null;
      closedAt?: Date | null;
    } = {
      currentStatus: dbStatus as CounterOfficerStatus,
    };

    if (dbStatus === 'CLOSED') {
      updateData.closureReason = input.reason ?? null;
      updateData.closedAt = new Date();
    } else {
      // Opening the counter sets isOnDuty true and clears closure fields
      updateData.isOnDuty = true;
      updateData.closureReason = null;
      updateData.closedAt = null;
    }

    await tx.counterOfficer.update({
      where: { id: officer.id },
      data: updateData,
    });

    // Create the CounterStatusEvent
    const event = await tx.counterStatusEvent.create({
      data: {
        counterId: input.counterId,
        counterOfficerId: officer.id,
        status: (dbStatus === 'CLOSED' ? 'CLOSED_TEMPORARY' : 'OPENED') as
          | 'CLOSED_TEMPORARY'
          | 'OPENED',
        reason: input.reason ?? null,
      },
    });

    return {
      id: event.id,
      counterId: event.counterId,
      counterOfficerId: event.counterOfficerId,
      status: mapDbStatusToApiStatus(dbStatus),
      reason: event.reason,
      createdAt: event.createdAt,
      changedByOfficerName: officer.user.name,
    };
  });
}

// ---------------------------------------------------------------------------
// isCounterClosed
// ---------------------------------------------------------------------------

/**
 * Lightweight check: returns true if any active CounterOfficer record
 * with isOnDuty = true has currentStatus = 'CLOSED'.
 * Returns false if no officer is on duty (treated as "not closed").
 */
export async function isCounterClosed(counterId: string): Promise<boolean> {
  const officer = await db.counterOfficer.findFirst({
    where: {
      counterId,
      isOnDuty: true,
      currentStatus: 'CLOSED',
    },
    select: { id: true },
  });

  return officer !== null;
}

// ---------------------------------------------------------------------------
// getRecentStatusEvents
// ---------------------------------------------------------------------------

/**
 * Returns the last `limit` CounterStatusEvent records for the counter,
 * ordered by createdAt desc, with officer name included.
 */
export async function getRecentStatusEvents(
  counterId: string,
  limit: number,
): Promise<CounterStatusEventWithOfficer[]> {
  const events = await db.counterStatusEvent.findMany({
    where: { counterId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { counterOfficer: { include: { user: { select: { name: true } } } } },
  });

  return events.map((event) => ({
    id: event.id,
    counterId: event.counterId,
    counterOfficerId: event.counterOfficerId,
    status: mapDbStatusToApiStatus(event.status),
    reason: event.reason,
    createdAt: event.createdAt,
    changedByOfficerName: event.counterOfficer.user.name,
  }));
}

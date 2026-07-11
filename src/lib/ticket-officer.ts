// =============================================================================
// src/lib/ticket-officer.ts — Officer resolver & counter helpers (2.3.1)
// =============================================================================
// Server-only helpers for resolving the calling officer, finding the current
// serving ticket for a counter, finding the next waiting ticket, and listing
// assigned services. Used by call/recall/no-show endpoints and the auto-advance
// logic in 2.3.2.
// =============================================================================

import 'server-only';
import { prisma as db } from '@/lib/db';
import { mapTicketToDetail } from '@/lib/ticket-service';
import type { TicketDetail } from '@/types/ticket.types';
import type { CounterOfficerStatus } from '@prisma/client';

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export interface OfficerNotOnDutyError {
  kind: 'OFFICER_NOT_ON_DUTY';
  userId: string;
  counterId: string;
  message: string;
}

export interface OfficerNotAssignedError {
  kind: 'OFFICER_NOT_ASSIGNED';
  userId: string;
  counterId: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Resolved officer shape
// ---------------------------------------------------------------------------

export interface ResolvedOfficer {
  id: string;
  userId: string;
  counterId: string;
  currentStatus: CounterOfficerStatus;
  userName: string;
}

// ---------------------------------------------------------------------------
// resolveCallingOfficer
// ---------------------------------------------------------------------------

/**
 * Resolves the session user to the CounterOfficer record at the specified
 * counter, with on-duty check. Throws typed errors on failure.
 */
export async function resolveCallingOfficer(
  userId: string,
  counterId: string,
): Promise<ResolvedOfficer> {
  const officer = await db.counterOfficer.findUnique({
    where: { userId_counterId: { userId, counterId } },
    include: { user: { select: { name: true, status: true } } },
  });

  if (!officer) {
    const err: OfficerNotAssignedError = {
      kind: 'OFFICER_NOT_ASSIGNED',
      userId,
      counterId,
      message: 'You are not assigned to this counter. Contact an administrator.',
    };
    throw err;
  }

  if (officer.user.status === 'INACTIVE' || officer.user.status === 'SUSPENDED') {
    const err: OfficerNotOnDutyError = {
      kind: 'OFFICER_NOT_ON_DUTY',
      userId,
      counterId,
      message: 'Your account has been deactivated. Contact an administrator.',
    };
    throw err;
  }

  if (!officer.isOnDuty) {
    const err: OfficerNotOnDutyError = {
      kind: 'OFFICER_NOT_ON_DUTY',
      userId,
      counterId,
      message: 'You are not currently on duty at this counter. Go on duty before calling tickets.',
    };
    throw err;
  }

  return {
    id: officer.id,
    userId: officer.userId,
    counterId: officer.counterId,
    currentStatus: officer.currentStatus,
    userName: officer.user.name,
  };
}

// ---------------------------------------------------------------------------
// findCurrentServingTicketForCounter
// ---------------------------------------------------------------------------

/**
 * Returns the most recent ticket at this counter in an in-progress state
 * (CALLED, RECALLED, or SERVING), or null if none exists.
 */
export async function findCurrentServingTicketForCounter(
  counterId: string,
): Promise<TicketDetail | null> {
  const ticket = await db.ticket.findFirst({
    where: {
      counterId,
      status: { in: ['CALLED', 'RECALLED', 'SERVING'] },
    },
    orderBy: { calledAt: 'desc' },
    include: {
      service: true,
      counter: true,
      calledByOfficer: { include: { user: true } },
      events: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!ticket) return null;
  return mapTicketToDetail(ticket as unknown as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// findNextWaitingTicketForCounter
// ---------------------------------------------------------------------------

/**
 * Finds the earliest waiting ticket for the counter. If `serviceId` is
 * absent, uses the counter's first assigned service.
 */
export async function findNextWaitingTicketForCounter(
  counterId: string,
  serviceId?: string,
): Promise<TicketDetail | null> {
  const resolvedServiceId = serviceId ?? (await getFirstAssignedServiceId(counterId));

  if (!resolvedServiceId) return null;

  const ticket = await db.ticket.findFirst({
    where: {
      counterId: null,
      status: 'WAITING',
      serviceId: resolvedServiceId,
    },
    orderBy: { issuedAt: 'asc' },
    include: {
      service: true,
      counter: true,
      calledByOfficer: { include: { user: true } },
      events: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!ticket) return null;
  return mapTicketToDetail(ticket as unknown as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// findAssignedServiceIdsForCounter
// ---------------------------------------------------------------------------

/**
 * Returns the array of service IDs assigned to this counter.
 */
export async function findAssignedServiceIdsForCounter(counterId: string): Promise<string[]> {
  const rows = await db.counterService.findMany({
    where: { counterId },
    select: { serviceId: true },
  });
  return rows.map((r) => r.serviceId);
}

// ---------------------------------------------------------------------------
// getFirstAssignedServiceId (internal)
// ---------------------------------------------------------------------------

async function getFirstAssignedServiceId(counterId: string): Promise<string | null> {
  const row = await db.counterService.findFirst({
    where: { counterId },
    select: { serviceId: true },
  });
  return row?.serviceId ?? null;
}

// ---------------------------------------------------------------------------
// countWaitingTicketsForCounter
// ---------------------------------------------------------------------------

/**
 * Returns the count of WAITING tickets for any service assigned to this counter.
 */
export async function countWaitingTicketsForCounter(counterId: string): Promise<number> {
  const serviceIds = await findAssignedServiceIdsForCounter(counterId);
  if (serviceIds.length === 0) return 0;

  return db.ticket.count({
    where: {
      counterId: null,
      status: 'WAITING',
      serviceId: { in: serviceIds },
    },
  });
}

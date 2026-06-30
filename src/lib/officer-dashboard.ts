// =============================================================================
// src/lib/officer-dashboard.ts — Server-side data loader (4.2.3)
// =============================================================================
// Loads all initial dashboard state in a single server-side call via Promise.all.
// =============================================================================

import 'server-only';
import { prisma as db } from '@/lib/db';
import {
  findCurrentServingTicketForCounter,
  findNextWaitingTicketForCounter,
} from '@/lib/ticket-officer';
import { getCurrentStatus, getRecentStatusEvents } from '@/lib/counter-status';
import {
  getNotificationsState,
  findCounterOfficerForUserAndCounter,
} from '@/lib/officer-notifications';
import type { OfficerDashboardData, RecentActivityEntry } from '@/types/officer-dashboard.types';

// ---------------------------------------------------------------------------
// Custom error
// ---------------------------------------------------------------------------

export class OfficerNotAssignedToCounterError extends Error {
  constructor() {
    super('You are not assigned to this counter.');
    this.name = 'OfficerNotAssignedToCounterError';
  }
}

// ---------------------------------------------------------------------------
// getOfficerDashboardData
// ---------------------------------------------------------------------------

export async function getOfficerDashboardData(
  counterId: string,
  userId: string,
): Promise<OfficerDashboardData> {
  // Validate assignment
  const officerRecord = await findCounterOfficerForUserAndCounter(userId, counterId);
  if (!officerRecord) {
    throw new OfficerNotAssignedToCounterError();
  }

  // Load all data in parallel
  const [
    counter,
    currentServingTicket,
    nextTicket,
    queueDepthCount,
    recentActivity,
    recentStatusEvents,
    notificationsState,
    currentStatus,
    user,
  ] = await Promise.all([
    getCounterDetails(counterId),
    findCurrentServingTicketForCounter(counterId),
    findNextWaitingTicketForCounter(counterId),
    getQueueDepth(counterId),
    getRecentActivity(counterId, 10),
    getRecentStatusEvents(counterId, 5),
    getNotificationsState(userId),
    getCurrentStatus(counterId),
    getUserBasicInfo(userId),
  ]);

  if (!counter) {
    throw new Error('Counter not found.');
  }

  return {
    counter: {
      id: counter.id,
      name: counter.name,
      number: counter.number,
      displayLabel: counter.displayLabel,
      isActive: counter.isActive,
    },
    currentServingTicket,
    queueDepth: {
      counterId,
      count: queueDepthCount,
      lastUpdatedAt: new Date(),
    },
    nextTicket,
    recentActivity,
    recentStatusEvents,
    notificationsState,
    officerContext: {
      counterOfficerId: officerRecord.id,
      currentStatus:
        currentStatus?.status ?? (officerRecord.currentStatus === 'OFFLINE' ? 'CLOSED' : 'OPENED'),
      isOnDuty: officerRecord.isOnDuty,
      notificationsEnabled: officerRecord.notificationsEnabled,
    },
    user: {
      id: user.id,
      name: user.name ?? 'Unknown',
      email: user.email,
    },
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function getCounterDetails(counterId: string) {
  return db.counter.findUnique({
    where: { id: counterId },
    select: { id: true, name: true, number: true, displayLabel: true, isActive: true },
  });
}

async function getQueueDepth(counterId: string): Promise<number> {
  return db.ticket.count({
    where: {
      status: 'WAITING',
      service: { counters: { some: { counterId } } },
    },
  });
}

async function getRecentActivity(counterId: string, limit: number): Promise<RecentActivityEntry[]> {
  const events = await db.ticketEvent.findMany({
    where: {
      counterId,
      eventType: { in: ['CALLED', 'RECALLED', 'NO_SHOW'] },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      ticket: { select: { ticketNumber: true } },
    },
  });

  return events.map((event) => ({
    id: event.id,
    type: event.eventType as RecentActivityEntry['type'],
    ticketId: event.ticketId,
    ticketNumber: event.ticket?.ticketNumber ?? null,
    counterId: event.counterId ?? counterId,
    counterName: '',
    officerName: 'Unknown',
    timestamp: event.createdAt,
  }));
}

async function getUserBasicInfo(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });
  if (!user) throw new Error('User not found.');
  return user;
}

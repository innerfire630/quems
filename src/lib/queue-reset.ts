// =============================================================================
// src/lib/queue-reset.ts — Core daily reset logic (2.3.3)
// =============================================================================
// The central business logic for the daily queue reset. Provides:
// - computeSnapshotStatistics — calculates all 8 stats per service per date
// - resetServiceForBusinessDate — resets one service atomically
// - runDailyReset — orchestrates the full reset across all services
//
// In-progress ticket preservation: tickets in CALLED, RECALLED, or SERVING
// state are NOT modified by the reset.
// =============================================================================

import 'server-only';
import { prisma as db } from '@/lib/db';
import { broadcastEvent } from '@/lib/events';
import { resetServiceCountersForDate } from '@/lib/analytics-service';
import type {
  ResetOptions,
  ResetResult,
  SnapshotStatistics,
  PerServiceResetResult,
} from '@/types/queue-reset.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolves the APP_TIMEZONE for hour-of-day calculations.
 * Reuses the same logic as ticket-service's resolveTimezone (duplicated to
 * avoid importing a non-exported function).
 */
function getAppTimezone(): string {
  const configured = process.env.APP_TIMEZONE?.trim();
  if (!configured) return Intl.DateTimeFormat().resolvedOptions().timeZone;
  try {
    new Intl.DateTimeFormat('en', { timeZone: configured }).format(new Date());
    return configured;
  } catch {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
}

/**
 * Extracts the hour (0-23) of a date in APP_TIMEZONE.
 */
function getHourInTimezone(date: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    hour: 'numeric',
    hour12: false,
  }).formatToParts(date);
  const hourPart = parts.find((p) => p.type === 'hour');
  return hourPart ? parseInt(hourPart.value, 10) : 0;
}

// ---------------------------------------------------------------------------
// computeSnapshotStatistics
// ---------------------------------------------------------------------------

export async function computeSnapshotStatistics(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  serviceId: string,
  businessDate: Date,
): Promise<SnapshotStatistics> {
  // Calculate the end of the business date (midnight next day)
  const nextDay = new Date(businessDate);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);

  const dateFilter = {
    serviceId,
    businessDate: {
      gte: businessDate,
      lt: nextDay,
    },
  };

  // Counts
  const [totalIssued, totalServed, totalNoShow, totalCancelled, totalWaiting] = await Promise.all([
    tx.ticket.count({ where: dateFilter }),
    tx.ticket.count({ where: { ...dateFilter, status: 'COMPLETED' } }),
    tx.ticket.count({ where: { ...dateFilter, status: 'NO_SHOW' } }),
    tx.ticket.count({ where: { ...dateFilter, status: 'CANCELLED' } }),
    tx.ticket.count({ where: { ...dateFilter, status: 'WAITING' } }),
  ]);

  // averageWaitMinutes — for tickets that were called
  let averageWaitMinutes: number | null = null;
  const calledTickets = await tx.ticket.findMany({
    where: {
      ...dateFilter,
      status: { in: ['CALLED', 'RECALLED', 'SERVING', 'COMPLETED', 'NO_SHOW'] },
      calledAt: { not: null },
    },
    select: { issuedAt: true, calledAt: true },
  });

  if (calledTickets.length > 0) {
    const totalWait = (calledTickets as { issuedAt: Date; calledAt: Date }[]).reduce(
      (sum: number, t) => {
        return sum + (t.calledAt.getTime() - t.issuedAt.getTime()) / 60000;
      },
      0,
    );
    averageWaitMinutes = Math.round((totalWait / calledTickets.length) * 100) / 100;
  }

  // averageServiceMinutes — for completed tickets (will be null in Phase 2)
  let averageServiceMinutes: number | null = null;
  const completedTickets = await tx.ticket.findMany({
    where: {
      ...dateFilter,
      status: 'COMPLETED',
      servedAt: { not: null },
      completedAt: { not: null },
    },
    select: { servedAt: true, completedAt: true },
  });

  if (completedTickets.length > 0) {
    const totalService = (completedTickets as { servedAt: Date; completedAt: Date }[]).reduce(
      (sum: number, t) => {
        return sum + (t.completedAt.getTime() - t.servedAt.getTime()) / 60000;
      },
      0,
    );
    averageServiceMinutes = Math.round((totalService / completedTickets.length) * 100) / 100;
  }

  // peakHour — hour with the most CALLED events
  let peakHour: number | null = null;
  const tz = getAppTimezone();
  const calledEvents = await tx.ticketEvent.findMany({
    where: {
      eventType: 'CALLED',
      ticket: { serviceId, businessDate: { gte: businessDate, lt: nextDay } },
    },
    select: { createdAt: true },
  });

  if (calledEvents.length > 0) {
    const hourCounts = new Map<number, number>();
    for (const event of calledEvents) {
      const hour = getHourInTimezone(event.createdAt, tz);
      hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
    }
    let maxCount = 0;
    for (const [hour, count] of hourCounts) {
      if (count > maxCount) {
        maxCount = count;
        peakHour = hour;
      }
    }
  }

  return {
    totalIssued,
    totalServed,
    totalNoShow,
    totalCancelled,
    totalWaiting,
    averageWaitMinutes,
    averageServiceMinutes,
    peakHour,
  };
}

// ---------------------------------------------------------------------------
// resetServiceForBusinessDate
// ---------------------------------------------------------------------------

export async function resetServiceForBusinessDate(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  serviceId: string,
  serviceName: string,
  businessDate: Date,
): Promise<PerServiceResetResult> {
  try {
    // 1. Compute statistics
    const stats = await computeSnapshotStatistics(tx, serviceId, businessDate);

    // 2. Upsert the snapshot (idempotent via composite unique)
    await tx.queueDailySnapshot.upsert({
      where: {
        businessDate_serviceId: {
          businessDate,
          serviceId,
        },
      },
      update: {
        totalIssued: stats.totalIssued,
        totalServed: stats.totalServed,
        totalNoShow: stats.totalNoShow,
        totalCancelled: stats.totalCancelled,
        totalWaiting: stats.totalWaiting,
        averageWaitMinutes: stats.averageWaitMinutes,
        averageServiceMinutes: stats.averageServiceMinutes,
        peakHour: stats.peakHour,
      },
      create: {
        businessDate,
        serviceId,
        totalIssued: stats.totalIssued,
        totalServed: stats.totalServed,
        totalNoShow: stats.totalNoShow,
        totalCancelled: stats.totalCancelled,
        totalWaiting: stats.totalWaiting,
        averageWaitMinutes: stats.averageWaitMinutes,
        averageServiceMinutes: stats.averageServiceMinutes,
        peakHour: stats.peakHour,
      },
    });

    // 3. Reset currentTicketNumber to 0
    await tx.service.update({
      where: { id: serviceId },
      data: { currentTicketNumber: 0 },
    });

    return {
      serviceId,
      serviceName,
      snapshotUpserted: true,
      counterReset: true,
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[queue-reset] Failed to reset service ${serviceName}:`, message);
    }
    return {
      serviceId,
      serviceName,
      snapshotUpserted: false,
      counterReset: false,
      error: message,
    };
  }
}

// ---------------------------------------------------------------------------
// runDailyReset — the orchestrator
// ---------------------------------------------------------------------------

export async function runDailyReset(options: ResetOptions): Promise<ResetResult> {
  const services = await db.service.findMany({
    select: { id: true, name: true },
  });

  const perServiceResults: PerServiceResetResult[] = [];

  for (const service of services) {
    // Each service gets its own transaction for atomicity
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await db.$transaction(async (tx: any) => {
        return resetServiceForBusinessDate(
          tx,
          service.id,
          service.name,
          options.previousBusinessDate,
        );
      });
      perServiceResults.push(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      perServiceResults.push({
        serviceId: service.id,
        serviceName: service.name,
        snapshotUpserted: false,
        counterReset: false,
        error: message,
      });
    }
  }

  const errors = perServiceResults
    .filter((r) => r.error !== null)
    .map((r) => ({ serviceId: r.serviceId, message: r.error! }));

  const resetResult: ResetResult = {
    previousBusinessDate: options.previousBusinessDate,
    resetAt: options.now,
    trigger: options.trigger,
    triggeredByUserId: options.triggeredByUserId,
    affectedServices: perServiceResults,
    totalSnapshotsUpserted: perServiceResults.filter((r) => r.snapshotUpserted).length,
    totalCountersReset: perServiceResults.filter((r) => r.counterReset).length,
    errors,
  };

  // Clear in-memory analytics counters for the new business date
  await resetServiceCountersForDate();

  // Broadcast SSE event AFTER all services are processed
  await broadcastEvent('global', 'DAILY_RESET', {
    resetAt: options.now.toISOString(),
    previousBusinessDate: options.previousBusinessDate.toISOString(),
    trigger: options.trigger,
    triggeredByUserId: options.triggeredByUserId,
    affectedServiceIds: perServiceResults.filter((r) => r.counterReset).map((r) => r.serviceId),
    totalSnapshotsUpserted: resetResult.totalSnapshotsUpserted,
    totalCountersReset: resetResult.totalCountersReset,
    errors,
  });

  if (process.env.NODE_ENV !== 'production') {
    console.info(
      `[queue-reset] Daily reset completed at ${options.now.toISOString()}: ` +
        `${resetResult.totalSnapshotsUpserted} snapshots upserted, ` +
        `${resetResult.totalCountersReset} counters reset, ` +
        `${errors.length} errors.`,
    );
  }

  return resetResult;
}

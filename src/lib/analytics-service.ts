// =============================================================================
// src/lib/analytics-service.ts — Queue analytics data collection (5.1.1)
// =============================================================================
// Centralised analytics calculation functions and in-memory counter map.
// Pure calculation functions for testability. Module-scope singleton Map
// that tracks per-service counters during the day, flushed to
// QueueDailySnapshot at daily reset.
//
// All db.* calls are READ-ONLY. No transactions, no writes.
// incrementServiceCounter is synchronous (in-memory only) and best-effort.
// =============================================================================

import 'server-only';
import { prisma as db } from '@/lib/db';
import type {
  ReportData,
  ReportKpiSummary,
  ServicePerformanceRow,
  CounterPerformanceRow,
  HourlyTicketCount,
  ServiceDailyCounters,
} from '@/types/report.types';

// ---------------------------------------------------------------------------
// Module-scope state — survives Next.js dev hot-reload via globalThis
// ---------------------------------------------------------------------------

declare global {
  var __serviceDailyCounters: Map<string, ServiceDailyCounters> | undefined;
}

const serviceDailyCounters: Map<string, ServiceDailyCounters> =
  globalThis.__serviceDailyCounters ?? (globalThis.__serviceDailyCounters = new Map());

// ---------------------------------------------------------------------------
// Module-scope constants
// ---------------------------------------------------------------------------

const BUSIEST_HOUR_THRESHOLD = 5;
const HOURS_IN_DAY = 24;
const MS_PER_MINUTE = 60_000;

// ---------------------------------------------------------------------------
// Timezone helpers
// ---------------------------------------------------------------------------

function resolveTimezone(): string {
  const configured = process.env.APP_TIMEZONE?.trim();
  if (!configured) return Intl.DateTimeFormat().resolvedOptions().timeZone;

  try {
    new Intl.DateTimeFormat('en', { timeZone: configured }).format(new Date());
    return configured;
  } catch {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
}

function getHourInTimezone(date: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    hour: 'numeric',
    hour12: false,
  }).formatToParts(date);
  const hourPart = parts.find((p) => p.type === 'hour');
  return hourPart ? parseInt(hourPart.value, 10) : 0;
}

/** Formats a Date as YYYY-MM-DD in APP_TIMEZONE. */
function formatDate(date: Date): string {
  const tz = resolveTimezone();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const y = parts.find((p) => p.type === 'year')?.value ?? '';
  const m = parts.find((p) => p.type === 'month')?.value ?? '';
  const d = parts.find((p) => p.type === 'day')?.value ?? '';
  return `${y}-${m}-${d}`;
}

/** Computes the arithmetic mean of a non-empty number array. Returns null if empty. */
function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / values.length) * 100) / 100;
}

// ---------------------------------------------------------------------------
// In-memory counter helpers
// ---------------------------------------------------------------------------

/**
 * Returns fresh zero-initialised counters for a service.
 */
function createEmptyCounters(): ServiceDailyCounters {
  const hourlyIssued: Record<number, number> = {};
  for (let h = 0; h < HOURS_IN_DAY; h++) {
    hourlyIssued[h] = 0;
  }
  return {
    totalIssued: 0,
    totalServed: 0,
    totalNoShow: 0,
    totalCancelled: 0,
    waitTimes: [],
    serviceTimes: [],
    hourlyIssued,
  };
}

/**
 * Gets or creates the in-memory counters for a service.
 */
function getOrCreateServiceCounters(serviceId: string): ServiceDailyCounters {
  let counters = serviceDailyCounters.get(serviceId);
  if (!counters) {
    counters = createEmptyCounters();
    serviceDailyCounters.set(serviceId, counters);
  }
  return counters;
}

// ---------------------------------------------------------------------------
// Public: Increment / Reset (for ticket handlers & daily reset)
// ---------------------------------------------------------------------------

/**
 * Increments the in-memory running counters for a ticket lifecycle event.
 * Best-effort — never throws. Call AFTER the database transaction commits.
 */
export function incrementServiceCounter(
  serviceId: string,
  eventType: 'ISSUED' | 'CALLED' | 'NO_SHOW',
): void {
  try {
    const tz = resolveTimezone();
    const counters = getOrCreateServiceCounters(serviceId);

    switch (eventType) {
      case 'ISSUED': {
        counters.totalIssued += 1;
        const hour = getHourInTimezone(new Date(), tz);
        counters.hourlyIssued[hour] = (counters.hourlyIssued[hour] ?? 0) + 1;
        break;
      }
      case 'CALLED': {
        // The caller should pass wait time minutes if available; for now
        // we only record the count. The authoritative wait time is computed
        // at daily reset from the database, not from the in-memory map.
        break;
      }
      case 'NO_SHOW': {
        counters.totalNoShow += 1;
        break;
      }
    }
  } catch (error) {
    // Best-effort: log but never propagate
    console.error(
      `[analytics-service] Failed to increment counter for service ${serviceId}, event ${eventType}:`,
      error instanceof Error ? error.message : error,
    );
  }
}

/**
 * Returns the current in-memory counters for a service.
 */
export function getCurrentServiceCounters(serviceId: string): ServiceDailyCounters {
  return getOrCreateServiceCounters(serviceId);
}

/**
 * Clears and re-initialises the in-memory counter map for all active services.
 * Called by the daily reset after the snapshots are persisted.
 */
export async function resetServiceCountersForDate(): Promise<void> {
  try {
    serviceDailyCounters.clear();

    // Pre-populate entries for all active services so incrementServiceCounter
    // never has to create entries mid-flight.
    const services = await db.service.findMany({
      select: { id: true },
    });

    for (const service of services) {
      serviceDailyCounters.set(service.id, createEmptyCounters());
    }
  } catch (error) {
    console.error(
      '[analytics-service] Failed to reset counters:',
      error instanceof Error ? error.message : error,
    );
  }
}

// ---------------------------------------------------------------------------
// Public: Peak hour calculation (pure)
// ---------------------------------------------------------------------------

/**
 * Finds the hour (0-23) with the most called events.
 * Returns null when fewer than BUSIEST_HOUR_THRESHOLD calls occurred.
 */
export function calculatePeakHour(calledEventTimes: Date[]): number | null {
  if (calledEventTimes.length < BUSIEST_HOUR_THRESHOLD) return null;

  const tz = resolveTimezone();
  const hourCounts = new Map<number, number>();

  for (const eventTime of calledEventTimes) {
    const hour = getHourInTimezone(eventTime, tz);
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
  }

  let peakHour: number | null = null;
  let maxCount = 0;

  for (const [hour, count] of hourCounts) {
    if (count > maxCount) {
      maxCount = count;
      peakHour = hour;
    }
  }

  return peakHour;
}

// ---------------------------------------------------------------------------
// Public: Per-service daily metrics
// ---------------------------------------------------------------------------

/**
 * Calculates all 8 metrics for a single service on a single business date.
 */
async function calculateServiceDailyMetrics(
  serviceId: string,
  businessDate: Date,
): Promise<{
  totalIssued: number;
  totalServed: number;
  totalNoShow: number;
  totalCancelled: number;
  totalWaiting: number;
  averageWaitMinutes: number | null;
  averageServiceMinutes: number | null;
  peakHour: number | null;
}> {
  const nextDay = new Date(businessDate);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);

  const dateFilter = {
    serviceId,
    businessDate: { gte: businessDate, lt: nextDay },
  };

  const [totalIssued, totalServed, totalNoShow, totalCancelled, totalWaiting, calledTickets] =
    await Promise.all([
      db.ticket.count({ where: dateFilter }),
      db.ticket.count({ where: { ...dateFilter, status: 'COMPLETED' } }),
      db.ticket.count({ where: { ...dateFilter, status: 'NO_SHOW' } }),
      db.ticket.count({ where: { ...dateFilter, status: 'CANCELLED' } }),
      db.ticket.count({ where: { ...dateFilter, status: 'WAITING' } }),
      db.ticket.findMany({
        where: {
          ...dateFilter,
          calledAt: { not: null },
        },
        select: { issuedAt: true, calledAt: true },
      }),
    ]);

  // Average wait time
  let averageWaitMinutes: number | null = null;
  if (calledTickets.length > 0) {
    const waitTimes = calledTickets.map(
      (t) => (t.calledAt!.getTime() - t.issuedAt.getTime()) / MS_PER_MINUTE,
    );
    averageWaitMinutes = mean(waitTimes);
  }

  // Average service time (will be null until COMPLETED transition is implemented)
  let averageServiceMinutes: number | null = null;
  const completedTickets = await db.ticket.findMany({
    where: {
      ...dateFilter,
      status: 'COMPLETED',
      servedAt: { not: null },
      completedAt: { not: null },
    },
    select: { servedAt: true, completedAt: true },
  });

  if (completedTickets.length > 0) {
    const serviceTimes = completedTickets.map(
      (t) => (t.completedAt!.getTime() - t.servedAt!.getTime()) / MS_PER_MINUTE,
    );
    averageServiceMinutes = mean(serviceTimes);
  }

  // Peak hour
  const calledEvents = await db.ticketEvent.findMany({
    where: {
      eventType: 'CALLED',
      ticket: { serviceId, businessDate: { gte: businessDate, lt: nextDay } },
    },
    select: { createdAt: true },
  });
  const peakHour = calculatePeakHour(calledEvents.map((e) => e.createdAt));

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
// Public: Per-service performance rows (aggregated or per-day)
// ---------------------------------------------------------------------------

/**
 * Returns one row per service for the date range, aggregated across days.
 * When byDay is true, returns one row per service per day (used by CSV export).
 */
export async function calculateServicePerformanceRows(
  startDate: Date,
  endDate: Date,
  serviceIds?: string[],
  byDay = false,
): Promise<ServicePerformanceRow[]> {
  // Resolve services
  const services = await db.service.findMany({
    where: serviceIds ? { id: { in: serviceIds } } : {},
    select: { id: true, code: true, name: true },
    orderBy: { code: 'asc' },
  });

  const rows: ServicePerformanceRow[] = [];

  if (byDay) {
    // Per-service-per-day — iterate each day in range
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      for (const service of services) {
        const metrics = await calculateServiceDailyMetrics(service.id, cursor);
        const total = metrics.totalIssued;
        const noShowRate = total > 0 ? metrics.totalNoShow / total : 0;

        rows.push({
          serviceId: service.id,
          serviceCode: service.code,
          serviceName: service.name,
          date: formatDate(cursor),
          totalIssued: metrics.totalIssued,
          totalServed: metrics.totalServed,
          totalNoShow: metrics.totalNoShow,
          noShowRate,
          averageWaitMinutes: metrics.averageWaitMinutes,
          averageServiceMinutes: metrics.averageServiceMinutes,
          peakHour: metrics.peakHour,
        });
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  } else {
    // Aggregated across the date range
    for (const service of services) {
      let totalIssued = 0;
      let totalServed = 0;
      let totalNoShow = 0;
      const allWaitTimes: number[] = [];
      const allServiceTimes: number[] = [];

      const cursor = new Date(startDate);
      while (cursor <= endDate) {
        const metrics = await calculateServiceDailyMetrics(service.id, cursor);
        totalIssued += metrics.totalIssued;
        totalServed += metrics.totalServed;
        totalNoShow += metrics.totalNoShow;

        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }

      // For aggregated averages we need to re-query across the full range
      const rangeFilter = {
        serviceId: service.id,
        businessDate: { gte: startDate, lte: endDate },
      };

      const calledInRange = await db.ticket.findMany({
        where: { ...rangeFilter, calledAt: { not: null } },
        select: { issuedAt: true, calledAt: true },
      });
      for (const t of calledInRange) {
        allWaitTimes.push((t.calledAt!.getTime() - t.issuedAt.getTime()) / MS_PER_MINUTE);
      }

      const completedInRange = await db.ticket.findMany({
        where: {
          ...rangeFilter,
          status: 'COMPLETED',
          servedAt: { not: null },
          completedAt: { not: null },
        },
        select: { servedAt: true, completedAt: true },
      });
      for (const t of completedInRange) {
        allServiceTimes.push((t.completedAt!.getTime() - t.servedAt!.getTime()) / MS_PER_MINUTE);
      }

      const calledEventsInRange = await db.ticketEvent.findMany({
        where: {
          eventType: 'CALLED',
          ticket: { serviceId: service.id, businessDate: { gte: startDate, lte: endDate } },
        },
        select: { createdAt: true },
      });

      const noShowRate = totalIssued > 0 ? totalNoShow / totalIssued : 0;

      rows.push({
        serviceId: service.id,
        serviceCode: service.code,
        serviceName: service.name,
        totalIssued,
        totalServed,
        totalNoShow,
        noShowRate,
        averageWaitMinutes: mean(allWaitTimes),
        averageServiceMinutes: mean(allServiceTimes),
        peakHour: calculatePeakHour(calledEventsInRange.map((e) => e.createdAt)),
      });
    }
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Public: Per-counter performance rows
// ---------------------------------------------------------------------------

export async function calculateCounterPerformanceRows(
  startDate: Date,
  endDate: Date,
  counterIds?: string[],
): Promise<CounterPerformanceRow[]> {
  const counters = await db.counter.findMany({
    where: counterIds ? { id: { in: counterIds } } : {},
    select: { id: true, name: true, number: true },
    orderBy: { number: 'asc' },
  });

  const rows: CounterPerformanceRow[] = [];

  for (const counter of counters) {
    const [totalServed, totalNoShow, completedTickets, closureEvents] = await Promise.all([
      db.ticketEvent.count({
        where: {
          eventType: 'CALLED',
          ticket: { counterId: counter.id },
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      db.ticket.count({
        where: {
          counterId: counter.id,
          status: 'NO_SHOW',
          businessDate: { gte: startDate, lte: endDate },
        },
      }),
      db.ticket.findMany({
        where: {
          counterId: counter.id,
          completedAt: { not: null },
          servedAt: { not: null },
          businessDate: { gte: startDate, lte: endDate },
        },
        select: { servedAt: true, completedAt: true },
      }),
      db.counterStatusEvent.count({
        where: {
          counterId: counter.id,
          status: 'CLOSED_TEMPORARY',
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    let averageServiceMinutes: number | null = null;
    if (completedTickets.length > 0) {
      const times = completedTickets.map(
        (t) => (t.completedAt!.getTime() - t.servedAt!.getTime()) / MS_PER_MINUTE,
      );
      averageServiceMinutes = mean(times);
    }

    rows.push({
      counterId: counter.id,
      counterName: counter.name,
      counterNumber: counter.number,
      totalServed,
      totalNoShow,
      averageServiceMinutes,
      closureEvents,
    });
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Public: Tickets-by-hour chart data
// ---------------------------------------------------------------------------

export async function calculateTicketsByHour(
  startDate: Date,
  endDate: Date,
  serviceId?: string,
): Promise<HourlyTicketCount[]> {
  const tickets = await db.ticket.findMany({
    where: {
      businessDate: { gte: startDate, lte: endDate },
      ...(serviceId ? { serviceId } : {}),
    },
    select: { issuedAt: true },
  });

  const tz = resolveTimezone();
  const buckets: Record<number, number> = {};
  for (let h = 0; h < HOURS_IN_DAY; h++) {
    buckets[h] = 0;
  }

  for (const ticket of tickets) {
    const hour = getHourInTimezone(ticket.issuedAt, tz);
    buckets[hour] = (buckets[hour] ?? 0) + 1;
  }

  return Array.from({ length: HOURS_IN_DAY }, (_, hour) => ({
    hour,
    count: buckets[hour] ?? 0,
  }));
}

// ---------------------------------------------------------------------------
// Public: KPI summary
// ---------------------------------------------------------------------------

export async function calculateReportKpiSummary(
  startDate: Date,
  endDate: Date,
  serviceId?: string,
  _counterId?: string,
): Promise<ReportKpiSummary> {
  const serviceFilter = serviceId ? { serviceId } : {};

  const [totalTickets, noShowCount, calledTickets, calledEvents] = await Promise.all([
    db.ticket.count({
      where: { businessDate: { gte: startDate, lte: endDate }, ...serviceFilter },
    }),
    db.ticket.count({
      where: {
        businessDate: { gte: startDate, lte: endDate },
        status: 'NO_SHOW',
        ...serviceFilter,
      },
    }),
    db.ticket.findMany({
      where: {
        businessDate: { gte: startDate, lte: endDate },
        calledAt: { not: null },
        ...serviceFilter,
      },
      select: { issuedAt: true, calledAt: true },
    }),
    db.ticketEvent.findMany({
      where: {
        eventType: 'CALLED',
        ...(serviceId ? { ticket: { serviceId } } : {}),
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { createdAt: true },
    }),
  ]);

  let averageWaitMinutes: number | null = null;
  if (calledTickets.length > 0) {
    const times = calledTickets.map(
      (t) => (t.calledAt!.getTime() - t.issuedAt.getTime()) / MS_PER_MINUTE,
    );
    averageWaitMinutes = mean(times);
  }

  const noShowRate = totalTickets > 0 ? noShowCount / totalTickets : 0;
  const busiestHour = calculatePeakHour(calledEvents.map((e) => e.createdAt));

  return { totalTickets, averageWaitMinutes, noShowRate, busiestHour };
}

// ---------------------------------------------------------------------------
// Public: Main entry point for GET /api/reports
// ---------------------------------------------------------------------------

export async function getReportData(
  startDate: Date,
  endDate: Date,
  serviceId?: string,
  counterId?: string,
  options?: { byDay?: boolean },
): Promise<ReportData> {
  const byDay = options?.byDay ?? false;

  const serviceIds = serviceId ? [serviceId] : undefined;
  const counterIds = counterId ? [counterId] : undefined;

  const [kpi, services, counters, hourly] = await Promise.all([
    calculateReportKpiSummary(startDate, endDate, serviceId, counterId),
    calculateServicePerformanceRows(startDate, endDate, serviceIds, byDay),
    calculateCounterPerformanceRows(startDate, endDate, counterIds),
    calculateTicketsByHour(startDate, endDate, serviceId),
  ]);

  return {
    kpi,
    services,
    counters,
    hourly,
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    serviceId: serviceId ?? null,
    counterId: counterId ?? null,
    generatedAt: new Date().toISOString(),
  };
}

// =============================================================================
// src/lib/ticket-service.ts — Ticket issuance business logic (2.2.1)
// =============================================================================
// Pure functions + one orchestrating function that wraps the Prisma $transaction.
// The issueTicket() function atomically creates a Ticket, increments the
// service's currentTicketNumber, creates a TicketEvent audit row, and
// broadcasts a TICKET_ISSUED SSE event after the transaction commits.
// =============================================================================

import { randomUUID } from 'node:crypto';
import { prisma as db } from '@/lib/db';
import { broadcastEvent } from '@/lib/events';
import { transitionTicket } from '@/lib/ticket-state-machine';
import type {
  IssueTicketInput,
  IssuedTicketResponse,
  TicketDetail,
  TicketCallInput,
  TicketCallResponse,
  TicketRecallInput,
  TicketRecallResponse,
  TicketNoShowInput,
  TicketNoShowResponse,
} from '@/types/ticket.types';
import type { ResolvedOfficer } from '@/lib/ticket-officer';

// ---------------------------------------------------------------------------
// formatTicketNumber — pure function
// ---------------------------------------------------------------------------

/**
 * Formats a ticket number from a service prefix and a numeric sequence.
 *
 * Padding rules:
 * - sequence 1-999       → 3 digits (A001)
 * - sequence 1000-9999   → 4 digits (A1000)
 * - sequence 10000-99999 → 5 digits (A10000)
 * - sequence > 99999     → throws (overflow)
 */
export function formatTicketNumber(prefix: string, sequence: number): string {
  if (sequence > 99999) {
    throw new Error('Ticket number overflow — manual intervention required');
  }
  const width = Math.max(3, Math.min(5, Math.floor(Math.log10(sequence)) + 1));
  return `${prefix}${String(sequence).padStart(width, '0')}`;
}

// ---------------------------------------------------------------------------
// calculateEstimatedWaitMinutes — pure function
// ---------------------------------------------------------------------------

/**
 * Returns estimated wait in minutes.
 * Returns null when averageServiceTime is null (caller must resolve fallback).
 */
export function calculateEstimatedWaitMinutes(
  waitPosition: number,
  averageServiceTime: number | null,
): number | null {
  if (waitPosition <= 0) return 0;
  if (averageServiceTime === null) return null;
  return Math.ceil(waitPosition * averageServiceTime);
}

// ---------------------------------------------------------------------------
// resolveAndCalculateEstimatedWaitMinutes
// ---------------------------------------------------------------------------

/**
 * Resolves the estimated wait: uses service's averageServiceTime if set,
 * otherwise resolves the system default fallback.
 */
export function resolveAndCalculateEstimatedWaitMinutes(
  waitPosition: number,
  averageServiceTime: number | null,
  fallbackMinutes: number,
): number {
  const direct = calculateEstimatedWaitMinutes(waitPosition, averageServiceTime);
  if (direct !== null) return direct;
  return Math.ceil(waitPosition * fallbackMinutes);
}

// ---------------------------------------------------------------------------
// getCurrentBusinessDate
// ---------------------------------------------------------------------------

/**
 * Returns midnight (00:00:00.000) of today in the configured APP_TIMEZONE.
 * Falls back to server's local timezone when APP_TIMEZONE is absent or invalid.
 */
export function getCurrentBusinessDate(now: Date = new Date()): Date {
  const tz = resolveTimezone();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const y = +parts.find((p) => p.type === 'year')!.value;
  const m = +parts.find((p) => p.type === 'month')!.value;
  const d = +parts.find((p) => p.type === 'day')!.value;

  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

function resolveTimezone(): string {
  const configured = process.env.APP_TIMEZONE?.trim();
  if (!configured) return Intl.DateTimeFormat().resolvedOptions().timeZone;

  try {
    // Test that Intl can handle this timezone
    new Intl.DateTimeFormat('en', { timeZone: configured }).format(new Date());
    return configured;
  } catch {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `[ticket-service] Invalid APP_TIMEZONE "${configured}" — falling back to server locale.`,
      );
    }
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
}

// ---------------------------------------------------------------------------
// calculateWaitPosition (inside transaction)
// ---------------------------------------------------------------------------

export async function calculateWaitPosition(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  serviceId: string,
  businessDate: Date,
): Promise<number> {
  const count = await tx.ticket.count({
    where: {
      serviceId,
      businessDate,
      status: 'WAITING',
    },
  });
  return count + 1;
}

// ---------------------------------------------------------------------------
// getFallbackAverageServiceTime
// ---------------------------------------------------------------------------

async function getFallbackAverageServiceTime(): Promise<number> {
  const setting = await db.systemSetting.findUnique({
    where: { key: 'queue.default_average_service_time_minutes' },
  });
  if (setting && setting.value) {
    const parsed = Number(setting.value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return 5; // hard-coded fallback
}

// ---------------------------------------------------------------------------
// mapTicketToDetail — maps a Prisma ticket result to TicketDetail
// ---------------------------------------------------------------------------

export function mapTicketToDetail(ticket: Record<string, unknown>): TicketDetail {
  const t = ticket as Record<string, unknown>;
  const service = (t.service as Record<string, unknown>) ?? {};
  const counter = (t.counter as Record<string, unknown>) ?? null;
  const calledByOfficer = (t.calledByOfficer as Record<string, unknown>) ?? null;
  const calledByUser = calledByOfficer
    ? ((calledByOfficer as Record<string, unknown>).user as Record<string, unknown>)
    : null;

  const events = Array.isArray(t.events)
    ? (t.events as Array<Record<string, unknown>>).map((e) => ({
        id: e.id as string,
        eventType: e.eventType as string,
        counterId: (e.counterId as string) ?? null,
        counterName: null,
        officerId: (e.officerId as string) ?? null,
        officerName: null,
        metadata: (e.metadata as Record<string, unknown>) ?? null,
        createdAt: (e.createdAt as Date).toISOString(),
      }))
    : [];

  return {
    id: t.id as string,
    ticketNumber: t.ticketNumber as string,
    displayNumber: t.displayNumber as number,
    serviceId: t.serviceId as string,
    serviceName: service.name as string,
    counterId: (t.counterId as string) ?? null,
    counterName: counter ? (counter.name as string) : null,
    status: t.status as string,
    priority: t.priority as number,
    waitPosition: t.waitPosition as number,
    estimatedWaitMinutes: (t.estimatedWaitMinutes as number) ?? null,
    issuedAt: (t.issuedAt as Date).toISOString(),
    businessDate: (t.businessDate as Date).toISOString(),
    customerPhone: (t.customerPhone as string) ?? null,
    events,
    calledByOfficer: calledByUser
      ? {
          id: (calledByOfficer as Record<string, unknown>).id as string,
          name: calledByUser.name as string,
        }
      : null,
  };
}

// ---------------------------------------------------------------------------
// issueTicket — the orchestrator
// ---------------------------------------------------------------------------

/**
 * Issues a new ticket atomically:
 * 1. Validates the service (exists & active)
 * 2. Computes business date
 * 3. Atomically increments currentTicketNumber
 * 4. Calculates wait position
 * 5. Resolves estimated wait
 * 6. Formats ticket number
 * 7. Creates Ticket + TicketEvent in a single transaction
 * 8. Broadcasts TICKET_ISSUED SSE event after commit
 *
 * The function throws on any business rule violation:
 * - NOT_FOUND: service does not exist
 * - VALIDATION_ERROR: service inactive, ticket number overflow
 */
export async function issueTicket(input: IssueTicketInput): Promise<IssuedTicketResponse> {
  // Fetch service outside the transaction to validate early & get the prefix
  const service = await db.service.findUnique({
    where: { id: input.serviceId },
  });

  if (!service) {
    throw Object.assign(new Error('Service not found.'), { code: 'NOT_FOUND' });
  }

  if (!service.isActive) {
    throw Object.assign(new Error('Service is not active.'), {
      code: 'VALIDATION_ERROR',
    });
  }

  const businessDate = getCurrentBusinessDate();
  const fallbackMinutes = await getFallbackAverageServiceTime();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await db.$transaction(async (tx: any) => {
    // Atomic increment — returns the updated service with new currentTicketNumber
    const updatedService = await tx.service.update({
      where: { id: service.id },
      data: { currentTicketNumber: { increment: 1 } },
    });
    const displayNumber = updatedService.currentTicketNumber;

    // Calculate wait position
    const waitPosition = await calculateWaitPosition(tx, service.id, businessDate);

    // Resolve estimated wait
    const estimatedWaitMinutes = resolveAndCalculateEstimatedWaitMinutes(
      waitPosition,
      service.averageServiceTime,
      fallbackMinutes,
    );

    // Format ticket number
    const ticketNumber = formatTicketNumber(service.ticketPrefix, displayNumber);

    // Create the ticket
    const ticket = await tx.ticket.create({
      data: {
        ticketNumber,
        displayNumber,
        serviceId: service.id,
        status: 'WAITING',
        priority: input.priority ?? 0,
        waitPosition,
        estimatedWaitMinutes,
        businessDate,
        customerPhone: input.customerPhone ?? null,
        issuedAt: new Date(),
      },
    });

    // Create the TicketEvent
    await tx.ticketEvent.create({
      data: {
        ticketId: ticket.id,
        eventType: 'ISSUED',
        counterId: null,
        officerId: null,
        metadata: {
          businessDate: businessDate.toISOString(),
          waitPosition,
          estimatedWaitMinutes,
          displayNumber,
          ticketPrefix: service.ticketPrefix,
        },
      },
    });

    // Re-fetch with relations for the response
    const fullTicket = await tx.ticket.findUniqueOrThrow({
      where: { id: ticket.id },
      include: {
        service: true,
        counter: true,
        calledByOfficer: { include: { user: true } },
        events: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return [fullTicket, displayNumber, waitPosition, estimatedWaitMinutes];
  });

  const [fullTicket, displayNumber, waitPosition, estimatedWaitMinutes] = result;

  // Broadcast SSE event AFTER transaction commits
  const sseEventId = randomUUID();
  await broadcastEvent('global', 'TICKET_ISSUED', {
    ticketId: fullTicket.id,
    ticketNumber: fullTicket.ticketNumber,
    displayNumber,
    serviceId: service.id,
    serviceName: service.name,
    serviceCode: service.code,
    priority: fullTicket.priority,
    waitPosition,
    estimatedWaitMinutes,
    businessDate: businessDate.toISOString(),
    issuedAt: fullTicket.issuedAt.toISOString(),
  });

  return {
    ...mapTicketToDetail(fullTicket as unknown as Record<string, unknown>),
    sseEventId,
  };
}

// =============================================================================
// callTicket — 2.3.1
// =============================================================================

/**
 * Calls a ticket to the officer's counter. Wraps the status update +
 * TicketEvent creation in a single Prisma $transaction.
 *
 * Validation (performed by the route handler before calling this):
 * - Officer must be on duty at the counter (resolved via resolveCallingOfficer)
 * - Counter must be active
 * - Ticket's service must be assigned to the counter
 * - Ticket must be in a state that allows CALL (enforced by the state machine)
 */
export async function callTicket(
  input: TicketCallInput,
  officer: ResolvedOfficer,
): Promise<TicketCallResponse> {
  const now = new Date();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await db.$transaction(async (tx: any) => {
    // 1. Fetch the ticket with service
    const ticket = await tx.ticket.findUnique({
      where: { id: input.ticketId },
      include: { service: true },
    });

    if (!ticket) {
      throw Object.assign(new Error('Ticket not found.'), { code: 'NOT_FOUND' });
    }

    // 2. Verify ticket's service is assigned to the counter
    const counterService = await tx.counterService.findUnique({
      where: {
        counterId_serviceId: {
          counterId: officer.counterId,
          serviceId: ticket.serviceId,
        },
      },
    });

    if (!counterService) {
      throw Object.assign(
        new Error(
          "This counter does not handle the ticket's service. Reassign or pick a different ticket.",
        ),
        { code: 'SERVICE_NOT_ASSIGNED_TO_COUNTER' },
      );
    }

    // 3. Verify counter is active
    const counter = await tx.counter.findUnique({ where: { id: officer.counterId } });
    if (!counter || !counter.isActive) {
      throw Object.assign(new Error('Counter is not active.'), {
        code: 'COUNTER_INACTIVE',
      });
    }

    // 4. Compute new status via the state machine
    const previousStatus = ticket.status;
    transitionTicket(ticket.status, 'CALL');

    // 5. Update the ticket
    await tx.ticket.update({
      where: { id: input.ticketId },
      data: {
        status: 'CALLED',
        calledAt: now,
        counterId: officer.counterId,
        calledByOfficerId: officer.id,
      },
    });

    // 6. Create the TicketEvent
    await tx.ticketEvent.create({
      data: {
        ticketId: input.ticketId,
        eventType: 'CALLED',
        counterId: officer.counterId,
        officerId: officer.id,
        metadata: {
          previousStatus,
          calledAt: now.toISOString(),
        },
      },
    });

    // 7. Re-fetch with relations for the response
    const fullTicket = await tx.ticket.findUniqueOrThrow({
      where: { id: input.ticketId },
      include: {
        service: true,
        counter: true,
        calledByOfficer: { include: { user: true } },
        events: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return { fullTicket, previousStatus, counter: fullTicket.counter };
  });

  // Broadcast SSE event AFTER transaction commits
  const sseEventId = randomUUID();
  const detail = mapTicketToDetail(result.fullTicket as unknown as Record<string, unknown>);

  await broadcastEvent('global', 'TICKET_CALLED', {
    ticketId: result.fullTicket.id,
    ticketNumber: result.fullTicket.ticketNumber,
    serviceId: result.fullTicket.serviceId,
    serviceName: result.fullTicket.service.name,
    counterId: officer.counterId,
    counterName: result.counter?.name ?? '',
    counterNumber: result.counter?.number ?? 0,
    calledByOfficerId: officer.id,
    calledByOfficerName: officer.userName,
    calledAt: now.toISOString(),
    previousStatus: result.previousStatus,
  });

  return {
    ...detail,
    sseEventId,
    previousStatus: result.previousStatus,
  };
}

// =============================================================================
// recallTicket — 2.3.1
// =============================================================================

/**
 * Recalls a previously called ticket. Increments an internal recallCount
 * derived from the count of existing RECALLED TicketEvent rows (approach b).
 */
export async function recallTicket(
  input: TicketRecallInput,
  officer: ResolvedOfficer,
): Promise<TicketRecallResponse> {
  const now = new Date();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await db.$transaction(async (tx: any) => {
    // 1. Fetch the ticket with service
    const ticket = await tx.ticket.findUnique({
      where: { id: input.ticketId },
      include: { service: true },
    });

    if (!ticket) {
      throw Object.assign(new Error('Ticket not found.'), { code: 'NOT_FOUND' });
    }

    // 2. Verify ticket's service is assigned to the counter
    const counterService = await tx.counterService.findUnique({
      where: {
        counterId_serviceId: {
          counterId: officer.counterId,
          serviceId: ticket.serviceId,
        },
      },
    });

    if (!counterService) {
      throw Object.assign(
        new Error(
          "This counter does not handle the ticket's service. Reassign or pick a different ticket.",
        ),
        { code: 'SERVICE_NOT_ASSIGNED_TO_COUNTER' },
      );
    }

    // 3. Verify counter is active
    const counter = await tx.counter.findUnique({ where: { id: officer.counterId } });
    if (!counter || !counter.isActive) {
      throw Object.assign(new Error('Counter is not active.'), {
        code: 'COUNTER_INACTIVE',
      });
    }

    // 4. Compute new status via the state machine
    const previousStatus = ticket.status;
    transitionTicket(ticket.status, 'RECALL');

    // 5. Count existing recall events to derive the new recallCount
    const existingRecalls = await tx.ticketEvent.count({
      where: { ticketId: input.ticketId, eventType: 'RECALLED' },
    });
    const recallCount = existingRecalls + 1;

    // 6. Update the ticket
    await tx.ticket.update({
      where: { id: input.ticketId },
      data: {
        status: 'RECALLED',
        recalledAt: now,
      },
    });

    // 7. Create the TicketEvent
    await tx.ticketEvent.create({
      data: {
        ticketId: input.ticketId,
        eventType: 'RECALLED',
        counterId: officer.counterId,
        officerId: officer.id,
        metadata: {
          previousStatus,
          recalledAt: now.toISOString(),
          recallCount,
        },
      },
    });

    // 8. Re-fetch with relations for the response
    const fullTicket = await tx.ticket.findUniqueOrThrow({
      where: { id: input.ticketId },
      include: {
        service: true,
        counter: true,
        calledByOfficer: { include: { user: true } },
        events: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return { fullTicket, previousStatus, recallCount, counter: fullTicket.counter };
  });

  // Broadcast SSE event AFTER transaction commits
  const sseEventId = randomUUID();
  const detail = mapTicketToDetail(result.fullTicket as unknown as Record<string, unknown>);

  await broadcastEvent('global', 'TICKET_RECALLED', {
    ticketId: result.fullTicket.id,
    ticketNumber: result.fullTicket.ticketNumber,
    serviceId: result.fullTicket.serviceId,
    serviceName: result.fullTicket.service.name,
    counterId: officer.counterId,
    counterName: result.counter?.name ?? '',
    counterNumber: result.counter?.number ?? 0,
    calledByOfficerId: officer.id,
    calledByOfficerName: officer.userName,
    calledAt: result.fullTicket.calledAt?.toISOString() ?? '',
    previousStatus: result.previousStatus,
    recalledAt: now.toISOString(),
    recallCount: result.recallCount,
  });

  return {
    ...detail,
    sseEventId,
    previousStatus: result.previousStatus,
    recallCount: result.recallCount,
  };
}

// =============================================================================
// noShowTicket — 2.3.2
// =============================================================================

/**
 * Marks a called/recalled ticket as no-show. The grace period check is
 * performed inside the transaction to prevent TOCTOU races. Auto-advance
 * is handled by the route handler AFTER this function returns.
 */
export async function noShowTicket(
  input: TicketNoShowInput,
  officer: ResolvedOfficer,
  gracePeriodSeconds: number,
): Promise<TicketNoShowResponse> {
  const now = new Date();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await db.$transaction(async (tx: any) => {
    // 1. Fetch the ticket with service
    const ticket = await tx.ticket.findUnique({
      where: { id: input.ticketId },
      include: { service: true },
    });

    if (!ticket) {
      throw Object.assign(new Error('Ticket not found.'), { code: 'NOT_FOUND' });
    }

    // 2. Verify ticket's service is assigned to the counter
    const counterService = await tx.counterService.findUnique({
      where: {
        counterId_serviceId: {
          counterId: officer.counterId,
          serviceId: ticket.serviceId,
        },
      },
    });

    if (!counterService) {
      throw Object.assign(new Error("This counter does not handle the ticket's service."), {
        code: 'SERVICE_NOT_ASSIGNED_TO_COUNTER',
      });
    }

    // 3. Compute new status via the state machine
    const previousStatus = ticket.status;
    transitionTicket(ticket.status, 'NO_SHOW');

    // 4. Verify grace period (inside transaction for TOCTOU safety)
    const calledAt = ticket.calledAt;
    if (!calledAt) {
      throw Object.assign(new Error('Ticket has no calledAt timestamp — cannot mark as no-show.'), {
        code: 'VALIDATION_ERROR',
      });
    }
    const elapsedSeconds = Math.floor((now.getTime() - calledAt.getTime()) / 1000);
    if (elapsedSeconds < gracePeriodSeconds) {
      const remaining = gracePeriodSeconds - elapsedSeconds;
      throw Object.assign(
        new Error(
          `Ticket was just called — please wait ${remaining} more seconds before marking no-show.`,
        ),
        {
          code: 'GRACE_PERIOD_NOT_ELAPSED',
          elapsedSeconds,
          requiredSeconds: gracePeriodSeconds,
        },
      );
    }

    // 5. Update the ticket
    await tx.ticket.update({
      where: { id: input.ticketId },
      data: {
        status: 'NO_SHOW',
        noShowAt: now,
      },
    });

    // 6. Create the TicketEvent
    await tx.ticketEvent.create({
      data: {
        ticketId: input.ticketId,
        eventType: 'NO_SHOW',
        counterId: officer.counterId,
        officerId: officer.id,
        metadata: {
          previousStatus,
          gracePeriodSeconds,
          elapsedSeconds,
          autoAdvanced: false,
        },
      },
    });

    // 7. Re-fetch with relations for the response
    const fullTicket = await tx.ticket.findUniqueOrThrow({
      where: { id: input.ticketId },
      include: {
        service: true,
        counter: true,
        calledByOfficer: { include: { user: true } },
        events: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return {
      fullTicket,
      previousStatus,
      gracePeriodSeconds,
      elapsedSeconds,
      counter: fullTicket.counter,
      calledByOfficer: fullTicket.calledByOfficer,
    };
  });

  // Broadcast SSE event AFTER transaction commits
  const sseEventId = randomUUID();
  const detail = mapTicketToDetail(result.fullTicket as unknown as Record<string, unknown>);

  // Determine calledByOfficerName from the relation
  const officerName =
    result.calledByOfficer && 'user' in (result.calledByOfficer as Record<string, unknown>)
      ? ((((result.calledByOfficer as Record<string, unknown>).user as Record<string, unknown>)
          ?.name as string) ?? '')
      : '';

  await broadcastEvent('global', 'TICKET_NO_SHOW', {
    ticketId: result.fullTicket.id,
    ticketNumber: result.fullTicket.ticketNumber,
    serviceId: result.fullTicket.serviceId,
    serviceName: result.fullTicket.service.name,
    counterId: officer.counterId,
    counterNumber: result.counter?.number ?? 0,
    calledByOfficerId: result.fullTicket.calledByOfficerId ?? '',
    calledByOfficerName: officerName,
    noShowAt: now.toISOString(),
    gracePeriodSeconds: result.gracePeriodSeconds,
    elapsedSeconds: result.elapsedSeconds,
    autoAdvanced: false,
    autoAdvancedTicketNumber: null,
  });

  return {
    ...detail,
    sseEventId,
    previousStatus: result.previousStatus as import('@prisma/client').TicketStatus,
    gracePeriodSeconds: result.gracePeriodSeconds,
    elapsedSeconds: result.elapsedSeconds,
    autoAdvanced: false,
    autoAdvancedTicket: null,
  };
}

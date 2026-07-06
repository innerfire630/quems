// =============================================================================
// src/lib/display-snapshot.ts — Server-side snapshot helper (3.2.1)
// =============================================================================
// Single entry point for fetching the initial state for the display page.
// Called from the snapshot API endpoints and the display page server component.
// =============================================================================

import { prisma } from '@/lib/db';
import type {
  DisplayBoardConfig,
  CounterDisplayData,
  TicketDisplayData,
  DisplaySnapshot,
} from '@/types/display.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapDisplayBoard(record: Record<string, unknown>): DisplayBoardConfig {
  return {
    id: record['id'] as string,
    name: record['name'] as string,
    isDefault: (record['isDefault'] as boolean) ?? false,
    maxDisplayedTickets: (record['maxDisplayedTickets'] as number) ?? 5,
    announcementEnabled: (record['announcementEnabled'] as boolean) ?? true,
    bellEnabled: (record['bellEnabled'] as boolean) ?? true,
    ttsEnabled: (record['ttsEnabled'] as boolean) ?? true,
    ttsLanguage: (record['ttsLanguage'] as string) ?? 'en-US',
    ttsRate: (record['ttsRate'] as number) ?? 1.0,
    ttsPitch: (record['ttsPitch'] as number) ?? 1.0,
    ttsVolume: (record['ttsVolume'] as number) ?? 1.0,
    announcementTemplate:
      (record['announcementTemplate'] as string) ?? 'Ticket {number}, please proceed to {counter}',
    themeColor: (record['themeColor'] as string) ?? null,
    displayTheme: (record['displayTheme'] as string) ?? 'dark',
    logoUrl: (record['logoUrl'] as string) ?? null,
    customMessage: (record['customMessage'] as string) ?? null,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getDisplayBoardById(boardId: string): Promise<DisplayBoardConfig | null> {
  const board = await prisma.displayBoard.findUnique({ where: { id: boardId } });
  if (!board) return null;
  return mapDisplayBoard(board as unknown as Record<string, unknown>);
}

export async function getDefaultDisplayBoard(): Promise<DisplayBoardConfig | null> {
  const board = await prisma.displayBoard.findFirst({ where: { isDefault: true } });
  if (!board) return null;
  return mapDisplayBoard(board as unknown as Record<string, unknown>);
}

export async function getActiveCounters(): Promise<CounterDisplayData[]> {
  const counters = await prisma.counter.findMany({
    where: { isActive: true },
    orderBy: { number: 'asc' },
  });

  return counters.map((c) => ({
    id: c.id,
    name: c.name,
    displayLabel: c.displayLabel || c.name,
    number: c.number,
    status: 'open' as const,
  }));
}

export async function getServingTickets(): Promise<Record<string, TicketDisplayData>> {
  const counters = await prisma.counter.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  const result: Record<string, TicketDisplayData> = {};

  await Promise.all(
    counters.map(async (counter) => {
      const ticket = await prisma.ticket.findFirst({
        where: {
          counterId: counter.id,
          status: { in: ['CALLED', 'RECALLED', 'SERVING'] },
        },
        orderBy: { calledAt: 'desc' },
        include: {
          service: true,
          counter: true,
          calledByOfficer: { include: { user: true } },
        },
      });

      if (ticket) {
        result[counter.id] = {
          id: ticket.id,
          ticketNumber: ticket.ticketNumber,
          serviceId: ticket.serviceId,
          serviceName: ticket.service.name,
          counterId: ticket.counterId ?? '',
          counterName: ticket.counter?.name ?? '',
          counterNumber: ticket.counter?.number ?? 0,
          officerName: ticket.calledByOfficer?.user?.name ?? 'Unknown',
          calledAt: ticket.calledAt?.toISOString() ?? ticket.createdAt.toISOString(),
          status: ticket.status,
        };
      }
    }),
  );

  return result;
}

export async function getRecentTicketsForCounter(
  counterId: string,
  max: number,
): Promise<TicketDisplayData[]> {
  const events = await prisma.ticketEvent.findMany({
    where: {
      counterId,
      eventType: { in: ['CALLED', 'RECALLED'] },
    },
    orderBy: { createdAt: 'desc' },
    take: max,
    include: {
      ticket: {
        include: {
          service: true,
          counter: true,
          calledByOfficer: { include: { user: true } },
        },
      },
    },
  });

  return events.map((evt) => {
    const t = evt.ticket;
    return {
      id: t.id,
      ticketNumber: t.ticketNumber,
      serviceId: t.serviceId,
      serviceName: t.service.name,
      counterId: t.counterId ?? '',
      counterName: t.counter?.name ?? '',
      counterNumber: t.counter?.number ?? 0,
      officerName: t.calledByOfficer?.user?.name ?? 'Unknown',
      calledAt: evt.createdAt.toISOString(),
      status: t.status,
    };
  });
}

export async function getDisplaySnapshot(boardId: string | null): Promise<DisplaySnapshot> {
  // Resolve board config
  let board: DisplayBoardConfig | null;
  if (boardId) {
    board = await getDisplayBoardById(boardId);
    if (!board) {
      console.warn(`Requested boardId '${boardId}' not found — falling back to default.`);
      board = await getDefaultDisplayBoard();
    }
  } else {
    board = await getDefaultDisplayBoard();
  }

  if (!board) {
    return {
      board: null,
      counters: [],
      servingTickets: {},
      recentTickets: {},
      counterClosedStatus: {},
    };
  }

  // Fetch counters, serving tickets, and recent tickets in parallel
  const [counters, servingTickets] = await Promise.all([getActiveCounters(), getServingTickets()]);

  // Fetch counter closed status from CounterOfficer
  // Use currentStatus instead of isClosed — setCounterStatus updates currentStatus
  const closedOfficers = await prisma.counterOfficer.findMany({
    where: {
      currentStatus: 'CLOSED',
    },
    select: {
      counterId: true,
      closureReason: true,
    },
  });

  const counterClosedStatus: Record<string, { closed: boolean; reason?: string }> = {};
  for (const co of closedOfficers) {
    counterClosedStatus[co.counterId] = {
      closed: true,
      reason: co.closureReason ?? undefined,
    };
  }

  // Sort counters: active (serving) at top by calledAt desc, idle at bottom by number
  counters.sort((a, b) => {
    const ticketA = servingTickets[a.id];
    const ticketB = servingTickets[b.id];
    const aActive = !!ticketA;
    const bActive = !!ticketB;

    // Active counters first
    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;

    // Among active counters, sort by calledAt descending (most recent first)
    if (aActive && bActive) {
      const timeA = new Date(ticketA.calledAt).getTime();
      const timeB = new Date(ticketB.calledAt).getTime();
      return timeB - timeA;
    }

    // Among idle counters, sort by number ascending
    return a.number - b.number;
  });

  // Fetch recent tickets per counter (in parallel)
  const recentTickets: Record<string, TicketDisplayData[]> = {};
  await Promise.all(
    counters.map(async (c) => {
      recentTickets[c.id] = await getRecentTicketsForCounter(c.id, board!.maxDisplayedTickets);
    }),
  );

  return {
    board,
    counters,
    servingTickets,
    recentTickets,
    counterClosedStatus,
  };
}

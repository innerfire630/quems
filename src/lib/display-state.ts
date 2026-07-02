// =============================================================================
// src/lib/display-state.ts — Display state reducer stubs (3.2.1)
// =============================================================================
// Pure reducer functions that update the DisplayState in response to SSE
// events. STUBS in 3.2.1 — 3.2.2 implements the full buffer cap, recall
// deduplication, no-show auto-advance, and other complete logic.
// =============================================================================

import type { SseEventPayload } from '@/types/sse.types';
import type { DisplayState, TicketDisplayData } from '@/types/display.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extracts the inner event-specific payload from the SSE envelope. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function inner(envelope: SseEventPayload): any {
  return (envelope as Record<string, unknown>)['payload'];
}

// ---------------------------------------------------------------------------
// Reducer stubs — each receives the full SseEventPayload and delegates to inner data
// ---------------------------------------------------------------------------

export function applyTICKET_CALLED(state: DisplayState, envelope: SseEventPayload): DisplayState {
  const p = inner(envelope) as Record<string, unknown>;
  const counterId = p['counterId'] as string;

  const ticket: TicketDisplayData = {
    id: (p['ticketId'] as string) ?? envelope.id,
    ticketNumber: p['ticketNumber'] as string,
    serviceId: p['serviceId'] as string,
    serviceName: p['serviceName'] as string,
    counterId,
    counterName: (p['counterName'] as string) ?? '',
    counterNumber: (p['counterNumber'] as number) ?? 0,
    officerName: (p['officerName'] as string) ?? 'Unknown',
    calledAt: (p['calledAt'] as string) ?? envelope.timestamp,
    status: 'CALLED',
  };

  const maxItems = state.board?.maxDisplayedTickets ?? 5;
  const existingRecent = state.recentByCounter[counterId] ?? [];
  // Deduplicate by ticket ID — remove any existing entry for this ticket, then prepend
  const dedupedRecent = existingRecent.filter((t) => t.id !== ticket.id);
  const recent = [ticket, ...dedupedRecent].slice(0, maxItems);

  return {
    ...state,
    nowServing: { ...state.nowServing, [counterId]: ticket },
    recentByCounter: { ...state.recentByCounter, [counterId]: recent },
  };
}

export function applyTICKET_RECALLED(state: DisplayState, envelope: SseEventPayload): DisplayState {
  const p = inner(envelope) as Record<string, unknown>;
  const counterId = p['counterId'] as string;
  const ticketId = p['ticketId'] as string;

  const nowServing = state.nowServing[counterId];
  // If the recalled ticket is the one currently shown as "now serving", update its status
  if (nowServing && nowServing.id === ticketId) {
    const updatedTicket: TicketDisplayData = {
      ...nowServing,
      status: 'RECALLED',
    };
    const recent = state.recentByCounter[counterId] ?? [];
    const updatedRecent = recent.map((t) => (t.id === ticketId ? updatedTicket : t));
    return {
      ...state,
      nowServing: { ...state.nowServing, [counterId]: updatedTicket },
      recentByCounter: { ...state.recentByCounter, [counterId]: updatedRecent },
    };
  }

  return state;
}

export function applyTICKET_NO_SHOW(state: DisplayState, envelope: SseEventPayload): DisplayState {
  const p = inner(envelope) as Record<string, unknown>;
  const counterId = p['counterId'] as string;
  const ticketId = p['ticketId'] as string;

  // Add a NO_SHOW entry to recent list
  const nowServing = state.nowServing[counterId];
  const recent = state.recentByCounter[counterId] ?? [];

  if (nowServing && nowServing.id === ticketId) {
    const noShowTicket: TicketDisplayData = {
      ...nowServing,
      status: 'NO_SHOW',
    };
    // Deduplicate by ticket ID — update if exists, otherwise prepend
    const existsInRecent = recent.some((t) => t.id === ticketId);
    const updatedRecent = existsInRecent
      ? [noShowTicket, ...recent.filter((t) => t.id !== ticketId)].slice(
          0,
          state.board?.maxDisplayedTickets ?? 5,
        )
      : [noShowTicket, ...recent].slice(0, state.board?.maxDisplayedTickets ?? 5);
    return {
      ...state,
      nowServing: { ...state.nowServing, [counterId]: null },
      recentByCounter: { ...state.recentByCounter, [counterId]: updatedRecent },
    };
  }

  return {
    ...state,
    nowServing: { ...state.nowServing, [counterId]: null },
  };
}

export function applyTICKET_SERVED(state: DisplayState, envelope: SseEventPayload): DisplayState {
  const p = inner(envelope) as Record<string, unknown>;
  const counterId = p['counterId'] as string;
  const ticketId = p['ticketId'] as string;

  const nowServing = state.nowServing[counterId];
  if (nowServing && nowServing.id === ticketId) {
    const servedTicket: TicketDisplayData = {
      ...nowServing,
      status: 'SERVED',
    };
    const recent = state.recentByCounter[counterId] ?? [];
    // Deduplicate — update existing entry or prepend
    const dedupedRecent = recent.filter((t) => t.id !== ticketId);
    const updatedRecent = [servedTicket, ...dedupedRecent].slice(
      0,
      state.board?.maxDisplayedTickets ?? 5,
    );
    return {
      ...state,
      nowServing: { ...state.nowServing, [counterId]: servedTicket },
      recentByCounter: { ...state.recentByCounter, [counterId]: updatedRecent },
    };
  }

  return {
    ...state,
    nowServing: { ...state.nowServing, [counterId]: null },
  };
}

export function applyCOUNTER_OPENED(state: DisplayState, envelope: SseEventPayload): DisplayState {
  const p = inner(envelope) as Record<string, unknown>;
  const counterId = p['counterId'] as string;
  const { [counterId]: _, ...restReasons } = state.counterCloseReasons;
  return {
    ...state,
    counterStatus: { ...state.counterStatus, [counterId]: 'open' },
    counterCloseReasons: restReasons,
  };
}

export function applyCOUNTER_CLOSED(state: DisplayState, envelope: SseEventPayload): DisplayState {
  const p = inner(envelope) as Record<string, unknown>;
  const counterId = p['counterId'] as string;
  const reason = (p['reason'] as string) || '';
  return {
    ...state,
    counterStatus: { ...state.counterStatus, [counterId]: 'closed' },
    counterCloseReasons: { ...state.counterCloseReasons, [counterId]: reason },
  };
}

export function applyDAILY_RESET(state: DisplayState, _envelope: SseEventPayload): DisplayState {
  const nowServing: Record<string, TicketDisplayData | null> = {};
  const recentByCounter: Record<string, TicketDisplayData[]> = {};
  for (const cid of Object.keys(state.counters)) {
    nowServing[cid] = null;
    recentByCounter[cid] = [];
  }

  return {
    ...state,
    nowServing,
    recentByCounter,
    broadcastMessage: null,
  };
}

export function applyBROADCAST_MESSAGE(
  state: DisplayState,
  envelope: SseEventPayload,
): DisplayState {
  const p = inner(envelope) as Record<string, unknown>;
  const message = p['message'] as string;
  const senderName = (p['senderName'] as string) ?? 'System';
  const displaySeconds = (p['displaySeconds'] as number) ?? 10;

  return {
    ...state,
    broadcastMessage: {
      message,
      senderName,
      displaySeconds,
      expiresAt: Date.now() + displaySeconds * 1000,
    },
  };
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

export function applyEvent(state: DisplayState, envelope: SseEventPayload): DisplayState {
  switch (envelope.type) {
    case 'TICKET_CALLED':
      return applyTICKET_CALLED(state, envelope);
    case 'TICKET_RECALLED':
      return applyTICKET_RECALLED(state, envelope);
    case 'TICKET_NO_SHOW':
      return applyTICKET_NO_SHOW(state, envelope);
    case 'TICKET_SERVED':
      return applyTICKET_SERVED(state, envelope);
    case 'COUNTER_OPENED':
      return applyCOUNTER_OPENED(state, envelope);
    case 'COUNTER_CLOSED':
      return applyCOUNTER_CLOSED(state, envelope);
    case 'DAILY_RESET':
      return applyDAILY_RESET(state, envelope);
    case 'BROADCAST_MESSAGE':
      return applyBROADCAST_MESSAGE(state, envelope);
    default:
      return state;
  }
}

// =============================================================================
// src/types/display.types.ts — Display board type definitions (3.2.1)
// =============================================================================
// Shared types for the display board's state. Used by the snapshot function,
// the page, the components, and (in 3.2.2) the reducers.
// =============================================================================

/** The board configuration shape (subset of DisplayBoard Prisma model). */
export interface DisplayBoardConfig {
  id: string;
  name: string;
  isDefault: boolean;
  maxDisplayedTickets: number;
  announcementEnabled: boolean;
  bellEnabled: boolean;
  ttsEnabled: boolean;
  ttsLanguage: string;
  ttsRate: number;
  ttsPitch: number;
  ttsVolume: number;
  announcementTemplate: string;
  themeColor: string | null;
  logoUrl: string | null;
  customMessage: string | null;
}

/** The counter shape consumed by display components. */
export interface CounterDisplayData {
  id: string;
  name: string;
  displayLabel: string;
  number: number;
  status: 'open' | 'closed';
}

/** The ticket shape consumed by display components. */
export interface TicketDisplayData {
  id: string;
  ticketNumber: string;
  serviceId: string;
  serviceName: string;
  counterId: string;
  counterName: string;
  counterNumber: number;
  officerName: string;
  calledAt: string;
  /** Ticket status — enables recall/no-show indicators on the display board. */
  status?: string;
}

/** The initial state returned by the snapshot endpoint. */
export interface DisplaySnapshot {
  board: DisplayBoardConfig | null;
  counters: CounterDisplayData[];
  servingTickets: Record<string, TicketDisplayData>;
  recentTickets: Record<string, TicketDisplayData[]>;
}

/** The live state held in React, used by reducers. */
export interface DisplayState {
  board: DisplayBoardConfig | null;
  counters: Record<string, CounterDisplayData>;
  nowServing: Record<string, TicketDisplayData | null>;
  recentByCounter: Record<string, TicketDisplayData[]>;
  counterStatus: Record<string, 'open' | 'closed'>;
  counterCloseReasons: Record<string, string>;
  broadcastMessage: {
    message: string;
    senderName: string;
    displaySeconds: number;
    expiresAt: number;
  } | null;
}

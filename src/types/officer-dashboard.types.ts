// =============================================================================
// src/types/officer-dashboard.types.ts — Dashboard types (4.2.3)
// =============================================================================
import type { TicketDetail, TicketListItem } from '@/types/ticket.types';
import type { SseEventType } from '@/types/sse.types';

// ---------------------------------------------------------------------------
// Core dashboard data shape (loaded server-side, hydrated client-side)
// ---------------------------------------------------------------------------

export interface OfficerDashboardData {
  counter: CounterInfo;
  currentServingTicket: TicketDetail | null;
  queueDepth: QueueDepthSnapshot;
  nextTicket: TicketListItem | null;
  waitingTickets: TicketListItem[];
  dashboardSettings: DashboardSettings;
  recentActivity: RecentActivityEntry[];
  recentStatusEvents: import('@/lib/counter-status').CounterStatusEventWithOfficer[];
  notificationsState: import('@/lib/officer-notifications').NotificationsStateEntry[];
  officerContext: OfficerContext;
  user: DashboardUserInfo;
}

export interface CounterInfo {
  id: string;
  name: string;
  number: number;
  displayLabel: string | null;
  isActive: boolean;
}

export interface QueueDepthSnapshot {
  counterId: string;
  count: number;
  lastUpdatedAt: Date;
}

export interface RecentActivityEntry {
  id: string;
  type:
    'TICKET_CALLED' | 'TICKET_RECALLED' | 'TICKET_NO_SHOW' | 'COUNTER_OPENED' | 'COUNTER_CLOSED';
  ticketId: string | null;
  ticketNumber: string | null;
  counterId: string;
  counterName: string;
  officerName: string;
  timestamp: Date;
}

export interface OfficerContext {
  counterOfficerId: string;
  currentStatus: 'OPENED' | 'CLOSED';
  isOnDuty: boolean;
  notificationsEnabled: boolean;
}

export interface DashboardUserInfo {
  id: string;
  name: string;
  email: string;
}

// ---------------------------------------------------------------------------
// Dashboard admin-configurable settings
// ---------------------------------------------------------------------------

export interface DashboardSettings {
  waitingTimeColorConfig: WaitingTimeColorConfig;
  reminderThresholdMinutes: number;
  reminderIntervalMinutes: number;
  reminderBlinkIntervalSeconds: number;
  reminderSoundFile: string;
  reminderSoundRepeatCount: number;
  newTicketSoundFile: string;
}

export interface WaitingTimeColorConfig {
  green_max_minutes: number;
  yellow_max_minutes: number;
  green_color: string;
  yellow_color: string;
  red_color: string;
}

// ---------------------------------------------------------------------------
// SSE event filter — events the dashboard consumes
// ---------------------------------------------------------------------------

export const DASHBOARD_EVENT_FILTER: readonly SseEventType[] = [
  'TICKET_ISSUED',
  'QUEUE_UPDATED',
  'TICKET_CALLED',
  'TICKET_RECALLED',
  'TICKET_NO_SHOW',
  'TICKET_SERVED',
  'COUNTER_OPENED',
  'COUNTER_CLOSED',
  'NOTIFICATION_RECEIVED',
] as const;

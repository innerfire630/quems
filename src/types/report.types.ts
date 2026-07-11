// =============================================================================
// src/types/report.types.ts — Report data types (5.1.1)
// =============================================================================
// Shared types consumed by the analytics service (5.1.1), reports dashboard
// (5.1.2), CSV export (5.1.3), and the scheduled reports interface (5.1.3).
// =============================================================================

/** Maximum allowed date range for a single report query (prevents abuse). */
export const BUSINESS_DATE_RANGE_MAX_DAYS = 90;

// ---------------------------------------------------------------------------
// Core report data types
// ---------------------------------------------------------------------------

/** The full report payload returned by getReportData and GET /api/reports. */
export interface ReportData {
  kpi: ReportKpiSummary;
  services: ServicePerformanceRow[];
  counters: CounterPerformanceRow[];
  /** Always 24 entries (one per hour 0-23), even when count is 0. */
  hourly: HourlyTicketCount[];
  startDate: string;
  endDate: string;
  serviceId: string | null;
  counterId: string | null;
  generatedAt: string;
}

/** The four KPI values shown in the dashboard cards. */
export interface ReportKpiSummary {
  totalTickets: number;
  /** Arithmetic mean wait (minutes). null when no called tickets. */
  averageWaitMinutes: number | null;
  /** Float 0-1 (NOT a percentage). Dashboard multiplies by 100. */
  noShowRate: number;
  /** Hour 0-23 in APP_TIMEZONE. null when no calls or below threshold. */
  busiestHour: number | null;
}

/** One row in the per-service performance table. */
export interface ServicePerformanceRow {
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  /** Date string (YYYY-MM-DD) when byDay is true; undefined for aggregated rows. */
  date?: string;
  totalIssued: number;
  totalServed: number;
  totalNoShow: number;
  noShowRate: number;
  averageWaitMinutes: number | null;
  averageServiceMinutes: number | null;
  peakHour: number | null;
}

/** One row in the per-counter performance table. */
export interface CounterPerformanceRow {
  counterId: string;
  counterName: string;
  counterNumber: number;
  /** Tickets called at this counter in the period. */
  totalServed: number;
  /** Tickets no-showed at this counter in the period. */
  totalNoShow: number;
  averageServiceMinutes: number | null;
  /** Count of COUNTER_CLOSED events in the period. */
  closureEvents: number;
}

/** One hour bucket for the tickets-by-hour chart. */
export interface HourlyTicketCount {
  hour: number;
  count: number;
}

// ---------------------------------------------------------------------------
// In-memory counter types
// ---------------------------------------------------------------------------

/** Per-service running counters held in memory during the day. */
export interface ServiceDailyCounters {
  totalIssued: number;
  /** Always 0 until COMPLETED transition is implemented. */
  totalServed: number;
  totalNoShow: number;
  /** Always 0 until CANCELLED transition is implemented. */
  totalCancelled: number;
  /** Wait times for called tickets (minutes). */
  waitTimes: number[];
  /** Service times for completed tickets (minutes). Always empty until implemented. */
  serviceTimes: number[];
  /** Tickets issued per hour (0-23) in APP_TIMEZONE. */
  hourlyIssued: Record<number, number>;
}

// ---------------------------------------------------------------------------
// Scheduled report types (5.1.3 interface)
// ---------------------------------------------------------------------------

export interface ScheduledReportJobOptions {
  startDate: Date;
  endDate: Date;
  serviceId?: string;
  counterId?: string;
  recipients?: string[];
  frequency?: 'daily' | 'weekly' | 'monthly' | null;
}

export interface ScheduledReportJob {
  id: string;
  query: {
    startDate: string;
    endDate: string;
    serviceId: string | null;
    counterId: string | null;
  };
  recipients: string[];
  frequency: 'daily' | 'weekly' | 'monthly' | null;
  scheduledAt: string;
  status: 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'FAILED';
}

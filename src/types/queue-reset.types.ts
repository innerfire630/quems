// =============================================================================
// src/types/queue-reset.types.ts — Daily reset types (2.3.3)
// =============================================================================

// ---------------------------------------------------------------------------
// Statistics computed for one service on one business date
// ---------------------------------------------------------------------------

export interface SnapshotStatistics {
  totalIssued: number;
  totalServed: number;
  totalNoShow: number;
  totalCancelled: number;
  totalWaiting: number;
  averageWaitMinutes: number | null;
  averageServiceMinutes: number | null;
  peakHour: number | null;
}

// ---------------------------------------------------------------------------
// Input options for runDailyReset
// ---------------------------------------------------------------------------

export interface ResetOptions {
  previousBusinessDate: Date;
  now: Date;
  trigger: 'SCHEDULED' | 'MANUAL';
  triggeredByUserId: string | null;
}

// ---------------------------------------------------------------------------
// Result for a single service's reset
// ---------------------------------------------------------------------------

export interface PerServiceResetResult {
  serviceId: string;
  serviceName: string;
  snapshotUpserted: boolean;
  counterReset: boolean;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Aggregate result of the daily reset
// ---------------------------------------------------------------------------

export interface ResetResult {
  previousBusinessDate: Date;
  resetAt: Date;
  trigger: 'SCHEDULED' | 'MANUAL';
  triggeredByUserId: string | null;
  affectedServices: PerServiceResetResult[];
  totalSnapshotsUpserted: number;
  totalCountersReset: number;
  errors: { serviceId: string; message: string }[];
}

// ---------------------------------------------------------------------------
// API response shape
// ---------------------------------------------------------------------------

export interface ResetApiResponse {
  previousBusinessDate: string;
  resetAt: string;
  trigger: 'SCHEDULED' | 'MANUAL';
  triggeredByUserId: string | null;
  affectedServices: {
    serviceId: string;
    serviceName: string;
    snapshotUpserted: boolean;
    counterReset: boolean;
    error: string | null;
  }[];
  totalSnapshotsUpserted: number;
  totalCountersReset: number;
  errors: { serviceId: string; message: string }[];
}

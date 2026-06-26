// =============================================================================
// src/types/health.types.ts — Health check response types (5.2.3)
// =============================================================================

export interface HealthStatus {
  status: 'ok' | 'degraded';
  timestamp: string; // ISO 8601
  database: 'connected' | 'disconnected';
  version: string;
  uptimeSeconds: number;
}

export const HEALTH_CHECK_DEGRADED_THRESHOLD_MS = 1000;

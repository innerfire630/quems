// =============================================================================
// src/lib/prisma-logging.ts — Prisma query logger with slow-query detection (5.2.2)
// =============================================================================
// Logs Prisma queries in development with timing. Highlights queries slower
// than SLOW_QUERY_THRESHOLD_MS with a warning.
// =============================================================================

import type { Prisma } from '@prisma/client';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const SLOW_QUERY_THRESHOLD_MS = 100;

// ---------------------------------------------------------------------------
// Sensitive field names to sanitize from parameter logging
// ---------------------------------------------------------------------------

const SENSITIVE_FIELDS = new Set([
  'password',
  'hashedPassword',
  'token',
  'secret',
  'refreshToken',
  'accessToken',
  'access_token',
  'refresh_token',
]);

function sanitizeParams(params: string): string {
  try {
    const parsed = JSON.parse(params);
    if (typeof parsed === 'object' && parsed !== null) {
      for (const key of Object.keys(parsed)) {
        if (SENSITIVE_FIELDS.has(key)) {
          parsed[key] = '[REDACTED]';
        }
      }
    }
    return JSON.stringify(parsed);
  } catch {
    return params;
  }
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

export function logQuery(event: Prisma.QueryEvent): void {
  const duration = event.duration;
  const query = event.query.replace(/\s+/g, ' ').trim();

  if (duration > SLOW_QUERY_THRESHOLD_MS) {
    console.warn(
      `[Prisma] ⚠️ SLOW QUERY (${duration}ms) ${query} — params: ${sanitizeParams(event.params)}`,
    );
  } else {
    console.debug(`[Prisma] (${duration}ms) ${query}`);
  }
}

export function logWarn(event: Prisma.LogEvent): void {
  console.warn(`[Prisma] WARN: ${event.message}`);
}

export function logError(event: Prisma.LogEvent): void {
  console.error(`[Prisma] ERROR: ${event.message}`);
}

// ---------------------------------------------------------------------------
// Feature flag
// ---------------------------------------------------------------------------

export function isLoggingEnabled(): boolean {
  if (process.env.PRISMA_LOG_QUERIES === 'true') return true;
  if (process.env.PRISMA_LOG_QUERIES === 'false') return false;
  return process.env.NODE_ENV === 'development';
}

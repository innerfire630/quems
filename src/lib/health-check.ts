// =============================================================================
// src/lib/health-check.ts — System health check module (5.2.3)
// =============================================================================

import { prisma } from '@/lib/db';
import type { HealthStatus } from '@/types/health.types';
import { readFileSync } from 'fs';
import { join } from 'path';

// ---------------------------------------------------------------------------
// Module-scope state
// ---------------------------------------------------------------------------

const processStartTime = Date.now();

let _cachedVersion: string | null = null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getApplicationVersion(): string {
  if (_cachedVersion !== null) return _cachedVersion;
  try {
    const pkgPath = join(process.cwd(), 'package.json');
    const raw = readFileSync(pkgPath, 'utf-8');
    const pkg = JSON.parse(raw) as { version?: string };
    _cachedVersion = pkg.version ?? 'unknown';
  } catch {
    _cachedVersion = 'unknown';
  }
  return _cachedVersion;
}

export function getUptimeSeconds(): number {
  return (Date.now() - processStartTime) / 1000;
}

export async function checkDatabaseConnection(): Promise<'connected' | 'disconnected'> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return 'connected';
  } catch {
    return 'disconnected';
  }
}

// ---------------------------------------------------------------------------
// Main health check
// ---------------------------------------------------------------------------

export async function getHealthStatus(): Promise<HealthStatus> {
  const database = await checkDatabaseConnection();

  return {
    status: database === 'connected' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    database,
    version: getApplicationVersion(),
    uptimeSeconds: getUptimeSeconds(),
  };
}

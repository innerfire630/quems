// =============================================================================
// src/app/api/health/route.ts — Health check endpoint (5.2.3)
// =============================================================================
// GET /api/health — UNAUTHENTICATED. Returns 200 with health status JSON
// if the system is operational, 503 if degraded.
// Rate limited via middleware (60 req/min per IP, HEALTH route group).
// =============================================================================

import { NextResponse } from 'next/server';
import { getHealthStatus } from '@/lib/health-check';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  try {
    const health = await getHealthStatus();

    if (health.status === 'degraded') {
      return NextResponse.json(health, { status: 503 });
    }

    return NextResponse.json(health, { status: 200 });
  } catch (error) {
    console.error('[health] Health check failed:', error);
    return NextResponse.json(
      {
        status: 'degraded',
        timestamp: new Date().toISOString(),
        database: 'disconnected' as const,
        version: 'unknown',
        uptimeSeconds: 0,
      },
      { status: 503 },
    );
  }
}

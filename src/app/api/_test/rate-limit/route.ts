// =============================================================================
// src/app/api/_test/rate-limit/route.ts — Rate limit test endpoint (5.2.1)
// =============================================================================
// DEVELOPMENT ONLY. Returns rate limit bucket info for a given route group.
// Disabled in production (returns 404).
// =============================================================================

import { NextResponse } from 'next/server';
import { checkIpRateLimit, getRequestIp, RATE_LIMITS } from '@/lib/rate-limit';
import type { RouteGroup } from '@/lib/rate-limit';

const VALID_GROUPS = new Set<string>(Object.keys(RATE_LIMITS));

export async function GET(req: Request): Promise<Response> {
  // Only available in development
  if (process.env.NODE_ENV !== 'development') {
    return new NextResponse(null, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const routeGroup = (searchParams.get('routeGroup') ?? 'GENERAL') as RouteGroup;

  if (!VALID_GROUPS.has(routeGroup)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid routeGroup. Must be one of: ${[...VALID_GROUPS].join(', ')}`,
        },
      },
      { status: 422 },
    );
  }

  const config = RATE_LIMITS[routeGroup];
  const ip = getRequestIp(req);
  const result = checkIpRateLimit(ip, routeGroup);

  return NextResponse.json({
    success: true,
    data: {
      ...result,
      limit: config.limit,
      windowMs: config.windowMs,
      keyStrategy: config.keyStrategy,
    },
  });
}

// =============================================================================
// src/lib/rate-limit.ts — Rate limiting infrastructure (5.2.1)
// =============================================================================
// In-memory fixed-window rate limiter. The store survives Next.js dev
// hot-reload via globalThis. Buckets are cleaned up periodically (every 5 min).
// For production, this is sufficient for single-server deployment. Redis-backed
// distributed rate limiting is the documented upgrade path for horizontal scaling.
//
// References: Master Plan §15.3 (rate limits), §15.5 (security headers)
// =============================================================================

import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RateLimitBucket {
  count: number;
  windowStart: number; // timestamp ms
  limit: number;
  windowMs: number;
}

export interface RateLimitConfig {
  limit: number;
  windowMs: number;
  keyStrategy: 'ip' | 'user' | 'ip-or-user';
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
  retryAfterMs: number;
}

export class RateLimitExceededError extends Error {
  readonly retryAfterMs: number;
  readonly code = 'RATE_LIMITED' as const;

  constructor(retryAfterMs: number) {
    super('Rate limit exceeded');
    this.name = 'RateLimitExceededError';
    this.retryAfterMs = retryAfterMs;
  }
}

// ---------------------------------------------------------------------------
// Route groups (Master Plan §15.3)
// ---------------------------------------------------------------------------

export type RouteGroup =
  | 'AUTH'
  | 'TICKET_ISSUANCE'
  | 'OFFICER_ACTIONS'
  | 'SSE'
  | 'GENERAL'
  | 'HEALTH';

export const RATE_LIMITS: Readonly<Record<RouteGroup, RateLimitConfig>> = {
  AUTH: { limit: 10, windowMs: 60_000, keyStrategy: 'ip' },
  TICKET_ISSUANCE: { limit: 30, windowMs: 60_000, keyStrategy: 'ip' },
  OFFICER_ACTIONS: { limit: 60, windowMs: 60_000, keyStrategy: 'user' },
  SSE: { limit: 10, windowMs: 0, keyStrategy: 'ip' },
  GENERAL: { limit: 200, windowMs: 60_000, keyStrategy: 'ip-or-user' },
  HEALTH: { limit: 60, windowMs: 60_000, keyStrategy: 'ip' },
} as const;

// ---------------------------------------------------------------------------
// Module-scope store (survives Next.js dev hot-reload)
// ---------------------------------------------------------------------------

const globalStore = globalThis as unknown as {
  __rateLimitStore?: Map<string, RateLimitBucket>;
  __cleanupInterval?: ReturnType<typeof setInterval>;
};

const rateLimitStore: Map<string, RateLimitBucket> =
  globalStore.__rateLimitStore ?? (globalStore.__rateLimitStore = new Map());

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getRequestIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? 'unknown';
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}

// ---------------------------------------------------------------------------
// Core check
// ---------------------------------------------------------------------------

export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  // SSE uses concurrent count (windowMs: 0), handled specially
  if (config.windowMs === 0) {
    const bucket = rateLimitStore.get(key);
    if (!bucket) {
      rateLimitStore.set(key, {
        count: 1,
        windowStart: Date.now(),
        limit: config.limit,
        windowMs: 0,
      });
      return { allowed: true, remaining: config.limit - 1, resetMs: 0, retryAfterMs: 0 };
    }
    if (bucket.count < config.limit) {
      bucket.count += 1;
      return { allowed: true, remaining: config.limit - bucket.count, resetMs: 0, retryAfterMs: 0 };
    }
    return {
      allowed: false,
      remaining: 0,
      resetMs: 0,
      retryAfterMs: Infinity as unknown as number,
    };
  }

  const now = Date.now();
  let bucket = rateLimitStore.get(key);

  // If no bucket or the window expired, create a new one
  if (!bucket || now - bucket.windowStart > config.windowMs) {
    bucket = { count: 0, windowStart: now, limit: config.limit, windowMs: config.windowMs };
    rateLimitStore.set(key, bucket);
  }

  if (bucket.count < config.limit) {
    bucket.count += 1;
    const resetMs = bucket.windowStart + config.windowMs;
    return { allowed: true, remaining: config.limit - bucket.count, resetMs, retryAfterMs: 0 };
  }

  const resetMs = bucket.windowStart + config.windowMs;
  const retryAfterMs = Math.max(0, resetMs - now);
  return { allowed: false, remaining: 0, resetMs, retryAfterMs };
}

// ---------------------------------------------------------------------------
// Convenience wrappers
// ---------------------------------------------------------------------------

import { generateIpKey, generateUserKey } from '@/lib/rate-limit-keys';

export function checkIpRateLimit(ip: string, routeGroup: RouteGroup): RateLimitResult {
  const config = RATE_LIMITS[routeGroup];
  return checkRateLimit(generateIpKey(ip, routeGroup), config);
}

export function checkUserRateLimit(userId: string, routeGroup: RouteGroup): RateLimitResult {
  const config = RATE_LIMITS[routeGroup];
  return checkRateLimit(generateUserKey(userId, routeGroup), config);
}

export function checkIpOrUserRateLimit(
  request: Request,
  userId: string | null,
  routeGroup: RouteGroup,
): RateLimitResult {
  const config = RATE_LIMITS[routeGroup];
  if (userId) {
    return checkRateLimit(generateUserKey(userId, routeGroup), config);
  }
  return checkRateLimit(generateIpKey(getRequestIp(request), routeGroup), config);
}

// ---------------------------------------------------------------------------
// 429 response builder
// ---------------------------------------------------------------------------

export function createRateLimitResponse(
  result: RateLimitResult,
  config: RateLimitConfig,
): NextResponse {
  const retryAfter = Math.ceil(result.retryAfterMs / 1000);
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        details: { retryAfterMs: result.retryAfterMs },
      },
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Limit': String(config.limit),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.ceil(result.resetMs / 1000)),
      },
    },
  );
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

export function cleanupExpiredBuckets(): void {
  const now = Date.now();
  for (const [key, bucket] of rateLimitStore) {
    if (bucket.windowMs > 0 && now - bucket.windowStart > bucket.windowMs) {
      rateLimitStore.delete(key);
    }
  }
}

export function getActiveBucketCount(): number {
  return rateLimitStore.size;
}

/**
 * Start periodic cleanup. Called from instrumentation or server bootstrap.
 * Safe to call multiple times — only starts if not already running.
 */
export function startRateLimitCleanup(): void {
  if (globalStore.__cleanupInterval) return;
  globalStore.__cleanupInterval = setInterval(cleanupExpiredBuckets, 5 * 60_000);
  // Allow the timer to not keep the process alive
  if (globalStore.__cleanupInterval?.unref) {
    globalStore.__cleanupInterval.unref();
  }
}

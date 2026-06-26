// =============================================================================
// src/lib/rate-limit-keys.ts — Rate limit key generation helpers (5.2.1)
// =============================================================================

import type { RouteGroup } from '@/lib/rate-limit';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const RATE_LIMIT_KEY_PREFIX = 'ratelimit:';

// ---------------------------------------------------------------------------
// Key generators
// ---------------------------------------------------------------------------

export function generateIpKey(ip: string, routeGroup: RouteGroup): string {
  return `${RATE_LIMIT_KEY_PREFIX}ip:${ip}:${routeGroup}`;
}

export function generateUserKey(userId: string, routeGroup: RouteGroup): string {
  return `${RATE_LIMIT_KEY_PREFIX}user:${userId}:${routeGroup}`;
}

export function generateSseKey(ip: string): string {
  return `${RATE_LIMIT_KEY_PREFIX}sse:${ip}`;
}

export function generateHealthKey(ip: string): string {
  return `${RATE_LIMIT_KEY_PREFIX}health:${ip}`;
}

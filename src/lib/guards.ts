// =============================================================================
// src/lib/guards.ts — RBAC guard functions (server-only, 1.3.2)
// =============================================================================
// Higher-order functions that wrap API route handlers and server actions
// with permission and role enforcement. Every protected API route in
// Phase 2+ will use `withPermission` or `withRole` as its outermost wrapper.
//
// References: Master Plan §9.1 (response envelope), §9.2 (401 vs 403)
// =============================================================================

import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import type { Permission, Role } from '@/lib/permissions';
import {
  checkIpRateLimit,
  createRateLimitResponse,
  getRequestIp,
  RATE_LIMITS,
} from '@/lib/rate-limit';
import type { RouteGroup } from '@/lib/rate-limit';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** What `withPermission` accepts as a required permission specifier. */
export type PermissionRequirement = Permission | { any: Permission[] } | { all: Permission[] };

/** Context object injected into a guarded handler after the check passes. */
export interface GuardedContext {
  session: Session;
}

/**
 * Signature of a handler wrapped by `withPermission`.
 * Receives the original Next.js request and the typed GuardedContext.
 */
export type GuardedHandler = (
  req: Request,
  ctx: GuardedContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...rest: any[]
) => Promise<Response>;

/** Options for customising the guard's unauthorised / forbidden responses. */
export interface GuardOptions {
  onUnauthorized?: () => Response;
  onForbidden?: () => Response;
}

// ---------------------------------------------------------------------------
// Default response builders
// ---------------------------------------------------------------------------

function defaultUnauthorized(): Response {
  return NextResponse.json(
    { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } },
    { status: 401 },
  );
}

function defaultForbidden(): Response {
  return NextResponse.json(
    {
      success: false,
      error: { code: 'FORBIDDEN', message: 'You do not have permission to access this resource.' },
    },
    { status: 403 },
  );
}

function deactivatedResponse(status: string): Response {
  const message =
    status === 'SUSPENDED'
      ? 'Your account has been suspended. Contact an administrator for assistance.'
      : 'Your account has been deactivated. Contact an administrator for assistance.';
  return NextResponse.json(
    {
      success: false,
      error: { code: 'ACCOUNT_DEACTIVATED', message },
    },
    { status: 403 },
  );
}

// ---------------------------------------------------------------------------
// Dependency-injection session reader (testable)
// ---------------------------------------------------------------------------

let _sessionReader: () => Promise<Session | null> = () => auth();

/**
 * Override the session reader (for testing).
 * Not used in production code.
 */
export function _overrideSessionReader(fn: () => Promise<Session | null>): void {
  _sessionReader = fn;
}

// ---------------------------------------------------------------------------
// Permission check helpers
// ---------------------------------------------------------------------------

function hasPermission(session: Session, required: PermissionRequirement): boolean {
  const perms = session.user.permissions ?? [];

  if (typeof required === 'string') {
    return perms.includes(required);
  }

  if ('any' in required) {
    return required.any.some((p) => perms.includes(p));
  }

  if ('all' in required) {
    return required.all.every((p) => perms.includes(p));
  }

  return false;
}

function hasRole(session: Session, requiredRole: Role): boolean {
  return (session.user.roles ?? []).includes(requiredRole);
}

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

/**
 * Wraps an API route handler or server action with a permission check.
 *
 * @example
 *   export const GET = withPermission(async (req, { session }) => {
 *     return NextResponse.json({ success: true, data: { user: session.user } });
 *   }, PERMISSION_USER_READ);
 *
 * @example
 *   // Any-of mode
 *   export const POST = withPermission(handler, { any: [PERMISSION_USER_CREATE, PERMISSION_USER_MANAGE] });
 *
 * @example
 *   // All-of mode
 *   export const DELETE = withPermission(handler, { all: [PERMISSION_USER_DELETE, PERMISSION_SYSTEM_CONFIGURE] });
 */
export function withPermission(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (req: Request, ctx: GuardedContext, ...rest: any[]) => Promise<Response>,
  required: PermissionRequirement,
  options?: GuardOptions,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): (req: Request, ...rest: any[]) => Promise<Response> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (req: Request, ...rest: any[]): Promise<Response> => {
    const session = await _sessionReader();

    if (!session) {
      return options?.onUnauthorized?.() ?? defaultUnauthorized();
    }

    // Reject inactive or suspended users
    // Check JWT status first (fast); fall back to DB for tokens issued before status tracking
    const userStatus = session.user.status;
    if (userStatus === 'INACTIVE' || userStatus === 'SUSPENDED') {
      return deactivatedResponse(userStatus);
    }
    if (!userStatus || userStatus === 'ACTIVE') {
      // Verify from DB to catch users suspended after their JWT was issued
      const dbUser = await prisma.user.findUnique({
        where: { id: session.user.userId },
        select: { status: true },
      });
      if (dbUser && (dbUser.status === 'INACTIVE' || dbUser.status === 'SUSPENDED')) {
        return deactivatedResponse(dbUser.status);
      }
    }

    if (!hasPermission(session, required)) {
      return options?.onForbidden?.() ?? defaultForbidden();
    }

    return handler(req, { session }, ...rest);
  };
}

/**
 * Wraps an API route handler with a role-name check.
 * Less commonly used — prefer `withPermission` for most scenarios.
 */
export function withRole(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (req: Request, ctx: GuardedContext, ...rest: any[]) => Promise<Response>,
  requiredRole: Role,
  options?: GuardOptions,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): (req: Request, ...rest: any[]) => Promise<Response> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (req: Request, ...rest: any[]): Promise<Response> => {
    const session = await _sessionReader();

    if (!session) {
      return options?.onUnauthorized?.() ?? defaultUnauthorized();
    }

    if (!hasRole(session, requiredRole)) {
      return options?.onForbidden?.() ?? defaultForbidden();
    }

    return handler(req, { session }, ...rest);
  };
}

// ---------------------------------------------------------------------------
// Rate limit guard — handler-level rate limiting (5.2.1)
// ---------------------------------------------------------------------------

/**
 * Wraps an API route handler with rate limiting at the handler level.
 * Useful for routes that need handler-level access to the request body
 * for fingerprinting, or for routes within a group that need stricter limits.
 *
 * The middleware-level rate limiting (src/middleware.ts) is the primary
 * mechanism; use this for edge cases.
 *
 * @example
 *   export const POST = withRateLimit(handler, 'AUTH');
 */
export function withRateLimit(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (req: Request, ...rest: any[]) => Promise<Response>,
  routeGroup: RouteGroup,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): (req: Request, ...rest: any[]) => Promise<Response> {
  const config = RATE_LIMITS[routeGroup];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (req: Request, ...rest: any[]): Promise<Response> => {
    if (process.env.RATE_LIMIT_ENABLED !== 'false') {
      const ip = getRequestIp(req);
      const result = checkIpRateLimit(ip, routeGroup);

      if (!result.allowed) {
        return createRateLimitResponse(result, config);
      }
    }

    return handler(req, ...rest);
  };
}

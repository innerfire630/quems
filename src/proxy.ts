// =============================================================================
// src/proxy.ts — Next.js 16 proxy for route protection, rate limiting & CORS
// =============================================================================
// Next.js 16 deprecates `middleware.ts` in favor of `proxy.ts`.
// Same API: intercepts matching requests.
//
// Three-tier protection:
//   1. CORS preflight & rate limiting — rejects abusive traffic early.
//   2. Authentication check — redirects to /login if no JWT token.
//   3. Authorization check — redirects to /?error=forbidden if the token
//      lacks a required permission for the requested route prefix.
//
// IMPORTANT: The proxy does NOT verify the JWT signature (no Node crypto in
// Edge runtime). Signature verification happens server-side in layouts and
// API route guards (withPermission).
// =============================================================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { ROUTE_PERMISSION_MAP } from '@/lib/route-permissions';
import {
  checkIpRateLimit,
  checkUserRateLimit,
  checkIpOrUserRateLimit,
  createRateLimitResponse,
  getRequestIp,
  RATE_LIMITS,
  startRateLimitCleanup,
} from '@/lib/rate-limit';
import type { RouteGroup } from '@/lib/rate-limit';
import { handleCorsPreflight } from '@/lib/cors';
import { applySecurityHeaders } from '@/lib/security-headers';

// ---------------------------------------------------------------------------
// Rate limit route group classification (Master Plan §15.3)
// ---------------------------------------------------------------------------

const ROUTE_GROUP_PATTERNS: Array<{ pattern: RegExp; group: RouteGroup }> = [
  { pattern: /^\/api\/auth/, group: 'AUTH' },
  { pattern: /^\/api\/tickets\/issue/, group: 'TICKET_ISSUANCE' },
  {
    pattern: /^\/api\/tickets\/[^/]+\/(call|recall|no-show)/,
    group: 'OFFICER_ACTIONS',
  },
  { pattern: /^\/api\/tickets\/call-next/, group: 'OFFICER_ACTIONS' },
  { pattern: /^\/api\/sse/, group: 'SSE' },
  { pattern: /^\/api\/health/, group: 'HEALTH' },
  { pattern: /^\/api/, group: 'GENERAL' },
];

function classifyRoute(pathname: string): RouteGroup | null {
  const path = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
  for (const { pattern, group } of ROUTE_GROUP_PATTERNS) {
    if (pattern.test(path)) return group;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main proxy handler
// ---------------------------------------------------------------------------

export default async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Start cleanup interval on first request
  startRateLimitCleanup();

  // ---- Step 1: CORS preflight for API routes ----
  if (pathname.startsWith('/api/')) {
    const corsResponse = handleCorsPreflight(request);
    if (corsResponse) return applySecurityHeaders(corsResponse);
  }

  // ---- Step 2: Rate limiting for API routes ----
  const routeGroup = classifyRoute(pathname);

  if (routeGroup && process.env.RATE_LIMIT_ENABLED !== 'false') {
    const config = RATE_LIMITS[routeGroup];

    let limitResult: { allowed: boolean } | null = null;
    if (config.keyStrategy === 'ip') {
      const ip = getRequestIp(request);
      limitResult = checkIpRateLimit(ip, routeGroup);
    } else if (config.keyStrategy === 'user') {
      const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
      if (token?.sub) {
        limitResult = checkUserRateLimit(token.sub, routeGroup);
      }
    } else {
      const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
      limitResult = checkIpOrUserRateLimit(request, token?.sub ?? null, routeGroup);
    }

    if (limitResult && !limitResult.allowed) {
      return createRateLimitResponse(
        limitResult as import('@/lib/rate-limit').RateLimitResult,
        config,
      );
    }
  }

  // ---- Step 3: Authentication & authorization (existing logic) ----

  // Read the JWT cookie (decoded, not verified — Edge runtime limitation)
  const token = await getToken({
    req: request,
    secret: process.env['NEXTAUTH_SECRET'],
  });

  const permissions: string[] = (token?.permissions as string[]) ?? [];

  // ---- Step 3a: Force password change redirect ----
  const mustChangePassword = (token?.mustChangePassword as boolean) ?? false;
  const isForceChangeRoute =
    pathname.startsWith('/force-change-password') ||
    pathname.startsWith('/api/auth/force-change-password') ||
    pathname.startsWith('/api/auth/signout');

  if (token && mustChangePassword && !isForceChangeRoute) {
    return applySecurityHeaders(
      NextResponse.redirect(new URL('/force-change-password', request.url)),
    );
  }

  // Check role-protected route prefixes
  for (const [prefix, requiredPermission] of Object.entries(ROUTE_PERMISSION_MAP)) {
    if (pathname.startsWith(prefix)) {
      // No session → redirect to login
      if (!token) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname + search);
        return applySecurityHeaders(NextResponse.redirect(loginUrl));
      }

      // Session present but missing required permission → redirect to home
      if (!permissions.includes(requiredPermission)) {
        const forbiddenUrl = new URL('/', request.url);
        forbiddenUrl.searchParams.set('error', 'forbidden');
        return applySecurityHeaders(NextResponse.redirect(forbiddenUrl));
      }

      // Authorised — allow
      return applySecurityHeaders(NextResponse.next());
    }
  }

  // If no role-protected prefix matched, check authentication only
  if (token) {
    return applySecurityHeaders(NextResponse.next());
  }

  // Not authenticated — redirect to login
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('callbackUrl', pathname + search);

  return applySecurityHeaders(NextResponse.redirect(loginUrl));
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - /login (auth pages)
     * - /display/* (public display)
     * - /kiosk/* (public kiosk — NOT /kiosk-config)
     * - /sse-test (SSE test page, dev only)
     * - /sounds/* (public static audio/assets directory)
     * - /uploads/* (uploaded files — logos, etc.)
     * - /images/* (static images — login hero, etc.)
     * - /api/auth/* (auth endpoints)
     * - /api/sse/* (SSE streaming)
     * - /api/tickets/issue (kiosk ticket issuance)
     * - /api/display-boards/snapshot/* (public display snapshot)
     * - /api/health (health check)
     * - /api/_dev/* (development-only routes)
     * - /api/debug/* (development-only debug routes)
     * - _next/static, _next/image, favicon.ico (static assets)
     */
    '/((?!login|display|kiosk(?!-)|sse-test|sounds|uploads|images|api/auth|api/sse|api/tickets/issue|api/display-boards/snapshot|api/health|api/_dev|api/debug|_next/static|_next/image|favicon.ico).*)',
  ],
};

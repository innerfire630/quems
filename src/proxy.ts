// =============================================================================
// src/proxy.ts — Next.js 16 proxy for route protection
// =============================================================================
// Next.js 16 deprecates `middleware.ts` in favor of `proxy.ts`.
// Same API: intercepts matching requests and redirects unauthenticated users.
//
// Two-tier protection:
//   1. Authentication check — redirects to /login if no JWT token.
//   2. Authorization check — redirects to /?error=forbidden if the token
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

export default async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Read the JWT cookie (decoded, not verified — Edge runtime limitation)
  const token = await getToken({
    req: request,
    secret: process.env['NEXTAUTH_SECRET'],
  });

  const permissions: string[] = (token?.permissions as string[]) ?? [];

  // 1. Check role-protected route prefixes
  for (const [prefix, requiredPermission] of Object.entries(ROUTE_PERMISSION_MAP)) {
    if (pathname.startsWith(prefix)) {
      // No session → redirect to login
      if (!token) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname + search);
        return NextResponse.redirect(loginUrl);
      }

      // Session present but missing required permission → redirect to home
      if (!permissions.includes(requiredPermission)) {
        const forbiddenUrl = new URL('/', request.url);
        forbiddenUrl.searchParams.set('error', 'forbidden');
        return NextResponse.redirect(forbiddenUrl);
      }

      // Authorised — allow
      return NextResponse.next();
    }
  }

  // 2. If no role-protected prefix matched, check authentication only
  if (token) {
    return NextResponse.next();
  }

  // Not authenticated — redirect to login
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('callbackUrl', pathname + search);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - /login (auth pages)
     * - /display/* (public display)
     * - /kiosk/* (public kiosk)
     * - /security/* (security screen)
     * - /sse-test (SSE test page, dev only)
     * - /api/auth/* (auth endpoints)
     * - /api/sse/* (SSE streaming)
     * - /api/tickets/issue (kiosk ticket issuance)
     * - /api/health (health check)
     * - /api/_dev/* (development-only routes)
     * - /api/debug/* (development-only debug routes)
     * - _next/static, _next/image, favicon.ico (static assets)
     */
    '/((?!login|display|kiosk|security|sse-test|api/auth|api/sse|api/tickets/issue|api/health|api/_dev|api/debug|_next/static|_next/image|favicon.ico).*)',
  ],
};

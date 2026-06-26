// =============================================================================
// src/proxy.ts — Next.js 16 proxy for route protection
// =============================================================================
// Next.js 16 deprecates `middleware.ts` in favor of `proxy.ts`.
// Same API: intercepts matching requests and redirects unauthenticated users.
//
// IMPORTANT: Checks for the NextAuth session token. Does NOT verify the JWT
// signature (no Prisma/DB access in Edge runtime). Signature verification
// happens server-side in layouts and API routes.
//
// Role checks are NOT performed here — that is Sub-Phase 1.3.2.
// =============================================================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export default async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Check for a valid NextAuth session token
  const token = await getToken({
    req: request,
    secret: process.env['NEXTAUTH_SECRET'],
  });

  // If authenticated, allow through
  if (token) {
    return NextResponse.next();
  }

  // Not authenticated — redirect to login with callbackUrl
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('callbackUrl', pathname + search);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - /login (login page)
     * - /display/* (public display)
     * - /kiosk/* (public kiosk)
     * - /security/* (security screen)
     * - /api/auth/* (auth endpoints)
     * - /api/sse/* (SSE streaming)
     * - /api/tickets/issue (kiosk ticket issuance)
     * - /api/health (health check)
     * - _next/static, _next/image, favicon.ico (static assets)
     */
    '/((?!login|display|kiosk|security|api/auth|api/sse|api/tickets/issue|api/health|_next/static|_next/image|favicon.ico).*)',
  ],
};

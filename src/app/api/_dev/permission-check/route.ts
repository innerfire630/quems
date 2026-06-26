// =============================================================================
// src/app/api/_dev/permission-check/route.ts — Dev guard verification (1.3.2)
// =============================================================================
// Temporary route to exercise the `withPermission` guard end-to-end during
// development. Gated by NODE_ENV so it's invisible in production.
// Will be removed in Phase 5 (production hardening).
//
// Usage (dev only): GET /api/_dev/permission-check
// Requires `user:manage` permission — returns 401 if unauthenticated,
// 403 if authenticated but lacking permission, 200 with session info if OK.
// =============================================================================

import { NextResponse } from 'next/server';
import { withPermission, type GuardedContext } from '@/lib/guards';
import { PERMISSION_USER_MANAGE } from '@/lib/permissions';

async function handler(_req: Request, { session }: GuardedContext): Promise<Response> {
  return NextResponse.json({
    success: true,
    data: {
      message: 'You have user:manage permission.',
      userId: session.user.userId,
      roles: session.user.roles,
      permissions: session.user.permissions,
    },
  });
}

export const GET = async (req: Request) => {
  // Hide in production
  if (process.env['NODE_ENV'] === 'production') {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Not found.' } },
      { status: 404 },
    );
  }

  return withPermission(handler, PERMISSION_USER_MANAGE)(req);
};

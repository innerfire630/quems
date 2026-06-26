// =============================================================================
// src/app/api/auth/debug-session/route.ts — Development-only session inspector
// =============================================================================
// Returns the full session shape so token enrichment can be verified during
// development. Gated by NODE_ENV — returns 403 in production.
// WILL BE REMOVED in Phase 5 (production hardening).
// =============================================================================

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET() {
  if (process.env['NODE_ENV'] === 'production') {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Not available in production' } },
      { status: 403 },
    );
  }

  const session = await auth();

  return NextResponse.json({
    success: true,
    data: { session },
  });
}

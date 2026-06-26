// =============================================================================
// src/app/api/display-boards/snapshot/default/route.ts (3.2.1)
// =============================================================================
// Public GET endpoint that returns the display snapshot for the default board.
// =============================================================================

import { NextResponse } from 'next/server';
import { getDisplaySnapshot } from '@/lib/display-snapshot';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const snapshot = await getDisplaySnapshot(null);

  if (!snapshot.board) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'NOT_FOUND', message: 'No default display board configured.' },
      },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true, data: snapshot });
}

// =============================================================================
// src/app/api/display-boards/snapshot/[boardId]/route.ts (3.2.1)
// =============================================================================
// Public GET endpoint that returns the display snapshot for a specific board.
// =============================================================================

import { NextResponse } from 'next/server';
import { getDisplaySnapshot } from '@/lib/display-snapshot';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ boardId: string }> },
): Promise<NextResponse> {
  const { boardId } = await params;

  // First try the specific board
  const snapshot = await getDisplaySnapshot(boardId);

  // getDisplaySnapshot already handles fallback internally — if boardId
  // wasn't found, it falls back to default with a console.warn.
  // If the default is also null, return 404.
  if (!snapshot.board) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Display board not found and no default configured.' },
      },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true, data: snapshot });
}

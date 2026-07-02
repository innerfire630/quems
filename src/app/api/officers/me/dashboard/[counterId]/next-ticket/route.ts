// =============================================================================
// GET /api/officers/me/dashboard/[counterId]/next-ticket (4.2.3)
// =============================================================================
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { findNextWaitingTicketForCounter, resolveCallingOfficer } from '@/lib/ticket-officer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ counterId: string }> },
): Promise<Response> {
  try {
    const session = await auth();
    if (!session?.user?.userId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } },
        { status: 401 },
      );
    }

    const { counterId } = await params;

    // Verify officer is assigned to this counter
    try {
      await resolveCallingOfficer(session.user.userId, counterId);
    } catch {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Not assigned to this counter.' } },
        { status: 403 },
      );
    }

    const ticket = await findNextWaitingTicketForCounter(counterId);

    return NextResponse.json({ success: true, data: ticket }, { status: 200 });
  } catch (e: unknown) {
    console.error('[dashboard-next-ticket] Error:', e);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
      },
      { status: 500 },
    );
  }
}

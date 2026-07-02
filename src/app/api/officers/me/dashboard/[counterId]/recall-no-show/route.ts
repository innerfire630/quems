// =============================================================================
// POST /api/officers/me/dashboard/[counterId]/recall-no-show
// =============================================================================
// Recalls a no-show ticket and immediately sets it to SERVING status.
// The counter must be IDLE (no active SERVING ticket) to allow recall.
// =============================================================================

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { resolveCallingOfficer, findCurrentServingTicketForCounter } from '@/lib/ticket-officer';
import { recallNoShowTicket } from '@/lib/ticket-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
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
    const body = await req.json();
    const { ticketId } = body as { ticketId?: string };

    if (!ticketId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'ticketId is required.' } },
        { status: 422 },
      );
    }

    // Resolve officer
    const officer = await resolveCallingOfficer(session.user.userId, counterId);

    // Find current serving ticket for auto-complete (passed to recallNoShowTicket for atomic operation)
    const currentTicket = await findCurrentServingTicketForCounter(counterId);
    const autoCompleteId = currentTicket?.status === 'SERVING' ? currentTicket.id : undefined;

    // Recall the no-show ticket (auto-completes current SERVING ticket atomically if needed)
    const result = await recallNoShowTicket({ ticketId, counterId }, officer, autoCompleteId);

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (e: unknown) {
    const err = e as { code?: string; kind?: string; message?: string };

    if (err.code === 'NOT_FOUND') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: err.message ?? 'Ticket not found.' },
        },
        { status: 404 },
      );
    }
    if (
      err.code === 'SERVICE_NOT_ASSIGNED_TO_COUNTER' ||
      err.code === 'COUNTER_INACTIVE' ||
      err.code === 'INVALID_TRANSITION'
    ) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: err.message ?? 'Invalid operation.' },
        },
        { status: 422 },
      );
    }
    if (err.kind === 'OFFICER_NOT_ON_DUTY' || err.kind === 'OFFICER_NOT_ASSIGNED') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: err.message ?? 'Officer not authorized.' },
        },
        { status: 403 },
      );
    }

    console.error('[recall-no-show] Error:', e);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
      },
      { status: 500 },
    );
  }
}

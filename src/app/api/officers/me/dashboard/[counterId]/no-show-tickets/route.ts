// =============================================================================
// GET /api/officers/me/dashboard/[counterId]/no-show-tickets
// =============================================================================
// Returns today's NO_SHOW tickets for services assigned to the counter.
// Used by the No-Show Ticket Recall feature on the officer dashboard.
// =============================================================================

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getCurrentBusinessDate } from '@/lib/ticket-service';
import { mapTicketToDetail } from '@/lib/ticket-service';

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
    const businessDate = getCurrentBusinessDate();

    // Fetch ALL today's NO_SHOW tickets — any counter can recall any no-show ticket
    const tickets = await prisma.ticket.findMany({
      where: {
        status: 'NO_SHOW',
        businessDate,
      },
      include: {
        service: true,
        counter: true,
        calledByOfficer: { include: { user: true } },
        events: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { noShowAt: 'desc' },
    });

    const data = tickets.map((t) => mapTicketToDetail(t as unknown as Record<string, unknown>));

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (e: unknown) {
    console.error('[no-show-tickets] Error:', e);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
      },
      { status: 500 },
    );
  }
}

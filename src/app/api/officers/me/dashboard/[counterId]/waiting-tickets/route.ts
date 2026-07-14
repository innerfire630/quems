// =============================================================================
// GET /api/officers/me/dashboard/[counterId]/waiting-tickets
// =============================================================================
// Returns all WAITING tickets for services assigned to this counter, ordered
// by issuedAt ascending (oldest first). Includes customer info for display.
// =============================================================================

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { resolveCallingOfficer, findAssignedServiceIdsForCounter } from '@/lib/ticket-officer';
import { prisma as db } from '@/lib/db';
import type { TicketListItem } from '@/types/ticket.types';

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

    const serviceIds = await findAssignedServiceIdsForCounter(counterId);
    if (serviceIds.length === 0) {
      return NextResponse.json({ success: true, data: [] }, { status: 200 });
    }

    const tickets = await db.ticket.findMany({
      where: {
        counterId: null,
        status: 'WAITING',
        serviceId: { in: serviceIds },
      },
      orderBy: { issuedAt: 'asc' },
      include: {
        service: { select: { name: true } },
        counter: { select: { name: true } },
      },
    });

    const data: TicketListItem[] = tickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      displayNumber: t.displayNumber,
      serviceId: t.serviceId,
      serviceName: t.service.name,
      counterId: t.counterId,
      counterName: t.counter?.name ?? null,
      status: t.status,
      priority: t.priority,
      waitPosition: t.waitPosition,
      estimatedWaitMinutes: t.estimatedWaitMinutes,
      issuedAt: t.issuedAt.toISOString(),
      calledAt: t.calledAt?.toISOString() ?? null,
      businessDate: t.businessDate.toISOString(),
      customerName: t.customerName,
      customerIdNumber: t.customerIdNumber,
      customerPhone: t.customerPhone,
    }));

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (e: unknown) {
    console.error('[dashboard-waiting-tickets] Error:', e);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
      },
      { status: 500 },
    );
  }
}

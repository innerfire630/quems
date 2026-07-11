// =============================================================================
// src/app/api/tickets/[ticketId]/route.ts — GET /api/tickets/[ticketId] (2.2.1)
// =============================================================================
// Single-ticket detail with full event log. Guarded with PERMISSION_TICKET_VIEW.
// =============================================================================

import { NextResponse } from 'next/server';
import { withPermission } from '@/lib/guards';
import { PERMISSION_TICKET_VIEW } from '@/lib/permissions';
import { prisma as db } from '@/lib/db';
import type { GuardedContext } from '@/lib/guards';
import type { TicketDetail, TicketEventLogEntry } from '@/types/ticket.types';

export const GET = withPermission(
  async (
    _req: Request,
    _ctx: GuardedContext,
    { params }: { params: Promise<{ ticketId: string }> },
  ): Promise<Response> => {
    const { ticketId } = await params;

    const ticket = await db.ticket.findUnique({
      where: { id: ticketId },
      include: {
        service: true,
        counter: true,
        calledByOfficer: { include: { user: true } },
        events: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Ticket not found.' },
        },
        { status: 404 },
      );
    }

    const events: TicketEventLogEntry[] = ticket.events.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      counterId: e.counterId,
      counterName: null,
      officerId: e.officerId,
      officerName: null,
      metadata: e.metadata as Record<string, unknown> | null,
      createdAt: e.createdAt.toISOString(),
    }));

    const data: TicketDetail = {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      displayNumber: ticket.displayNumber,
      serviceId: ticket.serviceId,
      serviceName: ticket.service.name,
      counterId: ticket.counterId,
      counterName: ticket.counter?.name ?? null,
      status: ticket.status,
      priority: ticket.priority,
      waitPosition: ticket.waitPosition,
      estimatedWaitMinutes: ticket.estimatedWaitMinutes,
      issuedAt: ticket.issuedAt.toISOString(),
      calledAt: ticket.calledAt?.toISOString() ?? null,
      businessDate: ticket.businessDate.toISOString(),
      customerPhone: ticket.customerPhone,
      events,
      calledByOfficer: ticket.calledByOfficer
        ? { id: ticket.calledByOfficer.id, name: ticket.calledByOfficer.user.name }
        : null,
    };

    return NextResponse.json({ success: true, data });
  },
  PERMISSION_TICKET_VIEW,
);

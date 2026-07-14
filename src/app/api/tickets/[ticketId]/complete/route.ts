// =============================================================================
// POST /api/tickets/[ticketId]/complete — Complete a serving ticket
// =============================================================================
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { withPermission } from '@/lib/guards';
import { PERMISSION_COUNTER_CALL } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import { broadcastEvent } from '@/lib/events';
import { resolveCallingOfficer } from '@/lib/ticket-officer';
import { transitionTicket } from '@/lib/ticket-state-machine';
import { randomUUID } from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withPermission(async (req: Request) => {
  try {
    const session = await auth();
    if (!session?.user?.userId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } },
        { status: 401 },
      );
    }

    // Extract ticketId from URL
    const url = new URL(req.url);
    const segments = url.pathname.split('/');
    const ticketIdx = segments.indexOf('tickets');
    const ticketId = segments[ticketIdx + 1];

    if (!ticketId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing ticket ID.' } },
        { status: 400 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const { counterId } = body as { counterId?: string };

    if (!counterId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'counterId is required.' } },
        { status: 422 },
      );
    }

    const officer = await resolveCallingOfficer(session.user.userId, counterId);
    const now = new Date();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await prisma.$transaction(async (tx: any) => {
      const ticket = await tx.ticket.findUnique({
        where: { id: ticketId },
        include: { service: true },
      });
      if (!ticket) {
        throw Object.assign(new Error('Ticket not found.'), { code: 'NOT_FOUND' });
      }

      const previousStatus = ticket.status;
      transitionTicket(ticket.status, 'COMPLETE');

      await tx.ticket.update({
        where: { id: ticketId },
        data: { status: 'COMPLETED', completedAt: now },
      });

      await tx.ticketEvent.create({
        data: {
          ticketId,
          eventType: 'COMPLETED',
          counterId: officer.counterId,
          officerId: officer.id,
          metadata: { previousStatus, completedAt: now.toISOString() },
        },
      });

      return { ticket, previousStatus, serviceName: ticket.service.name };
    });

    // Fetch counter name for SSE payload
    const counter = await prisma.counter.findUnique({
      where: { id: officer.counterId },
      select: { name: true, number: true },
    });

    const sseEventId = randomUUID();

    broadcastEvent('global', 'TICKET_SERVED', {
      ticketId: result.ticket.id,
      ticketNumber: result.ticket.ticketNumber,
      serviceId: result.ticket.serviceId,
      serviceName: result.serviceName,
      counterId: officer.counterId,
      counterName: counter?.name ?? '',
      counterNumber: counter?.number ?? 0,
      servedByOfficerId: officer.id,
      servedByOfficerName: officer.userName,
      servedAt: now.toISOString(),
      previousStatus: result.previousStatus,
    });

    broadcastEvent(`counter:${officer.counterId}`, 'TICKET_SERVED', {
      ticketId: result.ticket.id,
      ticketNumber: result.ticket.ticketNumber,
      serviceId: result.ticket.serviceId,
      serviceName: result.serviceName,
      counterId: officer.counterId,
      counterName: counter?.name ?? '',
      counterNumber: counter?.number ?? 0,
      servedByOfficerId: officer.id,
      servedByOfficerName: officer.userName,
      servedAt: now.toISOString(),
      previousStatus: result.previousStatus,
    });

    return NextResponse.json(
      { success: true, data: { sseEventId, previousStatus: result.previousStatus } },
      { status: 200 },
    );
  } catch (e: unknown) {
    const err = e as { code?: string; kind?: string; message?: string };
    const errorCode = err.code ?? err.kind;
    if (errorCode === 'NOT_FOUND') {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: err.message } },
        { status: 404 },
      );
    }
    if (errorCode === 'INVALID_TRANSITION') {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: err.message } },
        { status: 422 },
      );
    }
    if (errorCode === 'OFFICER_NOT_ASSIGNED' || errorCode === 'OFFICER_NOT_ON_DUTY') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: err.message } },
        { status: 403 },
      );
    }
    console.error('[complete] Error:', e);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
      },
      { status: 500 },
    );
  }
}, PERMISSION_COUNTER_CALL);

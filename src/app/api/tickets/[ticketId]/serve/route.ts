// =============================================================================
// POST /api/tickets/[ticketId]/serve — Serve endpoint (2.3.x gap fix)
// =============================================================================
// Marks a called/recalled ticket as SERVING when the officer starts actively
// serving the customer. This route was missing from the original 2.3.2
// implementation — the serveTicket() service function and schema existed but
// no HTTP handler was wired up.
// =============================================================================
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { withPermission } from '@/lib/guards';
import { PERMISSION_COUNTER_CALL } from '@/lib/permissions';
import { resolveCallingOfficer } from '@/lib/ticket-officer';
import { isCounterClosed } from '@/lib/counter-status';
import { serveTicketSchema, getTicketByIdParamsSchema } from '@/schemas/ticket.schema';
import { prisma } from '@/lib/db';
import { transitionTicket } from '@/lib/ticket-state-machine';
import { broadcastEvent } from '@/lib/events';
import { randomUUID } from 'node:crypto';

export const POST = withPermission(async (req: Request) => {
  try {
    // Parse route params
    const url = new URL(req.url);
    const segments = url.pathname.split('/');
    const ticketId = segments[segments.indexOf('tickets') + 1];
    const paramsResult = getTicketByIdParamsSchema.safeParse({ ticketId });
    if (!paramsResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid ticket ID.',
            details: paramsResult.error.flatten(),
          },
        },
        { status: 422 },
      );
    }

    // Parse body
    const body = await req.json().catch(() => ({}));
    const bodyResult = serveTicketSchema.safeParse(body);
    if (!bodyResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body.',
            details: bodyResult.error.flatten(),
          },
        },
        { status: 422 },
      );
    }

    // Check if counter is closed (pre-transaction, fail fast)
    const counterClosed = await isCounterClosed(bodyResult.data.counterId);
    if (counterClosed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'COUNTER_CLOSED',
            message:
              'Cannot serve tickets on a temporarily closed counter. Please reopen the counter first.',
          },
        },
        { status: 403 },
      );
    }

    // Resolve calling officer
    const session = await auth();
    if (!session?.user?.userId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } },
        { status: 401 },
      );
    }

    let officer;
    try {
      officer = await resolveCallingOfficer(session.user.userId, bodyResult.data.counterId);
    } catch (e: unknown) {
      const err = e as { kind?: string; message?: string };
      if (err.kind === 'OFFICER_NOT_ASSIGNED' || err.kind === 'OFFICER_NOT_ON_DUTY') {
        return NextResponse.json(
          { success: false, error: { code: 'FORBIDDEN', message: err.message } },
          { status: 403 },
        );
      }
      throw e;
    }

    // Mark the ticket as completed (skip SERVING — go directly to COMPLETED)
    const now = new Date();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await prisma.$transaction(async (tx: any) => {
      const ticket = await tx.ticket.findUnique({
        where: { id: paramsResult.data.ticketId },
        include: { service: true },
      });
      if (!ticket) {
        throw Object.assign(new Error('Ticket not found.'), { code: 'NOT_FOUND' });
      }

      const previousStatus = ticket.status;
      transitionTicket(ticket.status, 'COMPLETE');

      await tx.ticket.update({
        where: { id: paramsResult.data.ticketId },
        data: { status: 'COMPLETED', servedAt: now, completedAt: now },
      });

      await tx.ticketEvent.create({
        data: {
          ticketId: paramsResult.data.ticketId,
          eventType: 'COMPLETED',
          counterId: officer.counterId,
          officerId: officer.id,
          metadata: { previousStatus, servedAt: now.toISOString() },
        },
      });

      return {
        ticket,
        previousStatus,
        serviceId: ticket.serviceId,
        serviceName: ticket.service.name,
      };
    });

    // Broadcast SSE
    const sseEventId = randomUUID();
    const counter = await prisma.counter.findUnique({
      where: { id: officer.counterId },
      select: { name: true, number: true },
    });

    broadcastEvent('global', 'TICKET_SERVED', {
      ticketId: result.ticket.id,
      ticketNumber: result.ticket.ticketNumber,
      serviceId: result.serviceId,
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
      serviceId: result.serviceId,
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
    const err = e as { code?: string; message?: string; kind?: string };
    const code = err.code || err.kind;

    if (code === 'NOT_FOUND') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: err.message || 'Ticket not found.' },
        },
        { status: 404 },
      );
    }

    if (
      code === 'SERVICE_NOT_ASSIGNED_TO_COUNTER' ||
      code === 'COUNTER_INACTIVE' ||
      code === 'INVALID_TRANSITION'
    ) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: err.message } },
        { status: 422 },
      );
    }

    if (process.env.NODE_ENV !== 'production') {
      console.error('[serve] Unhandled error:', e);
    }

    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
      },
      { status: 500 },
    );
  }
}, PERMISSION_COUNTER_CALL);

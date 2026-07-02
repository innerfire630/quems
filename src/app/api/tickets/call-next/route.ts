// =============================================================================
// POST /api/tickets/call-next — Call-Next endpoint (2.3.2)
// =============================================================================
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { withPermission } from '@/lib/guards';
import { PERMISSION_COUNTER_CALL } from '@/lib/permissions';
import {
  resolveCallingOfficer,
  findNextWaitingTicketForCounter,
  findCurrentServingTicketForCounter,
} from '@/lib/ticket-officer';
import { isCounterClosed } from '@/lib/counter-status';
import { callNextTicketSchema } from '@/schemas/ticket.schema';
import { prisma } from '@/lib/db';
import { broadcastEvent } from '@/lib/events';
import { transitionTicket } from '@/lib/ticket-state-machine';
import { randomUUID } from 'node:crypto';

export const POST = withPermission(async (req: Request) => {
  try {
    // Parse body
    const body = await req.json().catch(() => ({}));
    const bodyResult = callNextTicketSchema.safeParse(body);
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
              'Cannot call the next ticket on a temporarily closed counter. Please reopen the counter first.',
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

    // Find the next waiting ticket
    const nextTicket = await findNextWaitingTicketForCounter(
      bodyResult.data.counterId,
      bodyResult.data.serviceId,
    );

    if (!nextTicket) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'No waiting ticket for this counter.' },
        },
        { status: 404 },
      );
    }

    // Auto-complete + call next in a single transaction
    const now = new Date();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Auto-complete any currently SERVING ticket
      const currentTicket = await findCurrentServingTicketForCounter(bodyResult.data.counterId);
      if (currentTicket && currentTicket.status === 'SERVING') {
        transitionTicket(currentTicket.status, 'COMPLETE');
        await tx.ticket.update({
          where: { id: currentTicket.id },
          data: { status: 'COMPLETED', completedAt: now },
        });
        await tx.ticketEvent.create({
          data: {
            ticketId: currentTicket.id,
            eventType: 'COMPLETED',
            counterId: officer.counterId,
            officerId: officer.id,
            metadata: { previousStatus: 'SERVING', completedAt: now.toISOString() },
          },
        });
      }

      // 2. Call the next waiting ticket
      const ticket = await tx.ticket.findUnique({
        where: { id: nextTicket.id },
        include: { service: true },
      });
      if (!ticket) {
        throw Object.assign(new Error('Ticket not found.'), { code: 'NOT_FOUND' });
      }

      transitionTicket(ticket.status, 'CALL');

      await tx.ticket.update({
        where: { id: nextTicket.id },
        data: {
          status: 'CALLED',
          calledAt: now,
          counterId: officer.counterId,
          calledByOfficerId: officer.id,
        },
      });

      await tx.ticketEvent.create({
        data: {
          ticketId: nextTicket.id,
          eventType: 'CALLED',
          counterId: officer.counterId,
          officerId: officer.id,
          metadata: { previousStatus: ticket.status, calledAt: now.toISOString() },
        },
      });

      const fullTicket = await tx.ticket.findUniqueOrThrow({
        where: { id: nextTicket.id },
        include: {
          service: true,
          counter: true,
          calledByOfficer: { include: { user: true } },
          events: { orderBy: { createdAt: 'asc' } },
        },
      });

      return {
        fullTicket,
        previousStatus: ticket.status,
        counter: fullTicket.counter,
        service: fullTicket.service,
        completedCurrentTicket:
          currentTicket && currentTicket.status === 'SERVING' ? currentTicket : null,
      };
    });

    // Broadcast SSE events AFTER transaction commits
    const sseEventId = randomUUID();

    // Broadcast completion of previous ticket if it was auto-completed
    if (result.completedCurrentTicket) {
      broadcastEvent('global', 'TICKET_SERVED', {
        ticketId: result.completedCurrentTicket.id,
        ticketNumber: result.completedCurrentTicket.ticketNumber,
        serviceId: result.completedCurrentTicket.serviceId,
        serviceName: result.completedCurrentTicket.serviceName,
        counterId: officer.counterId,
        counterName: result.counter?.name ?? '',
        counterNumber: result.counter?.number ?? 0,
        servedByOfficerId: officer.id,
        servedByOfficerName: officer.userName,
        servedAt: now.toISOString(),
        previousStatus: 'SERVING',
      });
    }

    // Broadcast the new call
    broadcastEvent('global', 'TICKET_CALLED', {
      ticketId: result.fullTicket.id,
      ticketNumber: result.fullTicket.ticketNumber,
      serviceId: result.fullTicket.serviceId,
      serviceName: result.service.name,
      counterId: officer.counterId,
      counterName: result.counter?.name ?? '',
      counterNumber: result.counter?.number ?? 0,
      calledByOfficerId: officer.id,
      calledByOfficerName: officer.userName,
      calledAt: result.fullTicket.calledAt?.toISOString() ?? '',
      previousStatus: result.previousStatus,
    });

    broadcastEvent(`counter:${officer.counterId}`, 'TICKET_CALLED', {
      ticketId: result.fullTicket.id,
      ticketNumber: result.fullTicket.ticketNumber,
      serviceId: result.fullTicket.serviceId,
      serviceName: result.service.name,
      counterId: officer.counterId,
      counterName: result.counter?.name ?? '',
      counterNumber: result.counter?.number ?? 0,
      calledByOfficerId: officer.id,
      calledByOfficerName: officer.userName,
      calledAt: result.fullTicket.calledAt?.toISOString() ?? '',
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
      console.error('[call-next] Unhandled error:', e);
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

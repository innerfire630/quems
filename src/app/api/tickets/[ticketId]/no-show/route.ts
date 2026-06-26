// =============================================================================
// POST /api/tickets/[ticketId]/no-show — No-Show endpoint (2.3.2)
// =============================================================================
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { withPermission } from '@/lib/guards';
import { PERMISSION_COUNTER_CALL } from '@/lib/permissions';
import { noShowTicket } from '@/lib/ticket-service';
import { resolveCallingOfficer } from '@/lib/ticket-officer';
import { isCounterClosed } from '@/lib/counter-status';
import { incrementServiceCounter } from '@/lib/analytics-service';
import {
  getAutoAdvanceEnabled,
  getNoShowGracePeriodSeconds,
  advanceToNextWaitingTicket,
} from '@/lib/ticket-advance';
import { noShowTicketSchema, getTicketByIdParamsSchema } from '@/schemas/ticket.schema';
import type { TicketListItem } from '@/types/ticket.types';

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
    const bodyResult = noShowTicketSchema.safeParse(body);
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
              'Cannot mark tickets as no-show on a temporarily closed counter. Please reopen the counter first.',
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

    // Read settings
    const gracePeriodSeconds = await getNoShowGracePeriodSeconds();

    // No-show the ticket
    const result = await noShowTicket(
      { ticketId: paramsResult.data.ticketId, counterId: bodyResult.data.counterId },
      officer,
      gracePeriodSeconds,
    );

    // Increment in-memory analytics counter (best-effort, post-commit)
    incrementServiceCounter(result.serviceId, 'NO_SHOW');

    // Auto-advance (after the no-show transaction commits)
    const autoAdvanceEnabled = await getAutoAdvanceEnabled();
    if (autoAdvanceEnabled) {
      const advanceResult = await advanceToNextWaitingTicket(
        result.serviceId,
        officer.counterId,
        officer,
      );

      if (advanceResult.ticket) {
        const summary: TicketListItem = {
          id: advanceResult.ticket.id,
          ticketNumber: advanceResult.ticket.ticketNumber,
          displayNumber: advanceResult.ticket.displayNumber,
          serviceId: advanceResult.ticket.serviceId,
          serviceName: advanceResult.ticket.serviceName,
          counterId: advanceResult.ticket.counterId,
          counterName: advanceResult.ticket.counterName,
          status: advanceResult.ticket.status,
          priority: advanceResult.ticket.priority,
          waitPosition: advanceResult.ticket.waitPosition,
          estimatedWaitMinutes: advanceResult.ticket.estimatedWaitMinutes,
          issuedAt: advanceResult.ticket.issuedAt,
          businessDate: advanceResult.ticket.businessDate,
          customerPhone: advanceResult.ticket.customerPhone,
        };
        result.autoAdvanced = true;
        result.autoAdvancedTicket = summary;
      }
    }

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (e: unknown) {
    const err = e as {
      code?: string;
      message?: string;
      kind?: string;
      elapsedSeconds?: number;
      requiredSeconds?: number;
    };
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
      code === 'INVALID_TRANSITION' ||
      code === 'GRACE_PERIOD_NOT_ELAPSED'
    ) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: err.message } },
        { status: 422 },
      );
    }

    if (process.env.NODE_ENV !== 'production') {
      console.error('[no-show] Unhandled error:', e);
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

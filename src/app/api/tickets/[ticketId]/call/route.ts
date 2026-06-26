// =============================================================================
// POST /api/tickets/[ticketId]/call — Call endpoint (2.3.1)
// =============================================================================
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { withPermission } from '@/lib/guards';
import { PERMISSION_COUNTER_CALL } from '@/lib/permissions';
import { callTicket } from '@/lib/ticket-service';
import { resolveCallingOfficer } from '@/lib/ticket-officer';
import { callTicketSchema, getTicketByIdParamsSchema } from '@/schemas/ticket.schema';

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
    const bodyResult = callTicketSchema.safeParse(body);
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

    // Call the ticket
    const result = await callTicket(
      { ticketId: paramsResult.data.ticketId, counterId: bodyResult.data.counterId },
      officer,
    );

    return NextResponse.json({ success: true, data: result }, { status: 200 });
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
      console.error('[call] Unhandled error:', e);
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

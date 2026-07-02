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
import { serveTicket } from '@/lib/ticket-service';
import { resolveCallingOfficer } from '@/lib/ticket-officer';
import { isCounterClosed } from '@/lib/counter-status';
import { incrementServiceCounter } from '@/lib/analytics-service';
import { serveTicketSchema, getTicketByIdParamsSchema } from '@/schemas/ticket.schema';

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

    // Mark the ticket as served
    const result = await serveTicket(
      { ticketId: paramsResult.data.ticketId, counterId: bodyResult.data.counterId },
      officer,
    );

    // Increment in-memory analytics counter (best-effort, post-commit)
    incrementServiceCounter(result.serviceId, 'SERVED');

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

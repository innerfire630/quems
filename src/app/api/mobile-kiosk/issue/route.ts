// =============================================================================
// src/app/api/mobile-kiosk/issue/route.ts — POST /api/mobile-kiosk/issue
// =============================================================================
// Public endpoint for mobile kiosk ticket issuance.
// Same logic as /api/tickets/issue but designed for mobile self-service.
// No auth required.
// =============================================================================

import { NextResponse } from 'next/server';
import { issueTicket } from '@/lib/ticket-service';
import { incrementServiceCounter } from '@/lib/analytics-service';
import { issueTicketSchema } from '@/schemas/ticket.schema';

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON body.' } },
      { status: 422 },
    );
  }

  const parsed = issueTicketSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed.',
          details: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 422 },
    );
  }

  try {
    const data = await issueTicket(parsed.data);
    incrementServiceCounter(parsed.data.serviceId, 'ISSUED');

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err: unknown) {
    const error = err as Error & { code?: string };

    if (error.code === 'NOT_FOUND') {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: error.message } },
        { status: 404 },
      );
    }

    if (error.code === 'VALIDATION_ERROR') {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: error.message } },
        { status: 422 },
      );
    }

    if (error.code === 'DUPLICATE_TICKET') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DUPLICATE_TICKET',
            message: error.message,
            existingTicketId: (error as Error & { existingTicketId?: string }).existingTicketId,
          },
        },
        { status: 409 },
      );
    }

    console.error('[api/mobile-kiosk/issue]', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
      },
      { status: 500 },
    );
  }
}

// =============================================================================
// src/app/api/mobile-kiosk/recover/route.ts — POST /api/mobile-kiosk/recover
// =============================================================================
// Public endpoint for session recovery. Finds active tickets by phone number.
// No auth required.
// =============================================================================

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma as db } from '@/lib/db';

const recoverSchema = z.object({
  customerPhone: z
    .string()
    .min(1, 'Phone number is required.')
    .regex(/^0\d{9}$/, 'Phone number must be 10 digits starting with 0 (e.g. 07########).'),
});

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

  const parsed = recoverSchema.safeParse(body);
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

  const { customerPhone } = parsed.data;

  // Find active tickets (WAITING or CALLED) for this phone number
  const activeTickets = await db.ticket.findMany({
    where: {
      customerPhone,
      status: { in: ['WAITING', 'CALLED'] as const },
    },
    select: {
      id: true,
      ticketNumber: true,
      displayNumber: true,
      status: true,
      service: { select: { name: true } },
      issuedAt: true,
    },
    orderBy: { issuedAt: 'desc' },
  });

  if (activeTickets.length === 0) {
    return NextResponse.json({
      success: true,
      data: {
        found: false,
        message: 'No active ticket found for this number. Please generate a new ticket.',
      },
    });
  }

  // Return the most recent active ticket
  const ticket = activeTickets[0];

  return NextResponse.json({
    success: true,
    data: {
      found: true,
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        displayNumber: ticket.displayNumber,
        status: ticket.status,
        serviceName: ticket.service.name,
        issuedAt: ticket.issuedAt.toISOString(),
      },
    },
  });
}

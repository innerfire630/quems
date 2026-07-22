// =============================================================================
// src/app/api/chat/messages/route.ts — POST /api/chat/messages
// =============================================================================
// Public endpoint for customers to send chat messages.
// No auth required — authenticated via ticketId + senderType.
// Staff messages use the guarded /api/chat/messages/staff route instead.
// =============================================================================

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma as db } from '@/lib/db';

const sendMessageSchema = z.object({
  ticketId: z.string().min(1, 'Ticket ID is required.'),
  message: z
    .string()
    .min(1, 'Message cannot be empty.')
    .max(500, 'Message too long (max 500 chars).'),
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

  const parsed = sendMessageSchema.safeParse(body);
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

  const { ticketId, message } = parsed.data;

  // Verify ticket exists and is in an active state (WAITING or CALLED)
  const ticket = await db.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true, status: true },
  });

  if (!ticket) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Ticket not found.' } },
      { status: 404 },
    );
  }

  if (ticket.status !== 'WAITING' && ticket.status !== 'CALLED') {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'TICKET_INACTIVE',
          message: 'Chat is only available for active tickets (Waiting or Called).',
        },
      },
      { status: 403 },
    );
  }

  const chatMessage = await db.chatMessage.create({
    data: {
      ticketId,
      senderType: 'CUSTOMER',
      message,
    },
  });

  // Broadcast SSE event for real-time updates
  try {
    const { broadcastEvent } = await import('@/lib/events');
    await broadcastEvent('global', 'CUSTOMER_CHAT_MESSAGE', {
      id: chatMessage.id,
      ticketId: chatMessage.ticketId,
      senderType: chatMessage.senderType,
      message: chatMessage.message,
      createdAt: chatMessage.createdAt.toISOString(),
    });
  } catch {
    // Best-effort — don't fail the request if SSE fails
  }

  return NextResponse.json(
    {
      success: true,
      data: {
        id: chatMessage.id,
        ticketId: chatMessage.ticketId,
        senderType: chatMessage.senderType,
        message: chatMessage.message,
        createdAt: chatMessage.createdAt.toISOString(),
      },
    },
    { status: 201 },
  );
}

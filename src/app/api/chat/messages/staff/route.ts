// =============================================================================
// src/app/api/chat/messages/staff/route.ts — POST /api/chat/messages/staff
// =============================================================================
// Guarded endpoint for staff to send chat messages.
// Requires PERMISSION_CHAT_SEND.
// =============================================================================

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/lib/guards';
import { PERMISSION_CHAT_SEND } from '@/lib/permissions';
import { prisma as db } from '@/lib/db';
import type { GuardedContext } from '@/lib/guards';

const staffMessageSchema = z.object({
  ticketId: z.string().min(1, 'Ticket ID is required.'),
  message: z
    .string()
    .min(1, 'Message cannot be empty.')
    .max(500, 'Message too long (max 500 chars).'),
});

export const POST = withPermission(async (req: Request, ctx: GuardedContext): Promise<Response> => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON body.' } },
      { status: 422 },
    );
  }

  const parsed = staffMessageSchema.safeParse(body);
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

  // Verify ticket exists
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

  const chatMessage = await db.chatMessage.create({
    data: {
      ticketId,
      senderType: 'STAFF',
      message,
    },
  });

  // Broadcast SSE event
  try {
    const { broadcastEvent } = await import('@/lib/events');
    await broadcastEvent('global', 'STAFF_CHAT_MESSAGE', {
      id: chatMessage.id,
      ticketId: chatMessage.ticketId,
      senderType: chatMessage.senderType,
      message: chatMessage.message,
      staffName: ctx.session.user.name ?? 'Staff',
      createdAt: chatMessage.createdAt.toISOString(),
    });
  } catch {
    // Best-effort
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
}, PERMISSION_CHAT_SEND);

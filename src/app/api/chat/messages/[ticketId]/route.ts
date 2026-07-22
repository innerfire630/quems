// =============================================================================
// src/app/api/chat/messages/[ticketId]/route.ts — GET /api/chat/messages/[ticketId]
// =============================================================================
// Public endpoint to retrieve chat messages for a ticket.
// No auth required — ticket ID is the access key.
// =============================================================================

import { NextResponse } from 'next/server';
import { prisma as db } from '@/lib/db';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ticketId: string }> },
): Promise<Response> {
  const { ticketId } = await params;

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

  const messages = await db.chatMessage.findMany({
    where: { ticketId },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({
    success: true,
    data: {
      ticketId,
      ticketStatus: ticket.status,
      messages: messages.map((m) => ({
        id: m.id,
        senderType: m.senderType,
        message: m.message,
        createdAt: m.createdAt.toISOString(),
      })),
    },
  });
}

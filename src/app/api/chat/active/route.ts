// =============================================================================
// src/app/api/chat/active/route.ts — GET /api/chat/active
// =============================================================================
// Guarded endpoint for staff to list active chats.
// Returns tickets with chat messages, grouped by ticket.
// Requires PERMISSION_CHAT_READ.
// =============================================================================

import { NextResponse } from 'next/server';
import { withPermission } from '@/lib/guards';
import { PERMISSION_CHAT_READ } from '@/lib/permissions';
import { prisma as db } from '@/lib/db';
import type { GuardedContext } from '@/lib/guards';

export const GET = withPermission(
  async (_req: Request, _ctx: GuardedContext): Promise<Response> => {
    // Find tickets that have chat messages and are active (WAITING or CALLED)
    const ticketsWithChats = await db.ticket.findMany({
      where: {
        chatMessages: { some: {} },
        status: { in: ['WAITING', 'CALLED'] as const },
      },
      select: {
        id: true,
        ticketNumber: true,
        displayNumber: true,
        customerName: true,
        customerPhone: true,
        status: true,
        service: { select: { name: true } },
        chatMessages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            message: true,
            senderType: true,
            createdAt: true,
          },
        },
        _count: { select: { chatMessages: true } },
      },
      orderBy: { issuedAt: 'desc' },
    });

    const data = ticketsWithChats.map((t) => ({
      ticketId: t.id,
      ticketNumber: t.ticketNumber,
      displayNumber: t.displayNumber,
      customerName: t.customerName,
      customerPhone: t.customerPhone,
      status: t.status,
      serviceName: t.service.name,
      lastMessage: t.chatMessages[0]
        ? {
            message: t.chatMessages[0].message,
            senderType: t.chatMessages[0].senderType,
            createdAt: t.chatMessages[0].createdAt.toISOString(),
          }
        : null,
      messageCount: t._count.chatMessages,
    }));

    return NextResponse.json({ success: true, data });
  },
  PERMISSION_CHAT_READ,
);

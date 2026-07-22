// =============================================================================
// src/app/api/chat/archived/route.ts — GET /api/chat/archived
// =============================================================================
// Guarded endpoint for staff to list archived chats.
// Returns tickets with chat messages that are no longer active.
// Requires PERMISSION_CHAT_READ.
// =============================================================================

import { NextResponse } from 'next/server';
import { withPermission } from '@/lib/guards';
import { PERMISSION_CHAT_READ } from '@/lib/permissions';
import { prisma as db } from '@/lib/db';
import type { GuardedContext } from '@/lib/guards';
import type { TicketStatus } from '@prisma/client';

export const GET = withPermission(async (req: Request, _ctx: GuardedContext): Promise<Response> => {
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') ?? '20', 10)));

  const archivedStatuses: TicketStatus[] = [
    'SERVING',
    'COMPLETED',
    'NO_SHOW',
    'CANCELLED',
    'TRANSFERRED',
  ];

  const where = {
    chatMessages: { some: {} },
    status: { in: archivedStatuses },
  };

  const [tickets, total] = await Promise.all([
    db.ticket.findMany({
      where,
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
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.ticket.count({ where }),
  ]);

  const data = tickets.map((t) => ({
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

  return NextResponse.json({
    success: true,
    data: {
      items: data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
}, PERMISSION_CHAT_READ);

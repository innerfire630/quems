// =============================================================================
// src/app/api/tickets/route.ts — GET /api/tickets (2.2.1)
// =============================================================================
// Paginated queue list. Guarded with PERMISSION_TICKET_VIEW.
// Supports filtering by serviceId, counterId, status, and businessDate.
// =============================================================================

import { NextResponse } from 'next/server';
import { withPermission } from '@/lib/guards';
import { PERMISSION_TICKET_VIEW } from '@/lib/permissions';
import { listTicketsQuerySchema } from '@/schemas/ticket.schema';
import { prisma as db } from '@/lib/db';
import type { GuardedContext } from '@/lib/guards';
import type { TicketListItem, TicketListMeta } from '@/types/ticket.types';

export const GET = withPermission(async (req: Request, _ctx: GuardedContext): Promise<Response> => {
  const url = new URL(req.url);
  const rawParams = Object.fromEntries(url.searchParams.entries());

  const parsed = listTicketsQuerySchema.safeParse(rawParams);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters.',
          details: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 422 },
    );
  }

  const { page, limit, serviceId, counterId, status, businessDate } = parsed.data;

  const where: Record<string, unknown> = {};
  if (serviceId) where.serviceId = serviceId;
  if (counterId) where.counterId = counterId;
  if (status) where.status = status;
  if (businessDate) {
    where.businessDate = new Date(`${businessDate}T00:00:00.000Z`);
  }

  const [tickets, total] = await Promise.all([
    db.ticket.findMany({
      where,
      include: { service: { select: { name: true } }, counter: { select: { name: true } } },
      orderBy: { issuedAt: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.ticket.count({ where }),
  ]);

  const data: TicketListItem[] = tickets.map((t: (typeof tickets)[number]) => ({
    id: t.id,
    ticketNumber: t.ticketNumber,
    displayNumber: t.displayNumber,
    serviceId: t.serviceId,
    serviceName: t.service.name,
    counterId: t.counterId,
    counterName: t.counter?.name ?? null,
    status: t.status,
    priority: t.priority,
    waitPosition: t.waitPosition,
    estimatedWaitMinutes: t.estimatedWaitMinutes,
    issuedAt: t.issuedAt.toISOString(),
    calledAt: t.calledAt?.toISOString() ?? null,
    businessDate: t.businessDate.toISOString(),
    customerPhone: t.customerPhone,
  }));

  const meta: TicketListMeta = {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };

  return NextResponse.json({ success: true, data, meta });
}, PERMISSION_TICKET_VIEW);

// =============================================================================
// GET /api/overview/stats — Live stats for the overview page
// =============================================================================
// Returns current ticket counts (ticketsToday, waitingTickets, servingTickets)
// so the LiveStats component can periodically correct any SSE drift.
// =============================================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withPermission, type GuardedContext } from '@/lib/guards';
import { PERMISSION_TICKET_VIEW } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

const GET = withPermission(
  async (_req: Request, _ctx: GuardedContext): Promise<Response> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [ticketsToday, waitingTickets, servingTickets] = await Promise.all([
      prisma.ticket.count({ where: { businessDate: { gte: today } } }),
      prisma.ticket.count({ where: { businessDate: { gte: today }, status: 'WAITING' } }),
      prisma.ticket.count({
        where: {
          businessDate: { gte: today },
          status: { in: ['CALLED', 'RECALLED', 'SERVING'] },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: { ticketsToday, waitingTickets, servingTickets },
    });
  },
  PERMISSION_TICKET_VIEW,
);

export { GET };

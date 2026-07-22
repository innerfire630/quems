// =============================================================================
// src/app/ticket/[ticketId]/page.tsx — Mobile Ticket Display
// =============================================================================
// Public page showing ticket status and live chat widget.
// No auth required — ticket ID is the access key.
// =============================================================================

import { notFound } from 'next/navigation';
import { prisma as db } from '@/lib/db';
import { getSystemBrand } from '@/lib/cached-data';
import { TicketDisplayClient } from './_components/ticket-display-client';

interface TicketPageProps {
  params: Promise<{ ticketId: string }>;
}

export default async function TicketPage({ params }: TicketPageProps) {
  const { ticketId } = await params;

  const ticket = await db.ticket.findUnique({
    where: { id: ticketId },
    include: {
      service: { select: { name: true, code: true } },
      counter: { select: { name: true, number: true } },
    },
  });

  if (!ticket) {
    notFound();
  }

  // Count tickets ahead in queue (same service, WAITING, issued before this one)
  const ticketsAhead = await db.ticket.count({
    where: {
      serviceId: ticket.serviceId,
      status: 'WAITING',
      businessDate: ticket.businessDate,
      issuedAt: { lt: ticket.issuedAt },
    },
  });

  const [brand] = await Promise.all([getSystemBrand()]);

  return (
    <TicketDisplayClient
      ticket={{
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        displayNumber: ticket.displayNumber,
        status: ticket.status,
        customerName: ticket.customerName,
        serviceName: ticket.service.name,
        serviceCode: ticket.service.code,
        counterName: ticket.counter?.name ?? null,
        counterNumber: ticket.counter?.number ?? null,
        waitPosition: ticket.waitPosition,
        estimatedWaitMinutes: ticket.estimatedWaitMinutes,
        issuedAt: ticket.issuedAt.toISOString(),
        calledAt: ticket.calledAt?.toISOString() ?? null,
      }}
      ticketsAhead={ticketsAhead}
      brandName={brand.name}
    />
  );
}

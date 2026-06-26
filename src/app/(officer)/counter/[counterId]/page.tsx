// =============================================================================
// src/app/(officer)/counter/[counterId]/page.tsx — Temporary stub page (2.3.2)
// =============================================================================
// Displays the current serving ticket and the TicketActionPanel for a counter.
// This is a TEMPORARY page — replaced by Phase 4.2.3's full dashboard layout.
// =============================================================================

import { prisma as db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { findCurrentServingTicketForCounter } from '@/lib/ticket-officer';
import { TicketBadge } from '@/components/shared/ticket-badge';
import { StatusChip } from '@/components/shared/status-chip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TicketActionPanelClient from './_client';

interface PageProps {
  params: Promise<{ counterId: string }>;
}

export default async function OfficerCounterPage({ params }: PageProps) {
  const { counterId } = await params;

  // Auth guard
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  // Check counter:read permission
  const userPermissions = session.user.permissions as string[] | undefined;
  const hasCounterRead = userPermissions?.includes('counter:read');
  if (!hasCounterRead) {
    redirect('/?error=forbidden');
  }

  // Fetch counter
  const counter = await db.counter.findUnique({
    where: { id: counterId },
    include: { services: { include: { service: true } } },
  });

  if (!counter || !counter.isActive) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h1 className="text-2xl font-bold">Counter Unavailable</h1>
        <p className="text-muted-foreground mt-2">
          This counter does not exist or is not currently active.
        </p>
      </div>
    );
  }

  // Check if user is on duty at this counter
  const officer = await db.counterOfficer.findUnique({
    where: {
      userId_counterId: {
        userId: session.user.userId as string,
        counterId,
      },
    },
  });

  const isOnDuty = officer?.isOnDuty ?? false;

  // Fetch current serving ticket
  const currentTicket = await findCurrentServingTicketForCounter(counterId);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{counter.name || `Counter ${counter.number}`}</h1>
          <p className="text-sm text-muted-foreground">
            Number {counter.number}
            {counter.displayLabel && ` · ${counter.displayLabel}`}
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
            isOnDuty
              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
              : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
          }`}
        >
          {isOnDuty ? 'On Duty' : 'Not On Duty'}
        </span>
      </div>

      {/* Assigned Services */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Assigned Services</CardTitle>
        </CardHeader>
        <CardContent>
          {counter.services.length === 0 ? (
            <p className="text-sm text-muted-foreground">No services assigned.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {counter.services.map((cs) => (
                <span
                  key={cs.serviceId}
                  className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium"
                >
                  {cs.service.name}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Ticket */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Current Ticket</CardTitle>
        </CardHeader>
        <CardContent>
          {currentTicket ? (
            <div className="flex items-center gap-4">
              <TicketBadge ticketNumber={currentTicket.ticketNumber} size="lg" />
              <StatusChip status={currentTicket.status} />
              <span className="text-sm text-muted-foreground">{currentTicket.serviceName}</span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No ticket currently being served.</p>
          )}
        </CardContent>
      </Card>

      {/* Action Panel — client component */}
      <TicketActionPanelClient
        ticket={currentTicket}
        counterId={counterId}
        officerOnDuty={isOnDuty}
      />
    </div>
  );
}

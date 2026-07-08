// =============================================================================
// src/components/counter/current-serving-ticket-card.tsx — Current ticket (4.2.3)
// =============================================================================
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TicketBadge } from '@/components/shared/ticket-badge';
import { StatusChip } from '@/components/shared/status-chip';
import type { TicketDetail } from '@/types/ticket.types';

interface CurrentServingTicketCardProps {
  ticket: TicketDetail | null;
  counterStatus: 'OPENED' | 'CLOSED';
}

export default function CurrentServingTicketCard({
  ticket,
  counterStatus,
}: CurrentServingTicketCardProps) {
  const isClosed = counterStatus === 'CLOSED';
  const isCalled = ticket?.status === 'CALLED';
  const isRecalled = ticket?.status === 'RECALLED';
  const isServing = ticket?.status === 'SERVING';
  const isCompleted = ticket?.status === 'COMPLETED';

  return (
    <Card className={isClosed ? 'opacity-60' : ''}>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Currently Serving</CardTitle>
      </CardHeader>
      <CardContent>
        {ticket ? (
          isCompleted ? (
            <div className="py-6 text-center space-y-2">
              <span className="text-2xl">✓</span>
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                Served
              </p>
              <p className="text-xs text-muted-foreground">
                {ticket.ticketNumber} — {ticket.serviceName}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className={isRecalled ? 'animate-recall-pulse text-amber-500 dark:text-amber-400' : isCalled ? 'text-blue-600 dark:text-blue-400' : isServing ? 'text-black dark:text-white' : ''}>
                  <TicketBadge ticketNumber={ticket.ticketNumber} size="lg" />
                </span>
                <StatusChip status={ticket.status} />
              </div>
              <p className="text-sm text-muted-foreground">Service: {ticket.serviceName}</p>
            </div>
          )
        ) : (
          <div className="py-6 text-center">
            <p className="text-sm text-muted-foreground">No ticket currently being served</p>
          </div>
        )}
        {isClosed && (
          <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-400">
            Counter is closed
          </p>
        )}
      </CardContent>
    </Card>
  );
}

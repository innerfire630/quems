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

  return (
    <Card className={isClosed ? 'opacity-60' : ''}>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Currently Serving</CardTitle>
      </CardHeader>
      <CardContent>
        {ticket ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <TicketBadge ticketNumber={ticket.ticketNumber} size="lg" />
              <StatusChip status={ticket.status} />
            </div>
            <p className="text-sm text-muted-foreground">Service: {ticket.serviceName}</p>
          </div>
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

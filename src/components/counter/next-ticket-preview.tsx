// =============================================================================
// src/components/counter/next-ticket-preview.tsx — Next ticket preview (4.2.3)
// =============================================================================
'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TicketBadge } from '@/components/shared/ticket-badge';
import { useSSE } from '@/hooks/use-sse';
import type { TicketListItem } from '@/types/ticket.types';
import type { SseEventType } from '@/types/sse.types';

interface NextTicketPreviewProps {
  initialTicket: TicketListItem | null;
  counterId: string;
}

export default function NextTicketPreview({ initialTicket, counterId }: NextTicketPreviewProps) {
  const [ticket, setTicket] = useState<TicketListItem | null>(initialTicket);

  const refreshNextTicket = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/officers/me/dashboard/${encodeURIComponent(counterId)}/next-ticket`,
      );
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setTicket(json.data);
        }
      }
    } catch {
      // Silently fail — the next SSE event will trigger a refresh
    }
  }, [counterId]);

  useSSE(`counter:${counterId}`, {
    filter: ['QUEUE_UPDATED', 'TICKET_CALLED', 'TICKET_RECALLED'] as readonly SseEventType[],
    onEvent: (envelope) => {
      if (envelope.type === 'TICKET_RECALLED') return; // same next ticket
      refreshNextTicket();
    },
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Next Ticket</CardTitle>
      </CardHeader>
      <CardContent>
        {ticket ? (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <TicketBadge ticketNumber={ticket.ticketNumber} size="md" />
            </div>
            <p className="text-sm text-muted-foreground">Service: {ticket.serviceName}</p>
            {ticket.estimatedWaitMinutes != null && (
              <p className="text-xs text-muted-foreground">
                Est. wait: {ticket.estimatedWaitMinutes} min
              </p>
            )}
          </div>
        ) : (
          <div className="py-4 text-center">
            <p className="text-sm text-muted-foreground">No tickets waiting</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

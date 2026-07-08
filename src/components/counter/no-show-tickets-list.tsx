// =============================================================================
// src/components/counter/no-show-tickets-list.tsx — No-Show Recall List
// =============================================================================
// Displays today's no-show tickets for the current counter with a "Recall"
// button. The recall button is disabled when the counter has an active
// SERVING ticket (idle constraint).
// =============================================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RotateCcw, AlertTriangle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useSSE } from '@/hooks/use-sse';
import type { TicketDetail } from '@/types/ticket.types';
import type { SseEventType } from '@/types/sse.types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface NoShowTicketsListProps {
  counterId: string;
  isCounterBusy: boolean; // true when a ticket is currently SERVING
  isOffDuty?: boolean; // true when counter is closed or officer not on duty
  onRecalled: () => void; // callback after successful recall (triggers dashboard refresh)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(isoString: string): string {
  try {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NoShowTicketsList({
  counterId,
  isCounterBusy,
  isOffDuty = false,
  onRecalled,
}: NoShowTicketsListProps) {
  const [tickets, setTickets] = useState<TicketDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [recallingId, setRecallingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch no-show tickets
  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/officers/me/dashboard/${encodeURIComponent(counterId)}/no-show-tickets`,
      );
      if (!res.ok) throw new Error('Failed to load no-show tickets');
      const json = await res.json();
      setTickets(json.data ?? []);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [counterId]);

  // Initial fetch
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(
          `/api/officers/me/dashboard/${encodeURIComponent(counterId)}/no-show-tickets`,
        );
        if (!res.ok) throw new Error('Failed to load no-show tickets');
        const json = await res.json();
        if (!cancelled) {
          setTickets(json.data ?? []);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [counterId]);

  // Auto-refresh when a ticket becomes no-show (via SSE)
  useSSE(`counter:${counterId}`, {
    filter: [
      'TICKET_NO_SHOW',
      'TICKET_SERVED',
      'TICKET_COMPLETED',
      'DAILY_RESET',
    ] as readonly SseEventType[],
    onEvent: (envelope) => {
      if (envelope.type === 'TICKET_NO_SHOW') {
        fetchTickets();
      } else if (envelope.type === 'TICKET_SERVED' || envelope.type === 'TICKET_COMPLETED') {
        // Counter may have become idle — re-fetch so the warning clears
        fetchTickets();
      } else if (envelope.type === 'DAILY_RESET') {
        setTickets([]);
      }
    },
  });

  // Recall a no-show ticket
  const handleRecall = useCallback(
    async (ticketId: string) => {
      setRecallingId(ticketId);
      setError(null);

      try {
        const res = await fetch(
          `/api/officers/me/dashboard/${encodeURIComponent(counterId)}/recall-no-show`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticketId }),
          },
        );
        const json = await res.json();

        if (!res.ok) {
          toast.error(json.error?.message ?? 'Failed to recall ticket');
          setError(json.error?.message ?? 'Failed to recall ticket');
          return;
        }

        toast.success('Ticket recalled and now serving');
        // Remove from local list and notify parent
        setTickets((prev) => prev.filter((t) => t.id !== ticketId));
        onRecalled();
      } catch {
        toast.error('Network error');
        setError('Network error');
      } finally {
        setRecallingId(null);
      }
    },
    [counterId, onRecalled],
  );

  // Loading state
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <RotateCcw className="size-4" />
            No-Show Tickets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Empty state — show a minimal card
  if (tickets.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <RotateCcw className="size-4" />
            No-Show Tickets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No no-show tickets to recall.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <RotateCcw className="size-4" />
          No-Show Tickets
          <Badge variant="secondary" className="ml-auto">
            {tickets.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isOffDuty && (
          <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 p-2 text-xs text-blue-700 dark:border-blue-800/40 dark:bg-blue-950/30 dark:text-blue-400">
            <AlertTriangle className="size-3.5 shrink-0" />
            <span>Open your counter to recall no-show tickets.</span>
          </div>
        )}
        {!isOffDuty && isCounterBusy && (
          <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-400">
            <AlertTriangle className="size-3.5 shrink-0" />
            <span>
              Serve, dismiss, or recall your current ticket before recalling a no-showshow ticket.
            </span>
          </div>
        )}

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="flex items-center justify-between rounded-md border px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium">{ticket.ticketNumber}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {ticket.serviceName}
                  </Badge>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="size-3" />
                  <span>No-show at {formatTime(ticket.calledAt || ticket.issuedAt)}</span>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRecall(ticket.id)}
                disabled={isOffDuty || isCounterBusy || recallingId !== null}
                className="ml-3 shrink-0"
              >
                {recallingId === ticket.id ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="size-3.5" />
                )}
                <span className="ml-1.5">Recall</span>
              </Button>
            </div>
          ))}
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}

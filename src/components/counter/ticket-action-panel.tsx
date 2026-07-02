// =============================================================================
// src/components/counter/ticket-action-panel.tsx — Action Panel (2.3.2 / extended)
// =============================================================================
// Renders Call Next, Call, Recall, Served, and No-Show buttons depending on
// the current ticket status.
// =============================================================================

'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Info } from 'lucide-react';
import { canTransition } from '@/lib/ticket-state-machine';
import type { TicketDetail } from '@/types/ticket.types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TicketActionPanelProps {
  ticket: TicketDetail | null;
  counterId: string;
  officerOnDuty: boolean;
  hasNextTicket: boolean;
  onActionComplete: () => void;
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

type TicketAction = 'call' | 'recall' | 'no-show' | 'serve' | 'complete';

async function apiCall(
  ticketId: string,
  counterId: string,
  action: TicketAction,
): Promise<{ success: boolean; error?: { message: string } }> {
  const res = await fetch(`/api/tickets/${encodeURIComponent(ticketId)}/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ counterId }),
  });
  const json = await res.json();
  if (!res.ok) {
    return { success: false, error: { message: json.error?.message || 'Action failed.' } };
  }
  return { success: true };
}

async function apiCallNext(
  counterId: string,
): Promise<{ success: boolean; error?: { message: string } }> {
  const res = await fetch('/api/tickets/call-next', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ counterId }),
  });
  const json = await res.json();
  if (!res.ok) {
    return { success: false, error: { message: json.error?.message || 'Action failed.' } };
  }
  return { success: true };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TicketActionPanel({
  ticket,
  counterId,
  officerOnDuty,
  hasNextTicket,
  onActionComplete,
}: TicketActionPanelProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAction = useCallback(
    async (action: TicketAction) => {
      if (!ticket) return;
      setLoading(action);
      setError(null);

      const result = await apiCall(ticket.id, counterId, action);
      setLoading(null);

      if (!result.success) {
        setError(result.error?.message ?? 'Action failed.');
        return;
      }

      onActionComplete();
    },
    [ticket, counterId, onActionComplete],
  );

  const handleCallNext = useCallback(async () => {
    setLoading('call-next');
    setError(null);

    const result = await apiCallNext(counterId);
    setLoading(null);

    if (!result.success) {
      setError(result.error?.message ?? 'Action failed.');
      return;
    }

    onActionComplete();
  }, [counterId, onActionComplete]);

  const disabled = !officerOnDuty || loading !== null;
  const callNextDisabled = disabled || !hasNextTicket;

  // --- Officer not on duty: show message to open counter ---
  if (!officerOnDuty) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-800/40 dark:bg-blue-950/30 dark:text-blue-400">
          <Info className="size-4 shrink-0" />
          <span>Open your counter using the toggle on the right to start serving tickets.</span>
        </div>
        <Button disabled className="w-full min-h-[56px] opacity-50">
          Call Next Ticket
        </Button>
      </div>
    );
  }

  // --- No ticket in progress: show "Call Next" ---
  if (!ticket) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {hasNextTicket ? 'No ticket currently being served.' : 'No waiting tickets in the queue.'}
        </p>
        <Button
          onClick={handleCallNext}
          disabled={callNextDisabled}
          className="w-full min-h-[56px]"
        >
          {loading === 'call-next' ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Calling...
            </>
          ) : (
            'Call Next Ticket'
          )}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  // --- Ticket in progress: show all applicable actions ---
  const canCall = canTransition(ticket.status as never, 'CALLED', 'CALL');
  const canRecall = canTransition(ticket.status as never, 'RECALLED', 'RECALL');
  const canServe = canTransition(ticket.status as never, 'SERVING', 'SERVE');
  const canComplete = canTransition(ticket.status as never, 'COMPLETED', 'COMPLETE');
  const canNoShow = canTransition(ticket.status as never, 'NO_SHOW', 'NO_SHOW');
  const isServing = ticket.status === 'SERVING';
  const isRecalled = ticket.status === 'RECALLED';
  const isNoShow = ticket.status === 'NO_SHOW';

  // --- Ticket is SERVING: show Recall, Served, and No-Show ---
  if (isServing) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Currently serving ticket{' '}
          <span className="font-mono font-medium">{ticket.ticketNumber}</span>.
        </p>
        {canRecall && (
          <Button
            onClick={() => handleAction('recall')}
            disabled={disabled}
            variant="outline"
            className="w-full min-h-[48px]"
          >
            {loading === 'recall' ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Recalling...
              </>
            ) : (
              'Recall'
            )}
          </Button>
        )}
        {canComplete && (
          <Button
            onClick={() => handleAction('complete')}
            disabled={disabled}
            className="w-full min-h-[48px]"
          >
            {loading === 'complete' ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Completing...
              </>
            ) : (
              'Served'
            )}
          </Button>
        )}
        {canNoShow && (
          <Button
            onClick={() => handleAction('no-show')}
            disabled={disabled}
            variant="destructive"
            className="w-full min-h-[48px]"
          >
            {loading === 'no-show' ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Marking...
              </>
            ) : (
              'No Show'
            )}
          </Button>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  // --- Ticket is NO_SHOW: show "Call Next Ticket" + recall + re-call ---
  if (isNoShow) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Ticket <span className="font-mono font-medium">{ticket.ticketNumber}</span> marked as
          no-show.
        </p>
        <Button
          onClick={handleCallNext}
          disabled={callNextDisabled}
          className="w-full min-h-[48px]"
        >
          {loading === 'call-next' ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Calling...
            </>
          ) : (
            'Call Next Ticket'
          )}
        </Button>
        {canRecall && (
          <Button
            onClick={() => handleAction('recall')}
            disabled={disabled}
            className="w-full min-h-[48px]"
          >
            {loading === 'recall' ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Recalling...
              </>
            ) : (
              'Recall This Ticket'
            )}
          </Button>
        )}
        {canCall && (
          <Button
            onClick={() => handleAction('call')}
            disabled={disabled || !canCall}
            variant="outline"
            className="w-full min-h-[48px]"
          >
            {loading === 'call' ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Re-calling...
              </>
            ) : (
              'Re-Call This Ticket'
            )}
          </Button>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  // --- Ticket is RECALLED: show Recall, Served, No-Show (same as SERVING) ---
  if (isRecalled) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Ticket <span className="font-mono font-medium">{ticket.ticketNumber}</span> recalled.
        </p>
        {canRecall && (
          <Button
            onClick={() => handleAction('recall')}
            disabled={disabled}
            variant="outline"
            className="w-full min-h-[48px]"
          >
            {loading === 'recall' ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Recalling...
              </>
            ) : (
              'Recall'
            )}
          </Button>
        )}
        {canServe && (
          <Button
            onClick={() => handleAction('serve')}
            disabled={disabled}
            className="w-full min-h-[48px]"
          >
            {loading === 'serve' ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Completing...
              </>
            ) : (
              'Served'
            )}
          </Button>
        )}
        {canNoShow && (
          <Button
            onClick={() => handleAction('no-show')}
            disabled={disabled}
            variant="destructive"
            className="w-full min-h-[48px]"
          >
            {loading === 'no-show' ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Marking...
              </>
            ) : (
              'No Show'
            )}
          </Button>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {canCall && !isRecalled && (
        <Button
          onClick={() => handleAction('call')}
          disabled={disabled || !canCall}
          className="w-full min-h-[48px]"
        >
          {loading === 'call' ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Calling...
            </>
          ) : (
            'Call'
          )}
        </Button>
      )}

      {canRecall && (
        <Button
          onClick={() => handleAction('recall')}
          disabled={disabled || !canRecall}
          variant="outline"
          className="w-full min-h-[48px]"
        >
          {loading === 'recall' ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Recalling...
            </>
          ) : (
            'Recall'
          )}
        </Button>
      )}

      {canServe && (
        <Button
          onClick={() => handleAction('serve')}
          disabled={disabled || !canServe}
          className="w-full min-h-[48px]"
        >
          {loading === 'serve' ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Marking served...
            </>
          ) : (
            'Served'
          )}
        </Button>
      )}

      {canNoShow && (
        <Button
          onClick={() => handleAction('no-show')}
          disabled={disabled || !canNoShow}
          variant="destructive"
          className="w-full min-h-[48px]"
        >
          {loading === 'no-show' ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Marking...
            </>
          ) : (
            'No-Show'
          )}
        </Button>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

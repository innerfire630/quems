// =============================================================================
// src/components/counter/ticket-action-panel.tsx — Temporary Action Panel (2.3.2)
// =============================================================================
// Renders Call, Recall, and No-Show buttons for the current serving ticket,
// or a "Call Next" button when no ticket is in progress.
//
// This is a TEMPORARY component — replaced by Phase 4.2.3's full officer
// dashboard layout.
// =============================================================================

'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { canTransition } from '@/lib/ticket-state-machine';
import type { TicketDetail } from '@/types/ticket.types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TicketActionPanelProps {
  ticket: TicketDetail | null;
  counterId: string;
  officerOnDuty: boolean;
  onActionComplete: () => void;
}

// ---------------------------------------------------------------------------
// API helpers (inline to avoid creating a separate file for the stub)
// ---------------------------------------------------------------------------

async function apiCall(
  ticketId: string,
  counterId: string,
  action: 'call' | 'recall' | 'no-show',
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
  onActionComplete,
}: TicketActionPanelProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAction = useCallback(
    async (action: 'call' | 'recall' | 'no-show') => {
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

  // --- No ticket in progress: show "Call Next" ---
  if (!ticket) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">No ticket currently being served.</p>
        <Button onClick={handleCallNext} disabled={disabled} className="w-full min-h-[56px]">
          {loading === 'call-next' ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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

  // --- Ticket in progress: show Call / Recall / No-Show ---
  const canCall = canTransition(ticket.status as never, 'CALLED', 'CALL');
  const canRecall = canTransition(ticket.status as never, 'RECALLED', 'RECALL');
  const canNoShow = canTransition(ticket.status as never, 'NO_SHOW', 'NO_SHOW');

  return (
    <div className="space-y-3">
      <Button
        onClick={() => handleAction('call')}
        disabled={disabled || !canCall}
        className="w-full min-h-[56px]"
      >
        {loading === 'call' ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Calling...
          </>
        ) : (
          'Call'
        )}
      </Button>

      <Button
        onClick={() => handleAction('recall')}
        disabled={disabled || !canRecall}
        variant="outline"
        className="w-full min-h-[56px]"
      >
        {loading === 'recall' ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Recalling...
          </>
        ) : (
          'Recall'
        )}
      </Button>

      <Button
        onClick={() => handleAction('no-show')}
        disabled={disabled || !canNoShow}
        variant="destructive"
        className="w-full min-h-[56px]"
      >
        {loading === 'no-show' ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Marking...
          </>
        ) : (
          'No-Show'
        )}
      </Button>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

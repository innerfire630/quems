// =============================================================================
// src/components/officer/officer-dashboard-client.tsx — Dashboard wrapper (4.2.3)
// =============================================================================
// Client component that owns the SSE subscription, holds the dashboard state,
// and distributes event updates to sub-components.
// =============================================================================

'use client';

import { useState, useCallback } from 'react';
import { useSSE } from '@/hooks/use-sse';
import { DASHBOARD_EVENT_FILTER } from '@/types/officer-dashboard.types';
import type { OfficerDashboardData } from '@/types/officer-dashboard.types';
import type { TicketListItem, TicketDetail } from '@/types/ticket.types';
import CounterHeader from '@/components/counter/counter-header';
import CurrentServingTicketCard from '@/components/counter/current-serving-ticket-card';
import QueueDepthIndicator from '@/components/counter/queue-depth-indicator';
import NextTicketPreview from '@/components/counter/next-ticket-preview';
import RecentActivityFeed from '@/components/counter/recent-activity-feed';
import CounterStatusToggle from '@/components/counter/counter-status-toggle';
import NotificationToggle from '@/components/counter/notification-toggle';
import TicketActionPanel from '@/components/counter/ticket-action-panel';

interface OfficerDashboardClientProps {
  initialData: OfficerDashboardData;
}

export default function OfficerDashboardClient({ initialData }: OfficerDashboardClientProps) {
  const [data, setData] = useState<OfficerDashboardData>(initialData);

  // Re-fetch both current serving ticket and next ticket
  const refreshDashboard = useCallback(async () => {
    try {
      const [currentRes, nextRes] = await Promise.all([
        fetch(`/api/officers/me/dashboard/${encodeURIComponent(data.counter.id)}/current-ticket`),
        fetch(`/api/officers/me/dashboard/${encodeURIComponent(data.counter.id)}/next-ticket`),
      ]);

      if (currentRes.ok) {
        const json = await currentRes.json();
        if (json.success && json.data) {
          setData((prev) => ({ ...prev, currentServingTicket: json.data as TicketDetail }));
        } else {
          setData((prev) => ({ ...prev, currentServingTicket: null }));
        }
      }

      if (nextRes.ok) {
        const json = await nextRes.json();
        if (json.success && json.data) {
          setData((prev) => ({ ...prev, nextTicket: json.data as TicketListItem }));
        } else {
          setData((prev) => ({ ...prev, nextTicket: null }));
        }
      }
    } catch {
      // Silent
    }
  }, [data.counter.id]);

  // Subscribe to SSE events
  useSSE(`counter:${data.counter.id}`, {
    filter: DASHBOARD_EVENT_FILTER,
    onEvent: (envelope) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = envelope.payload as any;

      switch (envelope.type) {
        case 'TICKET_ISSUED':
          setData((prev) => ({
            ...prev,
            queueDepth: { ...prev.queueDepth, count: prev.queueDepth.count + 1 },
          }));
          break;

        case 'QUEUE_UPDATED':
          if (typeof p['waitingCount'] === 'number') {
            setData((prev) => ({
              ...prev,
              queueDepth: {
                ...prev.queueDepth,
                count: p['waitingCount'] as number,
              },
            }));
          }
          refreshDashboard();
          break;

        case 'TICKET_CALLED':
        case 'TICKET_RECALLED':
          refreshDashboard();
          break;

        case 'TICKET_NO_SHOW':
          setData((prev) => ({ ...prev, currentServingTicket: null }));
          refreshDashboard();
          break;

        case 'TICKET_SERVED':
          refreshDashboard();
          break;

        case 'COUNTER_OPENED':
          setData((prev) => ({
            ...prev,
            officerContext: { ...prev.officerContext, currentStatus: 'OPENED', isOnDuty: true },
          }));
          break;

        case 'COUNTER_CLOSED':
          setData((prev) => ({
            ...prev,
            officerContext: { ...prev.officerContext, currentStatus: 'CLOSED' },
          }));
          break;

        case 'NOTIFICATION_RECEIVED':
          // Visual indicator handled by the recent activity feed
          break;
      }
    },
  });

  const isClosed = data.officerContext.currentStatus === 'CLOSED';

  return (
    <div className="space-y-6">
      {/* Top row: Counter header */}
      <CounterHeader
        counter={data.counter}
        currentStatus={data.officerContext.currentStatus}
        reason={null}
      />

      {isClosed && (
        <div className="rounded-md bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-700 dark:text-amber-300">
          Counter is closed &mdash; reopen to serve tickets.
        </div>
      )}

      {/* Second row: ticket display + controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CurrentServingTicketCard
          ticket={data.currentServingTicket}
          counterStatus={data.officerContext.currentStatus}
        />
        <div className="space-y-4">
          <QueueDepthIndicator initialCount={data.queueDepth.count} counterId={data.counter.id} />
          <NextTicketPreview initialTicket={data.nextTicket} counterId={data.counter.id} />
          {data.notificationsState.length > 0 && (
            <NotificationToggle
              counterId={data.counter.id}
              counterName={data.counter.name}
              counterNumber={data.counter.number}
              initialEnabled={data.officerContext.notificationsEnabled}
              onToggle={(newValue) => {
                setData((prev) => ({
                  ...prev,
                  officerContext: { ...prev.officerContext, notificationsEnabled: newValue },
                }));
              }}
            />
          )}
        </div>
      </div>

      {/* Third row: actions + counter status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TicketActionPanel
          ticket={data.currentServingTicket}
          counterId={data.counter.id}
          officerOnDuty={data.officerContext.isOnDuty && !isClosed}
          hasNextTicket={data.nextTicket !== null}
          onActionComplete={refreshDashboard}
        />
        <CounterStatusToggle
          counterId={data.counter.id}
          counterName={data.counter.name}
          currentStatus={data.officerContext.currentStatus}
          currentReason={null}
          onStatusChange={(newStatus) => {
            setData((prev) => ({
              ...prev,
              officerContext: {
                ...prev.officerContext,
                currentStatus: newStatus,
                isOnDuty: newStatus === 'OPENED' ? true : prev.officerContext.isOnDuty,
              },
            }));
          }}
        />
      </div>

      {/* Fourth row: recent activity */}
      <RecentActivityFeed initialEntries={data.recentActivity} counterId={data.counter.id} />
    </div>
  );
}

// =============================================================================
// src/components/officer/officer-dashboard-client.tsx — Dashboard wrapper (4.2.3)
// =============================================================================
// Client component that owns the SSE subscription, holds the dashboard state,
// and distributes event updates to sub-components.
// =============================================================================

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSSE } from '@/hooks/use-sse';
import { useBrowserNotifications } from '@/hooks/use-browser-notifications';
import { useTabAlert } from '@/hooks/use-tab-alert';
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
import NoShowTicketsList from '@/components/counter/no-show-tickets-list';
import WaitingTicketsList from '@/components/counter/waiting-tickets-list';
import NotificationSoundToggle from '@/components/counter/notification-sound-toggle';
import { CounterAudioUnlockOverlay } from '@/components/counter/audio-unlock-overlay';

interface OfficerDashboardClientProps {
  initialData: OfficerDashboardData;
}

export default function OfficerDashboardClient({ initialData }: OfficerDashboardClientProps) {
  const [data, setData] = useState<OfficerDashboardData>(initialData);

  // Browser notification + sound for new tickets
  const { notifyNewTicket, isSoundEnabled, toggleSound, permission, requestPermission } =
    useBrowserNotifications({
      enabled: true,
      soundFile: data.dashboardSettings.newTicketSoundFile || undefined,
    });

  // Audio unlock overlay — shown until user clicks to enable audio
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  // Auto-request notification permission on mount
  useEffect(() => {
    if (permission === 'default') {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // Tab alert — flash favicon + title when ticket arrives while tab is hidden
  const [tabAlertCount, setTabAlertCount] = useState(0);
  useTabAlert(tabAlertCount, 'Counter Dashboard');
  // Clear alerts when tab regains focus
  useEffect(() => {
    function onFocus() {
      setTabAlertCount(0);
    }
    function onVisibility() {
      if (document.visibilityState === 'visible') setTabAlertCount(0);
    }
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // Delayed reminder notification banner
  const [overdueTickets, setOverdueTickets] = useState<string[]>([]);
  const overdueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleReminderTrigger = useCallback((ticketNumbers: string[]) => {
    setOverdueTickets((prev) => {
      // Merge with existing overdue tickets (avoid duplicates)
      const merged = new Set([...prev, ...ticketNumbers]);
      return [...merged];
    });
    // Reset auto-dismiss timer
    if (overdueTimerRef.current) clearTimeout(overdueTimerRef.current);
    overdueTimerRef.current = setTimeout(() => setOverdueTickets([]), 15000);
  }, []);

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
          // Always count for tab flash (hook handles visibility)
          setTabAlertCount((c) => c + 1);
          // Fire browser notification + sound
          if (p['ticketNumber']) {
            notifyNewTicket(
              p['ticketNumber'] as string,
              (p['customerName'] as string) ?? null,
              (p['serviceName'] as string) ?? 'Unknown',
            );
          }
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
          setOverdueTickets([]); // Clear reminder when ticket is called
          refreshDashboard();
          break;

        case 'TICKET_NO_SHOW':
          setOverdueTickets([]); // Clear reminder when ticket is no-show
          setData((prev) => ({ ...prev, currentServingTicket: null }));
          // Don't refresh — the ticket is still in DB as NO_SHOW and the API
          // won't return it, but there's a race with the DB write. The next
          // TICKET_CALLED or QUEUE_UPDATED event will refresh properly.
          break;

        case 'TICKET_SERVED': {
          setOverdueTickets([]); // Clear reminder when ticket is served
          // Update ticket to COMPLETED status for display, then clear after delay.
          // If refreshDashboard() already cleared currentServingTicket (race condition),
          // reconstruct a minimal ticket from the SSE payload so the "✓ Served" card
          // is still shown for the 3-second hold period.
          setData((prev) => {
            if (prev.currentServingTicket && p['ticketId'] === prev.currentServingTicket.id) {
              return {
                ...prev,
                currentServingTicket: { ...prev.currentServingTicket, status: 'COMPLETED' },
              };
            }
            if (!prev.currentServingTicket && p['ticketId']) {
              return {
                ...prev,
                currentServingTicket: {
                  id: p['ticketId'] as string,
                  ticketNumber: (p['ticketNumber'] as string) ?? '',
                  displayNumber: 0,
                  serviceId: (p['serviceId'] as string) ?? '',
                  serviceName: (p['serviceName'] as string) ?? '',
                  counterId: (p['counterId'] as string) ?? null,
                  counterName: (p['counterName'] as string) ?? null,
                  status: 'COMPLETED',
                  priority: 0,
                  waitPosition: 0,
                  estimatedWaitMinutes: null,
                  issuedAt: (p['servedAt'] as string) ?? new Date().toISOString(),
                  calledAt: null,
                  businessDate: '',
                  customerName: null,
                  customerIdNumber: null,
                  customerPhone: null,
                  events: [],
                  calledByOfficer: null,
                } as TicketDetail,
              };
            }
            return prev;
          });
          // Clear after 3s and refresh
          setTimeout(() => {
            setData((prev) => ({ ...prev, currentServingTicket: null }));
            refreshDashboard();
          }, 3000);
          break;
        }

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

  // Show audio unlock overlay until user clicks
  if (!audioUnlocked) {
    return <CounterAudioUnlockOverlay onUnlock={() => setAudioUnlocked(true)} />;
  }

  return (
    <div className="space-y-3">
      {/* Top row: Counter header */}
      <CounterHeader
        counter={data.counter}
        currentStatus={data.officerContext.currentStatus}
        reason={null}
      />

      {/* Notification permission prompt */}
      {permission === 'denied' && (
        <div className="rounded-md border border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-950 p-3 flex items-center gap-3">
          <span className="text-xl">🔔</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
              Notifications Blocked
            </p>
            <p className="text-xs text-orange-600 dark:text-orange-400">
              Please allow notifications in your browser settings to receive ticket alerts.
            </p>
          </div>
          <button
            type="button"
            onClick={() => requestPermission()}
            className="shrink-0 rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Delayed reminder notification banner */}
      {overdueTickets.length > 0 && (
        <div className="rounded-md border border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950 p-3 flex items-center gap-3 animate-pulse">
          <span className="text-2xl">⏰</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">
              Delayed Reminder Alert
            </p>
            <p className="text-xs text-red-600 dark:text-red-400">
              Ticket{overdueTickets.length > 1 ? 's' : ''}{' '}
              <span className="font-mono font-medium">{overdueTickets.join(', ')}</span>{' '}
              {overdueTickets.length > 1 ? 'have' : 'has'} been waiting too long!
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOverdueTickets([])}
            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200 text-lg font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {isClosed && (
        <div className="rounded-md bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-700 dark:text-amber-300">
          Counter is closed &mdash; reopen to serve tickets.
        </div>
      )}

      {/* Main content: 2-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
        {/* Left: Currently Serving + Action Buttons */}
        <div className="space-y-3">
          <CurrentServingTicketCard
            ticket={data.currentServingTicket}
            counterStatus={data.officerContext.currentStatus}
          />
          <TicketActionPanel
            ticket={data.currentServingTicket}
            counterId={data.counter.id}
            officerOnDuty={data.officerContext.isOnDuty && !isClosed}
            hasNextTicket={data.nextTicket !== null}
            onActionComplete={refreshDashboard}
          />
        </div>
        {/* Right: Queue info + Counter status */}
        <div className="space-y-3">
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
          <NotificationSoundToggle isEnabled={isSoundEnabled} onToggle={toggleSound} />
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
      </div>

      {/* Waiting Tickets List (full width) */}
      <WaitingTicketsList
        counterId={data.counter.id}
        initialTickets={data.waitingTickets}
        colorConfig={data.dashboardSettings.waitingTimeColorConfig}
        reminderThresholdMinutes={data.dashboardSettings.reminderThresholdMinutes}
        reminderBlinkIntervalSeconds={data.dashboardSettings.reminderBlinkIntervalSeconds}
        reminderSoundFile={data.dashboardSettings.reminderSoundFile}
        reminderSoundRepeatCount={data.dashboardSettings.reminderSoundRepeatCount}
        reminderIntervalMinutes={data.dashboardSettings.reminderIntervalMinutes}
        isCounterBusy={
          data.currentServingTicket?.status === 'CALLED' ||
          data.currentServingTicket?.status === 'RECALLED' ||
          data.currentServingTicket?.status === 'SERVING'
        }
        isOffDuty={!data.officerContext.isOnDuty || isClosed}
        onTicketCalled={refreshDashboard}
        onReminderTrigger={handleReminderTrigger}
      />

      {/* No-Show Ticket Recall list */}
      <NoShowTicketsList
        counterId={data.counter.id}
        isCounterBusy={
          data.currentServingTicket?.status === 'CALLED' ||
          data.currentServingTicket?.status === 'RECALLED' ||
          data.currentServingTicket?.status === 'SERVING'
        }
        isOffDuty={!data.officerContext.isOnDuty || isClosed}
        onRecalled={refreshDashboard}
      />

      {/* Fourth row: recent activity */}
      <RecentActivityFeed initialEntries={data.recentActivity} counterId={data.counter.id} />
    </div>
  );
}

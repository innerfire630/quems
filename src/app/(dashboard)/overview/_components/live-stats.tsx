'use client';

// =============================================================================
// LiveStats — Real-time stat cards for the overview page
// =============================================================================
// Subscribes to SSE events to update Waiting, Now Serving, and Tickets Today
// counts without requiring a page refresh.
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Layers, Monitor, Ticket, Clock, Activity } from 'lucide-react';
import { useSSE } from '@/hooks/use-sse';

interface LiveStatsProps {
  initialTotalUsers: number;
  initialTotalServices: number;
  initialTotalCounters: number;
  initialTicketsToday: number;
  initialWaitingTickets: number;
  initialServingTickets: number;
}

const CARDS_BASE = [
  { key: 'totalUsers', label: 'Users', icon: Users, color: 'text-blue-600 dark:text-blue-400' },
  {
    key: 'totalServices',
    label: 'Active Services',
    icon: Layers,
    color: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    key: 'totalCounters',
    label: 'Counters',
    icon: Monitor,
    color: 'text-purple-600 dark:text-purple-400',
  },
  {
    key: 'ticketsToday',
    label: 'Tickets Today',
    icon: Ticket,
    color: 'text-amber-600 dark:text-amber-400',
  },
  {
    key: 'waitingTickets',
    label: 'Waiting',
    icon: Clock,
    color: 'text-rose-600 dark:text-rose-400',
  },
  {
    key: 'servingTickets',
    label: 'Now Serving',
    icon: Activity,
    color: 'text-emerald-600 dark:text-emerald-400',
  },
] as const;

export function LiveStats({
  initialTotalUsers,
  initialTotalServices,
  initialTotalCounters,
  initialTicketsToday,
  initialWaitingTickets,
  initialServingTickets,
}: LiveStatsProps) {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalUsers: initialTotalUsers,
    totalServices: initialTotalServices,
    totalCounters: initialTotalCounters,
    ticketsToday: initialTicketsToday,
    waitingTickets: initialWaitingTickets,
    servingTickets: initialServingTickets,
  });

  // Sync when server re-renders with new props (from router.refresh())
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate sync of server-rendered props to client state
    setStats({
      totalUsers: initialTotalUsers,
      totalServices: initialTotalServices,
      totalCounters: initialTotalCounters,
      ticketsToday: initialTicketsToday,
      waitingTickets: initialWaitingTickets,
      servingTickets: initialServingTickets,
    });
  }, [
    initialTotalUsers,
    initialTotalServices,
    initialTotalCounters,
    initialTicketsToday,
    initialWaitingTickets,
    initialServingTickets,
  ]);

  // SSE real-time updates — react to ticket lifecycle events instantly
  const handleSSE = useCallback((envelope: { type: string; payload: Record<string, unknown> }) => {
    const t = envelope.type;
    const payload = envelope.payload as Record<string, unknown>;
    setStats((prev) => {
      const next = { ...prev };
      switch (t) {
        case 'TICKET_ISSUED':
          next.ticketsToday = prev.ticketsToday + 1;
          next.waitingTickets = prev.waitingTickets + 1;
          break;
        case 'TICKET_CALLED':
          // WAITING → CALLED: waiting count drops
          next.waitingTickets = Math.max(0, prev.waitingTickets - 1);
          break;
        case 'TICKET_SERVED': {
          // Same event is used for both "started serving" and "completed":
          //   previousStatus CALLED/RECALLED → now SERVING (serving++)
          //   previousStatus SERVING          → now COMPLETED (serving--)
          const prevStatus = payload.previousStatus as string;
          if (prevStatus === 'SERVING') {
            next.servingTickets = Math.max(0, prev.servingTickets - 1);
          } else {
            next.servingTickets = prev.servingTickets + 1;
          }
          break;
        }
        case 'TICKET_NO_SHOW':
          // If ticket was SERVING, serving count drops
          if (payload.previousStatus === 'SERVING') {
            next.servingTickets = Math.max(0, prev.servingTickets - 1);
          }
          break;
        case 'DAILY_RESET':
          next.ticketsToday = 0;
          next.waitingTickets = 0;
          next.servingTickets = 0;
          break;
        default:
          return prev; // no change
      }
      return next;
    });
  }, []);

  useSSE('global', {
    filter: ['TICKET_ISSUED', 'TICKET_CALLED', 'TICKET_SERVED', 'TICKET_NO_SHOW', 'DAILY_RESET'],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SSE handler uses generic payload
    onEvent: handleSSE as any,
  });

  // Polling fallback — reconcile with authoritative server data every 30 s
  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 30000);
    return () => clearInterval(interval);
  }, [router]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {CARDS_BASE.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.key}
            className="relative overflow-hidden rounded-lg border border-border bg-card p-5 transition-colors hover:bg-accent/50"
          >
            {/* Right-centered icon */}
            <Icon
              className="pointer-events-none absolute right-4 top-1/2 size-20 -translate-y-1/2 text-foreground"
              style={{ opacity: 0.08 }}
              aria-hidden
            />

            <div className="relative">
              <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
            </div>
            <p className="relative mt-3 text-3xl font-semibold text-foreground">
              {stats[card.key]}
            </p>
          </div>
        );
      })}
    </div>
  );
}

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
  { key: 'totalServices', label: 'Active Services', icon: Layers, color: 'text-emerald-600 dark:text-emerald-400' },
  { key: 'totalCounters', label: 'Counters', icon: Monitor, color: 'text-purple-600 dark:text-purple-400' },
  { key: 'ticketsToday', label: 'Tickets Today', icon: Ticket, color: 'text-amber-600 dark:text-amber-400' },
  { key: 'waitingTickets', label: 'Waiting', icon: Clock, color: 'text-rose-600 dark:text-rose-400' },
  { key: 'servingTickets', label: 'Now Serving', icon: Activity, color: 'text-emerald-600 dark:text-emerald-400' },
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

  // Sync when server re-renders with new props
  useEffect(() => {
    setStats({
      totalUsers: initialTotalUsers,
      totalServices: initialTotalServices,
      totalCounters: initialTotalCounters,
      ticketsToday: initialTicketsToday,
      waitingTickets: initialWaitingTickets,
      servingTickets: initialServingTickets,
    });
  }, [initialTotalUsers, initialTotalServices, initialTotalCounters, initialTicketsToday, initialWaitingTickets, initialServingTickets]);

  // Refresh page data every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 10000);
    return () => clearInterval(interval);
  }, [router]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {CARDS_BASE.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.key}
            className="rounded-lg border border-border bg-card p-5 transition-colors hover:bg-accent/50"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
              <Icon className={`size-4 ${card.color}`} />
            </div>
            <p className="mt-3 text-3xl font-semibold text-foreground">{stats[card.key]}</p>
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// src/components/display/recent-calls-list.tsx — Recent calls history (3.2.2)
// =============================================================================

import React from 'react';
import type { TicketDisplayData } from '@/types/display.types';

interface RecentCallsListProps {
  tickets: TicketDisplayData[];
  maxItems: number;
}

function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export const RecentCallsList = React.memo(function RecentCallsList({
  tickets,
  maxItems,
}: RecentCallsListProps) {
  if (tickets.length === 0) return null;

  const visible = tickets.slice(0, maxItems);

  return (
    <div className="flex flex-col gap-1 mt-2">
      {visible.map((t) => (
        <div key={t.id} className="flex justify-between items-center text-display-text">
          <span className="text-2xl font-bold">{t.ticketNumber}</span>
          <span className="text-xs text-slate-400">{relativeTime(t.calledAt)}</span>
        </div>
      ))}
    </div>
  );
});

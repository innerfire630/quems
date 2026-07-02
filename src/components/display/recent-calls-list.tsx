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
  const visible = tickets.slice(0, maxItems);
  const placeholdersNeeded = maxItems - visible.length;

  return (
    <div className="flex flex-col gap-1 mt-2">
      {visible.map((t) => (
        <div key={t.id} className="flex justify-between items-center text-gray-700">
          <div className="flex items-center gap-2">
            <span
              className={`text-2xl font-bold ${
                t.status === 'NO_SHOW'
                  ? 'text-red-400 line-through'
                  : t.status === 'RECALLED'
                    ? 'text-amber-400'
                    : ''
              }`}
            >
              {t.ticketNumber}
            </span>
            {t.status === 'NO_SHOW' && (
              <span className="text-[10px] font-medium text-red-400 uppercase bg-red-400/10 px-1.5 py-0.5 rounded">
                No-Show
              </span>
            )}
            {t.status === 'RECALLED' && (
              <span className="text-[10px] font-medium text-amber-400 uppercase bg-amber-400/10 px-1.5 py-0.5 rounded">
                Recalled
              </span>
            )}
            {t.status === 'SERVED' && (
              <span className="text-[10px] font-medium text-green-400 uppercase bg-green-400/10 px-1.5 py-0.5 rounded">
                Served
              </span>
            )}
          </div>
          <span className="text-xs text-gray-400">{relativeTime(t.calledAt)}</span>
        </div>
      ))}
      {Array.from({ length: placeholdersNeeded }, (_, i) => (
        <div key={`placeholder-${i}`} className="flex justify-between items-center text-gray-700">
          <span className="text-2xl font-bold text-gray-300">&mdash;</span>
          <span className="text-xs text-gray-300">&nbsp;</span>
        </div>
      ))}
    </div>
  );
});

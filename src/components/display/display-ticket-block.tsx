// =============================================================================
// src/components/display/display-ticket-block.tsx — Per-counter ticket card (3.2.1/3.2.2)
// =============================================================================

import React from 'react';
import type { CounterDisplayData, TicketDisplayData } from '@/types/display.types';
import { RecentCallsList } from './recent-calls-list';
import { TransitionWrapper } from './transition-wrapper';

interface DisplayTicketBlockProps {
  counter: CounterDisplayData;
  nowServing: TicketDisplayData | null;
  recentTickets: TicketDisplayData[];
  counterStatus: 'open' | 'closed';
  maxItems?: number;
}

export const DisplayTicketBlock = React.memo(function DisplayTicketBlock({
  counter,
  nowServing,
  recentTickets,
  counterStatus,
  maxItems = 10,
}: DisplayTicketBlockProps) {
  const isClosed = counterStatus === 'closed';

  return (
    <div
      className={`bg-slate-800 rounded-lg p-6 shadow-lg flex flex-col gap-4 transition-opacity duration-300 ${
        isClosed ? 'opacity-50' : ''
      }`}
    >
      {/* Header */}
      <div className="text-sm font-medium text-slate-400">
        {counter.displayLabel || counter.name}
      </div>

      {/* "Now Serving" slot */}
      <div className="flex-1 flex items-center justify-center min-h-[8rem]">
        {isClosed ? (
          <span className="text-2xl font-semibold text-slate-500">Temporarily Closed</span>
        ) : nowServing ? (
          <TransitionWrapper ticketId={nowServing.id}>
            <span className="text-8xl font-black tracking-tight text-display-accent">
              {nowServing.ticketNumber}
            </span>
          </TransitionWrapper>
        ) : (
          <span className="text-8xl font-black tracking-tight text-slate-600">&mdash;</span>
        )}
      </div>

      {/* Recent calls */}
      <RecentCallsList tickets={recentTickets} maxItems={maxItems} />
    </div>
  );
});

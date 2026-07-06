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
  closeReason?: string;
  maxItems?: number;
}

export const DisplayTicketBlock = React.memo(function DisplayTicketBlock({
  counter,
  nowServing,
  recentTickets,
  counterStatus,
  closeReason = '',
  maxItems = 3,
}: DisplayTicketBlockProps) {
  const isClosed = counterStatus === 'closed';

  return (
    <div
      className={`rounded-lg border border-zinc-700 flex flex-col transition-opacity duration-300 ${
        isClosed ? 'opacity-50' : ''
      }`}
    >
      {/* Header */}
      <div className="bg-white px-6 py-3 text-center text-lg font-semibold text-gray-700">
        {counter.displayLabel || counter.name}
      </div>

      {/* "Now Serving" slot - white background for visibility */}
      <div className="bg-white flex-1 flex items-center justify-center min-h-[8rem] px-6 py-4">
        {isClosed ? (
          <div className="flex flex-col items-center gap-1">
            <span className="text-2xl font-semibold text-gray-400">
              {closeReason || 'Temporarily Closed'}
            </span>
          </div>
        ) : nowServing ? (
          <div className="flex flex-col items-center gap-2">
            <TransitionWrapper ticketId={nowServing.id}>
              <span
                className={`text-8xl font-black tracking-tight ${
                  nowServing.status === 'RECALLED'
                    ? 'text-amber-500 animate-pulse'
                    : nowServing.status === 'SERVED'
                      ? 'text-green-500'
                      : nowServing.status === 'CALLED'
                        ? 'text-display-accent animate-pulse'
                        : 'text-gray-900'
                }`}
              >
                {nowServing.ticketNumber}
              </span>
            </TransitionWrapper>
            {(nowServing.status === 'CALLED' || nowServing.status === 'RECALLED') && (
              <span className="text-xl font-semibold text-gray-700">
                Please proceed to Counter {counter.number}
              </span>
            )}
            {nowServing.status === 'RECALLED' && (
              <span className="text-xs font-medium text-amber-500 uppercase tracking-wider">
                Recalling...
              </span>
            )}
            {nowServing.status === 'SERVED' && (
              <span className="text-xs font-medium text-green-500 uppercase tracking-wider">
                Served ✓
              </span>
            )}
          </div>
        ) : (
          <span className="text-8xl font-black tracking-tight text-gray-300">&mdash;</span>
        )}
      </div>

      {/* Recent calls - dark gray */}
      <div className="bg-zinc-800 px-6 py-3">
        <RecentCallsList tickets={recentTickets} maxItems={maxItems} />
      </div>
    </div>
  );
});

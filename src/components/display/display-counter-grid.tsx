// =============================================================================
// src/components/display/display-counter-grid.tsx — Responsive grid (3.2.2)
// =============================================================================
// Responsive grid that adapts to counter count:
//   1-4 counters → 2 columns
//   5-8 counters → 3 columns
//   9+ counters → 4 columns
// =============================================================================

import { useMemo } from 'react';
import { DisplayTicketBlock } from './display-ticket-block';
import type { CounterDisplayData, TicketDisplayData } from '@/types/display.types';

interface DisplayCounterGridProps {
  counters: CounterDisplayData[];
  nowServing: Record<string, TicketDisplayData | null>;
  recentByCounter: Record<string, TicketDisplayData[]>;
  counterStatus: Record<string, 'open' | 'closed'>;
  counterCloseReasons: Record<string, string>;
  maxDisplayedTickets: number;
}

function getGridColumns(count: number): string {
  if (count <= 4) return 'grid-cols-2';
  if (count <= 8) return 'grid-cols-3';
  return 'grid-cols-4';
}

export function DisplayCounterGrid({
  counters,
  nowServing,
  recentByCounter,
  counterStatus,
  counterCloseReasons,
  maxDisplayedTickets,
}: DisplayCounterGridProps) {
  const gridClass = useMemo(() => getGridColumns(counters.length), [counters.length]);

  if (counters.length === 0) {
    return (
      <div className="flex items-center justify-center flex-1 text-gray-400 text-2xl">
        No active counters
      </div>
    );
  }

  return (
    <div className={`grid ${gridClass} gap-4 p-4 flex-1 overflow-y-auto content-start`}>
      {counters.map((counter) => (
        <DisplayTicketBlock
          key={counter.id}
          counter={counter}
          nowServing={nowServing[counter.id] ?? null}
          recentTickets={recentByCounter[counter.id] ?? []}
          counterStatus={counterStatus[counter.id] ?? 'open'}
          closeReason={counterCloseReasons[counter.id] ?? ''}
          maxItems={maxDisplayedTickets}
        />
      ))}
    </div>
  );
}

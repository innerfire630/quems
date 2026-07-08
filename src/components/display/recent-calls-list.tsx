// =============================================================================
// src/components/display/recent-calls-list.tsx — Recall history panel
// =============================================================================
// Right panel showing recent ticket calls with visual style matching the
// hero "Now Serving" display. Supports blinking highlight for newly
// displaced tickets that were just moved from the hero display.
// =============================================================================

import React from 'react';
import type { TicketDisplayData } from '@/types/display.types';

interface RecentCallsListProps {
  tickets: TicketDisplayData[];
  maxItems?: number;
}

export const RecentCallsList = React.memo(function RecentCallsList({
  tickets,
  maxItems = 7,
}: RecentCallsListProps) {
  const visible = tickets.slice(0, maxItems);

  return (
    <section className="flex flex-col overflow-hidden min-h-0" style={{ background: 'linear-gradient(135deg, var(--db-gradient-from), var(--db-gradient-via), var(--db-gradient-to))', borderColor: 'var(--db-border)' }}>
      {/* Blink animation for actively serving tickets */}
      <style>{`
        @keyframes history-blink {
          0%, 100% { border-color: var(--db-border); background-color: var(--db-bg); }
          50% { border-color: var(--db-accent); background-color: color-mix(in srgb, var(--db-accent) 8%, var(--db-bg)); }
        }
        .history-highlight {
          animation: history-blink 1s ease-in-out infinite;
        }
      `}</style>

      {/* History items — fill full height evenly */}
      <div className="flex-1 overflow-hidden flex flex-col" style={{ padding: 'clamp(0.2rem, 0.5vmin, 0.5rem)', gap: 'clamp(0.15rem, 0.35vmin, 0.4rem)' }}>
        {visible.length === 0 ? (
          <div className="flex items-center justify-center h-full" style={{ fontSize: 'clamp(0.65rem, 1.2vmin, 1.2rem)', color: 'var(--db-text-muted)' }}>
            No recent calls
          </div>
        ) : (
          visible.map((t, i) => {
            const isRecalled = t.status === 'RECALLED';
            const isCalled = t.status === 'CALLED';
            const isServing = t.status === 'SERVING';
            const isServed = t.status === 'SERVED' || t.status === 'COMPLETED';
            const isBlinking = isCalled || isRecalled;
            return (
              <div
                key={`${t.id}-${t.status}-${i}`}
                className={`flex-1 flex items-center justify-between rounded-lg border transition-all duration-300 ${isBlinking ? 'history-highlight animate-recall-pulse' : ''}`}
                style={{
                  padding: 'clamp(0.2rem, 0.7vmin, 0.8rem) clamp(0.3rem, 0.8vmin, 0.8rem)',
                  backgroundColor: 'var(--db-bg)',
                  borderColor: isBlinking ? 'var(--db-accent)' : 'var(--db-border)',
                }}
              >
                {/* Ticket box */}
                <div className="flex flex-col items-center justify-center flex-1 min-w-0" style={{ gap: 'clamp(0.05rem, 0.15vmin, 0.15rem)' }}>
                  <span className="uppercase tracking-wider font-bold" style={{ fontSize: 'clamp(0.45rem, 1.3vmin, 1.2rem)', color: 'var(--db-text-muted)' }}>Ticket No.</span>
                  <span
                    className="font-black text-center truncate"
                    style={{
                      fontSize: 'clamp(0.8rem, 3.8vmin, 3rem)',
                      color:
                        t.status === 'NO_SHOW'
                          ? 'var(--db-ticket-noshow)'
                          : isRecalled
                            ? 'var(--db-ticket-recalled)'
                            : isServed
                              ? 'var(--db-ticket-served)'
                              : 'var(--db-ticket)',
                    }}
                  >
                    {t.ticketNumber}
                  </span>
                </div>

                {/* Divider */}
                <div className="shrink-0 self-stretch border-l" style={{ borderColor: 'var(--db-border)', margin: 'clamp(0.2rem, 0.5vmin, 0.4rem) 0' }} />

                {/* Counter / Status box */}
                <div className="flex flex-col items-center justify-center flex-1 min-w-0" style={{ gap: 'clamp(0.05rem, 0.15vmin, 0.15rem)' }}>
                  {t.status === 'NO_SHOW' ? (
                    <>
                      <span className="uppercase tracking-wider font-bold" style={{ fontSize: 'clamp(0.45rem, 1.3vmin, 1.2rem)', color: 'var(--db-text-muted)' }}>
                        {t.counterName || `Counter ${t.counterNumber}`}
                      </span>
                      <span className="font-black text-center uppercase truncate" style={{ fontSize: 'clamp(0.65rem, 2.8vmin, 2.2rem)', color: 'var(--db-ticket-noshow)' }}>
                        ✗ No-Show
                      </span>
                    </>
                  ) : isServed ? (
                    <>
                      <span className="uppercase tracking-wider font-bold" style={{ fontSize: 'clamp(0.45rem, 1.3vmin, 1.2rem)', color: 'var(--db-text-muted)' }}>
                        {t.counterName || `Counter ${t.counterNumber}`}
                      </span>
                      <span className="font-black text-center uppercase truncate" style={{ fontSize: 'clamp(0.8rem, 3.8vmin, 3rem)', color: 'var(--db-ticket-served)' }}>
                        ✓ Served
                      </span>
                    </>
                  ) : isServing ? (
                    <>
                      <span className="uppercase tracking-wider font-bold" style={{ fontSize: 'clamp(0.45rem, 1.3vmin, 1.2rem)', color: 'var(--db-text-muted)' }}>
                        {t.counterName || `Counter ${t.counterNumber}`}
                      </span>
                      <span className="font-black text-center uppercase truncate" style={{ fontSize: 'clamp(0.8rem, 3.8vmin, 3rem)', color: 'var(--db-ticket)' }}>
                        ● Serving
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="uppercase tracking-wider font-bold" style={{ fontSize: 'clamp(0.45rem, 1.3vmin, 1.2rem)', color: 'var(--db-text-muted)' }}>Proceed to</span>
                      <span className="font-black text-center uppercase truncate" style={{ fontSize: 'clamp(0.8rem, 3.8vmin, 3rem)', color: 'var(--db-accent)' }}>
                        {t.counterName || `Counter ${t.counterNumber}`}
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
});

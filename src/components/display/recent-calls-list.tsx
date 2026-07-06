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
    <section className="w-[30%] min-w-[260px] flex flex-col border-l overflow-hidden" style={{ background: 'linear-gradient(135deg, var(--db-gradient-from), var(--db-gradient-via), var(--db-gradient-to))', borderColor: 'var(--db-border)' }}>
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

      {/* History items — centered vertically */}
      <div className="flex-1 overflow-y-auto flex flex-col justify-center" style={{ padding: 'clamp(0.4rem, 1vh, 1rem)', gap: 'clamp(0.4rem, 0.8vh, 0.8rem)' }}>
        {visible.length === 0 ? (
          <div className="flex items-center justify-center h-full" style={{ fontSize: 'clamp(0.65rem, 1.2vw, 1.2rem)', color: 'var(--db-text-muted)' }}>
            No recent calls
          </div>
        ) : (
          visible.map((t, i) => {
            const isServing = t.status === 'CALLED' || t.status === 'RECALLED';
            return (
              <div
                key={`${t.id}-${t.status}-${i}`}
                className={`flex items-center justify-between rounded-xl border-2 transition-all duration-300 ${isServing ? 'history-highlight' : ''}`}
                style={{
                  padding: 'clamp(0.35rem, 0.8vh, 0.8rem) clamp(0.5rem, 1vw, 1.2rem)',
                  backgroundColor: 'var(--db-bg)',
                  borderColor: isServing ? 'var(--db-accent)' : 'var(--db-border)',
                }}
              >
                {/* Ticket box */}
                <div className="flex flex-col items-center flex-1 min-w-0">
                  <span className="uppercase tracking-wider font-semibold" style={{ fontSize: 'clamp(0.45rem, 0.7vw, 0.8rem)', color: 'var(--db-text-muted)' }}>Ticket No.</span>
                  <span
                    className="font-black text-center truncate"
                    style={{
                      fontSize: 'clamp(1rem, 2.2vw, 2.4rem)',
                      color:
                        t.status === 'NO_SHOW'
                          ? 'var(--db-ticket-noshow)'
                          : t.status === 'RECALLED'
                            ? 'var(--db-ticket-recalled)'
                            : t.status === 'SERVED'
                              ? 'var(--db-ticket-served)'
                              : 'var(--db-ticket)',
                    }}
                  >
                    {t.ticketNumber}
                  </span>
                </div>

                {/* Arrow */}
                <span className="font-black shrink-0" style={{ fontSize: 'clamp(0.8rem, 1.4vw, 1.4rem)', padding: '0 clamp(0.2rem, 0.4vw, 0.5rem)', color: 'var(--db-text-dim)' }}>➔</span>

                {/* Counter / Status box */}
                <div className="flex flex-col items-center flex-1 min-w-0">
                  {t.status === 'NO_SHOW' ? (
                    <>
                      <span className="font-bold uppercase tracking-widest" style={{ fontSize: 'clamp(0.9rem, 1.8vw, 1.8rem)', color: 'var(--db-ticket-noshow)' }}>
                        ✗ No-Show
                      </span>
                    </>
                  ) : t.status === 'SERVED' ? (
                    <>
                      <span className="uppercase tracking-wider font-semibold" style={{ fontSize: 'clamp(0.45rem, 0.7vw, 0.8rem)', color: 'var(--db-text-muted)' }}>Counter</span>
                      <span className="font-black text-center uppercase truncate" style={{ fontSize: 'clamp(0.9rem, 1.8vw, 1.8rem)', color: 'var(--db-ticket-served)' }}>
                        ✓ Served
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="uppercase tracking-wider font-semibold" style={{ fontSize: 'clamp(0.45rem, 0.7vw, 0.8rem)', color: 'var(--db-text-muted)' }}>Proceed to</span>
                      <span className="font-black text-center uppercase truncate" style={{ fontSize: 'clamp(0.9rem, 1.8vw, 1.8rem)', color: 'var(--db-accent)' }}>
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

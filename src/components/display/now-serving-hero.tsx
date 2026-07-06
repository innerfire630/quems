// =============================================================================
// src/components/display/now-serving-hero.tsx — Hero "Now Serving" display
// =============================================================================
// Large center display (70% width) showing the single most recently called
// ticket with counter name, ticket number, and rotating counter notices.
// =============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import type { TicketDisplayData } from '@/types/display.types';
import { TransitionWrapper } from './transition-wrapper';

interface NowServingHeroProps {
  ticket: TicketDisplayData | null;
  notices?: string[];
}

export const NowServingHero = React.memo(function NowServingHero({
  ticket,
  notices = [],
}: NowServingHeroProps) {
  const [noticeIndex, setNoticeIndex] = useState(0);
  const [noticeVisible, setNoticeVisible] = useState(true);

  // Rotate notices every 5 seconds with fade transition
  useEffect(() => {
    if (notices.length <= 1) return;
    const interval = setInterval(() => {
      setNoticeVisible(false);
      setTimeout(() => {
        setNoticeIndex((prev) => (prev + 1) % notices.length);
        setNoticeVisible(true);
      }, 400);
    }, 5000);
    return () => clearInterval(interval);
  }, [notices.length]);

  const currentNotice = notices.length > 0 ? notices[noticeIndex % notices.length] : null;

  return (
    <section className="w-[70%] flex flex-col justify-between border-r-2" style={{ padding: 'clamp(1rem, 2vw, 2.5rem)', background: 'linear-gradient(135deg, var(--db-gradient-from), var(--db-gradient-via), var(--db-gradient-to))', borderColor: 'var(--db-border)' }}>
      {/* NOW SERVING banner */}
      <div className="text-center font-black uppercase tracking-widest animate-pulse rounded-2xl" style={{ padding: 'clamp(0.5rem, 1vh, 1.2rem) 0', fontSize: 'clamp(1rem, 2.5vw, 2.5rem)', backgroundColor: 'var(--db-accent)', color: 'var(--db-accent-text)' }}>
        --- NOW SERVING ---
      </div>

      {/* Center content */}
      <div className="flex-1 flex flex-col items-center justify-center" style={{ padding: 'clamp(0.5rem, 1.5vh, 2rem) 0' }}>
        {ticket ? (
          <>
            <span className="font-bold uppercase tracking-wider" style={{ fontSize: 'clamp(1rem, 2vw, 2rem)', marginBottom: 'clamp(0.25rem, 0.5vh, 0.75rem)', color: 'var(--db-text-muted)' }}>
              TICKET NO.
            </span>
            <TransitionWrapper ticketId={ticket.id}>
              <span
                className="font-extrabold tracking-tight drop-shadow-md"
                style={{
                  fontSize: 'clamp(4rem, 12vw, 12rem)',
                  lineHeight: 1,
                  color:
                    ticket.status === 'RECALLED'
                      ? 'var(--db-ticket-recalled)'
                      : ticket.status === 'SERVED'
                        ? 'var(--db-ticket-served)'
                        : 'var(--db-ticket)',
                  animation: ticket.status === 'RECALLED' ? undefined : undefined,
                }}
              >
                {ticket.ticketNumber}
              </span>
            </TransitionWrapper>

            {ticket.status === 'RECALLED' && (
              <span className="font-bold uppercase tracking-widest animate-pulse" style={{ fontSize: 'clamp(0.9rem, 1.8vw, 1.8rem)', marginTop: 'clamp(0.25rem, 0.5vh, 0.75rem)', color: 'var(--db-ticket-recalled)' }}>
                — Recalling —
              </span>
            )}
            {ticket.status === 'SERVED' && (
              <span className="font-bold uppercase tracking-widest" style={{ fontSize: 'clamp(0.9rem, 1.8vw, 1.8rem)', marginTop: 'clamp(0.25rem, 0.5vh, 0.75rem)', color: 'var(--db-ticket-served)' }}>
                ✓ Served
              </span>
            )}

            <div className="w-2/3" style={{ height: 'clamp(2px, 0.2vh, 4px)', margin: 'clamp(1rem, 2vh, 2.5rem) 0', backgroundColor: 'var(--db-border)' }} />

            <span className="font-bold uppercase tracking-wider" style={{ fontSize: 'clamp(0.9rem, 1.5vw, 1.5rem)', marginBottom: 'clamp(0.25rem, 0.5vh, 0.5rem)', color: 'var(--db-text-muted)' }}>
              PROCEED TO
            </span>
            <TransitionWrapper ticketId={ticket.id}>
              <span
                className="font-black uppercase tracking-wide"
                style={{ fontSize: 'clamp(2rem, 7vw, 6rem)', lineHeight: 1.1, color: 'var(--db-accent)' }}
              >
                {ticket.counterName || `Counter ${ticket.counterNumber}`}
              </span>
            </TransitionWrapper>
          </>
        ) : (
          <div className="flex flex-col items-center" style={{ gap: 'clamp(0.5rem, 1vh, 1.5rem)' }}>
            <span className="font-bold uppercase" style={{ fontSize: 'clamp(2rem, 5vw, 4rem)', color: 'var(--db-text-dim)' }}>Waiting</span>
            <span style={{ fontSize: 'clamp(0.9rem, 1.5vw, 1.5rem)', color: 'var(--db-text-muted)' }}>No tickets being served</span>
          </div>
        )}
      </div>

      {/* Counter notices — rotating with fade */}
      {currentNotice && (
        <div
          className="flex items-center justify-center font-semibold tracking-wider transition-opacity duration-400"
          style={{
            fontSize: 'clamp(0.75rem, 1.3vw, 1.3rem)',
            padding: 'clamp(0.3rem, 0.6vh, 0.6rem) 0',
            margin: 'clamp(0.3rem, 0.6vh, 0.6rem) 0',
            opacity: noticeVisible ? 1 : 0,
            color: 'var(--db-ticket-recalled)',
          }}
        >
          {/* Alert badge — icon + label in box */}
          <span
            className="inline-flex items-center rounded-md"
            style={{ padding: 'clamp(0.15rem, 0.3vh, 0.3rem) clamp(0.4rem, 0.6vw, 0.6rem)', marginRight: 'clamp(0.4rem, 0.6vw, 0.6rem)', backgroundColor: 'color-mix(in srgb, var(--db-ticket-recalled) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--db-ticket-recalled) 30%, transparent)', color: 'var(--db-ticket-recalled)' }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="shrink-0"
              style={{ width: 'clamp(0.9rem, 1.3vw, 1.3rem)', height: 'clamp(0.9rem, 1.3vw, 1.3rem)', marginRight: 'clamp(0.2rem, 0.3vw, 0.3rem)' }}
            >
              <path d="M12 2L1 21h22L12 2zm0 4l7.53 13H4.47L12 6zm-1 5v4h2v-4h-2zm0 6v2h2v-2h-2z" />
            </svg>
            <span className="uppercase font-bold">Alert</span>
          </span>
          <span className="uppercase">{currentNotice}</span>
        </div>
      )}

      {/* Footer hint */}
      <div className="text-center border-t-2" style={{ fontSize: 'clamp(0.65rem, 1vw, 1rem)', paddingTop: 'clamp(0.6rem, 1.2vh, 1.4rem)', marginTop: 'clamp(0.4rem, 0.8vh, 1rem)', color: 'var(--db-text-dim)', borderColor: 'var(--db-border)' }}>
        Please proceed immediately when your number is called.
      </div>
    </section>
  );
});

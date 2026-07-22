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
    <section
      className="flex flex-col justify-between border-b-2 md:border-b-0 md:border-r-2 overflow-hidden min-h-0"
      style={{
        padding: 'clamp(0.4rem, 1vmin, 1.5rem)',
        background:
          'linear-gradient(135deg, var(--db-gradient-from), var(--db-gradient-via), var(--db-gradient-to))',
        borderColor: 'var(--db-border)',
      }}
    >
      {/* NOW SERVING / RECALLING banner */}
      <div
        className={`text-center font-black uppercase tracking-widest rounded-2xl shrink-0 ${ticket?.status === 'RECALLED' ? 'bg-amber-500 text-black animate-recall-pulse' : 'animate-pulse'}`}
        style={{
          padding: 'clamp(0.4rem, 0.8vmin, 1rem) 0',
          fontSize: 'clamp(0.8rem, 2.2vmin, 2rem)',
          ...(ticket?.status !== 'RECALLED'
            ? { backgroundColor: 'var(--db-accent)', color: 'var(--db-accent-text)' }
            : {}),
        }}
      >
        {ticket?.status === 'RECALLED' ? '--- RECALLING ---' : '--- NOW SERVING ---'}
      </div>

      {/* Center content — constrained to prevent overflow */}
      <div
        className="flex-1 flex flex-col items-center justify-center overflow-hidden min-h-0"
        style={{ padding: 'clamp(0.3rem, 1vmin, 1.5rem) 0' }}
      >
        {ticket ? (
          <>
            <span
              className="font-bold uppercase tracking-wider shrink-0"
              style={{
                fontSize: 'clamp(0.9rem, 2.2vmin, 2rem)',
                marginBottom: 'clamp(0.15rem, 0.4vmin, 0.5rem)',
                color: 'var(--db-text-muted)',
              }}
            >
              TICKET NO.
            </span>
            <TransitionWrapper ticketId={ticket.id}>
              <div
                className={`flex flex-col items-center ${ticket.status === 'RECALLED' ? 'animate-recall-pulse' : ''}`}
              >
                <span
                  className="font-extrabold tracking-tight drop-shadow-md"
                  style={{
                    fontSize: 'clamp(3rem, 10vmin, 10rem)',
                    lineHeight: 1,
                    color:
                      ticket.status === 'RECALLED'
                        ? 'var(--db-ticket-recalled)'
                        : ticket.status === 'SERVED'
                          ? 'var(--db-ticket-served)'
                          : 'var(--db-ticket)',
                  }}
                >
                  {ticket.ticketNumber}
                </span>

                {ticket.status === 'RECALLED' && (
                  <span
                    className="font-bold uppercase tracking-widest"
                    style={{
                      fontSize: 'clamp(0.8rem, 1.8vmin, 1.6rem)',
                      marginTop: 'clamp(0.15rem, 0.4vmin, 0.5rem)',
                      color: 'var(--db-ticket-recalled)',
                    }}
                  >
                    — Recalling —
                  </span>
                )}
              </div>
            </TransitionWrapper>
            {ticket.status === 'SERVED' && (
              <span
                className="font-bold uppercase tracking-wide shrink-0"
                style={{
                  fontSize: 'clamp(0.8rem, 1.8vmin, 1.6rem)',
                  marginTop: 'clamp(0.15rem, 0.4vmin, 0.5rem)',
                  color: 'var(--db-ticket-served)',
                }}
              >
                ✓ Served
              </span>
            )}

            <div
              className="w-2/3 shrink-0"
              style={{
                height: 'clamp(1px, 0.15vmin, 3px)',
                margin: 'clamp(0.5rem, 1.5vmin, 2rem) 0',
                backgroundColor: 'var(--db-border)',
              }}
            />

            <span
              className="font-bold uppercase tracking-wider shrink-0"
              style={{
                fontSize: 'clamp(0.9rem, 1.8vmin, 1.6rem)',
                marginBottom: 'clamp(0.15rem, 0.3vmin, 0.4rem)',
                color: 'var(--db-text-muted)',
              }}
            >
              PROCEED TO
            </span>
            <div className="w-full flex justify-center" key={ticket.id}>
              <span
                className="font-black uppercase tracking-normal text-center animate-in fade-in zoom-in-95 duration-300 motion-reduce:animate-none"
                style={{
                  fontSize: 'clamp(1.5rem, 5vmin, 4rem)',
                  lineHeight: 1.1,
                  color: 'var(--db-accent)',
                  wordBreak: 'break-word',
                }}
              >
                {ticket.counterName || `Counter ${ticket.counterNumber}`}
              </span>
            </div>
          </>
        ) : (
          <div
            className="flex flex-col items-center"
            style={{ gap: 'clamp(0.3rem, 0.8vmin, 1rem)' }}
          >
            <span
              className="font-bold uppercase"
              style={{ fontSize: 'clamp(1.5rem, 4vmin, 3.5rem)', color: 'var(--db-text-dim)' }}
            >
              Waiting
            </span>
            <span
              style={{ fontSize: 'clamp(0.7rem, 1.3vmin, 1.2rem)', color: 'var(--db-text-muted)' }}
            >
              No tickets being served
            </span>
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
            style={{
              padding: 'clamp(0.15rem, 0.3vh, 0.3rem) clamp(0.4rem, 0.6vw, 0.6rem)',
              marginRight: 'clamp(0.4rem, 0.6vw, 0.6rem)',
              backgroundColor: 'color-mix(in srgb, var(--db-ticket-recalled) 10%, transparent)',
              border: '1px solid color-mix(in srgb, var(--db-ticket-recalled) 30%, transparent)',
              color: 'var(--db-ticket-recalled)',
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="shrink-0"
              style={{
                width: 'clamp(0.9rem, 1.3vw, 1.3rem)',
                height: 'clamp(0.9rem, 1.3vw, 1.3rem)',
                marginRight: 'clamp(0.2rem, 0.3vw, 0.3rem)',
              }}
            >
              <path d="M12 2L1 21h22L12 2zm0 4l7.53 13H4.47L12 6zm-1 5v4h2v-4h-2zm0 6v2h2v-2h-2z" />
            </svg>
            <span className="uppercase font-bold">Alert</span>
          </span>
          <span className="uppercase">{currentNotice}</span>
        </div>
      )}

      {/* Footer hint */}
      <div
        className="text-center border-t-2"
        style={{
          fontSize: 'clamp(0.65rem, 1vw, 1rem)',
          paddingTop: 'clamp(0.6rem, 1.2vh, 1.4rem)',
          marginTop: 'clamp(0.4rem, 0.8vh, 1rem)',
          color: 'var(--db-text-dim)',
          borderColor: 'var(--db-border)',
        }}
      >
        Please proceed immediately when your number is called.
      </div>
    </section>
  );
});

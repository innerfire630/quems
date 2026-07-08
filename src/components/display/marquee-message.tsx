// =============================================================================
// src/components/display/marquee-message.tsx — Scrolling marquee (3.2.1)
// =============================================================================

'use client';

import { useMemo } from 'react';

interface MarqueeMessageProps {
  message: string | null;
}

const DEFAULT_MESSAGE =
  'Welcome to our queue management system. Please wait for your number to be called.';

export function MarqueeMessage({ message }: MarqueeMessageProps) {
  const text = message && message.trim() !== '' ? message : DEFAULT_MESSAGE;

  const duration = useMemo(() => {
    return Math.max(20, text.length / 5);
  }, [text]);

  return (
    <>
      <style>{`
        @keyframes marquee-scroll {
          from { transform: translate3d(0, 0, 0); }
          to { transform: translate3d(-100%, 0, 0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .marquee-animate {
            animation: none !important;
          }
        }
      `}</style>
      <footer className="shrink-0 border-t-2 flex items-center overflow-hidden" style={{ height: 'clamp(2rem, 5.5vmin, 4.5rem)', backgroundColor: 'var(--db-bg)', borderColor: 'var(--db-border)' }}>
        <div className="font-black h-full flex items-center z-10 uppercase" style={{ padding: '0 clamp(1rem, 2vmin, 2.5rem)', fontSize: 'clamp(0.8rem, 1.8vmin, 1.5rem)', backgroundColor: 'var(--db-accent)', color: 'var(--db-accent-text)' }}>
          Info
        </div>
        <div className="flex-1 whitespace-nowrap overflow-hidden relative">
          <div
            className="marquee-animate inline-block font-medium pl-[100%]"
            style={{
              fontSize: 'clamp(0.8rem, 1.8vmin, 1.5em)',
              color: 'var(--db-text-secondary)',
              animationName: 'marquee-scroll',
              animationDuration: `${duration}s`,
              animationIterationCount: 'infinite',
              animationTimingFunction: 'linear',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.animationPlayState = 'paused';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.animationPlayState = 'running';
            }}
          >
            {text}
          </div>
        </div>
      </footer>
    </>
  );
}

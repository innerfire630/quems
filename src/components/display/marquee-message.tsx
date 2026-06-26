// =============================================================================
// src/components/display/marquee-message.tsx — Scrolling marquee (3.2.1)
// =============================================================================

'use client';

import { useMemo } from 'react';

interface MarqueeMessageProps {
  message: string | null;
}

export function MarqueeMessage({ message }: MarqueeMessageProps) {
  const duration = useMemo(() => {
    if (!message) return 30;
    return Math.max(30, message.length / 5);
  }, [message]);

  if (!message || message.trim() === '') {
    return null;
  }

  return (
    <>
      <style>{`
        @keyframes marquee-scroll {
          from { transform: translateX(100%); }
          to { transform: translateX(-100%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .marquee-animate {
            animation: none !important;
          }
        }
      `}</style>
      <div className="overflow-hidden whitespace-nowrap bg-display-bg border-t border-slate-700">
        <div
          className="marquee-animate inline-block py-2 text-lg font-medium text-display-text"
          style={{
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
          {message}
        </div>
      </div>
    </>
  );
}

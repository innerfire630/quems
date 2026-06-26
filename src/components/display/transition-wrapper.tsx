// =============================================================================
// src/components/display/transition-wrapper.tsx — Ticket number animation (3.2.2)
// =============================================================================

import React from 'react';

interface TransitionWrapperProps {
  ticketId: string | null;
  children: React.ReactNode;
}

export function TransitionWrapper({ ticketId, children }: TransitionWrapperProps) {
  return (
    <span
      key={ticketId ?? 'empty'}
      className="inline-block animate-in fade-in zoom-in-95 duration-300"
      style={
        {
          // Respect prefers-reduced-motion
          '@media (prefers-reduced-motion: reduce)': {
            animation: 'none',
          },
        } as React.CSSProperties
      }
    >
      {children}
    </span>
  );
}

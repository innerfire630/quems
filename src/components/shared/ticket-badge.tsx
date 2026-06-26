// =============================================================================
// src/components/shared/ticket-badge.tsx — Ticket number display (2.2.1)
// =============================================================================
// Renders a ticket number in monospace, bold, with size variants.
// Used by the kiosk confirmation screen (2.2.2) and the display board (Phase 3).
// =============================================================================
'use client';

import { cn } from '@/lib/utils';

const SIZE_CLASSES = {
  sm: 'text-sm',
  md: 'text-2xl',
  lg: 'text-5xl',
} as const;

interface TicketBadgeProps {
  ticketNumber: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function TicketBadge({ ticketNumber, size = 'md', className }: TicketBadgeProps) {
  return (
    <span
      className={cn(
        'font-bold font-mono tracking-tight tabular-nums',
        SIZE_CLASSES[size],
        className,
      )}
    >
      {ticketNumber}
    </span>
  );
}

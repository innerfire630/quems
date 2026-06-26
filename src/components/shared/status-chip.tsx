// =============================================================================
// src/components/shared/status-chip.tsx — Ticket status display (2.2.1)
// =============================================================================
// Single source of truth for ticket status → colour mapping.
// Used by the kiosk (2.2.2), the officer dashboard (Phase 4), and the
// display board (Phase 3).
// =============================================================================
'use client';

import { Badge } from '@/components/ui/badge';

const STATUS_VARIANT: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link'
> = {
  WAITING: 'default',
  CALLED: 'secondary',
  RECALLED: 'secondary',
  SERVING: 'default',
  COMPLETED: 'outline',
  NO_SHOW: 'destructive',
  TRANSFERRED: 'outline',
  CANCELLED: 'outline',
};

const STATUS_LABEL: Record<string, string> = {
  WAITING: 'Waiting',
  CALLED: 'Called',
  RECALLED: 'Recalled',
  SERVING: 'Serving',
  COMPLETED: 'Completed',
  NO_SHOW: 'No Show',
  TRANSFERRED: 'Transferred',
  CANCELLED: 'Cancelled',
};

interface StatusChipProps {
  status: string;
  className?: string;
}

export function StatusChip({ status, className }: StatusChipProps) {
  const variant = STATUS_VARIANT[status] ?? 'outline';
  const label = STATUS_LABEL[status] ?? status;

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}

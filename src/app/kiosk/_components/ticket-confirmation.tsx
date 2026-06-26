// =============================================================================
// src/app/kiosk/_components/ticket-confirmation.tsx — Confirmation screen (2.2.2)
// =============================================================================
// Displays the issued ticket, service name, estimated wait, and triggers
// the silent print (via 2.2.3's component). Schedules auto-reset.
// =============================================================================
'use client';

import { useKioskReset } from '@/hooks/use-kiosk-reset';
import { TicketBadge } from '@/components/shared/ticket-badge';
import { SilentPrintTrigger } from './silent-print-trigger';
import type { IssuedTicketResponse } from '@/types/ticket.types';
import type { LoadedKioskConfig } from '@/lib/kiosk-config';

interface TicketConfirmationProps {
  ticket: IssuedTicketResponse;
  kioskConfig: LoadedKioskConfig;
  onDone: () => void;
}

export function TicketConfirmation({ ticket, kioskConfig, onDone }: TicketConfirmationProps) {
  const { reset } = useKioskReset({
    inactivitySeconds: kioskConfig.autoResetSeconds,
    onReset: onDone,
  });

  return (
    <div className="flex flex-col items-center py-8">
      <div className="mb-8 text-center">
        <TicketBadge ticketNumber={ticket.ticketNumber} size="lg" className="text-8xl" />
      </div>

      <h2 className="mb-4 text-2xl font-bold text-foreground">{ticket.serviceName}</h2>

      {kioskConfig.showEstimatedWait && ticket.estimatedWaitMinutes !== null && (
        <p className="mb-4 text-lg text-muted-foreground">
          Estimated wait: ~{ticket.estimatedWaitMinutes} min
        </p>
      )}

      <p className="mb-8 text-muted-foreground">
        {kioskConfig.footerMessage ?? 'Please wait to be called.'}
      </p>

      <button
        type="button"
        onClick={() => reset()}
        className="rounded-md bg-primary px-8 py-3 text-lg font-medium text-primary-foreground hover:bg-primary/90"
      >
        Done
      </button>

      {/* Silent print trigger — mounts 2.2.3's component */}
      <div aria-hidden="true" className="hidden">
        <SilentPrintTrigger ticket={ticket} kioskConfig={kioskConfig} />
      </div>
    </div>
  );
}

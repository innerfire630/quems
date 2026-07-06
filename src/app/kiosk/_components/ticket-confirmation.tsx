// =============================================================================
// src/app/kiosk/_components/ticket-confirmation.tsx — Confirmation popup (2.2.2)
// =============================================================================
// Dialog popup that shows the issued ticket number, service name, estimated
// wait, and a "Done" button. Auto-dismisses after 15 s. Also triggers
// silent print via the 2.2.3 component.
// =============================================================================
'use client';

import { useEffect, useState, useRef } from 'react';
import { TicketBadge } from '@/components/shared/ticket-badge';
import { SilentPrintTrigger } from './silent-print-trigger';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { IssuedTicketResponse } from '@/types/ticket.types';
import type { LoadedKioskConfig } from '@/lib/kiosk-config';

interface TicketConfirmationProps {
  ticket: IssuedTicketResponse;
  kioskConfig: LoadedKioskConfig;
  open: boolean;
  onDone: () => void;
}

const AUTO_DISMISS_SECONDS = 15;

export function TicketConfirmation({ ticket, kioskConfig, open, onDone }: TicketConfirmationProps) {
  const [remaining, setRemaining] = useState(AUTO_DISMISS_SECONDS);
  const doneRef = useRef(false);

  // Reset countdown each time the dialog opens
  useEffect(() => {
    if (!open) return;

    doneRef.current = false;
    setRemaining(AUTO_DISMISS_SECONDS);

    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!doneRef.current) {
            doneRef.current = true;
            queueMicrotask(onDone);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [open, onDone]);

  const handleDone = () => {
    doneRef.current = true;
    onDone();
  };

  const progressPct = (remaining / AUTO_DISMISS_SECONDS) * 100;

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleDone(); }}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-center text-2xl">Your Ticket</DialogTitle>
            <DialogDescription className="text-center">{ticket.serviceName}</DialogDescription>
          </DialogHeader>

          {/* Ticket number */}
          <div className="flex justify-center py-2">
            <TicketBadge ticketNumber={ticket.ticketNumber} size="lg" className="text-7xl" />
          </div>

          {/* Estimated wait */}
          {kioskConfig.showEstimatedWait && ticket.estimatedWaitMinutes !== null && (
            <p className="text-center text-lg text-muted-foreground">
              Estimated wait: ~{ticket.estimatedWaitMinutes} min
            </p>
          )}

          {/* Footer message */}
          <p className="text-center text-muted-foreground">
            {kioskConfig.footerMessage ?? 'Please wait to be called.'}
          </p>

          {/* Done button */}
          <button
            type="button"
            onClick={handleDone}
            className="w-full rounded-lg bg-zinc-800 py-4 text-lg font-semibold text-white transition-all hover:bg-zinc-700 active:scale-[0.97]"
          >
            Done
          </button>

          {/* Countdown + progress bar */}
          <div>
            <div className="mb-1 flex items-center justify-between text-sm text-muted-foreground">
              <span>Returning in {remaining}s</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-1000 ease-linear"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Silent print trigger — mounts 2.2.3's component */}
      <div aria-hidden="true" className="hidden">
        <SilentPrintTrigger ticket={ticket} kioskConfig={kioskConfig} />
      </div>
    </>
  );
}

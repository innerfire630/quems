// =============================================================================
// src/app/kiosk/_components/kiosk-home.tsx — Main kiosk interaction (2.2.2)
// =============================================================================
// Manages the kiosk state machine: grid → loading → confirmation → error.
// Handles the issuance API call and the auto-reset timer.
// =============================================================================
'use client';

import { useState, useCallback } from 'react';
import { KioskServiceGrid } from './kiosk-service-grid';
import { TicketConfirmation } from './ticket-confirmation';
import { useKioskReset } from '@/hooks/use-kiosk-reset';
import type { ServiceForKiosk, LoadedKioskConfig } from '@/lib/kiosk-config';
import type { IssuedTicketResponse } from '@/types/ticket.types';

type KioskView = 'grid' | 'loading' | 'confirmation' | 'error';

interface KioskHomeProps {
  services: ServiceForKiosk[];
  kioskConfig: LoadedKioskConfig;
}

export function KioskHome({ services, kioskConfig }: KioskHomeProps) {
  const [currentView, setCurrentView] = useState<KioskView>('grid');
  const [currentTicket, setCurrentTicket] = useState<IssuedTicketResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isIssuing, setIsIssuing] = useState(false);

  const handleReset = useCallback(() => {
    setCurrentView('grid');
    setCurrentTicket(null);
    setErrorMessage(null);
  }, []);

  useKioskReset({
    inactivitySeconds: kioskConfig.autoResetSeconds,
    onReset: handleReset,
    paused: isIssuing,
  });

  const handleServiceSelect = useCallback(async (serviceId: string) => {
    setIsIssuing(true);
    setCurrentView('loading');
    setErrorMessage(null);

    try {
      const res = await fetch('/api/tickets/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        const msg = json.error?.message ?? 'Failed to issue ticket. Please try again.';
        setErrorMessage(msg);
        setCurrentView('error');
        return;
      }

      setCurrentTicket(json.data as IssuedTicketResponse);
      setCurrentView('confirmation');
    } catch {
      setErrorMessage('Network error. Please try again.');
      setCurrentView('error');
    } finally {
      setIsIssuing(false);
    }
  }, []);

  if (currentView === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-lg text-muted-foreground">Issuing your ticket...</p>
      </div>
    );
  }

  if (currentView === 'confirmation' && currentTicket) {
    return (
      <TicketConfirmation ticket={currentTicket} kioskConfig={kioskConfig} onDone={handleReset} />
    );
  }

  if (currentView === 'error') {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <div className="mb-4 rounded-full bg-destructive/10 p-4">
          <span className="text-2xl">!</span>
        </div>
        <p className="mb-6 text-lg text-destructive">{errorMessage}</p>
        <button
          type="button"
          onClick={handleReset}
          className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Try Again
        </button>
      </div>
    );
  }

  return <KioskServiceGrid services={services} onSelect={handleServiceSelect} />;
}

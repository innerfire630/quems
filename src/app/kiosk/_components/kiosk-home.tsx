// =============================================================================
// src/app/kiosk/_components/kiosk-home.tsx — Main kiosk interaction (2.2.2)
// =============================================================================
// Manages the kiosk state machine: grid → [confirm popup] → [customer info] → loading → confirmation → error.
// Step 1: user taps a service card → confirmation dialog pops up over the grid.
// Step 2: 15 s auto-cancel countdown in the dialog.
// Step 3: if customer info is required, show the customer info form.
// Step 4: on submit, issues the ticket via the API with customer data.
// =============================================================================
'use client';

import { useState, useCallback, useEffect } from 'react';
import { KioskServiceGrid } from './kiosk-service-grid';
import { ServiceConfirmation } from './service-confirmation';
import { CustomerInfoForm } from './customer-info-form';
import type { CustomerInfo, CustomerInfoFieldsConfig } from './customer-info-form';
import { TicketConfirmation } from './ticket-confirmation';
import { useKioskReset } from '@/hooks/use-kiosk-reset';
import type { ServiceForKiosk, LoadedKioskConfig } from '@/lib/kiosk-config';
import type { IssuedTicketResponse } from '@/types/ticket.types';

type KioskView =
  'grid' | 'confirm' | 'customer-info' | 'loading' | 'confirmation' | 'error' | 'duplicate';

interface KioskHomeProps {
  services: ServiceForKiosk[];
  kioskConfig: LoadedKioskConfig;
  requireCustomerInfo?: boolean;
  customerInfoFields?: CustomerInfoFieldsConfig;
}

export function KioskHome({
  services,
  kioskConfig,
  requireCustomerInfo = true,
  customerInfoFields = { nameOrId: 'name', requireContact: true },
}: KioskHomeProps) {
  const [currentView, setCurrentView] = useState<KioskView>('grid');
  const [selectedService, setSelectedService] = useState<ServiceForKiosk | null>(null);
  const [currentTicket, setCurrentTicket] = useState<IssuedTicketResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isIssuing, setIsIssuing] = useState(false);
  const [duplicateTicketId, setDuplicateTicketId] = useState<string | null>(null);

  // Lock the kiosk scrollable container when any dialog is open
  const isDialogOpen =
    currentView === 'confirm' || currentView === 'customer-info' || currentView === 'confirmation';
  useEffect(() => {
    const scrollable = document.querySelector('.kiosk-scrollable');
    if (!scrollable) return;

    if (isDialogOpen) {
      (scrollable as HTMLElement).style.overflow = 'hidden';
    } else {
      (scrollable as HTMLElement).style.overflow = '';
    }

    return () => {
      (scrollable as HTMLElement).style.overflow = '';
    };
  }, [isDialogOpen]);

  const handleReset = useCallback(() => {
    setCurrentView('grid');
    setSelectedService(null);
    setCurrentTicket(null);
    setErrorMessage(null);
    setDuplicateTicketId(null);
  }, []);

  useKioskReset({
    inactivitySeconds: kioskConfig.autoResetSeconds,
    onReset: handleReset,
    paused: isIssuing,
  });

  // Step 1: user taps a service card → show confirmation overlay
  const handleServiceSelect = useCallback(
    (serviceId: string) => {
      const svc = services.find((s) => s.id === serviceId);
      if (!svc) return;
      setSelectedService(svc);
      setCurrentView('confirm');
      setErrorMessage(null);
    },
    [services],
  );

  // Step 2a: user cancels → back to grid
  const handleConfirmCancel = useCallback(() => {
    handleReset();
  }, [handleReset]);

  // Issue ticket API call (defined before callbacks that use it)
  const issueTicketForService = useCallback(
    async (customerInfo: CustomerInfo | null) => {
      if (!selectedService) return;

      setIsIssuing(true);
      setErrorMessage(null);

      try {
        const body: Record<string, unknown> = {
          serviceId: selectedService.id,
        };
        if (customerInfo) {
          if (customerInfo.customerName) body.customerName = customerInfo.customerName;
          if (customerInfo.customerIdNumber) body.customerIdNumber = customerInfo.customerIdNumber;
          if (customerInfo.customerPhone) body.customerPhone = customerInfo.customerPhone;
        }

        const res = await fetch('/api/tickets/issue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const json = await res.json();

        if (!res.ok || !json.success) {
          const msg = json.error?.message ?? 'Failed to issue ticket. Please try again.';
          if (json.error?.code === 'DUPLICATE_TICKET') {
            setDuplicateTicketId(json.error.existingTicketId ?? null);
            setCurrentView('duplicate');
          } else {
            setErrorMessage(msg);
            setCurrentView('error');
          }
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
    },
    [selectedService],
  );

  // Step 2b: user confirms → proceed to customer info or issue directly
  const handleConfirmProceed = useCallback(() => {
    if (requireCustomerInfo) {
      setCurrentView('customer-info');
    } else {
      setCurrentView('loading');
      void issueTicketForService(null);
    }
  }, [requireCustomerInfo, issueTicketForService]);

  // Step 3: customer info submitted → issue the ticket
  const handleCustomerInfoSubmit = useCallback(
    (info: CustomerInfo) => {
      setCurrentView('loading');
      void issueTicketForService(info);
    },
    [issueTicketForService],
  );

  // Step 3a: customer info cancelled → back to grid
  const handleCustomerInfoCancel = useCallback(() => {
    handleReset();
  }, [handleReset]);

  if (currentView === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-lg text-muted-foreground">Issuing your ticket...</p>
      </div>
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

  if (currentView === 'duplicate') {
    return (
      <div className="flex flex-col items-center py-16 text-center max-w-lg mx-auto">
        <div className="mb-4 rounded-full bg-yellow-100 p-4">
          <span className="text-2xl">⚠️</span>
        </div>
        <p className="mb-2 text-xl font-semibold text-foreground">You Already Have a Ticket</p>
        <p className="mb-6 text-base text-muted-foreground">
          You already have an active ticket. Please scan the QR code on your ticket or enter your
          phone number to view your current ticket status.
        </p>
        {duplicateTicketId && (
          <a
            href={`/ticket/${duplicateTicketId}`}
            className="mb-3 rounded-md bg-primary px-6 py-3 text-base font-medium text-primary-foreground hover:bg-primary/90"
          >
            View Your Ticket
          </a>
        )}
        <button
          type="button"
          onClick={handleReset}
          className="rounded-md bg-zinc-200 px-6 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-300"
        >
          Back to Services
        </button>
      </div>
    );
  }

  return (
    <>
      <KioskServiceGrid services={services} onSelect={handleServiceSelect} />
      {selectedService && (
        <ServiceConfirmation
          service={selectedService}
          timeoutSeconds={15}
          open={currentView === 'confirm'}
          onConfirm={handleConfirmProceed}
          onCancel={handleConfirmCancel}
        />
      )}
      {selectedService && (
        <CustomerInfoForm
          open={currentView === 'customer-info'}
          fieldsConfig={customerInfoFields}
          timeoutSeconds={60}
          onSubmit={handleCustomerInfoSubmit}
          onCancel={handleCustomerInfoCancel}
        />
      )}
      {currentTicket && (
        <TicketConfirmation
          ticket={currentTicket}
          kioskConfig={kioskConfig}
          open={currentView === 'confirmation'}
          onDone={handleReset}
        />
      )}
    </>
  );
}

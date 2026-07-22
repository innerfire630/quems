// =============================================================================
// src/app/mobile-kiosk/_components/mobile-kiosk-client.tsx — Mobile Kiosk UI
// =============================================================================
// Client component for mobile self-service ticketing.
// Handles service selection, customer info, ticket issuance, and session recovery.
// =============================================================================
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { Ticket, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { ServiceForKiosk } from '@/lib/kiosk-config';
import type { CustomerInfoFieldsConfig } from '@/app/kiosk/_components/customer-info-form';

type MobileKioskView =
  'home' | 'customer-info' | 'loading' | 'recover' | 'recover-result' | 'error' | 'duplicate';

interface MobileKioskClientProps {
  services: ServiceForKiosk[];
  brandName: string;
  brandLogo: string | null;
  requireCustomerInfo: boolean;
  customerInfoFields: CustomerInfoFieldsConfig;
}

export function MobileKioskClient({
  services,
  brandName,
  brandLogo,
  requireCustomerInfo,
  customerInfoFields,
}: MobileKioskClientProps) {
  const router = useRouter();
  const [view, setView] = useState<MobileKioskView>('home');
  const [selectedService, setSelectedService] = useState<ServiceForKiosk | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [duplicateTicketId, setDuplicateTicketId] = useState<string | null>(null);
  const mounted = true;

  // Customer info state
  const [customerName, setCustomerName] = useState('');
  const [customerIdNumber, setCustomerIdNumber] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Recovery state
  const [recoverPhone, setRecoverPhone] = useState('');
  const [recoverResult, setRecoverResult] = useState<{
    found: boolean;
    ticket?: { id: string; ticketNumber: string; serviceName: string };
    message?: string;
  } | null>(null);

  // Step 2: Issue ticket
  const issueTicketForService = useCallback(
    async (
      serviceId: string,
      customerInfo: { customerName?: string; customerIdNumber?: string; customerPhone?: string },
    ) => {
      setView('loading');
      setErrorMessage(null);

      try {
        const body: Record<string, unknown> = { serviceId };
        if (customerInfo.customerName) body.customerName = customerInfo.customerName;
        if (customerInfo.customerIdNumber) body.customerIdNumber = customerInfo.customerIdNumber;
        if (customerInfo.customerPhone) body.customerPhone = customerInfo.customerPhone;

        const res = await fetch('/api/mobile-kiosk/issue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const json = await res.json();

        if (!res.ok || !json.success) {
          if (json.error?.code === 'DUPLICATE_TICKET') {
            setDuplicateTicketId(json.error.existingTicketId ?? null);
            setErrorMessage(json.error?.message ?? 'You already have an active ticket.');
            setView('duplicate');
          } else {
            setErrorMessage(json.error?.message ?? 'Failed to issue ticket. Please try again.');
            setView('error');
          }
          return;
        }

        // Redirect to the ticket display page
        router.push(`/ticket/${json.data.id}`);
      } catch {
        setErrorMessage('Network error. Please try again.');
        setView('error');
      }
    },
    [router],
  );

  // Step 1: Service selected
  const handleServiceSelect = useCallback(
    (serviceId: string) => {
      const svc = services.find((s) => s.id === serviceId);
      if (!svc) return;
      setSelectedService(svc);
      if (requireCustomerInfo) {
        setView('customer-info');
      } else {
        issueTicketForService(svc.id, {});
      }
    },
    [services, requireCustomerInfo, issueTicketForService],
  );

  // Customer info submit
  const handleCustomerInfoSubmit = useCallback(() => {
    if (!selectedService) return;
    issueTicketForService(selectedService.id, {
      customerName: customerName || undefined,
      customerIdNumber: customerIdNumber || undefined,
      customerPhone: customerPhone || undefined,
    });
  }, [selectedService, customerName, customerIdNumber, customerPhone, issueTicketForService]);

  // Session recovery
  const handleRecover = useCallback(async () => {
    if (!recoverPhone.trim()) return;

    setView('loading');
    try {
      const res = await fetch('/api/mobile-kiosk/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerPhone: recoverPhone.trim() }),
      });

      const json = await res.json();
      if (!json.success) {
        setErrorMessage(json.error?.message ?? 'Recovery failed.');
        setView('error');
        return;
      }

      setRecoverResult(json.data);
      setView('recover-result');

      // If found, redirect after a short delay
      if (json.data.found && json.data.ticket) {
        setTimeout(() => router.push(`/ticket/${json.data.ticket.id}`), 1500);
      }
    } catch {
      setErrorMessage('Network error. Please try again.');
      setView('error');
    }
  }, [recoverPhone, router]);

  const resetToHome = useCallback(() => {
    setView('home');
    setSelectedService(null);
    setErrorMessage(null);
    setDuplicateTicketId(null);
    setCustomerName('');
    setCustomerIdNumber('');
    setCustomerPhone('');
    setRecoverPhone('');
    setRecoverResult(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  if (view === 'loading') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-lg text-muted-foreground">
          {recoverResult ? 'Redirecting...' : 'Issuing your ticket...'}
        </p>
      </div>
    );
  }

  if (view === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
        <div className="mb-4 rounded-full bg-destructive/10 p-4">
          <span className="text-2xl">!</span>
        </div>
        <p className="mb-6 text-lg text-destructive">{errorMessage}</p>
        <Button onClick={resetToHome}>Try Again</Button>
      </div>
    );
  }

  if (view === 'duplicate') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 space-y-4">
            <div className="mx-auto w-fit rounded-full bg-yellow-100 p-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-xl font-semibold text-foreground">You Already Have a Ticket</h2>
            <p className="text-muted-foreground">
              {errorMessage ??
                'You already have an active ticket. Please scan the QR code or enter your phone number to view your current ticket status.'}
            </p>
            {duplicateTicketId && (
              <Button asChild className="w-full" size="lg">
                <a href={`/ticket/${duplicateTicketId}`}>View Your Ticket</a>
              </Button>
            )}
            <Button variant="outline" className="w-full" onClick={resetToHome}>
              Back to Services
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (view === 'recover') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <RotateCcw className="size-5" />
              Recover Session
            </CardTitle>
            <CardDescription>
              Enter the phone number you used when getting your ticket.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recover-phone">Phone Number</Label>
              <Input
                id="recover-phone"
                type="tel"
                placeholder="e.g. 07########"
                value={recoverPhone}
                onChange={(e) =>
                  setRecoverPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))
                }
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={resetToHome}>
                Back
              </Button>
              <Button className="flex-1" onClick={handleRecover} disabled={!recoverPhone.trim()}>
                Search
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (view === 'recover-result') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Recovery Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            {recoverResult?.found && recoverResult.ticket ? (
              <>
                <div className="rounded-full bg-primary/10 p-4 mx-auto w-fit">
                  <Ticket className="size-8 text-primary" />
                </div>
                <p className="text-lg font-semibold">Ticket Found!</p>
                <p className="text-muted-foreground">
                  #{recoverResult.ticket.ticketNumber} — {recoverResult.ticket.serviceName}
                </p>
                <p className="text-sm text-muted-foreground">Redirecting to your ticket...</p>
              </>
            ) : (
              <>
                <p className="text-muted-foreground">{recoverResult?.message}</p>
                <Button onClick={resetToHome}>Get a New Ticket</Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (view === 'customer-info') {
    const showNameField =
      customerInfoFields.nameOrId === 'name' || customerInfoFields.nameOrId === 'both';
    const showIdField =
      customerInfoFields.nameOrId === 'idNumber' || customerInfoFields.nameOrId === 'both';

    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Your Information</CardTitle>
            <CardDescription>
              Please provide your details for ticket #{selectedService?.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {showNameField && (
              <div className="space-y-2">
                <Label htmlFor="customer-name">
                  {customerInfoFields.nameOrId === 'both' ? 'Name' : 'Your Name'}
                </Label>
                <Input
                  id="customer-name"
                  placeholder="Enter your name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
            )}
            {showIdField && (
              <div className="space-y-2">
                <Label htmlFor="customer-id">
                  {customerInfoFields.nameOrId === 'both' ? 'ID Number' : 'ID Number'}
                </Label>
                <Input
                  id="customer-id"
                  placeholder="Enter your ID number"
                  value={customerIdNumber}
                  onChange={(e) => setCustomerIdNumber(e.target.value)}
                />
              </div>
            )}
            {customerInfoFields.requireContact && (
              <div className="space-y-2">
                <Label htmlFor="customer-phone">Contact Number</Label>
                <Input
                  id="customer-phone"
                  type="tel"
                  placeholder="e.g. 07########"
                  value={customerPhone}
                  onChange={(e) =>
                    setCustomerPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))
                  }
                />
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={resetToHome}>
                Back
              </Button>
              <Button className="flex-1" onClick={handleCustomerInfoSubmit}>
                Get Ticket
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default: home view — service selection
  return (
    <div className="flex min-h-screen flex-col items-center p-4">
      {/* Header */}
      <div className="mb-6 flex flex-col items-center pt-8">
        {brandLogo && (
          <img src={brandLogo} alt={brandName} className="mb-2 h-12 w-auto object-contain" />
        )}
        <h1 className="text-2xl font-bold text-foreground">{brandName}</h1>
        <p className="text-muted-foreground">Select a service to get your ticket</p>
      </div>

      {/* Service grid */}
      <div className="w-full max-w-md space-y-3">
        {services.map((service) => (
          <button
            key={service.id}
            type="button"
            onClick={() => handleServiceSelect(service.id)}
            className="flex w-full items-center gap-4 rounded-lg border bg-card p-4 text-left transition-colors hover:bg-accent active:scale-[0.98]"
          >
            <div
              className="flex size-12 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white"
              style={{ backgroundColor: service.color ?? '#6366f1' }}
            >
              {service.iconName ?? service.code.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-card-foreground">{service.name}</p>
              {service.description && (
                <p className="truncate text-sm text-muted-foreground">{service.description}</p>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Session recovery link */}
      <div className="mt-8 text-center">
        <button
          type="button"
          onClick={() => setView('recover')}
          className="inline-flex items-center gap-2 text-sm text-primary underline underline-offset-4 hover:text-primary/80"
        >
          <RotateCcw className="size-4" />
          Already have an active ticket? Recover Session
        </button>
      </div>

      {/* Static QR for this page (client-only to avoid SSR hydration mismatch) */}
      {mounted && (
        <div className="mt-8 text-center">
          <p className="mb-2 text-xs text-muted-foreground">Scan to access this page</p>
          <QRCodeSVG
            value={`${window.location.origin}/mobile-kiosk`}
            size={100}
            level="M"
            className="mx-auto"
          />
        </div>
      )}
    </div>
  );
}

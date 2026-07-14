// =============================================================================
// src/app/kiosk/_components/customer-info-form.tsx — Customer info collection
// =============================================================================
// Dialog that collects customer name/ID and contact number before issuing a
// ticket. Touch-optimised for kiosk displays. Auto-dismisses on inactivity.
// =============================================================================
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { User, Phone, CreditCard, XCircle, CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export interface CustomerInfo {
  customerName?: string;
  customerIdNumber?: string;
  customerPhone: string;
}

export interface CustomerInfoFieldsConfig {
  nameOrId: 'name' | 'idNumber' | 'both';
  requireContact: boolean;
}

interface CustomerInfoFormProps {
  open: boolean;
  fieldsConfig: CustomerInfoFieldsConfig;
  timeoutSeconds?: number;
  onSubmit: (info: CustomerInfo) => void;
  onCancel: () => void;
}

export function CustomerInfoForm({
  open,
  fieldsConfig,
  timeoutSeconds = 60,
  onSubmit,
  onCancel,
}: CustomerInfoFormProps) {
  const [name, setName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(timeoutSeconds);
  const cancelledRef = useRef(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- form reset on dialog open
    setName('');
    setIdNumber('');
    setPhone('');
    setError(null);
    cancelledRef.current = false;
    setRemaining(timeoutSeconds);
  }, [open, timeoutSeconds]);

  // Auto-cancel countdown
  useEffect(() => {
    if (!open) return;

    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!cancelledRef.current) {
            cancelledRef.current = true;
            queueMicrotask(onCancel);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [open, onCancel]);

  const handleSubmit = useCallback(() => {
    setError(null);

    // Validate: require name or ID based on config
    const hasName = name.trim().length > 0;
    const hasId = idNumber.trim().length > 0;

    if (fieldsConfig.nameOrId === 'name' && !hasName) {
      setError('Please enter your name.');
      return;
    }
    if (fieldsConfig.nameOrId === 'idNumber' && !hasId) {
      setError('Please enter your ID number.');
      return;
    }
    if (fieldsConfig.nameOrId === 'both' && !hasName && !hasId) {
      setError('Please enter your name or ID number.');
      return;
    }

    // Validate phone
    if (fieldsConfig.requireContact && phone.trim().length === 0) {
      setError('Please enter your contact number.');
      return;
    }
    if (phone.trim().length > 0) {
      const phoneClean = phone.replace(/[\s\-()]/g, '');
      if (!/^\+?[1-9]\d{1,14}$/.test(phoneClean)) {
        setError('Please enter a valid contact number.');
        return;
      }
    }

    cancelledRef.current = true;
    onSubmit({
      customerName: hasName ? name.trim() : undefined,
      customerIdNumber: hasId ? idNumber.trim() : undefined,
      customerPhone: phone.trim(),
    });
  }, [name, idNumber, phone, fieldsConfig, onSubmit]);

  const handleCancel = useCallback(() => {
    cancelledRef.current = true;
    onCancel();
  }, [onCancel]);

  const showName = fieldsConfig.nameOrId === 'name' || fieldsConfig.nameOrId === 'both';
  const showId = fieldsConfig.nameOrId === 'idNumber' || fieldsConfig.nameOrId === 'both';

  const progressPct = (remaining / timeoutSeconds) * 100;

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleCancel();
      }}
    >
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">Your Details</DialogTitle>
          <DialogDescription className="text-center">
            Please enter your information to continue.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {showName && (
            <div>
              <label
                htmlFor="customer-name"
                className="mb-1 block text-sm font-medium text-foreground"
              >
                {showId ? 'Name (optional)' : 'Name'}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="customer-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={100}
                  className="w-full rounded-lg border border-border bg-card py-3 pl-10 pr-4 text-lg text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          )}

          {showId && (
            <div>
              <label
                htmlFor="customer-id"
                className="mb-1 block text-sm font-medium text-foreground"
              >
                {showName ? 'ID Number (optional)' : 'ID Number'}
              </label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="customer-id"
                  type="text"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder="Enter your ID number"
                  maxLength={50}
                  className="w-full rounded-lg border border-border bg-card py-3 pl-10 pr-4 text-lg text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="customer-phone"
              className="mb-1 block text-sm font-medium text-foreground"
            >
              Contact Number{fieldsConfig.requireContact ? '' : ' (optional)'}
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                id="customer-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter your contact number"
                maxLength={20}
                className="w-full rounded-lg border border-border bg-card py-3 pl-10 pr-4 text-lg text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {error && <p className="text-center text-sm font-medium text-destructive">{error}</p>}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-card py-4 text-lg font-semibold text-foreground transition-all hover:bg-muted active:scale-[0.97]"
          >
            <XCircle className="h-6 w-6 text-muted-foreground" />
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-zinc-800 py-4 text-lg font-semibold text-white transition-all hover:bg-zinc-700 active:scale-[0.97]"
          >
            <CheckCircle className="h-6 w-6 text-white" />
            Get Ticket
          </button>
        </div>

        {/* Countdown */}
        <div>
          <div className="mb-1 flex items-center justify-between text-sm text-muted-foreground">
            <span>Auto-cancel in {remaining}s</span>
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
  );
}

// =============================================================================
// src/app/kiosk/_components/service-confirmation.tsx — Confirm before issuing
// =============================================================================
// Dialog popup that appears over the service grid. Shows the selected service
// name, a 15-second countdown, and Confirm / Cancel buttons. Auto-dismisses
// when the timer reaches zero.
//
// Touch-optimised for kiosk displays.
// =============================================================================
'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { HelpCircle, CheckCircle, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { ServiceForKiosk } from '@/lib/kiosk-config';

interface ServiceConfirmationProps {
  service: ServiceForKiosk;
  timeoutSeconds?: number;
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function resolveIcon(name: string | null): LucideIcon {
  if (!name) return HelpCircle;
  const icon = (LucideIcons as Record<string, unknown>)[name];
  if (icon && (typeof icon === 'function' || typeof icon === 'object')) return icon as LucideIcon;
  return HelpCircle;
}

export function ServiceConfirmation({
  service,
  timeoutSeconds = 15,
  open,
  onConfirm,
  onCancel,
}: ServiceConfirmationProps) {
  const [remaining, setRemaining] = useState(timeoutSeconds);
  const cancelledRef = useRef(false);
  const iconColor = service.color ?? 'var(--color-primary)';
  const Icon = useMemo(() => resolveIcon(service.iconName), [service.iconName]);

  // Reset countdown each time the dialog opens
  useEffect(() => {
    if (!open) return;

    cancelledRef.current = false;
    setRemaining(timeoutSeconds);

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
  }, [open, onCancel, timeoutSeconds]);

  const handleConfirm = useCallback(() => {
    cancelledRef.current = true;
    onConfirm();
  }, [onConfirm]);

  const handleCancel = useCallback(() => {
    cancelledRef.current = true;
    onCancel();
  }, [onCancel]);

  const progressPct = (remaining / timeoutSeconds) * 100;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleCancel(); }}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          {/* Service icon */}
          <div className="flex justify-center">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${iconColor}18` }}
            >
              <Icon className="h-10 w-10" style={{ color: iconColor }} />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">{service.name}</DialogTitle>
          {service.description && (
            <DialogDescription className="text-center">{service.description}</DialogDescription>
          )}
        </DialogHeader>

        {/* Confirmation question */}
        <p className="text-center text-lg text-foreground">
          Do you want to get a ticket for this service?
        </p>

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
            onClick={handleConfirm}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-zinc-800 py-4 text-lg font-semibold text-white transition-all hover:bg-zinc-700 active:scale-[0.97]"
          >
            <CheckCircle className="h-6 w-6 text-white" />
            Confirm
          </button>
        </div>

        {/* Countdown + progress bar */}
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

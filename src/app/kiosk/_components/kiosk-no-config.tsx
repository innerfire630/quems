// =============================================================================
// src/app/kiosk/_components/kiosk-no-config.tsx — No-config fallback (2.2.2)
// =============================================================================
// Shown when no active kiosk configuration is found.
// =============================================================================
'use client';

import { AlertCircle } from 'lucide-react';

export function KioskNoConfig() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <AlertCircle className="mb-6 h-16 w-16 text-muted-foreground" />
      <h1 className="mb-2 text-2xl font-bold text-foreground">Kiosk Unavailable</h1>
      <p className="max-w-md text-muted-foreground">
        This kiosk is not currently configured. Please ask staff for assistance or try again later.
      </p>
    </div>
  );
}

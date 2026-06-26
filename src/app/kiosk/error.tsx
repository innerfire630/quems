'use client';

// =============================================================================
// src/app/kiosk/error.tsx — Kiosk error boundary (5.2.3)
// =============================================================================
// Unattended kiosk: auto-refreshes after 30 seconds.
// =============================================================================

import { ErrorFallback } from '@/components/error-fallback';

export default function KioskError({
  error,
  reset: _reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorFallback
      error={error}
      title="Kiosk Error"
      message="Please contact staff for assistance. This screen will auto-refresh."
      autoRefreshSeconds={30}
    />
  );
}

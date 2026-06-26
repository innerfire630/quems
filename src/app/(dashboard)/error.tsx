'use client';

// =============================================================================
// src/app/(dashboard)/error.tsx — Dashboard route error boundary (5.2.3)
// =============================================================================

import { ErrorFallback } from '@/components/error-fallback';

export default function DashboardError({
  error,
  reset: _reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorFallback
      error={error}
      title="Dashboard Error"
      message="Please try again or return to the home page. If the problem persists, contact support."
    />
  );
}

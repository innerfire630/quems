'use client';

// =============================================================================
// src/app/display/error.tsx — Display board error boundary (5.2.3)
// =============================================================================
// Unattended display: auto-refreshes after 10 seconds for quick recovery.
// =============================================================================

import { ErrorFallback } from '@/components/error-fallback';

export default function DisplayError({
  error,
  reset: _reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorFallback
      error={error}
      title="Display Board Error"
      message="Auto-recovering..."
      autoRefreshSeconds={10}
    />
  );
}

'use client';

// =============================================================================
// src/app/security/error.tsx — Security screen error boundary (5.2.3)
// =============================================================================

import { ErrorFallback } from '@/components/error-fallback';

export default function SecurityError({
  error,
  reset: _reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorFallback
      error={error}
      title="Security Screen Error"
      message="Please refresh the page to recover the security screen."
    />
  );
}

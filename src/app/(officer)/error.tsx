'use client';

// =============================================================================
// src/app/(officer)/error.tsx — Officer dashboard error boundary (5.2.3)
// =============================================================================

import { useRouter } from 'next/navigation';
import { AlertTriangle, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OfficerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-8">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-red-500/10">
          <AlertTriangle className="size-8 text-red-400" aria-hidden />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-zinc-100">Officer Dashboard Error</h2>
          <p className="text-sm text-zinc-400">
            Something went wrong. Please return to the login page and try again.
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={reset} variant="outline" size="sm">
            Try again
          </Button>
          <Button onClick={() => router.push('/login')} variant="default" size="sm">
            <LogIn className="mr-2 size-4" />
            Return to Login
          </Button>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <pre className="max-h-32 overflow-auto rounded bg-zinc-800 p-3 text-xs text-zinc-400 text-left w-full">
            {error.message}
          </pre>
        )}
      </div>
    </div>
  );
}

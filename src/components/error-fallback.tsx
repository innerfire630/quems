'use client';

// =============================================================================
// src/components/error-fallback.tsx — Error fallback UI (5.2.3)
// =============================================================================
// Friendly error screen shown when an error boundary catches a client-side
// error. Shows refresh button and optional auto-refresh countdown for
// unattended surfaces (kiosk, display board).
// =============================================================================

import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorFallbackProps {
  error?: Error | null;
  title?: string;
  message?: string;
  autoRefreshSeconds?: number;
}

export function ErrorFallback({
  error,
  title = 'Something went wrong',
  message = 'Please refresh the page or contact support if the problem persists.',
  autoRefreshSeconds,
}: ErrorFallbackProps) {
  const [countdown, setCountdown] = useState(autoRefreshSeconds ?? 0);
  const isDev = process.env.NODE_ENV === 'development';

  const refresh = useCallback(() => {
    window.location.reload();
  }, []);

  useEffect(() => {
    if (!autoRefreshSeconds || autoRefreshSeconds <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          refresh();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRefreshSeconds, refresh]);

  return (
    <div className="flex min-h-[400px] items-center justify-center p-8">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="size-8 text-destructive" aria-hidden />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{message}</p>
          {autoRefreshSeconds && countdown > 0 && (
            <p className="text-xs text-muted-foreground">
              Auto-refreshing in {countdown} second{countdown !== 1 ? 's' : ''}...
            </p>
          )}
        </div>

        {isDev && error && (
          <div className="w-full rounded-md border border-destructive/20 bg-destructive/5 p-4 text-left">
            <p className="mb-1 text-xs font-semibold text-destructive">
              {error.name}: {error.message}
            </p>
            {error.stack && (
              <pre className="max-h-32 overflow-auto text-[10px] text-muted-foreground whitespace-pre-wrap">
                {error.stack}
              </pre>
            )}
          </div>
        )}

        <Button onClick={refresh} variant="outline" size="sm">
          <RefreshCw className="mr-2 size-4" aria-hidden />
          Refresh Page
        </Button>
      </div>
    </div>
  );
}

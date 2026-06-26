// =============================================================================
// src/app/kiosk/_components/silent-print-trigger.tsx — Silent print trigger (2.2.3)
// =============================================================================
// Manages the hidden iframe lifecycle: creates the iframe, renders the
// PrintTicket component inside it, triggers window.print(), and handles
// the fallback UX when printing fails.
// =============================================================================
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { PrintTicket } from '@/components/kiosk/print-ticket';
import type { IssuedTicketResponse } from '@/types/ticket.types';
import type { LoadedKioskConfig } from '@/lib/kiosk-config';

// Minimal HTML document template for the iframe
function buildIframeHtml(printCss: string): string {
  return `<!DOCTYPE html>
<html>
<head><style>${printCss}</style></head>
<body><div id="print-root"></div></body>
</html>`;
}

type PrintStatus = 'idle' | 'printing' | 'success' | 'failed';

interface SilentPrintTriggerProps {
  ticket: IssuedTicketResponse;
  kioskConfig: LoadedKioskConfig;
  businessLogoUrl?: string;
  onPrintSuccess?: () => void;
  onPrintFailure?: (error: Error) => void;
}

export function SilentPrintTrigger({
  ticket,
  kioskConfig,
  businessLogoUrl,
  onPrintSuccess,
  onPrintFailure,
}: SilentPrintTriggerProps) {
  const [printStatus, setPrintStatus] = useState<PrintStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (iframeRef.current) {
      try {
        iframeRef.current.remove();
      } catch {
        // iframe already removed
      }
      iframeRef.current = null;
    }
  }, []);

  // Trigger print on mount — all print logic is inside the effect
  useEffect(() => {
    let cancelled = false;

    async function doPrint() {
      setPrintStatus('printing');

      try {
        cleanup();

        // Load print CSS as a string
        let printCss = '';
        try {
          const cssRes = await fetch('/styles/print.css');
          if (cssRes.ok) {
            printCss = await cssRes.text();
          }
        } catch {
          printCss = '@page { size: 80mm auto; margin: 4mm; }';
        }

        if (cancelled) return;

        // Create hidden iframe
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.setAttribute('sandbox', 'allow-same-origin');
        document.body.appendChild(iframe);
        iframeRef.current = iframe;

        const iframeDoc = iframe.contentDocument ?? iframe.contentWindow?.document;
        if (!iframeDoc) {
          throw new Error('Could not access iframe document.');
        }

        // Write HTML into iframe
        iframeDoc.open();
        iframeDoc.write(buildIframeHtml(printCss));
        iframeDoc.close();

        // Render PrintTicket into iframe
        const rootEl = iframeDoc.getElementById('print-root');
        if (!rootEl) {
          throw new Error('Print root element not found in iframe.');
        }

        const root = createRoot(rootEl);
        root.render(
          <PrintTicket
            ticket={ticket}
            kioskConfig={kioskConfig}
            businessLogoUrl={businessLogoUrl}
          />,
        );

        // Wait for iframe to load, then print
        await new Promise<void>((resolve, reject) => {
          iframe.onload = () => {
            try {
              iframe.contentWindow?.print();
              resolve();
            } catch (err) {
              reject(err);
            }
          };

          timeoutRef.current = setTimeout(() => {
            reject(new Error('Print timed out — iframe did not load.'));
          }, 5000);
        });

        if (cancelled) return;

        // Listen for afterprint
        if (iframe.contentWindow) {
          iframe.contentWindow.onafterprint = () => {
            if (!cancelled) {
              setPrintStatus('success');
              onPrintSuccess?.();
            }
            root.unmount();
            cleanup();
          };
        }

        // Fallback: if afterprint doesn't fire within 10s, treat as success
        timeoutRef.current = setTimeout(() => {
          if (!cancelled) {
            setPrintStatus('success');
            onPrintSuccess?.();
          }
          root.unmount();
          cleanup();
        }, 10000);
      } catch (err) {
        if (!cancelled) {
          const error = err instanceof Error ? err : new Error('Unknown print error.');
          setErrorMessage(error.message);
          setPrintStatus('failed');
          onPrintFailure?.(error);
        }
        cleanup();
      }
    }

    doPrint();
    return () => {
      cancelled = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryCount]);

  // Fallback UI on failure
  if (printStatus === 'failed') {
    return (
      <div className="mt-4 rounded-lg border border-yellow-400 bg-yellow-50 p-4 text-center dark:bg-yellow-950">
        <p className="mb-3 font-medium text-yellow-800 dark:text-yellow-200">
          Print failed — please show this screen to the counter.
        </p>
        {errorMessage && (
          <p className="mb-3 text-sm text-yellow-700 dark:text-yellow-300">{errorMessage}</p>
        )}
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={() => setRetryCount((c) => c + 1)}
            className="rounded-md border border-yellow-500 px-4 py-1.5 text-sm font-medium text-yellow-800 hover:bg-yellow-100 dark:text-yellow-200 dark:hover:bg-yellow-900"
          >
            Reprint
          </button>
          <button
            type="button"
            onClick={onPrintSuccess}
            className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  // When broadcasting or success, render nothing visible
  return null;
}

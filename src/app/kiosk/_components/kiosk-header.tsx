// =============================================================================
// src/app/kiosk/_components/kiosk-header.tsx — Kiosk header (2.2.2)
// =============================================================================
// Displays the brand logo, current date/time, and welcome message.
// The clock updates every second in the configured timezone.
// =============================================================================
'use client';

import { useState, useEffect } from 'react';

function formatDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

interface KioskHeaderProps {
  brandName?: string;
  brandLogo?: string | null;
}

export function KioskHeader({ brandName = 'QUEMS', brandLogo }: KioskHeaderProps) {
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-zinc-800 px-8 py-3">
      <div className="flex h-10 items-center justify-between">
        <div className="flex items-center gap-3">
          {brandLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brandLogo}
              alt={brandName}
              className="h-8 w-8 shrink-0 object-contain"
            />
          ) : null}
          <span className="text-xl font-bold text-white">{brandName}</span>
        </div>
        <div className="text-sm font-mono text-zinc-400" suppressHydrationWarning>
          {formatDateTime(now)}
        </div>
      </div>
    </header>
  );
}

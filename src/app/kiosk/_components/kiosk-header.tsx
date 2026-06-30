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
  welcomeMessage: string;
}

export function KioskHeader({ welcomeMessage }: KioskHeaderProps) {
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="mb-12">
      <div className="flex items-center justify-between">
        <div className="text-2xl font-bold text-primary">QUEMS</div>
        <div className="text-lg font-mono text-muted-foreground" suppressHydrationWarning>
          {formatDateTime(now)}
        </div>
      </div>
      <h1 className="mt-6 text-center text-3xl font-bold text-foreground">{welcomeMessage}</h1>
    </header>
  );
}

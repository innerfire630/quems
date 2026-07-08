// =============================================================================
// src/components/display/display-clock.tsx — Live clock component (3.2.1)
// =============================================================================

'use client';

import { useState, useEffect } from 'react';

const APP_TIMEZONE = process.env['NEXT_PUBLIC_APP_TIMEZONE'] ?? undefined;

export function DisplayClock() {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const dateTimeStr = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: APP_TIMEZONE,
  }).format(now);

  return (
    <div className="flex flex-col select-none" suppressHydrationWarning>
      <span className="uppercase tracking-widest font-semibold" style={{ fontSize: 'clamp(0.35rem, 0.6vw, 0.6rem)', color: 'var(--db-text-muted)' }}>Current Date &amp; Time</span>
      <span className="font-bold tabular-nums" style={{ fontSize: 'clamp(0.6rem, 1.2vw, 1.2rem)', color: 'var(--db-accent)' }}>{dateTimeStr}</span>
    </div>
  );
}

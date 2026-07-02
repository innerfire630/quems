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

  const timeStr = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: APP_TIMEZONE,
  }).format(now);

  const dateStr = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: APP_TIMEZONE,
  }).format(now);

  return (
    <div className="flex flex-col items-end text-gray-700 select-none" suppressHydrationWarning>
      <span className="text-xl font-semibold tabular-nums tracking-wide">{timeStr}</span>
      <span className="text-sm text-gray-500">{dateStr}</span>
    </div>
  );
}

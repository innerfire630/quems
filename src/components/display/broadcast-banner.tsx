// =============================================================================
// src/components/display/broadcast-banner.tsx — Broadcast message overlay (3.2.1)
// =============================================================================

'use client';

import { useState, useEffect, useRef } from 'react';

interface BroadcastMessage {
  message: string;
  senderName: string;
  displaySeconds: number;
  expiresAt: number;
}

interface BroadcastBannerProps {
  message: BroadcastMessage | null;
  onExpire?: () => void;
}

export function BroadcastBanner({ message, onExpire }: BroadcastBannerProps) {
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  });

  useEffect(() => {
    if (!message) return;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((message.expiresAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        onExpireRef.current?.();
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [message]);

  if (!message) return null;

  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-slate-900 py-4 px-6 rounded-lg shadow-2xl flex items-center gap-4 min-w-[400px]">
      <div className="flex-1">
        <p className="text-2xl font-bold">{message.message}</p>
        <p className="text-sm font-medium opacity-75">— {message.senderName}</p>
      </div>
      <div className="text-3xl font-black tabular-nums">{secondsLeft}s</div>
    </div>
  );
}

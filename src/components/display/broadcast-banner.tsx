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
    <div className="absolute top-[12vh] left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-slate-900 rounded-2xl shadow-2xl flex items-center" style={{ padding: 'clamp(0.8rem, 1.5vh, 1.8rem) clamp(1.5rem, 3vw, 3rem)', gap: 'clamp(0.8rem, 1.5vw, 1.5rem)', minWidth: 'clamp(250px, 40vw, 600px)' }}>
      <div className="flex-1">
        <p className="font-bold" style={{ fontSize: 'clamp(1rem, 2.5vw, 2.5rem)' }}>{message.message}</p>
        <p className="font-medium opacity-75" style={{ fontSize: 'clamp(0.7rem, 1.2vw, 1.2rem)' }}>— {message.senderName}</p>
      </div>
      <div className="font-black tabular-nums" style={{ fontSize: 'clamp(1.5rem, 3vw, 3rem)' }}>{secondsLeft}s</div>
    </div>
  );
}

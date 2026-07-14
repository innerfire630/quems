// =============================================================================
// src/hooks/use-browser-notifications.ts — Browser notification + sound hook
// =============================================================================
// Manages browser notification permission, shows desktop notifications for
// new ticket events, and plays a configurable alert sound.
// Uses the shared persistent <audio> element from notification-audio.ts.
// =============================================================================
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { playSound, unlockAudio, isAudioReady } from '@/lib/notification-audio';

const STORAGE_KEY = 'quems_browser_notifications_enabled';
const SOUND_KEY = 'quems_notification_sound_enabled';

interface UseBrowserNotificationsOptions {
  enabled?: boolean;
  soundFile?: string;
}

interface UseBrowserNotificationsReturn {
  isEnabled: boolean;
  toggle: () => void;
  isSoundEnabled: boolean;
  toggleSound: () => void;
  permission: NotificationPermission;
  requestPermission: () => Promise<NotificationPermission>;
  notifyNewTicket: (ticketNumber: string, customerName: string | null, serviceName: string) => void;
}

export function useBrowserNotifications(
  options: UseBrowserNotificationsOptions = {},
): UseBrowserNotificationsReturn {
  const { enabled = true, soundFile } = options;

  const [isEnabled, setIsEnabled] = useState(() => {
    if (typeof window === 'undefined') return enabled;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? enabled : stored === 'true';
  });

  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default',
  );

  const [isSoundEnabled, setIsSoundEnabled] = useState(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem(SOUND_KEY);
    return stored === null ? true : stored === 'true';
  });

  const pendingRef = useRef(false);
  const srcRef = useRef(soundFile ? `/uploads/sounds/${soundFile}` : '/sounds/bell.mp3');

  // Keep srcRef in sync with soundFile prop
  useEffect(() => {
    srcRef.current = soundFile ? `/uploads/sounds/${soundFile}` : '/sounds/bell.mp3';
  });

  // Unlock persistent audio on first user gesture
  useEffect(() => {
    function unlock() {
      unlockAudio([srcRef.current]).then((ok) => {
        if (ok && pendingRef.current) {
          pendingRef.current = false;
          playSound(srcRef.current);
        }
      });
    }
    document.addEventListener('click', unlock);
    document.addEventListener('keydown', unlock);
    return () => {
      document.removeEventListener('click', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, []);

  // Play pending sound when tab becomes visible
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible' && pendingRef.current && isAudioReady()) {
        pendingRef.current = false;
        playSound(srcRef.current);
      }
    }
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  // Persist toggle states
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(isEnabled));
  }, [isEnabled]);
  useEffect(() => {
    localStorage.setItem(SOUND_KEY, String(isSoundEnabled));
  }, [isSoundEnabled]);

  const toggle = useCallback(() => {
    setIsEnabled((p) => !p);
  }, []);
  const toggleSound = useCallback(() => {
    setIsSoundEnabled((p) => !p);
  }, []);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  const notifyNewTicket = useCallback(
    (ticketNumber: string, customerName: string | null, serviceName: string) => {
      if (isSoundEnabled) {
        if (!isAudioReady()) pendingRef.current = true;
        playSound(srcRef.current);
      }
      if (
        isEnabled &&
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        try {
          new Notification(`New Ticket: ${ticketNumber}`, {
            body: customerName
              ? `${customerName} — ${serviceName}`
              : `New ticket for ${serviceName}`,
            icon: '/images/icon-192.png',
            tag: `ticket-${ticketNumber}`,
          });
        } catch {
          /* iframe */
        }
      }
    },
    [isEnabled, isSoundEnabled],
  );

  return {
    isEnabled,
    toggle,
    isSoundEnabled,
    toggleSound,
    permission,
    requestPermission,
    notifyNewTicket,
  };
}

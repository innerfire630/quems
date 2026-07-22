// =============================================================================
// src/hooks/use-delayed-reminder.ts — Global delayed reminder hook
// =============================================================================
// Lightweight hook that polls for overdue waiting tickets and plays the
// delayed reminder sound.  Works on any officer page (dashboard, chats, etc.)
// without needing the full WaitingTicketsList component.
// =============================================================================

'use client';

import { useEffect, useRef } from 'react';
import { playSound, unlockAudio } from '@/lib/notification-audio';

interface ReminderSettings {
  thresholdMinutes: number;
  intervalMinutes: number;
  soundFile: string;
  repeatCount: number;
}

const DEFAULT_SETTINGS: ReminderSettings = {
  thresholdMinutes: 30,
  intervalMinutes: 5,
  soundFile: '',
  repeatCount: 2,
};

function getWaitMinutes(issuedAt: string): number {
  return (Date.now() - new Date(issuedAt).getTime()) / 60_000;
}

export function useDelayedReminder(counterId: string | null) {
  const playedRef = useRef(false);
  const unlockedRef = useRef(false);

  // Unlock sound on first user interaction
  useEffect(() => {
    function unlock() {
      if (unlockedRef.current) return;
      unlockedRef.current = true;
      unlockAudio(['/sounds/default-reminder-alert.mp3']);
    }
    document.addEventListener('click', unlock);
    document.addEventListener('keydown', unlock);
    return () => {
      document.removeEventListener('click', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, []);

  // Poll for overdue tickets
  useEffect(() => {
    if (!counterId) return;
    let cancelled = false;

    async function checkOverdue() {
      try {
        const res = await fetch(
          `/api/officers/me/dashboard/${encodeURIComponent(counterId!)}/waiting-tickets`,
        );
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled || !json.success || !Array.isArray(json.data)) return;

        const tickets = json.data as Array<{ ticketNumber: string; issuedAt: string }>;
        const { thresholdMinutes, intervalMinutes, repeatCount } = DEFAULT_SETTINGS;

        const overdueNow = tickets.filter((t) => {
          const mins = getWaitMinutes(t.issuedAt);
          if (mins < thresholdMinutes) return false;
          const minsSinceThreshold = mins - thresholdMinutes;
          return minsSinceThreshold % intervalMinutes < 1;
        });

        if (overdueNow.length === 0) {
          playedRef.current = false;
          return;
        }

        if (playedRef.current) return;
        playedRef.current = true;

        // Play reminder sound
        const src = '/sounds/default-reminder-alert.mp3';
        let played = 0;
        function playNext() {
          if (played >= repeatCount) return;
          played++;
          playSound(src);
        }
        playNext();
        if (repeatCount > 1) {
          const timer = setInterval(() => {
            if (played >= repeatCount) {
              clearInterval(timer);
              return;
            }
            playNext();
          }, 600);
        }

        // Browser notification
        if (
          typeof window !== 'undefined' &&
          'Notification' in window &&
          Notification.permission === 'granted'
        ) {
          const ticketNames = overdueNow.map((t) => t.ticketNumber).join(', ');
          try {
            new Notification('Delayed Reminder Alert', {
              body: `Ticket${overdueNow.length > 1 ? 's' : ''} ${ticketNames} ${overdueNow.length > 1 ? 'have' : 'has'} been waiting too long!`,
              icon: '/images/icon-192.png',
              tag: 'delayed-reminder',
            });
          } catch {
            /* iframe */
          }
        }
      } catch {
        // Best-effort
      }
    }

    checkOverdue();
    const interval = setInterval(checkOverdue, 30_000); // Check every 30s
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [counterId]);
}

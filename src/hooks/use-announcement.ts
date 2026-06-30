// =============================================================================
// src/hooks/use-announcement.ts — Announcement queue & sequencing hook (3.3.3)
// =============================================================================
// Subscribes to TICKET_CALLED / TICKET_RECALLED SSE events, enqueues them in a
// bounded FIFO queue, and processes them one at a time in strict bell → TTS
// sequence.  Respects all DisplayBoard configuration flags.
// =============================================================================

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSSE } from '@/hooks/use-sse';
import { playBell, ensureAudioContextRunning, isAudioContextRunning } from '@/lib/audio-bell';
import { speakAnnouncement, cancelTts, substituteTemplate, isTtsAvailable } from '@/lib/audio-tts';
import type { DisplayBoardConfig } from '@/types/display.types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum number of pending announcements. Older entries are dropped when full. */
const MAX_ANNOUNCEMENT_QUEUE_SIZE = 5;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AnnouncementJob {
  /** Unique identifier (envelope id) for the triggering event. */
  id: string;
  /** The ticket number to announce (e.g. 'A005'). */
  ticketNumber: string;
  /** The counter number (e.g. 1) — used in "Counter 1" phrasing. */
  counterNumber: number;
  /** The service name (e.g. 'General Inquiry'). */
  serviceName: string;
  /** Timestamp (Date.now()) when the job was enqueued. */
  enqueuedAt: number;
}

export interface UseAnnouncementOptions {
  displayBoard: DisplayBoardConfig | null;
  audioContext: AudioContext | null;
  bellBuffer: AudioBuffer | null;
  isAudioUnlocked: boolean;
}

// =============================================================================
// Hook
// =============================================================================

export function useAnnouncement(options: UseAnnouncementOptions): void {
  const { displayBoard, audioContext, bellBuffer, isAudioUnlocked } = options;

  // ---- FIFO queue (ref-based — synchronous, immune to React batching) ------
  const queueRef = useRef<AnnouncementJob[]>([]);
  const [queueVersion, setQueueVersion] = useState(0);

  // ---- Single-flight guard refs --------------------------------------------
  const isProcessingRef = useRef(false);

  // ---- Ref holder for processQueue (avoids stale closure in setTimeout) ----
  const processQueueRef = useRef<(() => void) | null>(null);

  // ---- Enqueue helper (writes directly to ref — never stale) ---------------

  const enqueue = useCallback((job: AnnouncementJob) => {
    const next = [...queueRef.current, job];
    if (next.length > MAX_ANNOUNCEMENT_QUEUE_SIZE) {
      const dropped = next.shift();
      console.warn(`Announcement queue overflow: dropping ${dropped?.ticketNumber}`);
    }
    queueRef.current = next;
    setQueueVersion((v) => v + 1);

    // Trigger processing immediately (single-flight guard prevents double-fire)
    setTimeout(() => {
      processQueueRef.current?.();
    }, 0);
  }, []);

  // ---- Dequeue helper (reads directly from ref — no setState involved) -----

  const takeOne = useCallback((): AnnouncementJob | null => {
    const prev = queueRef.current;
    if (prev.length === 0) return null;
    const [head, ...rest] = prev;
    queueRef.current = rest;
    setQueueVersion((v) => v + 1);
    return head;
  }, []);

  const clearQueue = useCallback(() => {
    queueRef.current = [];
    setQueueVersion((v) => v + 1);
  }, []);

  // ---- Processor (single-flight bell → TTS loop) ---------------------------

  const processQueue = useCallback(async () => {
    if (isProcessingRef.current) return;

    if (!isAudioUnlocked || !audioContext || !displayBoard || !displayBoard.announcementEnabled) {
      return;
    }

    isProcessingRef.current = true;

    try {
      for (;;) {
        const job = takeOne();
        if (!job) break;

        // Ensure audio context can play
        if (!isAudioContextRunning(audioContext)) {
          console.warn('Audio context not running; attempting resume');
          await ensureAudioContextRunning(audioContext);
          if (!isAudioContextRunning(audioContext)) {
            console.warn('Audio context resume failed; skipping announcement');
            continue;
          }
        }

        // ---- Bell stage ----------------------------------------------------
        if (
          displayBoard.bellEnabled &&
          displayBoard.announcementEnabled &&
          bellBuffer !== null &&
          isAudioContextRunning(audioContext)
        ) {
          try {
            await playBell({
              audioContext,
              buffer: bellBuffer,
              volume: displayBoard.ttsVolume,
            });
          } catch (err) {
            console.warn('Bell playback failed:', err);
          }
        }

        // ---- TTS stage -----------------------------------------------------
        if (
          displayBoard.ttsEnabled &&
          displayBoard.announcementEnabled &&
          isTtsAvailable() &&
          isAudioContextRunning(audioContext)
        ) {
          const text = substituteTemplate(displayBoard.announcementTemplate, {
            number: job.ticketNumber,
            counter: `Counter ${job.counterNumber}`,
            service: job.serviceName,
          });

          try {
            await speakAnnouncement({
              text,
              language: displayBoard.ttsLanguage,
              rate: displayBoard.ttsRate,
              pitch: displayBoard.ttsPitch,
              volume: displayBoard.ttsVolume,
            });
          } catch (err) {
            console.warn('TTS playback failed:', err);
          }
        }
      }
    } finally {
      isProcessingRef.current = false;
    }
  }, [isAudioUnlocked, audioContext, bellBuffer, displayBoard, takeOne]);

  // ---- Sync processQueueRef in an effect (not during render) ----------------

  useEffect(() => {
    processQueueRef.current = processQueue;
  }, [processQueue]);

  // ---- Trigger processor when queue version / unlock / deps change ---------

  useEffect(() => {
    if (
      !isAudioUnlocked ||
      !audioContext ||
      !displayBoard ||
      !displayBoard.announcementEnabled ||
      queueRef.current.length === 0
    ) {
      return;
    }
    processQueue();
  }, [isAudioUnlocked, audioContext, bellBuffer, displayBoard, queueVersion, processQueue]);

  // ---- SSE subscription ----------------------------------------------------

  useSSE('global', {
    filter: ['TICKET_CALLED', 'TICKET_RECALLED'] as const,
    onEvent: (envelope) => {
      const p = (
        envelope as {
          payload: {
            ticketNumber: string;
            counterNumber: number;
            serviceName: string;
          };
        }
      ).payload;

      const job: AnnouncementJob = {
        id: (envelope as { id: string }).id,
        ticketNumber: p.ticketNumber,
        counterNumber: p.counterNumber,
        serviceName: p.serviceName,
        enqueuedAt: Date.now(),
      };
      enqueue(job);
    },
  });

  // ---- Cleanup on unmount --------------------------------------------------

  useEffect(() => {
    return () => {
      clearQueue();
      cancelTts();
    };
  }, [clearQueue]);
}

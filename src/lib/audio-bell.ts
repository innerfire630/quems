// =============================================================================
// src/lib/audio-bell.ts — Web Audio API bell playback (3.3.1)
// =============================================================================
// Provides pre-decoded AudioBuffer caching and a promise-returning playBell()
// function. The AudioContext is created externally and passed in so the caller
// controls its lifecycle (unlock, resume, etc.).
// =============================================================================

// ---------------------------------------------------------------------------
// Module-scope cache
// ---------------------------------------------------------------------------

/** Cached decoded AudioBuffer so we don't re-fetch / re-decode on every play. */
let cachedBuffer: AudioBuffer | null = null;

/** In-flight load promise for deduplicating concurrent load requests. */
let loadPromise: Promise<AudioBuffer> | null = null;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Relative URL to the bell audio file served from the public/ directory. */
export const BELL_AUDIO_URL = '/sounds/bell.mp3';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlayBellOptions {
  audioContext: AudioContext;
  buffer: AudioBuffer;
  volume: number;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch /sounds/bell.mp3 and decode it into an AudioBuffer.
 * Caches the result at module scope so subsequent calls return immediately.
 * Deduplicates concurrent requests so only one fetch+decode runs at a time.
 */
export async function loadBellBuffer(audioContext: AudioContext): Promise<AudioBuffer> {
  // Return cached buffer immediately
  if (cachedBuffer !== null) {
    return cachedBuffer;
  }

  // Deduplicate concurrent loads
  if (loadPromise !== null) {
    return loadPromise;
  }

  loadPromise = (async (): Promise<AudioBuffer> => {
    try {
      const response = await fetch(BELL_AUDIO_URL);
      if (!response.ok) {
        throw new Error(`Failed to fetch bell audio: HTTP ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      cachedBuffer = audioBuffer;

      console.debug('Bell audio loaded:', {
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        numberOfChannels: audioBuffer.numberOfChannels,
      });

      return audioBuffer;
    } catch (error) {
      console.error('Failed to load bell audio:', error);
      throw error;
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
}

/**
 * Play the cached bell AudioBuffer at the configured volume.
 * Returns a Promise that resolves when the source's onended event fires.
 *
 * Pre-condition: the caller MUST ensure the AudioContext is in 'running' state
 * before calling this function. Use ensureAudioContextRunning() to attempt
 * recovery if the context is suspended.
 */
export function playBell({ audioContext, buffer, volume }: PlayBellOptions): Promise<void> {
  return new Promise((resolve) => {
    const safeVolume = Math.max(0, Math.min(1, volume));

    const source = audioContext.createBufferSource();
    source.buffer = buffer;

    const gainNode = audioContext.createGain();
    gainNode.gain.value = safeVolume;

    source.connect(gainNode);
    gainNode.connect(audioContext.destination);

    source.onended = () => resolve();

    source.start(0);
  });
}

/**
 * Synchronously check whether the AudioContext is in 'running' state.
 */
export function isAudioContextRunning(audioContext: AudioContext): boolean {
  return audioContext.state === 'running';
}

/**
 * Attempt to resume a suspended AudioContext (e.g., after the tab was
 * backgrounded).  Logs a warning if the context is closed or resume fails.
 */
export async function ensureAudioContextRunning(audioContext: AudioContext): Promise<void> {
  if (audioContext.state === 'running') {
    return;
  }

  if (audioContext.state === 'closed') {
    console.warn('AudioContext is closed and cannot be resumed');
    return;
  }

  try {
    await audioContext.resume();
    // Double-check: some browsers may not actually resume
    if ((audioContext.state as string) !== 'running') {
      console.warn('AudioContext.resume() completed but state is still', audioContext.state);
    }
  } catch (error) {
    console.warn('Failed to resume AudioContext:', error);
  }
}

/**
 * Return the cached AudioBuffer (or null if not yet loaded).
 * Synchronous — useful for initialising React state from the module cache.
 */
export function getCachedBellBuffer(): AudioBuffer | null {
  return cachedBuffer;
}

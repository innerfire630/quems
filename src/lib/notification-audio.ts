// =============================================================================
// src/lib/notification-audio.ts — Persistent audio element for notifications
// =============================================================================
// Single persistent <audio> element that survives tab switches and minimized
// playback (same mechanism YouTube uses). Handles multiple sound sources
// by preloading and queuing playback.
// =============================================================================

let audio: HTMLAudioElement | null = null;
let unlocked = false;
let currentSrc = '';

function ensureAudio(src: string): HTMLAudioElement {
  if (!audio) {
    audio = new Audio();
    audio.preload = 'auto';
    audio.loop = false;
    currentSrc = '';
  }
  if (currentSrc !== src) {
    currentSrc = src;
    audio.pause();
    audio.src = src;
    audio.load();
  }
  return audio;
}

/** Play a sound file using the persistent audio element. */
export function playSound(src: string): void {
  const a = ensureAudio(src);

  const doPlay = () => {
    a.currentTime = 0;
    a.volume = 1;
    a.play().catch(() => {});
  };

  if (a.readyState >= 2) {
    doPlay();
  } else {
    a.addEventListener('canplay', doPlay, { once: true });
    setTimeout(() => a.removeEventListener('canplay', doPlay), 5000);
  }
}

/**
 * Unlock the persistent audio element and preload all sound files.
 * Call once on first click/keydown. After unlock, playSound() works
 * even when the tab is minimized or hidden.
 */
export function unlockAudio(soundsToPreload: string[]): Promise<boolean> {
  return new Promise((resolve) => {
    if (unlocked) {
      resolve(true);
      return;
    }
    // Unlock with the first sound
    const first = soundsToPreload[0] || '/sounds/bell.mp3';
    const a = ensureAudio(first);
    a.volume = 0;
    a.currentTime = 0;
    a.play()
      .then(() => {
        a.pause();
        a.volume = 1;
        unlocked = true;
        // Preload remaining sounds in the background
        for (let i = 1; i < soundsToPreload.length; i++) {
          const src = soundsToPreload[i];
          if (src) {
            const tmp = new Audio(src);
            tmp.preload = 'auto';
            tmp.load();
          }
        }
        resolve(true);
      })
      .catch(() => {
        resolve(false);
      });
  });
}

/** Check if the audio element has been unlocked. */
export function isAudioReady(): boolean {
  return unlocked;
}

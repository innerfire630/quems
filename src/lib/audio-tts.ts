// =============================================================================
// src/lib/audio-tts.ts — Browser SpeechSynthesis TTS integration (3.3.2)
// =============================================================================
// Wraps the browser's native SpeechSynthesis API with a Promise-based interface,
// template substitution for {number}/{counter}/{service}, voice selection by
// BCP-47 language tag, and graceful degradation when TTS is unavailable.
// =============================================================================

// ---------------------------------------------------------------------------
// Module-scope voice cache
// ---------------------------------------------------------------------------

let cachedVoices: SpeechSynthesisVoice[] | null = null;

const VOICE_STORAGE_KEY = 'quems:tts:selectedVoice';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TemplatePlaceholders {
  number: string;
  counter: string;
  service: string;
}

export interface SpeakAnnouncementOptions {
  text: string;
  language: string;
  rate: number;
  pitch: number;
  volume: number;
  onStart?: () => void;
  onError?: (error: SpeechSynthesisErrorEvent) => void;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Replace {number}, {counter}, and {service} placeholders in the template.
 * Unknown placeholders (e.g. {foo}) are left as-is so admins can spot typos.
 * Result is trimmed and multiple spaces are collapsed.
 */
export function substituteTemplate(template: string, placeholders: TemplatePlaceholders): string {
  let result = template;
  result = result.replace(/\{number\}/g, placeholders.number);
  result = result.replace(/\{counter\}/g, placeholders.counter);
  result = result.replace(/\{service\}/g, placeholders.service);
  // Normalise whitespace
  result = result.replace(/\s+/g, ' ').trim();
  return result;
}

/**
 * Return the available TTS voices. On browsers that load voices synchronously
 * (Chrome), resolves immediately. On browsers that load asynchronously
 * (Safari), waits for the `voiceschanged` event with a 3-second timeout.
 */
export async function loadTtsVoices(): Promise<SpeechSynthesisVoice[]> {
  // Return from cache if available
  if (cachedVoices !== null) {
    return cachedVoices;
  }

  // TTS not supported — return empty
  if (!isTtsAvailable()) {
    return [];
  }

  return new Promise<SpeechSynthesisVoice[]>((resolve) => {
    const initial = speechSynthesis.getVoices();
    if (initial.length > 0) {
      cachedVoices = initial;
      console.debug('TTS voices loaded:', { count: initial.length });
      resolve(initial);
      return;
    }

    const handler = () => {
      const voices = speechSynthesis.getVoices();
      cachedVoices = voices;
      speechSynthesis.removeEventListener('voiceschanged', handler);
      clearTimeout(timeoutId);
      console.debug('TTS voices loaded:', { count: voices.length });
      resolve(voices);
    };

    speechSynthesis.addEventListener('voiceschanged', handler);

    // Fallback: if voices never load within 3 seconds, resolve with whatever we have
    const timeoutId = setTimeout(() => {
      if (cachedVoices === null) {
        cachedVoices = speechSynthesis.getVoices();
        speechSynthesis.removeEventListener('voiceschanged', handler);
        console.warn('TTS voices failed to load within 3 seconds; falling back to default voice');
        resolve(cachedVoices);
      }
    }, 3000);
  });
}

/**
 * Find the best matching voice for the given BCP-47 language tag.
 * Prefers a female voice when available.
 * - Exact language match first (e.g. 'en-US' === 'en-US')
 * - Language-only fallback (e.g. 'en-US' matches 'en-GB' because both start with 'en')
 * - Within matches, prefers female voices
 * - First available voice as last resort
 * Returns null if the voice list is empty.
 */
const FEMALE_VOICE_NAMES = [
  // Generic keywords
  'female',
  'woman',
  // Windows (Microsoft)
  'zira',
  'hazel',
  'catherine',
  'linda',
  'heera',
  'ira',
  // macOS / iOS (Apple)
  'samantha',
  'susan',
  'karen',
  'lisa',
  'victoria',
  'allison',
  'ava',
  'fiona',
  'moira',
  'tessa',
  'veena',
  'felicie',
  'amelie',
  'anna',
  'helena',
  'carmit',
  'damayanti',
  'meijia',
  'sinji',
  'yuna',
  'kyoko',
  'narae',
  'luna',
  'paulina',
  'satu',
  'melina',
  'mariska',
  'ellen',
  // Linux (espeak / festival)
  'female1',
  'female2',
  'female3',
  'f1',
  'f2',
  'f3',
  // Google TTS
  'google uk english female',
  'google us english',
  'google español',
  'google français',
  // Microsoft Edge / online voices
  'aria',
  'jenny',
  'sonia',
  'natasha',
  'sofia',
  'hilda',
  'katja',
  'carolina',
  'maria',
  'lucia',
  'camila',
  'francisca',
  'sarah',
  'libby',
  'mia',
  'clara',
  'isabella',
  'elena',
  'vittoria',
  'salma',
  'hala',
  'aysha',
  'priya',
  'shruti',
  'ananya',
];

function isFemaleVoice(voice: SpeechSynthesisVoice): boolean {
  const lower = voice.name.toLowerCase();
  return FEMALE_VOICE_NAMES.some((keyword) => lower.includes(keyword));
}

export function selectVoice(
  voices: SpeechSynthesisVoice[],
  language: string,
): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;

  // Try to recall the previously used voice from localStorage
  let rememberedName: string | null = null;
  try {
    rememberedName = localStorage.getItem(VOICE_STORAGE_KEY);
  } catch {
    // localStorage may be unavailable (SSR, private browsing)
  }

  if (rememberedName) {
    const remembered = voices.find((v) => v.name === rememberedName);
    if (remembered) {
      console.debug(`TTS: using remembered voice "${remembered.name}" (${remembered.lang})`);
      return remembered;
    }
  }

  const langPrefix = language.split('-')[0];

  // Exact BCP-47 matches
  const exactMatches = voices.filter((v) => v.lang === language);
  // Language-only matches (only used if no exact match)
  const langMatches =
    exactMatches.length > 0 ? [] : voices.filter((v) => v.lang.startsWith(langPrefix));

  const candidates = exactMatches.length > 0 ? exactMatches : langMatches;

  let selected: SpeechSynthesisVoice | null = null;

  if (candidates.length > 0) {
    // Prefer female voice among candidates
    const female = candidates.find(isFemaleVoice);
    if (female) {
      console.debug(`TTS: selected female voice "${female.name}" (${female.lang})`);
      selected = female;
    } else {
      console.debug(`TTS: selected voice "${candidates[0].name}" (${candidates[0].lang})`);
      selected = candidates[0];
    }
  } else {
    // No language match — try any female voice
    const anyFemale = voices.find(isFemaleVoice);
    if (anyFemale) {
      console.warn(
        `TTS: no voice for language "${language}", using female voice "${anyFemale.name}" (${anyFemale.lang})`,
      );
      selected = anyFemale;
    } else {
      console.warn(
        `TTS: no matching voice for language "${language}", using first available voice "${voices[0].lang}"`,
      );
      selected = voices[0];
    }
  }

  // Persist the selected voice name so it survives browser restarts
  if (selected) {
    try {
      localStorage.setItem(VOICE_STORAGE_KEY, selected.name);
    } catch {
      // localStorage may be unavailable
    }
  }

  return selected;
}

/**
 * Speak the given text using the browser's SpeechSynthesis API.
 * Returns a Promise that resolves when the utterance's onend fires
 * (or onerror — TTS errors are non-critical and resolve rather than reject).
 *
 * Clamps rate to [0.1, 10], pitch to [0, 2], and volume to [0, 1].
 */
export function speakAnnouncement(options: SpeakAnnouncementOptions): Promise<void> {
  return new Promise<void>((resolve) => {
    if (!isTtsAvailable()) {
      console.warn('TTS not available; skipping announcement');
      resolve();
      return;
    }

    const safeRate = Math.max(0.1, Math.min(10, options.rate));
    const safePitch = Math.max(0, Math.min(2, options.pitch));
    const safeVolume = Math.max(0, Math.min(1, options.volume));

    const utterance = new SpeechSynthesisUtterance(options.text);
    utterance.lang = options.language;
    utterance.rate = safeRate;
    utterance.pitch = safePitch;
    utterance.volume = safeVolume;

    // Load voices asynchronously (Chrome loads voices lazily; synchronous
    // getVoices() often returns an empty array). Then pick the best female voice.
    loadTtsVoices().then((voices) => {
      const voice = selectVoice(voices, options.language);
      if (voice) {
        utterance.voice = voice;
        console.debug(`TTS: using voice "${voice.name}" (${voice.lang})`);
      } else {
        console.debug('TTS: using browser default voice (no matching voice installed)');
      }

      utterance.onstart = () => {
        options.onStart?.();
      };

      utterance.onend = () => {
        resolve();
      };

      utterance.onerror = (event) => {
        if (event.error !== 'interrupted') {
          console.warn('TTS utterance error:', event.error);
        }
        options.onError?.(event);
        resolve();
      };

      speechSynthesis.speak(utterance);
    });
  });
}

/**
 * Synchronous check — returns true if the browser supports the SpeechSynthesis API.
 */
export function isTtsAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * Cancel any in-progress or queued TTS utterances.
 * Safe to call when TTS is unavailable (no-op).
 */
export function cancelTts(): void {
  if (!isTtsAvailable()) return;
  try {
    speechSynthesis.cancel();
  } catch {
    // speechSynthesis.cancel() shouldn't throw, but guard defensively
  }
}

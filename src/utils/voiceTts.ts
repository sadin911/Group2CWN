/**
 * Fast Text-To-Speech (TTS) Voice Confirmation Engine
 * Provides immediate auditory feedback for voice dictation actions.
 */

export interface SpeakOptions {
  lang?: 'th-TH' | 'en-US' | string;
  rate?: number; // Speed multiplier (1.0 = normal, 1.4 = fast)
  pitch?: number;
  volume?: number;
}

const DEFAULT_RATE = 1.45; // Fast, crisp speech for rapid card collection
const DEFAULT_PITCH = 1.05;
const DEFAULT_VOLUME = 0.9;

export function isTtsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

// In-memory cache of browser voices to avoid async getVoices() delays on macOS/Chromium
let cachedVoices: SpeechSynthesisVoice[] = [];

export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (!isTtsSupported()) return [];
  if (cachedVoices.length === 0) {
    cachedVoices = window.speechSynthesis.getVoices() || [];
  }
  return cachedVoices;
}

// Warm up voices immediately and listen for changes
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  getAvailableVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices() || [];
  };
}

/**
 * Finds the most suitable SpeechSynthesisVoice for a given language.
 * Checks exact match, prefix, and native voice names (e.g. 'Kanya', 'Narisa', 'Google ภาษาไทย').
 */
export function findMatchingVoice(lang: string = 'th-TH'): SpeechSynthesisVoice | null {
  const voices = getAvailableVoices();
  if (voices.length === 0) return null;

  const target = lang.toLowerCase().replace('_', '-');
  const targetPrefix = target.slice(0, 2);

  // 1. Exact match (e.g. th-TH or en-US)
  const exact = voices.find((v) => v.lang.toLowerCase().replace('_', '-') === target);
  if (exact) return exact;

  // 2. Prefix match (e.g. th or en)
  const prefix = voices.find((v) => v.lang.toLowerCase().startsWith(targetPrefix));
  if (prefix) return prefix;

  // 3. Name-based match for Thai voices (common on macOS/iOS/Android)
  if (targetPrefix === 'th') {
    const thaiNamed = voices.find(
      (v) =>
        v.name.toLowerCase().includes('kanya') ||
        v.name.toLowerCase().includes('narisa') ||
        v.name.includes('ภาษาไทย') ||
        v.name.toLowerCase().includes('thai')
    );
    if (thaiNamed) return thaiNamed;
  }

  return null;
}

/**
 * Checks whether a Thai speech synthesis voice is installed on this device.
 */
export function hasThaiTtsSupport(): boolean {
  return findMatchingVoice('th-TH') !== null;
}

/**
 * Mobile audio unlocker: can be called on first user gesture (e.g. clicking mic button)
 */
export function initTtsUnlock(): void {
  if (!isTtsSupported()) return;
  try {
    getAvailableVoices();
    window.speechSynthesis.resume();
  } catch {
    // Ignore
  }
}

/**
 * Cancels any pending or active speech synthesis immediately
 */
export function stopVoiceFeedback(): void {
  if (!isTtsSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // Ignore
  }
}

/**
 * Speaks a short confirmation phrase with high speed.
 * Any previous utterance is cancelled immediately so audio cues never lag or queue up.
 */
export function speakVoiceFeedback(text: string, options: SpeakOptions = {}): void {
  if (!text || !isTtsSupported()) return;

  const {
    lang = 'th-TH',
    rate = DEFAULT_RATE,
    pitch = DEFAULT_PITCH,
    volume = DEFAULT_VOLUME,
  } = options;

  try {
    // 1. Cancel previous speech immediately
    window.speechSynthesis.cancel();

    // 2. Prepare new utterance
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    // Pick best matching voice
    const bestVoice = findMatchingVoice(lang);
    if (bestVoice) {
      utterance.voice = bestVoice;
      utterance.lang = bestVoice.lang;
    } else {
      // Fallback voice (e.g. English voice on macOS when no Thai voice is installed)
      const enVoice = findMatchingVoice('en-US') || getAvailableVoices()[0];
      if (enVoice) {
        utterance.voice = enVoice;
        utterance.lang = enVoice.lang || 'en-US';
      } else {
        utterance.lang = lang;
      }
    }

    // 3. Dispatch speech
    window.speechSynthesis.speak(utterance);
  } catch {
    // Silent fail if browser restricts audio playback
  }
}

/**
 * Normalizes collector number for speech (e.g. '025/187' -> '25', '004' -> '4')
 */
export function cleanCollectorNumberForSpeech(rawNumber?: string): string {
  if (!rawNumber) return '';
  const firstPart = rawNumber.split(/[-/]/)[0].trim();
  const digitsOnly = firstPart.replace(/\D/g, '');
  if (digitsOnly) {
    return String(parseInt(digitsOnly, 10));
  }
  return firstPart.replace(/^#/, '').replace(/^0+/, '');
}

/**
 * Formats a card match into concise spoken phrase.
 * Includes card number and Pokemon name so the user can hands-free verify.
 * Automatically adapts to English if the device lacks a Thai TTS voice.
 * e.g. "เบอร์ 25 พิคาชู", "เบอร์ 25 พิคาชู 2 ใบ", "Number 25, Pikachu"
 */
export function formatCardSpokenText(
  cardName: string,
  quantity: number = 1,
  variant?: string,
  lang: 'th-TH' | 'en-US' = 'th-TH',
  collectorNumber?: string,
  enCardName?: string,
  forceEnglishVoice?: boolean
): string {
  const cleanName = (cardName || '').trim();
  const cleanNum = cleanCollectorNumberForSpeech(collectorNumber);

  // If user requested English OR the machine has no Thai TTS voice installed
  const useEnglish =
    lang === 'en-US' ||
    forceEnglishVoice ||
    (!hasThaiTtsSupport() && typeof window !== 'undefined' && getAvailableVoices().length > 0);

  if (useEnglish) {
    const englishName = (enCardName || cleanName).trim();
    const numPrefix = cleanNum ? `Number ${cleanNum}, ` : '';
    const variantSuffix = variant && variant !== 'normal' ? ` ${variant}` : '';
    const qtyText = quantity > 1 ? `, ${quantity} cards` : '';
    return `${numPrefix}${englishName}${variantSuffix}${qtyText}`.trim();
  }

  // Thai TTS phrasing
  let variantText = '';
  if (variant === 'holo' || variant === 'reverse') {
    variantText = ' โฮโล';
  } else if (variant === 'promo') {
    variantText = ' โปรโม';
  }

  const numPrefix = cleanNum ? `เบอร์ ${cleanNum} ` : '';
  const qtyText = quantity > 1 ? ` ${quantity} ใบ` : '';

  return `${numPrefix}${cleanName}${variantText}${qtyText}`.trim();
}

/**
 * Formats a command action into concise spoken feedback.
 * Automatically falls back to English when no Thai voice is installed.
 */
export function formatCommandSpokenText(
  command: 'undo' | 'clear' | 'increase_last' | 'decrease_last' | 'confirm' | 'set_change' | 'timeout',
  detail?: string,
  lang: 'th-TH' | 'en-US' = 'th-TH',
  forceEnglishVoice?: boolean
): string {
  const useEnglish =
    lang === 'en-US' ||
    forceEnglishVoice ||
    (!hasThaiTtsSupport() && typeof window !== 'undefined' && getAvailableVoices().length > 0);

  if (useEnglish) {
    switch (command) {
      case 'undo':
        return detail ? `Undone ${detail}` : 'Undone';
      case 'clear':
        return 'Cleared all';
      case 'increase_last':
        return detail ? `Increased ${detail}` : 'Increased';
      case 'decrease_last':
        return detail ? `Decreased ${detail}` : 'Decreased';
      case 'confirm':
        return 'Saved';
      case 'set_change':
        return `Set ${detail || ''}`;
      case 'timeout':
        return 'Timed out';
    }
  }

  // Thai phrasing
  switch (command) {
    case 'undo':
      return detail ? `ยกเลิก ${detail} แล้ว` : 'ยกเลิกแล้ว';
    case 'clear':
      return 'ล้างรายการแล้ว';
    case 'increase_last':
      return detail || 'เพิ่มจำนวนแล้ว';
    case 'decrease_last':
      return detail || 'ลดจำนวนแล้ว';
    case 'confirm':
      return 'บันทึกเรียบร้อย';
    case 'set_change':
      return `ชุด ${detail || ''}`;
    case 'timeout':
      return 'หมดเวลาฟังเสียง';
  }
}

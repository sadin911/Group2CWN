import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isTtsSupported,
  formatCardSpokenText,
  formatCommandSpokenText,
  speakVoiceFeedback,
  stopVoiceFeedback,
  initTtsUnlock,
  cleanCollectorNumberForSpeech,
  findMatchingVoice,
  hasThaiTtsSupport,
} from './voiceTts';

describe('voiceTts', () => {
  describe('cleanCollectorNumberForSpeech', () => {
    it('cleans slash formatted numbers', () => {
      expect(cleanCollectorNumberForSpeech('025/187')).toBe('25');
      expect(cleanCollectorNumberForSpeech('004/100')).toBe('4');
    });

    it('cleans dash or hash prefixed numbers', () => {
      expect(cleanCollectorNumberForSpeech('#007')).toBe('7');
      expect(cleanCollectorNumberForSpeech('010-B')).toBe('10');
    });

    it('handles empty or undefined values', () => {
      expect(cleanCollectorNumberForSpeech(undefined)).toBe('');
      expect(cleanCollectorNumberForSpeech('')).toBe('');
    });
  });

  describe('formatCardSpokenText', () => {
    it('formats normal card with collector number in Thai', () => {
      const result = formatCardSpokenText('พิคาชู', 1, 'normal', 'th-TH', '025');
      expect(result).toBe('เบอร์ 25 พิคาชู');
    });

    it('formats card without collector number in Thai', () => {
      const result = formatCardSpokenText('พิคาชู', 1, 'normal', 'th-TH');
      expect(result).toBe('พิคาชู');
    });

    it('formats holo card with multiple quantities and number in Thai', () => {
      const result = formatCardSpokenText('ลิซาร์ดอน ex', 2, 'holo', 'th-TH', '006');
      expect(result).toBe('เบอร์ 6 ลิซาร์ดอน ex โฮโล 2 ใบ');
    });

    it('formats reverse holo and promo variants', () => {
      expect(formatCardSpokenText('อีวุย', 1, 'reverse', 'th-TH', '133')).toBe('เบอร์ 133 อีวุย โฮโล');
      expect(formatCardSpokenText('พิคาชู', 3, 'promo', 'th-TH', '025')).toBe('เบอร์ 25 พิคาชู โปรโม 3 ใบ');
    });

    it('formats card in English mode', () => {
      expect(formatCardSpokenText('Pikachu', 1, 'normal', 'en-US', '025')).toBe('Number 25, Pikachu');
      expect(formatCardSpokenText('Charizard ex', 2, 'holo', 'en-US', '006')).toBe('Number 6, Charizard ex holo, 2 cards');
    });

    it('falls back to English when forced or when device lacks Thai voice', () => {
      const result = formatCardSpokenText('พิคาชู', 1, 'normal', 'th-TH', '25', 'Pikachu', true);
      expect(result).toBe('Number 25, Pikachu');
    });
  });

  describe('formatCommandSpokenText', () => {
    it('formats Thai command texts', () => {
      expect(formatCommandSpokenText('undo', 'พิคาชู', 'th-TH')).toBe('ยกเลิก พิคาชู แล้ว');
      expect(formatCommandSpokenText('clear', undefined, 'th-TH')).toBe('ล้างรายการแล้ว');
      expect(formatCommandSpokenText('set_change', 'SV8', 'th-TH')).toBe('ชุด SV8');
      expect(formatCommandSpokenText('confirm', undefined, 'th-TH')).toBe('บันทึกเรียบร้อย');
      expect(formatCommandSpokenText('timeout', undefined, 'th-TH')).toBe('หมดเวลาฟังเสียง');
    });

    it('formats English command texts', () => {
      expect(formatCommandSpokenText('undo', 'Pikachu', 'en-US')).toBe('Undone Pikachu');
      expect(formatCommandSpokenText('clear', undefined, 'en-US')).toBe('Cleared all');
      expect(formatCommandSpokenText('set_change', 'SV8', 'en-US')).toBe('Set SV8');
      expect(formatCommandSpokenText('confirm', undefined, 'en-US')).toBe('Saved');
      expect(formatCommandSpokenText('timeout', undefined, 'en-US')).toBe('Timed out');
    });

    it('falls back to English when forced', () => {
      expect(formatCommandSpokenText('undo', 'Pikachu', 'th-TH', true)).toBe('Undone Pikachu');
      expect(formatCommandSpokenText('timeout', undefined, 'th-TH', true)).toBe('Timed out');
    });
  });

  describe('synthesis interaction and voice discovery in mock browser environment', () => {
    let mockCancel: any;
    let mockSpeak: any;
    let mockResume: any;

    beforeEach(() => {
      mockCancel = vi.fn();
      mockSpeak = vi.fn();
      mockResume = vi.fn();

      const mockVoices = [
        { name: 'Alex', lang: 'en-US' },
        { name: 'Samantha', lang: 'en-US' },
        { name: 'Kanya', lang: 'th-TH' },
      ];

      (window as any).speechSynthesis = {
        cancel: mockCancel,
        speak: mockSpeak,
        resume: mockResume,
        getVoices: vi.fn().mockReturnValue(mockVoices),
      };

      (window as any).SpeechSynthesisUtterance = class {
        text: string;
        lang: string = '';
        rate: number = 1;
        pitch: number = 1;
        volume: number = 1;
        voice: any = null;
        constructor(text: string) {
          this.text = text;
        }
      };
    });

    afterEach(() => {
      delete (window as any).speechSynthesis;
      delete (window as any).SpeechSynthesisUtterance;
    });

    it('detects TTS support when APIs are present', () => {
      expect(isTtsSupported()).toBe(true);
    });

    it('matches Thai voice correctly when present', () => {
      const voice = findMatchingVoice('th-TH');
      expect(voice?.name).toBe('Kanya');
      expect(hasThaiTtsSupport()).toBe(true);
    });

    it('speaks feedback with fast default rate and sets voice', () => {
      speakVoiceFeedback('เบอร์ 25 พิคาชู');

      expect(mockCancel).toHaveBeenCalledTimes(1);
      expect(mockSpeak).toHaveBeenCalledTimes(1);

      const utterance = mockSpeak.mock.calls[0][0];
      expect(utterance.text).toBe('เบอร์ 25 พิคาชู');
      expect(utterance.rate).toBeGreaterThanOrEqual(1.4); // fast speech
    });

    it('allows custom options and stops voice feedback', () => {
      speakVoiceFeedback('Pikachu', { lang: 'en-US', rate: 1.8 });
      const utterance = mockSpeak.mock.calls[0][0];
      expect(utterance.lang).toBe('en-US');
      expect(utterance.rate).toBe(1.8);

      stopVoiceFeedback();
      expect(mockCancel).toHaveBeenCalled();
    });

    it('unlocks audio on initTtsUnlock', () => {
      initTtsUnlock();
      expect(mockResume).toHaveBeenCalled();
    });
  });
});

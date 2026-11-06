import { describe, it, expect } from 'vitest';
import {
  parseThaiNumberWords,
  detectVoiceCommand,
  detectSetFromSpeech,
  detectQuantityFromSpeech,
  detectVariantFromSpeech,
  detectCardNumberFromSpeech,
  parseVoiceInput,
} from './voiceCardParser';

// Sample mock cards for testing
const mockCatalog = [
  {
    id: 'TH-SC1a-001',
    localId: '1',
    name: 'สไตรค์',
    set: { id: 'SC1a', name: 'การ์ดเสริม ซอร์ด แอนด์ ชีลด์ ชุด A' },
    collectorNumber: '001-154',
  },
  {
    id: 'TH-SV8-025',
    localId: '25',
    name: 'พิคาชู',
    set: { id: 'SV8', name: 'ซูเปอร์ อิเล็คทริก เบรกเกอร์' },
    collectorNumber: '025/106',
  },
  {
    id: 'TH-SV8-026',
    localId: '26',
    name: 'ไรชู',
    set: { id: 'SV8', name: 'ซูเปอร์ อิเล็คทริก เบรกเกอร์' },
    collectorNumber: '026/106',
  },
  {
    id: 'TH-SV8a-025',
    localId: '25',
    name: 'พิคาชู ex',
    set: { id: 'SV8a', name: 'เทรัสตัล เฟสติวัล' },
    collectorNumber: '025/187',
  },
  {
    id: 'TH-SV8-090',
    localId: '90',
    name: 'ลิซาร์ดอน ex',
    set: { id: 'SV8', name: 'ซูเปอร์ อิเล็คทริก เบรกเกอร์' },
    collectorNumber: '090/106',
  },
];

describe('voiceCardParser', () => {
  describe('parseThaiNumberWords', () => {
    it('converts single digits', () => {
      expect(parseThaiNumberWords('หนึ่ง')).toBe(1);
      expect(parseThaiNumberWords('สอง')).toBe(2);
      expect(parseThaiNumberWords('เก้า')).toBe(9);
    });

    it('converts tens and compound numbers', () => {
      expect(parseThaiNumberWords('สิบ')).toBe(10);
      expect(parseThaiNumberWords('สิบเอ็ด')).toBe(11);
      expect(parseThaiNumberWords('ยี่สิบ')).toBe(20);
      expect(parseThaiNumberWords('ยี่สิบห้า')).toBe(25);
      expect(parseThaiNumberWords('หนึ่งร้อย')).toBe(100);
      expect(parseThaiNumberWords('หนึ่งร้อยยี่สิบหก')).toBe(126);
    });

    it('returns null for non-number words', () => {
      expect(parseThaiNumberWords('สวัสดี')).toBeNull();
    });
  });

  describe('detectVoiceCommand', () => {
    it('detects undo commands', () => {
      expect(detectVoiceCommand('ลบอันล่าสุด')).toBe('undo');
      expect(detectVoiceCommand('ยกเลิก')).toBe('undo');
      expect(detectVoiceCommand('undo')).toBe('undo');
    });

    it('detects clear commands', () => {
      expect(detectVoiceCommand('ล้างทั้งหมด')).toBe('clear');
      expect(detectVoiceCommand('clear all')).toBe('clear');
    });

    it('detects quantity adjustments', () => {
      expect(detectVoiceCommand('เพิ่มอีกใบ')).toBe('increase_last');
      expect(detectVoiceCommand('บวกหนึ่ง')).toBe('increase_last');
      expect(detectVoiceCommand('ลดหนึ่งใบ')).toBe('decrease_last');
    });

    it('detects confirmation', () => {
      expect(detectVoiceCommand('บันทึก')).toBe('confirm');
      expect(detectVoiceCommand('ยืนยันนำเข้า')).toBe('confirm');
      expect(detectVoiceCommand('save')).toBe('confirm');
    });
  });

  describe('detectSetFromSpeech', () => {
    const knownSets = new Set(['SV8', 'SV8a', 'SC1a', 'SV-P']);

    it('detects sets by prefix', () => {
      expect(detectSetFromSpeech('ชุด SV8', knownSets)).toBe('SV8');
      expect(detectSetFromSpeech('เซ็ต SV8a', knownSets)).toBe('SV8a');
      expect(detectSetFromSpeech('set sc1a', knownSets)).toBe('SC1a');
      expect(detectSetFromSpeech('ชุด svp', knownSets)).toBe('SV-P');
    });

    it('detects sets by phonetic speech', () => {
      expect(detectSetFromSpeech('ชุด เอสวี 8 เอ', knownSets)).toBe('SV8a');
      expect(detectSetFromSpeech('เอสวีแปด', knownSets)).toBe('SV8');
    });
  });

  describe('detectQuantityFromSpeech', () => {
    it('detects digits with ใบ/copies', () => {
      expect(detectQuantityFromSpeech('2 ใบ').quantity).toBe(2);
      expect(detectQuantityFromSpeech('4 copies').quantity).toBe(4);
      expect(detectQuantityFromSpeech('x3').quantity).toBe(3);
    });

    it('detects Thai word quantities', () => {
      expect(detectQuantityFromSpeech('สองใบ').quantity).toBe(2);
      expect(detectQuantityFromSpeech('สามใบ').quantity).toBe(3);
      expect(detectQuantityFromSpeech('หนึ่งใบ').quantity).toBe(1);
    });

    it('defaults to 1 if not specified', () => {
      expect(detectQuantityFromSpeech('พิคาชู').quantity).toBe(1);
    });
  });

  describe('detectVariantFromSpeech', () => {
    it('detects foil/holo/reverse/promo/sar', () => {
      expect(detectVariantFromSpeech('โฮโล').variant).toBe('holo');
      expect(detectVariantFromSpeech('ฟอยล์').variant).toBe('holo');
      expect(detectVariantFromSpeech('รีเวิร์ส').variant).toBe('reverse');
      expect(detectVariantFromSpeech('โปรโม').variant).toBe('promo');
      expect(detectVariantFromSpeech('SAR').variant).toBe('holo');
      expect(detectVariantFromSpeech('ธรรมดา').variant).toBe('normal');
    });
  });

  describe('detectCardNumberFromSpeech', () => {
    it('detects explicit numbers', () => {
      expect(detectCardNumberFromSpeech('เบอร์ 25').number).toBe('25');
      expect(detectCardNumberFromSpeech('เลข 025').number).toBe('025');
      expect(detectCardNumberFromSpeech('number 10').number).toBe('10');
      expect(detectCardNumberFromSpeech('025/187').number).toBe('025/187');
      expect(detectCardNumberFromSpeech('เบอร์ ยี่สิบห้า').number).toBe('25');
    });
  });

  describe('parseVoiceInput end-to-end', () => {
    it('handles set-only switch command', () => {
      const res = parseVoiceInput('ชุด SV8', mockCatalog, null);
      expect(res.type).toBe('set_change');
      expect(res.newActiveSet).toBe('SV8');
    });

    it('matches card by set and number with quantity and variant', () => {
      const res = parseVoiceInput('ชุด SV8 เบอร์ 25 สองใบ โฮโล', mockCatalog, null);
      expect(res.type).toBe('card');
      expect(res.matchedCard?.id).toBe('TH-SV8-025');
      expect(res.quantity).toBe(2);
      expect(res.variant).toBe('holo');
    });

    it('matches card using current active set context', () => {
      const res = parseVoiceInput('เบอร์ 26 หนึ่งใบ', mockCatalog, 'SV8');
      expect(res.type).toBe('card');
      expect(res.matchedCard?.id).toBe('TH-SV8-026');
      expect(res.quantity).toBe(1);
    });

    it('matches card when speaking just digits in active set', () => {
      const res = parseVoiceInput('25', mockCatalog, 'SV8');
      expect(res.type).toBe('card');
      expect(res.matchedCard?.id).toBe('TH-SV8-025');
    });

    it('matches card when speaking Thai number words in active set', () => {
      const res = parseVoiceInput('ยี่สิบห้า', mockCatalog, 'SV8');
      expect(res.type).toBe('card');
      expect(res.matchedCard?.id).toBe('TH-SV8-025');
    });

    it('matches card by name (e.g. พิคาชู or Charizard)', () => {
      const res = parseVoiceInput('ลิซาร์ดอน ex สองใบ', mockCatalog, 'SV8');
      expect(res.type).toBe('card');
      expect(res.matchedCard?.id).toBe('TH-SV8-090');
      expect(res.quantity).toBe(2);
    });

    it('handles voice commands like undo', () => {
      const res = parseVoiceInput('ลบอันล่าสุด', mockCatalog, 'SV8');
      expect(res.type).toBe('command');
      expect(res.command).toBe('undo');
    });
  });
});

import { describe, it, expect } from 'vitest';
import { parseCollectionText, extractSetHeader, normalizeCollectorNum } from './collectionTextParser';

const mockCatalog = [
  {
    id: 'TH-1',
    name: 'สไตรค์',
    set: { id: 'SC1a', name: 'ซอร์ด แอนด์ ชีลด์ A' },
    collectorNumber: '001-154',
    localId: '1',
  },
  {
    id: 'TH-2',
    name: 'อโกจิมูชิ',
    set: { id: 'SC1a', name: 'ซอร์ด แอนด์ ชีลด์ A' },
    collectorNumber: '002-154',
    localId: '2',
  },
  {
    id: 'TH-20',
    name: 'เอเลซัน',
    set: { id: 'SC1a', name: 'ซอร์ด แอนด์ ชีลด์ A' },
    collectorNumber: '020-154',
    localId: '20',
  },
  {
    id: 'TH-21',
    name: 'สตรินเดอร์',
    set: { id: 'SC1a', name: 'ซอร์ด แอนด์ ชีลด์ A' },
    collectorNumber: '021-154',
    localId: '21',
  },
  {
    id: 'TH-SV8-1',
    name: 'พิคาชู',
    set: { id: 'SV8', name: 'สการ์เล็ต แอนด์ ไวโอเล็ต 8' },
    collectorNumber: '001-100',
    localId: '1',
  },
  {
    id: 'TH-S8A-GRA',
    name: 'พลังงานพื้นฐาน [หญ้า]',
    set: { id: 'S8a', name: '25th Anniversary Collection' },
    collectorNumber: 'GRA',
    localId: '1717',
  },
];

describe('collectionTextParser', () => {
  describe('normalizeCollectorNum', () => {
    it('strips leading zeros and hashes', () => {
      expect(normalizeCollectorNum('#001')).toBe('1');
      expect(normalizeCollectorNum('020')).toBe('20');
      expect(normalizeCollectorNum('#021')).toBe('21');
      expect(normalizeCollectorNum('No. 5')).toBe('5');
      expect(normalizeCollectorNum('0')).toBe('0');
      expect(normalizeCollectorNum('000')).toBe('0');
    });
  });

  describe('extractSetHeader', () => {
    const knownSets = new Set(['SC1a', 'SV8', 'S8a', 'SV-P']);

    it('matches explicit set prefixes', () => {
      expect(extractSetHeader('Set SC1a', knownSets)).toBe('SC1a');
      expect(extractSetHeader('set sc1a', knownSets)).toBe('SC1a');
      expect(extractSetHeader('Set: SV8', knownSets)).toBe('SV8');
      expect(extractSetHeader('ชุด SC1a', knownSets)).toBe('SC1a');
      expect(extractSetHeader('[SV8]', knownSets)).toBe('SV8');
      expect(extractSetHeader('s: s8a', knownSets)).toBe('S8a');
    });

    it('matches standalone set codes', () => {
      expect(extractSetHeader('SC1a', knownSets)).toBe('SC1a');
      expect(extractSetHeader('sv8', knownSets)).toBe('SV8');
    });

    it('does not treat pure card numbers as set headers', () => {
      expect(extractSetHeader('1', knownSets)).toBeNull();
      expect(extractSetHeader('21', knownSets)).toBeNull();
      expect(extractSetHeader('1, 3', knownSets)).toBeNull();
    });
  });

  describe('parseCollectionText', () => {
    it('parses standard set block with number and counts', () => {
      const input = `
Set SC1a
1,3
20,5
21
`;
      const result = parseCollectionText(input, mockCatalog);

      expect(result.unmatchedLines).toHaveLength(0);
      expect(result.setsFound).toEqual(['SC1a']);
      expect(result.distinctCardsCount).toBe(3);
      expect(result.totalQuantity).toBe(9); // 3 + 5 + 1

      const c1 = result.cards.find((c) => c.cardId === 'TH-1');
      expect(c1).toBeDefined();
      expect(c1?.quantity).toBe(3);

      const c20 = result.cards.find((c) => c.cardId === 'TH-20');
      expect(c20).toBeDefined();
      expect(c20?.quantity).toBe(5);

      const c21 = result.cards.find((c) => c.cardId === 'TH-21');
      expect(c21).toBeDefined();
      expect(c21?.quantity).toBe(1); // default 1
    });

    it('supports multiple sets in the same text input', () => {
      const input = `
Set SC1a
1,3

ชุด SV8
1,2
`;
      const result = parseCollectionText(input, mockCatalog);

      expect(result.unmatchedLines).toHaveLength(0);
      expect(result.setsFound).toContain('SC1a');
      expect(result.setsFound).toContain('SV8');
      expect(result.distinctCardsCount).toBe(2);
      expect(result.totalQuantity).toBe(5); // 3 + 2

      expect(result.cards.find((c) => c.cardId === 'TH-1')?.quantity).toBe(3);
      expect(result.cards.find((c) => c.cardId === 'TH-SV8-1')?.quantity).toBe(2);
    });

    it('normalizes card numbers with leading zeros, hashes and full collector numbers', () => {
      const input = `
Set SC1a
#001, 3
020, 5
021-154, 2
`;
      const result = parseCollectionText(input, mockCatalog);
      expect(result.unmatchedLines).toHaveLength(0);
      expect(result.totalQuantity).toBe(10); // 3 + 5 + 2
      expect(result.cards.find((c) => c.cardId === 'TH-1')?.quantity).toBe(3);
      expect(result.cards.find((c) => c.cardId === 'TH-20')?.quantity).toBe(5);
      expect(result.cards.find((c) => c.cardId === 'TH-21')?.quantity).toBe(2);
    });

    it('supports non-numeric card codes like energy GRA', () => {
      const input = `
Set S8a
GRA, 4
`;
      const result = parseCollectionText(input, mockCatalog);
      expect(result.unmatchedLines).toHaveLength(0);
      expect(result.totalQuantity).toBe(4);
      expect(result.cards.find((c) => c.cardId === 'TH-S8A-GRA')?.quantity).toBe(4);
    });

    it('reports unmatched lines with line numbers and reasons', () => {
      const input = `
1,3
Set SC1a
999,2
invalid line text
`;
      const result = parseCollectionText(input, mockCatalog);
      expect(result.unmatchedLines.length).toBe(3);
      expect(result.unmatchedLines[0]).toContain('ยังไม่ได้ระบุรหัสชุด');
      expect(result.unmatchedLines[1]).toContain('ไม่พบการ์ด #999');
      expect(result.unmatchedLines[2]).toContain('รูปแบบการ์ดไม่ถูกต้อง');
    });

    it('automatically parses Pokillionaire JSON format input', () => {
      const jsonInput = JSON.stringify({
        version: '1.0',
        collections: {
          thai: {
            ownedCards: [
              { setId: 'sc1a', cardNumber: '001', cardName: '1 สไตรค์', quantity: 4 },
            ],
          },
        },
      });
      const result = parseCollectionText(jsonInput, mockCatalog);
      expect(result.distinctCardsCount).toBe(1);
      expect(result.totalQuantity).toBe(4);
      expect(result.cards[0].cardId).toBe('TH-1');
      expect(result.cards[0].quantity).toBe(4);
    });
  });
});


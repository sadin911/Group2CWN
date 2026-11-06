import { describe, it, expect } from 'vitest';
import rawCards from './pokemonNames.json';

describe('MA6 Set Completeness and Sorting Verification', () => {
  const ma6Cards = (rawCards as any[]).filter((c) => c.set?.id === 'MA6');

  it('contains exactly 204 cards for MA6 (196 numbered cards + 8 basic energy)', () => {
    expect(ma6Cards.length).toBe(204);
  });

  it('contains every numbered card from 001 to 196 without any gaps', () => {
    const numbersFound = new Set<number>();
    for (const card of ma6Cards) {
      if (card.collectorNumber) {
        const num = parseInt(card.collectorNumber.split(/[-/,]/)[0], 10);
        if (!isNaN(num)) {
          numbersFound.add(num);
        }
      }
    }

    for (let i = 1; i <= 196; i++) {
      expect(
        numbersFound.has(i),
        `Expected card number ${i}/130 to exist in MA6, but it was missing`
      ).toBe(true);
    }
  });

  it('includes the 4 previously omitted secret cards with correct Thai names and rarities', () => {
    const card148 = ma6Cards.find((c) => c.collectorNumber === '148-130');
    expect(card148).toBeDefined();
    expect(card148?.name).toBe('จารารังกา');
    expect(card148?.rarityCode).toBe('AR');
    expect(card148?.stage).toBe('ร่าง 2');
    expect(card148?.hp).toBe(180);
    expect(card148?.types).toContain('Dragon');

    const card157 = ma6Cards.find((c) => c.collectorNumber === '157-130');
    expect(card157).toBeDefined();
    expect(card157?.name).toBe('มิวทูex');
    expect(card157?.rarityCode).toBe('SAR');
    expect(card157?.stage).toBe('พื้นฐาน');
    expect(card157?.hp).toBe(230);
    expect(card157?.types).toContain('Psychic');

    const card158 = ma6Cards.find((c) => c.collectorNumber === '158-130');
    expect(card158).toBeDefined();
    expect(card158?.name).toBe('มิวex');
    expect(card158?.rarityCode).toBe('SAR');
    expect(card158?.stage).toBe('พื้นฐาน');
    expect(card158?.hp).toBe(160);
    expect(card158?.types).toContain('Psychic');

    const card161 = ma6Cards.find((c) => c.collectorNumber === '161-130');
    expect(card161).toBeDefined();
    expect(card161?.name).toBe('เก็งกาex');
    expect(card161?.rarityCode).toBe('SAR');
    expect(card161?.stage).toBe('ร่าง 2');
    expect(card161?.hp).toBe(280);
    expect(card161?.types).toContain('Darkness');
  });

  it('separates Darkrai & Cresselia LEGEND into top (182) and bottom (183) halves', () => {
    const card182 = ma6Cards.find((c) => c.collectorNumber === '182-130');
    expect(card182).toBeDefined();
    expect(card182?.id).toBe('TH-14897');
    expect(card182?.name).toContain('ส่วนบน');

    const card183 = ma6Cards.find((c) => c.collectorNumber === '183-130');
    expect(card183).toBeDefined();
    expect(card183?.id).toBe('TH-MA6-183');
    expect(card183?.name).toContain('ส่วนล่าง');
  });

  it('sorts MA6 cards correctly by collectorNumber in ascending sequence', () => {
    const getCardNum = (c: any) => {
      if (c.collectorNumber) {
        const num = parseInt(String(c.collectorNumber).split(/[-/,]/)[0], 10);
        if (!isNaN(num)) return num;
      }
      const localNum = parseInt(String(c.localId).replace(/\D/g, ''), 10);
      return isNaN(localNum) ? 999999 : localNum;
    };

    const sorted = [...ma6Cards].sort((a, b) => {
      const aNum = getCardNum(a);
      const bNum = getCardNum(b);
      if (aNum !== bNum) return aNum - bNum;
      return (parseInt(String(a.localId).replace(/\D/g, ''), 10) || 0) -
        (parseInt(String(b.localId).replace(/\D/g, ''), 10) || 0);
    });

    // Check positions around 148
    const idx147 = sorted.findIndex((c) => c.collectorNumber === '147-130');
    const idx148 = sorted.findIndex((c) => c.collectorNumber === '148-130');
    const idx149 = sorted.findIndex((c) => c.collectorNumber === '149-130');
    expect(idx148).toBe(idx147 + 1);
    expect(idx149).toBe(idx148 + 1);

    // Check positions around 157 and 158
    const idx156 = sorted.findIndex((c) => c.collectorNumber === '156-130');
    const idx157 = sorted.findIndex((c) => c.collectorNumber === '157-130');
    const idx158 = sorted.findIndex((c) => c.collectorNumber === '158-130');
    const idx159 = sorted.findIndex((c) => c.collectorNumber === '159-130');
    expect(idx157).toBe(idx156 + 1);
    expect(idx158).toBe(idx157 + 1);
    expect(idx159).toBe(idx158 + 1);

    // Check positions around 161
    const idx160 = sorted.findIndex((c) => c.collectorNumber === '160-130');
    const idx161 = sorted.findIndex((c) => c.collectorNumber === '161-130');
    const idx162 = sorted.findIndex((c) => c.collectorNumber === '162-130');
    expect(idx161).toBe(idx160 + 1);
    expect(idx162).toBe(idx161 + 1);

    // Check positions around 182 and 183
    const idx181 = sorted.findIndex((c) => c.collectorNumber === '181-130');
    const idx182 = sorted.findIndex((c) => c.collectorNumber === '182-130');
    const idx183 = sorted.findIndex((c) => c.collectorNumber === '183-130');
    const idx184 = sorted.findIndex((c) => c.collectorNumber === '184-130');
    expect(idx182).toBe(idx181 + 1);
    expect(idx183).toBe(idx182 + 1);
    expect(idx184).toBe(idx183 + 1);
  });
});

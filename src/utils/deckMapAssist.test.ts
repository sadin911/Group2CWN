import { describe, it, expect } from 'vitest';
import {
  resolveEnSetIds,
  resolveThaiCardIdFromEnPrint,
  isSameEnglishCardName,
  preferRegularPrint,
} from './deckMapAssist';

describe('deckMapAssist', () => {
  it('resolves a PTCGL set code to English ptcgio set ids via ptcgoCode', () => {
    expect(resolveEnSetIds('TWM')).toContain('sv6');
    expect(resolveEnSetIds('MEG')).toContain('me1');
    expect(resolveEnSetIds('SIT')).toContain('swsh12');
    // Basic energy set has no ptcgoCode in the dataset
    expect(resolveEnSetIds('MEE')).toEqual([]);
    expect(resolveEnSetIds('')).toEqual([]);
  });

  it('resolves an English print (set code + collector number) to a Thai card id', () => {
    // Verified pairing from thaiEnglishCardMap: EN-me1-119 -> Lillie's Determination
    expect(resolveThaiCardIdFromEnPrint('MEG', '119')).toBe('TH-14395');
    // Unmapped print returns null rather than guessing
    expect(resolveThaiCardIdFromEnPrint('TWM', '128')).toBeNull();
    expect(resolveThaiCardIdFromEnPrint('MEE', '2')).toBeNull();
  });

  it('compares English card names ignoring case, punctuation and spacing', () => {
    expect(isSameEnglishCardName("Boss's Orders", 'Boss’s Orders')).toBe(true);
    expect(isSameEnglishCardName('Poké Pad', 'Poke Pad')).toBe(true);
    expect(isSameEnglishCardName('Munkidori', 'Munkidori')).toBe(true);
  });

  it('treats a missing rank suffix as a different card', () => {
    // The bug this guards: name route dropped the "ex" and matched a plain Fezandipiti
    expect(isSameEnglishCardName('Fezandipiti ex', 'Fezandipiti')).toBe(false);
    expect(isSameEnglishCardName('Charizard ex', 'Charizard')).toBe(false);
    expect(isSameEnglishCardName('Mewtwo VMAX', 'Mewtwo')).toBe(false);
  });

  describe('preferRegularPrint', () => {
    const promo = { id: 'p', name: 'Crushing Hammer', rarityCode: 'PROMO', regulationMark: 'J' };

    it('swaps a promo for a regular print of the same card and regulation', () => {
      const regular = { id: 'r', name: 'Crushing Hammer', rarityCode: 'REGULAR', regulationMark: 'J' };
      expect(preferRegularPrint(promo, [promo, regular]).id).toBe('r');
    });

    it('keeps the promo when the only regular print is a different regulation era', () => {
      const olderReg = { id: 'r', name: 'Crushing Hammer', rarityCode: 'REGULAR', regulationMark: 'H' };
      expect(preferRegularPrint(promo, [promo, olderReg]).id).toBe('p');
    });

    it('keeps the promo when no regular print exists', () => {
      const secretRare = { id: 's', name: 'Crushing Hammer', rarityCode: 'SR', regulationMark: 'J' };
      expect(preferRegularPrint(promo, [promo, secretRare]).id).toBe('p');
    });

    it('leaves a non-promo pick untouched', () => {
      const regular = { id: 'r', name: 'Ultra Ball', rarityCode: 'REGULAR', regulationMark: 'J' };
      expect(preferRegularPrint(regular, [regular, promo]).id).toBe('r');
    });
  });

  it('returns null for unknown input instead of throwing', () => {
    expect(resolveThaiCardIdFromEnPrint('ZZZ', '1')).toBeNull();
    expect(resolveThaiCardIdFromEnPrint('MEG', '')).toBeNull();
  });
});

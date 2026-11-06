import { describe, it, expect } from 'vitest';
import marketPrices from './market_prices.json';
import cardMap from './thaiEnglishCardMap.json';

/**
 * Thai card prices are estimated at one third of the English market price.
 *
 * This guards the data file itself, not just the code. The ratio was silently
 * lost once already: scripts/fetch-pokemon-prices.mjs wrote English price
 * records straight into the mapped Thai card ids, and because
 * getCardMarketPrice matches a Thai cardId directly before it reaches its own
 * divide-by-3 paths, 2,139 Thai cards were served at the full English price.
 * The whole unit suite passed throughout, because nothing asserted the ratio.
 */
const DIVISOR = 3;

interface PriceRecord {
  regular?: number | null;
  foil?: number | null;
  isThaiEstimated?: boolean;
  enReference?: { regular?: number | null; foil?: number | null };
}

const prices = (marketPrices as { prices: Record<string, PriceRecord> }).prices;
const map = cardMap as Record<string, { enCardId?: string; enName?: string }>;

function englishPriceFor(mapping: { enCardId?: string; enName?: string }) {
  const id = mapping.enCardId;
  return (
    (id ? prices[id] : undefined) ??
    (id ? prices[id.replace(/^EN-/, '')] : undefined) ??
    (mapping.enName ? prices[mapping.enName] : undefined)
  );
}

describe('Thai market price ratio', () => {
  const thaiIds = Object.keys(prices).filter((k) => k.startsWith('TH-'));

  it('has Thai price records to check', () => {
    expect(thaiIds.length).toBeGreaterThan(1000);
  });

  it('marks every Thai record as estimated, with an English reference', () => {
    const unmarked = thaiIds.filter((id) => !prices[id].isThaiEstimated);
    // An unmarked record is returned verbatim by getCardMarketPrice, at the
    // full English price.
    expect(unmarked.slice(0, 20)).toEqual([]);

    const missingReference = thaiIds.filter(
      (id) => prices[id].isThaiEstimated && !prices[id].enReference
    );
    // enReference is what unwrapEnglish() reads to show the English price.
    expect(missingReference.slice(0, 20)).toEqual([]);
  });

  it('prices every mapped Thai card at one third of its English counterpart', () => {
    const offenders: Array<{ id: string; thai: number; english: number; ratio: number }> = [];

    for (const [thaiId, mapping] of Object.entries(map)) {
      const thai = prices[thaiId];
      if (!thai || thai.regular == null || thai.regular <= 0) continue;

      const english = englishPriceFor(mapping);
      // Skip cents-level prices, where rounding to 2 decimals distorts the ratio.
      if (!english || english.regular == null || english.regular <= 0.3) continue;

      const ratio = english.regular / thai.regular;
      if (ratio < 2.5 || ratio > 3.6) {
        offenders.push({ id: thaiId, thai: thai.regular, english: english.regular, ratio });
      }
    }

    expect(offenders.slice(0, 20)).toEqual([]);
  });

  it('keeps enReference consistent with the divided price', () => {
    const inconsistent = thaiIds.filter((id) => {
      const r = prices[id];
      const ref = r.enReference?.regular;
      if (r.regular == null || ref == null || ref <= 0.3) return false;
      return Math.abs(r.regular - Math.round((ref / DIVISOR) * 100) / 100) > 0.02;
    });

    expect(inconsistent.slice(0, 20)).toEqual([]);
  });

  it('maintains distinct rarity pricing between Art Rare (AR) and Common cards with the same name', () => {
    // Pikachu AR (TH-6355 / EN-sv3pt5-173) vs Common Pikachu (TH-6123 / EN-sv3pt5-25)
    const pikachuAR = prices['TH-6355'];
    const pikachuCommon = prices['TH-6123'];

    expect(pikachuAR).toBeDefined();
    expect(pikachuCommon).toBeDefined();
    // AR card must have substantial value (> $10 USD)
    expect(pikachuAR.regular).toBeGreaterThan(10);
    // Common card must have standard low value (< $1 USD)
    expect(pikachuCommon.regular).toBeLessThan(1);
    // They must not share the same price
    expect(pikachuAR.regular).not.toEqual(pikachuCommon.regular);

    // Dragonair AR (TH-6364 / EN-sv3pt5-181)
    const dragonairAR = prices['TH-6364'];
    expect(dragonairAR).toBeDefined();
    expect(dragonairAR.regular).toBeGreaterThan(10);
  });

  it('ensures no plain Pokemon names exist as standalone price keys', () => {
    // Plain names like "Pikachu" or "Water Energy" as top-level keys in pricesMap
    // previously caused single-slot cross-rarity overwriting.
    const illegalKeys = Object.keys(prices).filter(
      (k) => !k.startsWith('TH-') && !k.startsWith('EN-') && !/^[a-z0-9]+-[a-z0-9]+$/i.test(k)
    );
    expect(illegalKeys).toEqual([]);
  });
});

import { describe, it, expect } from 'vitest';
import {
  computePriceCoverage,
  formatPriceCoverageReport,
  hasUsablePrice,
} from './priceCoverage';
import pokemonCardData from '../data/pokemonNames.json';
import marketPrices from '../data/market_prices.json';
import cardMap from '../data/thaiEnglishCardMap.json';

const cards = [
  { id: 'TH-1', name: 'A', collectorNumber: '1', rarityCode: 'REGULAR', set: { id: 'SV1', name: 'One' } },
  { id: 'TH-2', name: 'B', collectorNumber: '2', rarityCode: 'AR', set: { id: 'SV1', name: 'One' } },
  { id: 'TH-3', name: 'C', collectorNumber: '3', rarityCode: 'SR', set: { id: 'SV1', name: 'One' } },
  { id: 'TH-4', name: 'D', collectorNumber: '4', rarityCode: 'REGULAR', set: { id: 'SV2', name: 'Two' } },
];

describe('hasUsablePrice', () => {
  it('accepts a positive regular or foil figure', () => {
    expect(hasUsablePrice({ regular: 1.5 })).toBe(true);
    expect(hasUsablePrice({ regular: null, foil: 0.4 })).toBe(true);
  });

  it('rejects absent, null and zero figures', () => {
    expect(hasUsablePrice(undefined)).toBe(false);
    expect(hasUsablePrice({})).toBe(false);
    expect(hasUsablePrice({ regular: null, foil: null })).toBe(false);
    // A zero is not a price anyone can act on.
    expect(hasUsablePrice({ regular: 0, foil: 0 })).toBe(false);
  });
});

describe('computePriceCoverage', () => {
  it('counts priced against unpriced', () => {
    const c = computePriceCoverage(cards, { 'TH-1': { regular: 2 } }, {});
    expect(c.totalCards).toBe(4);
    expect(c.priced).toBe(1);
    expect(c.missing).toBe(3);
    expect(c.coveragePercentage).toBe(25);
  });

  it('calls a card unpaired when it has no English counterpart', () => {
    const c = computePriceCoverage(cards, {}, {});
    expect(c.byReason.unpaired).toBe(4);
    expect(c.byReason.enUnpriced).toBe(0);
    expect(c.byReason.unexpected).toBe(0);
  });

  it('separates a paired card whose English card has no price', () => {
    const c = computePriceCoverage(
      cards,
      {},
      { 'TH-1': { enCardId: 'EN-sv1-5' }, 'TH-2': { enCardId: 'EN-sv1-6' } }
    );
    expect(c.byReason.enUnpriced).toBe(2);
    expect(c.byReason.unpaired).toBe(2);
  });

  it('flags a paired card with a priced English card as unexpected', () => {
    // This combination means the derivation failed, not that data is missing.
    const c = computePriceCoverage(
      cards,
      { 'EN-sv1-5': { regular: 9 } },
      { 'TH-1': { enCardId: 'EN-sv1-5' } }
    );
    expect(c.byReason.unexpected).toBe(1);
    expect(c.cards.find((x) => x.id === 'TH-1')?.reason).toBe('unexpected');
  });

  it('resolves the English price with or without the EN- prefix', () => {
    const c = computePriceCoverage(
      cards,
      { 'sv1-5': { regular: 9 } },
      { 'TH-1': { enCardId: 'EN-sv1-5' } }
    );
    expect(c.byReason.unexpected).toBe(1);
  });

  it('reports each set with its share, worst first', () => {
    const c = computePriceCoverage(cards, { 'TH-1': { regular: 2 } }, {});
    expect(c.bySet[0].key).toBe('SV1');
    expect(c.bySet[0].missing).toBe(2);
    expect(c.bySet[0].total).toBe(3);
    expect(c.bySet[0].percentage).toBe(67);
    expect(c.bySet[1].key).toBe('SV2');
    expect(c.bySet[1].percentage).toBe(100);
  });

  it('orders the drill-down list to match the set table', () => {
    const c = computePriceCoverage(cards, {}, {});
    const setOrder = c.bySet.map((g) => g.key);
    const listOrder = [...new Set(c.cards.map((x) => x.setId))];
    expect(listOrder).toEqual(setOrder);
  });

  it('handles an empty catalogue without dividing by zero', () => {
    const c = computePriceCoverage([], {}, {});
    expect(c.coveragePercentage).toBe(0);
    expect(c.cards).toEqual([]);
    expect(c.bySet).toEqual([]);
  });

  it('treats a fully priced catalogue as complete', () => {
    const priced = Object.fromEntries(cards.map((c) => [c.id, { regular: 1 }]));
    const c = computePriceCoverage(cards, priced, {});
    expect(c.missing).toBe(0);
    expect(c.coveragePercentage).toBe(100);
    expect(c.cards).toEqual([]);
  });
});

describe('against the shipped data', () => {
  const coverage = computePriceCoverage(
    pokemonCardData as any[],
    (marketPrices as { prices: Record<string, any> }).prices,
    cardMap as Record<string, any>
  );

  it('reports the real coverage', () => {
    expect(coverage.totalCards).toBe((pokemonCardData as any[]).length);
    expect(coverage.priced + coverage.missing).toBe(coverage.totalCards);
    // Guards the set-coverage fix that took this from 66% to 93%; a regression
    // in SET_IDS would drop it back.
    expect(coverage.coveragePercentage).toBeGreaterThanOrEqual(85);
  });

  it('accounts for every unpriced card under exactly one reason', () => {
    const summed =
      coverage.byReason.unpaired + coverage.byReason.enUnpriced + coverage.byReason.unexpected;
    expect(summed).toBe(coverage.missing);
    expect(coverage.cards.length).toBe(coverage.missing);
  });

  it('has almost nothing in the unexpected bucket', () => {
    // Anything sizeable here is a derivation bug, not missing upstream data.
    expect(coverage.byReason.unexpected).toBeLessThan(20);
  });

  it('produces a report naming the worst set', () => {
    const text = formatPriceCoverageReport(coverage);
    expect(text).toContain('สรุปการ์ดไทยที่ยังไม่มีราคา');
    expect(text).toContain(coverage.bySet[0].key);
  });
});

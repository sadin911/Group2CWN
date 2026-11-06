import { describe, it, expect } from 'vitest';
import {
  computePairingCoverage,
  formatCoverageReport,
  isAltArtRarity,
} from './pairingCoverage';
import pokemonCardData from '../data/pokemonNames.json';
import cardMap from '../data/thaiEnglishCardMap.json';

const cards = [
  { id: 'TH-1', category: 'Pokemon', rarityCode: 'REGULAR', set: { id: 'SV1', name: 'Set One' } },
  { id: 'TH-2', category: 'Pokemon', rarityCode: 'AR', set: { id: 'SV1', name: 'Set One' } },
  { id: 'TH-3', category: 'Trainer', rarityCode: 'SR', set: { id: 'SV1', name: 'Set One' } },
  { id: 'TH-4', category: 'Pokemon', rarityCode: 'REGULAR', set: { id: 'SV2', name: 'Set Two' } },
  { id: 'TH-5', category: 'Energy', rarityCode: 'REGULAR', set: { id: 'SV2', name: 'Set Two' } },
];

describe('isAltArtRarity', () => {
  it('recognises special and alternate art rarities', () => {
    expect(isAltArtRarity('AR')).toBe(true);
    expect(isAltArtRarity('sr')).toBe(true);
    expect(isAltArtRarity('UR')).toBe(true);
    expect(isAltArtRarity('SAR')).toBe(true);
  });

  it('treats ordinary prints and missing values as not alt art', () => {
    expect(isAltArtRarity('REGULAR')).toBe(false);
    expect(isAltArtRarity('PROMO')).toBe(false);
    expect(isAltArtRarity(undefined)).toBe(false);
    expect(isAltArtRarity('')).toBe(false);
  });
});

describe('computePairingCoverage', () => {
  it('counts matched and unmatched against the supplied map', () => {
    const c = computePairingCoverage(cards, new Set(['TH-1', 'TH-4']));
    expect(c.totalCards).toBe(5);
    expect(c.matched).toBe(2);
    expect(c.unmatched).toBe(3);
    expect(c.coveragePercentage).toBe(40);
  });

  it('separates alt-art cards from the ones worth chasing', () => {
    const c = computePairingCoverage(cards, new Set(['TH-1']));
    // Unmatched: TH-2 (AR), TH-3 (SR), TH-4 (REGULAR), TH-5 (REGULAR)
    expect(c.unmatched).toBe(4);
    expect(c.altArtUnmatched).toBe(2);
    expect(c.actionableUnmatched).toBe(2);
  });

  it('reports each set with its share of the set, not just a count', () => {
    const c = computePairingCoverage(cards, new Set(['TH-1']));
    const sv1 = c.bySet.find((g) => g.key === 'SV1')!;
    expect(sv1.unmatched).toBe(2);
    expect(sv1.total).toBe(3);
    expect(sv1.percentage).toBe(67);

    const sv2 = c.bySet.find((g) => g.key === 'SV2')!;
    expect(sv2.unmatched).toBe(2);
    expect(sv2.total).toBe(2);
    expect(sv2.percentage).toBe(100);
  });

  it('orders sets by count, breaking ties on the share of the set', () => {
    const c = computePairingCoverage(cards, new Set(['TH-1']));
    // SV1 and SV2 both have 2 unmatched; SV2 is 100% vs SV1's 67%.
    expect(c.bySet.map((g) => g.key)).toEqual(['SV2', 'SV1']);
  });

  it('groups by rarity and category', () => {
    const c = computePairingCoverage(cards, new Set());
    expect(c.byRarity.find((g) => g.key === 'REGULAR')?.unmatched).toBe(3);
    expect(c.byCategory.find((g) => g.key === 'Pokemon')?.unmatched).toBe(3);
    expect(c.byCategory.find((g) => g.key === 'Energy')?.unmatched).toBe(1);
  });

  it('handles an empty catalogue without dividing by zero', () => {
    const c = computePairingCoverage([], new Set());
    expect(c.coveragePercentage).toBe(0);
    expect(c.unmatched).toBe(0);
    expect(c.bySet).toEqual([]);
  });

  it('treats a fully paired catalogue as complete', () => {
    const c = computePairingCoverage(cards, new Set(cards.map((x) => x.id)));
    expect(c.unmatched).toBe(0);
    expect(c.coveragePercentage).toBe(100);
    expect(c.bySet).toEqual([]);
  });
});

describe('against the real catalogue', () => {
  const coverage = computePairingCoverage(
    pokemonCardData as any[],
    new Set(Object.keys(cardMap as Record<string, unknown>))
  );

  it('matches the shipped data', () => {
    expect(coverage.totalCards).toBe((pokemonCardData as any[]).length);
    expect(coverage.matched + coverage.unmatched).toBe(coverage.totalCards);
    // Coverage is high; this guards against a map or catalogue change that
    // silently drops pairings.
    expect(coverage.coveragePercentage).toBeGreaterThanOrEqual(90);
  });

  it('separates the remaining gap into alternate art and actionable', () => {
    expect(coverage.unmatched).toBeGreaterThan(0);
    expect(coverage.altArtUnmatched).toBeGreaterThan(0);
    expect(coverage.actionableUnmatched).toBeGreaterThan(0);
  });

  it('produces a report naming the worst set', () => {
    const text = formatCoverageReport(coverage);
    expect(text).toContain('สรุปการ์ดที่ยังจับคู่ไทย-อังกฤษไม่ได้');
    expect(text).toContain(coverage.bySet[0].key);
    expect(text).toContain(String(coverage.unmatched));
  });
});

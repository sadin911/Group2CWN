import { describe, it, expect } from 'vitest';
import {
  combinations,
  hypergeometricProbability,
  hypergeometricAtLeast,
  calculateDeckConsistency,
} from './hypergeometric';
import type { Deck } from '../types/deck';

describe('Hypergeometric Math Suite', () => {
  it('correctly calculates combinations n Choose k', () => {
    expect(combinations(5, 0)).toBe(1);
    expect(combinations(5, 1)).toBe(5);
    expect(combinations(5, 2)).toBe(10);
    expect(combinations(60, 7)).toBe(386206920);
  });

  it('correctly calculates hypergeometric probability P(X = k)', () => {
    // Deck of 60 with 10 Basic Pokemon, drawing 7:
    // P(X = 0) = combinations(10, 0) * combinations(50, 7) / combinations(60, 7)
    // 1 * 99884400 / 386206920 ≈ 0.2586 (25.86%)
    const p0 = hypergeometricProbability(60, 10, 7, 0);
    expect(p0).toBeCloseTo(0.2586, 3);

    // P(X >= 1) = 1 - P(X = 0) ≈ 0.7414 (74.14%)
    const pAtLeast1 = hypergeometricAtLeast(60, 10, 7, 1);
    expect(pAtLeast1).toBeCloseTo(0.7414, 3);
  });

  it('calculates deck consistency statistics accurately', () => {
    const mockDeck: Deck = {
      id: 'test-deck',
      name: 'Charizard ex Test',
      cards: {
        'charmander-id': { cardId: 'charmander-id', count: 4 },
        'pidgey-id': { cardId: 'pidgey-id', count: 4 },
        'nest-ball-id': { cardId: 'nest-ball-id', count: 4 },
        'research-id': { cardId: 'research-id', count: 4 },
        'fire-energy-id': { cardId: 'fire-energy-id', count: 8 },
        'charizard-id': { cardId: 'charizard-id', count: 3 },
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const mockCardDataMap = new Map<string, any>([
      ['charmander-id', { id: 'charmander-id', name: 'ฮิโตคาเงะ', category: 'Pokemon', stage: 'พื้นฐาน' }],
      ['pidgey-id', { id: 'pidgey-id', name: 'ป็อปโปะ', category: 'Pokemon', stage: 'พื้นฐาน' }],
      ['charizard-id', { id: 'charizard-id', name: 'ลิซาร์ดอน ex', category: 'Pokemon', stage: 'ร่าง 2' }],
      ['nest-ball-id', { id: 'nest-ball-id', name: 'เนสต์บอล', category: 'Trainer' }],
      ['research-id', { id: 'research-id', name: 'งานวิจัยของศาสตราจารย์', category: 'Trainer', trainerType: 'ซัพพอร์ต' }],
      ['fire-energy-id', { id: 'fire-energy-id', name: 'พลังงานพื้นฐาน[ไฟ]', category: 'Energy' }],
    ]);

    const stats = calculateDeckConsistency(mockDeck, mockCardDataMap);

    expect(stats.totalCards).toBe(27);
    expect(stats.basicPokemonCount).toBe(8); // 4 charmander + 4 pidgey
    expect(stats.searchTrainerCount).toBe(4); // 4 nest ball
    expect(stats.supporterCount).toBe(4); // 4 research
    expect(stats.energyCount).toBe(8); // 8 fire energy

    // In 27 cards with 8 basics, drawing 7: very high chance of basic
    expect(stats.pBasicOpening).toBeGreaterThan(90);
    expect(stats.mulliganExpectation).toBeLessThan(10);
  });

  it('identifies Thai Supporter cards even without explicit trainerType tag', () => {
    const mockDeck: Deck = {
      id: 'supp-deck',
      name: 'Supporter Detection Test',
      cards: {
        'iono-id': { cardId: 'iono-id', count: 4 },
        'arven-id': { cardId: 'arven-id', count: 3 },
        'boss-id': { cardId: 'boss-id', count: 2 },
        'ball-id': { cardId: 'ball-id', count: 4 },
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const mockCardDataMap = new Map<string, any>([
      ['iono-id', { id: 'iono-id', name: 'นันจาโม', category: 'Trainer' }], // No trainerType
      ['arven-id', { id: 'arven-id', name: 'เปปเปอร์', category: 'Trainer' }], // No trainerType
      ['boss-id', { id: 'boss-id', name: 'คำสั่งของบอส (ซากากิ)', category: 'Trainer' }],
      ['ball-id', { id: 'ball-id', name: 'ไฮเปอร์บอล', category: 'Trainer' }],
    ]);

    const stats = calculateDeckConsistency(mockDeck, mockCardDataMap);
    expect(stats.supporterCount).toBe(9); // 4 iono + 3 arven + 2 boss
    expect(stats.searchTrainerCount).toBe(4); // 4 ultra ball
  });
});

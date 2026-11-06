import { describe, it, expect, beforeEach } from 'vitest';
import metaDecksData from '../../data/metaDecks.json';
import pokemonNames from '../../data/pokemonNames.json';
import { calculateMissingCards } from '../../utils/deckCalculator';
import { useDeckStore } from '../../store/deckStore';
import type { MetaDeck } from '../../types/metaDeck';

describe('MetaDecksHub Dataset and Integration Tests', () => {
  const metaDecks = metaDecksData as unknown as MetaDeck[];
  const cardDataMap = new Map<string, any>();
  (pokemonNames as any[]).forEach((c) => cardDataMap.set(c.id, c));

  beforeEach(() => {
    useDeckStore.setState({
      decks: {},
      activeDeckId: null,
    });
  });

  it('contains valid live tournament meta decks from Limitless TCG', () => {
    expect(metaDecks.length).toBeGreaterThanOrEqual(20);

    for (const deck of metaDecks) {
      expect(deck.id).toMatch(/^meta-limitless-/);
      expect(deck.name).toBeTruthy();
      expect(deck.sourceUrl).toContain('limitlesstcg.com');
      expect(deck.tier).toMatch(/^(Tier 1|Tier 2|Tier 3|Rogue)$/);
      expect(deck.playstyle).toMatch(/^(Aggro|Setup|Control|Toolbox|Single Prize)$/);
      expect(Array.isArray(deck.pros)).toBe(true);
      expect(Array.isArray(deck.cons)).toBe(true);
      expect(deck.cards).toBeDefined();

      // Total count across cards must be exactly 60
      const totalCount = Object.values(deck.cards).reduce((acc, c) => acc + c.count, 0);
      expect(totalCount).toBe(60);
    }
  });

  it('ensures all mapped cardIds in meta decks exist in Thai pokemonNames database', () => {
    for (const deck of metaDecks) {
      for (const entry of Object.values(deck.cards)) {
        const card = cardDataMap.get(entry.cardId);
        expect(card).toBeDefined();
        expect(card.id).toBe(entry.cardId);
        expect(entry.count).toBeGreaterThanOrEqual(1);
        const isEnergy = card.category === 'Energy' || card.name.includes('พลังงานพื้นฐาน');
        if (!isEnergy) {
          expect(entry.count).toBeLessThanOrEqual(4);
        } else {
          expect(entry.count).toBeLessThanOrEqual(59);
        }
      }
    }
  });

  it('correctly calculates missing card reports for meta decks against user collection', () => {
    const sampleMetaDeck = metaDecks[0]; // Dragapult ex
    const emptyCollection = {};

    const report = calculateMissingCards(sampleMetaDeck, cardDataMap, emptyCollection);
    expect(report.totalCardsNeeded).toBe(60);
    expect(report.totalCardsOwned).toBe(0);
    expect(report.totalCardsMissing).toBe(60);
    expect(report.isComplete).toBe(false);
    expect(report.completionPercentage).toBe(0);

    // Mock owning 4 copies of the first card
    const firstCardId = Object.keys(sampleMetaDeck.cards)[0];
    const needed = sampleMetaDeck.cards[firstCardId].count;

    const mockCollection = {
      [firstCardId]: {
        cardId: firstCardId,
        variants: { normal: needed, holo: 0, reverse: 0, promo: 0 },
        updatedAt: Date.now(),
      },
    };

    const partialReport = calculateMissingCards(sampleMetaDeck, cardDataMap, mockCollection);
    expect(partialReport.totalCardsOwned).toBe(needed);
    expect(partialReport.totalCardsMissing).toBe(60 - needed);
    expect(partialReport.completionPercentage).toBeGreaterThan(0);
  });

  it('supports 1-click cloning a meta deck into user deckStore', () => {
    const sampleMetaDeck = metaDecks[0];
    const importParsedDeck = useDeckStore.getState().importParsedDeck;

    const newDeckId = importParsedDeck({
      name: `${sampleMetaDeck.name} (Meta Copy)`,
      description: `โคลนมาจาก: ${sampleMetaDeck.name}`,
      cards: sampleMetaDeck.cards,
      coverCardId: sampleMetaDeck.coverCardId,
      coverImageUrl: sampleMetaDeck.coverImageUrl,
    });

    const userDecks = useDeckStore.getState().decks;
    expect(userDecks[newDeckId]).toBeDefined();
    expect(userDecks[newDeckId].name).toBe(`${sampleMetaDeck.name} (Meta Copy)`);
    expect(userDecks[newDeckId].coverCardId).toBe(sampleMetaDeck.coverCardId);

    const clonedCardCount = Object.values(userDecks[newDeckId].cards).reduce(
      (acc, c) => acc + c.count,
      0
    );
    expect(clonedCardCount).toBe(60);
  });
});

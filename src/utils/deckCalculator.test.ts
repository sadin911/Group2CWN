import { describe, it, expect } from 'vitest';
import {
  getCardEquivalenceKey,
  calculateDeckStats,
  calculateMissingCards,
  generateShoppingListText,
  isBasicEnergy,
} from './deckCalculator';
import type { Deck } from '../types/deck';
import type { CollectionCardEntry } from '../types/collection';

describe('deckCalculator', () => {
  describe('getCardEquivalenceKey & isBasicEnergy', () => {
    it('normalizes basic energy of same type across various naming styles', () => {
      expect(isBasicEnergy('พลังงานพื้นฐาน [หญ้า]')).toBe(true);
      expect(isBasicEnergy('พลังงานพื้นฐาน[หญ้า]')).toBe(true);
      expect(isBasicEnergy('Basic Grass Energy')).toBe(true);

      const grass1 = { name: 'พลังงานพื้นฐาน [หญ้า]', category: 'Energy', types: ['Grass'] };
      const grass2 = { name: 'พลังงานพื้นฐาน[หญ้า]', category: 'Energy', types: ['Grass'] };
      const grass3 = { name: 'Basic Grass Energy', category: 'Energy', types: ['Grass'] };

      expect(getCardEquivalenceKey(grass1)).toBe('energy:basic:grass');
      expect(getCardEquivalenceKey(grass2)).toBe('energy:basic:grass');
      expect(getCardEquivalenceKey(grass3)).toBe('energy:basic:grass');
    });

    it('normalizes Boss\'s Orders across character variants', () => {
      const boss1 = { name: 'คำสั่งของบอส (ซากากิ)', category: 'Trainer' };
      const boss2 = { name: 'คำสั่งของบอส (อาคากิ)', category: 'Trainer' };
      const boss3 = { name: 'คำสั่งของบอส', category: 'Trainer' };
      const boss4 = { name: "Boss's Orders (Cyrus)", category: 'Trainer' };

      expect(getCardEquivalenceKey(boss1)).toBe("trainer:supporter:boss's orders");
      expect(getCardEquivalenceKey(boss2)).toBe("trainer:supporter:boss's orders");
      expect(getCardEquivalenceKey(boss3)).toBe("trainer:supporter:boss's orders");
      expect(getCardEquivalenceKey(boss4)).toBe("trainer:supporter:boss's orders");
    });

    it('normalizes Professor\'s Research across professor variants', () => {
      const prof1 = { name: 'งานวิจัยของศาสตราจารย์ (ศาสตราจารย์โอลิม)', category: 'Trainer' };
      const prof2 = { name: 'งานวิจัยของศาสตราจารย์ (ศาสตราจารย์ฟูทูร์)', category: 'Trainer' };
      const prof3 = { name: 'งานวิจัยของศาสตราจารย์', category: 'Trainer' };

      expect(getCardEquivalenceKey(prof1)).toBe("trainer:supporter:professor's research");
      expect(getCardEquivalenceKey(prof2)).toBe("trainer:supporter:professor's research");
      expect(getCardEquivalenceKey(prof3)).toBe("trainer:supporter:professor's research");
    });

    it('normalizes Pokémon and Trainer card names with bracket tags and whitespace', () => {
      const nestBall1 = { name: 'เนสท์บอล [ไอเท็ม]', category: 'Trainer' };
      const nestBall2 = { name: 'เนสท์บอล', category: 'Trainer' };
      expect(getCardEquivalenceKey(nestBall1)).toBe('trainer:เนสท์บอล');
      expect(getCardEquivalenceKey(nestBall2)).toBe('trainer:เนสท์บอล');

      const charizard = { name: 'ลิซาร์ดอนex', category: 'Pokemon' };
      expect(getCardEquivalenceKey(charizard)).toBe('pokemon:ลิซาร์ดอนex');
    });
  });

  describe('calculateDeckStats', () => {
    it('detects more than 4 cards of equivalent name across different set prints', () => {
      const cardMap = new Map<string, any>([
        ['card-boss-1', { name: 'คำสั่งของบอส (ซากากิ)', category: 'Trainer' }],
        ['card-boss-2', { name: 'คำสั่งของบอส (อาคากิ)', category: 'Trainer' }],
      ]);

      const deck: Deck = {
        id: 'deck-1',
        name: 'Test Deck',
        cards: {
          'card-boss-1': { cardId: 'card-boss-1', count: 3 },
          'card-boss-2': { cardId: 'card-boss-2', count: 2 }, // Total 5 Boss's Orders
        },
        createdAt: 100,
        updatedAt: 100,
      };

      const stats = calculateDeckStats(deck, cardMap);
      expect(stats.isLegal60).toBe(false);
      expect(stats.ruleViolations.some((v) => v.includes('เกิน 4 ใบ'))).toBe(true);
    });

    it('detects more than 1 ACE SPEC card in deck', () => {
      const cardMap = new Map<string, any>([
        ['card-prime', { name: 'ไพรม์แคชเชอร์', category: 'Trainer' }],
        ['card-drum', { name: 'กลองปลุกพลัง', category: 'Trainer' }],
      ]);

      const deck: Deck = {
        id: 'deck-ace-test',
        name: 'Dual Ace Deck',
        cards: {
          'card-prime': { cardId: 'card-prime', count: 1 },
          'card-drum': { cardId: 'card-drum', count: 1 },
        },
        createdAt: 100,
        updatedAt: 100,
      };

      const stats = calculateDeckStats(deck, cardMap);
      expect(stats.ruleViolations.some((v) => v.includes('ACE SPEC ใส่ได้ไม่เกิน 1 ใบ'))).toBe(true);
    });
  });

  describe('calculateMissingCards with Cross-Set Equivalence', () => {
    const cardDataMap = new Map<string, any>([
      [
        'ultra-ball-sv4a-sar',
        {
          id: 'ultra-ball-sv4a-sar',
          name: 'อัลตร้าบอล',
          category: 'Trainer',
          set: { id: 'SV4a', name: 'ไชนีเทรเชอร์ ex' },
          collectorNumber: '335/190',
        },
      ],
      [
        'ultra-ball-sc1a-reg',
        {
          id: 'ultra-ball-sc1a-reg',
          name: 'อัลตร้าบอล',
          category: 'Trainer',
          set: { id: 'SC1a', name: 'ซอร์ด แอนด์ ชีลด์ A' },
          collectorNumber: '120/154',
        },
      ],
      [
        'boss-orders-sv1v',
        {
          id: 'boss-orders-sv1v',
          name: 'คำสั่งของบอส (เกซิส)',
          category: 'Trainer',
          set: { id: 'SV1V', name: 'ไวโอเล็ต ex' },
          collectorNumber: '088/078',
        },
      ],
      [
        'boss-orders-s12a',
        {
          id: 'boss-orders-s12a',
          name: 'คำสั่งของบอส (อาคากิ)',
          category: 'Trainer',
          set: { id: 'S12a', name: 'VSTAR ยูนิเวิร์ส' },
          collectorNumber: '114/172',
        },
      ],
    ]);

    it('satisfies deck requirement if user owns equivalent printings from different sets in equivalent mode', () => {
      const deck: Deck = {
        id: 'deck-1',
        name: 'Competitive Deck',
        cards: {
          'ultra-ball-sv4a-sar': { cardId: 'ultra-ball-sv4a-sar', count: 4 },
        },
        createdAt: 100,
        updatedAt: 100,
      };

      // User owns 0 of SV4a SAR, but 4 of SC1a Regular
      const userCollectionCards: Record<string, CollectionCardEntry> = {
        'ultra-ball-sc1a-reg': {
          cardId: 'ultra-ball-sc1a-reg',
          variants: { normal: 4, holo: 0, reverse: 0, promo: 0 },
          updatedAt: 100,
        },
      };

      // Equivalent Mode
      const eqReport = calculateMissingCards(deck, cardDataMap, userCollectionCards, 'equivalent');
      expect(eqReport.totalCardsNeeded).toBe(4);
      expect(eqReport.totalCardsOwned).toBe(4);
      expect(eqReport.totalCardsMissing).toBe(0);
      expect(eqReport.isComplete).toBe(true);
      expect(eqReport.completionPercentage).toBe(100);
      expect(eqReport.completeItems.length).toBe(1);
      expect(eqReport.completeItems[0].exactOwned).toBe(0);
      expect(eqReport.completeItems[0].totalEquivalentOwned).toBe(4);
      expect(eqReport.completeItems[0].equivalentCardsOwned?.length).toBe(1);

      // Exact Mode
      const exactReport = calculateMissingCards(deck, cardDataMap, userCollectionCards, 'exact');
      expect(exactReport.totalCardsNeeded).toBe(4);
      expect(exactReport.totalCardsOwned).toBe(0);
      expect(exactReport.totalCardsMissing).toBe(4);
      expect(exactReport.isComplete).toBe(false);
      expect(exactReport.completionPercentage).toBe(0);
      expect(exactReport.missingItems.length).toBe(1);
      expect(exactReport.missingItems[0].exactOwned).toBe(0);
    });

    it('handles multi-print split in deck correctly without overcrediting pool', () => {
      const deck: Deck = {
        id: 'deck-2',
        name: 'Split Art Deck',
        cards: {
          'boss-orders-sv1v': { cardId: 'boss-orders-sv1v', count: 2 },
          'boss-orders-s12a': { cardId: 'boss-orders-s12a', count: 2 },
        },
        createdAt: 100,
        updatedAt: 100,
      };

      // User has 3 Boss's Orders total across collection
      const userCollectionCards: Record<string, CollectionCardEntry> = {
        'boss-orders-sv1v': {
          cardId: 'boss-orders-sv1v',
          variants: { normal: 2, holo: 0, reverse: 0, promo: 0 },
          updatedAt: 100,
        },
        'boss-orders-s12a': {
          cardId: 'boss-orders-s12a',
          variants: { normal: 1, holo: 0, reverse: 0, promo: 0 },
          updatedAt: 100,
        },
      };

      const report = calculateMissingCards(deck, cardDataMap, userCollectionCards, 'equivalent');
      expect(report.totalCardsNeeded).toBe(4);
      expect(report.totalCardsOwned).toBe(3); // accurately 3 owned
      expect(report.totalCardsMissing).toBe(1); // accurately 1 missing
      expect(report.completionPercentage).toBe(75);
    });

    it('generates helpful shopping list text including alternate print notes', () => {
      const deck: Deck = {
        id: 'deck-3',
        name: 'Charizard Deck',
        cards: {
          'ultra-ball-sv4a-sar': { cardId: 'ultra-ball-sv4a-sar', count: 4 },
        },
        createdAt: 100,
        updatedAt: 100,
      };

      // User has 2 copies from SC1a
      const userCollectionCards: Record<string, CollectionCardEntry> = {
        'ultra-ball-sc1a-reg': {
          cardId: 'ultra-ball-sc1a-reg',
          variants: { normal: 2, holo: 0, reverse: 0, promo: 0 },
          updatedAt: 100,
        },
      };

      const report = calculateMissingCards(deck, cardDataMap, userCollectionCards, 'equivalent');
      const text = generateShoppingListText(deck.name, report);
      expect(text).toContain('อัลตร้าบอล');
      expect(text).toContain('ขาด 2 ใบ');
      expect(text).toContain('มีชุดอื่นรวม 2 ใบ');
    });
  });
});

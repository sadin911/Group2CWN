import { describe, it, expect } from 'vitest';
import exampleImportData from '../../exampleimport.json';
import {
  isPokillionaireFormat,
  cleanPokillionaireCardName,
  parsePokillionaireExport,
} from './pokillionaireParser';
import pokemonCardData from '../data/pokemonNames.json';

describe('pokillionaireParser', () => {
  describe('isPokillionaireFormat', () => {
    it('returns true for valid Pokillionaire collections structure', () => {
      const data = {
        version: '1.0',
        collections: {
          thai: {
            ownedCards: [{ setId: 'ma3', cardNumber: '002', cardName: 'ยันยันมา', quantity: 1 }],
          },
        },
      };
      expect(isPokillionaireFormat(data)).toBe(true);
    });

    it('returns true for Pokillionaire with english collection', () => {
      const data = {
        collections: {
          english: {
            ownedCards: [{ setId: 'sv1', cardNumber: '001', cardName: 'Bulbasaur', quantity: 1 }],
          },
        },
      };
      expect(isPokillionaireFormat(data)).toBe(true);
    });

    it('returns false for null or undefined or non-object', () => {
      expect(isPokillionaireFormat(null)).toBe(false);
      expect(isPokillionaireFormat(undefined)).toBe(false);
      expect(isPokillionaireFormat('hello')).toBe(false);
      expect(isPokillionaireFormat(123)).toBe(false);
    });

    it('returns false for native PokéCountTracker backup format', () => {
      const nativeData = {
        version: '1.0.0',
        activeProfileId: 'default',
        profiles: {
          default: { id: 'default', name: 'Main', cards: {} },
        },
      };
      expect(isPokillionaireFormat(nativeData)).toBe(false);
    });
  });

  describe('cleanPokillionaireCardName', () => {
    it('removes leading number and spaces', () => {
      expect(cleanPokillionaireCardName('2 ยันยันมา')).toBe('ยันยันมา');
      expect(cleanPokillionaireCardName('10 โรสเรด ของชิโรนะ')).toBe('โรสเรด ของชิโรนะ');
      expect(cleanPokillionaireCardName('194 เมก้าเรควอซาex')).toBe('เมก้าเรควอซาex');
    });

    it('handles card name without leading numbers', () => {
      expect(cleanPokillionaireCardName('พิคาชู')).toBe('พิคาชู');
      expect(cleanPokillionaireCardName('')).toBe('');
    });
  });

  describe('parsePokillionaireExport with exampleimport.json', () => {
    it('successfully matches all 169 cards from exampleimport.json', () => {
      const result = parsePokillionaireExport(exampleImportData, pokemonCardData as any[]);

      expect(result.success).toBe(true);
      expect(result.cards.length).toBe(169);
      expect(result.distinctCardsCount).toBe(169);
      expect(result.totalQuantityCount).toBe(204);
      expect(result.unmatched.length).toBe(0);
      expect(result.setsFound.sort()).toEqual(['MA2', 'MA3']);

      // Check first card details (002 ยันยันมา in MA3)
      const firstCard = result.cards.find((c) => c.sourceCardNumber === '002');
      expect(firstCard).toBeDefined();
      expect(firstCard?.card.name).toBe('ยันยันมา');
      expect(firstCard?.card.set.id).toBe('MA3');
      expect(firstCard?.quantity).toBe(1);
    });

    it('gracefully handles missing set or card numbers', () => {
      const mockData = {
        collections: {
          thai: {
            ownedCards: [
              { setId: 'INVALID_SET_999', cardNumber: '001', cardName: 'Unknown', quantity: 2 },
              { setId: 'MA3', cardNumber: '99999', cardName: 'NonExistent', quantity: 1 },
            ],
          },
        },
      };

      const result = parsePokillionaireExport(mockData, pokemonCardData as any[]);
      expect(result.cards.length).toBe(0);
      expect(result.unmatched.length).toBe(2);
      expect(result.unmatched[0].reason).toContain('ไม่พบชุดการ์ด');
      expect(result.unmatched[1].reason).toContain('ไม่พบการ์ดหมายเลข');
    });
  });
});

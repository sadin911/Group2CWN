import { describe, it, expect } from 'vitest';
import {
  parseSelectedRarities,
  isRaritySelected,
  toggleRarityInSelection,
  matchesRarityFilter,
  getCardRarityClass,
} from './rarity';

describe('rarity multi-select utilities', () => {
  describe('parseSelectedRarities', () => {
    it('returns ["ALL"] when undefined, empty, or ALL', () => {
      expect(parseSelectedRarities()).toEqual(['ALL']);
      expect(parseSelectedRarities('')).toEqual(['ALL']);
      expect(parseSelectedRarities('ALL')).toEqual(['ALL']);
      expect(parseSelectedRarities(['ALL'])).toEqual(['ALL']);
      expect(parseSelectedRarities([])).toEqual(['ALL']);
    });

    it('parses single rarity string', () => {
      expect(parseSelectedRarities('SAR')).toEqual(['SAR']);
      expect(parseSelectedRarities('ar')).toEqual(['AR']);
    });

    it('parses comma-separated rarity strings', () => {
      expect(parseSelectedRarities('SAR,AR')).toEqual(['SAR', 'AR']);
      expect(parseSelectedRarities(' SAR , ar , UR ')).toEqual(['SAR', 'AR', 'UR']);
    });

    it('returns ["ALL"] if list includes ALL alongside others', () => {
      expect(parseSelectedRarities('ALL,SAR')).toEqual(['ALL']);
    });
  });

  describe('isRaritySelected', () => {
    it('correctly detects selected rarities', () => {
      expect(isRaritySelected('ALL', 'ALL')).toBe(true);
      expect(isRaritySelected('ALL', 'SAR')).toBe(false);
      expect(isRaritySelected('SAR,AR', 'SAR')).toBe(true);
      expect(isRaritySelected('SAR,AR', 'AR')).toBe(true);
      expect(isRaritySelected('SAR,AR', 'SR')).toBe(false);
      expect(isRaritySelected('SAR,AR', 'ALL')).toBe(false);
    });
  });

  describe('toggleRarityInSelection', () => {
    it('switches from ALL to target rarity', () => {
      expect(toggleRarityInSelection('ALL', 'SAR')).toBe('SAR');
    });

    it('adds new rarity to existing selection', () => {
      expect(toggleRarityInSelection('SAR', 'AR')).toBe('SAR,AR');
      expect(toggleRarityInSelection('SAR,AR', 'UR')).toBe('SAR,AR,UR');
    });

    it('removes an already selected rarity', () => {
      expect(toggleRarityInSelection('SAR,AR', 'SAR')).toBe('AR');
    });

    it('reverts to ALL when the last selected rarity is removed', () => {
      expect(toggleRarityInSelection('SAR', 'SAR')).toBe('ALL');
    });

    it('resets to ALL when target is ALL', () => {
      expect(toggleRarityInSelection('SAR,AR', 'ALL')).toBe('ALL');
    });
  });

  describe('matchesRarityFilter', () => {
    const mockCardSAR = { name: 'ลิซาร์ดอน ex', collectorNumber: '201/165', set: { id: 'SV2a' } };
    const mockCardRegular = { name: 'พิคาชู', collectorNumber: '025/165', set: { id: 'SV2a' } };

    it('matches any card when ALL is selected', () => {
      expect(matchesRarityFilter(mockCardSAR, 'ALL')).toBe(true);
      expect(matchesRarityFilter(mockCardRegular, 'ALL')).toBe(true);
    });

    it('matches card matching single rarity', () => {
      const sarClass = getCardRarityClass(mockCardSAR);
      expect(matchesRarityFilter(mockCardSAR, sarClass)).toBe(true);
      expect(matchesRarityFilter(mockCardRegular, sarClass)).toBe(false);
    });

    it('matches card matching any rarity in multi-select', () => {
      const sarClass = getCardRarityClass(mockCardSAR);
      expect(matchesRarityFilter(mockCardSAR, `${sarClass},AR`)).toBe(true);
      expect(matchesRarityFilter(mockCardRegular, `${sarClass},AR`)).toBe(false);
      expect(matchesRarityFilter(mockCardRegular, `${sarClass},REGULAR`)).toBe(true);
    });
  });

  describe('isAceSpecCard and ACE_SPEC filtering', () => {
    const thaiPrimeCatcher = { id: 'TH-7958', name: 'ไพรม์แคชเชอร์', collectorNumber: '062-071', set: { id: 'SV5M' } };
    const thaiAwakeningDrum = { id: 'TH-7887', name: 'กลองปลุกพลัง', collectorNumber: '062-071', set: { id: 'SV5K' } };
    const thaiMasterBall = { id: 'TH-8031', name: 'มาสเตอร์บอล', collectorNumber: '015-022', set: { id: 'SVHK' } };
    const enPrimeCatcher = { id: 'EN-tef-157', name: 'Prime Catcher', rarity: 'ACE SPEC Rare', subtypes: ['Item', 'ACE SPEC'] };
    const enHerosCape = { id: 'EN-tef-152', name: "Hero's Cape", rarity: 'ACE SPEC Rare', subtypes: ['Pokémon Tool', 'ACE SPEC'] };
    const regularCard = { id: 'TH-1234', name: 'พิคาชู', collectorNumber: '025/165', set: { id: 'SV2a' } };

    it('identifies Thai ACE SPEC cards by name', () => {
      expect(getCardRarityClass(thaiPrimeCatcher)).toBe('ACE_SPEC');
      expect(getCardRarityClass(thaiAwakeningDrum)).toBe('ACE_SPEC');
      expect(getCardRarityClass(thaiMasterBall)).toBe('ACE_SPEC');
    });

    it('identifies English ACE SPEC cards', () => {
      expect(getCardRarityClass(enPrimeCatcher)).toBe('ACE_SPEC');
      expect(getCardRarityClass(enHerosCape)).toBe('ACE_SPEC');
    });

    it('returns REGULAR for normal non-ACE cards', () => {
      expect(getCardRarityClass(regularCard)).toBe('REGULAR');
    });

    it('matches ACE_SPEC in matchesRarityFilter', () => {
      expect(matchesRarityFilter(thaiPrimeCatcher, 'ACE_SPEC')).toBe(true);
      expect(matchesRarityFilter(enPrimeCatcher, 'ACE_SPEC')).toBe(true);
      expect(matchesRarityFilter(regularCard, 'ACE_SPEC')).toBe(false);
    });

    it('matches ACE_SPEC in multi-select rarity filters', () => {
      expect(matchesRarityFilter(thaiPrimeCatcher, 'SAR,ACE_SPEC')).toBe(true);
      expect(matchesRarityFilter(regularCard, 'SAR,ACE_SPEC')).toBe(false);
      expect(matchesRarityFilter(regularCard, 'SAR,ACE_SPEC,REGULAR')).toBe(true);
    });
  });
});

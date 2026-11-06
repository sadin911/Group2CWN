import { describe, it, expect } from 'vitest';
import { EvolutionResolver } from './EvolutionResolver';
import type { CardInstance } from '../types';

function createTestCard(
  nameEn: string,
  nameTh: string,
  subtypes: string[],
  evolvesFrom?: string
): CardInstance {
  return {
    instanceId: `test-${nameEn.toLowerCase()}-${Math.random().toString(36).slice(2, 6)}`,
    cardCode: 'TEST-001',
    nameEn,
    nameTh,
    supertype: 'Pokemon',
    subtypes,
    evolvesFrom,
  };
}

describe('EvolutionResolver', () => {
  it('correctly matches standard Stage 1 evolution (Charmander -> Charmeleon)', () => {
    const basic = createTestCard('Charmander', 'ฮิโตคาเงะ', ['Basic']);
    const stage1 = createTestCard('Charmeleon', 'ลิซาร์โดะ', ['Stage 1']);

    expect(EvolutionResolver.isEvolutionMatch(stage1, basic)).toBe(true);
    expect(EvolutionResolver.isEvolutionMatch(basic, stage1)).toBe(false);
  });

  it('correctly matches Stage 2 evolution from Stage 1 (Charmeleon -> Charizard ex)', () => {
    const stage1 = createTestCard('Charmeleon', 'ลิซาร์โดะ', ['Stage 1']);
    const stage2 = createTestCard('Charizard ex', 'ลิซาร์ดอนex', ['Stage 2', 'ex']);

    expect(EvolutionResolver.isEvolutionMatch(stage2, stage1)).toBe(true);
    // Standard evolution forbids Basic directly to Stage 2
    const basic = createTestCard('Charmander', 'ฮิโตคาเงะ', ['Basic']);
    expect(EvolutionResolver.isEvolutionMatch(stage2, basic)).toBe(false);
  });

  it('correctly allows Basic to Stage 2 with Rare Candy flag (Charmander -> Charizard ex)', () => {
    const basic = createTestCard('Charmander', 'ฮิโตคาเงะ', ['Basic']);
    const stage2 = createTestCard('Charizard ex', 'ลิซาร์ดอนex', ['Stage 2', 'ex']);

    expect(EvolutionResolver.isEvolutionMatch(stage2, basic, true)).toBe(true);
  });

  it('rejects cross-family evolutions', () => {
    const pikachu = createTestCard('Pikachu', 'พิคาชู', ['Basic']);
    const charizard = createTestCard('Charizard ex', 'ลิซาร์ดอนex', ['Stage 2', 'ex']);
    const charmeleon = createTestCard('Charmeleon', 'ลิซาร์โดะ', ['Stage 1']);

    expect(EvolutionResolver.isEvolutionMatch(charmeleon, pikachu)).toBe(false);
    expect(EvolutionResolver.isEvolutionMatch(charizard, pikachu, true)).toBe(false);
  });

  it('matches Dragapult family (Dreepy -> Drakloak -> Dragapult ex)', () => {
    const dreepy = createTestCard('Dreepy', 'โดราเมชิยะ', ['Basic']);
    const drakloak = createTestCard('Drakloak', 'โดรอนจิ', ['Stage 1']);
    const dragapult = createTestCard('Dragapult ex', 'โดราพัลท์ex', ['Stage 2', 'ex']);

    expect(EvolutionResolver.isEvolutionMatch(drakloak, dreepy)).toBe(true);
    expect(EvolutionResolver.isEvolutionMatch(dragapult, drakloak)).toBe(true);
    expect(EvolutionResolver.isEvolutionMatch(dragapult, dreepy, true)).toBe(true);
  });

  it('matches Gardevoir family (Ralts -> Kirlia -> Gardevoir ex)', () => {
    const ralts = createTestCard('Ralts', 'ราลท์ซ', ['Basic']);
    const kirlia = createTestCard('Kirlia', 'คิรูเลีย', ['Stage 1']);
    const gardevoir = createTestCard('Gardevoir ex', 'เซอร์ไนท์ex', ['Stage 2', 'ex']);

    expect(EvolutionResolver.isEvolutionMatch(kirlia, ralts)).toBe(true);
    expect(EvolutionResolver.isEvolutionMatch(gardevoir, kirlia)).toBe(true);
    expect(EvolutionResolver.isEvolutionMatch(gardevoir, ralts, true)).toBe(true);
  });

  it('derives previous evolution names accurately for limitless decks', () => {
    expect(
      EvolutionResolver.getPreviousEvolutionName('Charmeleon', 'ลิซาร์โดะ', ['Stage 1'])
    ).toBe('Charmander');
    expect(
      EvolutionResolver.getPreviousEvolutionName('Charizard ex', 'ลิซาร์ดอนex', ['Stage 2'])
    ).toBe('Charmeleon');
    expect(
      EvolutionResolver.getPreviousEvolutionName('Drakloak', 'โดรอนจิ', ['Stage 1'])
    ).toBe('Dreepy');
    expect(
      EvolutionResolver.getPreviousEvolutionName('Dragapult ex', 'โดราพัลท์ex', ['Stage 2'])
    ).toBe('Drakloak');
  });
});

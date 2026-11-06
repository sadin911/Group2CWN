import { describe, it, expect } from 'vitest';
import { calculateCombatDamage } from './pokemonDamageCalculator';
import type { CardInstance } from '../engine/types';

describe('pokemonDamageCalculator', () => {
  const fireAttacker: CardInstance = {
    instanceId: 'att-1',
    cardCode: 'c-1',
    nameTh: 'ลิซาร์ดอน ex',
    nameEn: 'Charizard ex',
    supertype: 'Pokemon',
    subtypes: ['Stage2', 'ex'],
    energyType: 'Fire',
    hp: 330,
  };

  const grassDefender: CardInstance = {
    instanceId: 'def-1',
    cardCode: 'c-2',
    nameTh: 'ฟุชิกิบานะ',
    nameEn: 'Venusaur',
    supertype: 'Pokemon',
    subtypes: ['Stage2'],
    energyType: 'Grass',
    weakness: { type: 'Fire', value: 'x2' },
    hp: 190,
  };

  const waterDefender: CardInstance = {
    instanceId: 'def-2',
    cardCode: 'c-3',
    nameTh: 'คาเม็กซ์',
    nameEn: 'Blastoise',
    supertype: 'Pokemon',
    subtypes: ['Stage2'],
    energyType: 'Water',
    weakness: { type: 'Lightning', value: 'x2' },
    hp: 180,
  };

  const fireResistantDefender: CardInstance = {
    instanceId: 'def-3',
    cardCode: 'c-4',
    nameTh: 'การ์เดียนไฟลุก',
    nameEn: 'Fire Warder',
    supertype: 'Pokemon',
    subtypes: ['Basic'],
    energyType: 'Dragon',
    resistance: { type: 'Fire', value: '-30' },
    hp: 120,
  };

  it('multiplies damage by 2 when attacker matches defender weakness', () => {
    const result = calculateCombatDamage(fireAttacker, grassDefender, 180, false);
    expect(result.isWeakness).toBe(true);
    expect(result.multiplier).toBe(2);
    expect(result.finalDamage).toBe(360);
    expect(result.description).toContain('ชนะธาตุ x2 (Fire)');
  });

  it('keeps base damage when defender weakness does not match attacker type', () => {
    const result = calculateCombatDamage(fireAttacker, waterDefender, 180, false);
    expect(result.isWeakness).toBe(false);
    expect(result.multiplier).toBe(1);
    expect(result.finalDamage).toBe(180);
    expect(result.description).toBe('ดาเมจปกติ');
  });

  it('reduces damage by 30 when defender has resistance matching attacker type', () => {
    const result = calculateCombatDamage(fireAttacker, fireResistantDefender, 100, false);
    expect(result.isResistance).toBe(true);
    expect(result.modifier).toBe(-30);
    expect(result.finalDamage).toBe(70);
    expect(result.description).toContain('ต้านทาน -30 (Fire)');
  });

  it('prevents damage from going below 0 with resistance', () => {
    const result = calculateCombatDamage(fireAttacker, fireResistantDefender, 20, false);
    expect(result.finalDamage).toBe(0);
  });

  it('does NOT apply weakness or resistance if target is on the bench (Bench Snipe)', () => {
    // Even though grassDefender is weak to Fire, being on bench negates weakness/resistance per rules
    const result = calculateCombatDamage(fireAttacker, grassDefender, 180, true);
    expect(result.isWeakness).toBe(false);
    expect(result.finalDamage).toBe(180);
    expect(result.description).toContain('ยิงเบนช์');
  });

  it('gracefully handles missing attacker or defender cards', () => {
    const result = calculateCombatDamage(null, null, 100, false);
    expect(result.finalDamage).toBe(100);
    expect(result.isWeakness).toBe(false);
  });
});

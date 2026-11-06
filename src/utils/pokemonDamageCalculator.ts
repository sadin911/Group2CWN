import type { CardInstance } from '../engine/types';

export interface DamageCalculationResult {
  baseDamage: number;
  finalDamage: number;
  isWeakness: boolean;
  isResistance: boolean;
  weaknessType?: string;
  resistanceType?: string;
  multiplier: number;
  modifier: number;
  description: string;
}

/**
 * Calculates combat damage applying Pokémon TCG official Weakness (x2)
 * and Resistance (-30) rules.
 * 
 * Rules:
 * 1. If target is on the Bench (`isBenchTarget === true`), Weakness and Resistance NEVER apply.
 * 2. If target is Active:
 *    - Weakness: if defender has weakness matching attacker's energyType, damage is multiplied by 2.
 *    - Resistance: if defender has resistance matching attacker's energyType, damage is reduced by 30.
 *    - Weakness is applied before Resistance.
 *    - Final damage cannot be negative.
 */
export function calculateCombatDamage(
  attackerCard: CardInstance | null | undefined,
  defenderCard: CardInstance | null | undefined,
  baseDamage: number,
  isBenchTarget: boolean = false
): DamageCalculationResult {
  const safeBase = Math.max(0, baseDamage || 0);

  // Bench target: rules strictly state do not apply weakness and resistance for benched Pokémon
  if (isBenchTarget || !attackerCard || !defenderCard) {
    return {
      baseDamage: safeBase,
      finalDamage: safeBase,
      isWeakness: false,
      isResistance: false,
      multiplier: 1,
      modifier: 0,
      description: isBenchTarget ? 'ยิงเบนช์ (ไม่คิดจุดอ่อน/ต้านทาน)' : 'ดาเมจปกติ',
    };
  }

  const attackerType = (attackerCard.energyType || '').trim().toLowerCase();
  let currentDamage = safeBase;
  let isWeakness = false;
  let isResistance = false;
  let weaknessType: string | undefined;
  let resistanceType: string | undefined;
  let multiplier = 1;
  let modifier = 0;

  if (attackerType) {
    // 1. Weakness Check (x2)
    if (defenderCard.weakness?.type && defenderCard.weakness.type.toLowerCase() === attackerType) {
      isWeakness = true;
      weaknessType = defenderCard.weakness.type;
      multiplier = 2;
      currentDamage = currentDamage * 2;
    }

    // 2. Resistance Check (-30)
    if (defenderCard.resistance?.type && defenderCard.resistance.type.toLowerCase() === attackerType) {
      isResistance = true;
      resistanceType = defenderCard.resistance.type;
      modifier = -30;
      currentDamage = Math.max(0, currentDamage - 30);
    }
  }

  // Description text
  const parts: string[] = [];
  if (isWeakness) {
    parts.push(`ชนะธาตุ x2 (${weaknessType})`);
  }
  if (isResistance) {
    parts.push(`ต้านทาน -30 (${resistanceType})`);
  }
  const description = parts.length > 0 ? parts.join(', ') : 'ดาเมจปกติ';

  return {
    baseDamage: safeBase,
    finalDamage: currentDamage,
    isWeakness,
    isResistance,
    weaknessType,
    resistanceType,
    multiplier,
    modifier,
    description,
  };
}

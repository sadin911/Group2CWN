import type { GameState, CardInstance, PokemonInPlay, AttackCost } from './types';
import { EvolutionResolver } from './data/EvolutionResolver';
import { StandardTrainerDatabase } from './data/StandardTrainerDatabase';
import { getCardDisplayName } from '../utils/pokemonThaiTranslator';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export class ActionValidator {
  static canDrawTurnCard(state: GameState, playerIndex: 0 | 1): ValidationResult {
    if (state.phase !== 'DRAW_PHASE') {
      return { valid: false, error: 'จั่วการ์ดประจำเทิร์นได้เฉพาะใน Draw Phase เท่านั้น' };
    }
    if (state.activePlayerIndex !== playerIndex) {
      return { valid: false, error: 'ไม่ใช่เทิร์นของผู้เล่นคนนี้' };
    }
    return { valid: true };
  }

  static canPlayBasicPokemon(
    state: GameState,
    playerIndex: 0 | 1,
    card: CardInstance,
    benchIndex?: number,
    targetPosition?: 'ACTIVE' | 'BENCH'
  ): ValidationResult {
    if (state.phase !== 'MAIN_PHASE' && state.phase !== 'SETUP_PLACEMENT') {
      return { valid: false, error: 'ลงโปเกมอนได้เฉพาะใน Setup หรือ Main Phase เท่านั้น' };
    }
    if (state.phase === 'MAIN_PHASE' && state.activePlayerIndex !== playerIndex) {
      return { valid: false, error: 'ไม่ใช่เทิร์นของผู้เล่นคนนี้' };
    }
    if (card.supertype !== 'Pokemon' || !card.subtypes.includes('Basic')) {
      return { valid: false, error: 'การ์ดนี้ไม่ใช่ Basic Pokémon' };
    }

    const player = state.players[playerIndex];

    // If targeting ACTIVE or Active spot is empty
    if (targetPosition === 'ACTIVE' || (player.active === null && targetPosition !== 'BENCH')) {
      if (player.active !== null) {
        return { valid: false, error: 'ตำแหน่ง Active มีโปเกมอนอยู่แล้ว' };
      }
      return { valid: true };
    }

    // Placing to Bench
    const maxBench = state.stadium?.nameEn?.includes('Area Zero') ? 8 : 5;
    if (benchIndex !== undefined) {
      if (benchIndex < 0 || benchIndex >= maxBench) {
        return { valid: false, error: `ตำแหน่ง Bench ไม่ถูกต้อง (อนุญาต 0-${maxBench - 1})` };
      }
      if (player.bench[benchIndex] !== null && player.bench[benchIndex] !== undefined) {
        return { valid: false, error: 'ตำแหน่ง Bench นี้มีโปเกมอนอยู่แล้ว' };
      }
    } else {
      const hasEmptyBench = player.bench.slice(0, maxBench).some((spot) => spot === null);
      if (!hasEmptyBench) {
        return { valid: false, error: `Bench เต็มแล้ว (สูงสุด ${maxBench} ตัว)` };
      }
    }

    return { valid: true };
  }

  static canAttachTool(state: GameState, playerIndex: 0 | 1, target: PokemonInPlay): ValidationResult {
    if (state.phase !== 'MAIN_PHASE') {
      return { valid: false, error: 'ติด Tool ได้เฉพาะใน Main Phase เท่านั้น' };
    }
    if (state.activePlayerIndex !== playerIndex) {
      return { valid: false, error: 'ไม่ใช่เทิร์นของผู้เล่นคนนี้' };
    }
    if (target.attachedTool !== null) {
      return { valid: false, error: 'โปเกมอนตัวนี้ติด Pokémon Tool อยู่แล้ว (สูงสุด 1 ใบ)' };
    }
    return { valid: true };
  }

  static canEvolvePokemon(
    state: GameState,
    playerIndex: 0 | 1,
    evolutionCard: CardInstance,
    target: PokemonInPlay
  ): ValidationResult {
    if (state.phase !== 'MAIN_PHASE') {
      return { valid: false, error: 'พัฒนาร่างได้เฉพาะใน Main Phase เท่านั้น' };
    }
    if (state.activePlayerIndex !== playerIndex) {
      return { valid: false, error: 'ไม่ใช่เทิร์นของผู้เล่นคนนี้' };
    }
    if (evolutionCard.supertype !== 'Pokemon' || evolutionCard.subtypes.includes('Basic')) {
      return { valid: false, error: 'การ์ดนี้ไม่ใช่การ์ดวิวัฒนาการ' };
    }

    // Rule: Neither player may evolve on their very first turn of the game
    // Turn 1 = First player's first turn. Turn 2 = Second player's first turn.
    const isFirstTurnForPlayer =
      state.turnNumber === 1 || (state.turnNumber === 2 && playerIndex !== state.firstPlayerIndex);
    if (isFirstTurnForPlayer) {
      return { valid: false, error: 'ห้ามพัฒนาร่างในเทิร์นแรกของผู้เล่นทั้งสองฝ่าย' };
    }

    // Rule: Cannot evolve on the same turn it entered play
    if (target.turnEnteredPlay >= state.turnNumber) {
      return { valid: false, error: 'ห้ามพัฒนาร่างโปเกมอนที่เพิ่งลงสนามในเทิร์นเดียวกัน' };
    }

    // Rule: Cannot evolve more than once per turn
    if (target.turnEvolved >= state.turnNumber) {
      return { valid: false, error: 'ห้ามพัฒนาร่างโปเกมอนซ้ำเกิน 1 ขั้นในเทิร์นเดียวกัน' };
    }

    // Rule: Target Pokémon must match evolvesFrom
    const isMatch = EvolutionResolver.isEvolutionMatch(evolutionCard, target.card);
    if (!isMatch) {
      const needed = evolutionCard.evolvesFrom || 'ร่างก่อนหน้า';
      return {
        valid: false,
        error: `${getCardDisplayName(evolutionCard)} ต้องพัฒนาร่างมาจาก ${needed} (ไม่ใช่ ${getCardDisplayName(target.card)})`,
      };
    }

    // Rule: Basic cannot evolve directly into Stage 2 (without Rare Candy)
    const isStage2 =
      evolutionCard.subtypes.includes('Stage 2') || evolutionCard.subtypes.includes('Stage2');
    if (target.stage === 'Basic' && isStage2) {
      return {
        valid: false,
        error: 'โปเกมอนร่าง Basic ไม่สามารถข้ามเป็น Stage 2 ได้โดยตรง (ต้องใช้ไอเทม Rare Candy)',
      };
    }

    return { valid: true };
  }

  static canAttachEnergy(state: GameState, playerIndex: 0 | 1): ValidationResult {
    if (state.phase !== 'MAIN_PHASE') {
      return { valid: false, error: 'ติดพลังงานได้เฉพาะใน Main Phase เท่านั้น' };
    }
    if (state.activePlayerIndex !== playerIndex) {
      return { valid: false, error: 'ไม่ใช่เทิร์นของผู้เล่นคนนี้' };
    }
    if (state.players[playerIndex].turnFlags.energyAttachedThisTurn) {
      return { valid: false, error: 'ติดพลังงานจากมือได้สูงสุด 1 ครั้งต่อเทิร์น' };
    }
    return { valid: true };
  }

  static canPlayItem(state: GameState, playerIndex: 0 | 1, itemCard: CardInstance): ValidationResult {
    if (state.phase !== 'MAIN_PHASE') {
      return { valid: false, error: 'ใช้ Item ได้เฉพาะใน Main Phase เท่านั้น' };
    }
    if (state.activePlayerIndex !== playerIndex) {
      return { valid: false, error: 'ไม่ใช่เทิร์นของผู้เล่นคนนี้' };
    }
    return StandardTrainerDatabase.canPlayTrainer(state, playerIndex, itemCard);
  }

  static canPlaySupporter(state: GameState, playerIndex: 0 | 1, supporterCard?: CardInstance): ValidationResult {
    if (state.phase !== 'MAIN_PHASE') {
      return { valid: false, error: 'ใช้ Supporter ได้เฉพาะใน Main Phase เท่านั้น' };
    }
    if (state.activePlayerIndex !== playerIndex) {
      return { valid: false, error: 'ไม่ใช่เทิร์นของผู้เล่นคนนี้' };
    }
    // Rule: Player 1 cannot play Supporter on Turn 1
    if (state.turnNumber === 1 && playerIndex === state.firstPlayerIndex) {
      return { valid: false, error: 'ผู้เล่นคนแรกห้ามใช้ Supporter ในเทิร์นที่ 1' };
    }
    if (state.players[playerIndex].turnFlags.supporterPlayedThisTurn) {
      return { valid: false, error: 'ใช้ Supporter ได้สูงสุด 1 ใบต่อเทิร์น' };
    }
    if (supporterCard) {
      return StandardTrainerDatabase.canPlayTrainer(state, playerIndex, supporterCard);
    }
    return { valid: true };
  }

  static canPlayStadium(state: GameState, playerIndex: 0 | 1, stadiumCard: CardInstance): ValidationResult {
    if (state.phase !== 'MAIN_PHASE') {
      return { valid: false, error: 'เล่น Stadium ได้เฉพาะใน Main Phase เท่านั้น' };
    }
    if (state.activePlayerIndex !== playerIndex) {
      return { valid: false, error: 'ไม่ใช่เทิร์นของผู้เล่นคนนี้' };
    }
    if (state.players[playerIndex].turnFlags.stadiumPlayedThisTurn) {
      return { valid: false, error: 'เล่น Stadium ได้สูงสุด 1 ใบต่อเทิร์น' };
    }
    if (state.stadium && state.stadium.nameTh === stadiumCard.nameTh) {
      return { valid: false, error: 'ห้ามเล่น Stadium ที่มีชื่อซ้ำกับสนามที่เปิดใช้งานอยู่' };
    }
    return { valid: true };
  }

  static canRetreatActive(
    state: GameState,
    playerIndex: 0 | 1,
    benchIndex: number,
    energyDiscardIds: string[]
  ): ValidationResult {
    if (state.phase !== 'MAIN_PHASE') {
      return { valid: false, error: 'สั่งถอยหนีได้เฉพาะใน Main Phase เท่านั้น' };
    }
    if (state.activePlayerIndex !== playerIndex) {
      return { valid: false, error: 'ไม่ใช่เทิร์นของผู้เล่นคนนี้' };
    }

    const player = state.players[playerIndex];
    const active = player.active;
    if (!active) {
      return { valid: false, error: 'ไม่มีโปเกมอนในตำแหน่ง Active Spot' };
    }
    if (active.specialConditions.includes('ASLEEP')) {
      return { valid: false, error: 'โปเกมอนหลับอยู่ (Asleep) ไม่สามารถสั่งถอยหนีได้' };
    }
    if (active.specialConditions.includes('PARALYZED')) {
      return { valid: false, error: 'โปเกมอนติดอาการชา (Paralyzed) ไม่สามารถสั่งถอยหนีได้' };
    }
    if (player.turnFlags.retreatedThisTurn) {
      return { valid: false, error: 'สั่งถอยหนีได้สูงสุด 1 ครั้งต่อเทิร์น' };
    }

    if (benchIndex < 0 || benchIndex >= player.bench.length || !player.bench[benchIndex]) {
      return { valid: false, error: 'ต้องเลือกโปเกมอนบน Bench ที่มีอยู่จริงเพื่อสลับตำแหน่ง' };
    }

    const requiredRetreatCost = active.card.retreatCost || 0;
    if (energyDiscardIds.length < requiredRetreatCost) {
      return {
        valid: false,
        error: `ต้องทิ้งพลังงาน ${requiredRetreatCost} ใบเพื่อถอยหนี (เลือกไว้ ${energyDiscardIds.length} ใบ)`,
      };
    }

    return { valid: true };
  }

  static canDeclareAttack(state: GameState, playerIndex: 0 | 1, attackIndex: number): ValidationResult {
    if (state.phase !== 'MAIN_PHASE') {
      return { valid: false, error: 'สั่งโจมตีได้เฉพาะใน Main Phase เท่านั้น' };
    }
    if (state.activePlayerIndex !== playerIndex) {
      return { valid: false, error: 'ไม่ใช่เทิร์นของผู้เล่นคนนี้' };
    }
    // Rule: Player 1 cannot attack on Turn 1
    if (state.turnNumber === 1 && playerIndex === state.firstPlayerIndex) {
      return { valid: false, error: 'ผู้เล่นคนแรกห้ามสั่งโจมตีในเทิร์นที่ 1' };
    }

    const player = state.players[playerIndex];
    const active = player.active;
    if (!active) {
      return { valid: false, error: 'ไม่มีโปเกมอนในตำแหน่ง Active Spot' };
    }

    const opponent = state.players[playerIndex === 0 ? 1 : 0];
    if (!opponent.active) {
      return { valid: false, error: 'ฝ่ายตรงข้ามไม่มีโปเกมอนในตำแหน่ง Active Spot' };
    }

    if (active.specialConditions.includes('ASLEEP')) {
      return { valid: false, error: 'โปเกมอนหลับอยู่ (Asleep) ไม่สามารถสั่งโจมตีได้' };
    }
    if (active.specialConditions.includes('PARALYZED')) {
      return { valid: false, error: 'โปเกมอนติดอาการชา (Paralyzed) ไม่สามารถสั่งโจมตีได้' };
    }

    const attacks = active.card.attacks || [];
    if (attackIndex < 0 || attackIndex >= attacks.length) {
      return { valid: false, error: 'ไม่พบท่าโจมตีที่เลือก' };
    }

    const attack = attacks[attackIndex];
    if (attack.cost?.Free !== undefined) {
      return { valid: true };
    }

    let effectiveCost: AttackCost = { ...attack.cost };
    if (active.card.abilities?.some((a) => a.name === 'Seasoned Skill') && attack.name === 'Blood Moon') {
      const oppPrizesTaken = Math.max(0, 6 - opponent.prizes.length);
      const reducedColorless = Math.max(0, (effectiveCost.Colorless || 0) - oppPrizesTaken);
      if (reducedColorless === 0) {
        effectiveCost = { Free: 0 };
      } else {
        effectiveCost.Colorless = reducedColorless;
      }
    }

    if (effectiveCost.Free !== undefined) {
      return { valid: true };
    }

    const energySatisfied = this.checkEnergyCostSatisfied(active.attachedEnergies, effectiveCost);
    if (!energySatisfied) {
      return { valid: false, error: 'พลังงานที่ติดอยู่ไม่เพียงพอสำหรับใช้ท่านี้' };
    }

    return { valid: true };
  }

  static checkEnergyCostSatisfied(attachedEnergies: CardInstance[], cost: AttackCost): boolean {
    if (cost?.Free !== undefined) return true;
    const energyPool = [...attachedEnergies];
    let requiredColorless = 0;

    // 1. Satisfy specific energy requirements first
    for (const [type, count] of Object.entries(cost)) {
      if (type === 'Colorless') {
        requiredColorless += count;
        continue;
      }
      if (type === 'Free') continue;

      for (let i = 0; i < count; i++) {
        const foundIdx = energyPool.findIndex((e) => e.energyType === type);
        if (foundIdx === -1) {
          return false; // Missing specific required type
        }
        energyPool.splice(foundIdx, 1);
      }
    }

    // 2. Remaining energies must satisfy Colorless cost
    return energyPool.length >= requiredColorless;
  }

  static canUseAbility(
    state: GameState,
    playerIndex: 0 | 1,
    pokemon: PokemonInPlay,
    abilityName: string
  ): ValidationResult {
    if (state.phase !== 'MAIN_PHASE') {
      return { valid: false, error: 'ใช้ Ability ได้เฉพาะใน Main Phase เท่านั้น' };
    }
    if (state.activePlayerIndex !== playerIndex) {
      return { valid: false, error: 'ไม่ใช่เทิร์นของผู้เล่นคนนี้' };
    }

    const player = state.players[playerIndex];
    const isOwner =
      player.active?.instanceId === pokemon.instanceId ||
      player.bench.some((b) => b?.instanceId === pokemon.instanceId);
    if (!isOwner) {
      return { valid: false, error: 'โปเกมอนตัวนี้ไม่ได้อยู่บนสนามของคุณ' };
    }

    const ability = pokemon.card.abilities?.find(
      (ab) => ab.name.toLowerCase().trim() === abilityName.toLowerCase().trim()
    );
    if (!ability) {
      return { valid: false, error: `ไม่พบความสามารถ ${abilityName} บนการ์ดนี้` };
    }

    // Reject non-activated abilities
    if (ability.trigger && ability.trigger !== 'activated') {
      if (ability.trigger === 'on-evolution') {
        return { valid: false, error: 'ความสามารถนี้จะทำงานเฉพาะเมื่อวิวัฒนาการจากการ์ดบนมือเท่านั้น' };
      }
      return { valid: false, error: 'ความสามารถนี้ไม่สามารถสั่งเปิดใช้ได้ด้วยตัวเอง' };
    }

    // Check once-per-turn limit:
    // Global limit vs Per-Pokémon instance limit
    const clean = abilityName.toLowerCase().trim();
    const isGlobal =
      ability.isGlobalOncePerTurn ??
      (clean.includes('quick search') ||
        clean.includes('flip the script') ||
        clean.includes('instant charge') ||
        clean.includes('squawk and seize'));

    if (isGlobal && player.turnFlags.abilitiesUsed[ability.name]) {
      return { valid: false, error: `ความสามารถ ${ability.name} ถูกใช้ไปแล้วในเทิร์นนี้ (จำกัด 1 ครั้งต่อเทิร์น)` };
    }

    const instanceKey = `${pokemon.instanceId}:${ability.name}`;
    if (player.turnFlags.abilitiesUsed[instanceKey] || player.turnFlags.abilitiesUsed[ability.name]) {
      return { valid: false, error: `โปเกมอนตัวนี้ได้ใช้ความสามารถ ${ability.name} ไปแล้วในเทิร์นนี้` };
    }

    // Condition checks:
    if (clean.includes('fleet-footed') || clean.includes('fleet footed')) {
      if (player.active?.instanceId !== pokemon.instanceId) {
        return { valid: false, error: 'ต้องอยู่ในตำแหน่ง Active Spot เท่านั้นจึงจะใช้ Fleet-Footed ได้' };
      }
    }

    if (clean.includes('restart') || clean.includes('รีสตาร์ต')) {
      if (player.hand.length >= 3) {
        return { valid: false, error: 'มีไพ่บนมือ 3 ใบขึ้นไปแล้ว ไม่สามารถใช้ Restart ได้' };
      }
    }

    if (clean.includes('tandem unit') || clean.includes('แทนเด็มยูนิต')) {
      const hasBenchSlot = player.bench.some((b) => b === null);
      if (!hasBenchSlot) {
        return { valid: false, error: 'เบนช์เต็มแล้ว (Bench Full) ไม่สามารถวางโปเกมอนเพิ่มได้' };
      }
    }

    if (clean.includes('concealed cards') || clean.includes('ซ่อนการ์ด')) {
      const hasEnergy = player.hand.some((c) => c.supertype === 'Energy');
      if (!hasEnergy) {
        return { valid: false, error: 'ไม่มีการ์ดพลังงานบนมือสำหรับทิ้งเพื่อใช้ Concealed Cards' };
      }
    }

    if (clean.includes('teal dance') || clean.includes('เริงระบำ')) {
      const hasGrass = player.hand.some(
        (c) => c.supertype === 'Energy' && (c.energyType === 'Grass' || c.nameEn?.includes('Grass'))
      );
      if (!hasGrass) {
        return { valid: false, error: 'ไม่มีพลังงานหญ้าบนมือสำหรับใช้ Teal Dance' };
      }
    }

    if (clean.includes('adrena-brain') || clean.includes('สมองอดรีนาลีน')) {
      const hasDarkness = pokemon.attachedEnergies.some((e) => e.energyType === 'Darkness');
      if (!hasDarkness) {
        return { valid: false, error: 'โปเกมอนตัวนี้ต้องมีพลังงานความมืดติดอยู่จึงจะใช้ Adrena-Brain ได้' };
      }
      const allFriendly = [player.active, ...player.bench].filter((p): p is PokemonInPlay => p !== null);
      const hasDamageToMove = allFriendly.some((p) => p.damageCounters > 0);
      if (!hasDamageToMove) {
        return { valid: false, error: 'ไม่มีโปเกมอนฝ่ายเราที่มีตัวนับแดเมจสำหรับย้าย' };
      }
    }

    return { valid: true };
  }
}

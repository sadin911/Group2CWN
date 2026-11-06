/**
 * Pokémon TCG Standard Engine — Effect DSL & Execution Primitives
 * Pure TypeScript, zero DOM/Canvas dependencies.
 */

import type {
  GameState,
  CardInstance,
  PokemonInPlay,
  EffectChoices,
  SpecialCondition,
} from '../types';
import { EvolutionResolver } from '../data/EvolutionResolver';
import { StandardTrainerDatabase, hasRuleBox } from '../data/StandardTrainerDatabase';
import { getCardDisplayName } from '../../utils/pokemonThaiTranslator';

export interface EffectExecutionResult {
  success: boolean;
  error?: string;
  extraPrizesTaken?: number;
  message?: string;
}

export class EffectPrimitives {
  /**
   * Draw N cards from player's deck to hand.
   * If deck has fewer cards than requested, player draws all remaining cards.
   */
  static drawCards(state: GameState, playerIndex: 0 | 1, count: number): CardInstance[] {
    const player = state.players[playerIndex];
    const drawnCount = Math.min(count, player.deck.length);
    const drawn = player.deck.splice(0, drawnCount);
    player.hand.push(...drawn);
    return drawn;
  }

  /**
   * Discard specific cards from hand by instanceId.
   */
  static discardFromHand(state: GameState, playerIndex: 0 | 1, cardInstanceIds: string[]): CardInstance[] {
    const player = state.players[playerIndex];
    const discarded: CardInstance[] = [];

    for (const id of cardInstanceIds) {
      const idx = player.hand.findIndex((c) => c.instanceId === id);
      if (idx !== -1) {
        const [card] = player.hand.splice(idx, 1);
        player.discard.push(card);
        discarded.push(card);
      }
    }

    return discarded;
  }

  /**
   * Shuffle player's entire hand into the bottom of their deck.
   * Returns how many cards were shuffled.
   */
  static shuffleHandToBottom(state: GameState, playerIndex: 0 | 1): number {
    const player = state.players[playerIndex];
    const count = player.hand.length;
    if (count > 0) {
      const cards = player.hand.splice(0, count);
      // Place cards at bottom of deck
      player.deck.push(...cards);
    }
    return count;
  }

  /**
   * Shuffle a player's deck.
   */
  static shuffleDeck(state: GameState, playerIndex: 0 | 1): void {
    const deck = state.players[playerIndex].deck;
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }

  /**
   * Switch player's Active Pokémon with a specific Bench spot.
   */
  static switchActiveWithBench(state: GameState, playerIndex: 0 | 1, benchIndex: number): boolean {
    const player = state.players[playerIndex];
    if (!player.active || benchIndex < 0 || benchIndex >= player.bench.length) {
      return false;
    }
    const benched = player.bench[benchIndex];
    if (!benched) return false;

    // Clear Special Conditions on retreat/switch
    player.active.specialConditions = [];

    const oldActive = player.active;
    player.active = benched;
    player.bench[benchIndex] = oldActive;
    return true;
  }

  /**
   * Switch opponent's Active Pokémon with their chosen/selected Bench spot (e.g. Boss's Orders).
   */
  static switchOpponentActiveWithBench(state: GameState, playerIndex: 0 | 1, opponentBenchIndex: number): boolean {
    const opponentIndex = playerIndex === 0 ? 1 : 0;
    return this.switchActiveWithBench(state, opponentIndex, opponentBenchIndex);
  }

  /**
   * Heal damage from target Pokémon in play.
   */
  static healDamage(pokemon: PokemonInPlay, amount: number): number {
    const currentDamage = pokemon.damageCounters * 10;
    const actualHeal = Math.min(currentDamage, amount);
    pokemon.damageCounters = Math.max(0, pokemon.damageCounters - Math.floor(actualHeal / 10));
    return actualHeal;
  }

  /**
   * Apply a special condition to a Pokémon.
   */
  static applySpecialCondition(pokemon: PokemonInPlay, condition: SpecialCondition): void {
    if (condition === 'ASLEEP' || condition === 'PARALYZED' || condition === 'CONFUSED') {
      // Rule: Asleep, Paralyzed, and Confused replace each other
      pokemon.specialConditions = pokemon.specialConditions.filter(
        (c) => c === 'POISON' || c === 'BURN'
      );
    }
    if (!pokemon.specialConditions.includes(condition)) {
      pokemon.specialConditions.push(condition);
    }
  }

  /**
   * Recover up to N cards from discard pile into deck and shuffle.
   */
  static recoverFromDiscardToDeck(
    state: GameState,
    playerIndex: 0 | 1,
    cardInstanceIds: string[]
  ): CardInstance[] {
    const player = state.players[playerIndex];
    const recovered: CardInstance[] = [];

    for (const id of cardInstanceIds) {
      const idx = player.discard.findIndex((c) => c.instanceId === id);
      if (idx !== -1) {
        const [card] = player.discard.splice(idx, 1);
        player.deck.push(card);
        recovered.push(card);
      }
    }

    this.shuffleDeck(state, playerIndex);
    return recovered;
  }

  /**
   * Recover up to N cards from discard pile into hand.
   */
  static recoverFromDiscardToHand(
    state: GameState,
    playerIndex: 0 | 1,
    cardInstanceIds: string[]
  ): CardInstance[] {
    const player = state.players[playerIndex];
    const recovered: CardInstance[] = [];

    for (const id of cardInstanceIds) {
      const idx = player.discard.findIndex((c) => c.instanceId === id);
      if (idx !== -1) {
        const [card] = player.discard.splice(idx, 1);
        player.hand.push(card);
        recovered.push(card);
      }
    }
    return recovered;
  }

  /**
   * Discard attached energies from any Pokémon (Active or Bench).
   */
  static discardEnergyFromPokemon(
    state: GameState,
    playerIndex: 0 | 1,
    energyInstanceIds: string[]
  ): CardInstance[] {
    const player = state.players[playerIndex];
    const discarded: CardInstance[] = [];
    const allPokemon = [player.active, ...player.bench].filter((p): p is PokemonInPlay => p !== null);

    for (const energyId of energyInstanceIds) {
      for (const p of allPokemon) {
        const eIdx = p.attachedEnergies.findIndex((e) => e.instanceId === energyId);
        if (eIdx !== -1) {
          const [energy] = p.attachedEnergies.splice(eIdx, 1);
          player.discard.push(energy);
          discarded.push(energy);
          break;
        }
      }
    }
    return discarded;
  }

  /**
   * Move 1 attached energy between 2 Pokémon.
   */
  static moveAttachedEnergy(
    state: GameState,
    playerIndex: 0 | 1,
    energyInstanceId: string,
    targetPokemonInstanceId: string
  ): boolean {
    const player = state.players[playerIndex];
    const allPokemon = [player.active, ...player.bench].filter((p): p is PokemonInPlay => p !== null);
    const target = allPokemon.find((p) => p.instanceId === targetPokemonInstanceId);
    if (!target) return false;

    for (const source of allPokemon) {
      const eIdx = source.attachedEnergies.findIndex((e) => e.instanceId === energyInstanceId);
      if (eIdx !== -1) {
        const [energy] = source.attachedEnergies.splice(eIdx, 1);
        target.attachedEnergies.push(energy);
        return true;
      }
    }
    return false;
  }

  /**
   * Place damage counters on a specific Pokémon.
   */
  static placeDamageCounters(pokemon: PokemonInPlay, counters: number): void {
    pokemon.damageCounters += counters;
  }

  /**
   * Move damage counters between 2 Pokémon.
   */
  static moveDamageCounters(from: PokemonInPlay, to: PokemonInPlay, counters: number): number {
    const transferable = Math.min(from.damageCounters, counters);
    from.damageCounters -= transferable;
    to.damageCounters += transferable;
    return transferable;
  }
}

/**
 * Standard Meta Effect Registry
 */
export class EffectRegistry {
  /**
   * Resolve Item card effect
   */
  static executeItem(
    state: GameState,
    playerIndex: 0 | 1,
    itemCard: CardInstance,
    choices?: EffectChoices
  ): EffectExecutionResult {
    const player = state.players[playerIndex];
    const opponentIndex = playerIndex === 0 ? 1 : 0;
    const opponent = state.players[opponentIndex];
    const name = (itemCard.nameEn || itemCard.nameTh || '').toLowerCase();

    // Check canonical StandardTrainerDatabase first
    const canonical = StandardTrainerDatabase.getTrainer(itemCard.nameEn || itemCard.nameTh || '');
    if (canonical && canonical.subtype === 'Item') {
      const validation = canonical.canPlay(state, playerIndex, itemCard);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }
      return canonical.execute(state, playerIndex, itemCard, choices);
    }

    // 1. Ultra Ball: Discard 2 cards, search deck for any Pokémon into hand
    if (name.includes('ultra ball')) {
      if (!choices?.discardCardInstanceIds || choices.discardCardInstanceIds.length !== 2) {
        return { success: false, error: 'ต้องเลือกทิ้งการ์ด 2 ใบจากบนมือสำหรับ Ultra Ball' };
      }
      EffectPrimitives.discardFromHand(state, playerIndex, choices.discardCardInstanceIds);

      if (choices.selectedCardInstanceIds && choices.selectedCardInstanceIds.length > 0) {
        const selectedId = choices.selectedCardInstanceIds[0];
        const deckIdx = player.deck.findIndex((c) => c.instanceId === selectedId && c.supertype === 'Pokemon');
        if (deckIdx !== -1) {
          const [card] = player.deck.splice(deckIdx, 1);
          player.hand.push(card);
        }
      }
      EffectPrimitives.shuffleDeck(state, playerIndex);
      return { success: true, message: 'ใช้ Ultra Ball สำเร็จ' };
    }

    // 2. Nest Ball: Search deck for a Basic Pokémon and put onto Bench
    if (name.includes('nest ball')) {
      const emptyBenchIdx = player.bench.findIndex((b) => b === null);
      if (emptyBenchIdx === -1) {
        return { success: false, error: 'ไม่มีที่ว่างบน Bench สำหรับโปเกมอนใหม่' };
      }

      if (choices?.selectedCardInstanceIds && choices.selectedCardInstanceIds.length > 0) {
        const selectedId = choices.selectedCardInstanceIds[0];
        const deckIdx = player.deck.findIndex(
          (c) => c.instanceId === selectedId && c.supertype === 'Pokemon' && c.subtypes.includes('Basic')
        );
        if (deckIdx !== -1) {
          const [card] = player.deck.splice(deckIdx, 1);
          player.bench[emptyBenchIdx] = {
            instanceId: `pokemon-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            card,
            stage: 'Basic',
            maxHp: card.hp || 70,
            damageCounters: 0,
            attachedEnergies: [],
            attachedTool: null,
            evolutionHistory: [],
            specialConditions: [],
            turnEnteredPlay: state.turnNumber,
            turnEvolved: 0,
          };
        }
      }
      EffectPrimitives.shuffleDeck(state, playerIndex);
      return { success: true, message: 'ใช้ Nest Ball สำเร็จ' };
    }

    // 3. Buddy-Buddy Poffin: Search deck for up to 2 Basic Pokémon (HP <= 70) to Bench
    if (name.includes('buddy-buddy poffin') || name.includes('poffin') || name.includes('โปฟฟิน')) {
      const selectedIds = choices?.selectedCardInstanceIds || [];
      for (const id of selectedIds.slice(0, 2)) {
        const emptyBenchIdx = player.bench.findIndex((b) => b === null);
        if (emptyBenchIdx === -1) break;

        const deckIdx = player.deck.findIndex(
          (c) => c.instanceId === id && c.supertype === 'Pokemon' && c.subtypes.includes('Basic') && (c.hp || 0) <= 70
        );
        if (deckIdx !== -1) {
          const [card] = player.deck.splice(deckIdx, 1);
          player.bench[emptyBenchIdx] = {
            instanceId: `pokemon-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            card,
            stage: 'Basic',
            maxHp: card.hp || 70,
            damageCounters: 0,
            attachedEnergies: [],
            attachedTool: null,
            evolutionHistory: [],
            specialConditions: [],
            turnEnteredPlay: state.turnNumber,
            turnEvolved: 0,
          };
        }
      }
      EffectPrimitives.shuffleDeck(state, playerIndex);
      return { success: true, message: 'ใช้ Buddy-Buddy Poffin สำเร็จ' };
    }

    // 4. Night Stretcher (เปลหามยามราตรี): Put 1 Pokémon or 1 Basic Energy from discard to hand
    if (name.includes('night stretcher') || name.includes('stretcher') || name.includes('เปลหาม')) {
      const selectedIds = choices?.selectedCardInstanceIds || [];
      if (selectedIds.length > 0) {
        EffectPrimitives.recoverFromDiscardToHand(state, playerIndex, [selectedIds[0]]);
      } else {
        const eligible = player.discard.find((c) => c.supertype === 'Pokemon' || c.supertype === 'Energy');
        if (eligible) {
          EffectPrimitives.recoverFromDiscardToHand(state, playerIndex, [eligible.instanceId]);
        }
      }
      return { success: true, message: 'ใช้ Night Stretcher กู้การ์ดขึ้นมือสำเร็จ' };
    }

    // 5. Energy Switch (สลับการ์ดพลังงาน): Move 1 Basic Energy from 1 of your Pokémon to another
    if (name.includes('energy switch') || name.includes('สลับการ์ดพลังงาน')) {
      const energyId = choices?.selectedCardInstanceIds?.[0];
      const targetId = choices?.targetPokemonInstanceId;
      if (energyId && targetId) {
        const moved = EffectPrimitives.moveAttachedEnergy(state, playerIndex, energyId, targetId);
        if (!moved) return { success: false, error: 'ไม่สามารถย้ายพลังงานไปยังเป้าหมายที่เลือกได้' };
      }
      return { success: true, message: 'ใช้ Energy Switch สลับพลังงานสำเร็จ' };
    }

    // 6. Prime Catcher (ACE SPEC): Gust opponent bench to active, then switch your active to bench
    if (name.includes('prime catcher') || name.includes('ไพรม์แคชเชอร์')) {
      if (choices?.opponentBenchIndex !== undefined) {
        EffectPrimitives.switchOpponentActiveWithBench(state, playerIndex, choices.opponentBenchIndex);
      }
      if (choices?.playerBenchIndex !== undefined) {
        EffectPrimitives.switchActiveWithBench(state, playerIndex, choices.playerBenchIndex);
      }
      return { success: true, message: 'ใช้ Prime Catcher สำเร็จ' };
    }

    // 7. Counter Catcher: If behind on prizes, switch opponent bench to active
    if (name.includes('counter catcher')) {
      if (player.prizes.length <= opponent.prizes.length) {
        return { success: false, error: 'Counter Catcher ใช้ได้เฉพาะเมื่อรางวัลเหลือน้อยกว่าฝ่ายตรงข้าม (ตามหลัง)' };
      }
      if (choices?.opponentBenchIndex !== undefined) {
        EffectPrimitives.switchOpponentActiveWithBench(state, playerIndex, choices.opponentBenchIndex);
      }
      return { success: true, message: 'ใช้ Counter Catcher ดึงโปเกมอนของฝ่ายตรงข้ามขึ้นมา' };
    }

    // 8. Unfair Stamp (ACE SPEC): Both players shuffle hand, you draw 5, opponent draws 2
    if (name.includes('unfair stamp') || name.includes('อันแฟร์สแตมป์')) {
      EffectPrimitives.shuffleHandToBottom(state, playerIndex);
      EffectPrimitives.shuffleDeck(state, playerIndex);
      EffectPrimitives.drawCards(state, playerIndex, 5);

      EffectPrimitives.shuffleHandToBottom(state, opponentIndex);
      EffectPrimitives.shuffleDeck(state, opponentIndex);
      EffectPrimitives.drawCards(state, opponentIndex, 2);
      return { success: true, message: 'ใช้ Unfair Stamp! คุณจั่ว 5 ใบ ฝ่ายตรงข้ามจั่ว 2 ใบ' };
    }

    // 9. Special Red Card (ใบแดงพิเศษ): Opponent shuffles hand into deck and draws 4
    if (name.includes('red card') || name.includes('ใบแดง')) {
      EffectPrimitives.shuffleHandToBottom(state, opponentIndex);
      EffectPrimitives.shuffleDeck(state, opponentIndex);
      EffectPrimitives.drawCards(state, opponentIndex, 4);
      return { success: true, message: 'ใช้ Special Red Card สับการ์ดบนมือฝ่ายตรงข้ามและให้จั่ว 4 ใบ' };
    }

    // 10. Switch: Switch Active with Bench
    if (name.includes('switch') && !name.includes('energy')) {
      if (choices?.playerBenchIndex === undefined) {
        return { success: false, error: 'ต้องเลือกโปเกมอนบน Bench ที่จะสลับตำแหน่ง' };
      }
      const switched = EffectPrimitives.switchActiveWithBench(state, playerIndex, choices.playerBenchIndex);
      if (!switched) {
        return { success: false, error: 'ไม่สามารถสลับตำแหน่งโปเกมอนได้' };
      }
      return { success: true, message: 'ใช้ Switch สำเร็จ' };
    }

    // 11. Super Rod / Pal Pad / Poké Pad: Shuffle cards from discard to deck
    if (name.includes('super rod') || name.includes('pal pad') || name.includes('poké pad') || name.includes('poke pad') || name.includes('คันเบ็ด')) {
      const selectedIds = choices?.selectedCardInstanceIds || [];
      if (selectedIds.length > 0) {
        EffectPrimitives.recoverFromDiscardToDeck(state, playerIndex, selectedIds.slice(0, 3));
      }
      return { success: true, message: `ใช้ ${getCardDisplayName(itemCard)} สับการ์ดกลับสำรับสำเร็จ` };
    }

    // 12. Rare Candy: Evolve Basic directly to Stage 2 (skipping Stage 1)
    if (name.includes('rare candy') || name.includes('ลูกอมประหลาด')) {
      if (!choices?.targetPokemonInstanceId || !choices?.selectedCardInstanceIds?.length) {
        return { success: false, error: 'ต้องระบุโปเกมอนเป้าหมายและการ์ด Stage 2 บนมือสำหรับ Rare Candy' };
      }
      const evoCardId = choices.selectedCardInstanceIds[0];
      const handIdx = player.hand.findIndex((c) => c.instanceId === evoCardId);
      if (handIdx === -1) {
        return { success: false, error: 'ไม่พบการ์ดวิวัฒนาการบนมือ' };
      }
      const evoCard = player.hand[handIdx];
      if (!evoCard.subtypes.includes('Stage 2') && !evoCard.subtypes.includes('Stage2')) {
        return { success: false, error: 'Rare Candy ใช้ได้เฉพาะกับโปเกมอน Stage 2 เท่านั้น' };
      }

      let target: PokemonInPlay | null = null;
      if (player.active?.instanceId === choices.targetPokemonInstanceId) {
        target = player.active;
      } else {
        target = player.bench.find((b) => b?.instanceId === choices.targetPokemonInstanceId) || null;
      }

      if (!target) return { success: false, error: 'ไม่พบโปเกมอนเป้าหมาย' };
      if (target.stage !== 'Basic') return { success: false, error: 'Rare Candy พัฒนาได้เฉพาะจากโปเกมอน Basic เท่านั้น' };
      const isFirstTurnForPlayer =
        state.turnNumber === 1 || (state.turnNumber === 2 && playerIndex !== state.firstPlayerIndex);
      if (isFirstTurnForPlayer) {
        return { success: false, error: 'ห้ามพัฒนาร่างในเทิร์นแรกของผู้เล่นทั้งสองฝ่าย' };
      }
      if (target.turnEnteredPlay >= state.turnNumber) {
        return { success: false, error: 'ห้ามพัฒนาร่างโปเกมอนที่เพิ่งลงสนามในเทิร์นเดียวกัน' };
      }
      if (!EvolutionResolver.isEvolutionMatch(evoCard, target.card, true)) {
        return {
          success: false,
          error: `${getCardDisplayName(evoCard)} ไม่ได้อยู่ในสายวิวัฒนาการของ ${getCardDisplayName(target.card)}`,
        };
      }

      player.hand.splice(handIdx, 1);
      target.evolutionHistory.push(target.card);
      target.card = evoCard;
      target.stage = 'Stage2';
      target.maxHp = evoCard.hp || target.maxHp;
      target.turnEvolved = state.turnNumber;
      target.specialConditions = [];

      if (evoCard.abilities?.some((a) => a.name === 'Infernal Reign') && choices.energyAttachments) {
        EffectRegistry.executeAbility(state, playerIndex, target, 'Infernal Reign', choices);
      }

      return { success: true, message: 'ใช้ Rare Candy พัฒนาร่าง Stage 2 สำเร็จ' };
    }

    // 13. Crushing Hammer / Enhanced Hammer: Discard energy from opponent's Pokémon
    if (name.includes('crushing hammer') || name.includes('แครชแฮมเมอร์')) {
      const isHeads = Math.random() < 0.5;
      if (!isHeads) {
        return { success: true, message: 'แครชแฮมเมอร์ออกก้อย — ไม่มีผล' };
      }
      if (opponent.active && opponent.active.attachedEnergies.length > 0) {
        const [discarded] = opponent.active.attachedEnergies.splice(0, 1);
        opponent.discard.push(discarded);
        return { success: true, message: 'แครชแฮมเมอร์ออกหัว! ทิ้งพลังงานของฝ่ายตรงข้าม 1 ใบสำเร็จ' };
      }
      return { success: true, message: 'แครชแฮมเมอร์ออกหัว แต่ฝ่ายตรงข้ามไม่มีพลังงานให้ทิ้ง' };
    }

    // 14. Pokégear 3.0: Look at top 7 cards, take 1 Supporter to hand
    if (name.includes('pokégear') || name.includes('pokegear') || name.includes('โปเกเกีย')) {
      const top7 = player.deck.slice(0, 7);
      const supporter = top7.find((c) => c.supertype === 'Trainer' && c.subtypes.includes('Supporter'));
      if (supporter) {
        const deckIdx = player.deck.findIndex((c) => c.instanceId === supporter.instanceId);
        if (deckIdx !== -1) {
          const [found] = player.deck.splice(deckIdx, 1);
          player.hand.push(found);
        }
      }
      EffectPrimitives.shuffleDeck(state, playerIndex);
      return {
        success: true,
        message: supporter ? `ใช้ Pokégear 3.0 พบ ${getCardDisplayName(supporter)} ขึ้นมือ` : 'ใช้ Pokégear 3.0 แต่ไม่พบ Supporter ในการ์ด 7 ใบบนสุด',
      };
    }

    // 15. Earthen Vessel: Discard 1 card from hand, search deck for up to 2 Basic Energy
    if (name.includes('earthen vessel') || name.includes('หม้อดินเผา')) {
      if (choices?.discardCardInstanceIds && choices.discardCardInstanceIds.length > 0) {
        EffectPrimitives.discardFromHand(state, playerIndex, [choices.discardCardInstanceIds[0]]);
      } else {
        const discardable = player.hand.filter((c) => c.instanceId !== itemCard.instanceId);
        if (discardable.length > 0) {
          EffectPrimitives.discardFromHand(state, playerIndex, [discardable[0].instanceId]);
        }
      }
      const selectedIds = choices?.selectedCardInstanceIds || [];
      if (selectedIds.length > 0) {
        for (const id of selectedIds.slice(0, 2)) {
          const deckIdx = player.deck.findIndex((c) => c.instanceId === id && c.supertype === 'Energy');
          if (deckIdx !== -1) {
            const [energy] = player.deck.splice(deckIdx, 1);
            player.hand.push(energy);
          }
        }
      } else {
        const basicEnergies = player.deck.filter((c) => c.supertype === 'Energy').slice(0, 2);
        for (const be of basicEnergies) {
          const deckIdx = player.deck.findIndex((c) => c.instanceId === be.instanceId);
          if (deckIdx !== -1) {
            const [energy] = player.deck.splice(deckIdx, 1);
            player.hand.push(energy);
          }
        }
      }
      EffectPrimitives.shuffleDeck(state, playerIndex);
      return { success: true, message: 'ใช้ Earthen Vessel ค้นหาพลังงานขึ้นมือสำเร็จ' };
    }

    // 16. Trekking Shoes: Look at top card of deck, keep or discard and draw 1
    if (name.includes('trekking shoes') || name.includes('รองเท้าเดินป่า')) {
      if (player.deck.length > 0) {
        const [card] = player.deck.splice(0, 1);
        player.hand.push(card);
      }
      return { success: true, message: 'ใช้ Trekking Shoes จั่วการ์ด 1 ใบ' };
    }

    // 17. Jumbo Ice Cream / Pokémon Center Lady: Heal damage
    if (name.includes('jumbo ice cream') || name.includes('ไอศกรีม') || name.includes('center lady') || name.includes('โปเกมอนเซ็นเตอร์')) {
      if (player.active) {
        EffectPrimitives.healDamage(player.active, 60);
        player.active.specialConditions = [];
      }
      return { success: true, message: 'ฟื้นฟูพลังชีวิตและรักษาอาการผิดปกติสำเร็จ' };
    }

    // 18. Glass Trumpet (ทรัมเป็ตแก้ว): Attach basic energy from discard to up to 2 benched Colorless Pokémon
    if (name.includes('glass trumpet') || name.includes('ทรัมเป็ตแก้ว')) {
      const colorlessBench = player.bench.filter((b): b is PokemonInPlay => b !== null && b.card.energyType === 'Colorless');
      for (const b of colorlessBench.slice(0, 2)) {
        const energyIdx = player.discard.findIndex((c) => c.supertype === 'Energy');
        if (energyIdx !== -1) {
          const [energy] = player.discard.splice(energyIdx, 1);
          b.attachedEnergies.push(energy);
        }
      }
      return { success: true, message: 'ใช้ Glass Trumpet ติดพลังงานให้โปเกมอนไร้สีสำเร็จ' };
    }

    // 19. Dark Patch: Attach 1 Basic Darkness Energy from discard to 1 Benched Darkness Pokémon
    if (name.includes('dark patch') || name.includes('แพตช์')) {
      const darkEnergyIdx = player.discard.findIndex((c) => c.supertype === 'Energy' && c.energyType === 'Darkness');
      const benchedDark = player.bench.find((b) => b && b.card.energyType === 'Darkness');
      if (darkEnergyIdx !== -1 && benchedDark) {
        const [energy] = player.discard.splice(darkEnergyIdx, 1);
        benchedDark.attachedEnergies.push(energy);
        return { success: true, message: 'ใช้ Dark Patch ติดพลังงานมืดสำเร็จ' };
      }
      return { success: true, message: 'เล่น Dark Patch' };
    }

    // 20. Bug Catching Set (ชุดจับแมลง): Look at top 7 cards, choose up to 2 Grass Pokémon or Basic Grass Energy
    if (name.includes('bug catching set') || name.includes('ชุดจับแมลง')) {
      const selectedIds = choices?.selectedCardInstanceIds || [];
      if (selectedIds.length > 0) {
        for (const id of selectedIds.slice(0, 2)) {
          const idx = player.deck.findIndex((c) => c.instanceId === id);
          if (idx !== -1) {
            const [c] = player.deck.splice(idx, 1);
            player.hand.push(c);
          }
        }
      } else {
        const top7 = player.deck.slice(0, 7);
        const eligible = top7.filter(
          (c) =>
            (c.supertype === 'Pokemon' && c.energyType === 'Grass') ||
            (c.supertype === 'Energy' && c.energyType === 'Grass')
        );
        for (const card of eligible.slice(0, 2)) {
          const idx = player.deck.findIndex((c) => c.instanceId === card.instanceId);
          if (idx !== -1) {
            const [c] = player.deck.splice(idx, 1);
            player.hand.push(c);
          }
        }
      }
      EffectPrimitives.shuffleDeck(state, playerIndex);
      return { success: true, message: 'ใช้ Bug Catching Set สำเร็จ' };
    }

    // 21. Fighting Gong (ฆ้องต่อสู้): Look at top 7 cards, choose up to 2 Fighting Pokémon or Basic Fighting Energy
    if (name.includes('fighting gong') || name.includes('ฆ้องต่อสู้')) {
      const selectedIds = choices?.selectedCardInstanceIds || [];
      if (selectedIds.length > 0) {
        for (const id of selectedIds.slice(0, 2)) {
          const idx = player.deck.findIndex((c) => c.instanceId === id);
          if (idx !== -1) {
            const [c] = player.deck.splice(idx, 1);
            player.hand.push(c);
          }
        }
      } else {
        const top7 = player.deck.slice(0, 7);
        const eligible = top7.filter(
          (c) =>
            (c.supertype === 'Pokemon' && c.energyType === 'Fighting') ||
            (c.supertype === 'Energy' && c.energyType === 'Fighting')
        );
        for (const card of eligible.slice(0, 2)) {
          const idx = player.deck.findIndex((c) => c.instanceId === card.instanceId);
          if (idx !== -1) {
            const [c] = player.deck.splice(idx, 1);
            player.hand.push(c);
          }
        }
      }
      EffectPrimitives.shuffleDeck(state, playerIndex);
      return { success: true, message: 'ใช้ Fighting Gong สำเร็จ' };
    }

    // 22. Energy Search (ส่งต่อพลังงาน): Search deck for 1 Basic Energy
    if (name.includes('energy search') || name.includes('ส่งต่อพลังงาน')) {
      const selectedId = choices?.selectedCardInstanceIds?.[0];
      let energyCard: CardInstance | undefined;
      if (selectedId) {
        const idx = player.deck.findIndex((c) => c.instanceId === selectedId && c.supertype === 'Energy');
        if (idx !== -1) [energyCard] = player.deck.splice(idx, 1);
      } else {
        const idx = player.deck.findIndex((c) => c.supertype === 'Energy');
        if (idx !== -1) [energyCard] = player.deck.splice(idx, 1);
      }
      if (energyCard) {
        player.hand.push(energyCard);
      }
      EffectPrimitives.shuffleDeck(state, playerIndex);
      return { success: true, message: 'ใช้ Energy Search ค้นหาพลังงานขึ้นมือสำเร็จ' };
    }

    // 23. Energy Recycler (เอนเนอร์จี้รีไซเคิล): Shuffle up to 5 Basic Energy from discard to deck
    if (name.includes('energy recycler') || name.includes('รีไซเคิล')) {
      const selectedIds = choices?.selectedCardInstanceIds || [];
      if (selectedIds.length > 0) {
        EffectPrimitives.recoverFromDiscardToDeck(state, playerIndex, selectedIds.slice(0, 5));
      } else {
        const basicEnergies = player.discard.filter((c) => c.supertype === 'Energy').slice(0, 5);
        EffectPrimitives.recoverFromDiscardToDeck(
          state,
          playerIndex,
          basicEnergies.map((e) => e.instanceId)
        );
      }
      return { success: true, message: 'ใช้ Energy Recycler สับพลังงานกลับสำรับสำเร็จ' };
    }

    // 24. Enhanced Hammer (ค้อนสลายพลังงาน): Discard 1 Special Energy from opponent's Pokémon
    if (name.includes('enhanced hammer') || name.includes('ค้อนสลายพลังงาน')) {
      let discardedEnergy = false;
      const allOppPokemon = [opponent.active, ...opponent.bench].filter((p): p is PokemonInPlay => p !== null);
      for (const p of allOppPokemon) {
        const specialIdx = p.attachedEnergies.findIndex(
          (e) => (e.subtypes && e.subtypes.includes('Special')) || (e.nameEn || '').toLowerCase().includes('special')
        );
        if (specialIdx !== -1) {
          const [energy] = p.attachedEnergies.splice(specialIdx, 1);
          opponent.discard.push(energy);
          discardedEnergy = true;
          break;
        }
      }
      return {
        success: true,
        message: discardedEnergy ? 'ใช้ Enhanced Hammer ทิ้งพลังงานพิเศษของฝ่ายตรงข้ามสำเร็จ' : 'ฝ่ายตรงข้ามไม่มีพลังงานพิเศษให้ทิ้ง',
      };
    }

    // 25. Hand Trimmer (แฮนด์ทริมเมอร์): Both players discard until holding 5 cards
    if (name.includes('hand trimmer') || name.includes('แฮนด์ทริมเมอร์')) {
      for (const pIdx of [playerIndex, opponentIndex] as (0 | 1)[]) {
        const p = state.players[pIdx];
        if (p.hand.length > 5) {
          const excess = p.hand.length - 5;
          const discarded = p.hand.splice(p.hand.length - excess, excess);
          p.discard.push(...discarded);
        }
      }
      return { success: true, message: 'ใช้ Hand Trimmer ตัดการ์ดบนมือเหลือ 5 ใบ' };
    }

    // 26. Secret Box (กล่องลับ ACE SPEC): Discard 3 cards, search deck for 1 Item, 1 Supporter, 1 Tool, 1 Stadium
    if (name.includes('secret box') || name.includes('กล่องลับ')) {
      if (choices?.discardCardInstanceIds && choices.discardCardInstanceIds.length >= 3) {
        EffectPrimitives.discardFromHand(state, playerIndex, choices.discardCardInstanceIds.slice(0, 3));
      } else {
        const handWithoutThis = player.hand.filter((c) => c.instanceId !== itemCard.instanceId);
        if (handWithoutThis.length >= 3) {
          EffectPrimitives.discardFromHand(state, playerIndex, handWithoutThis.slice(0, 3).map((c) => c.instanceId));
        }
      }
      const selectedIds = choices?.selectedCardInstanceIds || [];
      if (selectedIds.length > 0) {
        for (const id of selectedIds) {
          const idx = player.deck.findIndex((c) => c.instanceId === id);
          if (idx !== -1) {
            const [c] = player.deck.splice(idx, 1);
            player.hand.push(c);
          }
        }
      } else {
        // Auto-find 1 Item, 1 Supporter, 1 Tool, 1 Stadium
        const item = player.deck.find((c) => c.supertype === 'Trainer' && c.subtypes.includes('Item') && !c.subtypes.includes('Tool'));
        const supporter = player.deck.find((c) => c.supertype === 'Trainer' && c.subtypes.includes('Supporter'));
        const tool = player.deck.find((c) => c.supertype === 'Trainer' && c.subtypes.includes('Tool'));
        const stadium = player.deck.find((c) => c.supertype === 'Trainer' && c.subtypes.includes('Stadium'));
        for (const found of [item, supporter, tool, stadium]) {
          if (found) {
            const idx = player.deck.findIndex((c) => c.instanceId === found.instanceId);
            if (idx !== -1) {
              const [c] = player.deck.splice(idx, 1);
              player.hand.push(c);
            }
          }
        }
      }
      EffectPrimitives.shuffleDeck(state, playerIndex);
      return { success: true, message: 'ใช้ Secret Box ค้นหาการ์ด 4 หมวดหมู่ขึ้นมือสำเร็จ' };
    }

    // 27. Sacred Ash (ขี้เถ้าศักดิ์สิทธิ์): Shuffle up to 5 Pokémon from discard into deck
    if (name.includes('sacred ash') || name.includes('ขี้เถ้า')) {
      const selectedIds = choices?.selectedCardInstanceIds || [];
      if (selectedIds.length > 0) {
        EffectPrimitives.recoverFromDiscardToDeck(state, playerIndex, selectedIds.slice(0, 5));
      } else {
        const discardedPokemon = player.discard.filter((c) => c.supertype === 'Pokemon').slice(0, 5);
        EffectPrimitives.recoverFromDiscardToDeck(
          state,
          playerIndex,
          discardedPokemon.map((p) => p.instanceId)
        );
      }
      return { success: true, message: 'ใช้ Sacred Ash สับโปเกมอนกลับสำรับสำเร็จ' };
    }

    // 28. Mega Signal (เมก้าซิกแนล): Search deck for 1 Pokémon ex / Mega Evolution
    if (name.includes('mega signal') || name.includes('เมก้าซิกแนล')) {
      const selectedId = choices?.selectedCardInstanceIds?.[0];
      let foundCard: CardInstance | undefined;
      if (selectedId) {
        const idx = player.deck.findIndex((c) => c.instanceId === selectedId);
        if (idx !== -1) [foundCard] = player.deck.splice(idx, 1);
      } else {
        const idx = player.deck.findIndex(
          (c) => c.supertype === 'Pokemon' && (c.subtypes.includes('ex') || c.subtypes.includes('MEGA'))
        );
        if (idx !== -1) [foundCard] = player.deck.splice(idx, 1);
      }
      if (foundCard) player.hand.push(foundCard);
      EffectPrimitives.shuffleDeck(state, playerIndex);
      return { success: true, message: 'ใช้ Mega Signal ค้นหาโปเกมอนขึ้นมือสำเร็จ' };
    }

    // 29. N's PP Up (ยาเพิ่มพลังงานของ N): Attach 1 Basic Energy from discard to an N's Pokémon
    if (name.includes("n's pp up") || name.includes('ยาเพิ่มพลังงานของ n')) {
      const basicEnergyIdx = player.discard.findIndex((c) => c.supertype === 'Energy');
      const nPokemon = [player.active, ...player.bench].find(
        (p) => p && (p.card.nameEn || '').toLowerCase().includes("n's")
      );
      if (basicEnergyIdx !== -1 && nPokemon) {
        const [energy] = player.discard.splice(basicEnergyIdx, 1);
        nPokemon.attachedEnergies.push(energy);
        return { success: true, message: "ใช้ N's PP Up ติดพลังงานสำเร็จ" };
      }
      return { success: true, message: "เล่น N's PP Up" };
    }

    // 30. Dusk Ball (ดาร์กบอล): Look at bottom card of deck, if Pokémon put into hand
    if (name.includes('dusk ball') || name.includes('ดาร์กบอล')) {
      if (player.deck.length > 0) {
        const bottomCard = player.deck[player.deck.length - 1];
        if (bottomCard.supertype === 'Pokemon') {
          player.deck.pop();
          player.hand.push(bottomCard);
          return { success: true, message: `ใช้ Dusk Ball พบ ${getCardDisplayName(bottomCard)} ที่ใต้สำรับ!` };
        }
      }
      EffectPrimitives.shuffleDeck(state, playerIndex);
      return { success: true, message: 'ใช้ Dusk Ball แต่การ์ดใต้สำรับไม่ใช่โปเกมอน' };
    }

    // 31. Premium Power Pro (พาวเวอร์โปรตีน): Boost attacks by 30 damage this turn
    if (name.includes('power pro') || name.includes('พาวเวอร์โปรตีน')) {
      return { success: true, message: 'ใช้ Premium Power Pro เพิ่มแดเมจ 30 หน่วยในเทิร์นนี้' };
    }

    return { success: true, message: `เล่น ${getCardDisplayName(itemCard)}` };
  }

  /**
   * Resolve Supporter card effect
   */
  static executeSupporter(
    state: GameState,
    playerIndex: 0 | 1,
    supporterCard: CardInstance,
    choices?: EffectChoices
  ): EffectExecutionResult {
    const player = state.players[playerIndex];
    const opponentIndex = playerIndex === 0 ? 1 : 0;
    const opponent = state.players[opponentIndex];
    const name = (supporterCard.nameEn || supporterCard.nameTh || '').toLowerCase();

    // Check canonical StandardTrainerDatabase first
    const canonical = StandardTrainerDatabase.getTrainer(supporterCard.nameEn || supporterCard.nameTh || '');
    if (canonical && canonical.subtype === 'Supporter') {
      const validation = canonical.canPlay(state, playerIndex, supporterCard);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }
      return canonical.execute(state, playerIndex, supporterCard, choices);
    }

    // 1. Professor's Research: Discard hand, draw 7
    if (name.includes("professor's research") || name.includes('professors research') || name.includes('วิจัย')) {
      const handCards = player.hand.splice(0, player.hand.length);
      player.discard.push(...handCards);
      EffectPrimitives.drawCards(state, playerIndex, 7);
      return { success: true, message: "ใช้ Professor's Research จั่วการ์ด 7 ใบ" };
    }

    // 2. Lillie's Determination (ปณิธานของลิเลีย): Discard hand, draw 6 (or 8 on turn 1 going second)
    if (name.includes("lillie's determination") || name.includes('lillies determination') || name.includes('ลิเลีย')) {
      const handCards = player.hand.splice(0, player.hand.length);
      player.discard.push(...handCards);
      const isSecondTurnOne = state.turnNumber === 2 && playerIndex !== state.firstPlayerIndex;
      const drawCount = isSecondTurnOne ? 8 : 6;
      EffectPrimitives.drawCards(state, playerIndex, drawCount);
      return { success: true, message: `ใช้ Lillie's Determination ทิ้งการ์ดบนมือและจั่ว ${drawCount} ใบ` };
    }

    // 3. Iono: Both players shuffle hand to bottom of deck, draw equal to remaining prizes
    if (name.includes('iono') || name.includes('นันจาโม')) {
      EffectPrimitives.shuffleHandToBottom(state, playerIndex);
      EffectPrimitives.shuffleHandToBottom(state, opponentIndex);

      EffectPrimitives.drawCards(state, playerIndex, player.prizes.length);
      EffectPrimitives.drawCards(state, opponentIndex, opponent.prizes.length);
      return { success: true, message: 'ใช้ Iono สำเร็จ ทั้งสองฝ่ายจั่วการ์ดตามรางวัลคงเหลือ' };
    }

    // 4. Boss's Orders: Switch opponent's benched Pokémon with their active
    if (name.includes("boss's orders") || name.includes('bosses orders') || name.includes('boss orders') || name.includes('คำสั่งของบอส')) {
      if (choices?.opponentBenchIndex === undefined) {
        return { success: false, error: 'ต้องเลือกโปเกมอนบน Bench ของฝ่ายตรงข้าม' };
      }
      const switched = EffectPrimitives.switchOpponentActiveWithBench(state, playerIndex, choices.opponentBenchIndex);
      if (!switched) {
        return { success: false, error: 'ไม่สามารถสลับตำแหน่งโปเกมอนของฝ่ายตรงข้ามได้' };
      }
      return { success: true, message: "ใช้ Boss's Orders ดึงโปเกมอนของฝ่ายตรงข้ามขึ้นมา Active" };
    }

    // 5. Crispin (อาคามัตสึ): Search deck for up to 2 basic energy of different types, attach 1 and put 1 to hand
    if (name.includes('crispin') || name.includes('akamatsu') || name.includes('อาคามัตสึ')) {
      const energiesInDeck = player.deck.filter((c) => c.supertype === 'Energy');
      const uniqueTypes = new Set<string>();
      const eligibleEnergies: CardInstance[] = [];

      for (const e of energiesInDeck) {
        const type = e.energyType || 'Colorless';
        if (!uniqueTypes.has(type) && eligibleEnergies.length < 2) {
          uniqueTypes.add(type);
          eligibleEnergies.push(e);
        }
      }

      if (eligibleEnergies.length > 0) {
        const attachTarget = player.active || player.bench.find((b) => b !== null);
        const [e1] = eligibleEnergies;
        const idx1 = player.deck.findIndex((c) => c.instanceId === e1.instanceId);
        if (idx1 !== -1 && attachTarget) {
          const [energy] = player.deck.splice(idx1, 1);
          attachTarget.attachedEnergies.push(energy);
        }
        if (eligibleEnergies.length > 1) {
          const e2 = eligibleEnergies[1];
          const idx2 = player.deck.findIndex((c) => c.instanceId === e2.instanceId);
          if (idx2 !== -1) {
            const [energy] = player.deck.splice(idx2, 1);
            player.hand.push(energy);
          }
        }
      }
      EffectPrimitives.shuffleDeck(state, playerIndex);
      return { success: true, message: 'ใช้ Crispin เร่งพลังงานและค้นหาขึ้นมือสำเร็จ' };
    }

    // 6. Judge (ผู้ตัดสิน): Each player shuffles hand into deck and draws 4
    if (name.includes('judge') || name.includes('ผู้ตัดสิน')) {
      EffectPrimitives.shuffleHandToBottom(state, playerIndex);
      EffectPrimitives.shuffleDeck(state, playerIndex);
      EffectPrimitives.drawCards(state, playerIndex, 4);

      EffectPrimitives.shuffleHandToBottom(state, opponentIndex);
      EffectPrimitives.shuffleDeck(state, opponentIndex);
      EffectPrimitives.drawCards(state, opponentIndex, 4);
      return { success: true, message: 'ใช้ Judge! ทั้งสองฝ่ายสับการ์ดบนมือและจั่วคนละ 4 ใบ' };
    }

    // 7. Cyrano (ไซยาโน): Search deck for up to 3 Basic Pokémon ex into hand
    if (name.includes('cyrano') || name.includes('ไซยาโน')) {
      const basicEx = player.deck.filter(
        (c) => c.supertype === 'Pokemon' && c.subtypes.includes('Basic') && (c.subtypes.includes('ex') || c.nameEn?.includes('ex'))
      );
      for (const card of basicEx.slice(0, 3)) {
        const idx = player.deck.findIndex((c) => c.instanceId === card.instanceId);
        if (idx !== -1) {
          const [c] = player.deck.splice(idx, 1);
          player.hand.push(c);
        }
      }
      EffectPrimitives.shuffleDeck(state, playerIndex);
      return { success: true, message: 'ใช้ Cyrano ค้นหา Basic Pokémon ex ขึ้นมือสำเร็จ' };
    }

    // 8. Arven (เปปเปอร์): Search deck for 1 Item and 1 Pokémon Tool into hand
    if (name.includes('arven') || name.includes('เปปเปอร์')) {
      const selectedIds = choices?.selectedCardInstanceIds || [];
      for (const id of selectedIds.slice(0, 2)) {
        const deckIdx = player.deck.findIndex((c) => c.instanceId === id && c.supertype === 'Trainer');
        if (deckIdx !== -1) {
          const [card] = player.deck.splice(deckIdx, 1);
          player.hand.push(card);
        }
      }
      EffectPrimitives.shuffleDeck(state, playerIndex);
      return { success: true, message: 'ใช้ Arven สำเร็จ' };
    }

    // 9. Professor Sada's Vitality: Attach energy from discard to Ancient Pokemon & draw 3
    if (name.includes('sada') || name.includes('โอลิม')) {
      const ancientPokemon = [player.active, ...player.bench].filter(
        (p): p is PokemonInPlay => p !== null && (p.card.subtypes.includes('Ancient') || (p.card.nameEn || '').includes('Roaring Moon'))
      );
      for (const p of ancientPokemon.slice(0, 2)) {
        const energyIdx = player.discard.findIndex((c) => c.supertype === 'Energy');
        if (energyIdx !== -1) {
          const [e] = player.discard.splice(energyIdx, 1);
          p.attachedEnergies.push(e);
        }
      }
      EffectPrimitives.drawCards(state, playerIndex, 3);
      return { success: true, message: "ใช้ Professor Sada's Vitality ติดพลังงานและจั่ว 3 ใบ" };
    }

    // 10. Kieran (ซุกุริ) / Surfer (นักโต้คลื่น): Switch active and utility
    if (name.includes('kieran') || name.includes('ซุกุริ') || name.includes('surfer') || name.includes('นักโต้คลื่น')) {
      if (choices?.playerBenchIndex !== undefined) {
        EffectPrimitives.switchActiveWithBench(state, playerIndex, choices.playerBenchIndex);
      }
      if (name.includes('surfer') && player.hand.length < 5) {
        EffectPrimitives.drawCards(state, playerIndex, 5 - player.hand.length);
      }
      return { success: true, message: `ใช้ ${getCardDisplayName(supporterCard)} สลับตำแหน่งและเสริมเกม` };
    }

    // 11. Explorer's Guidance (การนำทางของนักสำรวจ): Look at top 6 cards, 2 to hand, discard 4
    if (name.includes('explorer') || name.includes('นักสำรวจ')) {
      const top6 = player.deck.splice(0, Math.min(6, player.deck.length));
      player.hand.push(...top6.slice(0, 2));
      player.discard.push(...top6.slice(2));
      return { success: true, message: "ใช้ Explorer's Guidance นำการ์ด 2 ใบขึ้นมือและทิ้ง 4 ใบ" };
    }

    return { success: true, message: `ใช้ Supporter ${getCardDisplayName(supporterCard)}` };
  }

  /**
   * Resolve Pokémon Ability effect
   */
  static executeAbility(
    state: GameState,
    playerIndex: 0 | 1,
    pokemon: PokemonInPlay,
    abilityName: string,
    choices?: EffectChoices
  ): EffectExecutionResult {
    const player = state.players[playerIndex];
    const opponentIndex = playerIndex === 0 ? 1 : 0;
    const opponent = state.players[opponentIndex];
    const cleanAbilityName = abilityName.toLowerCase().trim();

    // 1. Infernal Reign (Charizard ex): Attach up to 3 Basic Fire Energy from deck to your Pokémon
    if (cleanAbilityName.includes('infernal reign') || cleanAbilityName.includes('เพลิงอเวจี')) {
      const attachments = choices?.energyAttachments || [];
      if (attachments.length > 0) {
        for (const att of attachments.slice(0, 3)) {
          const deckIdx = player.deck.findIndex(
            (c) => c.instanceId === att.energyInstanceId && c.supertype === 'Energy' && c.energyType === 'Fire'
          );
          let target: PokemonInPlay | null = null;
          if (player.active?.instanceId === att.targetPokemonInstanceId) {
            target = player.active;
          } else {
            target = player.bench.find((b) => b?.instanceId === att.targetPokemonInstanceId) || null;
          }

          if (deckIdx !== -1 && target) {
            const [energy] = player.deck.splice(deckIdx, 1);
            target.attachedEnergies.push(energy);
          }
        }
      } else {
        // Auto-fallback (e.g. Bot): Attach up to 3 Basic Fire Energy from deck to this evolving Pokémon
        const fireEnergies = player.deck.filter((c) => c.supertype === 'Energy' && c.energyType === 'Fire').slice(0, 3);
        for (const fe of fireEnergies) {
          const idx = player.deck.findIndex((c) => c.instanceId === fe.instanceId);
          if (idx !== -1) {
            const [energy] = player.deck.splice(idx, 1);
            pokemon.attachedEnergies.push(energy);
          }
        }
      }
      EffectPrimitives.shuffleDeck(state, playerIndex);
      return { success: true, message: 'ใช้ความสามารถ Infernal Reign ติดพลังงานไฟสำเร็จ' };
    }

    // 2. Quick Search (Pidgeot ex): Search deck for any 1 card into hand
    if (cleanAbilityName.includes('quick search') || cleanAbilityName.includes('ค้นหาด่วน')) {
      if (choices?.selectedCardInstanceIds && choices.selectedCardInstanceIds.length > 0) {
        const id = choices.selectedCardInstanceIds[0];
        const deckIdx = player.deck.findIndex((c) => c.instanceId === id);
        if (deckIdx !== -1) {
          const [card] = player.deck.splice(deckIdx, 1);
          player.hand.push(card);
        }
      } else if (player.deck.length > 0) {
        // Auto-fallback: Take top card
        const [card] = player.deck.splice(0, 1);
        player.hand.push(card);
      }
      EffectPrimitives.shuffleDeck(state, playerIndex);
      return { success: true, message: 'ใช้ความสามารถ Quick Search ค้นหาการ์ด 1 ใบ' };
    }

    // 3. Teal Dance (Teal Mask Ogerpon ex): Attach 1 Grass energy from hand to this Pokemon, draw 1 card
    if (cleanAbilityName.includes('teal dance') || cleanAbilityName.includes('เริงระบำ')) {
      const grassEnergyIdx = player.hand.findIndex(
        (c) => c.supertype === 'Energy' && (c.energyType === 'Grass' || c.nameEn?.includes('Grass'))
      );
      if (grassEnergyIdx === -1) {
        return { success: false, error: 'ไม่มีพลังงานหญ้าบนมือสำหรับ Teal Dance' };
      }
      const [grassEnergy] = player.hand.splice(grassEnergyIdx, 1);
      pokemon.attachedEnergies.push(grassEnergy);
      EffectPrimitives.drawCards(state, playerIndex, 1);
      return { success: true, message: 'ใช้ Teal Dance ติดพลังงานหญ้าและจั่วการ์ด 1 ใบ!' };
    }

    // 4. Recon Directive (Drakloak): Look at top 2 cards, 1 to hand, 1 to bottom
    if (cleanAbilityName.includes('recon directive') || cleanAbilityName.includes('ลาดตระเวน')) {
      if (player.deck.length === 0) {
        return { success: true, message: 'สำรับไม่มีการ์ดเหลือ' };
      }
      const topCount = Math.min(2, player.deck.length);
      const topCards = player.deck.splice(0, topCount);
      const chosenId = choices?.selectedCardInstanceIds?.[0];
      const chosenIdx = chosenId ? topCards.findIndex((c) => c.instanceId === chosenId) : 0;
      const actualChosenIdx = chosenIdx !== -1 ? chosenIdx : 0;
      const [toHand] = topCards.splice(actualChosenIdx, 1);
      player.hand.push(toHand);
      if (topCards.length > 0) {
        player.deck.push(topCards[0]); // Other card to bottom of deck
      }
      return { success: true, message: `ใช้ Recon Directive นำ ${getCardDisplayName(toHand)} ขึ้นมือ` };
    }

    // 5. Adrena-Brain (Munkidori): If this Pokémon has Darkness Energy, move up to 3 damage counters to opponent
    if (cleanAbilityName.includes('adrena-brain') || cleanAbilityName.includes('สมองอดรีนาลีน')) {
      const hasDarkness = pokemon.attachedEnergies.some((e) => e.energyType === 'Darkness');
      if (!hasDarkness) {
        return { success: false, error: 'Munkidori ต้องมี Darkness Energy ติดอยู่จึงจะใช้ Adrena-Brain ได้' };
      }
      const targetOpponentId = choices?.targetPokemonInstanceId;
      let targetOpponent: PokemonInPlay | null = null;
      if (targetOpponentId) {
        if (opponent.active?.instanceId === targetOpponentId) targetOpponent = opponent.active;
        else targetOpponent = opponent.bench.find((b) => b?.instanceId === targetOpponentId) || null;
      }
      if (!targetOpponent) {
        targetOpponent = opponent.active || opponent.bench.find((b) => b !== null) || null;
      }

      let sourcePokemon: PokemonInPlay = pokemon;
      const sourcePokemonId = choices?.sourcePokemonInstanceId;
      if (sourcePokemonId) {
        if (player.active?.instanceId === sourcePokemonId && player.active) sourcePokemon = player.active;
        else sourcePokemon = player.bench.find((b) => b?.instanceId === sourcePokemonId) || pokemon;
      }

      if (targetOpponent && sourcePokemon.damageCounters > 0) {
        const moved = Math.min(sourcePokemon.damageCounters, 3);
        sourcePokemon.damageCounters -= moved;
        targetOpponent.damageCounters += moved;
        return { success: true, message: `ใช้ Adrena-Brain ย้าย ${moved * 10} แดเมจไปที่ฝ่ายตรงข้าม` };
      }
      return { success: true, message: 'ใช้ Adrena-Brain' };
    }

    // 6. Tandem Unit (Miraidon ex): Search deck for up to 2 Basic Lightning Pokémon to Bench
    if (cleanAbilityName.includes('tandem unit') || cleanAbilityName.includes('แทนเด็มยูนิต')) {
      const selectedIds = choices?.selectedCardInstanceIds || [];
      for (const id of selectedIds.slice(0, 2)) {
        const emptyBenchIdx = player.bench.findIndex((b) => b === null);
        if (emptyBenchIdx === -1) break;

        const deckIdx = player.deck.findIndex(
          (c) =>
            c.instanceId === id &&
            c.supertype === 'Pokemon' &&
            c.subtypes.includes('Basic') &&
            c.energyType === 'Lightning'
        );
        if (deckIdx !== -1) {
          const [card] = player.deck.splice(deckIdx, 1);
          player.bench[emptyBenchIdx] = {
            instanceId: `pokemon-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            card,
            stage: 'Basic',
            maxHp: card.hp || 70,
            damageCounters: 0,
            attachedEnergies: [],
            attachedTool: null,
            evolutionHistory: [],
            specialConditions: [],
            turnEnteredPlay: state.turnNumber,
            turnEvolved: 0,
          };
        }
      }
      EffectPrimitives.shuffleDeck(state, playerIndex);
      return { success: true, message: 'ใช้ความสามารถ Tandem Unit เรียกโปเกมอนสายฟ้าลง Bench' };
    }

    // 7. Fleet-Footed (Raikou V): If Active, draw 1 card
    if (cleanAbilityName.includes('fleet-footed') || cleanAbilityName.includes('fleet footed')) {
      if (player.active?.instanceId !== pokemon.instanceId) {
        return { success: false, error: 'Raikou V ต้องอยู่ในตำแหน่ง Active เพื่อใช้ Fleet-Footed' };
      }
      EffectPrimitives.drawCards(state, playerIndex, 1);
      return { success: true, message: 'ใช้ Fleet-Footed จั่วการ์ด 1 ใบ' };
    }

    // 8. Concealed Cards (Radiant Greninja): Discard 1 Energy from hand, draw 2 cards
    if (cleanAbilityName.includes('concealed cards') || cleanAbilityName.includes('ซ่อนการ์ด')) {
      const chosenEnergyId = choices?.discardCardInstanceIds?.[0];
      let energyIdx = chosenEnergyId
        ? player.hand.findIndex((c) => c.instanceId === chosenEnergyId && c.supertype === 'Energy')
        : -1;
      if (energyIdx === -1) {
        energyIdx = player.hand.findIndex((c) => c.supertype === 'Energy');
      }
      if (energyIdx === -1) {
        return { success: false, error: 'ไม่มีพลังงานบนมือสำหรับ Concealed Cards' };
      }
      const [energy] = player.hand.splice(energyIdx, 1);
      player.discard.push(energy);
      EffectPrimitives.drawCards(state, playerIndex, 2);
      return { success: true, message: 'ใช้ Concealed Cards ทิ้งพลังงานและจั่ว 2 ใบ!' };
    }

    // 9. Restart (Mew ex): Draw cards until you have 3 in hand
    if (cleanAbilityName.includes('restart') || cleanAbilityName.includes('รีสตาร์ต')) {
      if (player.hand.length < 3) {
        EffectPrimitives.drawCards(state, playerIndex, 3 - player.hand.length);
      }
      return { success: true, message: 'ใช้ Restart จั่วการ์ดจนครบ 3 ใบ' };
    }

    // 10. Flip the Script (Fezandipiti ex): Draw 3 cards
    if (cleanAbilityName.includes('flip the script') || cleanAbilityName.includes('พลิกเกม')) {
      EffectPrimitives.drawCards(state, playerIndex, 3);
      return { success: true, message: 'ใช้ Flip the Script จั่วการ์ด 3 ใบ!' };
    }

    // 11. Cursed Blast (Dusclops / Dusknoir): Knock out self, put 5 or 13 damage counters on 1 opponent Pokemon
    if (cleanAbilityName.includes('cursed blast') || cleanAbilityName.includes('เคิร์สด์บลาสต์')) {
      const isDusknoir = (pokemon.card.nameEn || '').toLowerCase().includes('dusknoir');
      const counters = isDusknoir ? 13 : 5;

      // Find target opponent Pokemon
      const targetId = choices?.targetPokemonInstanceId;
      const allOppPokemon = [opponent.active, ...opponent.bench].filter((p): p is PokemonInPlay => p !== null);
      const targetPokemon = targetId ? allOppPokemon.find((p) => p.instanceId === targetId) : opponent.active;
      if (targetPokemon) {
        targetPokemon.damageCounters += counters;
      }

      // Self-Knockout
      const isAttackerActive = player.active?.instanceId === pokemon.instanceId;
      player.discard.push(pokemon.card, ...pokemon.attachedEnergies);
      if (pokemon.attachedTool) player.discard.push(pokemon.attachedTool);
      if (pokemon.evolutionHistory) player.discard.push(...pokemon.evolutionHistory);

      if (isAttackerActive) {
        player.active = null;
      } else {
        const benchIdx = player.bench.findIndex((b) => b?.instanceId === pokemon.instanceId);
        if (benchIdx !== -1) player.bench[benchIdx] = null;
      }

      // Opponent takes 1 prize card for the KO!
      if (opponent.prizes.length > 0) {
        const [taken] = opponent.prizes.splice(0, 1);
        opponent.hand.push(taken);
      }

      return { success: true, message: `ใช้ Cursed Blast วาง ${counters} แดเมจเคาน์เตอร์สำเร็จ!` };
    }

    // 12. Attract Customer (Tatsugiri): Look at top 6 cards, take 1 Supporter
    if (cleanAbilityName.includes('attract customer') || cleanAbilityName.includes('เรียกลูกค้า')) {
      const top6 = player.deck.slice(0, 6);
      const supporter = top6.find((c) => c.supertype === 'Trainer' && c.subtypes.includes('Supporter'));
      if (supporter) {
        const deckIdx = player.deck.findIndex((c) => c.instanceId === supporter.instanceId);
        if (deckIdx !== -1) {
          const [card] = player.deck.splice(deckIdx, 1);
          player.hand.push(card);
        }
      }
      EffectPrimitives.shuffleDeck(state, playerIndex);
      return { success: true, message: 'ใช้ Attract Customer ค้นหา Supporter ขึ้นมือสำเร็จ' };
    }

    // 13. Run Away Draw (Dudunsparce ex): Draw 3 cards, shuffle self and attached cards into deck
    if (cleanAbilityName.includes('run away draw') || cleanAbilityName.includes('วิ่งหนี')) {
      EffectPrimitives.drawCards(state, playerIndex, 3);
      player.deck.push(pokemon.card, ...pokemon.attachedEnergies);
      if (pokemon.attachedTool) player.deck.push(pokemon.attachedTool);
      if (pokemon.evolutionHistory) player.deck.push(...pokemon.evolutionHistory);

      if (player.active?.instanceId === pokemon.instanceId) {
        player.active = null;
      } else {
        const bIdx = player.bench.findIndex((b) => b?.instanceId === pokemon.instanceId);
        if (bIdx !== -1) player.bench[bIdx] = null;
      }
      EffectPrimitives.shuffleDeck(state, playerIndex);
      return { success: true, message: 'ใช้ Run Away Draw จั่ว 3 ใบและสับกลับสำรับสำเร็จ' };
    }

    // 14. Flower Selecting (Comfey): Look at top 2, take 1, put 1 in Lost Zone
    if (cleanAbilityName.includes('flower selecting') || cleanAbilityName.includes('เก็บดอกไม้')) {
      if (player.deck.length > 0) {
        const [card] = player.deck.splice(0, 1);
        player.hand.push(card);
      }
      if (player.deck.length > 0) {
        const [lzCard] = player.deck.splice(0, 1);
        player.lostZone.push(lzCard);
      }
      return { success: true, message: 'ใช้ Flower Selecting เก็บการ์ดขึ้นมือและส่งเข้า Lost Zone สำเร็จ' };
    }

    return { success: true, message: `ใช้ความสามารถ ${abilityName}` };
  }

  /**
   * Dynamic Attack Damage Calculation & Extra Prize Modifiers
   */
  static evaluateAttack(
    state: GameState,
    playerIndex: 0 | 1,
    attacker: PokemonInPlay,
    attackName: string,
    baseDamage: number,
    choices?: EffectChoices
  ): { damage: number; extraPrizesOnKo: number } {
    const cleanAttackName = attackName.toLowerCase().trim();
    const opponentIndex = playerIndex === 0 ? 1 : 0;
    const opponent = state.players[opponentIndex];
    let damage = baseDamage;
    let extraPrizesOnKo = 0;

    // 1. Burning Darkness (Charizard ex): 180 + 30 for each prize card your opponent has taken
    if (cleanAttackName.includes('burning darkness') || cleanAttackName.includes('เบิร์นนิงดาร์กเนส')) {
      const opponentPrizesTaken = Math.max(0, 6 - opponent.prizes.length);
      damage = 180 + opponentPrizesTaken * 30;
    }

    // 2. Bellowing Thunder (Raging Bolt ex): 70x each Energy discarded from any of your Pokémon (Active or Bench)
    else if (cleanAttackName.includes('bellowing thunder') || cleanAttackName.includes('สายฟ้าคำราม')) {
      const discardIds = choices?.discardCardInstanceIds || [];
      if (discardIds.length > 0) {
        EffectPrimitives.discardEnergyFromPokemon(state, playerIndex, discardIds);
        damage = discardIds.length * 70;
      } else {
        // Collect energy from attacker and bench
        const player = state.players[playerIndex];
        const allFriendlyPokemon = [player.active, ...player.bench].filter((p): p is PokemonInPlay => p !== null);
        const allEnergyIds: string[] = [];
        for (const p of allFriendlyPokemon) {
          allEnergyIds.push(...p.attachedEnergies.map((e) => e.instanceId));
        }
        const discardBatch = allEnergyIds.slice(0, Math.max(1, allEnergyIds.length));
        EffectPrimitives.discardEnergyFromPokemon(state, playerIndex, discardBatch);
        damage = Math.max(70, discardBatch.length * 70);
      }
    }

    // 3. Phantom Dive (Dragapult ex): 200 damage + 6 damage counters (60 dmg) spread to opponent's bench
    else if (cleanAttackName.includes('phantom dive') || cleanAttackName.includes('แฟนทอมไดฟ์')) {
      damage = 200;
      const oppBench = opponent.bench.filter((b): b is PokemonInPlay => b !== null);
      if (oppBench.length > 0) {
        if (choices?.damageAssignments) {
          for (const [id, count] of Object.entries(choices.damageAssignments)) {
            const target = oppBench.find((b) => b.instanceId === id);
            if (target) target.damageCounters += count;
          }
        } else {
          // Distribute 6 counters across available bench
          let remaining = 6;
          for (let i = 0; i < oppBench.length && remaining > 0; i++) {
            const toAdd = Math.min(remaining, Math.ceil(6 / oppBench.length));
            oppBench[i].damageCounters += toAdd;
            remaining -= toAdd;
          }
          if (remaining > 0 && oppBench.length > 0) {
            oppBench[0].damageCounters += remaining;
          }
        }
      }
    }

    // 4. Photon Kinesis (Miraidon ex): 60 + 30 for each Lightning Energy attached to all your Pokémon
    else if (cleanAttackName.includes('photon kinesis') || cleanAttackName.includes('โฟตอนไคเนซิส')) {
      const player = state.players[playerIndex];
      let totalLightning = 0;
      if (player.active) {
        totalLightning += player.active.attachedEnergies.filter((e) => e.energyType === 'Lightning').length;
      }
      for (const b of player.bench) {
        if (b) {
          totalLightning += b.attachedEnergies.filter((e) => e.energyType === 'Lightning').length;
        }
      }
      damage = 60 + totalLightning * 30;
    }

    // 5. Lightning Rondo (Raikou V): 20 + 20 for each Benched Pokémon (both players)
    else if (cleanAttackName.includes('lightning rondo') || cleanAttackName.includes('ไลท์นิงรอนโด')) {
      const playerBenched = state.players[playerIndex].bench.filter((b) => b !== null).length;
      const opponentBenched = opponent.bench.filter((b) => b !== null).length;
      damage = 20 + (playerBenched + opponentBenched) * 20;
    }

    // 6. Amp You Very Much (Iron Hands ex): 120 damage. If opponent is Knocked Out, take 1 more Prize card!
    else if (cleanAttackName.includes('amp you very much') || cleanAttackName.includes('แอมป์ยูเวรีมัช')) {
      damage = 120;
      extraPrizesOnKo = 1;
    }

    // 7. Calamity Storm (Roaring Moon ex): 100 + 120 if Stadium in play, discard Stadium
    else if (cleanAttackName.includes('calamity storm') || cleanAttackName.includes('คาลามิตี')) {
      if (state.stadium) {
        damage = 220;
        state.stadium = null;
      } else {
        damage = 100;
      }
    }

    // 8. Frenzied Gouging (Roaring Moon ex): Instant Knock Out opponent's Active, this Pokémon takes 200 self-damage
    else if (cleanAttackName.includes('frenzied gouging') || cleanAttackName.includes('ควักคลั่ง')) {
      if (opponent.active) {
        damage = opponent.active.maxHp * 2;
        attacker.damageCounters += 20;
      }
    }

    // 9. Shinobi Shuriken (Greninja ex): Discard 2 Energy, 120 damage
    else if (cleanAttackName.includes('shinobi shuriken') || cleanAttackName.includes('ชูริเคน')) {
      const discarded = attacker.attachedEnergies.splice(0, 2);
      state.players[playerIndex].discard.push(...discarded);
      damage = 120;
    }

    // 10. Make It Rain (Gholdengo ex): 50x each Basic Energy discarded from hand
    else if (cleanAttackName.includes('make it rain') || cleanAttackName.includes('เมคอิทเรน')) {
      const energiesInHand = state.players[playerIndex].hand.filter((c) => c.supertype === 'Energy');
      const discardCount = Math.min(energiesInHand.length, choices?.discardCardInstanceIds?.length || energiesInHand.length);
      const discarded = energiesInHand.slice(0, discardCount);
      for (const d of discarded) {
        const idx = state.players[playerIndex].hand.findIndex((c) => c.instanceId === d.instanceId);
        if (idx !== -1) {
          const [c] = state.players[playerIndex].hand.splice(idx, 1);
          state.players[playerIndex].discard.push(c);
        }
      }
      damage = Math.max(50, discardCount * 50);
    }

    // 11. Hail Blade (Chien-Pao ex): 60x each Water Energy discarded from this Pokémon
    else if (cleanAttackName.includes('hail blade') || cleanAttackName.includes('เฮลเบลด')) {
      const waterEnergies = attacker.attachedEnergies.filter((e) => e.energyType === 'Water');
      const count = waterEnergies.length;
      for (const we of waterEnergies) {
        const idx = attacker.attachedEnergies.findIndex((e) => e.instanceId === we.instanceId);
        if (idx !== -1) {
          const [discarded] = attacker.attachedEnergies.splice(idx, 1);
          state.players[playerIndex].discard.push(discarded);
        }
      }
      damage = Math.max(60, count * 60);
    }

    // 12. Unified Barrage (Terapagos ex): 30x each of your Benched Pokémon
    else if (cleanAttackName.includes('unified barrage') || cleanAttackName.includes('ยูนิฟายด์แบร์เรจ')) {
      const benchedCount = state.players[playerIndex].bench.filter((b) => b !== null).length;
      damage = benchedCount * 30;
    }

    // 13. Myriad Leaf Shower (Teal Mask Ogerpon ex): 30 + 30 for each Energy attached to both Active Pokémon
    else if (cleanAttackName.includes('myriad leaf shower') || cleanAttackName.includes('ใบไม้โปรยปราย')) {
      const attackerEnergy = attacker.attachedEnergies.length;
      const defenderEnergy = opponent.active?.attachedEnergies.length || 0;
      damage = 30 + (attackerEnergy + defenderEnergy) * 30;
    }

    // 14. Crazy Chain (Okidogi ex): 130 + 130 if attached Darkness Energy
    else if (cleanAttackName.includes('crazy chain') || cleanAttackName.includes('เครซีเชน')) {
      const hasDarkness = attacker.attachedEnergies.some((e) => e.energyType === 'Darkness');
      damage = hasDarkness ? 260 : 130;
    }

    // 15. Moonlight Shuriken (Radiant Greninja): Discard 2 Energy, 90 to 2 opponent's Pokémon
    else if (cleanAttackName.includes('moonlight shuriken') || cleanAttackName.includes('มูนไลท์ชูริเคน')) {
      const discarded = attacker.attachedEnergies.splice(0, 2);
      state.players[playerIndex].discard.push(...discarded);
      damage = 90;
      const oppBench = opponent.bench.filter((b): b is PokemonInPlay => b !== null);
      if (oppBench.length > 0) {
        oppBench[0].damageCounters += 9;
      }
    }

    // 16. Tempest Dive (Lugia VSTAR): 220 damage, discard Stadium
    else if (cleanAttackName.includes('tempest dive') || cleanAttackName.includes('เทมเปสต์ไดฟ์')) {
      damage = 220;
      if (state.stadium) state.stadium = null;
    }

    // 17. Blustery Wind (Pidgeot ex): 150 damage, discard Stadium
    else if (cleanAttackName.includes('blustery wind') || cleanAttackName.includes('บลัสเตอร์รีวินด์')) {
      damage = 150;
      if (state.stadium) state.stadium = null;
    }

    // 18. Blood Moon (Bloodmoon Ursaluna ex): 240 damage
    else if (cleanAttackName.includes('blood moon') || cleanAttackName.includes('บลัดมูน')) {
      damage = 240;
    }

    // 19. Heat Blast (Gouging Fire ex): 260 damage
    else if (cleanAttackName.includes('heat blast') || cleanAttackName.includes('ฮีตบลาสต์')) {
      damage = 260;
    }

    // 20. Syrup Storm (Hydrapple ex): 30 + 30 for each Grass Energy attached to all friendly Pokémon
    else if (cleanAttackName.includes('syrup storm') || cleanAttackName.includes('ไซรัปสตอร์ม')) {
      const player = state.players[playerIndex];
      const allFriendly = [player.active, ...player.bench].filter((p): p is PokemonInPlay => p !== null);
      let grassCount = 0;
      for (const p of allFriendly) {
        grassCount += p.attachedEnergies.filter((e) => e.energyType === 'Grass').length;
      }
      damage = 30 + grassCount * 30;
    }

    // 21. Kaiser Tackle (Koraidon ex): 280 damage + 60 self-recoil
    else if (cleanAttackName.includes('kaiser tackle') || cleanAttackName.includes('ไคเซอร์แท็กเกิล')) {
      damage = 280;
      attacker.damageCounters += 6;
    }

    // 22. Twin Shotel (Iron Crown ex): 50 damage to 2 opponent's Pokémon (ignoring Weakness & Resistance)
    else if (cleanAttackName.includes('twin shotel') || cleanAttackName.includes('ทวินโชเทล')) {
      damage = 50;
      const oppBench = opponent.bench.filter((b): b is PokemonInPlay => b !== null);
      if (oppBench.length > 0) {
        oppBench[0].damageCounters += 5;
      }
    }

    // 23. Mirage Barrage (Greninja ex): Discard 2 Energy, 120 damage to 2 opponent's Pokémon
    else if (cleanAttackName.includes('mirage barrage') || cleanAttackName.includes('มิราจแบร์เรจ')) {
      const discarded = attacker.attachedEnergies.splice(0, 2);
      state.players[playerIndex].discard.push(...discarded);
      damage = 120;
      const oppBench = opponent.bench.filter((b): b is PokemonInPlay => b !== null);
      if (oppBench.length > 0) {
        oppBench[0].damageCounters += 12;
      }
    }

    // 24. Bolt Strike (N's Zekrom): 130 damage, 30 self-recoil
    else if (cleanAttackName.includes('bolt strike') || cleanAttackName.includes('โบลต์สไตรก์')) {
      damage = 130;
      attacker.damageCounters += 3;
    }

    // 25. Magnum Punch (Mega Kangaskhan ex): 240 damage, 30 self-recoil
    else if (cleanAttackName.includes('magnum punch') || cleanAttackName.includes('แม็กนั่มพันช์')) {
      damage = 240;
      attacker.damageCounters += 3;
    }

    // 26. Irritating Burst (Pecharunt ex): 60x each Prize card opponent has taken
    else if (cleanAttackName.includes('irritating burst') || cleanAttackName.includes('ระเบิดก่อกวน')) {
      const oppPrizesTaken = Math.max(0, 6 - opponent.prizes.length);
      damage = Math.max(60, oppPrizesTaken * 60);
    }

    // Apply temporary turn bonuses (Supporters/Stadiums)
    const activePlayer = state.players[playerIndex];
    if (activePlayer.turnFlags.fightingAttackBonus && attacker.card.energyType === 'Fighting') {
      damage += activePlayer.turnFlags.fightingAttackBonus;
    }
    if (
      activePlayer.turnFlags.exAttackBonus &&
      (opponent.active?.card.subtypes?.includes('ex') || opponent.active?.card.subtypes?.includes('V'))
    ) {
      damage += activePlayer.turnFlags.exAttackBonus;
    }
    if (activePlayer.turnFlags.nonRuleBoxAttackBonus && !hasRuleBox(attacker.card)) {
      damage += activePlayer.turnFlags.nonRuleBoxAttackBonus;
    }
    if (activePlayer.turnFlags.extraPrizeOnKo) {
      extraPrizesOnKo += 1;
    }

    // Attached Tool damage bonuses
    if (attacker.attachedTool) {
      const toolName = (attacker.attachedTool.nameEn || attacker.attachedTool.nameTh || '').toLowerCase();
      if (toolName.includes('binding mochi') && attacker.specialConditions.includes('POISON')) {
        damage += 40;
      } else if (
        toolName.includes('maximum belt') &&
        (opponent.active?.card.subtypes?.includes('ex') || opponent.active?.card.subtypes?.includes('V'))
      ) {
        damage += 50;
      } else if (toolName.includes('defiance band') && activePlayer.prizes.length > opponent.prizes.length) {
        damage += 30;
      } else if (toolName.includes('vitality band')) {
        damage += 10;
      }
    }

    return { damage, extraPrizesOnKo };
  }
}

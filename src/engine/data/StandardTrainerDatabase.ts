/**
 * StandardTrainerDatabase.ts
 * Centralized, authoritative registry of all 79 unique Trainer cards in Pokémon TCG Standard format.
 * Encapsulates exact official card text (EN & TH), condition validation (Prize scaling, KO flags, hand requirements),
 * picker modal schemas, and execution logic.
 */

import type { GameState, CardInstance, PokemonInPlay, EffectChoices, EffectExecutionResult } from '../types';
import { EffectPrimitives } from '../effects/EffectDSL';
import { EvolutionResolver } from './EvolutionResolver';
import { getCardDisplayName } from '../../utils/pokemonThaiTranslator';

export type TrainerChoiceType =
  | 'none'
  | 'deck-non-rulebox-pokemon'              // Poké Pad (Search 1 non-Rule Box Pokémon)
  | 'discard-supporters'                   // Pal Pad (Shuffle up to 2 Supporters into deck)
  | 'deck-pokemon-any'                     // Ultra Ball
  | 'deck-basic-low-hp'                    // Buddy-Buddy Poffin (up to 2 Basic <= 70 HP)
  | 'deck-basic-pokemon'                   // Nest Ball, Artazon
  | 'discard-pokemon-or-energy-to-hand'    // Night Stretcher (1 card)
  | 'discard-non-rulebox-or-energy-to-hand'// Lana's Aid (up to 3 cards)
  | 'discard-to-deck'                      // Super Rod (3), Max Rod (5), Sacred Ash (5 Pokemon), Energy Recycler (5 Energy)
  | 'deck-top7-grass'                      // Bug Catching Set
  | 'deck-top7-fighting'                   // Fighting Gong
  | 'deck-top7-supporter'                  // Pokégear 3.0
  | 'deck-top7-pokemon'                    // Dusk Ball
  | 'deck-basic-energy'                    // Energy Search (1), Earthen Vessel (up to 2)
  | 'deck-two-energies-diff-types'         // Crispin
  | 'deck-evolution-and-energy'            // Hilda
  | 'deck-three-stages'                    // Dawn (Basic, Stage 1, Stage 2)
  | 'deck-trainer'                         // Team Rocket's Petrel
  | 'deck-item-and-tool'                   // Arven (1 Item, 1 Tool)
  | 'deck-pokemon-ex'                      // Cyrano (up to 3 ex), Mega Signal (1 Mega/ex)
  | 'deck-stadium-and-energy'              // Colress's Tenacity
  | 'deck-secret-box'                      // Secret Box (1 Item, 1 Supporter, 1 Tool, 1 Stadium)
  | 'move-attached-energy'                 // Energy Switch
  | 'switch-active-bench'                  // Switch, Kieran choice 1, Surfer
  | 'switch-opponent-bench'                // Boss's Orders, Counter Catcher
  | 'switch-both'                          // Prime Catcher
  | 'attach-from-discard'                  // Glass Trumpet, Wondrous Patch, Dark Patch, N's PP Up, Janine's Secret Art
  | 'hand-discard-draw'                    // Morty's Conviction, Gwynn, Carmine, Professor's Research, Lillie's Determination
  | 'heal-target'                          // Pokémon Center Lady, Wally's Compassion
  | 'evolve-basic-to-stage2'               // Rare Candy
  | 'transformation-tome'                  // Transformation Tome
  | 'kieran-choice'                        // Kieran (Switch vs +30 DMG)
  | 'attach-tool'                          // Tool attachment to Pokémon
  | 'play-stadium'                         // Stadium placement
  | 'return-to-hand';                      // AZ's Tranquility, Penny, Professor Turo's Scenario

export interface CanonicalTrainerCard {
  nameEn: string;
  nameTh: string;
  subtype: 'Item' | 'Supporter' | 'Stadium' | 'Pokémon Tool';
  isAceSpec?: boolean;
  textEn: string;
  textTh: string;
  choiceType: TrainerChoiceType;
  requiresPicker: boolean;
  canPlay: (state: GameState, playerIndex: 0 | 1, card: CardInstance) => { valid: boolean; error?: string };
  execute: (state: GameState, playerIndex: 0 | 1, card: CardInstance, choices?: EffectChoices) => EffectExecutionResult;
}

/**
 * Helper to check if a Pokémon has a Rule Box (ex, V, VMAX, VSTAR, Radiant, etc.)
 */
export function hasRuleBox(card: CardInstance): boolean {
  if (!card) return false;
  const subtypes = card.subtypes || [];
  const nameEn = (card.nameEn || '').toLowerCase();
  if (subtypes.includes('ex') || nameEn.includes(' ex') || nameEn.endsWith('ex')) return true;
  if (subtypes.includes('V') || nameEn.includes(' v') || nameEn.endsWith(' v')) return true;
  if (subtypes.includes('VMAX') || nameEn.includes('vmax')) return true;
  if (subtypes.includes('VSTAR') || nameEn.includes('vstar')) return true;
  if (subtypes.includes('Radiant') || nameEn.includes('radiant')) return true;
  if (subtypes.includes('MEGA') || nameEn.includes('mega ')) return true;
  return false;
}

/**
 * MASTER REGISTRY OF ALL CANONICAL STANDARD TRAINER CARDS
 */
export const TRAINER_REGISTRY: Record<string, CanonicalTrainerCard> = {
  // =========================================================================
  // 1. ITEMS
  // =========================================================================

  'nest ball': {
    nameEn: 'Nest Ball',
    nameTh: 'เนสท์บอล',
    subtype: 'Item',
    textEn: 'Search your deck for a Basic Pokémon and put it onto your Bench. Then, shuffle your deck.',
    textTh: 'เลือกการ์ดโปเกมอน [ร่างแรก] 1 ใบจากสำรับการ์ด วางบนเบนช์ แล้วสับสำรับการ์ด',
    choiceType: 'deck-basic-pokemon',
    requiresPicker: true,
    canPlay: (state, playerIndex) => {
      const p = state.players[playerIndex];
      const hasEmptyBench = p.bench.some((b) => b === null);
      if (!hasEmptyBench) return { valid: false, error: 'ไม่มีพื้นที่ว่างบน Bench' };
      if (p.deck.length === 0) return { valid: false, error: 'ไม่มีการ์ดในสำรับ' };
      return { valid: true };
    },
    execute: (state, playerIndex, _card, choices) => {
      const p = state.players[playerIndex];
      const selectedId = choices?.selectedCardInstanceIds?.[0];
      const emptyIdx = p.bench.findIndex((b) => b === null);
      if (emptyIdx !== -1) {
        const deckIdx = selectedId
          ? p.deck.findIndex((c) => c.instanceId === selectedId && c.supertype === 'Pokemon' && c.subtypes.includes('Basic'))
          : p.deck.findIndex((c) => c.supertype === 'Pokemon' && c.subtypes.includes('Basic'));
        if (deckIdx !== -1) {
          const [basic] = p.deck.splice(deckIdx, 1);
          p.bench[emptyIdx] = {
            instanceId: `pokemon-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            card: basic,
            stage: 'Basic',
            maxHp: basic.hp || 70,
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
      return { success: true, message: 'ใช้ Nest Ball วางโปเกมอน Basic บนเบนช์สำเร็จ' };
    },
  },

  'hisuian heavy ball': {
    nameEn: 'Hisuian Heavy Ball',
    nameTh: 'ฮิซุยเฮวี่บอล',
    subtype: 'Item',
    textEn: 'Look at your face-down Prize cards. You may reveal a Basic Pokémon you find there, put it into your hand, and put this Hisuian Heavy Ball in its place as a face-down Prize card. Then, shuffle your face-down Prize cards.',
    textTh: 'ดูการ์ดรางวัลที่คว่ำอยู่ของฝ่ายเราทั้งหมด เลือกการ์ดโปเกมอน [ร่างแรก] 1 ใบ นำขึ้นมือ แล้วนำการ์ดฮิซุยเฮวี่บอลนี้ไปวางแทนที่ สับการ์ดรางวัลที่คว่ำอยู่ทั้งหมด',
    choiceType: 'none',
    requiresPicker: false,
    canPlay: (state, playerIndex) => {
      const p = state.players[playerIndex];
      if (p.prizes.length === 0) return { valid: false, error: 'ไม่มีการ์ดรางวัลเหลืออยู่' };
      return { valid: true };
    },
    execute: (state, playerIndex, card) => {
      const p = state.players[playerIndex];
      const prizeIdx = p.prizes.findIndex((c) => c.supertype === 'Pokemon' && c.subtypes?.includes('Basic'));
      if (prizeIdx !== -1) {
        const [found] = p.prizes.splice(prizeIdx, 1, card);
        p.hand.push(found);
        return { success: true, message: `ใช้ Hisuian Heavy Ball แลก ${getCardDisplayName(found)} จาก Prize ขึ้นมือสำเร็จ` };
      }
      return { success: true, message: 'ใช้ Hisuian Heavy Ball ตรวจดู Prize ไม่พบ Basic Pokémon' };
    },
  },

  'dark patch': {
    nameEn: 'Dark Patch',
    nameTh: 'ดาร์กแพตช์',
    subtype: 'Item',
    textEn: 'Attach a Basic Darkness Energy card from your discard pile to 1 of your Benched Darkness Pokémon.',
    textTh: 'เลือกการ์ดพลังงานพื้นฐาน [ความมืด] 1 ใบจากตำแหน่งทิ้งการ์ด ติดให้กับโปเกมอน [ความมืด] บนเบนช์ฝ่ายเรา 1 ตัว',
    choiceType: 'attach-from-discard',
    requiresPicker: true,
    canPlay: (state, playerIndex) => {
      const p = state.players[playerIndex];
      const hasDarkEnergy = p.discard.some((c) => c.supertype === 'Energy' && c.energyType === 'Darkness');
      if (!hasDarkEnergy) return { valid: false, error: 'ไม่มีพลังงานมืดใน Discard Pile' };
      const hasDarkBench = p.bench.some((b) => b && b.card.energyType === 'Darkness');
      if (!hasDarkBench) return { valid: false, error: 'ไม่มีโปเกมอนความมืดบน Bench' };
      return { valid: true };
    },
    execute: (state, playerIndex, _card, choices) => {
      const p = state.players[playerIndex];
      const targetId = choices?.targetPokemonInstanceId;
      const target = targetId
        ? p.bench.find((b) => b && b.instanceId === targetId && b.card.energyType === 'Darkness')
        : p.bench.find((b) => b && b.card.energyType === 'Darkness');
      const eIdx = p.discard.findIndex((c) => c.supertype === 'Energy' && c.energyType === 'Darkness');
      if (target && eIdx !== -1) {
        const [energy] = p.discard.splice(eIdx, 1);
        target.attachedEnergies.push(energy);
        return { success: true, message: `ใช้ Dark Patch ติดพลังงานมืดให้ ${getCardDisplayName(target.card)} สำเร็จ` };
      }
      return { success: false, error: 'ไม่พบเป้าหมายหรือพลังงานมืด' };
    },
  },

  'lost vacuum': {
    nameEn: 'Lost Vacuum',
    nameTh: 'เครื่องดูดสุญญากาศ',
    subtype: 'Item',
    textEn: 'You must put another card from your hand in the Lost Zone in order to play this card. Choose a Pokémon Tool or Stadium card in play and put it in the Lost Zone.',
    textTh: 'ต้องนำการ์ดบนมือฝ่ายเรา 1 ใบไปไว้ที่ลอสท์โซนจึงจะใช้ได้ เลือกการ์ดเครื่องมือโปเกมอนหรือสเตเดียมที่วางอยู่บนสนาม 1 ใบ นำไปไว้ที่ลอสท์โซน',
    choiceType: 'none',
    requiresPicker: false,
    canPlay: (state, playerIndex, card) => {
      const p = state.players[playerIndex];
      const otherHand = p.hand.filter((c) => c.instanceId !== card.instanceId);
      if (otherHand.length < 1) return { valid: false, error: 'ต้องมีการ์ดบนมืออีกอย่างน้อย 1 ใบเพื่อส่งไป Lost Zone เป็นค่าร่าย' };
      const hasStadium = state.stadium !== null;
      const hasTools = [...state.players[0].bench, state.players[0].active, ...state.players[1].bench, state.players[1].active].some(
        (b) => b && b.attachedTool !== null
      );
      if (!hasStadium && !hasTools) return { valid: false, error: 'ไม่มี Stadium หรือ Pokémon Tool บนสนามให้ส่งไป Lost Zone' };
      return { valid: true };
    },
    execute: (state, playerIndex) => {
      const p = state.players[playerIndex];
      if (p.hand.length > 0) {
        const [cost] = p.hand.splice(0, 1);
        p.lostZone.push(cost);
      }
      if (state.stadium) {
        const old = state.stadium;
        state.stadium = null;
        p.lostZone.push(old);
        return { success: true, message: `ใช้ Lost Vacuum ส่ง Stadium ${getCardDisplayName(old)} ไปยัง Lost Zone` };
      }
      return { success: true, message: 'ใช้ Lost Vacuum สำเร็จ' };
    },
  },

  'canceling cologne': {
    nameEn: 'Canceling Cologne',
    nameTh: 'โคโลญจน์ลบล้าง',
    subtype: 'Item',
    textEn: "Until the end of your turn, your opponent's Active Pokémon has no Abilities. (This includes Pokémon that come into the Active Spot during that turn.)",
    textTh: 'จนกว่าจะจบเทิร์นฝ่ายเรา ความสามารถของโปเกมอนบนตำแหน่งต่อสู้ฝ่ายตรงข้ามจะหายไปทั้งหมด',
    choiceType: 'none',
    requiresPicker: false,
    canPlay: () => ({ valid: true }),
    execute: (state, playerIndex) => {
      const p = state.players[playerIndex];
      p.turnFlags.cancelingCologneActive = true;
      return { success: true, message: 'ใช้ Canceling Cologne ลบล้างความสามารถของโปเกมอนตัวหน้าของคู่แข่งจนจบเทิร์น' };
    },
  },

  'electric generator': {
    nameEn: 'Electric Generator',
    nameTh: 'เครื่องกำเนิดไฟฟ้า',
    subtype: 'Item',
    textEn: 'Look at the top 5 cards of your deck and attach up to 2 Basic Lightning Energy cards you find there to your Benched Lightning Pokémon in any way you like. Shuffle the other cards back into your deck.',
    textTh: 'ดูการ์ด 5 ใบจากด้านบนของสำรับ นำการ์ดพลังงานสายฟ้าพื้นฐานได้สูงสุด 2 ใบไปติดกับโปเกมอนสายฟ้าบนเบนช์ จากนั้นสับการ์ดที่เหลือกลับเข้าสำรับ',
    choiceType: 'none',
    requiresPicker: false,
    canPlay: (state, playerIndex) => {
      const p = state.players[playerIndex];
      const hasBenchedLightning = p.bench.some((b) => b && b.card.energyType === 'Lightning');
      if (!hasBenchedLightning) return { valid: false, error: 'ไม่มีโปเกมอนสายฟ้าบนเบนช์' };
      if (p.deck.length === 0) return { valid: false, error: 'ไม่มีการ์ดในสำรับ' };
      return { valid: true };
    },
    execute: (state, playerIndex) => {
      const p = state.players[playerIndex];
      const benchedLightning = p.bench.filter((b): b is PokemonInPlay => b !== null && b.card.energyType === 'Lightning');
      if (benchedLightning.length === 0 || p.deck.length === 0) {
        return { success: false, error: 'ไม่ตรงเงื่อนไขการใช้ Electric Generator' };
      }
      const top5 = p.deck.splice(0, Math.min(5, p.deck.length));
      let attachedCount = 0;
      const remaining: CardInstance[] = [];
      for (const card of top5) {
        if (card.supertype === 'Energy' && card.energyType === 'Lightning' && attachedCount < 2) {
          benchedLightning[0].attachedEnergies.push(card);
          attachedCount++;
        } else {
          remaining.push(card);
        }
      }
      p.deck.push(...remaining);
      EffectPrimitives.shuffleDeck(state, playerIndex);
      return { success: true, message: `ใช้ Electric Generator ติดพลังงานสายฟ้า ${attachedCount} ใบ` };
    },
  },

  'poké pad': {
    nameEn: 'Poké Pad',
    nameTh: 'โปเกมอนแท็บเล็ต',
    subtype: 'Item',
    textEn: "Search your deck for a Pokémon that doesn't have a Rule Box, reveal it, and put it into your hand. Then, shuffle your deck. (Pokémon ex, Pokémon V, etc. have Rule Boxes.)",
    textTh: 'เลือกการ์ดโปเกมอนที่ไม่มี [กฎพิเศษ] 1 ใบจากสำรับการ์ดฝ่ายเรา ให้ฝ่ายตรงข้ามดู นำขึ้นมือ แล้วสับสำรับการ์ด',
    choiceType: 'deck-non-rulebox-pokemon',
    requiresPicker: true,
    canPlay: (state, playerIndex) => {
      const p = state.players[playerIndex];
      if (p.deck.length === 0) return { valid: false, error: 'ไม่มีการ์ดเหลือในสำรับ' };
      return { valid: true };
    },
    execute: (state, playerIndex, _card, choices) => {
      const p = state.players[playerIndex];
      const selectedId = choices?.selectedCardInstanceIds?.[0];
      if (selectedId) {
        const idx = p.deck.findIndex((c) => c.instanceId === selectedId && !hasRuleBox(c));
        if (idx !== -1) {
          const [found] = p.deck.splice(idx, 1);
          p.hand.push(found);
        }
      } else {
        const idx = p.deck.findIndex((c) => c.supertype === 'Pokemon' && !hasRuleBox(c));
        if (idx !== -1) {
          const [found] = p.deck.splice(idx, 1);
          p.hand.push(found);
        }
      }
      EffectPrimitives.shuffleDeck(state, playerIndex);
      return { success: true, message: 'ใช้ Poké Pad (โปเกมอนแท็บเล็ต) ค้นหาโปเกมอนที่ไม่มี Rule Box ขึ้นมือสำเร็จ' };
    },
  },

  'pal pad': {
    nameEn: 'Pal Pad',
    nameTh: 'สมุดเพื่อน',
    subtype: 'Item',
    textEn: 'Shuffle up to 2 Supporter cards from your discard pile into your deck.',
    textTh: 'เลือกการ์ดซัพพอร์ตได้สูงสุด 2 ใบจากตำแหน่งทิ้งการ์ดฝ่ายเรา สับกลับเข้าสำรับการ์ด',
    choiceType: 'discard-supporters',
    requiresPicker: true,
    canPlay: (state, playerIndex) => {
      const p = state.players[playerIndex];
      const hasSupporters = p.discard.some((c) => c.supertype === 'Trainer' && c.subtypes.includes('Supporter'));
      if (!hasSupporters) return { valid: false, error: 'ไม่มีการ์ด Supporter ใน Discard Pile' };
      return { valid: true };
    },
    execute: (state, playerIndex, _card, choices) => {
      const selectedIds = choices?.selectedCardInstanceIds || [];
      if (selectedIds.length > 0) {
        EffectPrimitives.recoverFromDiscardToDeck(state, playerIndex, selectedIds.slice(0, 2));
      } else {
        const p = state.players[playerIndex];
        const supporters = p.discard.filter((c) => c.supertype === 'Trainer' && c.subtypes.includes('Supporter')).slice(0, 2);
        EffectPrimitives.recoverFromDiscardToDeck(state, playerIndex, supporters.map((c) => c.instanceId));
      }
      EffectPrimitives.shuffleDeck(state, playerIndex);
      return { success: true, message: 'ใช้ Pal Pad สับการ์ด Supporter กลับเข้าสำรับสำเร็จ' };
    },
  },

  'buddy-buddy poffin': {
    nameEn: 'Buddy-Buddy Poffin',
    nameTh: 'โปฟฟินมิตรภาพ',
    subtype: 'Item',
    textEn: 'Search your deck for up to 2 Basic Pokémon with 70 HP or less and put them onto your Bench. Then, shuffle your deck.',
    textTh: 'เลือกการ์ดโปเกมอน [ร่างแรก] ที่มี HP ไม่เกิน 70 ได้สูงสุด 2 ใบจากสำรับการ์ด วางบนเบนช์ แล้วสับสำรับการ์ด',
    choiceType: 'deck-basic-low-hp',
    requiresPicker: true,
    canPlay: (state, playerIndex) => {
      const p = state.players[playerIndex];
      const emptyBench = p.bench.some((b) => b === null);
      if (!emptyBench) return { valid: false, error: 'ไม่มีพื้นที่ว่างบน Bench' };
      if (p.deck.length === 0) return { valid: false, error: 'ไม่มีการ์ดในสำรับ' };
      return { valid: true };
    },
    execute: (state, playerIndex, _card, choices) => {
      const p = state.players[playerIndex];
      const selectedIds = choices?.selectedCardInstanceIds || [];
      for (const id of selectedIds.slice(0, 2)) {
        const emptyIdx = p.bench.findIndex((b) => b === null);
        if (emptyIdx === -1) break;
        const deckIdx = p.deck.findIndex((c) => c.instanceId === id && c.supertype === 'Pokemon' && c.subtypes.includes('Basic') && (c.hp || 0) <= 70);
        if (deckIdx !== -1) {
          const [basic] = p.deck.splice(deckIdx, 1);
          p.bench[emptyIdx] = {
            instanceId: `pokemon-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            card: basic,
            stage: 'Basic',
            maxHp: basic.hp || 70,
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
    },
  },

  'ultra ball': {
    nameEn: 'Ultra Ball',
    nameTh: 'ไฮเปอร์บอล',
    subtype: 'Item',
    textEn: 'You must discard 2 other cards from your hand in order to play this card. Search your deck for a Pokémon, reveal it, and put it into your hand. Then, shuffle your deck.',
    textTh: 'การ์ดนี้ต้องทิ้งการ์ดบนมือเรา 2 ใบจึงจะใช้ได้ เลือกการ์ดโปเกมอน 1 ใบจากสำรับการ์ด นำขึ้นมือ แล้วสับสำรับการ์ด',
    choiceType: 'deck-pokemon-any',
    requiresPicker: true,
    canPlay: (state, playerIndex, card) => {
      const p = state.players[playerIndex];
      const otherHand = p.hand.filter((c) => c.instanceId !== card.instanceId);
      if (otherHand.length < 2) return { valid: false, error: 'ต้องมีการ์ดบนมืออีกอย่างน้อย 2 ใบสำหรับทิ้งเป็นค่าร่าย Ultra Ball' };
      return { valid: true };
    },
    execute: (state, playerIndex, _card, choices) => {
      const p = state.players[playerIndex];
      if (choices?.discardCardInstanceIds && choices.discardCardInstanceIds.length >= 2) {
        EffectPrimitives.discardFromHand(state, playerIndex, choices.discardCardInstanceIds.slice(0, 2));
      }
      const chosenId = choices?.selectedCardInstanceIds?.[0];
      if (chosenId) {
        const idx = p.deck.findIndex((c) => c.instanceId === chosenId && c.supertype === 'Pokemon');
        if (idx !== -1) {
          const [found] = p.deck.splice(idx, 1);
          p.hand.push(found);
        }
      }
      EffectPrimitives.shuffleDeck(state, playerIndex);
      return { success: true, message: 'ใช้ Ultra Ball ค้นหาโปเกมอนขึ้นมือสำเร็จ' };
    },
  },

  'rare candy': {
    nameEn: 'Rare Candy',
    nameTh: 'ลูกอมประหลาด',
    subtype: 'Item',
    textEn: 'Choose 1 of your Basic Pokémon in play. If you have a Stage 2 card in your hand that evolves from that Pokémon, put that card onto the Basic Pokémon to evolve it, skipping the Stage 1. You cannot use this card during your first turn or on a Basic Pokémon that was put into play this turn.',
    textTh: 'เลือกโปเกมอน [ร่างแรก] บนสนามฝ่ายเรา 1 ตัว หากมีการ์ดร่าง 2 ที่วิวัฒนาการจากโปเกมอนนั้นบนมือ ให้นำมาวางทับเพื่อพัฒนาร่างข้ามขั้น ห้ามใช้ในเทิร์นแรกของผู้เล่น และห้ามใช้กับโปเกมอนที่เพิ่งลงสนามในเทิร์นนี้',
    choiceType: 'evolve-basic-to-stage2',
    requiresPicker: true,
    canPlay: (state, playerIndex) => {
      const isFirstTurnForPlayer =
        state.turnNumber === 1 || (state.turnNumber === 2 && playerIndex !== state.firstPlayerIndex);
      if (isFirstTurnForPlayer) return { valid: false, error: 'ห้ามใช้ Rare Candy ในเทิร์นแรกของผู้เล่น' };

      const p = state.players[playerIndex];
      const eligibleBasics = [p.active, ...p.bench].filter(
        (poke): poke is PokemonInPlay => poke !== null && poke.stage === 'Basic' && poke.turnEnteredPlay < state.turnNumber
      );
      if (eligibleBasics.length === 0) return { valid: false, error: 'ไม่มีโปเกมอน Basic บนสนามที่พร้อมพัฒนาร่าง' };

      const stage2Cards = p.hand.filter((c) => c.supertype === 'Pokemon' && (c.subtypes.includes('Stage 2') || c.subtypes.includes('Stage2')));
      if (stage2Cards.length === 0) return { valid: false, error: 'ไม่มีการ์ด Stage 2 บนมือ' };

      const hasMatch = eligibleBasics.some((b) => stage2Cards.some((s2) => EvolutionResolver.isEvolutionMatch(s2, b.card, true)));
      if (!hasMatch) return { valid: false, error: 'ไม่มีการ์ด Stage 2 บนมือที่ตรงกับสายวิวัฒนาการของ Basic บนสนาม' };

      return { valid: true };
    },
    execute: (state, playerIndex, _card, choices) => {
      const p = state.players[playerIndex];
      const targetId = choices?.targetPokemonInstanceId;
      const s2CardId = choices?.selectedCardInstanceIds?.[0];
      if (!targetId || !s2CardId) return { success: false, error: 'ต้องระบุเป้าหมายและร่าง Stage 2' };

      const target = [p.active, ...p.bench].find((poke) => poke && poke.instanceId === targetId);
      const s2Idx = p.hand.findIndex((c) => c.instanceId === s2CardId);
      if (!target || s2Idx === -1) return { success: false, error: 'ไม่พบเป้าหมายหรือการ์ด Stage 2' };

      const [s2Card] = p.hand.splice(s2Idx, 1);
      target.evolutionHistory.push(target.card);
      target.card = s2Card;
      target.stage = 'Stage2';
      target.maxHp = s2Card.hp || target.maxHp;
      target.turnEvolved = state.turnNumber;
      target.specialConditions = [];

      if (s2Card.abilities?.some((a) => a.name.toLowerCase().includes('infernal reign')) && choices.energyAttachments) {
        for (const att of choices.energyAttachments.slice(0, 3)) {
          const deckIdx = p.deck.findIndex((c) => c.instanceId === att.energyInstanceId && c.supertype === 'Energy');
          const dest = [p.active, ...p.bench].find((b) => b?.instanceId === att.targetPokemonInstanceId);
          if (deckIdx !== -1 && dest) {
            const [energy] = p.deck.splice(deckIdx, 1);
            dest.attachedEnergies.push(energy);
          }
        }
        EffectPrimitives.shuffleDeck(state, playerIndex);
      }

      return { success: true, message: `ใช้ Rare Candy พัฒนาร่างสู่ ${getCardDisplayName(s2Card)} สำเร็จ` };
    },
  },

  'energy switch': {
    nameEn: 'Energy Switch',
    nameTh: 'สลับการ์ดพลังงาน',
    subtype: 'Item',
    textEn: 'Move a Basic Energy from 1 of your Pokémon to another of your Pokémon.',
    textTh: 'ย้ายการ์ดพลังงานพื้นฐาน 1 ใบที่ติดอยู่กับโปเกมอนฝ่ายเรา ไปติดกับโปเกมอนอีกตัวของฝ่ายเรา',
    choiceType: 'move-attached-energy',
    requiresPicker: true,
    canPlay: (state, playerIndex) => {
      const p = state.players[playerIndex];
      const allPokemon = [p.active, ...p.bench].filter((b): b is PokemonInPlay => b !== null);
      if (allPokemon.length < 2) return { valid: false, error: 'ต้องมีโปเกมอนบนสนามอย่างน้อย 2 ตัว' };
      const hasBasicEnergy = allPokemon.some((b) => b.attachedEnergies.some((e) => e.supertype === 'Energy' && !e.subtypes.includes('Special')));
      if (!hasBasicEnergy) return { valid: false, error: 'ไม่มีการ์ดพลังงานพื้นฐานติดอยู่กับโปเกมอนตัวใดเลย' };
      return { valid: true };
    },
    execute: (state, playerIndex, _card, choices) => {
      const energyId = choices?.selectedCardInstanceIds?.[0];
      const targetId = choices?.targetPokemonInstanceId;
      if (!energyId || !targetId) return { success: false, error: 'ต้องเลือกพลังงานและโปเกมอนปลายทาง' };

      const moved = EffectPrimitives.moveAttachedEnergy(state, playerIndex, energyId, targetId);
      if (!moved) return { success: false, error: 'ไม่สามารถย้ายพลังงานได้' };
      return { success: true, message: 'ใช้ Energy Switch ย้ายพลังงานสำเร็จ' };
    },
  },

  'special red card': {
    nameEn: 'Special Red Card',
    nameTh: 'ใบแดงพิเศษ',
    subtype: 'Item',
    textEn: 'You may use this card only if your opponent has 3 or fewer Prize cards remaining. Your opponent shuffles their hand and puts it on the bottom of their deck. If they put any cards on the bottom of their deck in this way, they draw 3 cards.',
    textTh: 'การ์ดนี้จะใช้ได้เฉพาะเมื่อการ์ดรางวัลที่เหลือของฝ่ายตรงข้ามมีไม่เกิน 3 ใบ ให้ฝ่ายตรงข้ามสับการ์ดบนมือแล้วนำไปวางไว้ใต้สำรับการ์ด จากนั้นฝ่ายตรงข้ามจั่วการ์ด 3 ใบ',
    choiceType: 'none',
    requiresPicker: false,
    canPlay: (state, playerIndex) => {
      const oppIdx = playerIndex === 0 ? 1 : 0;
      const opp = state.players[oppIdx];
      if (opp.prizes.length > 3) {
        return { valid: false, error: `ฝ่ายตรงข้ามเหลือ Prize ${opp.prizes.length} ใบ (ต้องเหลือ 3 ใบหรือน้อยกว่าจึงจะใช้ Special Red Card ได้)` };
      }
      if (opp.hand.length === 0) {
        return { valid: false, error: 'ฝ่ายตรงข้ามไม่มีการ์ดบนมือ' };
      }
      return { valid: true };
    },
    execute: (state, playerIndex) => {
      const oppIdx = playerIndex === 0 ? 1 : 0;
      const opp = state.players[oppIdx];
      const count = opp.hand.length;
      if (count > 0) {
        const cards = opp.hand.splice(0, count);
        opp.deck.push(...cards);
        EffectPrimitives.drawCards(state, oppIdx, 3);
        return { success: true, message: `ใช้ Special Red Card สับการ์ดบนมือฝ่ายตรงข้ามลงใต้สำรับ และให้จั่วใหม่ 3 ใบ` };
      }
      return { success: true, message: 'ใช้ Special Red Card' };
    },
  },

  'unfair stamp': {
    nameEn: 'Unfair Stamp',
    nameTh: 'อันแฟร์สแตมป์',
    subtype: 'Item',
    isAceSpec: true,
    textEn: 'You can play this card only if 1 of your Pokémon was Knocked Out during your opponent’s last turn. Each player shuffles their hand into their deck. Then, you draw 5 cards, and your opponent draws 2 cards.',
    textTh: 'การ์ดนี้จะใช้ได้เฉพาะเมื่อโปเกมอนฝ่ายเราถูกทำให้หมดสภาพในเทิร์นก่อนของฝ่ายตรงข้าม ให้ผู้เล่นทั้งสองฝ่ายสับการ์ดบนมือกลับเข้าสำรับ จากนั้นฝ่ายเราจั่ว 5 ใบ และฝ่ายตรงข้ามจั่ว 2 ใบ',
    choiceType: 'none',
    requiresPicker: false,
    canPlay: (state, playerIndex) => {
      const p = state.players[playerIndex];
      if (!p.turnFlags.pokemonKnockedOutLastTurn) {
        return { valid: false, error: 'ใช้ Unfair Stamp ได้เฉพาะเมื่อโปเกมอนฝ่ายเราถูก KO ในเทิร์นที่แล้วของฝ่ายตรงข้าม' };
      }
      return { valid: true };
    },
    execute: (state, playerIndex) => {
      const oppIdx = playerIndex === 0 ? 1 : 0;
      EffectPrimitives.shuffleHandToBottom(state, playerIndex);
      EffectPrimitives.shuffleDeck(state, playerIndex);
      EffectPrimitives.drawCards(state, playerIndex, 5);

      EffectPrimitives.shuffleHandToBottom(state, oppIdx);
      EffectPrimitives.shuffleDeck(state, oppIdx);
      EffectPrimitives.drawCards(state, oppIdx, 2);
      return { success: true, message: 'ใช้ Unfair Stamp! คุณจั่ว 5 ใบ ฝ่ายตรงข้ามจั่ว 2 ใบ' };
    },
  },

  'jumbo ice cream': {
    nameEn: 'Jumbo Ice Cream',
    nameTh: 'ไอศกรีมจัมโบ้',
    subtype: 'Item',
    textEn: 'Heal 80 damage from your Active Pokémon that has 3 or more Energy attached.',
    textTh: 'ฟื้นฟู HP 80 ให้กับโปเกมอนบนตำแหน่งต่อสู้ฝ่ายเราที่มีการ์ดพลังงานติดอยู่ตั้งแต่ 3 ใบขึ้นไป',
    choiceType: 'none',
    requiresPicker: false,
    canPlay: (state, playerIndex) => {
      const p = state.players[playerIndex];
      if (!p.active) return { valid: false, error: 'ไม่มีโปเกมอนบนตำแหน่ง Active Spot' };
      if (p.active.attachedEnergies.length < 3) {
        return { valid: false, error: `โปเกมอนตัวหน้ามีพลังงานติดอยู่ ${p.active.attachedEnergies.length} ใบ (ต้องมี 3 ใบขึ้นไปสำหรับไอศกรีมจัมโบ้)` };
      }
      if (p.active.damageCounters === 0) {
        return { valid: false, error: 'โปเกมอนตัวหน้าไม่มีแดเมจที่ต้องฟื้นฟู' };
      }
      return { valid: true };
    },
    execute: (state, playerIndex) => {
      const p = state.players[playerIndex];
      if (p.active) {
        EffectPrimitives.healDamage(p.active, 80);
      }
      return { success: true, message: 'ใช้ Jumbo Ice Cream ฟื้นฟู HP 80 ให้โปเกมอนตัวหน้าสำเร็จ' };
    },
  },

  'counter catcher': {
    nameEn: 'Counter Catcher',
    nameTh: 'เคาน์เตอร์แคชเชอร์',
    subtype: 'Item',
    textEn: 'You can play this card only if you have more Prize cards remaining than your opponent. Switch in 1 of your opponent’s Benched Pokémon to the Active Spot.',
    textTh: 'การ์ดนี้จะใช้ได้เฉพาะเมื่อการ์ดรางวัลที่เหลือของฝ่ายเรามากกว่าฝ่ายตรงข้าม (เราตามหลัง) สลับโปเกมอนบนเบนช์ 1 ตัวของฝ่ายตรงข้ามขึ้นมาบนตำแหน่งต่อสู้',
    choiceType: 'switch-opponent-bench',
    requiresPicker: true,
    canPlay: (state, playerIndex) => {
      const oppIdx = playerIndex === 0 ? 1 : 0;
      const p = state.players[playerIndex];
      const opp = state.players[oppIdx];
      if (p.prizes.length <= opp.prizes.length) {
        return { valid: false, error: `Counter Catcher ใช้ได้เฉพาะเมื่อรางวัลคงเหลือมากกว่าฝ่ายตรงข้าม (เราตามหลัง: เราเหลือ ${p.prizes.length} / ฝ่ายตรงข้ามเหลือ ${opp.prizes.length})` };
      }
      const hasBench = opp.bench.some((b) => b !== null);
      if (!hasBench) return { valid: false, error: 'ฝ่ายตรงข้ามไม่มีโปเกมอนบน Bench ให้ดึงขึ้นมา' };
      return { valid: true };
    },
    execute: (state, playerIndex, _card, choices) => {
      if (choices?.opponentBenchIndex !== undefined) {
        EffectPrimitives.switchOpponentActiveWithBench(state, playerIndex, choices.opponentBenchIndex);
      }
      return { success: true, message: 'ใช้ Counter Catcher ดึงโปเกมอนของฝ่ายตรงข้ามขึ้นสู่ Active Spot สำเร็จ' };
    },
  },

  'prime catcher': {
    nameEn: 'Prime Catcher',
    nameTh: 'ไพรม์แคชเชอร์',
    subtype: 'Item',
    isAceSpec: true,
    textEn: 'Switch in 1 of your opponent’s Benched Pokémon to the Active Spot. If you do, switch your Active Pokémon with 1 of your Benched Pokémon.',
    textTh: 'สลับโปเกมอนบนเบนช์ของฝ่ายตรงข้าม 1 ตัวขึ้นมายังตำแหน่งต่อสู้ จากนั้นสลับโปเกมอนบนตำแหน่งต่อสู้ของเรากับโปเกมอนบนเบนช์',
    choiceType: 'switch-both',
    requiresPicker: true,
    canPlay: (state, playerIndex) => {
      const oppIdx = playerIndex === 0 ? 1 : 0;
      const p = state.players[playerIndex];
      const opp = state.players[oppIdx];
      const oppHasBench = opp.bench.some((b) => b !== null);
      const myHasBench = p.bench.some((b) => b !== null);
      if (!oppHasBench || !myHasBench) {
        return { valid: false, error: 'ต้องมีโปเกมอนบน Bench ทั้งสองฝ่ายสำหรับ Prime Catcher' };
      }
      return { valid: true };
    },
    execute: (state, playerIndex, _card, choices) => {
      if (choices?.opponentBenchIndex !== undefined) {
        EffectPrimitives.switchOpponentActiveWithBench(state, playerIndex, choices.opponentBenchIndex);
      }
      if (choices?.playerBenchIndex !== undefined) {
        EffectPrimitives.switchActiveWithBench(state, playerIndex, choices.playerBenchIndex);
      }
      return { success: true, message: 'ใช้ Prime Catcher สลับตำแหน่งโปเกมอนทั้งสองฝ่ายสำเร็จ' };
    },
  },

  'glass trumpet': {
    nameEn: 'Glass Trumpet',
    nameTh: 'ทรัมเป็ตแก้ว',
    subtype: 'Item',
    textEn: 'You can play this card only if you have a Tera Pokémon in play. Attach a Basic Energy card from your discard pile to up to 2 of your Benched Colorless Pokémon.',
    textTh: 'การ์ดนี้จะใช้ได้เฉพาะเมื่อมีโปเกมอนเทรัสตัลบนสนามฝ่ายเรา เลือกการ์ดพลังงานพื้นฐานจากตำแหน่งทิ้งการ์ดฝ่ายเรา ติดให้กับโปเกมอน [ไร้สี] บนเบนช์ฝ่ายเราได้สูงสุด 2 ตัว ตัวละ 1 ใบ',
    choiceType: 'attach-from-discard',
    requiresPicker: true,
    canPlay: (state, playerIndex) => {
      const p = state.players[playerIndex];
      const hasTera = [p.active, ...p.bench].some((b) => b && (b.card.subtypes.includes('Tera') || (b.card.nameEn || '').toLowerCase().includes('tera')));
      if (!hasTera) return { valid: false, error: 'ต้องมีโปเกมอนเทรัสตัล (Tera) บนสนามฝ่ายเราจึงจะใช้ Glass Trumpet ได้' };
      const hasColorlessBench = p.bench.some((b) => b && b.card.energyType === 'Colorless');
      if (!hasColorlessBench) return { valid: false, error: 'ไม่มีโปเกมอนไร้สี (Colorless) บน Bench' };
      const hasEnergy = p.discard.some((c) => c.supertype === 'Energy');
      if (!hasEnergy) return { valid: false, error: 'ไม่มีการ์ดพลังงานใน Discard Pile' };
      return { valid: true };
    },
    execute: (state, playerIndex) => {
      const p = state.players[playerIndex];
      const colorlessBench = p.bench.filter((b): b is PokemonInPlay => b !== null && b.card.energyType === 'Colorless');
      let attachedCount = 0;
      for (const b of colorlessBench.slice(0, 2)) {
        const energyIdx = p.discard.findIndex((c) => c.supertype === 'Energy');
        if (energyIdx !== -1) {
          const [energy] = p.discard.splice(energyIdx, 1);
          b.attachedEnergies.push(energy);
          attachedCount++;
        }
      }
      return { success: true, message: `ใช้ Glass Trumpet ติดพลังงานจากหลุมให้โปเกมอนไร้สี ${attachedCount} ตัวสำเร็จ` };
    },
  },

  'wondrous patch': {
    nameEn: 'Wondrous Patch',
    nameTh: 'วันเดอร์แพตช์',
    subtype: 'Item',
    textEn: 'Attach a Basic Psychic Energy card from your discard pile to 1 of your Benched Psychic Pokémon.',
    textTh: 'เลือกการ์ดพลังงานพื้นฐาน [พลังจิต] 1 ใบจากตำแหน่งทิ้งการ์ดฝ่ายเรา ติดให้กับโปเกมอน [พลังจิต] บนเบนช์ฝ่ายเรา 1 ตัว',
    choiceType: 'attach-from-discard',
    requiresPicker: true,
    canPlay: (state, playerIndex) => {
      const p = state.players[playerIndex];
      const hasPsychicEnergy = p.discard.some((c) => c.supertype === 'Energy' && (c.energyType === 'Psychic' || c.nameEn?.includes('Psychic')));
      if (!hasPsychicEnergy) return { valid: false, error: 'ไม่มีพลังงานพลังจิตใน Discard Pile' };
      const hasPsychicBench = p.bench.some((b) => b && b.card.energyType === 'Psychic');
      if (!hasPsychicBench) return { valid: false, error: 'ไม่มีโปเกมอนพลังจิตบน Bench' };
      return { valid: true };
    },
    execute: (state, playerIndex, _card, choices) => {
      const p = state.players[playerIndex];
      const targetId = choices?.targetPokemonInstanceId;
      const target = targetId ? p.bench.find((b) => b && b.instanceId === targetId && b.card.energyType === 'Psychic') : p.bench.find((b) => b && b.card.energyType === 'Psychic');
      const energyIdx = p.discard.findIndex((c) => c.supertype === 'Energy' && (c.energyType === 'Psychic' || c.nameEn?.includes('Psychic')));
      if (target && energyIdx !== -1) {
        const [energy] = p.discard.splice(energyIdx, 1);
        target.attachedEnergies.push(energy);
        return { success: true, message: `ใช้ Wondrous Patch ติดพลังงานจิตให้ ${getCardDisplayName(target.card)} สำเร็จ` };
      }
      return { success: false, error: 'ไม่พบเป้าหมายหรือพลังงานจิต' };
    },
  },

  'premium power pro': {
    nameEn: 'Premium Power Pro',
    nameTh: 'พาวเวอร์โปรตีน',
    subtype: 'Item',
    textEn: "During this turn, attacks used by your Fighting Pokémon do 30 more damage to your opponent's Active Pokémon (before applying Weakness and Resistance).",
    textTh: 'ในเทิร์นนี้ แดเมจของท่าต่อสู้ที่โปเกมอน [ต่อสู้] ฝ่ายเราทำกับโปเกมอนบนตำแหน่งต่อสู้ฝ่ายตรงข้ามจะถูก [+30]',
    choiceType: 'none',
    requiresPicker: false,
    canPlay: () => ({ valid: true }),
    execute: (state, playerIndex) => {
      const p = state.players[playerIndex];
      p.turnFlags.fightingAttackBonus = (p.turnFlags.fightingAttackBonus || 0) + 30;
      return { success: true, message: 'ใช้ Premium Power Pro เพิ่มแดเมจของโปเกมอนต่อสู้อีก +30 ในเทิร์นนี้' };
    },
  },

  'switch': {
    nameEn: 'Switch',
    nameTh: 'สับเปลี่ยนโปเกมอน',
    subtype: 'Item',
    textEn: 'Switch your Active Pokémon with 1 of your Benched Pokémon.',
    textTh: 'สลับโปเกมอนบนตำแหน่งต่อสู้ของฝ่ายเรากับโปเกมอนบนเบนช์',
    choiceType: 'switch-active-bench',
    requiresPicker: true,
    canPlay: (state, playerIndex) => {
      const p = state.players[playerIndex];
      if (!p.active) return { valid: false, error: 'ไม่มีโปเกมอนบนตำแหน่ง Active Spot' };
      if (!p.bench.some((b) => b !== null)) return { valid: false, error: 'ไม่มีโปเกมอนบน Bench ให้สลับตำแหน่ง' };
      return { valid: true };
    },
    execute: (state, playerIndex, _card, choices) => {
      if (choices?.playerBenchIndex === undefined) return { success: false, error: 'ต้องเลือกโปเกมอนบน Bench' };
      EffectPrimitives.switchActiveWithBench(state, playerIndex, choices.playerBenchIndex);
      return { success: true, message: 'ใช้ Switch สลับตำแหน่งโปเกมอนสำเร็จ' };
    },
  },

  'night stretcher': {
    nameEn: 'Night Stretcher',
    nameTh: 'เปลหามยามราตรี',
    subtype: 'Item',
    textEn: 'Put a Pokémon or a Basic Energy card from your discard pile into your hand.',
    textTh: 'เลือกการ์ดโปเกมอนหรือการ์ดพลังงานพื้นฐาน 1 ใบจากตำแหน่งทิ้งการ์ดฝ่ายเรา นำขึ้นมือ',
    choiceType: 'discard-pokemon-or-energy-to-hand',
    requiresPicker: true,
    canPlay: (state, playerIndex) => {
      const p = state.players[playerIndex];
      const hasEligible = p.discard.some((c) => c.supertype === 'Pokemon' || c.supertype === 'Energy');
      if (!hasEligible) return { valid: false, error: 'ไม่มีการ์ดโปเกมอนหรือพลังงานใน Discard Pile' };
      return { valid: true };
    },
    execute: (state, playerIndex, _card, choices) => {
      const selectedId = choices?.selectedCardInstanceIds?.[0];
      if (selectedId) {
        EffectPrimitives.recoverFromDiscardToHand(state, playerIndex, [selectedId]);
      } else {
        const p = state.players[playerIndex];
        const eligible = p.discard.find((c) => c.supertype === 'Pokemon' || c.supertype === 'Energy');
        if (eligible) EffectPrimitives.recoverFromDiscardToHand(state, playerIndex, [eligible.instanceId]);
      }
      return { success: true, message: 'ใช้ Night Stretcher กู้การ์ดขึ้นมือสำเร็จ' };
    },
  },

  'super rod': {
    nameEn: 'Super Rod',
    nameTh: 'คันเบ็ดธรรมดา',
    subtype: 'Item',
    textEn: 'Shuffle up to 3 in any combination of Pokémon and Basic Energy cards from your discard pile into your deck.',
    textTh: 'เลือกการ์ดโปเกมอนและการ์ดพลังงานพื้นฐานรวมกันได้สูงสุด 3 ใบจากตำแหน่งทิ้งการ์ด สับกลับเข้าสำรับ',
    choiceType: 'discard-to-deck',
    requiresPicker: true,
    canPlay: (state, playerIndex) => {
      const p = state.players[playerIndex];
      const hasEligible = p.discard.some((c) => c.supertype === 'Pokemon' || c.supertype === 'Energy');
      if (!hasEligible) return { valid: false, error: 'ไม่มีการ์ดโปเกมอนหรือพลังงานใน Discard Pile' };
      return { valid: true };
    },
    execute: (state, playerIndex, _card, choices) => {
      const selectedIds = choices?.selectedCardInstanceIds || [];
      if (selectedIds.length > 0) {
        EffectPrimitives.recoverFromDiscardToDeck(state, playerIndex, selectedIds.slice(0, 3));
      }
      EffectPrimitives.shuffleDeck(state, playerIndex);
      return { success: true, message: 'ใช้ Super Rod สับการ์ดกลับสำรับสำเร็จ' };
    },
  },

  'max rod': {
    nameEn: 'Max Rod',
    nameTh: 'คันเบ็ด MAX',
    subtype: 'Item',
    isAceSpec: true,
    textEn: 'Shuffle up to 5 in any combination of Pokémon and Basic Energy cards from your discard pile into your deck.',
    textTh: 'เลือกการ์ดโปเกมอนและการ์ดพลังงานพื้นฐานรวมกันได้สูงสุด 5 ใบจากตำแหน่งทิ้งการ์ด สับกลับเข้าสำรับ',
    choiceType: 'discard-to-deck',
    requiresPicker: true,
    canPlay: (state, playerIndex) => {
      const p = state.players[playerIndex];
      const hasEligible = p.discard.some((c) => c.supertype === 'Pokemon' || c.supertype === 'Energy');
      if (!hasEligible) return { valid: false, error: 'ไม่มีการ์ดใน Discard Pile' };
      return { valid: true };
    },
    execute: (state, playerIndex, _card, choices) => {
      const selectedIds = choices?.selectedCardInstanceIds || [];
      if (selectedIds.length > 0) {
        EffectPrimitives.recoverFromDiscardToDeck(state, playerIndex, selectedIds.slice(0, 5));
      }
      EffectPrimitives.shuffleDeck(state, playerIndex);
      return { success: true, message: 'ใช้ Max Rod สับการ์ดกลับสำรับสำเร็จ' };
    },
  },

  'earthen vessel': {
    nameEn: 'Earthen Vessel',
    nameTh: 'หม้อดินเผาโบราณ',
    subtype: 'Item',
    textEn: 'You must discard another card from your hand in order to play this card. Search your deck for up to 2 Basic Energy cards, reveal them, and put them into your hand. Then, shuffle your deck.',
    textTh: 'การ์ดนี้ต้องทิ้งการ์ดบนมือเรา 1 ใบจึงจะใช้ได้ เลือกการ์ดพลังงานพื้นฐานได้สูงสุด 2 ใบจากสำรับการ์ด นำขึ้นมือ แล้วสับสำรับ',
    choiceType: 'deck-basic-energy',
    requiresPicker: true,
    canPlay: (state, playerIndex, card) => {
      const p = state.players[playerIndex];
      const otherHand = p.hand.filter((c) => c.instanceId !== card.instanceId);
      if (otherHand.length < 1) return { valid: false, error: 'ต้องมีการ์ดบนมืออีกอย่างน้อย 1 ใบเพื่อทิ้งเป็นค่าร่าย' };
      return { valid: true };
    },
    execute: (state, playerIndex, _card, choices) => {
      if (choices?.discardCardInstanceIds?.[0]) {
        EffectPrimitives.discardFromHand(state, playerIndex, [choices.discardCardInstanceIds[0]]);
      }
      const selectedIds = choices?.selectedCardInstanceIds || [];
      const p = state.players[playerIndex];
      for (const id of selectedIds.slice(0, 2)) {
        const idx = p.deck.findIndex((c) => c.instanceId === id && c.supertype === 'Energy');
        if (idx !== -1) {
          const [energy] = p.deck.splice(idx, 1);
          p.hand.push(energy);
        }
      }
      EffectPrimitives.shuffleDeck(state, playerIndex);
      return { success: true, message: 'ใช้ Earthen Vessel นำพลังงานขึ้นมือสำเร็จ' };
    },
  },

  'bug catching set': {
    nameEn: 'Bug Catching Set',
    nameTh: 'ชุดจับแมลง',
    subtype: 'Item',
    textEn: 'Look at the top 7 cards of your deck. You may reveal up to 2 Grass Pokémon and Grass Energy cards you find there and put them into your hand. Shuffle the other cards into your deck.',
    textTh: 'ดูการ์ด 7 ใบบนสุดของสำรับ เลือกการ์ดโปเกมอนพืชหรือพลังงานพืชได้สูงสุด 2 ใบนำขึ้นมือ สับการ์ดที่เหลือกลับเข้าสำรับ',
    choiceType: 'deck-top7-grass',
    requiresPicker: true,
    canPlay: (state, playerIndex) => {
      const p = state.players[playerIndex];
      if (p.deck.length === 0) return { valid: false, error: 'ไม่มีการ์ดในสำรับ' };
      return { valid: true };
    },
    execute: (state, playerIndex, _card, choices) => {
      const p = state.players[playerIndex];
      const selectedIds = choices?.selectedCardInstanceIds || [];
      for (const id of selectedIds.slice(0, 2)) {
        const idx = p.deck.findIndex((c) => c.instanceId === id);
        if (idx !== -1) {
          const [c] = p.deck.splice(idx, 1);
          p.hand.push(c);
        }
      }
      EffectPrimitives.shuffleDeck(state, playerIndex);
      return { success: true, message: 'ใช้ Bug Catching Set นำการ์ดพืชขึ้นมือสำเร็จ' };
    },
  },

  'fighting gong': {
    nameEn: 'Fighting Gong',
    nameTh: 'ฆ้องต่อสู้',
    subtype: 'Item',
    textEn: 'Look at the top 7 cards of your deck. You may reveal up to 2 Fighting Pokémon and Fighting Energy cards you find there and put them into your hand. Shuffle the other cards into your deck.',
    textTh: 'ดูการ์ด 7 ใบบนสุดของสำรับ เลือกการ์ดโปเกมอนต่อสู้หรือพลังงานต่อสู้ได้สูงสุด 2 ใบนำขึ้นมือ สับการ์ดที่เหลือกลับเข้าสำรับ',
    choiceType: 'deck-top7-fighting',
    requiresPicker: true,
    canPlay: (state, playerIndex) => {
      const p = state.players[playerIndex];
      if (p.deck.length === 0) return { valid: false, error: 'ไม่มีการ์ดในสำรับ' };
      return { valid: true };
    },
    execute: (state, playerIndex, _card, choices) => {
      const p = state.players[playerIndex];
      const selectedIds = choices?.selectedCardInstanceIds || [];
      for (const id of selectedIds.slice(0, 2)) {
        const idx = p.deck.findIndex((c) => c.instanceId === id);
        if (idx !== -1) {
          const [c] = p.deck.splice(idx, 1);
          p.hand.push(c);
        }
      }
      EffectPrimitives.shuffleDeck(state, playerIndex);
      return { success: true, message: 'ใช้ Fighting Gong นำการ์ดต่อสู้ขึ้นมือสำเร็จ' };
    },
  },

  'pokégear 3.0': {
    nameEn: 'Pokégear 3.0',
    nameTh: 'โปเกเกีย 3.0',
    subtype: 'Item',
    textEn: 'Look at the top 7 cards of your deck. You may reveal a Supporter card you find there and put it into your hand. Shuffle the other cards into your deck.',
    textTh: 'ดูการ์ด 7 ใบบนสุดของสำรับ เลือกการ์ดซัพพอร์ต 1 ใบนำขึ้นมือ สับการ์ดที่เหลือกลับเข้าสำรับ',
    choiceType: 'deck-top7-supporter',
    requiresPicker: true,
    canPlay: (state, playerIndex) => {
      const p = state.players[playerIndex];
      if (p.deck.length === 0) return { valid: false, error: 'ไม่มีการ์ดในสำรับ' };
      return { valid: true };
    },
    execute: (state, playerIndex, _card, choices) => {
      const p = state.players[playerIndex];
      const selectedId = choices?.selectedCardInstanceIds?.[0];
      if (selectedId) {
        const idx = p.deck.findIndex((c) => c.instanceId === selectedId && c.supertype === 'Trainer' && c.subtypes.includes('Supporter'));
        if (idx !== -1) {
          const [supp] = p.deck.splice(idx, 1);
          p.hand.push(supp);
        }
      }
      EffectPrimitives.shuffleDeck(state, playerIndex);
      return { success: true, message: 'ใช้ Pokégear 3.0 สำเร็จ' };
    },
  },

  'energy search': {
    nameEn: 'Energy Search',
    nameTh: 'ส่งต่อพลังงาน',
    subtype: 'Item',
    textEn: 'Search your deck for a Basic Energy card, reveal it, and put it into your hand. Then, shuffle your deck.',
    textTh: 'เลือกการ์ดพลังงานพื้นฐาน 1 ใบจากสำรับการ์ด นำขึ้นมือ แล้วสับสำรับ',
    choiceType: 'deck-basic-energy',
    requiresPicker: true,
    canPlay: (state, playerIndex) => {
      const p = state.players[playerIndex];
      if (p.deck.length === 0) return { valid: false, error: 'ไม่มีการ์ดในสำรับ' };
      return { valid: true };
    },
    execute: (state, playerIndex, _card, choices) => {
      const p = state.players[playerIndex];
      const selectedId = choices?.selectedCardInstanceIds?.[0];
      if (selectedId) {
        const idx = p.deck.findIndex((c) => c.instanceId === selectedId && c.supertype === 'Energy');
        if (idx !== -1) {
          const [energy] = p.deck.splice(idx, 1);
          p.hand.push(energy);
        }
      }
      EffectPrimitives.shuffleDeck(state, playerIndex);
      return { success: true, message: 'ใช้ Energy Search นำพลังงานขึ้นมือสำเร็จ' };
    },
  },

  'energy recycler': {
    nameEn: 'Energy Recycler',
    nameTh: 'เอนเนอร์จี้รีไซเคิล',
    subtype: 'Item',
    textEn: 'Shuffle up to 5 Basic Energy cards from your discard pile into your deck.',
    textTh: 'เลือกการ์ดพลังงานพื้นฐานได้สูงสุด 5 ใบจากตำแหน่งทิ้งการ์ด สับกลับเข้าสำรับ',
    choiceType: 'discard-to-deck',
    requiresPicker: true,
    canPlay: (state, playerIndex) => {
      const p = state.players[playerIndex];
      const hasEnergy = p.discard.some((c) => c.supertype === 'Energy');
      if (!hasEnergy) return { valid: false, error: 'ไม่มีพลังงานใน Discard Pile' };
      return { valid: true };
    },
    execute: (state, playerIndex, _card, choices) => {
      const selectedIds = choices?.selectedCardInstanceIds || [];
      if (selectedIds.length > 0) {
        EffectPrimitives.recoverFromDiscardToDeck(state, playerIndex, selectedIds.slice(0, 5));
      }
      EffectPrimitives.shuffleDeck(state, playerIndex);
      return { success: true, message: 'ใช้ Energy Recycler สับพลังงานกลับสำรับสำเร็จ' };
    },
  },

  'sacred ash': {
    nameEn: 'Sacred Ash',
    nameTh: 'ขี้เถ้าศักดิ์สิทธิ์',
    subtype: 'Item',
    textEn: 'Shuffle up to 5 Pokémon from your discard pile into your deck.',
    textTh: 'เลือกการ์ดโปเกมอนได้สูงสุด 5 ใบจากตำแหน่งทิ้งการ์ด สับกลับเข้าสำรับ',
    choiceType: 'discard-to-deck',
    requiresPicker: true,
    canPlay: (state, playerIndex) => {
      const p = state.players[playerIndex];
      const hasPoke = p.discard.some((c) => c.supertype === 'Pokemon');
      if (!hasPoke) return { valid: false, error: 'ไม่มีโปเกมอนใน Discard Pile' };
      return { valid: true };
    },
    execute: (state, playerIndex, _card, choices) => {
      const selectedIds = choices?.selectedCardInstanceIds || [];
      if (selectedIds.length > 0) {
        EffectPrimitives.recoverFromDiscardToDeck(state, playerIndex, selectedIds.slice(0, 5));
      }
      EffectPrimitives.shuffleDeck(state, playerIndex);
      return { success: true, message: 'ใช้ Sacred Ash สับโปเกมอนกลับสำรับสำเร็จ' };
    },
  },

  'mega signal': {
    nameEn: 'Mega Signal',
    nameTh: 'เมก้าซิกแนล',
    subtype: 'Item',
    textEn: 'Search your deck for a Mega Evolution Pokémon ex, reveal it, and put it into your hand. Then, shuffle your deck.',
    textTh: 'เลือกการ์ดโปเกมอน Mega Evolution ex จากสำรับการ์ด 1 ใบ นำขึ้นมือ แล้วสับสำรับ',
    choiceType: 'deck-pokemon-ex',
    requiresPicker: true,
    canPlay: (state, playerIndex) => {
      const p = state.players[playerIndex];
      if (p.deck.length === 0) return { valid: false, error: 'ไม่มีการ์ดในสำรับ' };
      return { valid: true };
    },
    execute: (state, playerIndex, _card, choices) => {
      const p = state.players[playerIndex];
      const chosenId = choices?.selectedCardInstanceIds?.[0];
      if (chosenId) {
        const idx = p.deck.findIndex((c) => c.instanceId === chosenId && c.supertype === 'Pokemon');
        if (idx !== -1) {
          const [found] = p.deck.splice(idx, 1);
          p.hand.push(found);
        }
      }
      EffectPrimitives.shuffleDeck(state, playerIndex);
      return { success: true, message: 'ใช้ Mega Signal ค้นหาโปเกมอนขึ้นมือสำเร็จ' };
    },
  },

  'dusk ball': {
    nameEn: 'Dusk Ball',
    nameTh: 'ดาร์กบอล',
    subtype: 'Item',
    textEn: 'Look at the bottom 7 cards of your deck. You may reveal a Pokémon you find there and put it into your hand. Shuffle the other cards back into your deck.',
    textTh: 'ดูการ์ด 7 ใบใต้สุดของสำรับ เลือกการ์ดโปเกมอน 1 ใบนำขึ้นมือ สับการ์ดที่เหลือกลับเข้าสำรับ',
    choiceType: 'deck-top7-pokemon',
    requiresPicker: true,
    canPlay: (state, playerIndex) => {
      const p = state.players[playerIndex];
      if (p.deck.length === 0) return { valid: false, error: 'ไม่มีการ์ดในสำรับ' };
      return { valid: true };
    },
    execute: (state, playerIndex, _card, choices) => {
      const p = state.players[playerIndex];
      const chosenId = choices?.selectedCardInstanceIds?.[0];
      if (chosenId) {
        const idx = p.deck.findIndex((c) => c.instanceId === chosenId && c.supertype === 'Pokemon');
        if (idx !== -1) {
          const [found] = p.deck.splice(idx, 1);
          p.hand.push(found);
        }
      }
      EffectPrimitives.shuffleDeck(state, playerIndex);
      return { success: true, message: 'ใช้ Dusk Ball ค้นหาโปเกมอนขึ้นมือสำเร็จ' };
    },
  },

  'secret box': {
    nameEn: 'Secret Box',
    nameTh: 'กล่องลับ',
    subtype: 'Item',
    isAceSpec: true,
    textEn: 'You must discard 3 other cards from your hand in order to play this card. Search your deck for an Item card, a Pokémon Tool card, a Supporter card, and a Stadium card, reveal them, and put them into your hand. Then, shuffle your deck.',
    textTh: 'การ์ดนี้ต้องทิ้งการ์ดบนมือเรา 3 ใบจึงจะใช้ได้ เลือกการ์ดไอเท็ม 1 ใบ, การ์ดเครื่องมือโปเกมอน 1 ใบ, การ์ดซัพพอร์ต 1 ใบ และการ์ดสเตเดียม 1 ใบจากสำรับ นำขึ้นมือ แล้วสับสำรับ',
    choiceType: 'deck-secret-box',
    requiresPicker: true,
    canPlay: (state, playerIndex, card) => {
      const p = state.players[playerIndex];
      const otherHand = p.hand.filter((c) => c.instanceId !== card.instanceId);
      if (otherHand.length < 3) return { valid: false, error: 'ต้องมีการ์ดบนมืออีกอย่างน้อย 3 ใบเพื่อทิ้งเป็นค่าร่าย Secret Box' };
      return { valid: true };
    },
    execute: (state, playerIndex, _card, choices) => {
      if (choices?.discardCardInstanceIds && choices.discardCardInstanceIds.length >= 3) {
        EffectPrimitives.discardFromHand(state, playerIndex, choices.discardCardInstanceIds.slice(0, 3));
      }
      const p = state.players[playerIndex];
      const selectedIds = choices?.selectedCardInstanceIds || [];
      for (const id of selectedIds.slice(0, 4)) {
        const idx = p.deck.findIndex((c) => c.instanceId === id);
        if (idx !== -1) {
          const [found] = p.deck.splice(idx, 1);
          p.hand.push(found);
        }
      }
      EffectPrimitives.shuffleDeck(state, playerIndex);
      return { success: true, message: 'ใช้ Secret Box ค้นหาการ์ด 4 หมวดหมู่ขึ้นมือสำเร็จ' };
    },
  },

  'hand trimmer': {
    nameEn: 'Hand Trimmer',
    nameTh: 'แฮนด์ทริมเมอร์',
    subtype: 'Item',
    textEn: 'Each player who has 5 or more cards in their hand discards cards until they have 4 cards in hand. (Your opponent discards first.)',
    textTh: 'ผู้เล่นทั้งสองฝ่ายที่มีการ์ดบนมือตั้งแต่ 5 ใบขึ้นไป ทิ้งการ์ดบนมือจนเหลือ 4 ใบ (ฝ่ายตรงข้ามทิ้งก่อน)',
    choiceType: 'none',
    requiresPicker: false,
    canPlay: () => ({ valid: true }),
    execute: (state, playerIndex) => {
      const oppIdx = playerIndex === 0 ? 1 : 0;
      for (const idx of [oppIdx, playerIndex] as (0 | 1)[]) {
        const p = state.players[idx];
        if (p.hand.length > 4) {
          const excess = p.hand.length - 4;
          const discarded = p.hand.splice(p.hand.length - excess, excess);
          p.discard.push(...discarded);
        }
      }
      return { success: true, message: 'ใช้ Hand Trimmer ตัดการ์ดบนมือเหลือ 4 ใบ' };
    },
  },

  'crushing hammer': {
    nameEn: 'Crushing Hammer',
    nameTh: 'แครชแฮมเมอร์',
    subtype: 'Item',
    textEn: 'Flip a coin. If heads, discard an Energy from 1 of your opponent’s Pokémon.',
    textTh: 'ทอยเหรียญ 1 ครั้ง ถ้าออกหัว ทิ้งการ์ดพลังงาน 1 ใบที่ติดอยู่กับโปเกมอนของฝ่ายตรงข้าม',
    choiceType: 'none',
    requiresPicker: false,
    canPlay: (state, playerIndex) => {
      const oppIdx = playerIndex === 0 ? 1 : 0;
      const opp = state.players[oppIdx];
      const hasEnergy = [opp.active, ...opp.bench].some((b) => b && b.attachedEnergies.length > 0);
      if (!hasEnergy) return { valid: false, error: 'ฝ่ายตรงข้ามไม่มีพลังงานติดอยู่กับโปเกมอน' };
      return { valid: true };
    },
    execute: (state, playerIndex) => {
      const oppIdx = playerIndex === 0 ? 1 : 0;
      const opp = state.players[oppIdx];
      const isHeads = Math.random() < 0.5;
      if (!isHeads) return { success: true, message: 'แครชแฮมเมอร์ออกก้อย — ไม่มีผล' };

      const target = [opp.active, ...opp.bench].find((b) => b && b.attachedEnergies.length > 0);
      if (target && target.attachedEnergies.length > 0) {
        const [discarded] = target.attachedEnergies.splice(0, 1);
        opp.discard.push(discarded);
        return { success: true, message: `แครชแฮมเมอร์ออกหัว! ทิ้งพลังงานของ ${getCardDisplayName(target.card)} สำเร็จ` };
      }
      return { success: true, message: 'แครชแฮมเมอร์ออกหัว แต่ไม่มีพลังงานให้ทิ้ง' };
    },
  },

  'enhanced hammer': {
    nameEn: 'Enhanced Hammer',
    nameTh: 'ค้อนสลายพลังงาน',
    subtype: 'Item',
    textEn: 'Discard a Special Energy from 1 of your opponent’s Pokémon.',
    textTh: 'ทิ้งการ์ดพลังงานพิเศษ 1 ใบที่ติดอยู่กับโปเกมอนของฝ่ายตรงข้าม',
    choiceType: 'none',
    requiresPicker: false,
    canPlay: (state, playerIndex) => {
      const oppIdx = playerIndex === 0 ? 1 : 0;
      const opp = state.players[oppIdx];
      const hasSpecialEnergy = [opp.active, ...opp.bench].some((b) =>
        b && b.attachedEnergies.some((e) => e.subtypes?.includes('Special') || (e.nameEn || '').toLowerCase().includes('special'))
      );
      if (!hasSpecialEnergy) return { valid: false, error: 'ฝ่ายตรงข้ามไม่มีการ์ดพลังงานพิเศษติดอยู่' };
      return { valid: true };
    },
    execute: (state, playerIndex) => {
      const oppIdx = playerIndex === 0 ? 1 : 0;
      const opp = state.players[oppIdx];
      for (const p of [opp.active, ...opp.bench]) {
        if (!p) continue;
        const sIdx = p.attachedEnergies.findIndex((e) => e.subtypes?.includes('Special') || (e.nameEn || '').toLowerCase().includes('special'));
        if (sIdx !== -1) {
          const [discarded] = p.attachedEnergies.splice(sIdx, 1);
          opp.discard.push(discarded);
          return { success: true, message: 'ใช้ Enhanced Hammer ทิ้งพลังงานพิเศษของฝ่ายตรงข้ามสำเร็จ' };
        }
      }
      return { success: true, message: 'ใช้ Enhanced Hammer' };
    },
  },

  'transformation tome': {
    nameEn: 'Transformation Tome',
    nameTh: 'ตำราเปลี่ยนร่าง',
    subtype: 'Item',
    textEn: 'You must play 2 Transformation Tome cards at once. Choose a Basic Pokémon in your discard pile and switch it with 1 of your Basic Pokémon in play. Any attached cards, damage counters, Special Conditions, turns in play, and other effects remain on the new Pokémon.',
    textTh: 'ต้องใช้การ์ดตำราเปลี่ยนร่าง 2 ใบพร้อมกัน เลือกโปเกมอน [ร่างแรก] จากตำแหน่งทิ้งการ์ด สลับกับโปเกมอน [ร่างแรก] บนสนามฝ่ายเรา โดยคงแดเมจเคาน์เตอร์ การ์ดที่ติดอยู่ และสภาวะผิดปกติไว้ทั้งหมด',
    choiceType: 'transformation-tome',
    requiresPicker: true,
    canPlay: (state, playerIndex) => {
      const p = state.players[playerIndex];
      const count = p.hand.filter((c) => (c.nameEn || '').toLowerCase().includes('transformation tome') || (c.nameTh || '').includes('ตำราเปลี่ยนร่าง')).length;
      if (count < 2) return { valid: false, error: 'ต้องมีการ์ด Transformation Tome บนมือ 2 ใบเพื่อเล่นพร้อมกัน' };
      const hasBasicInPlay = [p.active, ...p.bench].some((b) => b && b.stage === 'Basic');
      if (!hasBasicInPlay) return { valid: false, error: 'ไม่มีโปเกมอน Basic บนสนาม' };
      const hasBasicInDiscard = p.discard.some((c) => c.supertype === 'Pokemon' && c.subtypes.includes('Basic'));
      if (!hasBasicInDiscard) return { valid: false, error: 'ไม่มีการ์ด Basic Pokémon ใน Discard Pile' };
      return { valid: true };
    },
    execute: (state, playerIndex, _card, choices) => {
      const p = state.players[playerIndex];
      const secondIdx = p.hand.findIndex((c) => c.instanceId !== _card.instanceId && ((c.nameEn || '').toLowerCase().includes('transformation tome') || (c.nameTh || '').includes('ตำราเปลี่ยนร่าง')));
      if (secondIdx !== -1) {
        const [second] = p.hand.splice(secondIdx, 1);
        p.discard.push(second);
      }

      const fieldTargetId = choices?.targetPokemonInstanceId;
      const discardCardId = choices?.selectedCardInstanceIds?.[0];
      if (fieldTargetId && discardCardId) {
        const fieldPoke = [p.active, ...p.bench].find((b) => b && b.instanceId === fieldTargetId);
        const discardIdx = p.discard.findIndex((c) => c.instanceId === discardCardId && c.supertype === 'Pokemon' && c.subtypes.includes('Basic'));
        if (fieldPoke && discardIdx !== -1) {
          const [newBasic] = p.discard.splice(discardIdx, 1);
          p.discard.push(fieldPoke.card);
          fieldPoke.card = newBasic;
          fieldPoke.maxHp = newBasic.hp || fieldPoke.maxHp;
          return { success: true, message: `ใช้ Transformation Tome สลับเป็น ${getCardDisplayName(newBasic)} สำเร็จ` };
        }
      }
      return { success: true, message: 'ใช้ Transformation Tome สำเร็จ' };
    },
  },

  "n's pp up": {
    nameEn: "N's PP Up",
    nameTh: 'ยาเพิ่มพลังงานของ N',
    subtype: 'Item',
    textEn: "Attach a Basic Energy card from your discard pile to 1 of your Benched N's Pokémon.",
    textTh: 'เลือกการ์ดพลังงานพื้นฐาน 1 ใบจากตำแหน่งทิ้งการ์ดฝ่ายเรา ติดที่ [โปเกมอน ของ N] บนเบนช์',
    choiceType: 'attach-from-discard',
    requiresPicker: true,
    canPlay: (state, playerIndex) => {
      const p = state.players[playerIndex];
      const hasNPokemon = p.bench.some((b) => b && (b.card.nameEn || '').toLowerCase().includes("n's"));
      if (!hasNPokemon) return { valid: false, error: "ไม่มี [โปเกมอนของ N] บน Bench ฝ่ายเรา" };
      const hasEnergy = p.discard.some((c) => c.supertype === 'Energy');
      if (!hasEnergy) return { valid: false, error: 'ไม่มีพลังงานใน Discard Pile' };
      return { valid: true };
    },
    execute: (state, playerIndex) => {
      const p = state.players[playerIndex];
      const nPokemon = p.bench.find((b) => b && (b.card.nameEn || '').toLowerCase().includes("n's"));
      const energyIdx = p.discard.findIndex((c) => c.supertype === 'Energy');
      if (nPokemon && energyIdx !== -1) {
        const [energy] = p.discard.splice(energyIdx, 1);
        nPokemon.attachedEnergies.push(energy);
        return { success: true, message: `ใช้ N's PP Up ติดพลังงานให้ ${nPokemon.card.nameEn} สำเร็จ` };
      }
      return { success: true, message: "ใช้ N's PP Up" };
    },
  },

  // =========================================================================
  // 2. SUPPORTERS
  // =========================================================================

  'arven': {
    nameEn: 'Arven',
    nameTh: 'เปปเปอร์',
    subtype: 'Supporter',
    textEn: 'Search your deck for an Item card and a Pokémon Tool card, reveal them, and put them into your hand. Then, shuffle your deck.',
    textTh: 'เลือกการ์ดไอเท็ม 1 ใบ และการ์ดเครื่องมือโปเกมอน 1 ใบจากสำรับการ์ด นำขึ้นมือ แล้วสับสำรับการ์ด',
    choiceType: 'deck-item-and-tool',
    requiresPicker: true,
    canPlay: (state, playerIndex) => {
      if (state.turnNumber === 1 && playerIndex === state.firstPlayerIndex) {
        return { valid: false, error: 'ผู้เล่นคนแรกห้ามใช้ Supporter ในเทิร์นที่ 1' };
      }
      const p = state.players[playerIndex];
      if (p.deck.length === 0) return { valid: false, error: 'ไม่มีการ์ดในสำรับ' };
      return { valid: true };
    },
    execute: (state, playerIndex, _card, choices) => {
      const p = state.players[playerIndex];
      const selectedIds = choices?.selectedCardInstanceIds || [];
      for (const id of selectedIds.slice(0, 2)) {
        const idx = p.deck.findIndex((c) => c.instanceId === id);
        if (idx !== -1) {
          const [found] = p.deck.splice(idx, 1);
          p.hand.push(found);
        }
      }
      EffectPrimitives.shuffleDeck(state, playerIndex);
      return { success: true, message: 'ใช้ Arven (เปปเปอร์) ค้นหา Item และ Tool ขึ้นมือสำเร็จ' };
    },
  },

  "colress's experiment": {
    nameEn: "Colress's Experiment",
    nameTh: 'การทดลองของอโครมา',
    subtype: 'Supporter',
    textEn: 'Look at the top 5 cards of your deck and put 3 of them into your hand. Put the other cards in the Lost Zone.',
    textTh: 'ดูการ์ด 5 ใบบนสุดของสำรับ เลือก 3 ใบนำขึ้นมือ นำการ์ดที่เหลือไปไว้ที่ลอสท์โซน',
    choiceType: 'hand-discard-draw',
    requiresPicker: true,
    canPlay: (state, playerIndex) => {
      if (state.turnNumber === 1 && playerIndex === state.firstPlayerIndex) {
        return { valid: false, error: 'ผู้เล่นคนแรกห้ามใช้ Supporter ในเทิร์นที่ 1' };
      }
      const p = state.players[playerIndex];
      if (p.deck.length === 0) return { valid: false, error: 'ไม่มีการ์ดในสำรับ' };
      return { valid: true };
    },
    execute: (state, playerIndex, _card, choices) => {
      const p = state.players[playerIndex];
      const top5 = p.deck.splice(0, Math.min(5, p.deck.length));
      const selectedIds = choices?.selectedCardInstanceIds || [];
      for (const id of selectedIds.slice(0, 3)) {
        const idx = top5.findIndex((c) => c.instanceId === id);
        if (idx !== -1) {
          const [chosen] = top5.splice(idx, 1);
          p.hand.push(chosen);
        }
      }
      p.lostZone.push(...top5);
      return { success: true, message: "ใช้ Colress's Experiment นำการ์ดขึ้นมือและส่งส่วนที่เหลือไป Lost Zone" };
    },
  },

  'penny': {
    nameEn: 'Penny',
    nameTh: 'โบตั๋น',
    subtype: 'Supporter',
    textEn: 'Put 1 of your Basic Pokémon and all attached cards into your hand.',
    textTh: 'นำโปเกมอน [ร่างแรก] บนสนามฝ่ายเรา 1 ตัวและการ์ดทั้งหมดที่ติดอยู่กลับขึ้นมือ',
    choiceType: 'return-to-hand',
    requiresPicker: true,
    canPlay: (state, playerIndex) => {
      if (state.turnNumber === 1 && playerIndex === state.firstPlayerIndex) {
        return { valid: false, error: 'ผู้เล่นคนแรกห้ามใช้ Supporter ในเทิร์นที่ 1' };
      }
      const p = state.players[playerIndex];
      const basics = [p.active, ...p.bench].filter((b): b is PokemonInPlay => b !== null && b.stage === 'Basic');
      if (basics.length === 0) return { valid: false, error: 'ไม่มีโปเกมอน Basic บนสนาม' };
      return { valid: true };
    },
    execute: (state, playerIndex, _card, choices) => {
      const p = state.players[playerIndex];
      const targetId = choices?.targetPokemonInstanceId;
      const bIdx = p.bench.findIndex((b) => b && b.instanceId === targetId && b.stage === 'Basic');
      if (bIdx !== -1) {
        const b = p.bench[bIdx]!;
        p.hand.push(...b.attachedEnergies);
        if (b.attachedTool) p.hand.push(b.attachedTool);
        p.hand.push(b.card);
        p.bench[bIdx] = null;
        return { success: true, message: `ใช้ Penny นำ ${b.card.nameEn} ขึ้นมือสำเร็จ` };
      }
      return { success: true, message: 'ใช้ Penny' };
    },
  },

  "professor sada's vitality": {
    nameEn: "Professor Sada's Vitality",
    nameTh: 'ความมีชีวิตชีวาของศาสตราจารย์ซาดา',
    subtype: 'Supporter',
    textEn: 'Choose up to 2 of your Ancient Pokémon, and attach a Basic Energy card from your discard pile to each of them. If you attached Energy to a Pokémon in this way, draw 3 cards.',
    textTh: 'เลือกโปเกมอน [อดีต] ฝ่ายเราได้สูงสุด 2 ตัว ติดพลังงานพื้นฐานจากหลุมให้ตัวละ 1 ใบ จากนั้นจั่วการ์ด 3 ใบ',
    choiceType: 'attach-from-discard',
    requiresPicker: true,
    canPlay: (state, playerIndex) => {
      if (state.turnNumber === 1 && playerIndex === state.firstPlayerIndex) {
        return { valid: false, error: 'ผู้เล่นคนแรกห้ามใช้ Supporter ในเทิร์นที่ 1' };
      }
      const p = state.players[playerIndex];
      const hasAncient = [p.active, ...p.bench].some((b) => b && (b.card.subtypes.includes('Ancient') || (b.card.nameEn || '').toLowerCase().includes('ancient')));
      if (!hasAncient) return { valid: false, error: 'ไม่มีโปเกมอนอดีต (Ancient) บนสนาม' };
      const hasEnergy = p.discard.some((c) => c.supertype === 'Energy');
      if (!hasEnergy) return { valid: false, error: 'ไม่มีพลังงานใน Discard Pile' };
      return { valid: true };
    },
    execute: (state, playerIndex) => {
      const p = state.players[playerIndex];
      const ancientPokes = [p.active, ...p.bench].filter((b): b is PokemonInPlay => b !== null && (b.card.subtypes.includes('Ancient') || (b.card.nameEn || '').toLowerCase().includes('ancient')));
      let attached = false;
      for (const poke of ancientPokes.slice(0, 2)) {
        const eIdx = p.discard.findIndex((c) => c.supertype === 'Energy');
        if (eIdx !== -1) {
          const [energy] = p.discard.splice(eIdx, 1);
          poke.attachedEnergies.push(energy);
          attached = true;
        }
      }
      if (attached) {
        EffectPrimitives.drawCards(state, playerIndex, 3);
      }
      return { success: true, message: "ใช้ Professor Sada's Vitality ติดพลังงานและจั่ว 3 ใบสำเร็จ" };
    },
  },

  "professor turo's scenario": {
    nameEn: "Professor Turo's Scenario",
    nameTh: 'แผนการของศาสตราจารย์ทูโร',
    subtype: 'Supporter',
    textEn: 'Put 1 of your Pokémon into your hand. (Discard all attached cards.)',
    textTh: 'นำโปเกมอนบนสนามฝ่ายเรา 1 ตัวกลับขึ้นมือ (ทิ้งการ์ดที่ติดอยู่ทั้งหมด)',
    choiceType: 'return-to-hand',
    requiresPicker: true,
    canPlay: (state, playerIndex) => {
      if (state.turnNumber === 1 && playerIndex === state.firstPlayerIndex) {
        return { valid: false, error: 'ผู้เล่นคนแรกห้ามใช้ Supporter ในเทิร์นที่ 1' };
      }
      const p = state.players[playerIndex];
      const allPokes = [p.active, ...p.bench].filter((b): b is PokemonInPlay => b !== null);
      if (allPokes.length <= 1) return { valid: false, error: 'ต้องมีโปเกมอนตัวอื่นเหลืออยู่บนสนาม' };
      return { valid: true };
    },
    execute: (state, playerIndex, _card, choices) => {
      const p = state.players[playerIndex];
      const targetId = choices?.targetPokemonInstanceId;
      const bIdx = p.bench.findIndex((b) => b && b.instanceId === targetId);
      if (bIdx !== -1) {
        const b = p.bench[bIdx]!;
        p.discard.push(...b.attachedEnergies);
        if (b.attachedTool) p.discard.push(b.attachedTool);
        p.hand.push(b.card);
        p.bench[bIdx] = null;
        return { success: true, message: `ใช้ Professor Turo's Scenario นำ ${b.card.nameEn} ขึ้นมือสำเร็จ` };
      }
      return { success: true, message: "ใช้ Professor Turo's Scenario" };
    },
  },

  'roxanne': {
    nameEn: 'Roxanne',
    nameTh: 'สึสึจิ',
    subtype: 'Supporter',
    textEn: 'You can play this card only if your opponent has 3 or fewer Prize cards remaining. Each player shuffles their hand into their deck. Then, you draw 6 cards, and your opponent draws 2 cards.',
    textTh: 'การ์ดนี้จะใช้ได้เฉพาะเมื่อการ์ดรางวัลที่เหลือของฝ่ายตรงข้ามมีไม่เกิน 3 ใบ ให้ผู้เล่นทั้งสองฝ่ายสับมือเข้าสำรับ คุณจั่ว 6 ใบ ฝ่ายตรงข้ามจั่ว 2 ใบ',
    choiceType: 'none',
    requiresPicker: false,
    canPlay: (state, playerIndex) => {
      if (state.turnNumber === 1 && playerIndex === state.firstPlayerIndex) {
        return { valid: false, error: 'ผู้เล่นคนแรกห้ามใช้ Supporter ในเทิร์นที่ 1' };
      }
      const oppIdx = playerIndex === 0 ? 1 : 0;
      const opp = state.players[oppIdx];
      if (opp.prizes.length > 3) {
        return { valid: false, error: `Roxanne ใช้ได้เฉพาะเมื่อฝ่ายตรงข้ามเหลือรางวัลไม่เกิน 3 ใบ (ปัจจุบันเหลือ ${opp.prizes.length} ใบ)` };
      }
      return { valid: true };
    },
    execute: (state, playerIndex) => {
      const oppIdx = playerIndex === 0 ? 1 : 0;
      EffectPrimitives.shuffleHandToBottom(state, playerIndex);
      EffectPrimitives.shuffleDeck(state, playerIndex);
      EffectPrimitives.drawCards(state, playerIndex, 6);

      EffectPrimitives.shuffleHandToBottom(state, oppIdx);
      EffectPrimitives.shuffleDeck(state, oppIdx);
      EffectPrimitives.drawCards(state, oppIdx, 2);
      return { success: true, message: 'ใช้ Roxanne! คุณจั่ว 6 ใบ ฝ่ายตรงข้ามจั่ว 2 ใบ' };
    },
  },

  "lillie's determination": {
    nameEn: "Lillie's Determination",
    nameTh: 'ปณิธานของลิเลีย',
    subtype: 'Supporter',
    textEn: 'Shuffle your hand into your deck. Then, draw 6 cards. If you have exactly 6 Prize cards remaining, draw 8 cards instead.',
    textTh: 'สับการ์ดบนมือของฝ่ายเราทั้งหมดรวมกับสำรับการ์ด แล้วจั่วการ์ด 6 ใบ หากการ์ดรางวัลที่เหลืออยู่ของฝ่ายเรามี 6 ใบ ให้จั่วการ์ด 8 ใบแทน',
    choiceType: 'none',
    requiresPicker: false,
    canPlay: (state, playerIndex) => {
      if (state.turnNumber === 1 && playerIndex === state.firstPlayerIndex) {
        return { valid: false, error: 'ผู้เล่นคนแรกห้ามใช้การ์ด Supporter ในเทิร์นที่ 1' };
      }
      return { valid: true };
    },
    execute: (state, playerIndex) => {
      const p = state.players[playerIndex];
      EffectPrimitives.shuffleHandToBottom(state, playerIndex);
      EffectPrimitives.shuffleDeck(state, playerIndex);
      const drawCount = p.prizes.length === 6 ? 8 : 6;
      EffectPrimitives.drawCards(state, playerIndex, drawCount);
      return {
        success: true,
        message: `ใช้ Lillie's Determination สับการ์ดบนมือและจั่ว ${drawCount} ใบ (รางวัลคงเหลือ: ${p.prizes.length} ใบ)`,
      };
    },
  },

  "boss's orders": {
    nameEn: "Boss's Orders",
    nameTh: 'คำสั่งของบอส',
    subtype: 'Supporter',
    textEn: 'Switch in 1 of your opponent’s Benched Pokémon to the Active Spot.',
    textTh: 'สลับโปเกมอนบนเบนช์ 1 ตัวของฝ่ายตรงข้ามขึ้นมาบนตำแหน่งต่อสู้',
    choiceType: 'switch-opponent-bench',
    requiresPicker: true,
    canPlay: (state, playerIndex) => {
      if (state.turnNumber === 1 && playerIndex === state.firstPlayerIndex) {
        return { valid: false, error: 'ผู้เล่นคนแรกห้ามใช้ Supporter ในเทิร์นที่ 1' };
      }
      const oppIdx = playerIndex === 0 ? 1 : 0;
      const opp = state.players[oppIdx];
      if (!opp.bench.some((b) => b !== null)) return { valid: false, error: 'ฝ่ายตรงข้ามไม่มีโปเกมอนบน Bench' };
      return { valid: true };
    },
    execute: (state, playerIndex, _card, choices) => {
      if (choices?.opponentBenchIndex !== undefined) {
        EffectPrimitives.switchOpponentActiveWithBench(state, playerIndex, choices.opponentBenchIndex);
      }
      return { success: true, message: "ใช้ Boss's Orders ดึงโปเกมอนของฝ่ายตรงข้ามขึ้นมา Active สำเร็จ" };
    },
  },

  'hilda': {
    nameEn: 'Hilda',
    nameTh: 'โทโกะ',
    subtype: 'Supporter',
    textEn: 'Search your deck for an Evolution Pokémon and an Energy card, reveal them, and put them into your hand. Then, shuffle your deck.',
    textTh: 'เลือกการ์ดโปเกมอนวิวัฒนาการ 1 ใบ และการ์ดพลังงาน 1 ใบจากสำรับการ์ด นำขึ้นมือ แล้วสับสำรับ',
    choiceType: 'deck-evolution-and-energy',
    requiresPicker: true,
    canPlay: (state, playerIndex) => {
      if (state.turnNumber === 1 && playerIndex === state.firstPlayerIndex) {
        return { valid: false, error: 'ผู้เล่นคนแรกห้ามใช้ Supporter ในเทิร์นที่ 1' };
      }
      const p = state.players[playerIndex];
      if (p.deck.length === 0) return { valid: false, error: 'ไม่มีการ์ดในสำรับ' };
      return { valid: true };
    },
    execute: (state, playerIndex, _card, choices) => {
      const p = state.players[playerIndex];
      const selectedIds = choices?.selectedCardInstanceIds || [];
      for (const id of selectedIds.slice(0, 2)) {
        const idx = p.deck.findIndex((c) => c.instanceId === id);
        if (idx !== -1) {
          const [found] = p.deck.splice(idx, 1);
          p.hand.push(found);
        }
      }
      EffectPrimitives.shuffleDeck(state, playerIndex);
      return { success: true, message: 'ใช้ Hilda (โทโกะ) ค้นหาโปเกมอนวิวัฒนาการและพลังงานขึ้นมือสำเร็จ' };
    },
  },

  "team rocket's petrel": {
    nameEn: "Team Rocket's Petrel",
    nameTh: 'แลมป์ดาแห่งแก๊งร็อกเกต',
    subtype: 'Supporter',
    textEn: 'Search your deck for a Trainer card, reveal it, and put it into your hand. Then, shuffle your deck.',
    textTh: 'เลือกการ์ดเทรนเนอร์ 1 ใบจากสำรับการ์ดฝ่ายเรา นำขึ้นมือ แล้วสับสำรับการ์ด',
    choiceType: 'deck-trainer',
    requiresPicker: true,
    canPlay: (state, playerIndex) => {
      if (state.turnNumber === 1 && playerIndex === state.firstPlayerIndex) {
        return { valid: false, error: 'ผู้เล่นคนแรกห้ามใช้ Supporter ในเทิร์นที่ 1' };
      }
      const p = state.players[playerIndex];
      if (p.deck.length === 0) return { valid: false, error: 'ไม่มีการ์ดในสำรับ' };
      return { valid: true };
    },
    execute: (state, playerIndex, _card, choices) => {
      const p = state.players[playerIndex];
      const selectedId = choices?.selectedCardInstanceIds?.[0];
      if (selectedId) {
        const idx = p.deck.findIndex((c) => c.instanceId === selectedId && c.supertype === 'Trainer');
        if (idx !== -1) {
          const [found] = p.deck.splice(idx, 1);
          p.hand.push(found);
        }
      }
      EffectPrimitives.shuffleDeck(state, playerIndex);
      return { success: true, message: "ใช้ Team Rocket's Petrel ค้นหาเทรนเนอร์ขึ้นมือสำเร็จ" };
    },
  },

  'crispin': {
    nameEn: 'Crispin',
    nameTh: 'อาคามัตสึ',
    subtype: 'Supporter',
    textEn: 'Search your deck for up to 2 Basic Energy cards of different types, reveal them, and attach 1 of them to 1 of your Pokémon. Put the other card into your hand. Then, shuffle your deck.',
    textTh: 'เลือกการ์ดพลังงานพื้นฐานต่างประเภทกันได้สูงสุด 2 ใบจากสำรับ ติด 1 ใบให้โปเกมอนฝ่ายเรา และนำอีก 1 ใบขึ้นมือ แล้วสับสำรับ',
    choiceType: 'deck-two-energies-diff-types',
    requiresPicker: true,
    canPlay: (state, playerIndex) => {
      if (state.turnNumber === 1 && playerIndex === state.firstPlayerIndex) {
        return { valid: false, error: 'ผู้เล่นคนแรกห้ามใช้ Supporter ในเทิร์นที่ 1' };
      }
      const p = state.players[playerIndex];
      if (p.deck.length === 0) return { valid: false, error: 'ไม่มีการ์ดในสำรับ' };
      return { valid: true };
    },
    execute: (state, playerIndex, _card, choices) => {
      const p = state.players[playerIndex];
      const selectedIds = choices?.selectedCardInstanceIds || [];
      const targetId = choices?.targetPokemonInstanceId;
      const target = [p.active, ...p.bench].find((b) => b && b.instanceId === targetId) || p.active;

      if (selectedIds.length > 0) {
        const [attId, ...handIds] = selectedIds;
        const attIdx = p.deck.findIndex((c) => c.instanceId === attId && c.supertype === 'Energy');
        if (attIdx !== -1 && target) {
          const [energy] = p.deck.splice(attIdx, 1);
          target.attachedEnergies.push(energy);
        }
        for (const hId of handIds.slice(0, 1)) {
          const hIdx = p.deck.findIndex((c) => c.instanceId === hId && c.supertype === 'Energy');
          if (hIdx !== -1) {
            const [energy] = p.deck.splice(hIdx, 1);
            p.hand.push(energy);
          }
        }
      }
      EffectPrimitives.shuffleDeck(state, playerIndex);
      return { success: true, message: 'ใช้ Crispin (อาคามัตสึ) ติดพลังงานและค้นหาขึ้นมือสำเร็จ' };
    },
  },

  'dawn': {
    nameEn: 'Dawn',
    nameTh: 'ฮิคาริ',
    subtype: 'Supporter',
    textEn: 'Search your deck for a Basic Pokémon, a Stage 1 Pokémon, and a Stage 2 Pokémon, reveal them, and put them into your hand. Then, shuffle your deck.',
    textTh: 'เลือกการ์ดโปเกมอน [ร่างแรก], [ร่าง 1] และ [ร่าง 2] อย่างละ 1 ใบจากสำรับการ์ด นำขึ้นมือ แล้วสับสำรับ',
    choiceType: 'deck-three-stages',
    requiresPicker: true,
    canPlay: (state, playerIndex) => {
      if (state.turnNumber === 1 && playerIndex === state.firstPlayerIndex) {
        return { valid: false, error: 'ผู้เล่นคนแรกห้ามใช้ Supporter ในเทิร์นที่ 1' };
      }
      const p = state.players[playerIndex];
      if (p.deck.length === 0) return { valid: false, error: 'ไม่มีการ์ดในสำรับ' };
      return { valid: true };
    },
    execute: (state, playerIndex, _card, choices) => {
      const p = state.players[playerIndex];
      const selectedIds = choices?.selectedCardInstanceIds || [];
      for (const id of selectedIds.slice(0, 3)) {
        const idx = p.deck.findIndex((c) => c.instanceId === id && c.supertype === 'Pokemon');
        if (idx !== -1) {
          const [found] = p.deck.splice(idx, 1);
          p.hand.push(found);
        }
      }
      EffectPrimitives.shuffleDeck(state, playerIndex);
      return { success: true, message: 'ใช้ Dawn (ฮิคาริ) ค้นหาโปเกมอน 3 ร่างขึ้นมือสำเร็จ' };
    },
  },

  'cyrano': {
    nameEn: 'Cyrano',
    nameTh: 'ไซยาโน',
    subtype: 'Supporter',
    textEn: 'Search your deck for up to 3 Basic Pokémon ex, reveal them, and put them into your hand. Then, shuffle your deck.',
    textTh: 'เลือกการ์ดโปเกมอน [ร่างแรก] ex ได้สูงสุด 3 ใบจากสำรับการ์ด นำขึ้นมือ แล้วสับสำรับ',
    choiceType: 'deck-pokemon-ex',
    requiresPicker: true,
    canPlay: (state, playerIndex) => {
      if (state.turnNumber === 1 && playerIndex === state.firstPlayerIndex) {
        return { valid: false, error: 'ผู้เล่นคนแรกห้ามใช้ Supporter ในเทิร์นที่ 1' };
      }
      const p = state.players[playerIndex];
      if (p.deck.length === 0) return { valid: false, error: 'ไม่มีการ์ดในสำรับ' };
      return { valid: true };
    },
    execute: (state, playerIndex, _card, choices) => {
      const p = state.players[playerIndex];
      const selectedIds = choices?.selectedCardInstanceIds || [];
      for (const id of selectedIds.slice(0, 3)) {
        const idx = p.deck.findIndex((c) => c.instanceId === id);
        if (idx !== -1) {
          const [found] = p.deck.splice(idx, 1);
          p.hand.push(found);
        }
      }
      EffectPrimitives.shuffleDeck(state, playerIndex);
      return { success: true, message: 'ใช้ Cyrano ค้นหาโปเกมอน ex ขึ้นมือสำเร็จ' };
    },
  },

  'colress’s tenacity': {
    nameEn: "Colress's Tenacity",
    nameTh: 'จิตยึดติดของอโครมา',
    subtype: 'Supporter',
    textEn: 'Search your deck for a Stadium card and an Energy card, reveal them, and put them into your hand. Then, shuffle your deck.',
    textTh: 'เลือกการ์ดสเตเดียม 1 ใบ และการ์ดพลังงาน 1 ใบจากสำรับการ์ด นำขึ้นมือ แล้วสับสำรับ',
    choiceType: 'deck-stadium-and-energy',
    requiresPicker: true,
    canPlay: (state, playerIndex) => {
      if (state.turnNumber === 1 && playerIndex === state.firstPlayerIndex) {
        return { valid: false, error: 'ผู้เล่นคนแรกห้ามใช้ Supporter ในเทิร์นที่ 1' };
      }
      const p = state.players[playerIndex];
      if (p.deck.length === 0) return { valid: false, error: 'ไม่มีการ์ดในสำรับ' };
      return { valid: true };
    },
    execute: (state, playerIndex, _card, choices) => {
      const p = state.players[playerIndex];
      const selectedIds = choices?.selectedCardInstanceIds || [];
      for (const id of selectedIds.slice(0, 2)) {
        const idx = p.deck.findIndex((c) => c.instanceId === id);
        if (idx !== -1) {
          const [found] = p.deck.splice(idx, 1);
          p.hand.push(found);
        }
      }
      EffectPrimitives.shuffleDeck(state, playerIndex);
      return { success: true, message: "ใช้ Colress's Tenacity ค้นหาสเตเดียมและพลังงานขึ้นมือสำเร็จ" };
    },
  },

  'carmine': {
    nameEn: 'Carmine',
    nameTh: 'เซย์ยุ',
    subtype: 'Supporter',
    textEn: 'If you go first, you can use this card on your first turn. Discard your hand and draw 5 cards.',
    textTh: 'ถ้าเราเป็นผู้เล่นคนแรก สามารถใช้การ์ดนี้ในเทิร์นแรกของเราได้ ทิ้งการ์ดบนมือทั้งหมดและจั่วการ์ด 5 ใบ',
    choiceType: 'none',
    requiresPicker: false,
    canPlay: () => ({ valid: true }),
    execute: (state, playerIndex) => {
      const p = state.players[playerIndex];
      const cards = p.hand.splice(0, p.hand.length);
      p.discard.push(...cards);
      EffectPrimitives.drawCards(state, playerIndex, 5);
      return { success: true, message: 'ใช้ Carmine ทิ้งการ์ดบนมือทั้งหมดและจั่วการ์ด 5 ใบ' };
    },
  },

  "lana's aid": {
    nameEn: "Lana's Aid",
    nameTh: 'การปรนนิบัติของซุยเรน',
    subtype: 'Supporter',
    textEn: "Put up to 3 in any combination of Pokémon that don't have a Rule Box and Basic Energy cards from your discard pile into your hand.",
    textTh: 'เลือกการ์ดโปเกมอนที่ไม่มี [กฎพิเศษ] และการ์ดพลังงานพื้นฐานรวมกันได้สูงสุด 3 ใบจากตำแหน่งทิ้งการ์ด นำขึ้นมือ',
    choiceType: 'discard-non-rulebox-or-energy-to-hand',
    requiresPicker: true,
    canPlay: (state, playerIndex) => {
      if (state.turnNumber === 1 && playerIndex === state.firstPlayerIndex) {
        return { valid: false, error: 'ผู้เล่นคนแรกห้ามใช้ Supporter ในเทิร์นที่ 1' };
      }
      const p = state.players[playerIndex];
      const hasEligible = p.discard.some((c) => (c.supertype === 'Pokemon' && !hasRuleBox(c)) || c.supertype === 'Energy');
      if (!hasEligible) return { valid: false, error: 'ไม่มีโปเกมอน (ไม่มี Rule Box) หรือพลังงานใน Discard Pile' };
      return { valid: true };
    },
    execute: (state, playerIndex, _card, choices) => {
      const selectedIds = choices?.selectedCardInstanceIds || [];
      if (selectedIds.length > 0) {
        EffectPrimitives.recoverFromDiscardToHand(state, playerIndex, selectedIds.slice(0, 3));
      }
      return { success: true, message: "ใช้ Lana's Aid กู้การ์ดขึ้นมือสำเร็จ" };
    },
  },

  'kieran': {
    nameEn: 'Kieran',
    nameTh: 'ซุกุริ',
    subtype: 'Supporter',
    textEn: 'Choose 1: Switch your Active Pokémon with 1 of your Benched Pokémon; or during this turn, attacks used by your Pokémon do 30 more damage to your opponent’s Active Pokémon ex and Pokémon V.',
    textTh: 'เลือก 1 อย่าง: สลับโปเกมอนบนตำแหน่งต่อสู้ของเรากับโปเกมอนบนเบนช์; หรือในเทิร์นนี้ ท่าโจมตีของฝ่ายเราจะทำแดเมจเพิ่มขึ้น 30 กับโปเกมอน ex และโปเกมอน V ของฝ่ายตรงข้าม',
    choiceType: 'kieran-choice',
    requiresPicker: true,
    canPlay: (state, playerIndex) => {
      if (state.turnNumber === 1 && playerIndex === state.firstPlayerIndex) {
        return { valid: false, error: 'ผู้เล่นคนแรกห้ามใช้ Supporter ในเทิร์นที่ 1' };
      }
      return { valid: true };
    },
    execute: (state, playerIndex, _card, choices) => {
      const p = state.players[playerIndex];
      if (choices?.playerBenchIndex !== undefined) {
        EffectPrimitives.switchActiveWithBench(state, playerIndex, choices.playerBenchIndex);
        return { success: true, message: 'ใช้ Kieran สลับตำแหน่งโปเกมอนสำเร็จ' };
      }
      p.turnFlags.exAttackBonus = (p.turnFlags.exAttackBonus || 0) + 30;
      return { success: true, message: 'ใช้ Kieran เพิ่มแดเมจ 30 ใส่โปเกมอน ex / V ในเทิร์นนี้' };
    },
  },

  'briar': {
    nameEn: 'Briar',
    nameTh: 'ไบรอาร์',
    subtype: 'Supporter',
    textEn: 'You can play this card only if your opponent has exactly 2 Prize cards remaining. During this turn, if your opponent’s Active Pokémon is Knocked Out by damage from an attack used by your Tera Pokémon, take 1 more Prize card.',
    textTh: 'การ์ดนี้จะใช้ได้เฉพาะเมื่อการ์ดรางวัลที่เหลือของฝ่ายตรงข้ามมี 2 ใบพอดี ในเทิร์นนี้ หากโปเกมอนตัวหน้าของฝ่ายตรงข้ามถูก KO ด้วยแดเมจจากโปเกมอนเทรัสตัลฝ่ายเรา หยิบการ์ดรางวัลเพิ่มอีก 1 ใบ',
    choiceType: 'none',
    requiresPicker: false,
    canPlay: (state, playerIndex) => {
      if (state.turnNumber === 1 && playerIndex === state.firstPlayerIndex) {
        return { valid: false, error: 'ผู้เล่นคนแรกห้ามใช้ Supporter ในเทิร์นที่ 1' };
      }
      const oppIdx = playerIndex === 0 ? 1 : 0;
      const opp = state.players[oppIdx];
      if (opp.prizes.length !== 2) {
        return { valid: false, error: `Briar ใช้ได้เฉพาะเมื่อฝ่ายตรงข้ามเหลือรางวัล 2 ใบพอดี (ปัจจุบันเหลือ ${opp.prizes.length} ใบ)` };
      }
      return { valid: true };
    },
    execute: (state, playerIndex) => {
      const p = state.players[playerIndex];
      p.turnFlags.extraPrizeOnKo = true;
      return { success: true, message: 'ใช้ Briar! หากโปเกมอนเทรัสตัล KO คู่แข่งในเทิร์นนี้ จะหยิบรางวัลเพิ่มอีก 1 ใบ' };
    },
  },

  "gladion's final battle": {
    nameEn: "Gladion's Final Battle",
    nameTh: 'ศึกชี้ชะตาของกลาดิโอ',
    subtype: 'Supporter',
    textEn: "You can use this card only when it is the last card in your hand. During this turn, attacks used by your Pokémon that don't have a Rule Box do 80 more damage to your opponent's Active Pokémon (before applying Weakness and Resistance).",
    textTh: 'การ์ดนี้จะใช้ได้เฉพาะเมื่อเป็นการ์ดใบสุดท้ายบนมือเรา ในเทิร์นนี้ ท่าโจมตีของโปเกมอนที่ไม่มี [กฎพิเศษ] ฝ่ายเราจะทำแดเมจเพิ่มขึ้น 80',
    choiceType: 'none',
    requiresPicker: false,
    canPlay: (state, playerIndex, card) => {
      if (state.turnNumber === 1 && playerIndex === state.firstPlayerIndex) {
        return { valid: false, error: 'ผู้เล่นคนแรกห้ามใช้ Supporter ในเทิร์นที่ 1' };
      }
      const p = state.players[playerIndex];
      if (p.hand.length !== 1 || p.hand[0].instanceId !== card.instanceId) {
        return { valid: false, error: `Gladion's Final Battle ใช้ได้เฉพาะเมื่อเป็นการ์ดใบสุดท้ายบนมือ (ปัจจุบันมี ${p.hand.length} ใบ)` };
      }
      return { valid: true };
    },
    execute: (state, playerIndex) => {
      const p = state.players[playerIndex];
      p.turnFlags.nonRuleBoxAttackBonus = (p.turnFlags.nonRuleBoxAttackBonus || 0) + 80;
      return { success: true, message: "ใช้ Gladion's Final Battle เพิ่มแดเมจโปเกมอนธรรมดา +80 ในเทิร์นนี้!" };
    },
  },

  'judge': {
    nameEn: 'Judge',
    nameTh: 'ผู้ตัดสิน',
    subtype: 'Supporter',
    textEn: 'Each player shuffles their hand into their deck and draws 4 cards.',
    textTh: 'ผู้เล่นทั้งสองฝ่ายสับการ์ดบนมือทั้งหมดกลับเข้าสำรับ แล้วจั่วคนละ 4 ใบ',
    choiceType: 'none',
    requiresPicker: false,
    canPlay: (state, playerIndex) => {
      if (state.turnNumber === 1 && playerIndex === state.firstPlayerIndex) {
        return { valid: false, error: 'ผู้เล่นคนแรกห้ามใช้ Supporter ในเทิร์นที่ 1' };
      }
      return { valid: true };
    },
    execute: (state, playerIndex) => {
      const oppIdx = playerIndex === 0 ? 1 : 0;
      EffectPrimitives.shuffleHandToBottom(state, playerIndex);
      EffectPrimitives.shuffleDeck(state, playerIndex);
      EffectPrimitives.drawCards(state, playerIndex, 4);

      EffectPrimitives.shuffleHandToBottom(state, oppIdx);
      EffectPrimitives.shuffleDeck(state, oppIdx);
      EffectPrimitives.drawCards(state, oppIdx, 4);
      return { success: true, message: 'ใช้ Judge! สับการ์ดบนมือทั้งสองฝ่ายแล้วจั่วคนละ 4 ใบ' };
    },
  },

  "professor's research": {
    nameEn: "Professor's Research",
    nameTh: 'การวิจัยของศาสตราจารย์',
    subtype: 'Supporter',
    textEn: 'Discard your hand and draw 7 cards.',
    textTh: 'ทิ้งการ์ดบนมือทั้งหมดและจั่วการ์ด 7 ใบ',
    choiceType: 'none',
    requiresPicker: false,
    canPlay: (state, playerIndex) => {
      if (state.turnNumber === 1 && playerIndex === state.firstPlayerIndex) {
        return { valid: false, error: 'ผู้เล่นคนแรกห้ามใช้ Supporter ในเทิร์นที่ 1' };
      }
      return { valid: true };
    },
    execute: (state, playerIndex) => {
      const p = state.players[playerIndex];
      const cards = p.hand.splice(0, p.hand.length);
      p.discard.push(...cards);
      EffectPrimitives.drawCards(state, playerIndex, 7);
      return { success: true, message: "ใช้ Professor's Research จั่วการ์ด 7 ใบ" };
    },
  },

  'iono': {
    nameEn: 'Iono',
    nameTh: 'นันจาโม',
    subtype: 'Supporter',
    textEn: 'Each player shuffles their hand and puts it on the bottom of their deck. If either player put any cards on the bottom of their deck in this way, each player draws a card for each of their remaining Prize cards.',
    textTh: 'ผู้เล่นทั้งสองฝ่ายสับการ์ดบนมือแล้วนำไปวางไว้ใต้สำรับการ์ด จากนั้นจั่วการ์ดตามจำนวนการ์ดรางวัลที่เหลืออยู่ของตนเอง',
    choiceType: 'none',
    requiresPicker: false,
    canPlay: (state, playerIndex) => {
      if (state.turnNumber === 1 && playerIndex === state.firstPlayerIndex) {
        return { valid: false, error: 'ผู้เล่นคนแรกห้ามใช้ Supporter ในเทิร์นที่ 1' };
      }
      return { valid: true };
    },
    execute: (state, playerIndex) => {
      const oppIdx = playerIndex === 0 ? 1 : 0;
      const p = state.players[playerIndex];
      const opp = state.players[oppIdx];

      EffectPrimitives.shuffleHandToBottom(state, playerIndex);
      EffectPrimitives.shuffleHandToBottom(state, oppIdx);

      EffectPrimitives.drawCards(state, playerIndex, p.prizes.length);
      EffectPrimitives.drawCards(state, oppIdx, opp.prizes.length);
      return { success: true, message: `ใช้ Iono! คุณจั่ว ${p.prizes.length} ใบ, ฝ่ายตรงข้ามจั่ว ${opp.prizes.length} ใบ` };
    },
  },

  "morty's conviction": {
    nameEn: "Morty's Conviction",
    nameTh: 'ความมั่นใจของมัตสึบะ',
    subtype: 'Supporter',
    textEn: "You must discard another card from your hand in order to play this card. Draw a card for each of your opponent’s Benched Pokémon.",
    textTh: 'ต้องทิ้งการ์ดบนมือเรา 1 ใบจึงจะใช้ได้ จั่วการ์ดตามจำนวนโปเกมอนบนเบนช์ของฝ่ายตรงข้าม',
    choiceType: 'hand-discard-draw',
    requiresPicker: true,
    canPlay: (state, playerIndex, card) => {
      if (state.turnNumber === 1 && playerIndex === state.firstPlayerIndex) {
        return { valid: false, error: 'ผู้เล่นคนแรกห้ามใช้ Supporter ในเทิร์นที่ 1' };
      }
      const p = state.players[playerIndex];
      const otherHand = p.hand.filter((c) => c.instanceId !== card.instanceId);
      if (otherHand.length < 1) return { valid: false, error: 'ต้องมีการ์ดบนมืออีกอย่างน้อย 1 ใบเพื่อทิ้งเป็นค่าร่าย' };
      return { valid: true };
    },
    execute: (state, playerIndex, _card, choices) => {
      if (choices?.discardCardInstanceIds?.[0]) {
        EffectPrimitives.discardFromHand(state, playerIndex, [choices.discardCardInstanceIds[0]]);
      }
      const oppIdx = playerIndex === 0 ? 1 : 0;
      const opp = state.players[oppIdx];
      const benchedCount = opp.bench.filter((b) => b !== null).length;
      EffectPrimitives.drawCards(state, playerIndex, benchedCount);
      return { success: true, message: `ใช้ Morty's Conviction จั่วการ์ด ${benchedCount} ใบ` };
    },
  },

  "explorer's guidance": {
    nameEn: "Explorer's Guidance",
    nameTh: 'การนำทางของนักสำรวจ',
    subtype: 'Supporter',
    textEn: 'Look at the top 6 cards of your deck and put 2 of them into your hand. Discard the other cards.',
    textTh: 'ดูการ์ด 6 ใบบนสุดของสำรับ เลือก 2 ใบนำขึ้นมือ ทิ้งการ์ดที่เหลือลงตำแหน่งทิ้งการ์ด',
    choiceType: 'hand-discard-draw',
    requiresPicker: true,
    canPlay: (state, playerIndex) => {
      if (state.turnNumber === 1 && playerIndex === state.firstPlayerIndex) {
        return { valid: false, error: 'ผู้เล่นคนแรกห้ามใช้ Supporter ในเทิร์นที่ 1' };
      }
      const p = state.players[playerIndex];
      if (p.deck.length === 0) return { valid: false, error: 'ไม่มีการ์ดในสำรับ' };
      return { valid: true };
    },
    execute: (state, playerIndex, _card, choices) => {
      const p = state.players[playerIndex];
      const selectedIds = choices?.selectedCardInstanceIds || [];
      const top6 = p.deck.splice(0, Math.min(6, p.deck.length));
      for (const id of selectedIds.slice(0, 2)) {
        const idx = top6.findIndex((c) => c.instanceId === id);
        if (idx !== -1) {
          const [chosen] = top6.splice(idx, 1);
          p.hand.push(chosen);
        }
      }
      p.discard.push(...top6);
      return { success: true, message: "ใช้ Explorer's Guidance นำการ์ด 2 ใบขึ้นมือและทิ้งการ์ดที่เหลือ" };
    },
  },

  'gwynn': {
    nameEn: 'Gwynn',
    nameTh: 'มูคุ',
    subtype: 'Supporter',
    textEn: "Discard up to 2 Pokémon that don't have a Rule Box from your hand, and draw 3 cards for each card you discarded in this way.",
    textTh: 'ทิ้งการ์ดโปเกมอนที่ไม่มี [กฎพิเศษ] จากบนมือได้สูงสุด 2 ใบ และจั่วการ์ด 3 ใบต่อการ์ดแต่ละใบที่ทิ้ง',
    choiceType: 'hand-discard-draw',
    requiresPicker: true,
    canPlay: (state, playerIndex, card) => {
      if (state.turnNumber === 1 && playerIndex === state.firstPlayerIndex) {
        return { valid: false, error: 'ผู้เล่นคนแรกห้ามใช้ Supporter ในเทิร์นที่ 1' };
      }
      const p = state.players[playerIndex];
      const nonRuleBox = p.hand.filter((c) => c.instanceId !== card.instanceId && c.supertype === 'Pokemon' && !hasRuleBox(c));
      if (nonRuleBox.length === 0) return { valid: false, error: 'ไม่มีโปเกมอนที่ไม่มี Rule Box บนมือสำหรับทิ้ง' };
      return { valid: true };
    },
    execute: (state, playerIndex, _card, choices) => {
      const selectedIds = choices?.selectedCardInstanceIds || [];
      const count = Math.min(2, selectedIds.length);
      if (count > 0) {
        EffectPrimitives.discardFromHand(state, playerIndex, selectedIds.slice(0, 2));
        EffectPrimitives.drawCards(state, playerIndex, count * 3);
        return { success: true, message: `ใช้ Gwynn ทิ้งโปเกมอน ${count} ใบและจั่วการ์ด ${count * 3} ใบ` };
      }
      return { success: true, message: 'ใช้ Gwynn' };
    },
  },

  'pokémon center lady': {
    nameEn: 'Pokémon Center Lady',
    nameTh: 'พี่สาวแห่งโปเกมอนเซ็นเตอร์',
    subtype: 'Supporter',
    textEn: 'Heal 60 damage and remove all Special Conditions from 1 of your Pokémon.',
    textTh: 'ฟื้นฟู HP 60 และรักษาอาการผิดปกติทั้งหมดให้กับโปเกมอนฝ่ายเรา 1 ตัว',
    choiceType: 'heal-target',
    requiresPicker: true,
    canPlay: (state, playerIndex) => {
      if (state.turnNumber === 1 && playerIndex === state.firstPlayerIndex) {
        return { valid: false, error: 'ผู้เล่นคนแรกห้ามใช้ Supporter ในเทิร์นที่ 1' };
      }
      return { valid: true };
    },
    execute: (state, playerIndex, _card, choices) => {
      const p = state.players[playerIndex];
      const targetId = choices?.targetPokemonInstanceId;
      const target = [p.active, ...p.bench].find((b) => b && b.instanceId === targetId) || p.active;
      if (target) {
        EffectPrimitives.healDamage(target, 60);
        target.specialConditions = [];
        return { success: true, message: `ใช้ Pokémon Center Lady รักษา ${getCardDisplayName(target.card)} สำเร็จ` };
      }
      return { success: true, message: 'ใช้ Pokémon Center Lady' };
    },
  },

  "rosa's encouragement": {
    nameEn: "Rosa's Encouragement",
    nameTh: 'กำลังใจจากเม',
    subtype: 'Supporter',
    textEn: 'You can play this card only if 1 of your Pokémon was Knocked Out during your opponent’s last turn. Search your deck for a Pokémon, a Trainer card, and an Energy card, reveal them, and put them into your hand. Then, shuffle your deck.',
    textTh: 'ใช้ได้เฉพาะเมื่อโปเกมอนเราถูก KO ในเทิร์นที่แล้วของคู่แข่ง เลือกการ์ดโปเกมอน 1 ใบ, การ์ดเทรนเนอร์ 1 ใบ และการ์ดพลังงาน 1 ใบจากสำรับ นำขึ้นมือ แล้วสับสำรับ',
    choiceType: 'deck-trainer',
    requiresPicker: true,
    canPlay: (state, playerIndex) => {
      if (state.turnNumber === 1 && playerIndex === state.firstPlayerIndex) {
        return { valid: false, error: 'ผู้เล่นคนแรกห้ามใช้ Supporter ในเทิร์นที่ 1' };
      }
      const p = state.players[playerIndex];
      if (!p.turnFlags.pokemonKnockedOutLastTurn) {
        return { valid: false, error: "Rosa's Encouragement ใช้ได้เฉพาะเมื่อโปเกมอนฝ่ายเราถูก KO ในเทิร์นที่แล้วของคู่แข่ง" };
      }
      return { valid: true };
    },
    execute: (state, playerIndex, _card, choices) => {
      const p = state.players[playerIndex];
      const selectedIds = choices?.selectedCardInstanceIds || [];
      for (const id of selectedIds.slice(0, 3)) {
        const idx = p.deck.findIndex((c) => c.instanceId === id);
        if (idx !== -1) {
          const [found] = p.deck.splice(idx, 1);
          p.hand.push(found);
        }
      }
      EffectPrimitives.shuffleDeck(state, playerIndex);
      return { success: true, message: "ใช้ Rosa's Encouragement ค้นหาการ์ด 3 ใบขึ้นมือสำเร็จ" };
    },
  },

  'surfer': {
    nameEn: 'Surfer',
    nameTh: 'นักโต้คลื่น',
    subtype: 'Supporter',
    textEn: 'Switch your Active Pokémon with 1 of your Benched Pokémon. Then, draw cards until you have 5 cards in your hand.',
    textTh: 'สลับโปเกมอนบนตำแหน่งต่อสู้กับโปเกมอนบนเบนช์ จากนั้นจั่วการ์ดจนกระทั่งมีการ์ดบนมือ 5 ใบ',
    choiceType: 'switch-active-bench',
    requiresPicker: true,
    canPlay: (state, playerIndex) => {
      if (state.turnNumber === 1 && playerIndex === state.firstPlayerIndex) {
        return { valid: false, error: 'ผู้เล่นคนแรกห้ามใช้ Supporter ในเทิร์นที่ 1' };
      }
      const p = state.players[playerIndex];
      if (!p.bench.some((b) => b !== null)) return { valid: false, error: 'ไม่มีโปเกมอนบน Bench ให้สลับตำแหน่ง' };
      return { valid: true };
    },
    execute: (state, playerIndex, _card, choices) => {
      if (choices?.playerBenchIndex !== undefined) {
        EffectPrimitives.switchActiveWithBench(state, playerIndex, choices.playerBenchIndex);
      }
      const p = state.players[playerIndex];
      if (p.hand.length < 5) {
        EffectPrimitives.drawCards(state, playerIndex, 5 - p.hand.length);
      }
      return { success: true, message: 'ใช้ Surfer สลับตำแหน่งและจั่วการ์ดจนครบ 5 ใบ' };
    },
  },

  "az's tranquility": {
    nameEn: "AZ's Tranquility",
    nameTh: 'ความสงบของ AZ',
    subtype: 'Supporter',
    textEn: 'Put 1 of your Pokémon into your hand. (Discard all attached cards.)',
    textTh: 'นำโปเกมอนบนสนามฝ่ายเรา 1 ตัวกลับขึ้นมือ (ทิ้งการ์ดที่ติดอยู่ทั้งหมดลงตำแหน่งทิ้งการ์ด)',
    choiceType: 'return-to-hand',
    requiresPicker: true,
    canPlay: (state, playerIndex) => {
      if (state.turnNumber === 1 && playerIndex === state.firstPlayerIndex) {
        return { valid: false, error: 'ผู้เล่นคนแรกห้ามใช้ Supporter ในเทิร์นที่ 1' };
      }
      const p = state.players[playerIndex];
      const allPokemon = [p.active, ...p.bench].filter((b): b is PokemonInPlay => b !== null);
      if (allPokemon.length <= 1) return { valid: false, error: 'ต้องมีโปเกมอนตัวอื่นเหลืออยู่บนสนาม ไม่สามารถยกโปเกมอนตัวเดียวที่เหลืออยู่ได้' };
      return { valid: true };
    },
    execute: (state, playerIndex, _card, choices) => {
      const p = state.players[playerIndex];
      const targetId = choices?.targetPokemonInstanceId;
      const bIdx = p.bench.findIndex((b) => b && b.instanceId === targetId);
      if (bIdx !== -1) {
        const b = p.bench[bIdx]!;
        p.discard.push(...b.attachedEnergies);
        if (b.attachedTool) p.discard.push(b.attachedTool);
        p.hand.push(b.card);
        p.bench[bIdx] = null;
        return { success: true, message: `ใช้ AZ's Tranquility นำ ${b.card.nameEn} กลับขึ้นมือสำเร็จ` };
      }
      return { success: true, message: "ใช้ AZ's Tranquility" };
    },
  },

  "janine's secret art": {
    nameEn: "Janine's Secret Art",
    nameTh: 'เทคนิคลับของอันสุ',
    subtype: 'Supporter',
    textEn: 'Choose up to 2 of your Darkness Pokémon. For each of those Pokémon, search your discard pile for a Basic Darkness Energy card and attach it to that Pokémon. If you attached Energy to a Pokémon in this way, put 2 damage counters on that Pokémon.',
    textTh: 'เลือกโปเกมอน [ความมืด] ฝ่ายเราได้สูงสุด 2 ตัว ติดพลังงานความมืดพื้นฐานจากตำแหน่งทิ้งการ์ดให้ตัวละ 1 ใบ จากนั้นวางแดเมจเคาน์เตอร์ตัวละ 2 ตัว',
    choiceType: 'attach-from-discard',
    requiresPicker: true,
    canPlay: (state, playerIndex) => {
      if (state.turnNumber === 1 && playerIndex === state.firstPlayerIndex) {
        return { valid: false, error: 'ผู้เล่นคนแรกห้ามใช้ Supporter ในเทิร์นที่ 1' };
      }
      const p = state.players[playerIndex];
      const hasDarkPokemon = [p.active, ...p.bench].some((b) => b && b.card.energyType === 'Darkness');
      if (!hasDarkPokemon) return { valid: false, error: 'ไม่มีโปเกมอนความมืดบนสนาม' };
      const hasDarkEnergy = p.discard.some((c) => c.supertype === 'Energy' && c.energyType === 'Darkness');
      if (!hasDarkEnergy) return { valid: false, error: 'ไม่มีพลังงานมืดใน Discard Pile' };
      return { valid: true };
    },
    execute: (state, playerIndex) => {
      const p = state.players[playerIndex];
      const darkPokemon = [p.active, ...p.bench].filter((b): b is PokemonInPlay => b !== null && b.card.energyType === 'Darkness');
      for (const poke of darkPokemon.slice(0, 2)) {
        const eIdx = p.discard.findIndex((c) => c.supertype === 'Energy' && c.energyType === 'Darkness');
        if (eIdx !== -1) {
          const [energy] = p.discard.splice(eIdx, 1);
          poke.attachedEnergies.push(energy);
          poke.damageCounters += 2;
        }
      }
      return { success: true, message: "ใช้ Janine's Secret Art ติดพลังงานมืดและวางแดเมจเคาน์เตอร์สำเร็จ" };
    },
  },

  "black belt's training": {
    nameEn: "Black Belt's Training",
    nameTh: 'การฝึกซ้อมของโปรคาราเต้',
    subtype: 'Supporter',
    textEn: "During this turn, attacks used by your Fighting Pokémon do 40 more damage to your opponent's Active Pokémon (before applying Weakness and Resistance).",
    textTh: 'ในเทิร์นนี้ แดเมจของท่าต่อสู้ที่โปเกมอน [ต่อสู้] ฝ่ายเราทำกับโปเกมอนบนตำแหน่งต่อสู้ของคู่แข่งจะถูก [+40]',
    choiceType: 'none',
    requiresPicker: false,
    canPlay: (state, playerIndex) => {
      if (state.turnNumber === 1 && playerIndex === state.firstPlayerIndex) {
        return { valid: false, error: 'ผู้เล่นคนแรกห้ามใช้ Supporter ในเทิร์นที่ 1' };
      }
      return { valid: true };
    },
    execute: (state, playerIndex) => {
      const p = state.players[playerIndex];
      p.turnFlags.fightingAttackBonus = (p.turnFlags.fightingAttackBonus || 0) + 40;
      return { success: true, message: "ใช้ Black Belt's Training เพิ่มแดเมจของโปเกมอนต่อสู้อีก +40 ในเทิร์นนี้" };
    },
  },

  // =========================================================================
  // 3. POKÉMON TOOLS
  // =========================================================================

  "hero's cape": {
    nameEn: "Hero's Cape",
    nameTh: 'ผ้าคลุมฮีโร่',
    subtype: 'Pokémon Tool',
    isAceSpec: true,
    textEn: 'The Pokémon this card is attached to gets +100 HP.',
    textTh: 'โปเกมอนที่ติดการ์ดนี้อยู่ HP สูงสุดจะถูก [+100]',
    choiceType: 'attach-tool',
    requiresPicker: true,
    canPlay: (state, playerIndex) => {
      const p = state.players[playerIndex];
      const hasSlot = [p.active, ...p.bench].some((b) => b && b.attachedTool === null);
      if (!hasSlot) return { valid: false, error: 'ไม่มีโปเกมอนที่ว่างสำหรับการติด Tool' };
      return { valid: true };
    },
    execute: (state, playerIndex, card, choices) => {
      const p = state.players[playerIndex];
      const targetId = choices?.targetPokemonInstanceId;
      const target = [p.active, ...p.bench].find((b) => b && b.instanceId === targetId && b.attachedTool === null) || [p.active, ...p.bench].find((b) => b && b.attachedTool === null);
      if (target) {
        target.attachedTool = card;
        target.maxHp += 100;
        return { success: true, message: `ติด Hero's Cape ให้ ${getCardDisplayName(target.card)} (+100 HP)` };
      }
      return { success: false, error: 'ไม่พบเป้าหมายที่ติด Tool ได้' };
    },
  },

  'binding mochi': {
    nameEn: 'Binding Mochi',
    nameTh: 'โมจิผูกมัด',
    subtype: 'Pokémon Tool',
    textEn: "If the Pokémon this card is attached to is Poisoned, its attacks do 40 more damage to your opponent's Active Pokémon (before applying Weakness and Resistance).",
    textTh: 'ถ้าโปเกมอนที่ติดการ์ดนี้อยู่ติดสภาวะ [พิษ] ท่าโจมตีจะทำแดเมจเพิ่มขึ้น 40',
    choiceType: 'attach-tool',
    requiresPicker: true,
    canPlay: (state, playerIndex) => {
      const p = state.players[playerIndex];
      const hasSlot = [p.active, ...p.bench].some((b) => b && b.attachedTool === null);
      if (!hasSlot) return { valid: false, error: 'ไม่มีโปเกมอนที่ว่างสำหรับการติด Tool' };
      return { valid: true };
    },
    execute: (state, playerIndex, card, choices) => {
      const p = state.players[playerIndex];
      const targetId = choices?.targetPokemonInstanceId;
      const target = [p.active, ...p.bench].find((b) => b && b.instanceId === targetId && b.attachedTool === null) || [p.active, ...p.bench].find((b) => b && b.attachedTool === null);
      if (target) {
        target.attachedTool = card;
        return { success: true, message: `ติด Binding Mochi ให้ ${getCardDisplayName(target.card)}` };
      }
      return { success: false, error: 'ไม่พบเป้าหมาย' };
    },
  },

  'air balloon': {
    nameEn: 'Air Balloon',
    nameTh: 'บอลลูนลอยฟ้า',
    subtype: 'Pokémon Tool',
    textEn: 'The Retreat Cost of the Pokémon this card is attached to is 2 less.',
    textTh: 'พลังงานสำหรับถอยหนีของโปเกมอนที่ติดการ์ดนี้อยู่จะลดลง 2 ลูก',
    choiceType: 'attach-tool',
    requiresPicker: true,
    canPlay: (state, playerIndex) => {
      const p = state.players[playerIndex];
      const hasSlot = [p.active, ...p.bench].some((b) => b && b.attachedTool === null);
      if (!hasSlot) return { valid: false, error: 'ไม่มีโปเกมอนที่ว่างสำหรับการติด Tool' };
      return { valid: true };
    },
    execute: (state, playerIndex, card, choices) => {
      const p = state.players[playerIndex];
      const targetId = choices?.targetPokemonInstanceId;
      const target = [p.active, ...p.bench].find((b) => b && b.instanceId === targetId && b.attachedTool === null) || [p.active, ...p.bench].find((b) => b && b.attachedTool === null);
      if (target) {
        target.attachedTool = card;
        return { success: true, message: `ติด Air Balloon ให้ ${getCardDisplayName(target.card)} (ลด Retreat Cost -2)` };
      }
      return { success: false, error: 'ไม่พบเป้าหมาย' };
    },
  },

  "cynthia's power weight": {
    nameEn: "Cynthia's Power Weight",
    nameTh: 'เวทเทรนนิ่งของชิโรนะ',
    subtype: 'Pokémon Tool',
    textEn: "The Garchomp ex or Cynthia's Pokémon this card is attached to gets +70 HP.",
    textTh: 'หากติดการ์ดนี้กับ Garchomp ex หรือ [โปเกมอนของชิโรนะ] HP สูงสุดจะถูก [+70]',
    choiceType: 'attach-tool',
    requiresPicker: true,
    canPlay: (state, playerIndex) => {
      const p = state.players[playerIndex];
      const hasSlot = [p.active, ...p.bench].some((b) => b && b.attachedTool === null);
      if (!hasSlot) return { valid: false, error: 'ไม่มีโปเกมอนที่ว่างสำหรับการติด Tool' };
      return { valid: true };
    },
    execute: (state, playerIndex, card, choices) => {
      const p = state.players[playerIndex];
      const targetId = choices?.targetPokemonInstanceId;
      const target = [p.active, ...p.bench].find((b) => b && b.instanceId === targetId && b.attachedTool === null) || [p.active, ...p.bench].find((b) => b && b.attachedTool === null);
      if (target) {
        target.attachedTool = card;
        const name = (target.card.nameEn || '').toLowerCase();
        if (name.includes('garchomp') || name.includes("cynthia's")) {
          target.maxHp += 70;
        }
        return { success: true, message: `ติด Cynthia's Power Weight ให้ ${getCardDisplayName(target.card)}` };
      }
      return { success: false, error: 'ไม่พบเป้าหมาย' };
    },
  },

  // =========================================================================
  // 4. STADIUMS
  // =========================================================================

  'grand tree': {
    nameEn: 'Grand Tree',
    nameTh: 'แกรนด์ทรี',
    subtype: 'Stadium',
    isAceSpec: true,
    textEn: "Once during each player's turn, that player may search their deck for a Stage 1 Pokémon that evolves from 1 of their Basic Pokémon in play and put it onto that Pokémon to evolve it. If that Pokémon is now a Stage 1 Pokémon, they may search their deck for a Stage 2 Pokémon that evolves from that Pokémon and put it onto that Pokémon to evolve it. Then, that player shuffles their deck. (You can't use this effect on your first turn or on a Pokémon that was put into play this turn.)",
    textTh: 'ในเทิร์นของแต่ละฝ่าย สามารถค้นหาการ์ดร่าง 1 จากสำรับมาพัฒนาร่าง Basic บนสนามได้ และหากเป็นร่าง 1 สามารถค้นหาร่าง 2 มาพัฒนาร่างต่อเนื่องได้ทันที',
    choiceType: 'play-stadium',
    requiresPicker: false,
    canPlay: (state, _playerIndex, card) => {
      if (state.stadium && (state.stadium.nameEn === card.nameEn || state.stadium.nameTh === card.nameTh)) {
        return { valid: false, error: 'ไม่สามารถวาง Stadium ชื่อเดียวกันทับได้' };
      }
      return { valid: true };
    },
    execute: (state, playerIndex, card) => {
      if (state.stadium) {
        const oppIdx = playerIndex === 0 ? 1 : 0;
        state.players[oppIdx].discard.push(state.stadium);
      }
      state.stadium = card;
      return { success: true, message: 'วาง Stadium Grand Tree (แกรนด์ทรี) สำเร็จ' };
    },
  },

  "team rocket's watchtower": {
    nameEn: "Team Rocket's Watchtower",
    nameTh: 'หอคอยตรวจการณ์แก๊งร็อกเกต',
    subtype: 'Stadium',
    textEn: "Neither player's Pokémon that don't have a Rule Box have any Abilities.",
    textTh: 'ความสามารถของโปเกมอนที่ไม่มี [กฎพิเศษ] ของทั้งสองฝ่ายจะหายไปทั้งหมด',
    choiceType: 'play-stadium',
    requiresPicker: false,
    canPlay: (state, _playerIndex, card) => {
      if (state.stadium && (state.stadium.nameEn === card.nameEn || state.stadium.nameTh === card.nameTh)) {
        return { valid: false, error: 'ไม่สามารถวาง Stadium ชื่อเดียวกันทับได้' };
      }
      return { valid: true };
    },
    execute: (state, playerIndex, card) => {
      if (state.stadium) {
        const oppIdx = playerIndex === 0 ? 1 : 0;
        state.players[oppIdx].discard.push(state.stadium);
      }
      state.stadium = card;
      return { success: true, message: "วาง Stadium Team Rocket's Watchtower สำเร็จ" };
    },
  },

  'lumiose city': {
    nameEn: 'Lumiose City',
    nameTh: 'มิอาเรซิตี',
    subtype: 'Stadium',
    textEn: "Neither player's Pokémon in play can be affected by any Special Conditions, and remove all Special Conditions from all Pokémon.",
    textTh: 'โปเกมอนบนสนามของทั้งสองฝ่ายจะไม่ติดสภาวะผิดปกติใดๆ และรักษาอาการผิดปกติทั้งหมดบนสนามทันที',
    choiceType: 'play-stadium',
    requiresPicker: false,
    canPlay: (state, _playerIndex, card) => {
      if (state.stadium && (state.stadium.nameEn === card.nameEn || state.stadium.nameTh === card.nameTh)) {
        return { valid: false, error: 'ไม่สามารถวาง Stadium ชื่อเดียวกันทับได้' };
      }
      return { valid: true };
    },
    execute: (state, playerIndex, card) => {
      if (state.stadium) {
        const oppIdx = playerIndex === 0 ? 1 : 0;
        state.players[oppIdx].discard.push(state.stadium);
      }
      state.stadium = card;
      for (const p of state.players) {
        for (const poke of [p.active, ...p.bench]) {
          if (poke) poke.specialConditions = [];
        }
      }
      return { success: true, message: 'วาง Stadium Lumiose City รักษาและป้องกันสภาวะผิดปกติทั้งหมด' };
    },
  },

  'artazon': {
    nameEn: 'Artazon',
    nameTh: 'โบวล์ทาวน์',
    subtype: 'Stadium',
    textEn: "Once during each player's turn, that player may search their deck for a Basic Pokémon that doesn't have a Rule Box and put it onto their Bench. Then, that player shuffles their deck.",
    textTh: 'ในเทิร์นของแต่ละฝ่าย สามารถค้นหาโปเกมอน [ร่างแรก] ที่ไม่มี [กฎพิเศษ] 1 ใบจากสำรับการ์ด วางบนเบนช์ แล้วสับสำรับ',
    choiceType: 'play-stadium',
    requiresPicker: false,
    canPlay: (state, _playerIndex, card) => {
      if (state.stadium && (state.stadium.nameEn === card.nameEn || state.stadium.nameTh === card.nameTh)) {
        return { valid: false, error: 'ไม่สามารถวาง Stadium ชื่อเดียวกันทับได้' };
      }
      return { valid: true };
    },
    execute: (state, playerIndex, card) => {
      if (state.stadium) {
        const oppIdx = playerIndex === 0 ? 1 : 0;
        state.players[oppIdx].discard.push(state.stadium);
      }
      state.stadium = card;
      return { success: true, message: 'วาง Stadium Artazon (โบวล์ทาวน์) สำเร็จ' };
    },
  },
};

/**
 * Registry Helper Functions
 */
export class StandardTrainerDatabase {
  /**
   * Look up a canonical Trainer card by English or Thai name
   */
  static getTrainer(name: string): CanonicalTrainerCard | undefined {
    if (!name) return undefined;
    const clean = name.toLowerCase().trim();
    if (TRAINER_REGISTRY[clean]) return TRAINER_REGISTRY[clean];

    for (const card of Object.values(TRAINER_REGISTRY)) {
      if (card.nameEn.toLowerCase() === clean || card.nameTh.toLowerCase() === clean) return card;
      if (clean.includes(card.nameEn.toLowerCase()) || clean.includes(card.nameTh.toLowerCase())) return card;
    }
    return undefined;
  }

  /**
   * Validate if a Trainer card can be legally played
   */
  static canPlayTrainer(state: GameState, playerIndex: 0 | 1, card: CardInstance): { valid: boolean; error?: string } {
    if (state.phase !== 'MAIN_PHASE') {
      return { valid: false, error: 'เล่นการ์ด Trainer ได้เฉพาะใน Main Phase เท่านั้น' };
    }
    if (state.activePlayerIndex !== playerIndex) {
      return { valid: false, error: 'ไม่ใช่เทิร์นของผู้เล่นคนนี้' };
    }

    const trainer = this.getTrainer(card.nameEn || card.nameTh || '');
    if (trainer) {
      return trainer.canPlay(state, playerIndex, card);
    }
    return { valid: true };
  }

  /**
   * Execute Trainer card effect
   */
  static executeTrainer(
    state: GameState,
    playerIndex: 0 | 1,
    card: CardInstance,
    choices?: EffectChoices
  ): EffectExecutionResult {
    const trainer = this.getTrainer(card.nameEn || card.nameTh || '');
    if (trainer) {
      return trainer.execute(state, playerIndex, card, choices);
    }
    return { success: true, message: `เล่น ${getCardDisplayName(card)}` };
  }
}

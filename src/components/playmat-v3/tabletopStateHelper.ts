import type { CardInstance, PokemonStage, SpecialCondition } from '../../engine/types';
import type {
  TabletopPokemonSlot,
  TabletopPlayerSideState,
  TabletopV3State,
  TabletopConsentRequest,
  TabletopTurnDecision,
  TabletopActiveCoinFlip,
  TabletopVfxEvent,
} from './types';
import { calculateCombatDamage } from '../../utils/pokemonDamageCalculator';
import { resolveCardImageUrl } from '../../utils/cardImage';
import {
  getCardDisplayName,
  getAttackDisplayName,
} from '../../utils/pokemonThaiTranslator';


/**
/**
 * Fisher-Yates multi-pass shuffle algorithm for deep card dispersion
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let pass = 0; pass < 3; pass++) {
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
  }
  return result;
}

/**
 * Create a PlayerSide board state from 60 cards
 */
export function createPlayerSideState(
  id: 'player1' | 'player2',
  name: string,
  deckCards: CardInstance[],
  deckName: string,
  shouldShuffle: boolean = true
): TabletopPlayerSideState {
  // Pure Tabletop: All 60 cards start in the deck, thoroughly shuffled.
  const cards = deckCards.map((c) => ({ ...c }));
  const deck = shouldShuffle ? shuffleArray(cards) : cards;

  return {
    id,
    name,
    deck,
    hand: [],
    prizes: [],
    discard: [],
    lostZone: [],
    active: null,
    bench: [null, null, null, null, null],
    benchLimit: 5,
    deckName,
    hasAttachedEnergyThisTurn: false,
    hasPlayedSupporterThisTurn: false,
    revealedCard: null,
  };
}

/**
 * Initialize a fresh Two-Player Tabletop Sandbox Board
 */
export function createInitialTabletopState(
  p1Cards: CardInstance[],
  p1DeckName: string = 'Charizard ex Deck',
  p2Cards?: CardInstance[],
  p2DeckName?: string
): TabletopV3State {
  const p1 = createPlayerSideState('player1', 'Player 1 (คุณ)', p1Cards, p1DeckName);
  const p2CardsList = p2Cards || p1Cards;
  const p2 = createPlayerSideState(
    'player2',
    'Player 2 (คู่ต่อสู้)',
    p2CardsList,
    p2DeckName || 'Opponent Meta Deck'
  );

  return {
    player1: p1,
    player2: p2,
    stadium: null,
    stadiumOwnerSide: null,
    activeSpotlight: null,
    currentTurn: 'player1',
    perspective: 'player1',
    myRole: 'player1',
    roomMode: 'local',
    roomCode: null,
    soloRevealAllHands: false, // Default: Opponent hand is private (facedown)
    turnCount: 1,
    historyLog: [
      `Table initialized: ${p1.name} (${p1DeckName}) vs ${p2.name} (${p2.deckName}).`,
    ],
    pendingConsent: null,
    lastConsentResult: null,
    isConsentRequired: false,
    isGameStarted: false,
    winner: null,
  };
}

export function cloneState(state: TabletopV3State): TabletopV3State {
  return JSON.parse(JSON.stringify(state)) as TabletopV3State;
}

export function makeTabletopPokemonSlot(card: CardInstance, isFacedown?: boolean): TabletopPokemonSlot {
  let stage: PokemonStage = 'Basic';
  if (card.subtypes?.includes('Stage 2') || card.subtypes?.includes('Stage2')) stage = 'Stage2';
  else if (card.subtypes?.includes('Stage 1') || card.subtypes?.includes('Stage1')) stage = 'Stage1';
  else if (card.subtypes?.includes('VSTAR')) stage = 'VSTAR';
  else if (card.subtypes?.includes('VMAX')) stage = 'VMAX';

  const facedown = isFacedown !== undefined ? isFacedown : (card.isFacedown ?? false);

  return {
    id: `slot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    card: { ...card, isFacedown: facedown },
    stage,
    damage: 0,
    attachedEnergies: [],
    attachedTool: null,
    evolutionHistory: [],
    specialConditions: [],
    isFacedown: facedown,
  };
}

export interface SetupReadinessCheck {
  isReady: boolean;
  missingItems: string[];
  message: string;
}

export function checkSetupReadiness(state: TabletopV3State): SetupReadinessCheck {
  const missingItems: string[] = [];
  if (!state.player1.active) {
    missingItems.push('Active ของ Player 1');
  }
  if (!state.player2.active) {
    missingItems.push('Active ของ Player 2');
  }
  if (state.player1.prizes.length === 0) {
    missingItems.push('Prize ของ Player 1');
  }
  if (state.player2.prizes.length === 0) {
    missingItems.push('Prize ของ Player 2');
  }

  const isReady = missingItems.length === 0;
  const message = isReady
    ? ''
    : `ยังไม่พร้อมเริ่มเกม: กรุณาวาง ${missingItems.join(', ')} ให้เรียบร้อยก่อน`;

  return {
    isReady,
    missingItems,
    message,
  };
}

export const TabletopActions = {
  checkSetupReadiness,
  drawCards(
    state: TabletopV3State,
    side: 'player1' | 'player2',
    count: number = 1
  ): TabletopV3State {
    const next = cloneState(state);
    const player = next[side];
    if (player.deck.length === 0) return next;
    const drawn = player.deck.splice(0, count);
    player.hand.push(...drawn);
    next.historyLog.push(`${player.name} drew ${drawn.length} card(s) from deck.`);
    return next;
  },

  placeFromHand(
    state: TabletopV3State,
    side: 'player1' | 'player2',
    cardId: string,
    target: 'ACTIVE' | number,
    facedown?: boolean
  ): TabletopV3State {
    const next = cloneState(state);
    const player = next[side];
    const cardIndex = player.hand.findIndex((c) => c.instanceId === cardId);
    if (cardIndex === -1) return next;

    const shouldFacedown = facedown !== undefined ? facedown : !next.isGameStarted;
    const [card] = player.hand.splice(cardIndex, 1);
    const newSlot = makeTabletopPokemonSlot(card, shouldFacedown);

    if (target === 'ACTIVE') {
      if (player.active) {
        player.hand.push(player.active.card);
        player.active.evolutionHistory.forEach((c) => player.hand.push(c));
        player.active.attachedEnergies.forEach((e) => player.hand.push(e));
        if (player.active.attachedTool) player.hand.push(player.active.attachedTool);
      }
      player.active = newSlot;
      const logDesc = shouldFacedown
        ? `วางการ์ดคว่ำหน้าที่ตำแหน่ง Active`
        : `วาง ${getCardDisplayName(card)} ที่ตำแหน่ง Active`;
      next.historyLog.push(`${player.name} ${logDesc}`);
    } else {
      const maxIdx = (player.benchLimit || player.bench.length || 5) - 1;
      const idx = Math.min(maxIdx, Math.max(0, target));
      if (player.bench[idx]) {
        const old = player.bench[idx]!;
        player.hand.push(old.card);
        old.evolutionHistory.forEach((c) => player.hand.push(c));
        old.attachedEnergies.forEach((e) => player.hand.push(e));
        if (old.attachedTool) player.hand.push(old.attachedTool);
      }
      player.bench[idx] = newSlot;
      const logDesc = shouldFacedown
        ? `วางการ์ดคว่ำหน้าที่เบนช์ #${idx + 1}`
        : `วาง ${getCardDisplayName(card)} ที่เบนช์ #${idx + 1}`;
      next.historyLog.push(`${player.name} ${logDesc}`);
    }

    return next;
  },

  attachEnergyFromHand(
    state: TabletopV3State,
    side: 'player1' | 'player2',
    cardId: string,
    target: 'ACTIVE' | number,
    isSpecialAttach: boolean = false
  ): TabletopV3State {
    const next = cloneState(state);
    const player = next[side];
    const cardIndex = player.hand.findIndex((c) => c.instanceId === cardId);
    if (cardIndex === -1) return next;

    const [card] = player.hand.splice(cardIndex, 1);
    const slot = target === 'ACTIVE' ? player.active : player.bench[target];
    if (!slot) {
      player.hand.push(card);
      return next;
    }

    slot.attachedEnergies.push(card);
    if (!isSpecialAttach) {
      player.hasAttachedEnergyThisTurn = true;
    }
    const attachDesc = isSpecialAttach ? ' (พลังงานพิเศษ/เอฟเฟกต์)' : ' (ตามรอบ 1/1)';
    const energyName = getCardDisplayName(card);
    const targetName = getCardDisplayName(slot.card);
    next.historyLog.push(
      `${player.name} ติดพลังงาน ${energyName} ให้ ${targetName}${attachDesc}.`
    );
    next.actionToast = {
      id: Math.random().toString(),
      message: `⚡ ${player.name} ติด ${energyName} ให้ ${targetName}`,
      icon: '⚡',
      playerSide: side,
      timestamp: Date.now(),
    };
    return next;
  },

  attachToolFromHand(
    state: TabletopV3State,
    side: 'player1' | 'player2',
    cardId: string,
    target: 'ACTIVE' | number
  ): TabletopV3State {
    const next = cloneState(state);
    const player = next[side];
    const cardIndex = player.hand.findIndex((c) => c.instanceId === cardId);
    if (cardIndex === -1) return next;

    const [card] = player.hand.splice(cardIndex, 1);
    const slot = target === 'ACTIVE' ? player.active : player.bench[target];
    if (!slot) {
      player.hand.push(card);
      return next;
    }

    if (slot.attachedTool) {
      player.hand.push(slot.attachedTool);
    }
    slot.attachedTool = card;
    next.historyLog.push(`${player.name} ติดไอเท็ม ${getCardDisplayName(card)} ให้ ${getCardDisplayName(slot.card)}.`);
    return next;
  },

  evolveFromHand(
    state: TabletopV3State,
    side: 'player1' | 'player2',
    cardId: string,
    target: 'ACTIVE' | number
  ): TabletopV3State {
    const next = cloneState(state);
    const player = next[side];
    const cardIndex = player.hand.findIndex((c) => c.instanceId === cardId);
    if (cardIndex === -1) return next;

    const [card] = player.hand.splice(cardIndex, 1);
    const slot = target === 'ACTIVE' ? player.active : player.bench[target];
    if (!slot) {
      player.hand.push(card);
      return next;
    }

    slot.evolutionHistory.push(slot.card);
    slot.card = card;

    let stage: PokemonStage = 'Stage1';
    if (card.subtypes?.includes('Stage 2') || card.subtypes?.includes('Stage2')) stage = 'Stage2';
    else if (card.subtypes?.includes('Stage 1') || card.subtypes?.includes('Stage1')) stage = 'Stage1';
    else if (card.subtypes?.includes('VSTAR')) stage = 'VSTAR';
    else if (card.subtypes?.includes('VMAX')) stage = 'VMAX';
    slot.stage = stage;

    const cardName = getCardDisplayName(card);
    const targetName = target === 'ACTIVE' ? 'Active' : `Bench #${target + 1}`;
    next.historyLog.push(`${player.name} พัฒนาร่างเป็น ${cardName}.`);
    next.vfxEvent = {
      id: `vfx-evo-${Date.now()}`,
      type: 'EVOLUTION',
      cardName,
      cardImageUrl: resolveCardImageUrl(card, true),
      subtitle: `พัฒนาร่างที่ ${targetName}!`,
      playerSide: side,
      timestamp: Date.now(),
    };
    return next;
  },

  devolve(
    state: TabletopV3State,
    side: 'player1' | 'player2',
    target: 'ACTIVE' | number
  ): TabletopV3State {
    const next = cloneState(state);
    const player = next[side];
    const slot = target === 'ACTIVE' ? player.active : player.bench[target];
    if (!slot || slot.evolutionHistory.length === 0) return next;

    const topCard = slot.card;
    const previousCard = slot.evolutionHistory.pop()!;
    slot.card = previousCard;
    player.hand.push(topCard);

    let stage: PokemonStage = 'Basic';
    if (previousCard.subtypes?.includes('Stage 1') || previousCard.subtypes?.includes('Stage1')) stage = 'Stage1';
    slot.stage = stage;

    next.historyLog.push(`${player.name} ย้อนร่าง ${getCardDisplayName(topCard)} กลับขึ้นมือ.`);
    return next;
  },

  // Play Trainer card onto player's Tabletop Board (in-play slot beside Active)
  playTrainerToSpotlight(
    state: TabletopV3State,
    side: 'player1' | 'player2',
    cardId: string,
    _message?: string
  ): TabletopV3State {
    const next = cloneState(state);
    const player = next[side];
    const cardIndex = player.hand.findIndex((c) => c.instanceId === cardId);
    if (cardIndex === -1) return next;

    const [card] = player.hand.splice(cardIndex, 1);
    const isSupporter =
      card.subtypes?.includes('Supporter') ||
      card.subtypes?.includes('ซัพพอร์ต') ||
      (card as any).trainerType === 'Supporter' ||
      card.nameEn?.toLowerCase().includes('supporter');
    if (isSupporter) {
      player.hasPlayedSupporterThisTurn = true;
    }

    // If there is already a card on the in-play board slot, send previous one to discard
    if (player.revealedCard) {
      player.discard.push(player.revealedCard);
    }

    // Place card physically onto player's tabletop board slot
    player.revealedCard = { ...card, isFacedown: false };

    // Bypasses modal takeover - card sits directly on the mat!
    next.activeSpotlight = null;

    const cardDisplayName = getCardDisplayName(card);
    next.historyLog.push(`✨ ${player.name} เล่นการ์ด ${cardDisplayName} วางบนกระดาน${isSupporter ? ' (Supporter 1/1)' : ''}`);
    next.actionToast = {
      id: Math.random().toString(),
      message: `🎴 ${player.name} เล่น: ${cardDisplayName}`,
      icon: '🎴',
      playerSide: side,
      timestamp: Date.now(),
    };
    return next;
  },

  // Reveal any card to Board (Physical slot on Tabletop)
  revealCardToSpotlight(
    state: TabletopV3State,
    side: 'player1' | 'player2',
    card: CardInstance,
    _message?: string
  ): TabletopV3State {
    const next = cloneState(state);
    const player = next[side];
    const revealed = { ...card, isFacedown: false };

    // If there is already a card in the in-play board slot, send previous one to discard
    if (player.revealedCard) {
      player.discard.push(player.revealedCard);
    }

    // Set on player's board slot
    player.revealedCard = revealed;

    // Remove from hand if present
    const cIdx = player.hand.findIndex((c) => c.instanceId === card.instanceId);
    if (cIdx !== -1) {
      player.hand.splice(cIdx, 1);
    }

    const cardDisplayName = getCardDisplayName(card);
    next.activeSpotlight = null;
    next.historyLog.push(`🎴 ${player.name} โชว์การ์ด ${cardDisplayName} บนกระดาน`);
    return next;
  },

  // Dismiss card from Tabletop Revealed Card slot
  dismissRevealedCard(
    state: TabletopV3State,
    side: 'player1' | 'player2',
    toZone: 'DISCARD' | 'HAND' | 'LOST_ZONE' = 'DISCARD'
  ): TabletopV3State {
    const next = cloneState(state);
    const player = next[side];
    if (!player.revealedCard) return next;
    const card = player.revealedCard;
    player.revealedCard = null;
    const cardDisplayName = getCardDisplayName(card);

    if (toZone === 'DISCARD') {
      player.discard.push(card);
      next.historyLog.push(`🗑️ ${player.name} ส่งการ์ดที่เล่น (${cardDisplayName}) ลงสุสาน`);
    } else if (toZone === 'LOST_ZONE') {
      player.lostZone = player.lostZone || [];
      player.lostZone.push(card);
      next.historyLog.push(`🌀 ${player.name} ส่งการ์ดที่เล่น (${cardDisplayName}) ไป Lost Zone`);
    } else {
      player.hand.push(card);
      next.historyLog.push(`✋ ${player.name} เก็บการ์ดที่เล่น (${cardDisplayName}) กลับขึ้นมือ`);
    }
    return next;
  },

  // Dismiss card from Center Spotlight
  dismissSpotlight(
    state: TabletopV3State,
    toZone: 'DISCARD' | 'LOST_ZONE' | 'HAND' = 'DISCARD'
  ): TabletopV3State {
    const next = cloneState(state);
    if (!next.activeSpotlight) return next;

    // For card reveals, the cards were already placed in hand/bench/active during deck search.
    // Dismissing the reveal modal must ONLY clear the spotlight overlay without touching player cards.
    if (next.activeSpotlight.actionType === 'REVEAL_CARD') {
      next.activeSpotlight = null;
      return next;
    }

    const { card, sourceSide } = next.activeSpotlight;
    const player = next[sourceSide];

    const cardName = getCardDisplayName(card);
    if (toZone === 'DISCARD') {
      player.discard.push(card);
      next.historyLog.push(`${cardName} ย้ายไปสุสาน.`);
    } else if (toZone === 'LOST_ZONE') {
      player.lostZone.push(card);
      next.historyLog.push(`${cardName} ย้ายไป Lost Zone.`);
    } else if (toZone === 'HAND') {
      player.hand.push(card);
      next.historyLog.push(`${cardName} นำกลับขึ้นมือ.`);
    }

    next.activeSpotlight = null;
    return next;
  },

  playStadium(
    state: TabletopV3State,
    side: 'player1' | 'player2',
    cardId: string
  ): TabletopV3State {
    const next = cloneState(state);
    const player = next[side];
    const cardIndex = player.hand.findIndex((c) => c.instanceId === cardId);
    if (cardIndex === -1) return next;

    const [card] = player.hand.splice(cardIndex, 1);
    if (next.stadium) {
      const prevOwner = next.stadiumOwnerSide || side;
      next[prevOwner].discard.push(next.stadium);
    }
    next.stadium = card;
    next.stadiumOwnerSide = side;
    next.historyLog.push(`${player.name} วางสเตเดียม: ${getCardDisplayName(card)}.`);
    return next;
  },

  discardStadium(state: TabletopV3State): TabletopV3State {
    const next = cloneState(state);
    if (!next.stadium) return next;
    const s = next.stadium;
    const ownerSide = next.stadiumOwnerSide || 'player1';
    next[ownerSide].discard.push(s);
    next.stadium = null;
    next.stadiumOwnerSide = null;
    next.historyLog.push(`ทิ้งสเตเดียม: ${getCardDisplayName(s)}.`);
    return next;
  },

  setBenchLimit(
    state: TabletopV3State,
    side: 'player1' | 'player2',
    limit: 5 | 8
  ): TabletopV3State {
    const next = cloneState(state);
    const player = next[side];
    if (limit === 5) {
      const hasOverflowCards = (player.bench || []).slice(5, 8).some((slot) => slot !== null);
      if (hasOverflowCards) {
        next.actionToast = {
          id: `toast-bench-overflow-${Date.now()}`,
          message: '⚠️ กรุณานำโปเกมอนในเบนช์ช่องที่ 6–8 ออกก่อนลดเหลือ 5 ช่อง',
          icon: '⚠️',
          playerSide: side,
          type: 'WARNING',
          timestamp: Date.now(),
        };
        return next;
      }
      player.benchLimit = 5;
      player.bench = (player.bench || []).slice(0, 5);
      while (player.bench.length < 5) {
        player.bench.push(null);
      }
    } else {
      player.benchLimit = 8;
      player.bench = [...(player.bench || [])];
      while (player.bench.length < 8) {
        player.bench.push(null);
      }
    }

    const actionDesc = limit === 8 ? 'ขยายขนาดเบนช์เป็น 8 ช่อง' : 'ปรับขนาดเบนช์เป็น 5 ช่อง';
    next.historyLog.push(`👥 ${player.name} ${actionDesc}.`);
    next.actionToast = {
      id: `toast-bench-limit-${Date.now()}`,
      message: `👥 ${player.name} ${actionDesc}`,
      icon: '👥',
      playerSide: side,
      type: 'INFO',
      timestamp: Date.now(),
    };
    return next;
  },

  discardFromHand(
    state: TabletopV3State,
    side: 'player1' | 'player2',
    cardId: string
  ): TabletopV3State {
    const next = cloneState(state);
    const player = next[side];
    const cardIndex = player.hand.findIndex((c) => c.instanceId === cardId);
    if (cardIndex === -1) return next;

    const [card] = player.hand.splice(cardIndex, 1);
    player.discard.push(card);
    const cardDisplayName = getCardDisplayName(card);
    next.historyLog.push(`${player.name} ทิ้ง ${cardDisplayName} ลงสุสาน.`);
    next.actionToast = {
      id: `toast-discard-${Date.now()}`,
      message: `🗑️ ${player.name} ทิ้งการ์ดลงสุสาน: ${cardDisplayName}`,
      icon: '🗑️',
      playerSide: side,
      type: 'INFO',
      cardImageUrl: resolveCardImageUrl(card),
      cardName: cardDisplayName,
      timestamp: Date.now(),
    };
    return next;
  },

  lostZoneFromHand(
    state: TabletopV3State,
    side: 'player1' | 'player2',
    cardId: string
  ): TabletopV3State {
    const next = cloneState(state);
    const player = next[side];
    const cardIndex = player.hand.findIndex((c) => c.instanceId === cardId);
    if (cardIndex === -1) return next;

    const [card] = player.hand.splice(cardIndex, 1);
    player.lostZone.push(card);
    next.historyLog.push(`${player.name} ส่ง ${getCardDisplayName(card)} ไปยัง Lost Zone.`);
    return next;
  },

  discardMultipleFromHand(
    state: TabletopV3State,
    side: 'player1' | 'player2',
    cardIds: string[]
  ): TabletopV3State {
    const next = cloneState(state);
    const player = next[side];
    const discardedCards: CardInstance[] = [];

    cardIds.forEach((id) => {
      const idx = player.hand.findIndex((c) => c.instanceId === id);
      if (idx !== -1) {
        const [card] = player.hand.splice(idx, 1);
        player.discard.push(card);
        discardedCards.push(card);
      }
    });

    if (discardedCards.length > 0) {
      const names = discardedCards.map((c) => getCardDisplayName(c)).join(', ');
      next.historyLog.push(`${player.name} ทิ้งการ์ด ${discardedCards.length} ใบ (${names}) ลงสุสาน.`);
      next.actionToast = {
        id: `toast-discard-multi-${Date.now()}`,
        message: `🗑️ ${player.name} ทิ้งการ์ด ${discardedCards.length} ใบ: ${names}`,
        icon: '🗑️',
        playerSide: side,
        type: 'INFO',
        cardImageUrl: resolveCardImageUrl(discardedCards[0]),
        cardName: getCardDisplayName(discardedCards[0]),
        timestamp: Date.now(),
      };
    }
    return next;
  },

  lostZoneMultipleFromHand(
    state: TabletopV3State,
    side: 'player1' | 'player2',
    cardIds: string[]
  ): TabletopV3State {
    const next = cloneState(state);
    const player = next[side];
    const lostCards: CardInstance[] = [];

    cardIds.forEach((id) => {
      const idx = player.hand.findIndex((c) => c.instanceId === id);
      if (idx !== -1) {
        const [card] = player.hand.splice(idx, 1);
        player.lostZone.push(card);
        lostCards.push(card);
      }
    });

    if (lostCards.length > 0) {
      const names = lostCards.map((c) => getCardDisplayName(c)).join(', ');
      next.historyLog.push(`${player.name} ส่งการ์ด ${lostCards.length} ใบ (${names}) ไปยัง Lost Zone.`);
      next.actionToast = {
        id: `toast-lostzone-multi-${Date.now()}`,
        message: `🌌 ${player.name} ส่งการ์ด ${lostCards.length} ใบไปยัง Lost Zone: ${names}`,
        icon: '🌌',
        playerSide: side,
        type: 'INFO',
        cardImageUrl: resolveCardImageUrl(lostCards[0]),
        cardName: getCardDisplayName(lostCards[0]),
        timestamp: Date.now(),
      };
    }
    return next;
  },

  takePrize(
    state: TabletopV3State,
    side: 'player1' | 'player2',
    prizeIndex: number
  ): TabletopV3State {
    const next = cloneState(state);
    const player = next[side];
    if (prizeIndex < 0 || prizeIndex >= player.prizes.length) return next;

    const [card] = player.prizes.splice(prizeIndex, 1);
    card.isFacedown = false;
    player.hand.push(card);
    next.historyLog.push(`${player.name} claimed 1 Prize card (${player.prizes.length} left).`);

    // Check 6-prize victory condition
    if (player.prizes.length === 0) {
      next.winner = {
        side,
        name: player.name,
        reason: 'PRIZES_CLAIMED',
        timestamp: Date.now(),
      };
      next.historyLog.push(`🏆 ${player.name} ดึงการ์ดรางวัลครบ 6 ใบ และเป็นฝ่ายชนะการแข่งขัน!`);
    }

    return next;
  },

  putHandToDeck(
    state: TabletopV3State,
    side: 'player1' | 'player2',
    cardId: string,
    position: 'TOP' | 'BOTTOM' | 'SHUFFLE' = 'TOP'
  ): TabletopV3State {
    const next = cloneState(state);
    const player = next[side];
    const cardIndex = player.hand.findIndex((c) => c.instanceId === cardId);
    if (cardIndex === -1) return next;

    const [card] = player.hand.splice(cardIndex, 1);
    const cardName = getCardDisplayName(card);
    if (position === 'TOP') {
      player.deck.unshift(card);
      next.historyLog.push(`${player.name} นำ ${cardName} วางบนสุดของกองสำรับ.`);
      next.actionToast = {
        id: `toast-${Date.now()}`,
        message: `นำ ${cardName} วางบนสุดของกองสำรับ (Top)`,
        icon: '⬆️',
        playerSide: side,
        timestamp: Date.now(),
      };
    } else if (position === 'BOTTOM') {
      player.deck.push(card);
      next.historyLog.push(`${player.name} นำ ${cardName} วางใต้สุดของกองสำรับ.`);
      next.actionToast = {
        id: `toast-${Date.now()}`,
        message: `นำ ${cardName} ใส่ใต้สุดของกองสำรับ (Bottom)`,
        icon: '⬇️',
        playerSide: side,
        timestamp: Date.now(),
      };
    } else {
      player.deck.push(card);
      player.deck = shuffleArray(player.deck);
      next.historyLog.push(`${player.name} นำ ${cardName} สับเข้ากองสำรับ.`);
      next.actionToast = {
        id: `toast-${Date.now()}`,
        message: `นำ ${cardName} สับเข้ากองสำรับ (Shuffle)`,
        icon: '🔀',
        playerSide: side,
        timestamp: Date.now(),
      };
    }
    return next;
  },

  putMultipleHandToDeck(
    state: TabletopV3State,
    side: 'player1' | 'player2',
    cardIds: string[],
    position: 'TOP' | 'BOTTOM' | 'SHUFFLE' = 'TOP'
  ): TabletopV3State {
    if (!cardIds || cardIds.length === 0) return state;
    const next = cloneState(state);
    const player = next[side];
    const cardsToMove: CardInstance[] = [];

    for (const id of cardIds) {
      const idx = player.hand.findIndex((c) => c.instanceId === id);
      if (idx !== -1) {
        cardsToMove.push(player.hand.splice(idx, 1)[0]);
      }
    }

    if (cardsToMove.length === 0) return next;

    if (position === 'TOP') {
      for (let i = cardsToMove.length - 1; i >= 0; i--) {
        player.deck.unshift(cardsToMove[i]);
      }
      next.historyLog.push(`${player.name} put ${cardsToMove.length} card(s) to the top of deck.`);
      next.actionToast = {
        id: `toast-${Date.now()}`,
        message: `นำการ์ด ${cardsToMove.length} ใบวางบนสุดของกองสำรับ (Top)`,
        icon: '⬆️',
        playerSide: side,
        timestamp: Date.now(),
      };
    } else if (position === 'BOTTOM') {
      for (const c of cardsToMove) {
        player.deck.push(c);
      }
      next.historyLog.push(`${player.name} put ${cardsToMove.length} card(s) to the bottom of deck.`);
      next.actionToast = {
        id: `toast-${Date.now()}`,
        message: `นำการ์ด ${cardsToMove.length} ใบใส่ใต้สุดของกองสำรับ (Bottom)`,
        icon: '⬇️',
        playerSide: side,
        timestamp: Date.now(),
      };
    } else {
      for (const c of cardsToMove) {
        player.deck.push(c);
      }
      player.deck = shuffleArray(player.deck);
      next.historyLog.push(`${player.name} shuffled ${cardsToMove.length} card(s) into deck.`);
      next.actionToast = {
        id: `toast-${Date.now()}`,
        message: `นำการ์ด ${cardsToMove.length} ใบสับเข้ากองสำรับ (Shuffle)`,
        icon: '🔀',
        playerSide: side,
        timestamp: Date.now(),
      };
    }
    return next;
  },

  putHandToPrizes(
    state: TabletopV3State,
    side: 'player1' | 'player2',
    cardId: string
  ): TabletopV3State {
    const next = cloneState(state);
    const player = next[side];
    const cardIndex = player.hand.findIndex((c) => c.instanceId === cardId);
    if (cardIndex === -1) return next;

    const [card] = player.hand.splice(cardIndex, 1);
    card.isFacedown = true;
    player.prizes.push(card);
    next.historyLog.push(`${player.name} placed a card into Prizes face down.`);
    return next;
  },

  moveCardBetweenZones(
    state: TabletopV3State,
    side: 'player1' | 'player2',
    cardId: string,
    fromZone: 'DECK' | 'HAND' | 'DISCARD' | 'LOST_ZONE' | 'PRIZES',
    toZone: 'DECK' | 'HAND' | 'DISCARD' | 'LOST_ZONE' | 'BENCH' | 'ACTIVE',
    options?: {
      position?: 'TOP' | 'BOTTOM';
      deckPosition?: 'TOP' | 'BOTTOM';
      attachToPokemonId?: string;
      shuffleDeck?: boolean;
      facedown?: boolean;
    }
  ): TabletopV3State {
    const next = cloneState(state);
    const player = next[side];

    let sourceList: CardInstance[] | null = null;
    if (fromZone === 'DECK') sourceList = player.deck;
    else if (fromZone === 'HAND') sourceList = player.hand;
    else if (fromZone === 'DISCARD') sourceList = player.discard;
    else if (fromZone === 'LOST_ZONE') sourceList = player.lostZone;
    else if (fromZone === 'PRIZES') sourceList = player.prizes;

    if (!sourceList) return next;
    const cIdx = sourceList.findIndex((c) => c.instanceId === cardId);
    if (cIdx === -1) return next;

    const [card] = sourceList.splice(cIdx, 1);
    card.isFacedown = false;

    // 1. If attaching to a Pokemon on field
    if (options?.attachToPokemonId) {
      const targetSlot =
        player.active && (player.active.card.instanceId === options.attachToPokemonId || player.active.id === options.attachToPokemonId)
          ? player.active
          : player.bench.find(
              (b) => b && (b.card.instanceId === options.attachToPokemonId || b.id === options.attachToPokemonId)
            );
      if (targetSlot) {
        if (card.supertype === 'Energy') {
          targetSlot.attachedEnergies.push(card);
          next.historyLog.push(
            `${player.name} ติดพลังงาน ${getCardDisplayName(card)} ให้ ${getCardDisplayName(targetSlot.card)}.`
          );
        } else if (card.subtypes?.includes('Tool') || card.supertype === 'Trainer') {
          targetSlot.attachedTool = card;
          next.historyLog.push(
            `${player.name} ติดไอเท็ม ${getCardDisplayName(card)} ให้ ${getCardDisplayName(targetSlot.card)}.`
          );
        } else {
          player.hand.push(card);
        }
      } else {
        player.hand.push(card);
      }
    } else if (toZone === 'HAND') {
      player.hand.push(card);
      next.historyLog.push(`${player.name} นำ ${getCardDisplayName(card)} ขึ้นมือ.`);
    } else if (toZone === 'DISCARD') {
      player.discard.push(card);
      const cardDisplayName = getCardDisplayName(card);
      next.historyLog.push(`${player.name} ทิ้ง ${cardDisplayName} ลงสุสาน.`);
      next.actionToast = {
        id: `toast-discard-${Date.now()}`,
        message: `🗑️ ${player.name} ทิ้งการ์ดลงสุสาน: ${cardDisplayName}`,
        icon: '🗑️',
        playerSide: side,
        type: 'INFO',
        cardImageUrl: resolveCardImageUrl(card),
        cardName: cardDisplayName,
        timestamp: Date.now(),
      };
    } else if (toZone === 'LOST_ZONE') {
      player.lostZone.push(card);
      next.historyLog.push(`${player.name} ส่ง ${getCardDisplayName(card)} ไปยัง Lost Zone.`);
    } else if (toZone === 'DECK') {
      const targetPos = options?.deckPosition || options?.position;
      if (targetPos === 'TOP') {
        player.deck.unshift(card);
        next.historyLog.push(`${player.name} นำ ${getCardDisplayName(card)} วางบนสุดของกองสำรับ.`);
      } else {
        player.deck.push(card);
        next.historyLog.push(`${player.name} นำ ${getCardDisplayName(card)} ใส่เข้ากองสำรับ.`);
      }
    } else if (toZone === 'BENCH') {
      const emptyBenchIdx = player.bench.findIndex((b) => b === null);
      if (emptyBenchIdx !== -1) {
        player.bench[emptyBenchIdx] = makeTabletopPokemonSlot(card, options?.facedown);
        const cardName = getCardDisplayName(card);
        const logDesc = options?.facedown
          ? `วางการ์ดคว่ำหน้าที่เบนช์ #${emptyBenchIdx + 1}.`
          : `วาง ${cardName} ที่เบนช์ #${emptyBenchIdx + 1}.`;
        next.historyLog.push(`${player.name} ${logDesc}`);
      } else {
        player.hand.push(card);
        next.historyLog.push(`เบนช์ของ ${player.name} เต็ม จึงเก็บ ${getCardDisplayName(card)} ขึ้นมือ.`);
      }
    } else if (toZone === 'ACTIVE') {
      if (!player.active) {
        player.active = makeTabletopPokemonSlot(card, options?.facedown);
        const cardName = getCardDisplayName(card);
        const logDesc = options?.facedown
          ? `วางการ์ดคว่ำหน้าที่ตำแหน่ง Active.`
          : `วาง ${cardName} ที่ตำแหน่ง Active.`;
        next.historyLog.push(`${player.name} ${logDesc}`);
      } else {
        player.hand.push(card);
        next.historyLog.push(`ตำแหน่ง Active ของ ${player.name} ไม่ว่าง จึงเก็บ ${getCardDisplayName(card)} ขึ้นมือ.`);
      }
    }

    // 2. If shuffleDeck is requested, shuffle the remaining deck
    if (options?.shuffleDeck) {
      player.deck = shuffleArray(player.deck);
      next.historyLog.push(`${player.name} shuffled their deck.`);
    }

    // 3. Check 6-prize victory condition if prize card was moved
    if (fromZone === 'PRIZES' && next.isGameStarted && player.prizes.length === 0) {
      next.winner = {
        side,
        name: player.name,
        reason: 'PRIZES_CLAIMED',
        timestamp: Date.now(),
      };
      next.historyLog.push(`🏆 ${player.name} ดึงการ์ดรางวัลครบ 6 ใบ และเป็นฝ่ายชนะการแข่งขัน!`);
    }

    return next;
  },

  moveMultipleCardsBetweenZones(
    state: TabletopV3State,
    side: 'player1' | 'player2',
    cardIds: string[],
    fromZone: 'DECK' | 'HAND' | 'DISCARD' | 'LOST_ZONE' | 'PRIZES',
    toZone: 'DECK' | 'HAND' | 'DISCARD' | 'LOST_ZONE' | 'BENCH' | 'ACTIVE',
    options?: {
      position?: 'TOP' | 'BOTTOM';
      deckPosition?: 'TOP' | 'BOTTOM';
      shuffleDeck?: boolean;
      facedown?: boolean;
      attachToPokemonId?: string;
    }
  ): TabletopV3State {
    if (!cardIds || cardIds.length === 0) return state;
    const next = cloneState(state);
    const player = next[side];

    let sourceList: CardInstance[] | null = null;
    if (fromZone === 'DECK') sourceList = player.deck;
    else if (fromZone === 'HAND') sourceList = player.hand;
    else if (fromZone === 'DISCARD') sourceList = player.discard;
    else if (fromZone === 'LOST_ZONE') sourceList = player.lostZone;
    else if (fromZone === 'PRIZES') sourceList = player.prizes;

    if (!sourceList) return next;

    const cardsToMove: CardInstance[] = [];
    for (const id of cardIds) {
      const idx = sourceList.findIndex((c) => c.instanceId === id);
      if (idx !== -1) {
        const [c] = sourceList.splice(idx, 1);
        c.isFacedown = false;
        cardsToMove.push(c);
      }
    }

    if (cardsToMove.length === 0) return next;

    // Handle attaching to Pokemon on field (Active or Bench)
    if (options?.attachToPokemonId) {
      const targetSlot =
        player.active && (player.active.card.instanceId === options.attachToPokemonId || player.active.id === options.attachToPokemonId)
          ? player.active
          : player.bench.find(
              (b) => b && (b.card.instanceId === options.attachToPokemonId || b.id === options.attachToPokemonId)
            );
      if (targetSlot) {
        for (const card of cardsToMove) {
          if (card.supertype === 'Energy') {
            targetSlot.attachedEnergies.push(card);
            next.historyLog.push(
              `${player.name} ติดพลังงาน ${getCardDisplayName(card)} ให้ ${getCardDisplayName(targetSlot.card)}.`
            );
          } else if (card.subtypes?.includes('Tool') || card.supertype === 'Trainer') {
            targetSlot.attachedTool = card;
            next.historyLog.push(
              `${player.name} ติดไอเท็ม ${getCardDisplayName(card)} ให้ ${getCardDisplayName(targetSlot.card)}.`
            );
          } else {
            player.hand.push(card);
          }
        }
        if (options?.shuffleDeck) {
          player.deck = shuffleArray(player.deck);
        }
        return next;
      }
    }

    for (const card of cardsToMove) {
      if (toZone === 'HAND') {
        player.hand.push(card);
      } else if (toZone === 'DISCARD') {
        player.discard.push(card);
      } else if (toZone === 'LOST_ZONE') {
        player.lostZone.push(card);
      } else if (toZone === 'DECK') {
        const targetPos = options?.deckPosition || options?.position;
        if (targetPos === 'TOP') {
          player.deck.unshift(card);
        } else {
          player.deck.push(card);
        }
      } else if (toZone === 'BENCH') {
        const emptyBenchIdx = player.bench.findIndex((b) => b === null);
        if (emptyBenchIdx !== -1) {
          player.bench[emptyBenchIdx] = makeTabletopPokemonSlot(card, options?.facedown);
        } else {
          player.hand.push(card);
        }
      } else if (toZone === 'ACTIVE') {
        if (!player.active) {
          player.active = makeTabletopPokemonSlot(card, options?.facedown);
        } else {
          player.hand.push(card);
        }
      }
    }

    if (options?.shuffleDeck) {
      player.deck = shuffleArray(player.deck);
      next.historyLog.push(`${player.name} moved ${cardsToMove.length} cards from ${fromZone} to ${toZone} and shuffled.`);
    } else {
      next.historyLog.push(`${player.name} moved ${cardsToMove.length} cards from ${fromZone} to ${toZone}.`);
    }

    return next;
  },

  adjustDamage(
    state: TabletopV3State,
    side: 'player1' | 'player2',
    target: 'ACTIVE' | number,
    delta: number
  ): TabletopV3State {
    const next = cloneState(state);
    const player = next[side];
    const slot = target === 'ACTIVE' ? player.active : player.bench[target];
    if (!slot) return next;

    slot.damage = Math.max(0, slot.damage + delta);
    next.historyLog.push(
      `${player.name} ปรับแดเมจ ${getCardDisplayName(slot.card)} ${delta > 0 ? '+' : ''}${delta} (รวม: ${slot.damage}).`
    );
    return next;
  },

  setDamage(
    state: TabletopV3State,
    side: 'player1' | 'player2',
    target: 'ACTIVE' | number,
    total: number
  ): TabletopV3State {
    const next = cloneState(state);
    const player = next[side];
    const slot = target === 'ACTIVE' ? player.active : player.bench[target];
    if (!slot) return next;

    slot.damage = Math.max(0, total);
    next.historyLog.push(`${player.name} ตั้งค่าแดเมจ ${getCardDisplayName(slot.card)} เป็น ${slot.damage}.`);
    return next;
  },

  toggleStatus(
    state: TabletopV3State,
    side: 'player1' | 'player2',
    target: 'ACTIVE' | number,
    condition: SpecialCondition
  ): TabletopV3State {
    const next = cloneState(state);
    const player = next[side];
    const slot = target === 'ACTIVE' ? player.active : player.bench[target];
    if (!slot) return next;

    const idx = slot.specialConditions.indexOf(condition);
    if (idx >= 0) {
      slot.specialConditions.splice(idx, 1);
      next.historyLog.push(`${player.name} removed ${condition}.`);
    } else {
      slot.specialConditions.push(condition);
      next.historyLog.push(`${player.name} applied ${condition}.`);
    }
    return next;
  },

  switchActiveWithBench(
    state: TabletopV3State,
    side: 'player1' | 'player2',
    benchIndex: number
  ): TabletopV3State {
    const next = cloneState(state);
    const player = next[side];
    const limit = player.benchLimit || player.bench.length || 5;
    if (benchIndex < 0 || benchIndex >= limit) return next;

    const oldActive = player.active;
    const oldBench = player.bench[benchIndex];

    // Official Pokemon TCG rule: Special conditions are removed upon moving to bench!
    if (oldActive) {
      oldActive.specialConditions = [];
    }

    player.active = oldBench;
    player.bench[benchIndex] = oldActive;

    const activeName = oldBench ? getCardDisplayName(oldBench.card) : 'โปเกมอน';
    next.historyLog.push(`🔄 ${player.name} สลับ ${activeName} ขึ้นสู่ตำแหน่ง Active (Bench #${benchIndex + 1}).`);
    return next;
  },

  retractToHand(
    state: TabletopV3State,
    side: 'player1' | 'player2',
    target: 'ACTIVE' | number
  ): TabletopV3State {
    const next = cloneState(state);
    const player = next[side];
    const slot = target === 'ACTIVE' ? player.active : player.bench[target];
    if (!slot) return next;

    player.hand.push(slot.card);
    slot.evolutionHistory.forEach((c) => player.hand.push(c));
    slot.attachedEnergies.forEach((e) => player.hand.push(e));
    if (slot.attachedTool) player.hand.push(slot.attachedTool);

    if (target === 'ACTIVE') {
      player.active = null;
    } else {
      player.bench[target] = null;
    }

    next.historyLog.push(`${player.name} เก็บ ${getCardDisplayName(slot.card)} ขึ้นมือ.`);
    return next;
  },

  shufflePokemonToDeck(
    state: TabletopV3State,
    side: 'player1' | 'player2',
    target: 'ACTIVE' | number
  ): TabletopV3State {
    const next = cloneState(state);
    const player = next[side];
    const slot = target === 'ACTIVE' ? player.active : player.bench[target];
    if (!slot) return next;

    const cardsToDeck: CardInstance[] = [
      slot.card,
      ...slot.evolutionHistory,
      ...slot.attachedEnergies,
      ...(slot.attachedTool ? [slot.attachedTool] : []),
    ];

    player.deck.push(...cardsToDeck);

    if (target === 'ACTIVE') {
      player.active = null;
    } else {
      player.bench[target] = null;
    }

    // Shuffle entire deck using Fisher-Yates
    for (let i = player.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [player.deck[i], player.deck[j]] = [player.deck[j], player.deck[i]];
    }

    const cardDisplayName = getCardDisplayName(slot.card);
    const count = cardsToDeck.length;
    next.historyLog.push(`${player.name} นำ ${cardDisplayName} และการ์ดที่ติดทั้งหมด (${count} ใบ) กลับเข้ากองการ์ดแล้วสับ.`);
    next.actionToast = {
      id: `toast-shuffle-pokemon-${Date.now()}`,
      message: `🔀 ${player.name}: นำ ${cardDisplayName} และการ์ดที่ติดทั้งหมด (${count} ใบ) กลับเข้ากองการ์ดแล้วสับ`,
      icon: '🔀',
      playerSide: side,
      type: 'INFO',
      cardImageUrl: resolveCardImageUrl(slot.card),
      cardName: cardDisplayName,
      timestamp: Date.now(),
    };
    return next;
  },

  knockOut(
    state: TabletopV3State,
    side: 'player1' | 'player2',
    target: 'ACTIVE' | number,
    toLostZone: boolean = false
  ): TabletopV3State {
    const next = cloneState(state);
    const player = next[side];
    const slot = target === 'ACTIVE' ? player.active : player.bench[target];
    if (!slot) return next;

    const dest = toLostZone ? player.lostZone : player.discard;
    dest.push(slot.card);
    slot.evolutionHistory.forEach((c) => dest.push(c));
    slot.attachedEnergies.forEach((e) => dest.push(e));
    if (slot.attachedTool) dest.push(slot.attachedTool);

    if (target === 'ACTIVE') {
      player.active = null;
    } else {
      player.bench[target] = null;
    }

    const cardDisplayName = getCardDisplayName(slot.card);
    next.historyLog.push(`${cardDisplayName} ของ ${player.name} ถูกน็อคเอาท์.`);
    next.actionToast = {
      id: `toast-ko-${Date.now()}`,
      message: `💀 ${player.name}: ${cardDisplayName} ถูกน็อคเอาท์ (Knocked Out) ลงสุสาน`,
      icon: '💀',
      playerSide: side,
      type: 'INFO',
      cardImageUrl: resolveCardImageUrl(slot.card),
      cardName: cardDisplayName,
      timestamp: Date.now(),
    };
    return next;
  },

  moveEnergy(
    state: TabletopV3State,
    side: 'player1' | 'player2',
    source: 'ACTIVE' | number,
    energyId: string,
    dest: 'ACTIVE' | number | 'HAND' | 'DISCARD'
  ): TabletopV3State {
    const next = cloneState(state);
    const player = next[side];
    const srcSlot = source === 'ACTIVE' ? player.active : player.bench[source];
    if (!srcSlot) return next;

    const eIdx = srcSlot.attachedEnergies.findIndex((e) => e.instanceId === energyId);
    if (eIdx === -1) return next;

    const [energy] = srcSlot.attachedEnergies.splice(eIdx, 1);

    if (dest === 'HAND') {
      player.hand.push(energy);
    } else if (dest === 'DISCARD') {
      player.discard.push(energy);
    } else {
      const destSlot = dest === 'ACTIVE' ? player.active : player.bench[dest];
      if (destSlot) {
        destSlot.attachedEnergies.push(energy);
      } else {
        player.hand.push(energy);
      }
    }

    next.historyLog.push(`${player.name} ย้ายพลังงาน ${getCardDisplayName(energy)}.`);
    return next;
  },

  shuffleDeck(state: TabletopV3State, side: 'player1' | 'player2'): TabletopV3State {
    const next = cloneState(state);
    const player = next[side];
    player.deck = shuffleArray(player.deck);
    next.historyLog.push(`${player.name} shuffled deck.`);
    next.actionToast = {
      id: Math.random().toString(),
      message: `🔀 ${player.name} สับกองสำรับ`,
      icon: '🔀',
      playerSide: side,
      timestamp: Date.now(),
    };
    return next;
  },

  passTurn(state: TabletopV3State): TabletopV3State {
    const next = cloneState(state);
    const nextTurn = next.currentTurn === 'player1' ? 'player2' : 'player1';
    next.currentTurn = nextTurn;
    next.turnCount += 1;

    // Reset turn tracking flags for both players
    next.player1.hasAttachedEnergyThisTurn = false;
    next.player1.hasPlayedSupporterThisTurn = false;
    next.player2.hasAttachedEnergyThisTurn = false;
    next.player2.hasPlayedSupporterThisTurn = false;

    // Reset abilities for all Pokémon on the table
    const resetAbility = (slot: TabletopPokemonSlot | null) => {
      if (slot) slot.abilityUsed = false;
    };
    resetAbility(next.player1.active);
    next.player1.bench.forEach(resetAbility);
    resetAbility(next.player2.active);
    next.player2.bench.forEach(resetAbility);

    next.historyLog.push(`Turn passed to ${next[nextTurn].name} (Turn ${next.turnCount}).`);
    return next;
  },

  toggleSoloReveal(state: TabletopV3State): TabletopV3State {
    const next = cloneState(state);
    next.soloRevealAllHands = !next.soloRevealAllHands;
    next.historyLog.push(
      next.soloRevealAllHands
        ? 'โหมดซ้อมคนเดียว: เปิดดูการ์ดบนมือทั้งสองฝั่ง'
        : 'โหมดป้องกันการแอบดู: คว่ำการ์ดบนมือฝั่งตรงข้าม'
    );
    return next;
  },

  setPerspective(
    state: TabletopV3State,
    perspective: 'player1' | 'player2' | 'both'
  ): TabletopV3State {
    const next = cloneState(state);
    next.perspective = perspective;
    return next;
  },

  changeDeck(
    state: TabletopV3State,
    side: 'player1' | 'player2',
    deckCards: CardInstance[],
    deckName: string
  ): TabletopV3State {
    const next = cloneState(state);
    next[side] = createPlayerSideState(
      side,
      side === 'player1' ? 'Player 1 (คุณ)' : 'Player 2 (คู่ต่อสู้)',
      deckCards,
      deckName
    );
    next.historyLog.push(`${next[side].name} changed deck to ${deckName}.`);
    return next;
  },

  setupPrizes(
    state: TabletopV3State,
    side: 'player1' | 'player2',
    count: number = 6
  ): TabletopV3State {
    const next = cloneState(state);
    const player = next[side];
    const toPlace = Math.min(count, player.deck.length);
    if (toPlace === 0) return next;
    const taken = player.deck.splice(0, toPlace).map((c) => ({ ...c, isFacedown: true }));
    player.prizes.push(...taken);
    next.historyLog.push(`${player.name} placed ${toPlace} prize card(s) from deck.`);
    return next;
  },

  mulligan(
    state: TabletopV3State,
    side: 'player1' | 'player2'
  ): TabletopV3State {
    const next = cloneState(state);
    const player = next[side];
    player.deck.push(...player.hand);
    player.hand = [];
    player.deck = shuffleArray(player.deck);
    const drawn = player.deck.splice(0, Math.min(7, player.deck.length));
    player.hand = drawn;
    next.isGameStarted = false;
    next.historyLog.push(`${player.name} performed Mulligan: shuffled hand into deck and drew 7 cards.`);
    return next;
  },

  setFirstPlayer(
    state: TabletopV3State,
    side: 'player1' | 'player2'
  ): TabletopV3State {
    const next = cloneState(state);
    next.currentTurn = side;
    next.historyLog.push(`🎯 กำหนดให้ ${next[side].name} เป็นฝ่ายเริ่มก่อน.`);
    return next;
  },

  startNewMatch(
    state: TabletopV3State,
    p1Cards: CardInstance[],
    p1Name: string,
    p2Cards: CardInstance[],
    p2Name: string,
    firstPlayer: 'player1' | 'player2' = 'player1'
  ): TabletopV3State {
    const p1 = createPlayerSideState('player1', 'Player 1 (คุณ)', p1Cards, p1Name, true);
    const p2 = createPlayerSideState('player2', 'Player 2 (คู่ต่อสู้)', p2Cards, p2Name, true);

    return {
      player1: p1,
      player2: p2,
      stadium: null,
      stadiumOwnerSide: null,
      activeSpotlight: null,
      currentTurn: firstPlayer,
      perspective: state.perspective,
      myRole: state.myRole,
      roomMode: state.roomMode,
      roomCode: state.roomCode,
      soloRevealAllHands: state.soloRevealAllHands,
      turnCount: 1,
      isGameStarted: false,
      winner: null,
      turnDecision: null,
      historyLog: [
        `🎮 เริ่มเกมใหม่ (New Match Started): ${p1.name} (${p1Name}) vs ${p2.name} (${p2Name}).`,
        `🎯 ฝ่ายที่ได้เริ่มก่อน: ${firstPlayer === 'player1' ? p1.name : p2.name}`,
      ],
    };
  },

  resetToSetup(state: TabletopV3State): TabletopV3State {
    const next = cloneState(state);
    next.isGameStarted = false;
    next.winner = null;
    next.turnCount = 1;
    next.turnDecision = null;
    next.activeSpotlight = null;
    next.stadium = null;
    next.stadiumOwnerSide = null;
    next.combatState = null;
    next.pendingConsent = null;
    (['player1', 'player2'] as const).forEach((s) => {
      next[s].active = null;
      // Rematch resets to the standard 5-slot bench (Stadium bench expansion must be re-declared)
      next[s].benchLimit = 5;
      next[s].bench = [];
      next[s].prizes = [];
      next[s].hand = [];
      next[s].discard = [];
      next[s].lostZone = [];
      next[s].deck = [];
      next[s].deckName = 'ยังไม่ได้เลือกเด็ค';
      next[s].hasAttachedEnergyThisTurn = false;
      next[s].hasPlayedSupporterThisTurn = false;
    });
    next.historyLog.push('🔄 รีเซ็ตกระดานเพื่อเริ่มเกมใหม่และเลือกเด็คใหม่พร้อมกัน');
    return next;
  },

  toggleFacedown(
    state: TabletopV3State,
    side: 'player1' | 'player2',
    target: 'ACTIVE' | number
  ): TabletopV3State {
    const next = cloneState(state);
    const player = next[side];
    const slot = target === 'ACTIVE' ? player.active : player.bench[target];
    if (!slot) return next;

    const nowFacedown = !(slot.isFacedown ?? slot.card.isFacedown);
    slot.isFacedown = nowFacedown;
    slot.card.isFacedown = nowFacedown;
    const cardName = getCardDisplayName(slot.card);
    next.historyLog.push(
      nowFacedown
        ? `${player.name} คว่ำหน้า ${cardName}.`
        : `${player.name} พลิกหงายหน้า ${cardName}!`
    );
    return next;
  },

  revealAllFacedown(
    state: TabletopV3State,
    side?: 'player1' | 'player2'
  ): TabletopV3State {
    const readiness = checkSetupReadiness(state);
    if (!readiness.isReady) {
      const next = cloneState(state);
      next.actionToast = {
        id: `setup-warning-${Date.now()}`,
        message: readiness.message,
        icon: '⚠️',
        type: 'WARNING',
        timestamp: Date.now(),
      };
      return next;
    }

    const next = cloneState(state);
    const sides: ('player1' | 'player2')[] = side ? [side] : ['player1', 'player2'];
    let count = 0;

    sides.forEach((s) => {
      const p = next[s];
      if (p.active && (p.active.isFacedown || p.active.card.isFacedown)) {
        p.active.isFacedown = false;
        p.active.card.isFacedown = false;
        count++;
      }
      p.bench.forEach((b) => {
        if (b && (b.isFacedown || b.card.isFacedown)) {
          b.isFacedown = false;
          b.card.isFacedown = false;
          count++;
        }
      });
    });

    next.isGameStarted = true;
    if (next.pendingConsent?.actionType === 'START_GAME') {
      next.pendingConsent = null;
    }
    if (count > 0) {
      next.historyLog.push(`✨ Let's Play! พลิกหงายโปเกมอนที่คว่ำหน้าทั้งหมด (${count} ใบ) ขึ้นพร้อมกัน!`);
    }
    return next;
  },

  toggleAbility(
    state: TabletopV3State,
    side: 'player1' | 'player2',
    target: 'ACTIVE' | number
  ): TabletopV3State {
    const next = cloneState(state);
    const player = next[side];
    const slot = target === 'ACTIVE' ? player.active : player.bench[target];
    if (!slot) return next;

    const willUse = !slot.abilityUsed;
    slot.abilityUsed = willUse;

    const cardName = getCardDisplayName(slot.card);
    const targetName = target === 'ACTIVE' ? 'Active' : `Bench #${target + 1}`;

    if (willUse) {
      next.historyLog.push(`⚡ ${player.name} ประกาศใช้ความสามารถของ ${cardName} (${targetName})!`);
      next.actionToast = {
        id: `toast-${Date.now()}`,
        message: `⚡ ${player.name} ประกาศใช้ความสามารถ (${cardName})!`,
        icon: '⚡',
        playerSide: side,
        type: 'SUCCESS',
        timestamp: Date.now(),
      };
      next.vfxEvent = {
        id: `vfx-ability-${Date.now()}`,
        type: 'ABILITY',
        cardName,
        cardImageUrl: resolveCardImageUrl(slot.card, true),
        abilityName: 'ความสามารถ (Ability)',
        subtitle: targetName,
        playerSide: side,
        timestamp: Date.now(),
      };
    } else {
      next.historyLog.push(`↩️ ${player.name} ยกเลิก/รีเซ็ตการใช้ความสามารถของ ${cardName} (${targetName}).`);
      next.actionToast = {
        id: `toast-${Date.now()}`,
        message: `↩️ ${player.name} รีเซ็ตการใช้ความสามารถของ ${cardName}`,
        icon: '↩️',
        playerSide: side,
        type: 'INFO',
        timestamp: Date.now(),
      };
    }
    return next;
  },

  toggleTurnTracking(
    state: TabletopV3State,
    side: 'player1' | 'player2',
    type: 'ENERGY' | 'SUPPORTER'
  ): TabletopV3State {
    const next = cloneState(state);
    const player = next[side];
    if (type === 'ENERGY') {
      player.hasAttachedEnergyThisTurn = !player.hasAttachedEnergyThisTurn;
      next.historyLog.push(
        `${player.name} ${player.hasAttachedEnergyThisTurn ? 'บันทึก: ติด Energy รอบนี้แล้ว' : 'รีเซ็ตสถานะการติด Energy'}.`
      );
    } else {
      player.hasPlayedSupporterThisTurn = !player.hasPlayedSupporterThisTurn;
      next.historyLog.push(
        `${player.name} ${player.hasPlayedSupporterThisTurn ? 'บันทึก: ใช้ Supporter รอบนี้แล้ว' : 'รีเซ็ตสถานะการใช้ Supporter'}.`
      );
    }
    return next;
  },

  retreatActive(
    state: TabletopV3State,
    side: 'player1' | 'player2',
    benchIndex: number,
    discardEnergyIds: string[] = []
  ): TabletopV3State {
    const next = cloneState(state);
    const player = next[side];
    const retreatLimit = player.benchLimit || player.bench.length || 5;
    if (benchIndex < 0 || benchIndex >= retreatLimit) return next;
    const oldActive = player.active;
    const oldBench = player.bench[benchIndex];

    // Case 1: Active is empty, promote bench to Active
    if (!oldActive && oldBench) {
      player.active = oldBench;
      player.bench[benchIndex] = null;
      const benchName = getCardDisplayName(oldBench.card);
      next.historyLog.push(`🔄 ${player.name} ส่ง ${benchName} จากเบนช์ #${benchIndex + 1} ขึ้นสู่ตำแหน่ง Active.`);
      next.actionToast = {
        id: Math.random().toString(),
        message: `🔄 ${player.name} ย้าย ${benchName} ขึ้นสู่ตำแหน่ง Active`,
        icon: '🔄',
        playerSide: side,
        timestamp: Date.now(),
      };
      return next;
    }

    // Case 2: Active exists, move to empty bench
    if (oldActive && !oldBench) {
      player.bench[benchIndex] = oldActive;
      player.active = null;
      const activeName = getCardDisplayName(oldActive.card);
      next.historyLog.push(`🔄 ${player.name} ย้าย ${activeName} จากตำแหน่ง Active ไปเบนช์ #${benchIndex + 1}.`);
      next.actionToast = {
        id: Math.random().toString(),
        message: `🔄 ${player.name} ย้าย ${activeName} ลงเบนช์ #${benchIndex + 1}`,
        icon: '🔄',
        playerSide: side,
        timestamp: Date.now(),
      };
      return next;
    }

    if (!oldActive || !oldBench) return next;

    // Case 3: Both exist -> Normal Retreat / Swap
    // 1. Discard selected energies to graveyard
    if (discardEnergyIds.length > 0) {
      const remaining: CardInstance[] = [];
      oldActive.attachedEnergies.forEach((energy) => {
        if (discardEnergyIds.includes(energy.instanceId)) {
          player.discard.push(energy);
        } else {
          remaining.push(energy);
        }
      });
      oldActive.attachedEnergies = remaining;
    }

    // 2. Clear special conditions upon retreating (official rule)
    oldActive.specialConditions = [];

    // 3. Swap Active with Bench
    player.active = oldBench;
    player.bench[benchIndex] = oldActive;

    const activeName = getCardDisplayName(oldActive.card);
    const newActiveName = getCardDisplayName(oldBench.card);
    const discardText =
      discardEnergyIds.length > 0 ? ` (ทิ้ง ${discardEnergyIds.length} Energy ลงสุสาน)` : ' (หนีฟรี)';

    next.historyLog.push(
      `🏃 ${player.name} หนี ${activeName} ไป Bench #${benchIndex + 1}${discardText}, ส่ง ${newActiveName} ขึ้นเป็น Active!`
    );
    next.actionToast = {
      id: Math.random().toString(),
      message: `🏃 ${player.name} หนี: ส่ง ${newActiveName} ขึ้นสู่สนาม`,
      icon: '🏃',
      playerSide: side,
      timestamp: Date.now(),
    };
    return next;
  },

  swapBenchSlots(
    state: TabletopV3State,
    side: 'player1' | 'player2',
    fromIndex: number,
    toIndex: number
  ): TabletopV3State {
    const next = cloneState(state);
    const player = next[side];
    const limit = player.benchLimit || player.bench.length || 5;
    if (fromIndex < 0 || fromIndex >= limit || toIndex < 0 || toIndex >= limit || fromIndex === toIndex) return next;
    const temp = player.bench[fromIndex];
    player.bench[fromIndex] = player.bench[toIndex];
    player.bench[toIndex] = temp;
    next.historyLog.push(`🔄 ${player.name} swapped Bench #${fromIndex + 1} and Bench #${toIndex + 1}.`);
    next.actionToast = {
      id: Math.random().toString(),
      message: `🔄 สลับเบนช์ #${fromIndex + 1} ↔ #${toIndex + 1}`,
      icon: '🔄',
      playerSide: side,
      timestamp: Date.now(),
    };
    return next;
  },

  /**
   * Move remaining inspected cards to the BOTTOM of the deck
   */
  putInspectedCardsToBottom(
    state: TabletopV3State,
    side: 'player1' | 'player2',
    remainingCardIds: string[]
  ): TabletopV3State {
    const next = cloneState(state);
    const player = next[side];
    if (!remainingCardIds || remainingCardIds.length === 0) return next;

    const remainingSet = new Set(remainingCardIds);
    const remainingCards: CardInstance[] = [];
    const newDeck: CardInstance[] = [];

    for (const card of player.deck) {
      if (remainingSet.has(card.instanceId)) {
        remainingCards.push(card);
      } else {
        newDeck.push(card);
      }
    }

    // Append remaining inspected cards to the BOTTOM of the deck (end of deck array)
    player.deck = [...newDeck, ...remainingCards];
    next.historyLog.push(
      `⬇️ ${player.name} นำการ์ดที่เหลือ ${remainingCards.length} ใบลงใต้กองสำรับ`
    );
    return next;
  },

  /**
   * Request consent from opponent (for non-solo / online play)
   */
  requestConsent(
    state: TabletopV3State,
    request: TabletopConsentRequest
  ): TabletopV3State {
    const next = cloneState(state);
    next.pendingConsent = request;
    next.historyLog.push(`🤝 ${request.requesterName}: ${request.description} (รอการยินยอม)`);
    return next;
  },

  /**
   * Respond to pending consent request
   */
  respondConsent(
    state: TabletopV3State,
    approved: boolean
  ): TabletopV3State {
    const next = cloneState(state);
    if (!next.pendingConsent) return next;
    const req = next.pendingConsent;
    next.pendingConsent = null;
    const approverSide = req.requesterSide === 'player1' ? 'player2' : 'player1';
    const approverName = next[approverSide].name;

    next.lastConsentResult = {
      actionType: req.actionType,
      approved,
      requesterSide: req.requesterSide,
      timestamp: Date.now(),
      payload: {
        ...req.payload,
        revealedCard: req.revealedCard || req.payload?.revealedCard,
      },
      revealedCard: req.revealedCard || req.payload?.revealedCard,
    };

    if (approved) {
      next.historyLog.push(`✅ ${approverName} ยินยอม: ${req.description}`);
    } else {
      next.historyLog.push(`❌ ${approverName} ปฏิเสธ: ${req.description}`);
    }
    return next;
  },

  /**
   * Toggle 2-Player Consent Mode
   */
  toggleConsentRequired(state: TabletopV3State): TabletopV3State {
    const next = cloneState(state);
    next.isConsentRequired = !next.isConsentRequired;
    next.historyLog.push(
      `🤝 ระบบขอความยินยอม (Consent Mode): ${next.isConsentRequired ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}`
    );
    return next;
  },

  /**
   * Start Attack Targeting Mode (Attacker glows, Target reticle appears on opponent Active)
   */
  startAttackDeclaration(
    state: TabletopV3State,
    attackerSide: 'player1' | 'player2',
    attackerPosition: 'ACTIVE' | number,
    attackName: string,
    baseDamage: number
  ): TabletopV3State {
    const next = cloneState(state);
    const targetSide = attackerSide === 'player1' ? 'player2' : 'player1';
    const attackerPlayer = next[attackerSide];
    const defenderPlayer = next[targetSide];

    const attackerSlot =
      attackerPosition === 'ACTIVE'
        ? attackerPlayer.active
        : attackerPlayer.bench[attackerPosition];
    if (!attackerSlot) return next;

    // Default target: Defender's Active Pokémon, or first bench slot if active is empty
    let targetPosition: 'ACTIVE' | number = 'ACTIVE';
    let defenderSlot = defenderPlayer.active;
    if (!defenderSlot) {
      const firstBenchIdx = defenderPlayer.bench.findIndex((b) => b !== null);
      if (firstBenchIdx !== -1) {
        targetPosition = firstBenchIdx;
        defenderSlot = defenderPlayer.bench[firstBenchIdx];
      }
    }

    const attackerCard = attackerSlot.card;
    const defenderCard = defenderSlot ? defenderSlot.card : null;
    const isBench = targetPosition !== 'ACTIVE';

    const calc = calculateCombatDamage(attackerCard, defenderCard, baseDamage, isBench);

    const attackerCardName = getCardDisplayName(attackerCard);
    const targetCardName = defenderCard
      ? getCardDisplayName(defenderCard)
      : 'ไม่มีเป้าหมาย';
    const finalAttackName = getAttackDisplayName(attackName);

    const combatId = `combat_${attackerSide}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    next.combatState = {
      id: combatId,
      attackerSide,
      attackerPosition,
      attackerCardName,
      attackerEnergyType: attackerCard.energyType,
      attackName: finalAttackName,
      baseDamage,
      targetSide,
      targetPosition,
      targetCardName,
      isWeakness: calc.isWeakness,
      isResistance: calc.isResistance,
      weaknessType: calc.weaknessType,
      resistanceType: calc.resistanceType,
      calculatedDamage: calc.finalDamage,
      description: calc.description,
      timestamp: Date.now(),
    };

    const toastMsg = `⚔️ ${attackerPlayer.name}: สั่งโจมตีด้วย [${finalAttackName}] (${calc.finalDamage} DMG)`;
    next.actionToast = {
      id: Math.random().toString(),
      message: toastMsg,
      icon: '⚔️',
      playerSide: attackerSide,
      timestamp: Date.now(),
    };

    next.historyLog.push(
      `⚔️ ${attackerPlayer.name} สั่งโจมตี: ${attackerCardName} ใช้ท่า [${finalAttackName}] เล็งไปที่ ${targetCardName} (${calc.finalDamage} DMG${calc.isWeakness ? ' - ชนะธาตุ x2' : ''}${calc.isResistance ? ' - ต้านทาน -30' : ''})`
    );

    return next;
  },

  /**
   * Switch combat target (e.g. Bench Snipe)
   */
  setCombatTarget(
    state: TabletopV3State,
    targetPosition: 'ACTIVE' | number
  ): TabletopV3State {
    const next = cloneState(state);
    if (!next.combatState) return next;

    const targetSide = next.combatState.targetSide;
    const defenderPlayer = next[targetSide];
    const attackerPlayer = next[next.combatState.attackerSide];

    const defenderSlot =
      targetPosition === 'ACTIVE'
        ? defenderPlayer.active
        : defenderPlayer.bench[targetPosition];
    if (!defenderSlot) return next;

    const attackerSlot =
      next.combatState.attackerPosition === 'ACTIVE'
        ? attackerPlayer.active
        : attackerPlayer.bench[next.combatState.attackerPosition];
    const attackerCard = attackerSlot ? attackerSlot.card : null;
    const defenderCard = defenderSlot.card;
    const isBench = targetPosition !== 'ACTIVE';

    const calc = calculateCombatDamage(
      attackerCard,
      defenderCard,
      next.combatState.baseDamage,
      isBench
    );
    const targetCardName = getCardDisplayName(defenderCard);

    next.combatState.targetPosition = targetPosition;
    next.combatState.targetCardName = targetCardName;
    next.combatState.isWeakness = calc.isWeakness;
    next.combatState.isResistance = calc.isResistance;
    next.combatState.weaknessType = calc.weaknessType;
    next.combatState.resistanceType = calc.resistanceType;
    next.combatState.calculatedDamage = calc.finalDamage;
    next.combatState.description = calc.description;

    return next;
  },

  /**
   * Apply Combat Damage to Target Pokémon
   */
  applyCombatDamage(
    state: TabletopV3State,
    damageOverride?: number
  ): TabletopV3State {
    const next = cloneState(state);
    if (!next.combatState) return next;

    const {
      targetSide,
      targetPosition,
      attackerSide,
      attackName,
      attackerCardName,
      targetCardName,
    } = next.combatState;
    const damageToApply =
      typeof damageOverride === 'number'
        ? damageOverride
        : next.combatState.calculatedDamage;

    const defenderPlayer = next[targetSide];
    const defenderSlot =
      targetPosition === 'ACTIVE'
        ? defenderPlayer.active
        : defenderPlayer.bench[targetPosition];

    if (defenderSlot) {
      defenderSlot.damage = Math.max(0, (defenderSlot.damage || 0) + damageToApply);
    }

    const toastMsg = `💥 ${attackerCardName} โจมตี ${targetCardName} เข้าเป้า +${damageToApply} DMG!`;
    next.actionToast = {
      id: Math.random().toString(),
      message: toastMsg,
      icon: '💥',
      playerSide: attackerSide,
      timestamp: Date.now(),
    };

    next.historyLog.push(
      `💥 ${attackerCardName} ใช้ท่า [${attackName}] ทำดาเมจ +${damageToApply} DMG ใส่ ${targetCardName} (สะสมรวม: ${defenderSlot?.damage || 0} DMG)`
    );

    // Record resolved combat result with timestamp to guard against replay race conditions
    next.lastCombatResult = {
      id: next.combatState.id,
      attackerSide: next.combatState.attackerSide,
      damageApplied: damageToApply,
      timestamp: next.combatState.timestamp,
      resolvedAt: Date.now(),
    };

    // Clear combat mode
    next.combatState = null;
    return next;
  },

  /**
   * Cancel Combat Mode
   */
  cancelCombat(state: TabletopV3State): TabletopV3State {
    const next = cloneState(state);
    if (!next.combatState) return next;
    next.lastCombatResult = {
      id: next.combatState.id,
      attackerSide: next.combatState.attackerSide,
      damageApplied: 0,
      timestamp: next.combatState.timestamp,
      resolvedAt: Date.now(),
    };
    next.combatState = null;
    next.historyLog.push(`❌ ยกเลิกการสั่งโจมตี`);
    return next;
  },

  /**
   * Set Action Toast
   */
  setActionToast(
    state: TabletopV3State,
    toast: {
      message: string;
      icon?: string;
      playerSide?: 'player1' | 'player2';
      type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
      id?: string;
      timestamp?: number;
    }
  ): TabletopV3State {
    const next = cloneState(state);
    next.actionToast = {
      id: toast.id || `toast-${Date.now()}`,
      message: toast.message,
      icon: toast.icon || (toast.type === 'WARNING' ? '⚠️' : '⚡'),
      playerSide: toast.playerSide,
      type: toast.type || 'INFO',
      timestamp: toast.timestamp || Date.now(),
    };
    return next;
  },

  /**
   * Clear Action Toast
   */
  clearActionToast(state: TabletopV3State): TabletopV3State {
    const next = cloneState(state);
    next.actionToast = null;
    return next;
  },

  /**
   * Quick Setup board (draw 7, place active face down, place 6 prizes)
   */
  quickSetup(
    state: TabletopV3State,
    targetSide?: 'player1' | 'player2' | 'both'
  ): TabletopV3State {
    let next = cloneState(state);
    const sidesToSetup: ('player1' | 'player2')[] =
      targetSide === 'player1'
        ? ['player1']
        : targetSide === 'player2'
        ? ['player2']
        : ['player1', 'player2'];

    for (const side of sidesToSetup) {
      const player = next[side];
      if (player.hand.length === 0 && player.deck.length > 0) {
        next = TabletopActions.drawCards(next, side, Math.min(7, player.deck.length));
      }
      if (!next[side].active && next[side].hand.length > 0) {
        const pokeIdx = next[side].hand.findIndex(
          (c) => (c.supertype as string) === 'Pokémon' || (c as any).hp || (c as any).types
        );
        const cardToPlace = pokeIdx !== -1 ? next[side].hand[pokeIdx] : next[side].hand[0];
        if (cardToPlace) {
          next = TabletopActions.placeFromHand(next, side, cardToPlace.instanceId, 'ACTIVE', true);
        }
      }
      if (next[side].prizes.length === 0 && next[side].deck.length > 0) {
        next = TabletopActions.setupPrizes(next, side, Math.min(6, next[side].deck.length));
      }
    }

    next.historyLog.push('⚡ จัดบอร์ดอัตโนมัติ (Quick Setup) เรียบร้อยแล้ว');
    return next;
  },

  setTurnDecision(state: TabletopV3State, decision: TabletopTurnDecision | null): TabletopV3State {
    const next = cloneState(state);
    next.turnDecision = decision;
    if (decision?.startingPlayer) {
      next.currentTurn = decision.startingPlayer;
    }
    return next;
  },

  setActiveCoinFlip(state: TabletopV3State, coinFlip: TabletopActiveCoinFlip | null): TabletopV3State {
    const next = cloneState(state);
    next.activeCoinFlip = coinFlip;
    if (coinFlip?.result && !coinFlip.isFlipping) {
      const outcomeText = coinFlip.result === 'HEADS' ? 'ออกหัว (HEADS) 👑' : 'ออกก้อย (TAILS) ⭐';
      next.historyLog.push(`🪙 ${coinFlip.initiatorName} ทอยเหรียญได้: ${outcomeText}`);
    }
    return next;
  },

  detachTool(
    state: TabletopV3State,
    side: 'player1' | 'player2',
    target: 'ACTIVE' | number,
    toZone: 'HAND' | 'DISCARD'
  ): TabletopV3State {
    const next = cloneState(state);
    const player = next[side];
    const slot = target === 'ACTIVE' ? player.active : player.bench[target];
    if (!slot || !slot.attachedTool) return next;

    const tool = slot.attachedTool;
    slot.attachedTool = null;
    if (toZone === 'HAND') {
      player.hand.push(tool);
      next.historyLog.push(`${player.name} ย้ายไอเท็ม ${getCardDisplayName(tool)} กลับขึ้นมือ`);
    } else {
      player.discard.push(tool);
      next.historyLog.push(`${player.name} ทิ้งไอเท็ม ${getCardDisplayName(tool)} ลงสุสาน`);
    }
    return next;
  },

  setVfxEvent(state: TabletopV3State, vfx: TabletopVfxEvent | null): TabletopV3State {
    const next = cloneState(state);
    next.vfxEvent = vfx;
    return next;
  },

  openMulliganReveal(
    state: TabletopV3State,
    side: 'player1' | 'player2'
  ): TabletopV3State {
    const next = cloneState(state);
    const player = next[side];
    const hasBasic = checkHasBasicPokemon(player.hand);

    next.mulliganReveal = {
      id: `mulligan-${Date.now()}`,
      side,
      playerName: player.name || (side === 'player1' ? 'ผู้เล่น 1' : 'ผู้เล่น 2'),
      handCards: [...player.hand],
      hasBasic,
      status: 'PENDING',
      timestamp: Date.now(),
    };

    next.historyLog.push(
      `🔄 ${player.name} ตรวจสอบมัลลิแกน: ${
        hasBasic
          ? 'พบ Basic Pokémon บนมือ'
          : 'ไม่มี Basic Pokémon บนมือ (แสดงการ์ดให้ฝ่ายตรงข้ามตรวจสอบ)'
      }`
    );
    return next;
  },

  confirmMulligan(
    state: TabletopV3State,
    side: 'player1' | 'player2'
  ): TabletopV3State {
    let next = cloneState(state);
    const playerHand = [...next[side].hand];
    const hasBasic = checkHasBasicPokemon(playerHand);
    next = TabletopActions.mulligan(next, side);
    const opponentSide = side === 'player1' ? 'player2' : 'player1';
    const opponent = next[opponentSide];

    next.mulliganReveal = {
      id: `mulligan-${Date.now()}`,
      side,
      playerName: next[side].name || (side === 'player1' ? 'ผู้เล่น 1' : 'ผู้เล่น 2'),
      handCards: playerHand,
      hasBasic,
      status: 'CONFIRMED',
      timestamp: Date.now(),
    };

    next.actionToast = {
      id: `toast-${Date.now()}`,
      message: `🔄 ${next[side].name} สับการ์ดและจั่วใหม่ 7 ใบแล้ว! ${opponent.name} มีสิทธิ์จั่วโบนัส 1 ใบ`,
      icon: '🎁',
      playerSide: side,
      type: 'INFO',
      timestamp: Date.now(),
    };
    return next;
  },

  claimMulliganBonusDraw(
    state: TabletopV3State,
    claimingSide: 'player1' | 'player2'
  ): TabletopV3State {
    const next = cloneState(state);
    const claimer = next[claimingSide];
    if (claimer.deck.length > 0) {
      const drawn = claimer.deck.shift()!;
      claimer.hand.push(drawn);
      next.historyLog.push(
        `🎁 ${claimer.name} ใช้สิทธิ์จั่วการ์ดโบนัส 1 ใบจาก Mulligan ของฝ่ายตรงข้าม (เหลือในเด็ค ${claimer.deck.length} ใบ)`
      );
      next.actionToast = {
        id: `toast-${Date.now()}`,
        message: `🎁 ${claimer.name} ได้รับการ์ดโบนัส 1 ใบ!`,
        icon: '🎁',
        playerSide: claimingSide,
        type: 'SUCCESS',
        timestamp: Date.now(),
      };
    }
    next.mulliganReveal = null;
    return next;
  },

  dismissMulliganReveal(state: TabletopV3State): TabletopV3State {
    const next = cloneState(state);
    next.mulliganReveal = null;
    return next;
  },
};

function checkHasBasicPokemon(cards: CardInstance[]): boolean {
  return cards.some((c) => {
    if (c.supertype !== 'Pokemon') return false;
    if (c.subtypes?.some((s) => s.toLowerCase() === 'basic')) return true;
    if (c.evolvesFrom) return false;
    const isEvolution = c.subtypes?.some((s) => {
      const lower = s.toLowerCase();
      return (
        lower.includes('stage 1') ||
        lower.includes('stage 2') ||
        lower.includes('stage1') ||
        lower.includes('stage2') ||
        lower.includes('vstar') ||
        lower.includes('vmax') ||
        lower.includes('break')
      );
    });
    return !isEvolution;
  });
}



export type { CardInstance, PokemonStage, SpecialCondition } from '../../engine/types';
import type { CardInstance, PokemonStage, SpecialCondition } from '../../engine/types';

export interface TabletopPokemonSlot {
  id: string;
  card: CardInstance;
  stage: PokemonStage;
  damage: number;
  attachedEnergies: CardInstance[];
  attachedTool: CardInstance | null;
  evolutionHistory: CardInstance[];
  specialConditions: SpecialCondition[];
  isFacedown?: boolean;
  abilityUsed?: boolean;
}

export interface TabletopPlayerSideState {
  id: 'player1' | 'player2';
  name: string;
  deck: CardInstance[];
  hand: CardInstance[];
  prizes: CardInstance[];
  discard: CardInstance[];
  lostZone: CardInstance[];
  active: TabletopPokemonSlot | null;
  bench: (TabletopPokemonSlot | null)[];
  benchLimit: 5 | 8;
  deckName: string;
  hasAttachedEnergyThisTurn?: boolean;
  hasPlayedSupporterThisTurn?: boolean;
  revealedCard?: CardInstance | null;
}

export interface CenterSpotlightCard {
  id?: string;
  card: CardInstance;
  cards?: CardInstance[];
  sourceSide: 'player1' | 'player2';
  actionType: 'PLAY_TRAINER' | 'REVEAL_CARD';
  message?: string;
  timestamp: number;
}

export interface TabletopConsentRequest {
  id: string;
  requesterSide: 'player1' | 'player2';
  requesterName: string;
  actionType: 'INSPECT_TOP' | 'SHUFFLE_DECK' | 'CUT_DECK' | 'DECLARE_ATTACK' | 'START_GAME' | 'REMATCH' | 'SWITCH_POKEMON' | 'DISCARD_ENERGY' | 'CUSTOM';
  description: string;
  timestamp: number;
  payload?: any;
  revealedCards?: CardInstance[];
  revealedCard?: CardInstance;
}

export interface TabletopCombatState {
  id?: string;
  attackerSide: 'player1' | 'player2';
  attackerPosition: 'ACTIVE' | number;
  attackerCardName: string;
  attackerEnergyType?: string;
  attackName: string;
  baseDamage: number;
  targetSide: 'player1' | 'player2';
  targetPosition: 'ACTIVE' | number;
  targetCardName: string;
  isWeakness: boolean;
  isResistance: boolean;
  weaknessType?: string;
  resistanceType?: string;
  calculatedDamage: number;
  description: string;
  timestamp: number;
}

export interface TabletopActionToastItem {
  id: string;
  message: string;
  icon?: string;
  playerSide?: 'player1' | 'player2';
  type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  cardImageUrl?: string;
  cardName?: string;
  timestamp: number;
}

export interface TabletopActiveCoinFlip {
  id: string;
  initiatorSide: 'player1' | 'player2';
  initiatorName: string;
  isFlipping: boolean;
  result?: 'HEADS' | 'TAILS';
  timestamp: number;
}

export interface TabletopTurnDecision {
  phase: 'IDLE' | 'FLIPPING' | 'CHOOSING' | 'DECIDED';
  coinResult?: 'HEADS' | 'TAILS';
  winnerSide?: 'player1' | 'player2';
  chosenOrder?: 'FIRST' | 'SECOND';
  startingPlayer?: 'player1' | 'player2';
  timestamp: number;
}

export interface TabletopWinnerState {
  side: 'player1' | 'player2';
  name: string;
  reason: 'PRIZES_CLAIMED' | 'CONCEDE' | 'DECK_OUT';
  timestamp: number;
}

export interface TabletopVfxEvent {
  id: string;
  type: 'ABILITY' | 'EVOLUTION';
  cardName: string;
  cardImageUrl?: string;
  abilityName?: string;
  subtitle?: string;
  playerSide: 'player1' | 'player2';
  timestamp: number;
}

export interface TabletopMulliganReveal {
  id: string;
  side: 'player1' | 'player2';
  playerName: string;
  handCards: CardInstance[];
  hasBasic: boolean;
  status: 'PENDING' | 'CONFIRMED' | 'DISMISSED';
  timestamp: number;
}

export interface TabletopSpectatorInfo {
  id: string;
  name: string;
  email?: string;
  joinedAt: number;
}

export interface TabletopV3State {
  player1: TabletopPlayerSideState;
  player2: TabletopPlayerSideState;
  stadium: CardInstance | null;
  stadiumOwnerSide?: 'player1' | 'player2' | null;
  activeSpotlight: CenterSpotlightCard | null;
  currentTurn: 'player1' | 'player2';
  perspective: 'player1' | 'player2' | 'both';
  myRole: 'player1' | 'player2' | 'both' | 'spectator';
  roomMode: 'local' | 'online';
  roomCode: string | null;
  soloRevealAllHands: boolean;
  turnCount: number;
  historyLog: string[];
  pendingConsent?: TabletopConsentRequest | null;
  lastConsentResult?: { actionType: string; approved: boolean; requesterSide: 'player1' | 'player2'; timestamp: number; payload?: any; revealedCard?: CardInstance | null } | null;
  isConsentRequired?: boolean;
  combatState?: TabletopCombatState | null;
  lastCombatResult?: { id?: string; attackerSide: 'player1' | 'player2'; damageApplied: number; timestamp: number; resolvedAt: number } | null;
  actionToast?: TabletopActionToastItem | null;
  activeCoinFlip?: TabletopActiveCoinFlip | null;
  isGameStarted?: boolean;
  turnDecision?: TabletopTurnDecision | null;
  winner?: TabletopWinnerState | null;
  vfxEvent?: TabletopVfxEvent | null;
  mulliganReveal?: TabletopMulliganReveal | null;
  p1Email?: string;
  p2Email?: string;
  p1Uid?: string;
  p2Uid?: string;
  spectators?: TabletopSpectatorInfo[];
  createdAt?: number;
  updatedAt?: number;
}


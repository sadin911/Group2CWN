/**
 * Pokémon TCG Standard Engine — Data Contracts & Types
 * Pure TypeScript, Zero UI/DOM dependencies.
 */

export type Supertype = 'Pokemon' | 'Trainer' | 'Energy';

export type PokemonStage = 'Basic' | 'Stage1' | 'Stage2' | 'VSTAR' | 'VMAX';

export type SpecialCondition = 'POISON' | 'BURN' | 'ASLEEP' | 'PARALYZED' | 'CONFUSED';

export type TurnPhase =
  | 'PRE_GAME'
  | 'SETUP_MULLIGAN'
  | 'SETUP_PLACEMENT'
  | 'SETUP_REVEAL'
  | 'DRAW_PHASE'
  | 'MAIN_PHASE'
  | 'ATTACK_PHASE'
  | 'CHECKUP_PHASE'
  | 'PROMOTION_PHASE'
  | 'GAME_OVER';

export interface AttackCost {
  [energyType: string]: number; // e.g. { Fire: 2, Colorless: 1 }
}

export interface CardAttack {
  name: string;
  nameTh?: string;
  nameEn?: string;
  cost: AttackCost;
  damage: number;
  text?: string;
  textTh?: string;
}

export interface CardAbility {
  name: string;
  nameTh?: string;
  nameEn?: string;
  type: 'Ability';
  trigger?: 'activated' | 'on-evolution' | 'on-play' | 'checkup' | 'passive';
  isGlobalOncePerTurn?: boolean;
  text: string;
  textTh?: string;
}

export interface CardInstance {
  instanceId: string;
  cardCode: string;
  nameTh: string;
  nameEn: string;
  supertype: Supertype;
  subtypes: string[]; // e.g. ['Basic', 'ex'], ['Supporter'], ['Item']
  energyType?: string; // 'Fire', 'Water', 'Grass', 'Lightning', 'Psychic', 'Fighting', 'Darkness', 'Metal', 'Dragon', 'Colorless'
  hp?: number;
  evolvesFrom?: string; // e.g. 'Charmander', 'Charmeleon', 'Pidgeotto'
  attacks?: CardAttack[];
  abilities?: CardAbility[];
  weakness?: { type: string; value: 'x2' };
  resistance?: { type: string; value: '-30' };
  retreatCost?: number;
  imageUrl?: string;
  officialImageUrl?: string;
  imageUrlHigh?: string;
  isFacedown?: boolean;
}

export interface PokemonInPlay {
  instanceId: string;
  card: CardInstance;
  stage: PokemonStage;
  maxHp: number;
  damageCounters: number; // 1 counter = 10 damage
  attachedEnergies: CardInstance[];
  attachedTool: CardInstance | null;
  evolutionHistory: CardInstance[]; // Basic, Stage 1 cards underneath
  specialConditions: SpecialCondition[];
  turnEnteredPlay: number;
  turnEvolved: number;
}

export interface PlayerBoardState {
  playerId: string;
  playerName: string;
  deck: CardInstance[];
  hand: CardInstance[];
  prizes: CardInstance[];
  discard: CardInstance[];
  lostZone: CardInstance[];
  active: PokemonInPlay | null;
  bench: (PokemonInPlay | null)[]; // Max 5 spots standard
  mulliganCount: number;
  turnFlags: {
    energyAttachedThisTurn: boolean;
    supporterPlayedThisTurn: boolean;
    stadiumPlayedThisTurn: boolean;
    retreatedThisTurn: boolean;
    attackedThisTurn: boolean;
    abilitiesUsed: Record<string, boolean>;
    pokemonKnockedOutLastTurn?: boolean;
    exAttackBonus?: number;
    extraPrizeOnKo?: boolean;
    nonRuleBoxAttackBonus?: number;
    fightingAttackBonus?: number;
    cancelingCologneActive?: boolean;
  };
}

export interface GameState {
  gameId: string;
  turnNumber: number;
  activePlayerIndex: 0 | 1;
  firstPlayerIndex: 0 | 1;
  phase: TurnPhase;
  players: [PlayerBoardState, PlayerBoardState];
  stadium: CardInstance | null;
  winner: 0 | 1 | 'DRAW' | null;
  winReason?: 'PRIZES' | 'BENCH_OUT' | 'DECK_OUT' | 'CONCEDE';
  actionLog: GameAction[];
  pendingPromotionForPlayer?: 0 | 1;
  undoStack?: GameState[];
}

export interface EnergyAttachmentChoice {
  energyInstanceId: string;
  targetPokemonInstanceId: string;
}

export interface EffectChoices {
  targetPokemonInstanceId?: string;
  sourcePokemonInstanceId?: string;
  opponentBenchIndex?: number;
  playerBenchIndex?: number;
  selectedCardInstanceIds?: string[];
  discardCardInstanceIds?: string[];
  energyAttachments?: EnergyAttachmentChoice[];
  targetBenchIndices?: number[];
  damageAssignments?: Record<string, number>;
  opponentPokemonInstanceId?: string;
  choiceIndex?: number;
}

export interface EffectExecutionResult {
  success: boolean;
  error?: string;
  extraPrizesTaken?: number;
  message?: string;
}

export type GameAction =
  | { type: 'SETUP_DECKS'; player0Deck: CardInstance[]; player1Deck: CardInstance[]; firstPlayerIndex: 0 | 1 }
  | { type: 'EXECUTE_MULLIGAN'; playerIndex: 0 | 1 }
  | { type: 'CONFIRM_OPENING_HAND'; playerIndex: 0 | 1 }
  | { type: 'CLAIM_MULLIGAN_DRAWS'; playerIndex: 0 | 1; drawCount: number }
  | { type: 'SET_INITIAL_ACTIVE'; playerIndex: 0 | 1; cardInstanceId: string }
  | { type: 'SET_INITIAL_BENCH'; playerIndex: 0 | 1; cardInstanceIds: string[] }
  | { type: 'REVEAL_AND_START_GAME' }
  | { type: 'DRAW_TURN_CARD'; playerIndex: 0 | 1 }
  | { type: 'PLAY_BASIC_POKEMON'; playerIndex: 0 | 1; cardInstanceId: string; benchIndex?: number; targetPosition?: 'ACTIVE' | 'BENCH' }
  | { type: 'EVOLVE_POKEMON'; playerIndex: 0 | 1; evolutionCardInstanceId: string; targetPokemonInstanceId: string; choices?: EffectChoices }
  | { type: 'ATTACH_ENERGY'; playerIndex: 0 | 1; energyCardInstanceId: string; targetPokemonInstanceId: string }
  | { type: 'ATTACH_TOOL'; playerIndex: 0 | 1; toolCardInstanceId: string; targetPokemonInstanceId: string }
  | { type: 'PLAY_ITEM'; playerIndex: 0 | 1; itemCardInstanceId: string; choices?: EffectChoices }
  | { type: 'PLAY_SUPPORTER'; playerIndex: 0 | 1; supporterCardInstanceId: string; choices?: EffectChoices }
  | { type: 'PLAY_STADIUM'; playerIndex: 0 | 1; stadiumCardInstanceId: string }
  | { type: 'USE_ABILITY'; playerIndex: 0 | 1; sourcePokemonInstanceId: string; abilityName: string; choices?: EffectChoices }
  | { type: 'RETREAT_ACTIVE'; playerIndex: 0 | 1; benchIndex: number; energyDiscardInstanceIds: string[] }
  | { type: 'DECLARE_ATTACK'; playerIndex: 0 | 1; attackIndex: number; choices?: EffectChoices }
  | { type: 'PASS_TURN'; playerIndex: 0 | 1 }
  | { type: 'EXECUTE_CHECKUP' }
  | { type: 'PROMOTE_BENCH_TO_ACTIVE'; playerIndex: 0 | 1; benchIndex: number }
  | { type: 'CONCEDE'; playerIndex: 0 | 1 }
  // Tabletop Sandbox & Full Player Agency Actions (Playmat V3)
  | { type: 'MANUAL_DRAW_CARDS'; playerIndex: 0 | 1; count: number }
  | {
      type: 'MANUAL_MOVE_CARD';
      playerIndex: 0 | 1;
      cardInstanceId: string;
      fromZone: 'DECK' | 'HAND' | 'DISCARD' | 'LOST_ZONE' | 'PRIZES' | 'BENCH' | 'ACTIVE';
      toZone: 'DECK' | 'HAND' | 'DISCARD' | 'LOST_ZONE' | 'PRIZES' | 'BENCH' | 'ACTIVE';
      deckPosition?: 'TOP' | 'BOTTOM';
      benchIndex?: number;
    }
  | { type: 'MANUAL_ADJUST_DAMAGE'; targetPokemonInstanceId: string; damageDelta: number }
  | { type: 'MANUAL_SET_DAMAGE'; targetPokemonInstanceId: string; damage: number }
  | { type: 'MANUAL_MOVE_DAMAGE'; sourcePokemonInstanceId: string; targetPokemonInstanceId: string; counters: number }
  | { type: 'MANUAL_ATTACH_ENERGY'; playerIndex: 0 | 1; cardInstanceId: string; fromZone: 'HAND' | 'DECK' | 'DISCARD'; targetPokemonInstanceId: string }
  | { type: 'MANUAL_MOVE_ENERGY'; sourcePokemonInstanceId: string; targetPokemonInstanceId: string; energyInstanceId: string }
  | { type: 'MANUAL_DISCARD_ATTACHMENT'; targetPokemonInstanceId: string; attachmentInstanceId: string; toZone?: 'DISCARD' | 'LOST_ZONE' | 'HAND' }
  | { type: 'MANUAL_ATTACH_TOOL'; playerIndex: 0 | 1; toolCardInstanceId: string; fromZone: 'HAND' | 'DECK'; targetPokemonInstanceId: string }
  | { type: 'MANUAL_DISCARD_TOOL'; targetPokemonInstanceId: string; toZone?: 'DISCARD' | 'LOST_ZONE' | 'HAND' }
  | { type: 'MANUAL_TAKE_PRIZE'; playerIndex: 0 | 1; prizeIndex?: number; count?: number }
  | { type: 'MANUAL_SWAP_PRIZE'; playerIndex: 0 | 1; prizeIndex: number; handCardInstanceId: string }
  | { type: 'MANUAL_ADD_PRIZE_CARD'; playerIndex: 0 | 1; fromZone: 'DECK' | 'HAND' }
  | { type: 'MANUAL_EVOLVE'; playerIndex: 0 | 1; evolutionCardInstanceId: string; fromZone: 'HAND' | 'DECK'; targetPokemonInstanceId: string }
  | { type: 'MANUAL_DEVOLVE'; targetPokemonInstanceId: string; toZone: 'HAND' | 'DISCARD' }
  | { type: 'MANUAL_SWITCH_POKEMON'; playerIndex: 0 | 1; benchIndex: number; clearConditions?: boolean }
  | { type: 'MANUAL_GUST_OPPONENT'; playerIndex: 0 | 1; opponentBenchIndex: number }
  | { type: 'MANUAL_TOGGLE_STATUS'; playerIndex: 0 | 1; condition: SpecialCondition; value?: boolean }
  | { type: 'MANUAL_CLEAR_STATUS'; playerIndex: 0 | 1 }
  | { type: 'MANUAL_SHUFFLE_DECK'; playerIndex: 0 | 1 }
  | { type: 'MANUAL_DISCARD_STADIUM' }
  | { type: 'MANUAL_COIN_FLIP'; playerIndex: 0 | 1; flips: number; heads: number }
  | { type: 'MANUAL_DICE_ROLL'; playerIndex: 0 | 1; diceCount: number; rolls: number[]; total: number }
  | { type: 'MANUAL_CUSTOM_ANNOUNCEMENT'; playerIndex: 0 | 1; message: string }
  | {
      type: 'MANUAL_ATTACK_ASSIST';
      playerIndex: 0 | 1;
      attackName: string;
      activeDamage: number;
      benchDistributions?: Record<string, number>;
      selfDamage?: number;
      endTurn: boolean;
    }
  | { type: 'GAME_UNDO_STEP' };

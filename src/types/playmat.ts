export type PlayerRole = 'p1' | 'p2';

export interface PlaymatCard {
  instanceId: string;
  id: string;
  name: string;
  supertype?: string;
  subtypes?: string[];
  types?: string[];
  hp?: string | number;
  images?: {
    small?: string;
    large?: string;
  };
  officialImageUrl?: string;
  damageCounters?: number;
  attachedCards?: PlaymatCard[];
  underlyingCards?: PlaymatCard[];
  isFaceDown?: boolean;
}

export interface PlaymatPlayerBoardState {
  playerName: string;
  joined: boolean;
  deckCount: number;
  handCount: number;
  prizeCount: number;
  prizes: PlaymatCard[];
  active: PlaymatCard | null;
  bench: PlaymatCard[];
  supporter?: PlaymatCard | null;
  discard: PlaymatCard[];
  lostZone: PlaymatCard[];
  mulliganCount?: number;
  energyAttachedThisTurn?: boolean;
  supporterPlayedThisTurn?: boolean;
  prizesPlaced?: boolean;
}

export interface PlaymatRoomState {
  roomCode: string;
  pin?: string | null;
  createdAt: number;
  updatedAt: number;
  hostUid?: string | null;
  participants?: string[];
  matchId?: number;
  currentTurn?: 'p1' | 'p2';
  turnNumber?: number;
  setupPhase?: 'setup' | 'playing';
  firstPlayerChoice?: {
    chosenBy: PlayerRole;
    firstPlayer: PlayerRole;
  } | null;
  p1: PlaymatPlayerBoardState;
  p2: PlaymatPlayerBoardState;
  stadium: PlaymatCard | null;
  recentActionText: string;
  playedItemAnnouncement?: {
    playerName: string;
    role?: PlayerRole;
    card: PlaymatCard;
    timestamp: number;
  } | null;
  revealedCardAnnouncement?: {
    playerName: string;
    role?: PlayerRole;
    card: PlaymatCard;
    timestamp: number;
  } | null;
  revealedHandAnnouncement?: {
    playerName: string;
    role: PlayerRole;
    cards: PlaymatCard[];
    timestamp: number;
  } | null;
  history?: PlaymatHistoryEntry[];
  isTerminated?: boolean;
}

export interface PlaymatHistoryEntry {
  action: PlaymatActionType;
  role: PlayerRole;
  payload: PlaymatActionPayload;
  timestamp: number;
  prevRoleState?: PlaymatPlayerBoardState;
  prevOpponentState?: PlaymatPlayerBoardState;
  prevGlobalState?: {
    currentTurn?: PlayerRole;
    turnNumber?: number;
    stadium?: PlaymatCard | null;
    recentActionText?: string;
  };
}

export type PlaymatActionType =
  | 'JOIN_ROOM'
  | 'SETUP_DECK'
  | 'DRAW_CARD'
  | 'MULLIGAN'
  | 'PLAY_ITEM'
  | 'PLAY_TO_ACTIVE'
  | 'PLAY_TO_BENCH'
  | 'EVOLVE_CARD'
  | 'ATTACH_TO_CARD'
  | 'PLAY_SUPPORTER'
  | 'DISCARD_SUPPORTER'
  | 'SEARCH_DECK'
  | 'SHUFFLE_DECK'
  | 'UPDATE_DAMAGE'
  | 'SWITCH_ACTIVE'
  | 'TAKE_PRIZE'
  | 'PLACE_PRIZES'
  | 'FLIP_CARDS_FACE_UP'
  | 'CHOOSE_FIRST_PLAYER'
  | 'REVEAL_HAND'
  | 'DISMISS_HAND_REVEAL'
  | 'DISCARD_FROM_HAND'
  | 'DISCARD_MULTIPLE'
  | 'DISCARD_HAND'
  | 'DISCARD_FROM_BOARD'
  | 'KNOCK_OUT_CARD'
  | 'SHUFFLE_HAND_AND_DRAW'
  | 'PLAY_STADIUM'
  | 'DISCARD_STADIUM'
  | 'RESET_BOARD'
  | 'RESTART_ROOM'
  | 'PASS_TURN'
  | 'REVEAL_CARD'
  | 'DISMISS_REVEAL'
  | 'UNDO'
  | 'TERMINATE_ROOM';

export interface PlaymatActionPayload {
  role: PlayerRole;
  action: PlaymatActionType;
  playerName?: string;
  card?: PlaymatCard;
  cards?: PlaymatCard[];
  targetInstanceId?: string;
  slot?: number;
  count?: number;
  damage?: number;
  deckCount?: number;
  handCount?: number;
  prizeCount?: number;
  pin?: string;
  firstPlayer?: PlayerRole;
  isFaceDown?: boolean;
  participantUid?: string;
}

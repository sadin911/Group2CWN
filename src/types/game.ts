export type EnergyType =
  | 'Fire'
  | 'Water'
  | 'Grass'
  | 'Lightning'
  | 'Psychic'
  | 'Fighting'
  | 'Darkness'
  | 'Metal'
  | 'Dragon'
  | 'Colorless';

export type StatusCondition =
  | 'none'
  | 'poisoned'
  | 'burned'
  | 'asleep'
  | 'paralyzed'
  | 'confused';

export interface PokemonSlot {
  id: string;
  name: string;
  maxHP: number;
  currentDamage: number;
  status: StatusCondition;
  energies: Partial<Record<EnergyType, number>>;
  abilityUsed: boolean;
  attackUsed: boolean;
  imageUrl?: string;
  officialImageUrl?: string;
  types?: string[];
}

export type PlayerId = 'player1' | 'player2';

export interface PlayerState {
  name: string;
  activePokemon: PokemonSlot;
  bench: [PokemonSlot, PokemonSlot, PokemonSlot, PokemonSlot, PokemonSlot];
  supporterUsed: boolean;
  energyAttached: boolean; // once-per-turn energy attachment
  prizeCards: number;
}

export interface GameState {
  player1: PlayerState;
  player2: PlayerState;
  currentTurn: PlayerId;
  turnNumber: number;
}

export type SlotKey = 'active' | 0 | 1 | 2 | 3 | 4;

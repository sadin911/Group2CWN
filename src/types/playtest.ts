export interface PlaytestCardInstance {
  instanceId: string;
  cardId: string;
  card: any; // Raw card data from pokemonNames.json
  attachedEnergies: PlaytestCardInstance[];
  attachedTools: PlaytestCardInstance[];
  damage: number;
}

export type BoardSlot = 'active' | 'bench-0' | 'bench-1' | 'bench-2' | 'bench-3' | 'bench-4';

export interface PlaytestState {
  deckPile: PlaytestCardInstance[];
  hand: PlaytestCardInstance[];
  activePokemon: PlaytestCardInstance | null;
  bench: (PlaytestCardInstance | null)[];
  prizes: PlaytestCardInstance[];
  discardPile: PlaytestCardInstance[];
  lostZone: PlaytestCardInstance[];
  turn: number;
  mulliganCount: number;
  hasMulliganNotice: boolean;
  history: string[];
}

export interface DeckConsistencyStats {
  totalCards: number;
  basicPokemonCount: number;
  searchTrainerCount: number;
  supporterCount: number;
  energyCount: number;
  pBasicOpening: number; // Probability of at least 1 Basic in 7-card opening hand (0 - 100%)
  pSearchOpening: number; // Probability of at least 1 Ball/Search in 7-card hand
  pSupporterOpening: number; // Probability of at least 1 Supporter in 7-card hand
  pEnergyOpening: number; // Probability of at least 1 Energy in 7-card hand
  mulliganExpectation: number; // Expected Mulligan rate %
}

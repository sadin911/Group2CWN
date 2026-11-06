import type { Deck } from './deck';

export type MetaTier = 'Tier 1' | 'Tier 2' | 'Tier 3' | 'Rogue';

export type DeckPlaystyle = 'Aggro' | 'Setup' | 'Control' | 'Toolbox' | 'Single Prize';

export interface MetaDeck extends Deck {
  tier: MetaTier;
  playstyle?: DeckPlaystyle;
  pros?: string[];
  cons?: string[];
  sharePercent?: number;
  points?: number;
  event?: string;
  author?: string;
  tournamentDate?: string;
  sourceUrl?: string;
  strategyDescription?: string;
  keyPokemon: string[];
  exportText?: string;
}


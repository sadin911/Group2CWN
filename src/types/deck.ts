export interface DeckCardEntry {
  cardId: string;
  count: number;
}

export interface Deck {
  id: string;
  name: string;
  description?: string;
  coverCardId?: string;
  coverImageUrl?: string;
  cards: Record<string, DeckCardEntry>; // Keyed by cardId
  createdAt: number;
  updatedAt: number;
}

export interface DeckStats {
  totalCards: number;
  pokemonCount: number;
  trainerCount: number;
  energyCount: number;
  isLegal60: boolean;
  ruleViolations: string[];
}

export interface EquivalentOwnedCard {
  cardId: string;
  setId: string;
  setName: string;
  collectorNumber: string;
  imageUrl: string;
  count: number;
  isExact: boolean;
}

export interface MissingCardInfo {
  cardId: string;
  name: string;
  category: string;
  types?: string[];
  setId?: string;
  setName?: string;
  collectorNumber?: string;
  imageUrl?: string;
  countNeeded: number;
  countOwned: number;
  missingCount: number;
  exactOwned: number;
  totalEquivalentOwned: number;
  equivalentCardsOwned?: EquivalentOwnedCard[];
  isEquivalentComplete?: boolean;
}

export interface DeckMissingReport {
  totalCardsNeeded: number;
  totalCardsOwned: number;
  totalCardsMissing: number;
  missingItems: MissingCardInfo[];
  completeItems: MissingCardInfo[];
  isComplete: boolean;
  completionPercentage: number;
  calculationMode: 'equivalent' | 'exact';
}

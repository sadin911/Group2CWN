import type { CardVariantCount, CardCondition } from './collection';

export interface ShareSettings {
  showPrices: boolean;       // Show market pricing and estimated portfolio valuation
  showWishlist: boolean;     // Include cards marked as wishlist
  showNotes: boolean;        // Include personal user notes
}

export interface SharedCardEntry {
  variants: CardVariantCount;
  condition?: CardCondition;
  isWishlist?: boolean;
  note?: string;
}

export interface SharedCollectionStats {
  totalCards: number;
  uniqueCards: number;
  estimatedValueTHB: number;
  estimatedValueUSD: number;
}

export interface SharedCollectionSnapshot {
  shareId: string;
  ownerUid?: string;
  ownerName: string;
  ownerAvatar?: string;
  binderName: string;
  description?: string;
  cards: Record<string, SharedCardEntry>;
  stats: SharedCollectionStats;
  settings: ShareSettings;
  createdAt: string;
  updatedAt: string;
  viewCount?: number;
}

export type CardVariantKey = 'normal' | 'holo' | 'reverse' | 'promo';

export interface CardVariantCount {
  normal: number;
  holo: number;
  reverse: number;
  promo: number;
}

export type CardCondition = 'NM' | 'LP' | 'MP' | 'HP';

export interface CollectionCardEntry {
  cardId: string;
  variants: CardVariantCount;
  isWishlist?: boolean;
  condition?: CardCondition;
  note?: string;
  updatedAt: number;
}

export interface CollectionProfile {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  cards: Record<string, CollectionCardEntry>;
  createdAt: number;
  updatedAt: number;
  /**
   * Bumped when a binder has been rewritten by a data migration. Absent (or < 2)
   * means the document predates the switch to whole-document writes and may
   * still hold entries the client no longer has. See BINDER_SCHEMA_VERSION.
   */
  schemaVersion?: number;
}

export type CollectionStatusFilter = 'all' | 'owned' | 'missing' | 'wishlist' | 'duplicates';

export type CollectionSortBy = 'number' | 'name' | 'hp' | 'quantity' | 'price';
export type SortOrder = 'asc' | 'desc';

export interface CollectionFilters {
  selectedSet: string;
  selectedRegulation: string;
  statusFilter: CollectionStatusFilter;
  search: string;
  selectedType: string;
  selectedCategory: string;
  selectedStage: string;
  selectedRarity: string;
  sortBy: CollectionSortBy;
  sortOrder: SortOrder;
  showFullColor: boolean;
}

export const STANDARD_REGULATION_MARKS = ['H', 'I', 'J'] as const;

export const REGULATION_SERIES_OPTIONS = [
  { id: 'ALL', label: 'ทุกซีรีส์ / ทุกเรกูเลชัน (All Regulations)', shortLabel: 'ทั้งหมด' },
  { id: 'STANDARD', label: '⚡ สแตนดาร์ด (Standard: HIJ)', shortLabel: '⚡ Standard (HIJ)' },
  { id: 'J', label: '🎴 ซีรีส์ J (Mega Evolution / 2025-2026)', shortLabel: 'Series J' },
  { id: 'I', label: '🌟 ซีรีส์ I (Scarlet & Violet: SV8+)', shortLabel: 'Series I' },
  { id: 'H', label: '💎 ซีรีส์ H (Scarlet & Violet: SV5-SV7)', shortLabel: 'Series H' },
  { id: 'G', label: '🌿 ซีรีส์ G (Scarlet & Violet: SV1-SV4)', shortLabel: 'Series G' },
  { id: 'F', label: '⚔️ ซีรีส์ F (Sword & Shield: S9-S12 / VSTAR)', shortLabel: 'Series F' },
  { id: 'E', label: '🛡️ ซีรีส์ E (Sword & Shield: S5-S8 / VMAX)', shortLabel: 'Series E' },
  { id: 'D', label: '🗡️ ซีรีส์ D (Sword & Shield: S1-S4 / V)', shortLabel: 'Series D' },
  { id: 'EXPANDED', label: '📜 ซีรีส์ดั้งเดิม / Expanded (A, B)', shortLabel: 'Series A/B' },
] as const;


export type CardRarityClass =
  | 'ALL'
  | 'SAR'
  | 'AR'
  | 'SR'
  | 'UR'
  | 'EX'
  | 'VMAX'
  | 'VSTAR'
  | 'V'
  | 'PROMO'
  | 'REGULAR';

export interface SetProgress {
  setId: string;
  setName: string;
  totalCards: number;
  uniqueOwned: number;
  totalCount: number;
  percentage: number;
}

export interface CollectionStats {
  totalProfiles: number;
  activeProfileName: string;
  totalUniqueOwned: number;
  totalCardsCount: number;
  wishlistCount: number;
  duplicatesCount: number;
  overallPercentage: number;
}

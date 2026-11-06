import type { CardVariantKey } from './collection';

export type BinderTheme =
  | 'black-leather'
  | 'brown-leather'
  | 'burgundy-leather'
  | 'pokeball'
  | 'ultra-ball';

export type PocketSleeveStyle =
  | 'none'
  | 'matte-black'
  | 'clear-gloss'
  | 'holo-stars'
  | 'gold-border';

export type BinderPocketLayout = 4 | 6 | 8 | 9 | 12 | 16;

export interface BinderSlotItem {
  slotIndex: number; // 0-based index within the page
  cardId?: string;   // Card ID e.g. "TH-1", or undefined if empty
  isOwned?: boolean; // true if owned in current collection profile
  variant?: CardVariantKey; // which variant is displayed
  count?: number;    // quantity owned across variants or for this variant
  customLabel?: string;
}

export interface BinderPage {
  pageNumber: number; // 1-indexed page number
  slots: BinderSlotItem[];
}

export interface CustomBinder {
  id: string;
  name: string;
  description?: string;
  mode: 'auto-set' | 'custom';
  setId?: string; // set ID when mode === 'auto-set' (e.g. "SV8a", "SV6")
  coverTheme: BinderTheme;
  sleeveStyle: PocketSleeveStyle;
  pocketsPerPage: BinderPocketLayout;
  gridCols?: number; // custom column count e.g. 2, 3, 4
  gridRows?: number; // custom row count e.g. 2, 3, 4
  pages: BinderPage[]; // For custom mode: user arranged pages.
  createdAt: number;
  updatedAt: number;
}

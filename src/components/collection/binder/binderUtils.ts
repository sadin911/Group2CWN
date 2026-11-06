import type {
  BinderTheme,
  BinderPocketLayout,
  PocketSleeveStyle,
} from '../../../types/binder';
import type { CardVariantKey } from '../../../types/collection';

/**
 * Returns sleeve CSS class styling based on selected pocket sleeve.
 */
export function getSleeveStyleClasses(sleeveStyle: PocketSleeveStyle = 'matte-black'): string {
  switch (sleeveStyle) {
    case 'none':
      return 'bg-neutral-900/60 ring-1 ring-white/5 border border-white/5';
    case 'matte-black':
      return 'bg-neutral-950 ring-1 ring-white/10 shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)] border border-neutral-800/60';
    case 'clear-gloss':
      return 'bg-neutral-900/40 ring-1 ring-cyan-400/25 shadow-[0_0_8px_rgba(34,211,238,0.12)] border border-cyan-500/20';
    case 'holo-stars':
      return 'bg-gradient-to-br from-amber-500/10 via-purple-500/10 to-cyan-500/10 ring-1 ring-purple-400/35 shadow-[0_0_10px_rgba(168,85,247,0.18)] border border-purple-500/25';
    case 'gold-border':
      return 'bg-neutral-950 ring-2 ring-amber-400/80 shadow-[0_0_12px_rgba(251,191,36,0.3)] border border-amber-300/40';
    default:
      return 'bg-neutral-900/60 ring-1 ring-white/5';
  }
}

/**
 * Derives badge info for card variants and high-tier rarities.
 */
export function getVariantBadgeInfo(
  variant?: CardVariantKey,
  rarityCode?: string
): { label: string; className: string } | null {
  const upperRarity = (rarityCode || '').toUpperCase();

  // High rarity prestige badges
  if (upperRarity === 'SAR') {
    return { label: 'SAR', className: 'bg-gradient-to-r from-amber-500 to-rose-500 text-white font-black' };
  }
  if (upperRarity === 'AR') {
    return { label: 'AR', className: 'bg-gradient-to-r from-cyan-500 to-indigo-500 text-white font-black' };
  }
  if (upperRarity === 'UR') {
    return { label: 'UR', className: 'bg-gradient-to-r from-yellow-300 via-amber-400 to-amber-600 text-black font-black' };
  }
  if (upperRarity === 'SR') {
    return { label: 'SR', className: 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold' };
  }
  if (upperRarity === 'ACE_SPEC' || upperRarity === 'ACE') {
    return { label: 'ACE', className: 'bg-gradient-to-r from-fuchsia-600 via-pink-600 to-purple-600 text-white font-black' };
  }

  // Variant badges
  if (variant === 'holo') {
    return { label: 'Holo', className: 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold' };
  }
  if (variant === 'reverse') {
    return { label: 'Reverse', className: 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold' };
  }
  if (variant === 'promo') {
    return { label: 'Promo', className: 'bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold' };
  }

  return null;
}

/**
 * Extracts and formats standard collector number string e.g. "001-154" -> "#001".
 */
export function formatSlotCollectorNumber(collectorNumber?: string): string {
  if (!collectorNumber) return '';
  const first = collectorNumber.trim().split(/[\s/-]/)[0];
  const num = parseInt(first, 10);
  if (!isNaN(num)) {
    return `#${num.toString().padStart(3, '0')}`;
  }
  return `#${first}`;
}

export interface CoverThemeStyle {
  coverClass: string;
  spineClass: string;
  accentClass: string;
  stitchingClass: string;
  ringColor: 'silver' | 'gold';
}

/**
 * Provides styling classes and ring colors for binder book cover themes.
 */
export function getCoverThemeStyles(theme: BinderTheme = 'black-leather'): CoverThemeStyle {
  switch (theme) {
    case 'black-leather':
      return {
        coverClass: 'bg-gradient-to-br from-neutral-900 via-neutral-950 to-black text-neutral-200 shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-neutral-800/80',
        spineClass: 'bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 border-x border-neutral-800',
        accentClass: 'border-neutral-700/50',
        stitchingClass: 'border-neutral-700/40',
        ringColor: 'silver',
      };
    case 'brown-leather':
      return {
        coverClass: 'bg-gradient-to-br from-amber-950 via-[#2b1810] to-[#1a0f0a] text-amber-100 shadow-[0_20px_50px_rgba(20,10,5,0.9)] border border-amber-900/60',
        spineClass: 'bg-gradient-to-r from-[#1f120c] via-[#3d2317] to-[#1f120c] border-x border-amber-900/50',
        accentClass: 'border-amber-600/40',
        stitchingClass: 'border-amber-700/50',
        ringColor: 'gold',
      };
    case 'burgundy-leather':
      return {
        coverClass: 'bg-gradient-to-br from-[#4a0e17] via-[#2d080e] to-[#180407] text-rose-100 shadow-[0_20px_50px_rgba(40,5,10,0.9)] border border-rose-900/50',
        spineClass: 'bg-gradient-to-r from-[#200509] via-[#4d0e18] to-[#200509] border-x border-rose-900/40',
        accentClass: 'border-rose-500/30',
        stitchingClass: 'border-rose-600/40',
        ringColor: 'gold',
      };
    case 'pokeball':
      return {
        coverClass: 'bg-gradient-to-b from-red-700 via-red-800 to-neutral-900 text-white shadow-[0_20px_50px_rgba(220,38,38,0.3)] border border-red-600/50',
        spineClass: 'bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 border-x border-neutral-700',
        accentClass: 'border-red-500/40',
        stitchingClass: 'border-white/20',
        ringColor: 'silver',
      };
    case 'ultra-ball':
      return {
        coverClass: 'bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 text-amber-300 shadow-[0_20px_50px_rgba(234,179,8,0.25)] border border-amber-500/40',
        spineClass: 'bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 border-x border-amber-500/30',
        accentClass: 'border-amber-400/40',
        stitchingClass: 'border-amber-500/30',
        ringColor: 'silver',
      };
    default:
      return getCoverThemeStyles('black-leather');
  }
}

/**
 * Returns grid column and row classes based on pocket count and custom grid configuration.
 */
export function getPocketGridClass(
  pocketsPerPage: BinderPocketLayout = 9,
  gridCols?: number,
  gridRows?: number
): string {
  let cols = gridCols;
  let rows = gridRows;

  if (!cols || !rows) {
    if (pocketsPerPage === 4) {
      cols = 2;
      rows = 2;
    } else if (pocketsPerPage === 6) {
      cols = 3;
      rows = 2;
    } else if (pocketsPerPage === 8) {
      cols = 4;
      rows = 2;
    } else if (pocketsPerPage === 12) {
      cols = 3;
      rows = 4;
    } else if (pocketsPerPage === 16) {
      cols = 4;
      rows = 4;
    } else {
      cols = 3;
      rows = 3;
    }
  }

  const colClass =
    cols === 2 ? 'grid-cols-2' : cols === 4 ? 'grid-cols-4' : 'grid-cols-3';
  const rowClass =
    rows === 2 ? 'grid-rows-2' : rows === 4 ? 'grid-rows-4' : 'grid-rows-3';
  const gapClass =
    cols >= 4 || rows >= 4
      ? 'gap-1 sm:gap-1.5'
      : cols === 2
      ? 'gap-2 sm:gap-3'
      : 'gap-1.5 sm:gap-2.5';

  return `${colClass} ${rowClass} ${gapClass}`;
}

/**
 * Computes left and right page indices for 2-page book spread or 1-page mobile.
 */
export function getPageSpreadIndices(
  currentPageIndex: number,
  totalPages: number,
  isTwoPageSpread: boolean
): { leftIndex: number; rightIndex: number | null } {
  if (!isTwoPageSpread) {
    return {
      leftIndex: Math.max(0, Math.min(currentPageIndex, totalPages - 1)),
      rightIndex: null,
    };
  }

  // Align to even index for left page (0, 2, 4...)
  const left = Math.floor(currentPageIndex / 2) * 2;
  const right = left + 1 < totalPages ? left + 1 : null;

  return {
    leftIndex: left,
    rightIndex: right,
  };
}

export interface FlipParams {
  transformOrigin: string;
  rotateYStart: number;
  rotateYEnd: number;
  turnSide?: 'left' | 'right';
  shadowGradient: string;
}

/**
 * Calculates 3D perspective rotation, anchor origin, and curvature shadow gradients
 * for realistic 3D page turning physics.
 */
export function calculateFlipParams(
  direction: 'next' | 'prev',
  isDesktop: boolean
): FlipParams {
  if (isDesktop) {
    if (direction === 'next') {
      return {
        transformOrigin: 'left center',
        rotateYStart: 0,
        rotateYEnd: -180,
        turnSide: 'right',
        shadowGradient: 'linear-gradient(to right, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 40%, transparent 100%)',
      };
    } else {
      return {
        transformOrigin: 'right center',
        rotateYStart: 0,
        rotateYEnd: 180,
        turnSide: 'left',
        shadowGradient: 'linear-gradient(to left, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 40%, transparent 100%)',
      };
    }
  }

  // Mobile 1-page flip
  if (direction === 'next') {
    return {
      transformOrigin: 'left center',
      rotateYStart: 0,
      rotateYEnd: -180,
      shadowGradient: 'linear-gradient(to right, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.15) 50%, transparent 100%)',
    };
  } else {
    return {
      transformOrigin: 'left center',
      rotateYStart: -180,
      rotateYEnd: 0,
      shadowGradient: 'linear-gradient(to left, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.15) 50%, transparent 100%)',
    };
  }
}



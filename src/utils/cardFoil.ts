import type { CardVariantCount } from '../types/collection';

/**
 * Determines whether a Pokemon card should have the 3D Holographic / Foil effect.
 * Checks rarity codes, card name tags, promo status, and owned foil variants.
 */
export function isCardFoil(
  card: {
    id?: string;
    name?: string;
    rarityCode?: string;
    rarity?: string;
    set?: { id?: string };
    collectorNumber?: string;
    localId?: string;
  },
  variants?: CardVariantCount
): boolean {
  if (!card) return false;

  // 1. If user owns Holo, Reverse Holo, or Promo variants of this card
  if (variants && (variants.holo > 0 || variants.reverse > 0 || variants.promo > 0)) {
    return true;
  }

  // 2. High Rarity Pokemon cards (Always foil by default)
  const rarity = (card.rarityCode || card.rarity || '').toUpperCase();
  const highRarities = [
    'R',      // Rare Holo
    'RR',     // Double Rare (ex, V, GX)
    'RRR',    // Triple Rare (VMAX, VSTAR)
    'V',
    'VMAX',
    'VSTAR',
    'EX',
    'GX',
    'SR',     // Super Rare
    'HR',     // Hyper Rare / Rainbow Rare
    'UR',     // Ultra Rare / Gold
    'SAR',    // Special Art Rare
    'AR',     // Art Rare
    'CSR',    // Character Super Rare
    'CHR',    // Character Rare
    'SSR',    // Shiny Super Rare
    'S',      // Shiny Rare
    'K',      // Radiant / Kagayaku
    'ACE',    // ACE SPEC
    'ACE_SPEC',
    'PR',     // Promo
    'PROMO',
    'AMAZING', // Amazing Rare
    'SHINY',
  ];

  if (highRarities.includes(rarity)) {
    return true;
  }

  // 3. Card Name checks for special rule / holo cards
  const name = (card.name || '').toLowerCase();
  if (
    name.includes('ex') ||
    name.includes('vmax') ||
    name.includes('vstar') ||
    name.includes('gx') ||
    name.includes('เรเดียนต์') ||
    name.includes('radiant') ||
    name.includes('kagayaku') ||
    name.includes('shining') ||
    name.includes('ace spec') ||
    name.includes('prism star') ||
    name.includes('terastal') ||
    name.includes('เทรัสตัล') ||
    name.includes('stellar') ||
    name.endsWith('v') ||
    name.includes(' v') ||
    name.includes('v ')
  ) {
    return true;
  }

  // 4. Promo Sets
  const setId = (card.set?.id || '').toUpperCase();
  const col = (card.collectorNumber || card.localId || '').toUpperCase();
  if (
    setId.includes('PROMO') ||
    setId.includes('-P') ||
    setId === 'PROMO' ||
    col.includes('PROMO') ||
    col.startsWith('P-')
  ) {
    return true;
  }

  return false;
}

/**
 * Deterministic pulse delay based on card ID hash so multiple cards in view breathe at different cadences.
 */
export function foilPulseDelay(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff;
  }
  return -((Math.abs(hash) % 70) / 10);
}

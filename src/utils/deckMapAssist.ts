import thaiEnglishCardMap from '../data/thaiEnglishCardMap.json';
import pokemonSetsEn from '../data/pokemonSetsEn.json';

/**
 * Bridges a PTCGL decklist line to the Thai/English card map built for the
 * bilingual card detail view.
 *
 * Three distinct set-code namespaces are involved, and they are NOT
 * interchangeable:
 *   - PTCGL codes on decklist lines .......... TWM, MEG, SIT
 *   - English ptcgio set ids ................. sv6, me1, swsh12
 *   - Thai set ids ........................... SV6, MA1, S12
 *
 * `EN_TO_TH_SET_MAP` in ptcglDeckParser walks PTCGL -> Thai directly and still
 * serves the name-translation route. This module walks the other path,
 * PTCGL -> English -> Thai, via each set's `ptcgoCode`.
 */

interface EnSet {
  id: string;
  ptcgoCode?: string;
}

interface ThaiEnMapping {
  enCardId?: string;
  enName?: string;
  enCardName?: string;
}

const enSets: EnSet[] = Array.isArray(pokemonSetsEn)
  ? (pokemonSetsEn as EnSet[])
  : ((pokemonSetsEn as { data?: EnSet[] }).data ?? []);

/** PTCGL code -> English ptcgio set ids (a code can cover a main set plus its trainer-gallery). */
const ptcgoCodeToEnSetIds: Record<string, string[]> = {};
for (const set of enSets) {
  if (!set?.ptcgoCode || !set.id) continue;
  const code = set.ptcgoCode.toUpperCase();
  (ptcgoCodeToEnSetIds[code] ||= []).push(set.id);
}

const cardMap = thaiEnglishCardMap as Record<string, ThaiEnMapping>;

/** English card id -> Thai card id. Built once; the map holds ~8.8k pairs. */
const enCardIdToThaiCardId = new Map<string, string>();
for (const [thaiCardId, mapping] of Object.entries(cardMap)) {
  if (mapping?.enCardId) enCardIdToThaiCardId.set(mapping.enCardId, thaiCardId);
}

/**
 * English set ids a PTCGL code refers to. Empty when the code is unknown or the
 * set carries no `ptcgoCode` (basic energy sets such as MEE).
 */
export function resolveEnSetIds(ptcgoCode: string): string[] {
  if (!ptcgoCode) return [];
  return ptcgoCodeToEnSetIds[ptcgoCode.toUpperCase()] ?? [];
}

/**
 * Thai card id for an exact English print, or null when that print is not in
 * the map. Returns null rather than guessing: the map covers ~78% of English
 * cards, and a wrong print is worse than no answer here.
 */
export function resolveThaiCardIdFromEnPrint(
  ptcgoCode: string,
  collectorNumber: string
): string | null {
  if (!ptcgoCode || !collectorNumber) return null;
  const number = collectorNumber.split('/')[0].trim();
  if (!number) return null;

  for (const enSetId of resolveEnSetIds(ptcgoCode)) {
    const thaiCardId = enCardIdToThaiCardId.get(`EN-${enSetId}-${number}`);
    if (thaiCardId) return thaiCardId;
  }
  return null;
}

/** The English name the map records for a Thai card, if it has one. */
export function getEnglishNameForThaiCard(thaiCardId: string): string | null {
  const mapping = cardMap[thaiCardId];
  return mapping?.enName ?? mapping?.enCardName ?? null;
}

/**
 * Normalizes for comparison but deliberately keeps rank suffixes (ex, V, VMAX,
 * VSTAR) significant — "Fezandipiti ex" and "Fezandipiti" are different cards,
 * and conflating them is exactly the bug this guards against.
 */
function normalizeEnName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/** Whether two English card names refer to the same card. */
export function isSameEnglishCardName(a: string, b: string): boolean {
  if (!a || !b) return false;
  return normalizeEnName(a) === normalizeEnName(b);
}

interface PrintLike {
  id: string;
  name?: string;
  rarityCode?: string;
  regulationMark?: string;
}

/**
 * The card map pairs by artwork, so a promo reprint sharing a main-set print's
 * art can win the lookup. When that happens, prefer a regular print of the same
 * card — but only one carrying the same regulation mark, so a deck never
 * silently swaps to a card from a different legality era.
 */
export function preferRegularPrint<T extends PrintLike>(picked: T, cardDatabase: T[]): T {
  if (!picked || picked.rarityCode !== 'PROMO' || !picked.name) return picked;

  const regular = cardDatabase.find(
    (c) =>
      c.id !== picked.id &&
      c.name === picked.name &&
      c.rarityCode === 'REGULAR' &&
      c.regulationMark === picked.regulationMark
  );
  return regular ?? picked;
}

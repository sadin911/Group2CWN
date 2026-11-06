import setReleaseOrderData from '../data/setReleaseOrder.json';

const setReleaseMap: Record<string, number> = setReleaseOrderData;

/**
 * Returns the Thai chronological release rank of a set ID.
 * - Lower numbers = newer packs released in Thailand (e.g. MA5 = 1, MA4 = 2, ..., SC1a = 80+)
 * - Unranked / Unknown sets receive a high rank (placed at the bottom).
 */
export function getSetReleaseRank(setId?: string): number {
  if (!setId) return 999;
  const clean = setId.trim();
  if (setReleaseMap[clean] !== undefined) return setReleaseMap[clean];
  if (setReleaseMap[clean.toUpperCase()] !== undefined) return setReleaseMap[clean.toUpperCase()];
  if (setReleaseMap[clean.toLowerCase()] !== undefined) return setReleaseMap[clean.toLowerCase()];
  return 900;
}

/**
 * Sorts an array of set objects by Thai release date descending (Newest released sets first).
 */
export function sortSetsByThaiRelease<T extends { id: string }>(sets: T[]): T[] {
  return [...sets].sort((a, b) => {
    const rankA = getSetReleaseRank(a.id);
    const rankB = getSetReleaseRank(b.id);
    if (rankA !== rankB) {
      return rankA - rankB; // Ascending rank = descending release date (0 is newest)
    }
    return a.id.localeCompare(b.id);
  });
}

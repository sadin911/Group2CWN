/**
 * Summarises which Thai cards still have no English counterpart.
 *
 * The pairing in thaiEnglishCardMap.json was produced by comparing artwork, so
 * a card is left unpaired mainly when its Thai art has no English equivalent —
 * which is most of what remains. Reporting the rarity split alongside the raw
 * count is the point: without it the number reads as a backlog when the bulk of
 * it is alternate-art cards that cannot be paired at all.
 */

export interface PairingGroup {
  /** Set id, rarity code, category — whatever the grouping is keyed on. */
  key: string;
  label: string;
  unmatched: number;
  /** Cards of this group in the catalogue, so a share can be shown. */
  total: number;
  /** Percentage of the group left unpaired, rounded. */
  percentage: number;
}

export interface PairingCoverage {
  totalCards: number;
  matched: number;
  unmatched: number;
  /** Percentage matched, rounded. */
  coveragePercentage: number;
  /**
   * Unpaired cards whose rarity marks them as special or alternate art. These
   * are expected to stay unpaired, so they are counted apart from the rest.
   */
  altArtUnmatched: number;
  /** Unpaired cards that are ordinary prints, i.e. the ones worth chasing. */
  actionableUnmatched: number;
  bySet: PairingGroup[];
  byRarity: PairingGroup[];
  byCategory: PairingGroup[];
}

interface CardLike {
  id: string;
  name?: string;
  category?: string;
  rarityCode?: string;
  set?: { id?: string; name?: string };
}

/**
 * Rarities that denote special or alternate artwork. A Thai card in one of
 * these frequently has art that was never printed in English.
 */
export const ALT_ART_RARITIES = ['AR', 'SR', 'UR', 'HR', 'SAR', 'CHR', 'CSR'] as const;

export function isAltArtRarity(rarityCode?: string): boolean {
  if (!rarityCode) return false;
  return (ALT_ART_RARITIES as readonly string[]).includes(rarityCode.toUpperCase());
}

function summariseGroups(
  unmatchedCards: CardLike[],
  allCards: CardLike[],
  keyOf: (card: CardLike) => string | undefined,
  labelOf: (card: CardLike) => string | undefined
): PairingGroup[] {
  const totals = new Map<string, number>();
  for (const card of allCards) {
    const key = keyOf(card) || '(ไม่ระบุ)';
    totals.set(key, (totals.get(key) || 0) + 1);
  }

  const groups = new Map<string, PairingGroup>();
  for (const card of unmatchedCards) {
    const key = keyOf(card) || '(ไม่ระบุ)';
    const existing = groups.get(key);
    if (existing) {
      existing.unmatched += 1;
      continue;
    }
    const total = totals.get(key) || 0;
    groups.set(key, {
      key,
      label: labelOf(card) || key,
      unmatched: 1,
      total,
      percentage: 0,
    });
  }

  const result = Array.from(groups.values());
  for (const group of result) {
    group.percentage = group.total > 0 ? Math.round((group.unmatched / group.total) * 100) : 0;
  }

  // Biggest gap first; ties broken by the share of the group, so a small set
  // that is mostly unpaired is not buried under a large set with a few holes.
  return result.sort((a, b) => b.unmatched - a.unmatched || b.percentage - a.percentage);
}

export function computePairingCoverage(
  thaiCards: CardLike[],
  mappedCardIds: Set<string>
): PairingCoverage {
  const unmatchedCards = thaiCards.filter((c) => !mappedCardIds.has(c.id));
  const matched = thaiCards.length - unmatchedCards.length;
  const altArtUnmatched = unmatchedCards.filter((c) => isAltArtRarity(c.rarityCode)).length;

  return {
    totalCards: thaiCards.length,
    matched,
    unmatched: unmatchedCards.length,
    coveragePercentage:
      thaiCards.length > 0 ? Math.round((matched / thaiCards.length) * 100) : 0,
    altArtUnmatched,
    actionableUnmatched: unmatchedCards.length - altArtUnmatched,
    bySet: summariseGroups(
      unmatchedCards,
      thaiCards,
      (c) => c.set?.id,
      (c) => (c.set?.name ? `${c.set.id} · ${c.set.name}` : c.set?.id)
    ),
    byRarity: summariseGroups(
      unmatchedCards,
      thaiCards,
      (c) => c.rarityCode,
      (c) => c.rarityCode
    ),
    byCategory: summariseGroups(
      unmatchedCards,
      thaiCards,
      (c) => c.category,
      (c) => c.category
    ),
  };
}

/** Plain-text report, for pasting into a spreadsheet or an issue. */
export function formatCoverageReport(coverage: PairingCoverage): string {
  const lines: string[] = [];
  lines.push('สรุปการ์ดที่ยังจับคู่ไทย-อังกฤษไม่ได้');
  lines.push(
    `จับคู่แล้ว ${coverage.matched.toLocaleString()} / ${coverage.totalCards.toLocaleString()} ใบ (${coverage.coveragePercentage}%)`
  );
  lines.push(`ยังไม่จับคู่ ${coverage.unmatched.toLocaleString()} ใบ`);
  lines.push(
    `  - อาร์ตพิเศษ (AR/SR/UR/HR) ${coverage.altArtUnmatched.toLocaleString()} ใบ — มักไม่มีคู่ EN`
  );
  lines.push(`  - พิมพ์ปกติ ${coverage.actionableUnmatched.toLocaleString()} ใบ — ควรตามจับคู่`);
  lines.push('');
  lines.push('แยกตามชุด:');
  for (const group of coverage.bySet) {
    lines.push(`  ${group.label} — ${group.unmatched}/${group.total} ใบ (${group.percentage}%)`);
  }
  return lines.join('\n');
}

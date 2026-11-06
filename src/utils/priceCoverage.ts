/**
 * Summarises which Thai cards still have no market price, and why.
 *
 * Thai prices are derived from the paired English card, so a missing price has
 * one of three causes and they need very different responses:
 *
 *  - unpaired      — no English counterpart, so nothing to derive from
 *  - enUnpriced    — paired, but the English card carries no price in the
 *                    TCGPlayer feed. Concentrated in the newest sets, where
 *                    pricing lags, so these tend to resolve on their own.
 *  - unexpected    — paired AND the English card is priced, yet the Thai card
 *                    has no price. That should not happen; it points at a
 *                    derivation bug rather than missing upstream data.
 *
 * Reporting one total hides all of that, which is what makes the number look
 * like more work than it is.
 */

export type MissingPriceReason = 'unpaired' | 'enUnpriced' | 'unexpected';

export interface PriceCoverageGroup {
  key: string;
  label: string;
  missing: number;
  total: number;
  percentage: number;
}

export interface MissingPriceCard {
  id: string;
  name: string;
  setId: string;
  setName: string;
  collectorNumber: string;
  rarityCode: string;
  reason: MissingPriceReason;
  /** The paired English card id, when there is one. */
  enCardId?: string;
}

export interface PriceCoverage {
  totalCards: number;
  priced: number;
  missing: number;
  coveragePercentage: number;
  byReason: Record<MissingPriceReason, number>;
  bySet: PriceCoverageGroup[];
  byRarity: PriceCoverageGroup[];
  /** Every unpriced card, worst set first, for the drill-down list. */
  cards: MissingPriceCard[];
}

interface CardLike {
  id: string;
  name?: string;
  collectorNumber?: string;
  localId?: string;
  rarityCode?: string;
  set?: { id?: string; name?: string };
}

interface PriceLike {
  regular?: number | null;
  foil?: number | null;
}

interface MappingLike {
  enCardId?: string;
}

/** A card counts as priced when it has a usable figure to show. */
export function hasUsablePrice(price?: PriceLike): boolean {
  if (!price) return false;
  const regular = price.regular;
  const foil = price.foil;
  return (regular != null && regular > 0) || (foil != null && foil > 0);
}

function groupOf(
  missingCards: CardLike[],
  allCards: CardLike[],
  keyOf: (c: CardLike) => string | undefined,
  labelOf: (c: CardLike) => string | undefined
): PriceCoverageGroup[] {
  const totals = new Map<string, number>();
  for (const card of allCards) {
    const key = keyOf(card) || '(ไม่ระบุ)';
    totals.set(key, (totals.get(key) || 0) + 1);
  }

  const groups = new Map<string, PriceCoverageGroup>();
  for (const card of missingCards) {
    const key = keyOf(card) || '(ไม่ระบุ)';
    const existing = groups.get(key);
    if (existing) {
      existing.missing += 1;
      continue;
    }
    groups.set(key, {
      key,
      label: labelOf(card) || key,
      missing: 1,
      total: totals.get(key) || 0,
      percentage: 0,
    });
  }

  const result = Array.from(groups.values());
  for (const g of result) {
    g.percentage = g.total > 0 ? Math.round((g.missing / g.total) * 100) : 0;
  }
  return result.sort((a, b) => b.missing - a.missing || b.percentage - a.percentage);
}

export function computePriceCoverage(
  thaiCards: CardLike[],
  prices: Record<string, PriceLike | undefined>,
  cardMap: Record<string, MappingLike | undefined>
): PriceCoverage {
  const missingCards: CardLike[] = [];
  const detailed: MissingPriceCard[] = [];
  const byReason: Record<MissingPriceReason, number> = {
    unpaired: 0,
    enUnpriced: 0,
    unexpected: 0,
  };

  for (const card of thaiCards) {
    if (hasUsablePrice(prices[card.id])) continue;

    missingCards.push(card);

    const mapping = cardMap[card.id];
    let reason: MissingPriceReason;
    if (!mapping?.enCardId) {
      reason = 'unpaired';
    } else {
      const enId = mapping.enCardId;
      const enPrice = prices[enId] || prices[enId.replace(/^EN-/, '')];
      reason = hasUsablePrice(enPrice) ? 'unexpected' : 'enUnpriced';
    }
    byReason[reason] += 1;

    detailed.push({
      id: card.id,
      name: card.name || card.id,
      setId: card.set?.id || 'PROMO',
      setName: card.set?.name || 'การ์ดโปรโม / อื่น ๆ',
      collectorNumber: String(card.collectorNumber ?? card.localId ?? ''),
      rarityCode: card.rarityCode || 'REGULAR',
      reason,
      enCardId: mapping?.enCardId,
    });
  }

  const priced = thaiCards.length - missingCards.length;
  const bySet = groupOf(
    missingCards,
    thaiCards,
    (c) => c.set?.id,
    (c) => (c.set?.name ? `${c.set.id} · ${c.set.name}` : c.set?.id)
  );

  // Order the drill-down the same way the set table reads, so clicking a row
  // and scanning the list agree.
  const setRank = new Map(bySet.map((g, i) => [g.key, i]));
  detailed.sort(
    (a, b) =>
      (setRank.get(a.setId) ?? 999) - (setRank.get(b.setId) ?? 999) ||
      a.collectorNumber.localeCompare(b.collectorNumber, undefined, { numeric: true })
  );

  return {
    totalCards: thaiCards.length,
    priced,
    missing: missingCards.length,
    coveragePercentage:
      thaiCards.length > 0 ? Math.round((priced / thaiCards.length) * 100) : 0,
    byReason,
    bySet,
    byRarity: groupOf(
      missingCards,
      thaiCards,
      (c) => c.rarityCode,
      (c) => c.rarityCode
    ),
    cards: detailed,
  };
}

export const REASON_LABELS: Record<MissingPriceReason, string> = {
  unpaired: 'ยังไม่จับคู่ EN',
  enUnpriced: 'จับคู่แล้ว แต่ EN ไม่มีราคาใน feed',
  unexpected: 'จับคู่แล้วและ EN มีราคา — ไม่ควรเกิด',
};

/** Plain-text report, for pasting into a spreadsheet or an issue. */
export function formatPriceCoverageReport(coverage: PriceCoverage): string {
  const lines: string[] = [];
  lines.push('สรุปการ์ดไทยที่ยังไม่มีราคา');
  lines.push(
    `มีราคา ${coverage.priced.toLocaleString()} / ${coverage.totalCards.toLocaleString()} ใบ (${coverage.coveragePercentage}%)`
  );
  lines.push(`ยังไม่มีราคา ${coverage.missing.toLocaleString()} ใบ`);
  for (const reason of Object.keys(REASON_LABELS) as MissingPriceReason[]) {
    lines.push(`  - ${REASON_LABELS[reason]}: ${coverage.byReason[reason].toLocaleString()} ใบ`);
  }
  lines.push('');
  lines.push('แยกตามชุด:');
  for (const g of coverage.bySet) {
    lines.push(`  ${g.label} — ${g.missing}/${g.total} ใบ (${g.percentage}%)`);
  }
  return lines.join('\n');
}

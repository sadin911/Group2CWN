import type { Deck, DeckStats, DeckMissingReport, MissingCardInfo, EquivalentOwnedCard } from '../types/deck';
import type { CollectionCardEntry } from '../types/collection';
import { isAceSpecCard as checkAceSpec } from './rarity';

export function isBasicEnergy(name?: string): boolean {
  if (!name) return false;
  return (
    name.includes('พลังงานพื้นฐาน') ||
    name.includes('Basic Energy') ||
    (name.startsWith('Basic ') && name.endsWith(' Energy'))
  );
}

export function isRadiantCard(name?: string): boolean {
  if (!name) return false;
  return name.includes('ส่องประกาย') || name.includes('Radiant');
}

export function isAceSpecCard(cardOrName?: any, colNum?: string): boolean {
  return checkAceSpec(cardOrName, colNum);
}

/**
 * Normalizes card name for equivalence matching across sets and rarities.
 * - Basic Energy types (Grass, Fire, Water, etc.)
 * - Subtitles in parentheses (Boss's Orders, Professor's Research)
 * - Removes bracket role tags e.g. [ซัพพอร์ต], [ไอเท็ม]
 */
export function getCardEquivalenceKey(card?: any, fallbackId: string = ''): string {
  if (!card && !fallbackId) return 'unknown';
  const name: string = card?.name || fallbackId;

  // 1. Basic Energy normalization
  if (isBasicEnergy(name)) {
    const type = card?.types?.[0] || '';
    if (type) return `energy:basic:${type.toLowerCase()}`;
    const match = name.match(/\[(.*?)\]/) || name.match(/\((.*?)\)/);
    if (match && match[1]) {
      return `energy:basic:${match[1].trim().toLowerCase()}`;
    }
    const cleanEnergyName = name.replace(/\s+/g, '').toLowerCase();
    return `energy:basic:${cleanEnergyName}`;
  }

  // 2. Special cards with character subtitle variants
  if (name.includes('คำสั่งของบอส') || name.includes("Boss's Orders")) {
    return "trainer:supporter:boss's orders";
  }
  if (name.includes('งานวิจัยของศาสตราจารย์') || name.includes("Professor's Research")) {
    return "trainer:supporter:professor's research";
  }

  // 3. General cards: Normalize spaces, strip bracket tags (like [ซัพพอร์ต]), and trim
  const cleanName = name
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  const category = (card?.category || 'Pokemon').toLowerCase();
  return `${category}:${cleanName}`;
}

export function calculateDeckStats(
  deck: Deck,
  cardDataMap: Map<string, any>
): DeckStats {
  let totalCards = 0;
  let pokemonCount = 0;
  let trainerCount = 0;
  let energyCount = 0;
  const ruleViolations: string[] = [];

  const nameCounts: Record<string, number> = {};
  let radiantCount = 0;
  let aceSpecCount = 0;

  for (const [cardId, entry] of Object.entries(deck.cards)) {
    const count = entry.count || 0;
    if (count <= 0) continue;

    totalCards += count;
    const card = cardDataMap.get(cardId);
    const name = card?.name || cardId;
    const category = card?.category || 'Pokemon';
    const colNum = card?.collectorNumber || card?.localId || '';

    if (category === 'Pokemon') pokemonCount += count;
    else if (category === 'Trainer') trainerCount += count;
    else if (category === 'Energy') energyCount += count;

    // Rule: Max 4 per name (except Basic Energy)
    if (!isBasicEnergy(name)) {
      const eqKey = getCardEquivalenceKey(card, cardId);
      nameCounts[eqKey] = (nameCounts[eqKey] || 0) + count;
      if (nameCounts[eqKey] > 4) {
        ruleViolations.push(`การ์ด "${name}" เกิน 4 ใบ (มีรวมทุกแบบ ${nameCounts[eqKey]} ใบ)`);
      }
    }

    // Rule: Max 1 Radiant
    if (isRadiantCard(name)) {
      radiantCount += count;
      if (radiantCount > 1) {
        ruleViolations.push(`การ์ดโปเกมอนส่องประกาย (Radiant) ใส่ได้ไม่เกิน 1 ใบต่อเด็ค`);
      }
    }

    // Rule: Max 1 ACE SPEC
    if (isAceSpecCard(name, colNum)) {
      aceSpecCount += count;
      if (aceSpecCount > 1) {
        ruleViolations.push(`การ์ด ACE SPEC ใส่ได้ไม่เกิน 1 ใบต่อเด็ค`);
      }
    }
  }

  if (totalCards !== 60) {
    if (totalCards < 60) {
      ruleViolations.push(`จำนวนการ์ดยังไม่ครบ 60 ใบ (ปัจจุบันมี ${totalCards} ใบ, ขาดอีก ${60 - totalCards} ใบ)`);
    } else {
      ruleViolations.push(`จำนวนการ์ดเกิน 60 ใบ (ปัจจุบันมี ${totalCards} ใบ, เกินมา ${totalCards - 60} ใบ)`);
    }
  }

  return {
    totalCards,
    pokemonCount,
    trainerCount,
    energyCount,
    isLegal60: ruleViolations.length === 0,
    ruleViolations,
  };
}

export function calculateMissingCards(
  deck: Deck,
  cardDataMap: Map<string, any>,
  userCollectionCards: Record<string, CollectionCardEntry> = {},
  mode: 'equivalent' | 'exact' = 'equivalent'
): DeckMissingReport {
  let totalCardsNeeded = 0;
  let totalCardsOwned = 0;
  let totalCardsMissing = 0;

  const missingItems: MissingCardInfo[] = [];
  const completeItems: MissingCardInfo[] = [];

  // 1. Group user owned cards by equivalence key
  const ownedByEquivalence = new Map<string, {
    totalOwned: number;
    ownedCards: EquivalentOwnedCard[];
  }>();

  for (const [collCardId, entry] of Object.entries(userCollectionCards)) {
    const variants = entry?.variants || { normal: 0, holo: 0, reverse: 0, promo: 0 };
    const count = (variants.normal || 0) + (variants.holo || 0) + (variants.reverse || 0) + (variants.promo || 0);
    if (count <= 0) continue;

    const card = cardDataMap.get(collCardId);
    const eqKey = getCardEquivalenceKey(card, collCardId);

    let group = ownedByEquivalence.get(eqKey);
    if (!group) {
      group = { totalOwned: 0, ownedCards: [] };
      ownedByEquivalence.set(eqKey, group);
    }

    group.totalOwned += count;
    group.ownedCards.push({
      cardId: collCardId,
      setId: card?.set?.id || 'PROMO',
      setName: card?.set?.name || 'การ์ดโปรโม / อื่น ๆ',
      collectorNumber: card?.collectorNumber || card?.localId || '',
      imageUrl: card?.imageUrl || '',
      count,
      isExact: false,
    });
  }

  // 2. Track remaining pool for equivalent calculation
  const remainingOwnedPool = new Map<string, number>();
  for (const [eqKey, group] of ownedByEquivalence.entries()) {
    remainingOwnedPool.set(eqKey, group.totalOwned);
  }

  // 3. Process each card in the deck
  for (const [cardId, entry] of Object.entries(deck.cards)) {
    const countNeeded = entry.count || 0;
    if (countNeeded <= 0) continue;

    totalCardsNeeded += countNeeded;
    const card = cardDataMap.get(cardId);
    const name = card?.name || cardId;
    const category = card?.category || 'Pokemon';
    const types = card?.types || [];
    const setId = card?.set?.id || 'PROMO';
    const setName = card?.set?.name || 'การ์ดโปรโม / อื่น ๆ';
    const collectorNumber = card?.collectorNumber || card?.localId || '';
    const imageUrl = card?.imageUrl || '';

    const collEntry = userCollectionCards[cardId];
    const variants = collEntry?.variants || { normal: 0, holo: 0, reverse: 0, promo: 0 };
    const exactOwned = (variants.normal || 0) + (variants.holo || 0) + (variants.reverse || 0) + (variants.promo || 0);

    const eqKey = getCardEquivalenceKey(card, cardId);
    const eqGroup = ownedByEquivalence.get(eqKey);
    const totalEquivalentOwned = eqGroup?.totalOwned || 0;
    const equivalentCardsOwned = (eqGroup?.ownedCards || []).map((c) => ({
      ...c,
      isExact: c.cardId === cardId,
    }));

    let countCredited = 0;
    let missingCount = 0;

    if (mode === 'exact') {
      countCredited = Math.min(countNeeded, exactOwned);
      missingCount = Math.max(0, countNeeded - exactOwned);
    } else {
      // Equivalent mode: Draw from available pool for this equivalence key
      const currentPool = remainingOwnedPool.get(eqKey) || 0;
      countCredited = Math.min(countNeeded, currentPool);
      remainingOwnedPool.set(eqKey, Math.max(0, currentPool - countCredited));
      missingCount = Math.max(0, countNeeded - countCredited);
    }

    totalCardsOwned += countCredited;
    totalCardsMissing += missingCount;

    const info: MissingCardInfo = {
      cardId,
      name,
      category,
      types,
      setId,
      setName,
      collectorNumber,
      imageUrl,
      countNeeded,
      countOwned: mode === 'exact' ? exactOwned : countCredited,
      missingCount,
      exactOwned,
      totalEquivalentOwned,
      equivalentCardsOwned,
      isEquivalentComplete: totalEquivalentOwned >= countNeeded,
    };

    if (missingCount > 0) {
      missingItems.push(info);
    } else {
      completeItems.push(info);
    }
  }

  const completionPercentage =
    totalCardsNeeded > 0
      ? Math.min(100, Math.round((totalCardsOwned / totalCardsNeeded) * 100))
      : 100;

  return {
    totalCardsNeeded,
    totalCardsOwned,
    totalCardsMissing,
    missingItems,
    completeItems,
    isComplete: totalCardsMissing === 0 && totalCardsNeeded > 0,
    completionPercentage,
    calculationMode: mode,
  };
}

export function generateShoppingListText(deckName: string, report: DeckMissingReport): string {
  if (report.missingItems.length === 0) {
    return `🎉 เด็ค "${deckName}" มีการ์ดครบทั้งหมดแล้ว (100%) ไม่มีการ์ดที่ต้องหาเพิ่ม`;
  }

  const modeLabel = report.calculationMode === 'equivalent'
    ? '(คำนวณแบบรวมการ์ดชื่อเดียวกันทุกชุด)'
    : '(คำนวณแบบตรงชุด/ตรงภาพ)';

  const lines = [
    `📋 [รายการการ์ดที่ยังขาด] สำหรับเด็ค: ${deckName} ${modeLabel}`,
    `📊 ขาดทั้งหมด ${report.totalCardsMissing} ใบ (มีแล้ว ${report.totalCardsOwned}/${report.totalCardsNeeded} ใบ - ${report.completionPercentage}%)`,
    `----------------------------------------`,
  ];

  // Group by category
  const categories = ['Pokemon', 'Trainer', 'Energy'];
  const catNames: Record<string, string> = {
    Pokemon: '👾 โปเกมอน (Pokemon)',
    Trainer: '🎒 เทรนเนอร์ (Trainer)',
    Energy: '⚡ พลังงาน (Energy)',
  };

  for (const cat of categories) {
    const items = report.missingItems.filter((i) => i.category === cat);
    if (items.length > 0) {
      lines.push(`\n${catNames[cat]}:`);
      items.forEach((item) => {
        let line = ` • ${item.name} (${item.setId} ${item.collectorNumber}) - ขาด ${item.missingCount} ใบ (ต้องการ ${item.countNeeded}, มีตรงชุด ${item.exactOwned})`;
        if (item.totalEquivalentOwned > item.exactOwned) {
          line += ` [มีชุดอื่นรวม ${item.totalEquivalentOwned} ใบ]`;
        }
        lines.push(line);
      });
    }
  }

  lines.push(`\n----------------------------------------`);
  lines.push(`✨ สร้างจาก PokéCount Deck Builder`);
  return lines.join('\n');
}

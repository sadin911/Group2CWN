import type { Deck } from '../types/deck';
import type { DeckConsistencyStats } from '../types/playtest';
import thaiSupporterNamesRaw from '../data/thaiSupporterNames.json';

const thaiSupporterSet = new Set(thaiSupporterNamesRaw.map((s: string) => s.trim().toLowerCase()));

/**
 * Calculates combination: n Choose k = n! / (k! * (n-k)!)
 */
export function combinations(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let c = 1;
  const minK = Math.min(k, n - k);
  for (let i = 1; i <= minK; i++) {
    c = (c * (n - minK + i)) / i;
  }
  return c;
}

/**
 * Hypergeometric Probability:
 * P(X = k) = [combinations(K, k) * combinations(N - K, n - k)] / combinations(N, n)
 *
 * @param N Total population size (e.g. 60 cards)
 * @param K Total successes in population (e.g. number of Basic Pokémon in deck)
 * @param n Sample size / draws (e.g. 7 opening hand cards)
 * @param k Number of observed successes in sample
 */
export function hypergeometricProbability(N: number, K: number, n: number, k: number): number {
  if (N <= 0 || n <= 0 || n > N || K < 0 || K > N) return 0;
  const denominator = combinations(N, n);
  if (denominator === 0) return 0;
  const numerator = combinations(K, k) * combinations(N - K, n - k);
  return numerator / denominator;
}

/**
 * Cumulative Hypergeometric Probability of drawing AT LEAST minSuccesses:
 * P(X >= minSuccesses) = 1 - P(X < minSuccesses)
 */
export function hypergeometricAtLeast(N: number, K: number, n: number, minSuccesses: number = 1): number {
  if (minSuccesses <= 0) return 1;
  if (K < minSuccesses) return 0;
  if (n < minSuccesses) return 0;

  let pLessThan = 0;
  for (let x = 0; x < minSuccesses; x++) {
    pLessThan += hypergeometricProbability(N, K, n, x);
  }
  return Math.max(0, Math.min(1, 1 - pLessThan));
}

/**
 * Checks if a card is a Basic Pokémon
 */
export function isBasicPokemonCard(card?: any): boolean {
  if (!card) return false;
  if (card.category !== 'Pokemon') return false;
  const stage = card.stage || '';
  return (
    stage.includes('พื้นฐาน') ||
    stage.toLowerCase().includes('basic') ||
    stage === '' // fallback for promos / basics without stage tag
  );
}

/**
 * Checks if a card is a Pokémon search card (Balls, Poffin, etc.)
 */
export function isSearchTrainerCard(card?: any): boolean {
  if (!card || card.category !== 'Trainer') return false;
  const name = (card.name || '').toLowerCase();
  return (
    name.includes('บอล') ||
    name.includes('ball') ||
    name.includes('พัฟฟิน') ||
    name.includes('poffin') ||
    name.includes('ซิกแนล') ||
    name.includes('signal') ||
    name.includes('ชุดจับแมลง') ||
    name.includes('bug catching') ||
    name.includes('อโรมา') ||
    name.includes('โรทอม')
  );
}

/**
 * Checks if a card is a Supporter
 */
export function isSupporterCard(card?: any): boolean {
  if (!card) return false;
  if (card.category === 'Pokemon' || card.category === 'Energy') return false;

  const trainerType = (card.trainerType || '').toLowerCase();
  const stage = (card.stage || '').toLowerCase();
  const name = (card.name || '').trim();

  // 1. Direct tag in stage or trainerType
  if (
    stage === 'supporter' ||
    stage === 'ซัพพอร์ต' ||
    trainerType.includes('ซัพพอร์ต') ||
    trainerType.includes('supporter')
  ) {
    return true;
  }

  // 2. Bracket or parenthetical tag in name
  if (name.includes('[ซัพพอร์ต]') || name.includes('[Supporter]') || name.includes('(ซัพพอร์ต)')) {
    return true;
  }

  // 3. Clean name lookup in Thai Supporter dictionary
  const cleanName = name.replace(/\s*\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').trim().toLowerCase();
  if (thaiSupporterSet.has(cleanName)) {
    return true;
  }

  // 4. Substring check for compound titles (e.g. "คำสั่งของบอส", "งานวิจัยของศาสตราจารย์")
  for (const supp of thaiSupporterSet) {
    if (supp.length >= 3 && cleanName.includes(supp)) return true;
  }

  return false;
}

/**
 * Checks if a card is an Energy card
 */
export function isEnergyCard(card?: any): boolean {
  if (!card) return false;
  return card.category === 'Energy';
}

/**
 * Computes comprehensive opening hand consistency statistics for a given deck.
 */
export function calculateDeckConsistency(
  deck: Deck,
  cardDataMap: Map<string, any>
): DeckConsistencyStats {
  let totalCards = 0;
  let basicPokemonCount = 0;
  let searchTrainerCount = 0;
  let supporterCount = 0;
  let energyCount = 0;

  for (const [cardId, entry] of Object.entries(deck.cards)) {
    const count = entry.count || 0;
    if (count <= 0) continue;
    totalCards += count;

    const card = cardDataMap.get(cardId);
    if (isBasicPokemonCard(card)) basicPokemonCount += count;
    if (isSearchTrainerCard(card)) searchTrainerCount += count;
    if (isSupporterCard(card)) supporterCount += count;
    if (isEnergyCard(card)) energyCount += count;
  }

  // If deck is empty or small, fallback
  const deckSize = totalCards > 0 ? totalCards : 60;
  const handSize = Math.min(7, deckSize);

  const pBasic = hypergeometricAtLeast(deckSize, basicPokemonCount, handSize, 1);
  const pSearch = hypergeometricAtLeast(deckSize, searchTrainerCount, handSize, 1);
  const pSupporter = hypergeometricAtLeast(deckSize, supporterCount, handSize, 1);
  const pEnergy = hypergeometricAtLeast(deckSize, energyCount, handSize, 1);
  const mulliganRate = 1 - pBasic;

  return {
    totalCards,
    basicPokemonCount,
    searchTrainerCount,
    supporterCount,
    energyCount,
    pBasicOpening: Number((pBasic * 100).toFixed(1)),
    pSearchOpening: Number((pSearch * 100).toFixed(1)),
    pSupporterOpening: Number((pSupporter * 100).toFixed(1)),
    pEnergyOpening: Number((pEnergy * 100).toFixed(1)),
    mulliganExpectation: Number((mulliganRate * 100).toFixed(1)),
  };
}

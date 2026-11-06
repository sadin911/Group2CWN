import type { MarketPrice } from '../types/pricing';

export interface PokemonPriceQuery {
  cardId: string;
  enName: string;
  setCode?: string;
  number?: string;
}

const CACHE_KEY_PREFIX = 'pokecount_price_cache_v1_';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// In-memory cache for fast session lookups
const memoryCache = new Map<string, { data: MarketPrice; timestamp: number }>();

/**
 * Fetch live card price from pokemontcg.io v2 (Free public API).
 * Includes 24h localStorage & in-memory cache to stay well within free limits.
 */
export async function fetchPokemonCardPrice(
  query: PokemonPriceQuery,
  customApiKey?: string
): Promise<MarketPrice | null> {
  const cacheKey = `${query.cardId}_${query.enName}_${query.setCode || ''}_${query.number || ''}`.toLowerCase();

  // 1. Check memory cache
  const memCached = memoryCache.get(cacheKey);
  if (memCached && Date.now() - memCached.timestamp < CACHE_TTL_MS) {
    return memCached.data;
  }

  // 2. Check localStorage cache
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = localStorage.getItem(`${CACHE_KEY_PREFIX}${cacheKey}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.timestamp && Date.now() - parsed.timestamp < CACHE_TTL_MS && parsed.data) {
          memoryCache.set(cacheKey, parsed);
          return parsed.data as MarketPrice;
        }
      }
    } catch {
      // Ignore cache read errors
    }
  }

  // 3. Build Pokemontcg.io Query
  // Escape quotes in card name for query
  const cleanName = query.enName.replace(/"/g, '\\"');
  let q = `name:"${cleanName}"`;
  if (query.setCode) {
    // ptcgoCode matches OBF, MEW, PAL, PAR, etc.
    q += ` (set.ptcgoCode:${query.setCode} OR set.id:${query.setCode.toLowerCase()})`;
  }
  if (query.number) {
    q += ` number:${query.number}`;
  }

  const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&pageSize=1`;

  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (customApiKey) {
      headers['X-Api-Key'] = customApiKey;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, { headers, signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      // If specific query failed (e.g. setCode mismatch), try broad search by name only
      if (query.setCode || query.number) {
        return fetchPokemonCardPrice({ cardId: query.cardId, enName: query.enName }, customApiKey);
      }
      const fallback = await fetchFallbackTcgdexPrice(query);
      if (fallback) {
        memoryCache.set(cacheKey, { data: fallback, timestamp: Date.now() });
        return fallback;
      }
      return null;
    }

    const json = await res.json();
    const cardData = json?.data?.[0];
    if (!cardData) {
      // Fallback 1: If strict set query found nothing, try searching by name only
      if (query.setCode || query.number) {
        return fetchPokemonCardPrice({ cardId: query.cardId, enName: query.enName }, customApiKey);
      }
      // Fallback 2: Try secondary public API (TCGdex)
      const fallback = await fetchFallbackTcgdexPrice(query);
      if (fallback) {
        memoryCache.set(cacheKey, { data: fallback, timestamp: Date.now() });
        return fallback;
      }
      return null;
    }

    // Extract TCGPlayer prices
    const tcg = cardData.tcgplayer?.prices || {};
    const normal = tcg.normal;
    const holofoil = tcg.holofoil;
    const reverseHolofoil = tcg.reverseHolofoil;
    const unlimited = tcg.unlimitedNormal;

    let regularUSD =
      normal?.market ??
      normal?.mid ??
      unlimited?.market ??
      holofoil?.market ??
      null;

    let foilUSD =
      holofoil?.market ??
      reverseHolofoil?.market ??
      holofoil?.mid ??
      reverseHolofoil?.mid ??
      null;

    let priceSource: string = 'tcgplayer';
    let priceSourceLabel: string = 'TCGplayer';

    // 1. Fallback to Cardmarket if TCGplayer has no price data
    if (regularUSD === null && foilUSD === null && cardData.cardmarket?.prices) {
      const cm = cardData.cardmarket.prices;
      const EUR_TO_USD = 1.087; // Current approx conversion rate EUR -> USD
      const cmReg =
        cm.trendPrice ??
        cm.averageSellPrice ??
        cm.avg30 ??
        cm.avg7 ??
        cm.suggestedPrice ??
        cm.lowPrice ??
        null;
      const cmFoil = cm.reverseHoloTrend ?? cm.reverseHoloSell ?? cm.trendPrice ?? null;

      if (cmReg !== null || cmFoil !== null) {
        regularUSD = cmReg !== null ? Math.round(cmReg * EUR_TO_USD * 100) / 100 : null;
        foilUSD = cmFoil !== null ? Math.round(cmFoil * EUR_TO_USD * 100) / 100 : regularUSD;
        priceSource = 'cardmarket';
        priceSourceLabel = 'Cardmarket (EU)';
      }
    }

    // 2. If pokemontcg.io card had no prices in both TCGplayer & Cardmarket, try TCGdex API fallback
    if (regularUSD === null && foilUSD === null) {
      const tcgdexFallback = await fetchFallbackTcgdexPrice(query);
      if (tcgdexFallback) {
        memoryCache.set(cacheKey, { data: tcgdexFallback, timestamp: Date.now() });
        return tcgdexFallback;
      }
    }

    const marketPrice: MarketPrice = {
      cardId: query.cardId,
      enName: query.enName,
      regular: typeof regularUSD === 'number' ? regularUSD : null,
      foil: typeof foilUSD === 'number' ? foilUSD : null,
      updatedAt: new Date().toISOString(),
      source: priceSource,
      sourceLabel: priceSourceLabel,
      url: cardData.tcgplayer?.url || cardData.cardmarket?.url || undefined,
    };

    // Save to memory cache
    memoryCache.set(cacheKey, { data: marketPrice, timestamp: Date.now() });

    // Save to localStorage cache
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(
          `${CACHE_KEY_PREFIX}${cacheKey}`,
          JSON.stringify({ data: marketPrice, timestamp: Date.now() })
        );
      } catch {
        // Ignore quota errors
      }
    }

    return marketPrice;
  } catch (err) {
    console.warn(`[pokemonPricingService] Failed to fetch price for ${query.enName}:`, err);
    // On network error or timeout with pokemontcg.io, try secondary fallback API (TCGdex)
    try {
      const fallback = await fetchFallbackTcgdexPrice(query);
      if (fallback) {
        memoryCache.set(cacheKey, { data: fallback, timestamp: Date.now() });
        return fallback;
      }
    } catch {
      // Ignore
    }
    return null;
  }
}

/**
 * Secondary Free Fallback: Fetch pricing from TCGdex (which aggregates Cardmarket EUR data).
 */
async function fetchFallbackTcgdexPrice(query: PokemonPriceQuery): Promise<MarketPrice | null> {
  try {
    const cleanName = query.enName.replace(/"/g, '').trim();
    if (!cleanName) return null;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const searchUrl = `https://api.tcgdex.net/v2/en/cards?name=${encodeURIComponent(cleanName)}`;
    const searchRes = await fetch(searchUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!searchRes.ok) return null;
    const cardsList = await searchRes.json();
    if (!Array.isArray(cardsList) || cardsList.length === 0) return null;

    // Pick best match by card number or first
    let targetCard = cardsList[0];
    if (query.number) {
      const match = cardsList.find(
        (c: { localId?: string }) =>
          c.localId === query.number || String(c.localId).includes(query.number!)
      );
      if (match) targetCard = match;
    }

    if (!targetCard?.id) return null;

    const detailRes = await fetch(`https://api.tcgdex.net/v2/en/cards/${targetCard.id}`);
    if (!detailRes.ok) return null;
    const detailJson = await detailRes.json();

    const cm = detailJson?.pricing?.cardmarket;
    if (!cm) return null;

    const EUR_TO_USD = 1.087;
    const regEUR = cm.trend ?? cm.avg ?? cm.avg30 ?? cm.avg7 ?? cm.low ?? null;
    const foilEUR = cm['trend-holo'] ?? cm['avg-holo'] ?? cm['avg30-holo'] ?? null;

    if (regEUR === null && foilEUR === null) return null;

    const regularUSD = regEUR !== null ? Math.round(regEUR * EUR_TO_USD * 100) / 100 : null;
    const foilUSD = foilEUR !== null ? Math.round(foilEUR * EUR_TO_USD * 100) / 100 : regularUSD;

    return {
      cardId: query.cardId,
      enName: query.enName,
      regular: regularUSD,
      foil: foilUSD,
      updatedAt: new Date().toISOString(),
      source: 'tcgdex',
      sourceLabel: 'TCGdex / Cardmarket',
      url: `https://www.cardmarket.com/en/Pokemon/Products/Singles?searchString=${encodeURIComponent(query.enName)}`,
    };
  } catch {
    return null;
  }
}

/**
 * Returns human-readable label for a pricing source
 */
export function getPriceSourceLabel(source?: string, sourceLabel?: string): string {
  if (sourceLabel) return sourceLabel;
  if (!source) return 'TCGplayer';
  switch (source) {
    case 'cardmarket':
      return 'Cardmarket (EU)';
    case 'tcgdex':
      return 'TCGdex / Cardmarket';
    case 'ebay_sold':
      return 'eBay Sold (ราคาขายจริง)';
    case 'pricecharting':
      return 'PriceCharting';
    case 'admin_manual':
      return 'ฐานข้อมูลกลาง';
    case 'pokemontcg_io':
    case 'tcgplayer':
    default:
      return 'TCGplayer';
  }
}

/**
 * Returns emoji icon representing the pricing source
 */
export function getPriceSourceIcon(source?: string, sourceLabel?: string): string {
  const s = (sourceLabel || source || '').toLowerCase();
  if (s.includes('cardmarket')) return '🇪🇺';
  if (s.includes('tcgdex')) return '🌐';
  if (s.includes('ebay')) return '🛒';
  if (s.includes('pricecharting')) return '📈';
  return '⚡';
}

/**
 * Clear local price caches
 */
export function clearPokemonPriceCache(): void {
  memoryCache.clear();
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CACHE_KEY_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      for (const k of keysToRemove) {
        localStorage.removeItem(k);
      }
    } catch {
      // Ignore errors
    }
  }
}

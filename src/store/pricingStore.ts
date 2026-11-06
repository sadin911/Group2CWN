import { create } from 'zustand';
import { db } from '../utils/firebase';
import {
  doc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';
import type {
  MarketPrice,
  UserCardPrice,
  Currency,
  CardSaleTransaction,
  CardPricingSummary,
} from '../types/pricing';
import {
  DEFAULT_EXCHANGE_RATES,
  CURRENCY_SYMBOLS,
} from '../types/pricing';
import { fetchPokemonCardPrice, type PokemonPriceQuery } from '../services/pokemonPricingService';
import { getEnglishMatchForThaiCard, getBaselineMap } from '../utils/thaiEnglishCardMatcher';

const USER_PRICES_STORAGE_KEY = 'pokecount_user_custom_prices_v1';
const CURRENCY_STORAGE_KEY = 'pokecount_preferred_currency_v1';
const EXCHANGE_RATES_STORAGE_KEY = 'pokecount_exchange_rates_v1';
const API_KEY_STORAGE_KEY = 'pokecount_pokemontcg_api_key_v1';

interface PricingState {
  marketPrices: Record<string, MarketPrice>;
  userPrices: Record<string, UserCardPrice>;
  currency: Currency;
  exchangeRates: Record<Currency, number>;
  apiKey: string | null;
  loading: boolean;
  marketLoaded: boolean;
  userPricesLoaded: boolean;
  error: string | null;

  // Actions
  setCurrency: (currency: Currency) => void;
  setExchangeRate: (currency: Currency, rate: number) => void;
  setApiKey: (key: string | null) => void;
  initPricing: (uid?: string | null) => Promise<void>;
  loadMarketPrices: () => Promise<void>;
  loadUserPrices: (uid?: string | null) => Promise<void>;
  setUserPrice: (
    cardId: string,
    priceData: {
      costPrice?: number | null;
      sellPrice?: number | null;
      currency?: Currency;
      isGraded?: boolean;
      gradingCompany?: 'PSA' | 'BGS' | 'CGC' | 'OTHER' | 'RAW';
      grade?: string;
      notes?: string;
    },
    uid?: string | null
  ) => Promise<void>;
  deleteUserPrice: (cardId: string, uid?: string | null) => Promise<void>;
  adminUpdateMarketPrice: (
    cardId: string,
    prices: {
      regular?: number | null;
      foil?: number | null;
      psa10?: number | null;
      lastSold?: number | null;
      lastSoldDate?: string | null;
    }
  ) => Promise<void>;
  logCardSaleTransaction: (
    cardId: string,
    sale: Omit<CardSaleTransaction, 'id'>
  ) => Promise<void>;
  fetchCardLivePrice: (query: PokemonPriceQuery) => Promise<MarketPrice | null>;

  // Calculations & Formatting
  formatPrice: (usdAmount: number | null | undefined, targetCurrency?: Currency) => string;
  formatRawCurrency: (amount: number | null | undefined, currency: Currency) => string;
  getCardMarketPrice: (
    cardId: string,
    enName?: string,
    options?: { forceEnglishPrice?: boolean }
  ) => MarketPrice | undefined;
  getCardUserPrice: (cardId: string) => UserCardPrice | undefined;
  calculateCardTotalValue: (
    cardId: string,
    normalCount?: number,
    foilCount?: number,
    enName?: string
  ) => CardPricingSummary;
  calculateDeckTotalValue: (
    cards: Array<{ cardId: string; count: number; isFoil?: boolean; enName?: string }>
  ) => CardPricingSummary;
}

function hasLocalStorage(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.localStorage !== 'undefined' &&
    typeof window.localStorage.getItem === 'function' &&
    typeof window.localStorage.setItem === 'function'
  );
}

function loadLocalUserPrices(): Record<string, UserCardPrice> {
  if (!hasLocalStorage()) return {};
  try {
    const raw = localStorage.getItem(USER_PRICES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalUserPrices(prices: Record<string, UserCardPrice>) {
  if (!hasLocalStorage()) return;
  try {
    localStorage.setItem(USER_PRICES_STORAGE_KEY, JSON.stringify(prices));
  } catch (err) {
    console.warn('Failed to save user prices to localStorage:', err);
  }
}

function loadLocalExchangeRates(): Record<Currency, number> {
  if (!hasLocalStorage()) return DEFAULT_EXCHANGE_RATES;
  try {
    const raw = localStorage.getItem(EXCHANGE_RATES_STORAGE_KEY);
    return raw ? { ...DEFAULT_EXCHANGE_RATES, ...JSON.parse(raw) } : DEFAULT_EXCHANGE_RATES;
  } catch {
    return DEFAULT_EXCHANGE_RATES;
  }
}

function loadLocalCurrency(): Currency {
  if (!hasLocalStorage()) return 'THB';
  try {
    const raw = localStorage.getItem(CURRENCY_STORAGE_KEY);
    if (raw && ['THB', 'USD', 'EUR', 'GBP', 'JPY'].includes(raw)) {
      return raw as Currency;
    }
  } catch {
    // default
  }
  return 'THB';
}

function loadLocalApiKey(): string | null {
  if (!hasLocalStorage()) return null;
  try {
    return localStorage.getItem(API_KEY_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

export const usePricingStore = create<PricingState>((set, get) => ({
  marketPrices: {},
  userPrices: loadLocalUserPrices(),
  currency: loadLocalCurrency(),
  exchangeRates: loadLocalExchangeRates(),
  apiKey: loadLocalApiKey(),
  loading: false,
  marketLoaded: false,
  userPricesLoaded: false,
  error: null,

  setCurrency: (currency: Currency) => {
    if (hasLocalStorage()) {
      try {
        localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
      } catch (err) {
        console.warn('Failed to save currency preference:', err);
      }
    }
    set({ currency });
  },

  setExchangeRate: (currency: Currency, rate: number) => {
    const { exchangeRates } = get();
    const nextRates = { ...exchangeRates, [currency]: rate };
    if (hasLocalStorage()) {
      try {
        localStorage.setItem(EXCHANGE_RATES_STORAGE_KEY, JSON.stringify(nextRates));
      } catch (err) {
        console.warn('Failed to save exchange rate:', err);
      }
    }
    set({ exchangeRates: nextRates });
  },

  setApiKey: (key: string | null) => {
    if (hasLocalStorage()) {
      try {
        if (key) {
          localStorage.setItem(API_KEY_STORAGE_KEY, key);
        } else {
          localStorage.removeItem(API_KEY_STORAGE_KEY);
        }
      } catch (err) {
        console.warn('Failed to save API key:', err);
      }
    }
    set({ apiKey: key });
  },

  initPricing: async (uid?: string | null) => {
    await Promise.allSettled([get().loadMarketPrices(), get().loadUserPrices(uid)]);
  },

  loadMarketPrices: async () => {
    set({ loading: true, error: null });
    try {
      let pricesMap: Record<string, MarketPrice> = {};

      // 1. Try fetching latest public static json (updated daily by cronjob)
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}data/market_prices.json`, {
          headers: { 'Cache-Control': 'no-cache' },
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.prices && Object.keys(data.prices).length > 0) {
            pricesMap = data.prices;
          }
        }
      } catch (fetchErr) {
        console.debug('Static market_prices.json fetch fallback:', fetchErr);
      }

      // If fetch failed or empty, fallback to bundled static data
      if (Object.keys(pricesMap).length === 0) {
        try {
          const fallback = (await import('../data/market_prices.json')).default;
          if (fallback?.prices) {
            pricesMap = { ...((fallback.prices || {}) as unknown as Record<string, MarketPrice>) };
          }
        } catch (dynErr) {
          console.debug('Dynamic fallback market data load skipped:', dynErr);
        }
      }

      // 2. Fetch Firestore overrides if online & available
      if (db) {
        try {
          const snapshot = await getDocs(collection(db, 'market_prices'));
          if (!snapshot.empty) {
            snapshot.forEach((docSnap) => {
              const data = docSnap.data() as MarketPrice;
              if (data && data.cardId) {
                pricesMap[data.cardId] = data;
                if (data.enName) {
                  pricesMap[data.enName] = data;
                }
              }
            });
          }
        } catch (firestoreErr) {
          console.debug('Firestore market_prices read skipped/failed:', firestoreErr);
        }
      }

      // 3. Auto-link all mapped Thai cards to English prices with 1/3 market estimate ratio
      try {
        const thaiMap = getBaselineMap();
        for (const [thId, m] of Object.entries(thaiMap)) {
          if (!pricesMap[thId]) {
            const enId = m.enCardId;
            const rawId = enId ? enId.replace(/^EN-/, '') : null;
            const match =
              (enId && pricesMap[enId]) ||
              (rawId && pricesMap[rawId]);

            if (match) {
              const reg = match.regular != null ? Math.round((match.regular / 3) * 100) / 100 : null;
              const foil = match.foil != null ? Math.round((match.foil / 3) * 100) / 100 : null;
              const lastSold = match.lastSold != null ? Math.round((match.lastSold / 3) * 100) / 100 : (foil ?? reg);
              const psa10 = match.psa10 != null ? Math.round((match.psa10 / 3) * 100) / 100 : null;

              pricesMap[thId] = {
                cardId: thId,
                enName: m.enName || match.enName,
                regular: reg,
                foil: foil,
                psa10: psa10,
                lastSold: lastSold,
                lastSoldDate: match.lastSoldDate,
                updatedAt: match.updatedAt,
                source: match.source,
                sourceLabel: match.sourceLabel,
                url: match.url,
                isThaiEstimated: true,
                enReference: {
                  regular: match.regular,
                  foil: match.foil,
                },
              };
            }
          }
        }
      } catch (linkErr) {
        console.debug('Linking Thai cards in pricingStore skipped:', linkErr);
      }

      set({ marketPrices: pricesMap, marketLoaded: true, loading: false });
    } catch (err) {
      console.error('Failed to load market prices:', err);
      set({ loading: false, error: (err as Error).message });
    }
  },

  loadUserPrices: async (uid?: string | null) => {
    const local = loadLocalUserPrices();
    set({ userPrices: local, userPricesLoaded: true });

    if (!uid || !db) return;

    try {
      const snap = await getDocs(collection(db, 'users', uid, 'custom_prices'));
      if (!snap.empty) {
        const cloudPrices: Record<string, UserCardPrice> = {};
        snap.forEach((docSnap) => {
          const data = docSnap.data() as UserCardPrice;
          if (data?.cardId) {
            cloudPrices[data.cardId] = data;
          }
        });
        const merged = { ...local, ...cloudPrices };
        saveLocalUserPrices(merged);
        set({ userPrices: merged });
      }
    } catch (err) {
      console.debug('Failed to sync user prices from cloud:', err);
    }
  },

  setUserPrice: async (cardId, priceData, uid) => {
    const { userPrices, currency } = get();
    const updatedRecord: UserCardPrice = {
      cardId,
      costPrice: priceData.costPrice !== undefined ? priceData.costPrice : userPrices[cardId]?.costPrice ?? null,
      sellPrice: priceData.sellPrice !== undefined ? priceData.sellPrice : userPrices[cardId]?.sellPrice ?? null,
      currency: priceData.currency || userPrices[cardId]?.currency || currency,
      isGraded: priceData.isGraded ?? userPrices[cardId]?.isGraded ?? false,
      gradingCompany: priceData.gradingCompany || userPrices[cardId]?.gradingCompany || 'PSA',
      grade: priceData.grade || userPrices[cardId]?.grade || '10',
      notes: priceData.notes || '',
      updatedAt: new Date().toISOString(),
    };

    const nextUserPrices = {
      ...userPrices,
      [cardId]: updatedRecord,
    };

    saveLocalUserPrices(nextUserPrices);
    set({ userPrices: nextUserPrices });

    if (uid && db) {
      try {
        const priceDocRef = doc(db, 'users', uid, 'custom_prices', cardId);
        await setDoc(priceDocRef, updatedRecord, { merge: true });
      } catch (cloudErr) {
        console.warn('Failed to sync user price to cloud:', cloudErr);
      }
    }
  },

  deleteUserPrice: async (cardId, uid) => {
    const { userPrices } = get();
    const next = { ...userPrices };
    delete next[cardId];

    saveLocalUserPrices(next);
    set({ userPrices: next });

    if (uid && db) {
      try {
        const priceDocRef = doc(db, 'users', uid, 'custom_prices', cardId);
        await deleteDoc(priceDocRef);
      } catch (err) {
        console.warn('Failed to remove user price in cloud:', err);
      }
    }
  },

  adminUpdateMarketPrice: async (cardId, prices) => {
    const { marketPrices } = get();
    const existing = marketPrices[cardId] || {
      cardId,
      regular: null,
      foil: null,
      psa10: null,
      lastSold: null,
      lastSoldDate: null,
      recentSales: [],
      updatedAt: new Date().toISOString(),
    };

    const updated: MarketPrice = {
      ...existing,
      regular: prices.regular !== undefined ? prices.regular : existing.regular,
      foil: prices.foil !== undefined ? prices.foil : existing.foil,
      psa10: prices.psa10 !== undefined ? prices.psa10 : existing.psa10,
      lastSold: prices.lastSold !== undefined ? prices.lastSold : existing.lastSold,
      lastSoldDate: prices.lastSoldDate !== undefined ? prices.lastSoldDate : existing.lastSoldDate,
      updatedAt: new Date().toISOString(),
      source: 'admin_manual',
    };

    const next = { ...marketPrices, [cardId]: updated };
    set({ marketPrices: next });

    if (db) {
      try {
        const ref = doc(db, 'market_prices', cardId);
        const cleanPayload = JSON.parse(JSON.stringify(updated));
        await setDoc(ref, cleanPayload, { merge: true });
      } catch (err) {
        console.warn('Admin market price Firestore save skipped/failed:', err);
      }
    }
  },

  logCardSaleTransaction: async (cardId, sale) => {
    const { marketPrices } = get();
    const existing = marketPrices[cardId] || {
      cardId,
      regular: null,
      foil: null,
      psa10: null,
      lastSold: null,
      lastSoldDate: null,
      recentSales: [],
      updatedAt: new Date().toISOString(),
    };

    const newTransaction: CardSaleTransaction = {
      id: `sale_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      date: sale.date || new Date().toISOString().split('T')[0],
      price: sale.price,
      condition: sale.condition,
      source: sale.source,
      notes: sale.notes || '',
    };

    const existingSales = Array.isArray(existing.recentSales) ? existing.recentSales : [];
    const updatedSales = [newTransaction, ...existingSales].slice(0, 20);

    const updated: MarketPrice = {
      ...existing,
      lastSold: sale.price,
      lastSoldDate: newTransaction.date,
      recentSales: updatedSales,
      updatedAt: new Date().toISOString(),
    };

    const next = { ...marketPrices, [cardId]: updated };
    set({ marketPrices: next });

    if (db) {
      try {
        const ref = doc(db, 'market_prices', cardId);
        // Only write authorized sale transaction fields so rule validation passes (R4)
        const salePayload = {
          cardId,
          lastSold: sale.price,
          lastSoldDate: newTransaction.date,
          recentSales: updatedSales,
          updatedAt: new Date().toISOString(),
        };
        await setDoc(ref, salePayload, { merge: true });
      } catch (err) {
        console.warn('Firestore logCardSaleTransaction skipped/failed:', err);
      }
    }
  },

  fetchCardLivePrice: async (query) => {
    const { apiKey, marketPrices } = get();
    const livePrice = await fetchPokemonCardPrice(query, apiKey || undefined);
    if (livePrice) {
      const isThaiCard = query.cardId.startsWith('TH-');
      const thaiPrice: MarketPrice = isThaiCard
        ? {
            ...livePrice,
            cardId: query.cardId,
            regular: livePrice.regular != null ? Math.round((livePrice.regular / 3) * 100) / 100 : null,
            foil: livePrice.foil != null ? Math.round((livePrice.foil / 3) * 100) / 100 : null,
            psa10: livePrice.psa10 != null ? Math.round((livePrice.psa10 / 3) * 100) / 100 : null,
            lastSold: livePrice.lastSold != null ? Math.round((livePrice.lastSold / 3) * 100) / 100 : null,
            isThaiEstimated: true,
            enReference: {
              regular: livePrice.regular,
              foil: livePrice.foil,
            },
          }
        : livePrice;

      const next = {
        ...marketPrices,
        [query.cardId]: thaiPrice,
      };
      // If query was for a Thai card, also index by its mapped EN ID if available
      const mapping = getEnglishMatchForThaiCard(query.cardId);
      if (mapping?.enCardId) {
        next[mapping.enCardId] = livePrice;
        next[mapping.enCardId.replace(/^EN-/, '')] = livePrice;
      }
      set({ marketPrices: next });
      return thaiPrice;
    }
    return null;
  },

  formatPrice: (usdAmount, targetCurrency) => {
    if (usdAmount === null || usdAmount === undefined || isNaN(usdAmount)) return '—';
    const curr = targetCurrency || get().currency;
    const rate = get().exchangeRates[curr] ?? 1.0;
    const converted = usdAmount * rate;
    const symbol = CURRENCY_SYMBOLS[curr] || '$';
    const decimals = curr === 'JPY' ? 0 : 2;

    return `${symbol}${converted.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;
  },

  formatRawCurrency: (amount, currency) => {
    if (amount === null || amount === undefined || isNaN(amount)) return '—';
    const symbol = CURRENCY_SYMBOLS[currency] || '$';
    const decimals = currency === 'JPY' ? 0 : 2;

    return `${symbol}${amount.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;
  },

  getCardMarketPrice: (cardId, enName, options) => {
    const { marketPrices } = get();
    if (!cardId) return undefined;

    const forceEnglish = !!options?.forceEnglishPrice;
    const isExplicitThaiCard = cardId.startsWith('TH-');
    const treatAsEnglish = forceEnglish || !isExplicitThaiCard;

    // Helper to extract clean raw English price
    const unwrapEnglish = (price: MarketPrice): MarketPrice => {
      if (price.isThaiEstimated && price.enReference) {
        return {
          ...price,
          cardId,
          regular: price.enReference.regular,
          foil: price.enReference.foil,
          psa10: price.enReference.regular ? Math.round(price.enReference.regular * 2.8 * 100) / 100 : null,
          lastSold: price.enReference.foil ?? price.enReference.regular,
          isThaiEstimated: false,
          enReference: undefined,
        };
      }
      return {
        ...price,
        isThaiEstimated: false,
      };
    };

    // 1. Direct cardId match
    if (marketPrices[cardId]) {
      const match = marketPrices[cardId];
      if (treatAsEnglish) {
        return unwrapEnglish(match);
      }
      return match;
    }

    // 2. EN prefix variations
    if (cardId.startsWith('EN-')) {
      const raw = cardId.slice(3);
      if (marketPrices[raw]) return unwrapEnglish(marketPrices[raw]);
    } else if (!isExplicitThaiCard) {
      const prefixed = `EN-${cardId}`;
      if (marketPrices[prefixed]) return unwrapEnglish(marketPrices[prefixed]);
    }

    // 3. For Thai cards: lookup mapped English card
    if (isExplicitThaiCard) {
      const mapping = getEnglishMatchForThaiCard(cardId);
      if (mapping) {
        const match =
          (mapping.enCardId && marketPrices[mapping.enCardId]) ||
          (mapping.enCardId && marketPrices[mapping.enCardId.replace(/^EN-/, '')]);

        if (match) {
          if (treatAsEnglish) {
            return unwrapEnglish(match);
          }

          const rawRegular = match.enReference?.regular ?? match.regular;
          const rawFoil = match.enReference?.foil ?? match.foil;
          return {
            ...match,
            cardId,
            enName: mapping.enName || match.enName,
            regular: rawRegular != null ? Math.round((rawRegular / 3) * 100) / 100 : null,
            foil: rawFoil != null ? Math.round((rawFoil / 3) * 100) / 100 : null,
            psa10: match.psa10 != null ? Math.round((match.psa10 / 3) * 100) / 100 : null,
            lastSold: match.lastSold != null ? Math.round((match.lastSold / 3) * 100) / 100 : null,
            isThaiEstimated: true,
            enReference: {
              regular: rawRegular,
              foil: rawFoil,
            },
          };
        }
      }
    }

    // 4. Fallback to enName for non-Thai cards
    if (!isExplicitThaiCard && enName && marketPrices[enName]) {
      const match = marketPrices[enName];
      if (treatAsEnglish) {
        return unwrapEnglish(match);
      }
      return match;
    }

    return undefined;
  },

  getCardUserPrice: (cardId) => {
    return get().userPrices[cardId];
  },

  calculateCardTotalValue: (cardId, normalCount = 0, foilCount = 0, enName) => {
    const { currency, exchangeRates } = get();
    const market = get().getCardMarketPrice(cardId, enName);
    const user = get().getCardUserPrice(cardId);

    const regPrice = market?.regular ?? 0;
    const foilPrice = market?.foil ?? (market?.regular ?? 0);
    const totalMarketUSD = normalCount * regPrice + foilCount * foilPrice;

    const rate = exchangeRates[currency] ?? 1.0;
    const marketConverted = totalMarketUSD * rate;

    // User cost calculation
    let userCostConverted = 0;
    if (user?.costPrice) {
      const userRate = exchangeRates[user.currency] ?? 1.0;
      const costUsd = user.costPrice / userRate;
      userCostConverted = (normalCount + foilCount) * costUsd * rate;
    }

    // User valuation calculation
    let userValuationConverted = 0;
    if (user?.sellPrice) {
      const userRate = exchangeRates[user.currency] ?? 1.0;
      const sellUsd = user.sellPrice / userRate;
      userValuationConverted = (normalCount + foilCount) * sellUsd * rate;
    } else {
      userValuationConverted = marketConverted;
    }

    return {
      marketValueUSD: totalMarketUSD,
      marketValueConverted: marketConverted,
      userCostConverted,
      userValuationConverted,
      currency,
    };
  },

  calculateDeckTotalValue: (cards) => {
    const { currency, exchangeRates } = get();
    const rate = exchangeRates[currency] ?? 1.0;

    let totalMarketUSD = 0;
    let totalUserCostConverted = 0;
    let totalUserValuationConverted = 0;

    for (const card of cards) {
      const count = card.count || 1;
      const isFoil = card.isFoil ?? false;
      const normalCount = isFoil ? 0 : count;
      const foilCount = isFoil ? count : 0;

      const summary = get().calculateCardTotalValue(card.cardId, normalCount, foilCount, card.enName);
      totalMarketUSD += summary.marketValueUSD;
      totalUserCostConverted += summary.userCostConverted;
      totalUserValuationConverted += summary.userValuationConverted;
    }

    return {
      marketValueUSD: totalMarketUSD,
      marketValueConverted: totalMarketUSD * rate,
      userCostConverted: totalUserCostConverted,
      userValuationConverted: totalUserValuationConverted,
      currency,
    };
  },
}));

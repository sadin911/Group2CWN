import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePricingStore } from './pricingStore';

vi.mock('firebase/firestore', () => ({
  doc: (...segments: unknown[]) => ({ path: segments.slice(1).join('/') }),
  collection: (...segments: unknown[]) => ({ path: segments.slice(1).join('/') }),
  setDoc: vi.fn(async () => undefined),
  getDocs: vi.fn(async () => ({ empty: true, forEach: () => {} })),
  deleteDoc: vi.fn(async () => undefined),
}));

vi.mock('../utils/firebase', () => ({
  db: {},
  auth: { currentUser: null },
}));

describe('pricingStore', () => {
  beforeEach(() => {
    // Reset store state
    usePricingStore.setState({
      marketPrices: {
        'Charizard ex': {
          cardId: 'Charizard ex',
          enName: 'Charizard ex',
          regular: 5.0,
          foil: 8.0,
          updatedAt: '2026-09-08T00:00:00.000Z',
        },
        'SV8a-025': {
          cardId: 'SV8a-025',
          enName: 'Charizard ex',
          regular: 5.0,
          foil: 8.0,
          updatedAt: '2026-09-08T00:00:00.000Z',
        },
      },
      userPrices: {},
      currency: 'THB',
      exchangeRates: {
        USD: 1.0,
        THB: 35.0,
        EUR: 0.92,
        GBP: 0.78,
        JPY: 150.0,
      },
      loading: false,
      marketLoaded: true,
      error: null,
    });
  });

  it('formats prices correctly in default currency (THB) and USD', () => {
    const { formatPrice, formatRawCurrency } = usePricingStore.getState();

    // 5.0 USD * 35.0 THB = 175.00 THB
    expect(formatPrice(5.0, 'THB')).toBe('฿175.00');
    expect(formatPrice(5.0, 'USD')).toBe('$5.00');
    expect(formatPrice(null)).toBe('—');

    // JPY has no decimals
    expect(formatPrice(5.0, 'JPY')).toBe('¥750');

    // Raw currency format
    expect(formatRawCurrency(200, 'THB')).toBe('฿200.00');
    expect(formatRawCurrency(500, 'JPY')).toBe('¥500');
  });

  it('updates preferred currency and custom exchange rate', () => {
    const { setCurrency, setExchangeRate } = usePricingStore.getState();

    setCurrency('USD');
    expect(usePricingStore.getState().currency).toBe('USD');

    setExchangeRate('THB', 36.5);
    expect(usePricingStore.getState().exchangeRates.THB).toBe(36.5);
  });

  it('manages user custom prices (cost and sell valuation)', async () => {
    const { setUserPrice, deleteUserPrice, getCardUserPrice } = usePricingStore.getState();

    await setUserPrice('SV8a-025', {
      costPrice: 120,
      sellPrice: 180,
      currency: 'THB',
      notes: 'Bought from locals',
    });

    const userPrice = getCardUserPrice('SV8a-025');
    expect(userPrice).toBeDefined();
    expect(userPrice?.costPrice).toBe(120);
    expect(userPrice?.sellPrice).toBe(180);
    expect(userPrice?.currency).toBe('THB');

    await deleteUserPrice('SV8a-025');
    expect(getCardUserPrice('SV8a-025')).toBeUndefined();
  });

  it('calculates card total value correctly with normal and foil counts', () => {
    const { calculateCardTotalValue } = usePricingStore.getState();

    // 2 normal ($5 each) + 1 foil ($8) = $18 total USD
    // $18 * 35.0 = 630 THB
    const value = calculateCardTotalValue('SV8a-025', 2, 1);
    expect(value.marketValueUSD).toBe(18.0);
    expect(value.marketValueConverted).toBe(630.0);
    expect(value.currency).toBe('THB');
  });

  it('calculates deck total value for multiple cards', () => {
    const { calculateDeckTotalValue } = usePricingStore.getState();

    // 3 Charizard ex (regular, $5 each = $15)
    // 1 Charizard ex (foil, $8 = $8)
    // Total $23 USD = 805 THB
    const deckCards = [
      { cardId: 'SV8a-025', count: 3, isFoil: false },
      { cardId: 'SV8a-025', count: 1, isFoil: true },
    ];

    const deckValue = calculateDeckTotalValue(deckCards);
    expect(deckValue.marketValueUSD).toBe(23.0);
    expect(deckValue.marketValueConverted).toBe(805.0);
  });

  it('logs card sale transaction and updates lastSold and recentSales', async () => {
    const { logCardSaleTransaction, getCardMarketPrice } = usePricingStore.getState();

    await logCardSaleTransaction('SV8a-025', {
      price: 25.0,
      date: '2026-09-08',
      condition: 'PSA 10',
      source: 'eBay',
      notes: 'Sold on eBay auction',
    });

    const market = getCardMarketPrice('SV8a-025');
    expect(market?.lastSold).toBe(25.0);
    expect(market?.lastSoldDate).toBe('2026-09-08');
    expect(market?.recentSales).toHaveLength(1);
    expect(market?.recentSales?.[0].condition).toBe('PSA 10');
    expect(market?.recentSales?.[0].source).toBe('eBay');
  }, 15000);

  it('allows admin update of PSA 10 and last sold prices', async () => {
    const { adminUpdateMarketPrice, getCardMarketPrice } = usePricingStore.getState();

    await adminUpdateMarketPrice('SV8a-025', {
      psa10: 45.0,
      lastSold: 42.0,
      lastSoldDate: '2026-09-07',
    });

    const market = getCardMarketPrice('SV8a-025');
    expect(market?.psa10).toBe(45.0);
    expect(market?.lastSold).toBe(42.0);
    expect(market?.lastSoldDate).toBe('2026-09-07');
  }, 15000);

  it('calculates Thai card estimated price as 1/3 of English counterpart price', () => {
    // Setup an English card price in marketPrices
    usePricingStore.setState((prev) => ({
      marketPrices: {
        ...prev.marketPrices,
        'EN-swsh2-4': {
          cardId: 'swsh2-4',
          enName: 'Scyther',
          regular: 9.0, // $9.00 USD
          foil: 15.0,  // $15.00 USD
          updatedAt: '2026-09-08T00:00:00.000Z',
        },
      },
    }));

    const { getCardMarketPrice, formatPrice } = usePricingStore.getState();

    // TH-1 maps to EN-swsh2-4 in thaiEnglishCardMap.json
    const thaiPrice = getCardMarketPrice('TH-1');
    expect(thaiPrice).toBeDefined();
    // 9.0 / 3 = 3.0 USD
    expect(thaiPrice?.regular).toBe(3.0);
    // 15.0 / 3 = 5.0 USD
    expect(thaiPrice?.foil).toBe(5.0);
    expect(thaiPrice?.isThaiEstimated).toBe(true);
    expect(thaiPrice?.enReference?.regular).toBe(9.0);
    expect(thaiPrice?.enReference?.foil).toBe(15.0);

    // Format in THB: 3.0 USD * 35 = 105.00 THB
    expect(formatPrice(thaiPrice?.regular, 'THB')).toBe('฿105.00');

    // Direct English card lookup must return full 100% EN price (NOT 1/3)
    const enPrice = getCardMarketPrice('EN-swsh2-4');
    expect(enPrice).toBeDefined();
    expect(enPrice?.regular).toBe(9.0);
    expect(enPrice?.foil).toBe(15.0);
    expect(enPrice?.isThaiEstimated).toBeFalsy();

    // When viewing English card in modal, forceEnglishPrice returns full EN price
    const enViewPrice = getCardMarketPrice('TH-1', undefined, { forceEnglishPrice: true });
    expect(enViewPrice).toBeDefined();
    expect(enViewPrice?.regular).toBe(9.0);
    expect(enViewPrice?.foil).toBe(15.0);
    expect(enViewPrice?.isThaiEstimated).toBeFalsy();
  });
});

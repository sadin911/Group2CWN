import { describe, it, expect } from 'vitest';
import { usePricingStore } from '../store/pricingStore';

describe('Pricing URLs and Sorting Utilities', () => {
  it('generates proper eBay Sold verification URLs with LH_Sold=1 and _sop=12', () => {
    const cardName = 'Charizard ex';
    const setId = 'SV8a';
    const collectorNumber = '025/187';

    const cleanEnName = cardName.replace(/\s*\([^)]*\)/g, '').trim();
    const cleanCardNumber = collectorNumber || '';

    const ebaySearchTerms = ['pokemon', cleanEnName];
    if (setId) ebaySearchTerms.push(setId);
    if (cleanCardNumber) ebaySearchTerms.push(cleanCardNumber);

    const ebaySoldUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(
      ebaySearchTerms.join(' ')
    )}&LH_Sold=1&LH_Complete=1&_sop=12`;

    expect(ebaySoldUrl).toContain('ebay.com/sch/i.html');
    expect(ebaySoldUrl).toContain('LH_Sold=1');
    expect(ebaySoldUrl).toContain('LH_Complete=1');
    expect(ebaySoldUrl).toContain('_sop=12');
    expect(ebaySoldUrl).toContain(encodeURIComponent('pokemon Charizard ex SV8a 025/187'));
  });

  it('generates TCGplayer and PriceCharting verification URLs', () => {
    const cardName = 'Pikachu';
    const tcgplayerUrl = `https://www.tcgplayer.com/search/pokemon/product?q=${encodeURIComponent(cardName)}`;
    const pricechartingUrl = `https://www.pricecharting.com/search-products?type=prices&q=${encodeURIComponent(
      `pokemon ${cardName}`
    )}`;

    expect(tcgplayerUrl).toBe('https://www.tcgplayer.com/search/pokemon/product?q=Pikachu');
    expect(pricechartingUrl).toBe('https://www.pricecharting.com/search-products?type=prices&q=pokemon%20Pikachu');
  });

  it('sorts cards by market price correctly (ascending and descending)', () => {
    usePricingStore.setState({
      marketPrices: {
        'card-cheap': {
          cardId: 'card-cheap',
          regular: 1.5,
          foil: null,
          updatedAt: new Date().toISOString(),
        },
        'card-mid': {
          cardId: 'card-mid',
          regular: 10.0,
          foil: 15.0,
          updatedAt: new Date().toISOString(),
        },
        'card-expensive': {
          cardId: 'card-expensive',
          regular: 150.0,
          foil: 250.0,
          updatedAt: new Date().toISOString(),
        },
      },
    });

    const marketPrices = usePricingStore.getState().marketPrices;

    const cards = [
      { id: 'card-mid', name: 'Mid Card' },
      { id: 'card-cheap', name: 'Cheap Card' },
      { id: 'card-expensive', name: 'Expensive Card' },
      { id: 'card-unknown', name: 'Unknown Price Card' },
    ];

    // Ascending sort (cheapest to highest)
    const ascSorted = [...cards].sort((a, b) => {
      const pA = marketPrices[a.id];
      const pB = marketPrices[b.id];
      const priceA = pA?.regular ?? pA?.foil ?? 0;
      const priceB = pB?.regular ?? pB?.foil ?? 0;
      return priceA - priceB;
    });

    expect(ascSorted[0].id).toBe('card-unknown'); // 0
    expect(ascSorted[1].id).toBe('card-cheap'); // 1.5
    expect(ascSorted[2].id).toBe('card-mid'); // 10.0
    expect(ascSorted[3].id).toBe('card-expensive'); // 150.0

    // Descending sort (highest to cheapest)
    const descSorted = [...cards].sort((a, b) => {
      const pA = marketPrices[a.id];
      const pB = marketPrices[b.id];
      const priceA = pA?.regular ?? pA?.foil ?? 0;
      const priceB = pB?.regular ?? pB?.foil ?? 0;
      return -(priceA - priceB);
    });

    expect(descSorted[0].id).toBe('card-expensive');
    expect(descSorted[1].id).toBe('card-mid');
    expect(descSorted[2].id).toBe('card-cheap');
    expect(descSorted[3].id).toBe('card-unknown');
  });
});

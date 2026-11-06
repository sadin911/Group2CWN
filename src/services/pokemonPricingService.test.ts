import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchPokemonCardPrice,
  clearPokemonPriceCache,
} from './pokemonPricingService';

describe('pokemonPricingService', () => {
  beforeEach(() => {
    clearPokemonPriceCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches card price from pokemontcg.io successfully and extracts TCGPlayer prices', async () => {
    const mockApiResponse = {
      data: [
        {
          id: 'obf-125',
          name: 'Charizard ex',
          tcgplayer: {
            url: 'https://www.tcgplayer.com/product/509932',
            updatedAt: '2026/09/07',
            prices: {
              holofoil: {
                low: 4.5,
                mid: 5.99,
                high: 12.0,
                market: 5.49,
                directLow: 5.0,
              },
            },
          },
        },
      ],
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse,
    } as unknown as Response);

    const price = await fetchPokemonCardPrice({
      cardId: 'SV8a-025',
      enName: 'Charizard ex',
      setCode: 'OBF',
      number: '125',
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(price).not.toBeNull();
    expect(price?.cardId).toBe('SV8a-025');
    expect(price?.enName).toBe('Charizard ex');
    expect(price?.regular).toBe(5.49);
    expect(price?.foil).toBe(5.49);
    expect(['pokemontcg_io', 'tcgplayer']).toContain(price?.source);
    expect(price?.url).toContain('tcgplayer.com');
  });

  it('falls back to Cardmarket when TCGPlayer prices are missing', async () => {
    const mockApiResponse = {
      data: [
        {
          id: 'me1-1',
          name: 'Bulbasaur',
          tcgplayer: {
            prices: {}, // Empty TCGplayer
          },
          cardmarket: {
            url: 'https://www.cardmarket.com/en/Pokemon/Products/Singles/151/Bulbasaur',
            prices: {
              trendPrice: 2.5,
              reverseHoloTrend: 4.0,
            },
          },
        },
      ],
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse,
    } as unknown as Response);

    const price = await fetchPokemonCardPrice({
      cardId: 'TH-001',
      enName: 'Bulbasaur',
    });

    expect(price).not.toBeNull();
    expect(price?.source).toBe('cardmarket');
    expect(price?.sourceLabel).toBe('Cardmarket (EU)');
    // 2.5 EUR * 1.087 ≈ 2.72 USD
    expect(price?.regular).toBe(2.72);
    // 4.0 EUR * 1.087 ≈ 4.35 USD
    expect(price?.foil).toBe(4.35);
  });

  it('falls back to TCGdex API when pokemontcg.io has no card data', async () => {
    // 1st fetch: pokemontcg.io returns empty
    const pokemontcgMock = { ok: true, json: async () => ({ data: [] }) };
    // 2nd fetch: TCGdex search returns list
    const tcgdexSearchMock = {
      ok: true,
      json: async () => [{ id: 'fut2020-1', localId: '1', name: 'Pikachu on the Ball' }],
    };
    // 3rd fetch: TCGdex card details with Cardmarket pricing
    const tcgdexDetailMock = {
      ok: true,
      json: async () => ({
        id: 'fut2020-1',
        name: 'Pikachu on the Ball',
        pricing: {
          cardmarket: {
            trend: 163.7,
            'trend-holo': 180.0,
          },
        },
      }),
    };

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(pokemontcgMock as unknown as Response)
      .mockResolvedValueOnce(tcgdexSearchMock as unknown as Response)
      .mockResolvedValueOnce(tcgdexDetailMock as unknown as Response);

    const price = await fetchPokemonCardPrice({
      cardId: 'PROMO-001',
      enName: 'Pikachu on the Ball',
    });

    expect(price).not.toBeNull();
    expect(price?.source).toBe('tcgdex');
    expect(price?.sourceLabel).toBe('TCGdex / Cardmarket');
    expect(price?.regular).toBeGreaterThan(100);
  });

  it('uses memory cache on subsequent calls without making extra fetch', async () => {
    const mockApiResponse = {
      data: [
        {
          id: 'sv1-185',
          name: 'Iono',
          tcgplayer: {
            prices: {
              normal: { market: 0.45 },
              holofoil: { market: 1.99 },
            },
          },
        },
      ],
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse,
    } as unknown as Response);

    const first = await fetchPokemonCardPrice({
      cardId: 'SV1-185',
      enName: 'Iono',
    });
    expect(first?.regular).toBe(0.45);
    expect(first?.foil).toBe(1.99);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Call again - should hit cache
    const second = await fetchPokemonCardPrice({
      cardId: 'SV1-185',
      enName: 'Iono',
    });
    expect(second?.regular).toBe(0.45);
    expect(fetchSpy).toHaveBeenCalledTimes(1); // No new network call
  });

  it('handles fetch error gracefully and returns null', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    const price = await fetchPokemonCardPrice({
      cardId: 'UNKNOWN',
      enName: 'NonExistentPokemon12345',
    });

    expect(price).toBeNull();
  });
});

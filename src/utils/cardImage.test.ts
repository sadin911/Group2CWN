import { describe, it, expect } from 'vitest';
import { resolveCardImageUrl, handleCardImageError, R2_CDN_BASE, DEFAULT_CARD_PLACEHOLDER } from './cardImage';

describe('cardImage utility suite', () => {
  it('resolves English card relative path to Cloudflare R2 standard webp', () => {
    const url = resolveCardImageUrl('card-images-en/sv8/1.webp');
    expect(url).toBe(`${R2_CDN_BASE}/card-images-en/sv8/1.webp`);
  });

  it('resolves English card relative path to Cloudflare R2 HD jpg when hd is true', () => {
    const url = resolveCardImageUrl('card-images-en/sv8/1.webp', true);
    expect(url).toBe(`${R2_CDN_BASE}/card-images-en-hd/sv8/1.jpg`);
  });

  it('upgrades full R2 English URL to HD jpg when hd is true', () => {
    const fullUrl = `${R2_CDN_BASE}/card-images-en/sv8/1.webp`;
    const url = resolveCardImageUrl(fullUrl, true);
    expect(url).toBe(`${R2_CDN_BASE}/card-images-en-hd/sv8/1.jpg`);
  });

  it('preserves external global CDN image URLs unchanged', () => {
    const externalUrl = 'https://images.pokemontcg.io/sv1/1.png';
    const url = resolveCardImageUrl(externalUrl);
    expect(url).toBe('https://images.pokemontcg.io/sv1/1.png');
  });

  it('resolves image URL directly from a CardInstance-like object', () => {
    const cardObj = {
      instanceId: 'test-123',
      imageUrl: 'https://images.pokemontcg.io/sv1/1.png',
      nameTh: 'พิคาชู',
    };
    const url = resolveCardImageUrl(cardObj);
    expect(url).toBe('https://images.pokemontcg.io/sv1/1.png');
  });

  describe('handleCardImageError multi-tier fallback', () => {
    const createMockImgEvent = (initialSrc: string) => {
      const img = {
        src: initialSrc,
        dataset: {} as Record<string, string>,
      };
      return {
        currentTarget: img as unknown as HTMLImageElement,
      } as React.SyntheticEvent<HTMLImageElement>;
    };

    it('falls back from local dev 404 to Cloudflare R2 CDN when passing card object', () => {
      const e = createMockImgEvent('http://localhost:5173/card-images/MA6/128-130_%E0%B9%84%E0%B8%AE%E0%B9%80%E0%B8%9B%E0%B8%AD%E0%B8%A3%E0%B9%8C%E0%B8%9A%E0%B8%AD%E0%B8%A5.webp');
      const card = {
        imageUrl: '/PokeCountTracker/card-images/MA6/128-130_%E0%B9%84%E0%B8%AE%E0%B9%80%E0%B8%9B%E0%B8%AD%E0%B8%A3%E0%B9%8C%E0%B8%9A%E0%B8%AD%E0%B8%A5.webp',
        officialImageUrl: 'https://asia.pokemon-card.com/th/card-img/th00014847.png',
      };

      handleCardImageError(e, card);
      expect(e.currentTarget.src).toBe(
        encodeURI(decodeURI(`${R2_CDN_BASE}/card-images/MA6/128-130_%E0%B9%84%E0%B8%AE%E0%B9%80%E0%B8%9B%E0%B8%AD%E0%B8%A3%E0%B9%8C%E0%B8%9A%E0%B8%AD%E0%B8%A5.webp`))
      );
    });

    it('retries CDN URLs up to 2 times with cache-busting parameter before falling back', () => {
      const initialSrc = encodeURI(decodeURI(`${R2_CDN_BASE}/card-images/MA6/128-130_ไฮเปอร์บอล.webp`));
      const e = createMockImgEvent(initialSrc);
      const card = {
        nameTh: 'ไฮเปอร์บอล',
        imageUrl: '/card-images/MA6/128-130_ไฮเปอร์บอล.webp',
        officialImageUrl: 'https://asia.pokemon-card.com/th/card-img/th00014847.png',
      };

      // 1st error: retry 1 with ?r=1
      handleCardImageError(e, card);
      expect(e.currentTarget.dataset.retryCount).toBe('1');
      expect(e.currentTarget.src).toBe(`${initialSrc}?r=1`);

      // 2nd error: retry 2 with ?r=2
      handleCardImageError(e, card);
      expect(e.currentTarget.dataset.retryCount).toBe('2');
      expect(e.currentTarget.src).toBe(`${initialSrc}?r=2`);

      // 3rd error: retries exhausted -> falls back to Asia Official CDN
      handleCardImageError(e, card);
      expect(e.currentTarget.src).toBe('https://asia.pokemon-card.com/th/card-img/th00014847.png');
    });

    it('falls back to standard SCE basic energy if a set-specific basic energy fails on R2 after retries', () => {
      const initialSrc = encodeURI(decodeURI(`${R2_CDN_BASE}/card-images/MA6/FIR_พลังงานพื้นฐาน[ไฟ].webp`));
      const e = createMockImgEvent(initialSrc);
      e.currentTarget.dataset.retryCount = '2'; // simulate exhausted retries
      const card = {
        nameTh: 'พลังงานพื้นฐาน[ไฟ]',
        imageUrl: '/PokeCountTracker/card-images/MA6/FIR_%E0%B8%9E%E0%B8%A5%E0%B8%B1%E0%B8%87%E0%B8%87%E0%B8%B2%E0%B8%99%E0%B8%9E%E0%B8%B7%E0%B9%89%E0%B8%99%E0%B8%90%E0%B8%B2%E0%B8%99%5B%E0%B9%84%E0%B8%9F%5D.webp',
        officialImageUrl: 'https://asia.pokemon-card.com/th/card-img/th00014912.png',
      };

      handleCardImageError(e, card);
      expect(e.currentTarget.src).toBe(
        encodeURI(decodeURI(`${R2_CDN_BASE}/card-images/SCE/FIR_พลังงานพื้นฐาน_[ไฟ].webp`))
      );
    });

    it('falls back to Asia Official CDN when R2 and energy fallbacks are exhausted', () => {
      const initialSrc = encodeURI(decodeURI(`${R2_CDN_BASE}/card-images/MA6/128-130_ไฮเปอร์บอล.webp`));
      const e = createMockImgEvent(initialSrc);
      e.currentTarget.dataset.retryCount = '2'; // simulate exhausted retries
      const card = {
        nameTh: 'ไฮเปอร์บอล',
        imageUrl: '/card-images/MA6/128-130_ไฮเปอร์บอล.webp',
        officialImageUrl: 'https://asia.pokemon-card.com/th/card-img/th00014847.png',
      };

      handleCardImageError(e, card);
      expect(e.currentTarget.src).toBe('https://asia.pokemon-card.com/th/card-img/th00014847.png');
    });

    it('falls back to DEFAULT_CARD_PLACEHOLDER and stops infinite loop when placeholder fails', () => {
      const e = createMockImgEvent('https://asia.pokemon-card.com/th/card-img/th00014847.png');
      e.currentTarget.dataset.retryCount = '2'; // simulate exhausted retries
      const card = {
        imageUrl: '/card-images/SC1a/155-154_missing.webp',
      };

      handleCardImageError(e, card);
      expect(e.currentTarget.src).toBe(DEFAULT_CARD_PLACEHOLDER);
      expect(e.currentTarget.dataset.finalError).toBe('true');

      // Subsequent error on placeholder does nothing
      handleCardImageError(e, card);
      expect(e.currentTarget.src).toBe(DEFAULT_CARD_PLACEHOLDER);
    });
  });
});


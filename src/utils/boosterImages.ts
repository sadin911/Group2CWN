import boosterMapData from '../data/setBoosterImages.json';
import { R2_CDN_BASE } from './cardImage';

const boosterMap: Record<string, string> = boosterMapData;

/**
 * Resolves a set's booster pack cover image to its best URL.
 * - In Production (GitHub Pages / Custom Domain): points to Cloudflare R2 CDN (`${R2_CDN_BASE}/set-boosters/${setId}.webp`).
 * - In Local Dev: uses local asset path for instant offline loading.
 */
export function getSetBoosterImage(setId?: string): string | null {
  if (!setId) return null;
  const clean = setId.trim();
  const found = boosterMap[clean] || boosterMap[clean.toUpperCase()] || boosterMap[clean.toLowerCase()];
  if (!found) return null;

  const filename = found.replace(/^\/?set-boosters\//, '').replace(/\.(png|jpg|jpeg|webp)$/, '.webp');
  const relativePath = `set-boosters/${filename}`;

  if (import.meta.env.PROD) {
    return `${R2_CDN_BASE}/${relativePath}`;
  }

  const baseUrl = import.meta.env.BASE_URL || '/';
  return `${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}${relativePath}`;
}

/**
 * Fallback error handler for booster pack image loading.
 * Hierarchy: Cloudflare R2 CDN WebP -> Local /set-boosters/ -> Official Pokémon Asia CDN
 */
export function handleBoosterImageError(
  e: React.SyntheticEvent<HTMLImageElement>,
  setId?: string
) {
  const target = e.currentTarget;
  if (!target || !setId) return;

  const clean = setId.trim();
  const step = Number(target.dataset.retryStep || '0');

  const filename = `${clean}.webp`;
  const r2Url = `${R2_CDN_BASE}/set-boosters/${filename}`;
  const localUrl = `/set-boosters/${filename}`;
  const officialFallback =
    clean.toUpperCase() === 'MA6' || clean.toUpperCase() === 'M6A'
      ? 'https://asia.pokemon-card.com/th/wp-content/uploads/sites/4/2026/05/th_product_thumbnail_m6a_pkg.png'
      : null;

  if (step === 0) {
    target.dataset.retryStep = '1';
    if (target.src !== r2Url) {
      target.src = r2Url;
      return;
    }
  }

  if (step <= 1) {
    target.dataset.retryStep = '2';
    if (target.src !== localUrl) {
      target.src = localUrl;
      return;
    }
  }

  if (step <= 2 && officialFallback) {
    target.dataset.retryStep = '3';
    if (target.src !== officialFallback) {
      target.src = officialFallback;
      return;
    }
  }
}

export const R2_CDN_BASE = 'https://pub-af524b77e8e3403685545bc0a8222090.r2.dev';
export const DEFAULT_CARD_PLACEHOLDER = `${import.meta.env.BASE_URL || '/'}card-placeholder.svg`.replace('//', '/');

/**
 * Resolves a card image path to its best URL.
 * - hd: true -> points to Ultra-HD high-resolution version (.jpg in card-images-hd/...)
 * - hd: false / omitted -> points to lightweight thumbnail (.webp in card-images/...)
 * - In Production (GitHub Pages/Cloudflare): points to Cloudflare R2 CDN.
 * - In Local Dev: uses local asset path for instant offline loading.
 */
export function resolveCardImageUrl(
  pathOrCard?: string | { imageUrl?: string; officialImageUrl?: string; imageUrlHigh?: string; image?: string; [key: string]: any } | null,
  hd: boolean = false
): string {
  if (!pathOrCard) return DEFAULT_CARD_PLACEHOLDER;

  const path =
    typeof pathOrCard === 'string'
      ? pathOrCard
      : pathOrCard.imageUrl || pathOrCard.officialImageUrl || pathOrCard.imageUrlHigh || pathOrCard.image;

  if (!path || typeof path !== 'string') return DEFAULT_CARD_PLACEHOLDER;

  // If path is already a full R2 or external URL
  if (path.startsWith('http://') || path.startsWith('https://')) {
    if (hd && path.includes('/card-images-en/')) {
      return path.replace('/card-images-en/', '/card-images-en-hd/').replace(/\.(webp|png)$/, '.jpg');
    }
    return encodeURI(decodeURI(path));
  }

  let cleanPath = path.replace(/^\/?PokeCountTracker/, '').replace(/^\/+/, '');

  if (hd) {
    if (cleanPath.startsWith('card-images/')) {
      cleanPath = cleanPath
        .replace('card-images/', 'card-images-hd/')
        .replace(/\.(webp|png|jpeg)$/, '.jpg');
    } else if (cleanPath.startsWith('card-images-en/')) {
      cleanPath = cleanPath
        .replace('card-images-en/', 'card-images-en-hd/')
        .replace(/\.(webp|png|jpeg)$/, '.jpg');
    }
  }

  // English images always route to R2 (not bundled in local repo git)
  if (cleanPath.startsWith('card-images-en/') || cleanPath.startsWith('card-images-en-hd/')) {
    return encodeURI(decodeURI(`${R2_CDN_BASE}/${cleanPath}`));
  }

  if (import.meta.env.PROD) {
    return encodeURI(decodeURI(`${R2_CDN_BASE}/${cleanPath}`));
  }

  const baseUrl = import.meta.env.BASE_URL || '/';
  const finalUrl = `${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}${cleanPath}`;
  return encodeURI(decodeURI(finalUrl));
}

/**
 * Fallback error handler for card image loading.
 * Provides unbreakable multi-tier fallbacks:
 * 1. If local asset 404s (e.g. offline dev missing file), falls back to Cloudflare R2 CDN.
 * 2. If HD (.jpg) fails on R2, falls back to standard thumbnail (.webp).
 * 3. If Basic Energy fails, falls back to standard SCE/S8a energy counterparts on R2.
 * 4. If Asia official CDN exists (card.officialImageUrl), tries Asia CDN.
 * 5. If English mapped counterpart exists (card.enFallbackUrl), tries English CDN.
 * 6. Ultimate fallback: Default SVG Card Placeholder (stops infinite loops).
 */
export function handleCardImageError(
  e: React.SyntheticEvent<HTMLImageElement>,
  pathOrCard?: string | { imageUrl?: string; officialImageUrl?: string; imageUrlHigh?: string; image?: string; enFallbackUrl?: string; name?: string; nameTh?: string; [key: string]: any } | null,
  officialImageUrl?: string | null,
  enFallbackUrl?: string | null
) {
  const target = e.currentTarget;
  if (!target) return;

  // Prevent infinite loop if placeholder fails
  if (target.src.includes('card-placeholder.svg')) {
    target.dataset.finalError = 'true';
    return;
  }

  let localPath: string | undefined;
  let cardName = '';

  if (typeof pathOrCard === 'object' && pathOrCard !== null) {
    localPath = pathOrCard.imageUrl || pathOrCard.imageUrlHigh || pathOrCard.image;
    if (!officialImageUrl && pathOrCard.officialImageUrl) {
      officialImageUrl = pathOrCard.officialImageUrl;
    }
    if (!enFallbackUrl && pathOrCard.enFallbackUrl) {
      enFallbackUrl = pathOrCard.enFallbackUrl;
    }
    cardName = pathOrCard.nameTh || pathOrCard.name || '';
  } else if (typeof pathOrCard === 'string') {
    localPath = pathOrCard;
  }

  // If localPath was not provided or empty, attempt to infer relative path from target.src
  if (!localPath && target.src) {
    try {
      const parsedUrl = new URL(target.src, window.location.href);
      const decodedPath = decodeURIComponent(parsedUrl.pathname);
      const match = decodedPath.match(/(?:card-images(?:-hd|-en|-en-hd)?\/[^?#]+)/);
      if (match) {
        localPath = match[0];
      }
    } catch {
      // ignore URL parsing error
    }
  }

  const currentSrc = target.src || '';
  const decodedCurrentSrc = decodeURIComponent(currentSrc);
  const cleanPath = (localPath || '').replace(/^\/?PokeCountTracker/, '').replace(/^\/+/, '');

  // Helper to append retry cache-buster query parameter
  const appendRetryParam = (url: string, retryNum: number): string => {
    try {
      const parsed = new URL(url);
      parsed.searchParams.set('r', String(retryNum));
      return parsed.toString();
    } catch {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}r=${retryNum}`;
    }
  };

  // Intelligent Retry Mechanism with cache-busting before fallback tier transition.
  // Applies to remote CDN URLs (Cloudflare R2, Asia CDN, etc.) but skips localhost 404s.
  const isCdnUrl = currentSrc.startsWith('http://') || currentSrc.startsWith('https://');
  const isLocalDevAttempt = !currentSrc.startsWith(R2_CDN_BASE) && !currentSrc.startsWith('https://asia.pokemon-card.com') && !currentSrc.startsWith('https://images.pokemontcg.io');

  if (isCdnUrl && !isLocalDevAttempt && target.dataset.noRetry !== 'true') {
    const currentRetry = Number(target.dataset.retryCount || 0);
    const maxRetries = 2;

    if (currentRetry < maxRetries) {
      const nextRetry = currentRetry + 1;
      target.dataset.retryCount = String(nextRetry);
      target.src = appendRetryParam(currentSrc, nextRetry);
      return;
    }
  }

  // Reset retryCount for the next fallback tier
  delete target.dataset.retryCount;

  // 1. English Cards Fallback Pipeline
  if (decodedCurrentSrc.includes('card-images-en') || cleanPath.includes('card-images-en')) {
    // 1.1 If HD version on R2 failed, try standard R2 thumbnail (.webp)
    if (decodedCurrentSrc.includes('card-images-en-hd')) {
      const stdR2Url = encodeURI(decodeURI(currentSrc.replace('card-images-en-hd/', 'card-images-en/').replace(/\.jpg$/, '.webp')));
      if (currentSrc !== stdR2Url) {
        target.src = stdR2Url;
        return;
      }
    }

    // 1.2 Fallback to official Pokemon TCG Global CDN if R2 object is missing
    if (officialImageUrl && currentSrc !== officialImageUrl) {
      target.src = officialImageUrl;
      return;
    }

    // 1.3 Try deriving official pokemontcg.io URL from path if not explicitly provided
    const enMatch = decodedCurrentSrc.match(/card-images-en(?:-hd)?\/([^/]+)\/([^.]+)\.(webp|jpg|png)/);
    if (enMatch) {
      const [, setId, num] = enMatch;
      const fallbackGlobalCdn = `https://images.pokemontcg.io/${setId}/${num}.png`;
      if (currentSrc !== fallbackGlobalCdn) {
        target.src = fallbackGlobalCdn;
        return;
      }
    }

    target.dataset.finalError = 'true';
    target.src = DEFAULT_CARD_PLACEHOLDER;
    return;
  }

  // 2. Thai Cards Fallback Pipeline
  const isHdAttempt = decodedCurrentSrc.includes('card-images-hd') || cleanPath.includes('card-images-hd');

  // 2.1 If local dev attempt failed (404), route directly to Cloudflare R2 CDN
  if (isLocalDevAttempt && cleanPath) {
    const r2Url = isHdAttempt
      ? `${R2_CDN_BASE}/${cleanPath.replace('card-images/', 'card-images-hd/').replace(/\.(webp|png|jpeg)$/, '.jpg')}`
      : `${R2_CDN_BASE}/${cleanPath.replace('card-images-hd/', 'card-images/').replace(/\.jpg$/, '.webp')}`;
    const encodedR2Url = encodeURI(decodeURI(r2Url));
    if (currentSrc !== encodedR2Url) {
      target.src = encodedR2Url;
      return;
    }
  }

  // 2.2 If already on R2 and HD failed, try standard thumbnail on R2 (.webp)
  if (isHdAttempt && cleanPath) {
    const r2StdUrl = encodeURI(decodeURI(`${R2_CDN_BASE}/${cleanPath.replace('card-images-hd/', 'card-images/').replace(/\.jpg$/, '.webp')}`));
    if (currentSrc !== r2StdUrl) {
      target.src = r2StdUrl;
      return;
    }
  }

  // 2.3 Fallback for Basic Energy cards across sets (if current set energy is missing/misnamed)
  const isBasicEnergy =
    decodedCurrentSrc.includes('พลังงานพื้นฐาน') ||
    cleanPath.includes('พลังงานพื้นฐาน') ||
    cardName.includes('พลังงานพื้นฐาน');

  if (isBasicEnergy) {
    const energyMap: Record<string, string> = {
      ไฟ: 'FIR',
      น้ำ: 'WAT',
      หญ้า: 'GRA',
      สายฟ้า: 'LIG',
      พลังจิต: 'PSY',
      ต่อสู้: 'FIG',
      ความมืด: 'DAR',
      โลหะ: 'MET',
    };

    let matchedCode = '';
    let matchedName = '';
    for (const [typeTh, code] of Object.entries(energyMap)) {
      if (
        decodedCurrentSrc.includes(`[${typeTh}]`) ||
        decodedCurrentSrc.includes(`【${typeTh}】`) ||
        cleanPath.includes(`[${typeTh}]`) ||
        cleanPath.includes(`【${typeTh}】`) ||
        cleanPath.includes(`_${typeTh}`) ||
        cardName.includes(typeTh) ||
        cleanPath.includes(`/${code}_`)
      ) {
        matchedCode = code;
        matchedName = typeTh;
        break;
      }
    }

    if (matchedCode && matchedName) {
      // Standard SCE energy cards are 100% available on R2 CDN
      const sceEnergyFallback = encodeURI(
        decodeURI(`${R2_CDN_BASE}/card-images/SCE/${matchedCode}_พลังงานพื้นฐาน_[${matchedName}].webp`)
      );
      if (currentSrc !== sceEnergyFallback) {
        target.src = sceEnergyFallback;
        return;
      }
    }
  }

  // 2.4 Fallback to Official Asia CDN (if valid)
  if (officialImageUrl && currentSrc !== officialImageUrl) {
    target.src = officialImageUrl;
    return;
  }

  // 2.5 Fallback to mapped English counterpart image if available
  if (enFallbackUrl && currentSrc !== enFallbackUrl) {
    target.src = enFallbackUrl;
    return;
  }

  // 2.6 Ultimate Fallback: Default SVG Placeholder Card
  target.dataset.finalError = 'true';
  target.src = DEFAULT_CARD_PLACEHOLDER;
}


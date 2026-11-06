import translations from '../data/pokemonNameTranslations.json';

const pokemonMap: Record<string, string> = translations.pokemon || {};
const trainerMap: Record<string, string> = translations.trainers || {};

// Fast string cleaner with memoization cache for short strings
const cleanCache = new Map<string, string>();
function cleanString(str: string): string {
  if (!str) return '';
  if (cleanCache.has(str)) return cleanCache.get(str)!;

  const res = str
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[-.:_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleanCache.size < 5000) {
    cleanCache.set(str, res);
  }
  return res;
}

// 1. Fast O(1) Hash Map for Translation Lookups
const lookupMap = new Map<string, string>();
const prefixList: { key: string; value: string }[] = [];

for (const [k, v] of Object.entries(pokemonMap)) {
  const cleanKey = cleanString(k);
  lookupMap.set(cleanKey, v);
  prefixList.push({ key: cleanKey, value: v });
}

for (const [k, v] of Object.entries(trainerMap)) {
  const cleanKey = cleanString(k);
  lookupMap.set(cleanKey, v);
  prefixList.push({ key: cleanKey, value: v });
}

// Sort prefixList by key length descending for longest prefix match
prefixList.sort((a, b) => b.key.length - a.key.length);

// Reverse map: Thai Name -> English Name
const thaiToEnPokemonMap: Record<string, string> = {};
for (const [en, th] of Object.entries(pokemonMap)) {
  thaiToEnPokemonMap[th] = en.charAt(0).toUpperCase() + en.slice(1);
}

const thaiToEnTrainerMap: Record<string, string> = {};
for (const [en, th] of Object.entries(trainerMap)) {
  const titleCase = en
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  thaiToEnTrainerMap[th] = titleCase;
}

const SUFFIX_MAP: Record<string, string> = {
  ex: 'ex',
  v: 'v',
  vmax: 'vmax',
  vstar: 'vstar',
  gx: 'gx',
  radiant: 'ส่องประกาย',
  mega: 'เมก้า',
  m: 'เมก้า',
  alolan: 'อโลลา',
  galarian: 'กาลาร์',
  hisuian: 'ฮิซุย',
  paldean: 'พัลเดีย',
  ancient: 'โบราณ',
  future: 'อนาคต',
};

// Card metadata search key cache using WeakMap
const cardSearchKeyCache = new WeakMap<any, string>();
const cardNameCleanCache = new WeakMap<any, string>();

export function getCardSearchKey(card: any): string {
  let key = cardSearchKeyCache.get(card);
  if (key === undefined) {
    key = cleanString(
      `${card.name || ''} ${card.collectorNumber || card.localId || ''} ${card.set?.id || ''} ${card.set?.name || ''}`
    );
    cardSearchKeyCache.set(card, key);
  }
  return key;
}

export function getCardCleanName(card: any): string {
  let name = cardNameCleanCache.get(card);
  if (name === undefined) {
    name = cleanString(card.name || '');
    cardNameCleanCache.set(card, name);
  }
  return name;
}

/**
 * Creates an ultra-fast compiled Card Matcher for a given search query.
 * Translates and normalizes the query ONCE, then performs instant sub-millisecond filtering.
 */
export function createCardMatcher(rawQuery: string): (card: any) => boolean {
  if (!rawQuery || !rawQuery.trim()) {
    return () => true;
  }

  const rawClean = cleanString(rawQuery);
  const rawTokens = rawClean.split(' ').filter(Boolean);
  if (rawTokens.length === 0) {
    return () => true;
  }

  // 1. Compile translated token groups
  const tokenGroups: string[][] = [];
  const mappedTokens: string[] = [];
  let i = 0;

  while (i < rawTokens.length) {
    let matched = false;
    for (let len = Math.min(4, rawTokens.length - i); len >= 1; len--) {
      const phrase = rawTokens.slice(i, i + len).join(' ');
      if (lookupMap.has(phrase)) {
        mappedTokens.push(lookupMap.get(phrase)!);
        i += len;
        matched = true;
        break;
      }
      if (len === 1 && SUFFIX_MAP[phrase]) {
        mappedTokens.push(SUFFIX_MAP[phrase]);
        i += 1;
        matched = true;
        break;
      }
    }
    if (!matched) {
      mappedTokens.push(rawTokens[i]);
      i++;
    }
  }

  if (mappedTokens.length > 0) {
    tokenGroups.push(mappedTokens.map(cleanString));

    // Handle radiant synonym
    if (mappedTokens.includes('ส่องประกาย')) {
      tokenGroups.push(
        mappedTokens.map((t) => (t === 'ส่องประกาย' ? 'เรเดียนต์' : cleanString(t)))
      );
    }
  }

  // Prefix matching for single word (>= 3 chars)
  if (rawTokens.length === 1 && rawClean.length >= 3) {
    for (const { key, value } of prefixList) {
      if (key.startsWith(rawClean)) {
        tokenGroups.push([cleanString(value)]);
      }
    }
  }

  // Return optimized matcher function
  return function matchesCard(card: any): boolean {
    const cardSearchKey = getCardSearchKey(card);

    // 1. Fast direct substring match
    if (cardSearchKey.includes(rawClean)) {
      return true;
    }

    // 2. Token groups match on card name
    const cardName = getCardCleanName(card);
    for (let g = 0; g < tokenGroups.length; g++) {
      const group = tokenGroups[g];
      let allMatch = true;
      for (let t = 0; t < group.length; t++) {
        if (!cardName.includes(group[t])) {
          allMatch = false;
          break;
        }
      }
      if (allMatch) return true;
    }

    return false;
  };
}

// Cached last matcher for direct matchesCardSearch calls
let lastRawQuery = '';
let lastMatcher: (card: any) => boolean = () => true;

/**
 * Direct Card Search Matcher (cached for fast repeated calls)
 */
export function matchesCardSearch(card: any, rawQuery: string): boolean {
  if (rawQuery !== lastRawQuery) {
    lastRawQuery = rawQuery;
    lastMatcher = createCardMatcher(rawQuery);
  }
  return lastMatcher(card);
}

/**
 * Returns English translation / Romanized name for display if available
 */
export function getEnglishCardName(card: any): string | null {
  if (!card || !card.name) return null;
  const name = card.name.trim();

  // 1. Direct trainer match
  if (thaiToEnTrainerMap[name]) {
    return thaiToEnTrainerMap[name];
  }

  // 2. Direct Pokemon match
  if (thaiToEnPokemonMap[name]) {
    return thaiToEnPokemonMap[name];
  }

  // 3. Substring match for Pokemon with suffixes like "ex", "VMAX", "VSTAR", "V", "เมก้า"
  const baseName = name
    .replace(/(ex|EX|VMAX|VSTAR|V-UNION|V|GX)/g, '')
    .replace(/^(เมก้า|ส่องประกาย|เรเดียนต์|ฮิซุย|กาลาร์|อโลลา|พัลเดีย)\s*/, '')
    .trim();

  if (thaiToEnPokemonMap[baseName]) {
    const enBase = thaiToEnPokemonMap[baseName];
    let prefix = '';
    if (name.startsWith('เมก้า')) prefix = 'Mega ';
    else if (name.startsWith('ส่องประกาย') || name.startsWith('เรเดียนต์')) prefix = 'Radiant ';
    else if (name.startsWith('ฮิซุย')) prefix = 'Hisuian ';
    else if (name.startsWith('กาลาร์')) prefix = 'Galarian ';
    else if (name.startsWith('อโลลา')) prefix = 'Alolan ';
    else if (name.startsWith('พัลเดีย')) prefix = 'Paldean ';

    let suffix = '';
    if (name.includes('VMAX')) suffix = ' VMAX';
    else if (name.includes('VSTAR')) suffix = ' VSTAR';
    else if (name.includes('ex') || name.includes('EX')) suffix = ' ex';
    else if (name.includes('V-UNION')) suffix = ' V-UNION';
    else if (name.endsWith('V') || name.includes(' V ')) suffix = ' V';
    else if (name.includes('GX')) suffix = ' GX';

    return `${prefix}${enBase}${suffix}`.trim();
  }

  return null;
}

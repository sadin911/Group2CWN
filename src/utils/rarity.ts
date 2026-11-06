// Exact set breakdown specifications based on official Pokemon TCG SV / SWSH / MA Asian / Thai expansion lists:
export const SET_RULES: Record<
  string,
  {
    ar?: [number, number];
    sr?: [number, number];
    sar?: [number, number];
    ur?: [number, number];
    hr?: [number, number];
    s?: [number, number];
    ssr?: [number, number];
    chr?: [number, number];
    csr?: [number, number];
  }
> = {
  // --- Sword & Shield Era Sets ---
  // SC1a (Base 154): 155-166 SR, 167-172 HR, 173-178 UR
  SC1a: { sr: [155, 166], hr: [167, 172], ur: [173, 178] },
  // SC1b (Base 153): 154-163 SR, 164-166 HR, 167-173 UR
  SC1b: { sr: [154, 163], hr: [164, 166], ur: [167, 173] },
  // SC3a / SC3b (Shiny Star V - Base 159): 160-250 S/SSR, 251-260 UR
  SC3a: { s: [160, 240], ssr: [241, 250], ur: [251, 260] },
  SC3b: { s: [160, 240], ssr: [241, 250], ur: [251, 260] },
  // S5I (Single Strike - Base 70): 71-76 SR, 77-80 HR, 81-83 UR
  S5I: { sr: [71, 76], hr: [77, 80], ur: [81, 83] },
  // S5R (Rapid Strike - Base 70): 71-76 SR, 77-80 HR, 81-83 UR
  S5R: { sr: [71, 76], hr: [77, 80], ur: [81, 83] },
  // S5a (Peerless Fighters - Base 70): 71-78 SR, 79-80 HR, 81-83 UR
  S5a: { sr: [71, 78], hr: [79, 80], ur: [81, 83] },
  // S6H (Silver Lance - Base 70): 71-78 SR, 79-82 HR, 83-87 UR
  S6H: { sr: [71, 78], hr: [79, 82], ur: [83, 87] },
  // S6K (Jet-Black Spirit - Base 70): 71-78 SR, 79-82 HR, 83-86 UR
  S6K: { sr: [71, 78], hr: [79, 82], ur: [83, 86] },
  // S6a (Eevee Heroes - Base 69): 70-84 SR, 85-93 HR, 94-96 UR
  S6a: { sr: [70, 84], hr: [85, 93], ur: [94, 96] },
  // S7D (Skyscraping Perfection - Base 67): 68-73 SR, 74-77 HR, 78-81 UR
  S7D: { sr: [68, 73], hr: [74, 77], ur: [78, 81] },
  // S7R (Blue Sky Stream - Base 67): 68-75 SR, 76-80 HR, 81-83 UR
  S7R: { sr: [68, 75], hr: [76, 80], ur: [81, 83] },
  // S8 (Fusion Arts - Base 100): 101-108 SR, 109-111 HR, 112-114 UR
  S8: { sr: [101, 108], hr: [109, 111], ur: [112, 114] },
  // S8b (VMAX Climax - Base 184): 185-230 CHR, 231-270 CSR, 271-280 UR
  S8b: { chr: [185, 230], csr: [231, 270], ur: [271, 280] },
  // S9 (Star Birth - Base 100): 101-108 SR, 109-112 HR, 113-116 UR
  S9: { sr: [101, 108], hr: [109, 112], ur: [113, 116] },
  // S9a (Battle Region - Base 67): 68-76 SR, 77-80 HR, 81-84 UR
  S9a: { sr: [68, 76], hr: [77, 80], ur: [81, 84] },
  // S10D (Time Gazer - Base 67): 68-71 SR, 72-74 HR, 75-76 UR
  S10D: { sr: [68, 71], hr: [72, 74], ur: [75, 76] },
  // S10P (Space Juggler - Base 67): 68-71 SR, 72-74 HR, 75-76 UR
  S10P: { sr: [68, 71], hr: [72, 74], ur: [75, 76] },
  // S10a (Dark Phantasma - Base 71): 72-79 SR, 80-83 HR, 84-86 UR
  S10a: { sr: [72, 79], hr: [80, 83], ur: [84, 86] },
  // S10b (Pokemon GO - Base 79): 80-84 SR, 85-87 HR, 88-90 UR
  S10b: { sr: [80, 84], hr: [85, 87], ur: [88, 90] },
  // S11 (Lost Abyss - Base 100): 101-108 SR, 109-112 HR, 113-115 UR
  S11: { sr: [101, 108], hr: [109, 112], ur: [113, 115] },
  // S11a (Incandescent Arcana - Base 68): 69-74 SR, 75-78 HR, 79-81 UR
  S11a: { sr: [69, 74], hr: [75, 78], ur: [79, 81] },
  // S12 (Paradigm Trigger - Base 98): 99-104 SR, 105-108 HR, 109-111 UR
  S12: { sr: [99, 104], hr: [105, 108], ur: [109, 111] },
  // S12a (VSTAR Universe - Base 172): 173-210 AR, 211-250 SAR, 251-254 UR
  S12a: { ar: [173, 210], sar: [211, 250], ur: [251, 254] },

  // --- Scarlet & Violet Era Sets ---
  SV1S: { ar: [79, 90], sr: [91, 100], sar: [101, 105], ur: [106, 108] },
  SV1V: { ar: [79, 90], sr: [91, 100], sar: [101, 105], ur: [106, 108] },
  SV1a: { ar: [74, 85], sr: [86, 95], sar: [96, 101], ur: [102, 103] },
  SV2P: { ar: [72, 83], sr: [84, 91], sar: [92, 96], ur: [97, 99] },
  SV2D: { ar: [72, 83], sr: [84, 91], sar: [92, 96], ur: [97, 99] },
  SV2a: { ar: [166, 183], sr: [184, 199], sar: [200, 207], ur: [208, 210] },
  SV3: { ar: [109, 120], sr: [121, 133], sar: [134, 138], ur: [139, 141] },
  SV3a: { ar: [63, 74], sr: [75, 84], sar: [85, 89], ur: [90, 92] },
  SV4K: { ar: [67, 78], sr: [79, 88], sar: [89, 92], ur: [93, 95] },
  SV4M: { ar: [67, 78], sr: [79, 88], sar: [89, 92], ur: [93, 95] },
  SV4a: { s: [191, 319], ssr: [320, 337], sr: [338, 345], sar: [346, 353], ur: [354, 360] },
  SV5K: { ar: [72, 83], sr: [84, 93], sar: [94, 97], ur: [98, 100] },
  SV5M: { ar: [72, 83], sr: [84, 93], sar: [94, 97], ur: [98, 100] },
  SV5a: { ar: [67, 78], sr: [79, 88], sar: [89, 93], ur: [94, 96] },
  SV6: { ar: [102, 113], sr: [114, 124], sar: [125, 130], ur: [131, 133] },
  SV7s: { ar: [167, 184], sr: [185, 212], sar: [213, 223], ur: [224, 229] },
  SV8s: { ar: [183, 200], sr: [201, 229], sar: [230, 238], ur: [239, 244] },
  Sv8a: { sr: [188, 202], sar: [203, 228], ur: [229, 237] },
  SV9s: { ar: [140, 153], sr: [154, 173], sar: [174, 182], ur: [183, 185] },
  SV10s: { ar: [139, 152], sr: [153, 176], sar: [177, 186], ur: [187, 189] },
  SV11s: { ar: [173, 316], sr: [317, 332], sar: [333, 346], ur: [347, 348] },

  // --- Mega Evolution Era Sets ---
  MA1: { ar: [127, 150], sr: [151, 172], sar: [173, 182], ur: [183, 184] },
  MA2: { ar: [104, 119], sr: [120, 136], sar: [137, 142], ur: [143, 143] },
  MA3: { ar: [194, 213], sr: [214, 232], sar: [233, 249], ur: [250, 250] },
  MA4: { ar: [124, 147], sr: [148, 168], sar: [169, 179], ur: [180, 181] },
  MA5: { ar: [165, 188], sr: [189, 224], sar: [225, 236], ur: [237, 238] },
  MA6: { ar: [131, 152], sar: [153, 166], sr: [167, 196] },
};

// Official Thai ACE SPEC card names across all Scarlet & Violet / Mega Evolution expansions
export const THAI_ACE_SPEC_NAMES = new Set([
  'กลองปลุกพลัง',
  'เข็มขัดแมกซิมัม',
  'ไพรม์แคชเชอร์',
  'รีบูตพอด',
  'ผ้าคลุมฮีโร่',
  'นีโออัปเปอร์เอนเนอร์จี้',
  'มาสเตอร์บอล',
  'อันแฟร์สแตมป์',
  'ไฮเปอร์อโรมา',
  'อุปกรณ์เพาะกายช่วยชีวิต',
  'กล่องลับ',
  'ไซโคลนเก็บคืนโปเกมอน',
  'พลังงานสืบทอด',
  'ลำแสงมหาภัย',
  'โปเกไวทัล A',
  'ผลึกระยิบระยับ',
  'ดีลักซ์บอมบ์',
  'ต้นไม้ยักษ์วิเศษ',
  'นิวทรัลเซ็นเตอร์',
  'เพอร์เฟกต์มิกเซอร์',
  'พรีเชียสแครี',
  'ส่งต่อพลังงาน PRO',
  'สแครมเบิลสวิตช์',
  'มิราเคิลอินเตอร์คอม',
  'เมกะตันโบลเวอร์',
  'ริชเอนเนอร์จี้',
  'คันเบ็ด MAX',
  'เทรเชอร์แกดเจ็ต',
  'เครื่องรางแห่งความปรารถนา',
]);

// Official English / International ACE SPEC card names
export const ENGLISH_ACE_SPEC_NAMES = new Set([
  'awakening drum',
  "hero's cape",
  'master ball',
  'maximum belt',
  'prime catcher',
  'reboot pod',
  'neo upper energy',
  'hyper aroma',
  'scoop up cyclone',
  'secret box',
  'survival brace',
  'unfair stamp',
  'legacy energy',
  'dangerous laser',
  'neutralization zone',
  'poké vital a',
  'poke vital a',
  'deluxe bomb',
  'grand tree',
  'sparkling crystal',
  'amulet of hope',
  'brilliant blender',
  'energy search pro',
  'megaton blower',
  'miracle headset',
  'precious trolley',
  'scramble switch',
  'enriching energy',
  'max rod',
  'treasure tracker',
  'computer search',
  'dowsing machine',
  'rock guard',
  'life dew',
  'victory cup',
  'gold potion',
  'g booster',
  'g scope',
]);

function normalizeCardName(name: string): string {
  return (name || '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
}

/**
 * Checks whether a card (or card name) is an official ACE SPEC card.
 */
export function isAceSpecCard(cardOrName?: any, colNum?: string): boolean {
  if (!cardOrName) return false;

  if (typeof cardOrName === 'string') {
    const norm = normalizeCardName(cardOrName);
    if (norm.includes('ACE SPEC') || norm.includes('เอซสเปก')) return true;
    if (colNum && colNum.toUpperCase().includes('ACE')) return true;
    if (THAI_ACE_SPEC_NAMES.has(norm)) return true;
    if (ENGLISH_ACE_SPEC_NAMES.has(norm.toLowerCase())) return true;
    return false;
  }

  const card = cardOrName;
  if (card.rarityCode === 'ACE_SPEC') return true;

  const rawName = card.name || card.nameTh || '';
  const normName = normalizeCardName(rawName);
  const nameEn = (card.nameEn || '').toLowerCase().trim();
  const col = (card.collectorNumber || card.localId || colNum || '').toUpperCase();
  const rarity = (card.rarity || '').toLowerCase();

  if (normName.includes('ACE SPEC') || normName.includes('เอซสเปก') || col.includes('ACE')) return true;
  if (rarity.includes('ace spec')) return true;

  if (Array.isArray(card.subtypes) && card.subtypes.some((s: string) => String(s).toLowerCase().includes('ace spec'))) {
    return true;
  }
  if (Array.isArray(card.rules) && card.rules.some((r: string) => String(r).toLowerCase().includes('ace spec'))) {
    return true;
  }

  if (THAI_ACE_SPEC_NAMES.has(normName)) return true;
  if (ENGLISH_ACE_SPEC_NAMES.has(normName.toLowerCase())) return true;
  if (nameEn && ENGLISH_ACE_SPEC_NAMES.has(nameEn)) return true;

  return false;
}

export function getCardRarityClass(card: any): string {
  if (card.rarityCode === 'ACE_SPEC') return 'ACE_SPEC';

  // 1. Check ACE SPEC before relying on existing rarityCode (some legacy datasets mapped ACE SPEC to REGULAR)
  if (isAceSpecCard(card)) {
    return 'ACE_SPEC';
  }

  if (card.rarityCode) return card.rarityCode;

  const name = (card.name || '').trim();
  const rawSetId = card.set?.id || '';
  const setId = rawSetId.toUpperCase();
  const col = (card.collectorNumber || card.localId || '').toUpperCase();
  const category = card.category || '';

  // 1. Promo
  if (
    setId.includes('-P') ||
    setId.includes('PROMO') ||
    col.includes('PROMO') ||
    col.startsWith('P-') ||
    setId === 'PROMO'
  ) {
    return 'PROMO';
  }

  // 2. Radiant
  if (name.includes('ส่องประกาย') || name.includes('เรเดียนต์') || name.includes('Radiant')) {
    return 'RADIANT';
  }

  // 2.1 Direct English/International rarity string mapping
  if (card.rarity) {
    const r = card.rarity.toLowerCase();
    if (r.includes('special illustration') || r.includes('sir')) return 'SAR';
    if (r.includes('illustration rare') || r.includes('trainer gallery') || r.includes('galarian gallery')) return 'AR';
    if (r.includes('hyper rare') || r.includes('rainbow') || r.includes('gold')) return 'UR';
    if (r.includes('ultra rare') || r.includes('secret') || r.includes('shiny ultra')) return 'SR';
    if (r.includes('double rare') || r.includes('shiny rare')) return 'EX';
    if (r.includes('promo')) return 'PROMO';
    if (r.includes('ace spec')) return 'ACE_SPEC';
    if (r.includes('radiant') || r.includes('amazing')) return 'AR';
  }

  // 4. Check Set Rule table if available
  const match = col.match(/^0*(\d+)[-/]0*(\d+)/);
  if (match) {
    const num = parseInt(match[1], 10);
    const total = parseInt(match[2], 10);

    const config = SET_RULES[rawSetId] || SET_RULES[setId];
    if (config) {
      if (config.s && num >= config.s[0] && num <= config.s[1]) return 'AR';
      if (config.ssr && num >= config.ssr[0] && num <= config.ssr[1]) return 'EX';
      if (config.chr && num >= config.chr[0] && num <= config.chr[1]) return 'AR';
      if (config.csr && num >= config.csr[0] && num <= config.csr[1]) return 'SR';
      if (config.ar && num >= config.ar[0] && num <= config.ar[1]) return 'AR';
      if (config.sr && num >= config.sr[0] && num <= config.sr[1]) return 'SR';
      if (config.hr && num >= config.hr[0] && num <= config.hr[1]) return 'HR';
      if (config.sar && num >= config.sar[0] && num <= config.sar[1]) return 'SAR';
      if (config.ur && num >= config.ur[0] && num <= config.ur[1]) return 'UR';
    } else if (num > total) {
      if (category === 'Pokemon' && !name.includes('ex') && !name.includes('EX') && !name.includes('V')) {
        return 'AR';
      }
      return 'SR';
    }
  }

  // 5. Base set High Rarity:
  if (name.includes('ex') || name.includes('EX')) return 'EX';
  if (name.includes('VMAX')) return 'VMAX';
  if (name.includes('VSTAR')) return 'VSTAR';
  if (/(?:[\u0E00-\u0E7F]|\s)V(?:$|[\s\(\[\{【])/i.test(name) || name.endsWith('V')) return 'V';

  return 'REGULAR';
}

/**
 * Parses a rarity filter value (single string, comma-separated string, or array)
 * into a normalized array of rarity codes. If empty or includes 'ALL', returns ['ALL'].
 */
export function parseSelectedRarities(rarity?: string | string[]): string[] {
  if (!rarity) return ['ALL'];
  const list = Array.isArray(rarity) ? rarity : rarity.split(',');
  const cleaned = list.map((r) => r.trim().toUpperCase()).filter(Boolean);
  if (cleaned.length === 0 || cleaned.includes('ALL')) {
    return ['ALL'];
  }
  return cleaned;
}

/**
 * Checks whether a specific rarity code is currently selected in the rarity filter.
 */
export function isRaritySelected(current: string | string[] | undefined, targetRarity: string): boolean {
  const active = parseSelectedRarities(current);
  if (targetRarity === 'ALL') {
    return active.includes('ALL');
  }
  return active.includes(targetRarity);
}

/**
 * Toggles a target rarity in or out of the current selection.
 * Returns a new comma-separated string (or 'ALL').
 */
export function toggleRarityInSelection(current: string | string[] | undefined, targetRarity: string): string {
  const active = parseSelectedRarities(current);
  if (targetRarity === 'ALL') {
    return 'ALL';
  }

  let next: string[];
  if (active.includes('ALL')) {
    next = [targetRarity];
  } else if (active.includes(targetRarity)) {
    next = active.filter((r) => r !== targetRarity);
    if (next.length === 0) {
      return 'ALL';
    }
  } else {
    next = [...active, targetRarity];
  }
  return next.join(',');
}

/**
 * Tests whether a card matches the active rarity selection (single, multi, or ALL).
 */
export function matchesRarityFilter(card: any, selectedRarity?: string | string[]): boolean {
  const active = parseSelectedRarities(selectedRarity);
  if (active.includes('ALL')) {
    return true;
  }
  const cardRarity = getCardRarityClass(card);
  return active.includes(cardRarity);
}

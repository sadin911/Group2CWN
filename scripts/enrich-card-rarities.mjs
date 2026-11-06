import fs from 'fs';
import path from 'path';

const data = JSON.parse(fs.readFileSync('src/data/pokemonNames.json', 'utf8'));

// Exact set breakdown specifications based on official Pokemon TCG SV / SWSH / MA Asian / Thai expansion lists:
export const SET_RULES = {
  // --- Sword & Shield Era Sets ---
  SC1a: { sr: [155, 166], hr: [167, 172], ur: [173, 178] },
  SC1b: { sr: [154, 163], hr: [164, 166], ur: [167, 173] },
  SC3a: { s: [160, 240], ssr: [241, 250], ur: [251, 260] },
  SC3b: { s: [160, 240], ssr: [241, 250], ur: [251, 260] },
  S5I: { sr: [71, 76], hr: [77, 80], ur: [81, 83] },
  S5R: { sr: [71, 76], hr: [77, 80], ur: [81, 83] },
  S5a: { sr: [71, 78], hr: [79, 80], ur: [81, 83] },
  S6H: { sr: [71, 78], hr: [79, 82], ur: [83, 87] },
  S6K: { sr: [71, 78], hr: [79, 82], ur: [83, 86] },
  S6a: { sr: [70, 84], hr: [85, 93], ur: [94, 96] },
  S7D: { sr: [68, 73], hr: [74, 77], ur: [78, 81] },
  S7R: { sr: [68, 75], hr: [76, 80], ur: [81, 83] },
  S8: { sr: [101, 108], hr: [109, 111], ur: [112, 114] },
  S8b: { chr: [185, 230], csr: [231, 270], ur: [271, 280] },
  S9: { sr: [101, 108], hr: [109, 112], ur: [113, 116] },
  S9a: { sr: [68, 76], hr: [77, 80], ur: [81, 84] },
  S10D: { sr: [68, 71], hr: [72, 74], ur: [75, 76] },
  S10P: { sr: [68, 71], hr: [72, 74], ur: [75, 76] },
  S10a: { sr: [72, 79], hr: [80, 83], ur: [84, 86] },
  S10b: { sr: [80, 84], hr: [85, 87], ur: [88, 90] },
  S11: { sr: [101, 108], hr: [109, 112], ur: [113, 115] },
  S11a: { sr: [69, 74], hr: [75, 78], ur: [79, 81] },
  S12: { sr: [99, 104], hr: [105, 108], ur: [109, 111] },
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

export function classifyRarity(card) {
  if (card.rarityCode) return card.rarityCode;

  const name = (card.name || '').trim();
  const rawSetId = card.set?.id || '';
  const setId = rawSetId.toUpperCase();
  const col = (card.collectorNumber || card.localId || '').toUpperCase();
  const category = card.category || '';

  // 1. Promo Cards
  if (
    setId.includes('-P') ||
    setId.includes('PROMO') ||
    col.includes('PROMO') ||
    col.startsWith('P-') ||
    setId === 'PROMO'
  ) {
    return 'PROMO';
  }

  // 2. ACE SPEC
  if (name.includes('ACE SPEC') || name.includes('เอซสเปก') || col.includes('ACE')) {
    return 'ACE_SPEC';
  }

  // 3. Radiant
  if (name.includes('ส่องประกาย') || name.includes('เรเดียนต์') || name.includes('Radiant')) {
    return 'RADIANT';
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

const breakdown = {};
const enriched = data.map((card) => {
  const rarityCode = classifyRarity(card);
  breakdown[rarityCode] = (breakdown[rarityCode] || 0) + 1;
  return {
    ...card,
    rarityCode,
  };
});

console.log('Enriched Breakdown:', breakdown);

fs.writeFileSync('src/data/pokemonNames.json', JSON.stringify(enriched, null, 2), 'utf8');
console.log('Successfully updated src/data/pokemonNames.json with accurate rarityCode!');

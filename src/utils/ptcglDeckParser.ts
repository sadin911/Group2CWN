import translationsData from '../data/pokemonNameTranslations.json';
import {
  resolveThaiCardIdFromEnPrint,
  getEnglishNameForThaiCard,
  isSameEnglishCardName,
  preferRegularPrint,
} from './deckMapAssist';

export interface ParsedDeckCardEntry {
  cardId: string;
  count: number;
  cardNameTh: string;
  cardNameEn: string;
  cardImage?: string;
  setCode?: string;
  collectorNumber?: string;
  category?: string;
  stage?: string;
  isCustomMapped?: boolean;
  /** Resolved or corrected using the Thai/English card map rather than name translation alone. */
  isMapAssisted?: boolean;
  rawItem: UnmatchedDeckCardItem;
}

export interface UnmatchedDeckCardItem {
  rawLine: string;
  count: number;
  rawCardName: string;
  setCode?: string;
  collectorNumber?: string;
}

export interface PTCGLParseResult {
  success: boolean;
  deckName: string;
  cards: Record<string, { cardId: string; count: number }>;
  matchedEntries: ParsedDeckCardEntry[];
  autoMatchedEntries: ParsedDeckCardEntry[];
  customMappedEntries: ParsedDeckCardEntry[];
  totalCards: number;
  unmatchedLines: string[];
  unmatchedDetails: UnmatchedDeckCardItem[];
  coverCardId?: string;
  coverImageUrl?: string;
}

// English to Thai set code mapping
export const EN_TO_TH_SET_MAP: Record<string, string[]> = {
  TWM: ['SV6'],
  SCR: ['SV7S', 'SV7s'],
  SSP: ['SV8S', 'SV8s'],
  TEF: ['SV5S', 'SV5s', 'SV5K'],
  JTG: ['SV9S', 'SV9s'],
  ASC: ['SV8A', 'SV8a', 'MATH', 'MATK'],
  PRE: ['SV8A', 'SV8a'],
  MEG: ['MA1', 'MA2', 'MA3', 'MATH', 'MATK'],
  POR: ['MA4', 'MA5', 'MATL', 'MATS'],
  CRI: ['MA5', 'SV5A', 'SV5a'],
  OBF: ['SV3'],
  PAF: ['SV4A', 'SV4a'],
  PAL: ['SV2D', 'SV2P'],
  SVI: ['SV1S', 'SV1V'],
  MEW: ['SV2A', 'SV2a'],
  PAR: ['SV4K', 'SV4M'],
  SIT: ['S12', 'S12a'],
  LOR: ['S11'],
  ASR: ['S10', 'S10D', 'S10P'],
  BRS: ['S9', 'S9a'],
  FST: ['S8', 'S8b'],
  EVS: ['S7D', 'S7R'],
  CRE: ['S6H', 'S6K', 'S6a'],
  BST: ['S5I', 'S5R', 'S5a'],
  VIV: ['S4'],
  DAA: ['S3'],
  SSH: ['SC1A', 'SC1B', 'SC1a', 'SC1b', 'S1W', 'S1H'],
  MEE: ['MATH', 'MATK', 'MATL', 'MATS', 'SVAL', 'SVAW', 'SVDS', 'SVES'],
};

// Basic Energy names mapping (EN -> TH)
const BASIC_ENERGIES_MAP: Record<string, string> = {
  fire: 'พลังงานพื้นฐาน[ไฟ]',
  darkness: 'พลังงานพื้นฐาน[ความมืด]',
  dark: 'พลังงานพื้นฐาน[ความมืด]',
  psychic: 'พลังงานพื้นฐาน[พลังจิต]',
  water: 'พลังงานพื้นฐาน[น้ำ]',
  lightning: 'พลังงานพื้นฐาน[สายฟ้า]',
  grass: 'พลังงานพื้นฐาน[หญ้า]',
  fighting: 'พลังงานพื้นฐาน[ต่อสู้]',
  metal: 'พลังงานพื้นฐาน[โลหะ]',
};

/**
 * Check if the text matches PTCGL / Limitless deck format
 */
export function isPTCGLDeckFormat(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return false;

  let cardLineCount = 0;
  for (const line of lines) {
    if (/^(pokémon|pokemon|trainer|energy):/i.test(line)) return true;
    if (line.startsWith('// Pokémon TCG Deck:')) return true;
    if (/^\d+\s+[A-Za-z0-9\s'’.\-:]+\s+[A-Za-z0-9\-]+(?:\s+\d+|\s+[A-Za-z0-9\-]+)?$/.test(line)) {
      cardLineCount++;
    }
  }
  return cardLineCount >= 2;
}

/**
 * Normalizes English card name and looks up Thai equivalent
 */
export function translateEnCardNameToTh(rawName: string): string {
  const trimmed = rawName.trim();
  const lower = trimmed.toLowerCase();

  const pokemonDict = (translationsData.pokemon || {}) as Record<string, string>;
  const trainersDict = (translationsData.trainers || {}) as Record<string, string>;

  // 1. Direct match in dictionary
  if (trainersDict[lower]) return trainersDict[lower];
  if (pokemonDict[lower]) return pokemonDict[lower];

  // 2. Basic energy check
  if (lower.includes('energy')) {
    for (const [key, thEnergy] of Object.entries(BASIC_ENERGIES_MAP)) {
      if (lower.includes(key)) {
        return thEnergy;
      }
    }
  }

  // 3. Check for suffix patterns (ex, V, VMAX, VSTAR, ex Terastal, etc.)
  const suffixes = [
    { en: ' ex terastal', th: 'ex' },
    { en: ' ex', th: 'ex' },
    { en: ' vmax', th: 'VMAX' },
    { en: ' vstar', th: 'VSTAR' },
    { en: ' v-union', th: 'V-UNION' },
    { en: ' v', th: 'V' },
  ];

  for (const { en, th } of suffixes) {
    if (lower.endsWith(en)) {
      const baseName = lower.slice(0, -en.length).trim();
      const baseTh = pokemonDict[baseName] || trainersDict[baseName];
      if (baseTh) {
        return `${baseTh}${th}`;
      }
    }
  }

  // 4. Check for prefix patterns (Mega, Alolan, Galarian, Hisuian, Paldean, Radiant)
  const prefixes = (translationsData.prefixes || []) as Array<{ en: string; th: string }>;
  for (const p of prefixes) {
    const pLower = p.en.toLowerCase();
    if (lower.startsWith(pLower)) {
      const remainder = lower.slice(pLower.length).trim();
      const remTh = translateEnCardNameToTh(remainder);
      if (remTh && remTh !== remainder) {
        return `${p.th}${remTh}`;
      }
    }
  }

  // 5. Special cases or punctuation fixes
  const strippedApos = lower.replace(/['’]/g, '');
  if (trainersDict[strippedApos]) return trainersDict[strippedApos];
  if (pokemonDict[strippedApos]) return pokemonDict[strippedApos];

  return trimmed;
}

/**
 * Main parser for PTCGL / Limitless Decklist format
 */
export function parsePTCGLDeck(
  text: string,
  cardDatabase: any[],
  customMappings?: Record<string, string>
): PTCGLParseResult {
  const lines = text.split('\n').map((l) => l.trim());
  let extractedTitle = '';

  const matchedEntries: ParsedDeckCardEntry[] = [];
  const autoMatchedEntries: ParsedDeckCardEntry[] = [];
  const customMappedEntries: ParsedDeckCardEntry[] = [];
  const cardsRecord: Record<string, { cardId: string; count: number }> = {};
  const unmatchedLines: string[] = [];
  const unmatchedDetails: UnmatchedDeckCardItem[] = [];

  let candidateCover: { cardId: string; imageUrl?: string; priority: number } | null = null;

  for (const line of lines) {
    if (!line) continue;

    // Check title comments e.g. "// Pokémon TCG Deck: Dragapult ex"
    if (line.startsWith('// Pokémon TCG Deck:')) {
      extractedTitle = line.replace('// Pokémon TCG Deck:', '').trim();
      continue;
    }
    if (line.startsWith('//') || /^(pokémon|pokemon|trainer|energy):/i.test(line)) {
      continue;
    }

    // Match line pattern: <count> <cardName> [setCode] [collectorNumber]
    // Example: "4 Dreepy TWM 128" or "3 Fire Energy MEE 2" or "2 โดราพัลท์ex SV6 130"
    const match = line.match(/^(\d+)\s+(.+?)(?:\s+([A-Za-z0-9\-]+)\s+(\d+[-/]?\d*|[A-Za-z0-9\-]+))?$/);
    if (!match) {
      unmatchedLines.push(line);
      unmatchedDetails.push({ rawLine: line, count: 1, rawCardName: line });
      continue;
    }

    const count = parseInt(match[1], 10);
    const rawCardName = match[2].trim();
    const rawSetCode = (match[3] || '').toUpperCase();
    const rawColNum = match[4] || '';

    let best: any = null;
    let isCustomMapped = false;
    let isMapAssisted = false;

    // Check user/community custom mappings first
    const normKey = rawCardName.toLowerCase().trim();
    const customTarget = customMappings?.[normKey];
    if (customTarget) {
      best = cardDatabase.find(
        (c) => c.id === customTarget || (c.name || '').toLowerCase() === customTarget.toLowerCase()
      );
      if (best) {
        isCustomMapped = true;
      }
    }

    if (!best) {
      // Translate name to Thai if English
      const thName = translateEnCardNameToTh(rawCardName);
      const queryName = thName.toLowerCase();

      // Find candidate matches in database
      const candidates = cardDatabase.filter((c) => {
        const cName = (c.name || '').toLowerCase();
        if (!cName) return false;
        if (cName === queryName) return true;
        if (cName.includes(queryName)) return true;
        if (cName.length >= 3 && queryName.includes(cName)) return true;
        return false;
      });

      if (candidates.length === 0) {
        // Name translation found nothing; fall back to the exact English print
        // via the Thai/English card map before giving up on the line.
        const mapThaiId = resolveThaiCardIdFromEnPrint(rawSetCode, rawColNum);
        const mapped = mapThaiId ? cardDatabase.find((c) => c.id === mapThaiId) : null;
        if (mapped) {
          best = preferRegularPrint(mapped, cardDatabase);
          isMapAssisted = true;
        } else {
          unmatchedLines.push(line);
          unmatchedDetails.push({
            rawLine: line,
            count,
            rawCardName,
            setCode: rawSetCode,
            collectorNumber: rawColNum,
          });
          continue;
        }
      }

      if (!best) {
        // Priority 1: Check if EN set code maps to a Thai set code
        const mappedThSets = EN_TO_TH_SET_MAP[rawSetCode] || [rawSetCode];
        const setMatched = candidates.find((c) => {
          const cSetId = (c.set?.id || '').toUpperCase();
          return mappedThSets.includes(cSetId);
        });

        if (setMatched) {
          best = setMatched;
        } else {
          // Priority 2: Prefer standard regulation regular print
          const regularStandard = candidates.find((c) => {
            const isReg = c.rarityCode === 'REGULAR';
            const isStandard = c.regulationMark === 'H' || c.regulationMark === 'G';
            return isReg && isStandard;
          });
          if (regularStandard) {
            best = regularStandard;
          } else {
            const regularOnly = candidates.find((c) => c.rarityCode === 'REGULAR');
            if (regularOnly) best = regularOnly;
            else best = candidates[0];
          }
        }
      }

      // Cross-check the name-route pick against the Thai/English card map.
      // Only override when the map proves the pick is a *different* English
      // card (e.g. a plain Fezandipiti standing in for Fezandipiti ex). When
      // the names agree, the name route keeps its pick — the map matches by
      // artwork, so it often points at a promo reprint sharing the same art.
      if (best && !isMapAssisted) {
        const mapThaiId = resolveThaiCardIdFromEnPrint(rawSetCode, rawColNum);
        if (mapThaiId && mapThaiId !== best.id) {
          const pickedEnName = getEnglishNameForThaiCard(best.id);
          if (pickedEnName && !isSameEnglishCardName(pickedEnName, rawCardName)) {
            const mapped = cardDatabase.find((c) => c.id === mapThaiId);
            if (mapped) {
              best = preferRegularPrint(mapped, cardDatabase);
              isMapAssisted = true;
            }
          }
        }
      }
    }

    if (!best) {
      unmatchedLines.push(line);
      unmatchedDetails.push({
        rawLine: line,
        count,
        rawCardName,
        setCode: rawSetCode,
        collectorNumber: rawColNum,
      });
      continue;
    }

    // Register card in deck
    if (cardsRecord[best.id]) {
      cardsRecord[best.id].count += count;
    } else {
      cardsRecord[best.id] = { cardId: best.id, count };
    }

    const entry: ParsedDeckCardEntry = {
      cardId: best.id,
      count,
      cardNameTh: best.name,
      cardNameEn: rawCardName,
      cardImage: best.imageUrl || best.officialImageUrl,
      setCode: best.set?.id,
      collectorNumber: best.collectorNumber,
      category: best.category,
      stage: best.stage,
      isCustomMapped,
      isMapAssisted,
      rawItem: {
        rawLine: line,
        count,
        rawCardName,
        setCode: rawSetCode,
        collectorNumber: rawColNum,
      },
    };

    matchedEntries.push(entry);
    if (isCustomMapped) {
      customMappedEntries.push(entry);
    } else {
      autoMatchedEntries.push(entry);
    }

    // Pick best cover card (e.g. Stage 2 ex > Stage 1 ex > Basic ex > VSTAR > Pokemon)
    let priority = 0;
    const nameLower = (best.name || '').toLowerCase();
    if (nameLower.includes('ex')) {
      priority = 100;
      if (best.stage === 'ร่าง 2') priority += 20;
      else if (best.stage === 'ร่าง 1') priority += 10;
    } else if (nameLower.includes('vstar') || nameLower.includes('vmax')) {
      priority = 90;
    } else if (nameLower.includes('v')) {
      priority = 80;
    } else if (best.category === 'Pokemon') {
      priority = 50;
    }

    if (!candidateCover || priority > candidateCover.priority) {
      candidateCover = {
        cardId: best.id,
        imageUrl: best.imageUrlHigh || best.imageUrl || best.officialImageUrl,
        priority,
      };
    }
  }

  const totalCards = matchedEntries.reduce((sum, e) => sum + e.count, 0);

  // Derive deck name if not extracted from comments
  let deckName = extractedTitle;
  if (!deckName) {
    if (candidateCover && candidateCover.priority >= 80) {
      const coverEntry = matchedEntries.find((e) => e.cardId === candidateCover?.cardId);
      if (coverEntry) {
        deckName = `${coverEntry.cardNameEn || coverEntry.cardNameTh}`;
      }
    }
  }
  if (!deckName) {
    deckName = totalCards > 0 ? `Deck (${totalCards} ใบ)` : 'Imported Deck';
  }

  return {
    success: matchedEntries.length > 0,
    deckName,
    cards: cardsRecord,
    matchedEntries,
    autoMatchedEntries,
    customMappedEntries,
    totalCards,
    unmatchedLines,
    unmatchedDetails,
    coverCardId: candidateCover?.cardId,
    coverImageUrl: candidateCover?.imageUrl,
  };
}

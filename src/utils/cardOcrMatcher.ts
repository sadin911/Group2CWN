import { normalizeCollectorNum } from './collectionTextParser';
import { buildCardLookup } from './collectionExcelParser';

export { buildCardLookup };

export interface OcrCardMatchResult {
  card: any | null;
  extractedSet: string | null;
  extractedNumber: string | null;
  rawMatchedSnippet: string | null;
  confidence: number;
}

/**
 * Common OCR misrecognitions in Pokémon card set codes.
 */
export function cleanOcrSetCode(setCandidate: string, knownSets: Set<string>): string {
  // Strip surrounding noise like brackets, bars, exclamation marks, etc.
  let cleaned = setCandidate
    .trim()
    .replace(/^[|!Ili1\[\(\{<]+|[|!Ili1\]\)\}>]+$/g, '')
    .trim();

  const upper = cleaned.toUpperCase();

  // 1. Direct case-insensitive match
  for (const s of knownSets) {
    if (s.toUpperCase() === upper) return s;
  }

  // 2. Common OCR substitutions
  let corrected = upper;
  if (corrected.startsWith('5V')) corrected = 'SV' + corrected.slice(2);
  else if (corrected.startsWith('5C')) corrected = 'SC' + corrected.slice(2);
  else if (corrected.startsWith('5M')) corrected = 'SM' + corrected.slice(2);
  else if (corrected.startsWith('5')) corrected = 'S' + corrected.slice(1);

  // 'B' instead of '8' (e.g. SVBA -> SV8A, S8BA -> S8A)
  corrected = corrected.replace(/SVBA/i, 'SV8A').replace(/S8BA/i, 'S8A');

  // 'I' or 'l' or '|' instead of '1' (e.g. SCIA -> SC1A)
  corrected = corrected.replace(/^SC[IL|](\w*)$/i, 'SC1$1');

  // '@' or '4' instead of 'A' (e.g. SV8@ -> SV8A)
  corrected = corrected.replace(/[@4]$/, 'A');

  for (const s of knownSets) {
    if (s.toUpperCase() === corrected) return s;
  }

  return cleaned;
}

/**
 * Normalizes OCR collector numbers (e.g. handles slashed totals, OCR'd slashes, regulation marks).
 */
export function cleanOcrCollectorNum(numStr: string): string {
  let cleaned = numStr.trim();
  // Strip trailing regulation or rarity letters, e.g. "025/187 G" or "025G"
  cleaned = cleaned.replace(/\s+[A-Za-z]+$/, '');
  cleaned = cleaned.replace(/[A-Za-z]$/, '');

  // Normal slash or hyphen format: '025/187' or '001-154'
  if (cleaned.includes('/') || cleaned.includes('-')) {
    return cleaned.split(/[-/]/)[0];
  }

  // If '/' was read as 1, I, l, |, !, or \ (e.g. '0251187', '025I187', '025|187')
  const slashedMatch = cleaned.match(/^(\d{1,3})[1Il|!/\\](\d{2,3})$/);
  if (slashedMatch) {
    return slashedMatch[1];
  }

  // If 6 digits run together without delimiter (e.g. '025187' = card 025 of 187)
  if (/^\d{6}$/.test(cleaned)) {
    return cleaned.slice(0, 3);
  }

  return cleaned;
}

/**
 * Returns OCR alias variations for a given known set code.
 */
function getSetAliases(setId: string): string[] {
  const aliases = new Set<string>([setId, setId.toUpperCase()]);
  const upper = setId.toUpperCase();

  if (upper.startsWith('S')) {
    aliases.add('5' + upper.slice(1));
  }
  if (upper.includes('8')) {
    aliases.add(upper.replace(/8/g, 'B'));
  }
  if (upper.includes('1')) {
    aliases.add(upper.replace(/1/g, 'I'));
    aliases.add(upper.replace(/1/g, 'l'));
    aliases.add(upper.replace(/1/g, '|'));
  }
  if (upper.endsWith('A')) {
    aliases.add(upper.slice(0, -1) + '@');
  }

  return Array.from(aliases);
}

/**
 * Searches OCR text for Pokemon card identifiers (e.g. "SV8a 025/187", "SC1a 001-154", "s8a 10").
 */
export function matchOcrToCard(
  rawText: string,
  catalog: any[],
  cardLookupCache?: { cardLookup: Map<string, any>; knownSets: Set<string> }
): OcrCardMatchResult {
  if (!rawText || !rawText.trim()) {
    return {
      card: null,
      extractedSet: null,
      extractedNumber: null,
      rawMatchedSnippet: null,
      confidence: 0,
    };
  }

  const { cardLookup, knownSets } = cardLookupCache || buildCardLookup(catalog);

  // Normalize spaces and common bracket artifacts
  const cleanText = rawText
    .replace(/\r?\n/g, ' ')
    .replace(/[\[\]\(\)\{\}<>]/g, ' ')
    .replace(/\s+/g, ' ');

  // TIER 1: Search specifically for known set codes (and their OCR aliases)
  // Sort known sets by length descending to match 'SV8a' before 'SV8'
  const sortedSets = Array.from(knownSets).sort((a, b) => b.length - a.length);

  for (const knownSet of sortedSets) {
    const aliases = getSetAliases(knownSet);
    const escapedAliases = aliases.map((a) => a.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')).join('|');

    // Pattern matches: [Alias][optional space/hyphen][optional 1-letter regulation][collector number]
    // Handles e.g. "SV8a 025/187", "SV8a F 025/187", "5V8a025/187", "SV8a-025", "SV8a 0251187"
    const regex = new RegExp(
      `(?:^|[^A-Za-z0-9])(?:${escapedAliases})[\\s_\\-:]*(?:[A-Za-z]\\s+)?([0-9A-Za-z]+(?:[\\/\\-][0-9A-Za-z]+)?|[0-9]{5,7})(?:[^A-Za-z0-9]|$)`,
      'gi'
    );

    let match: RegExpExecArray | null;
    while ((match = regex.exec(cleanText)) !== null) {
      const rawNum = match[1];
      if (!rawNum) continue;

      const cardNum = cleanOcrCollectorNum(rawNum);
      const numPrefix = normalizeCollectorNum(cardNum);
      const sLower = knownSet.toLowerCase();

      const matched =
        cardLookup.get(`${sLower}:${numPrefix}`) ||
        cardLookup.get(`${sLower}:${cardNum.toLowerCase()}`) ||
        cardLookup.get(`${sLower}:${normalizeCollectorNum(rawNum)}`);

      if (matched) {
        return {
          card: matched,
          extractedSet: matched.set?.id || knownSet,
          extractedNumber: matched.collectorNumber || cardNum,
          rawMatchedSnippet: match[0].trim(),
          confidence: 0.95,
        };
      }
    }
  }

  // TIER 2: Generic pattern matching [Candidate Set] [Number]
  const genericPatterns = [
    // Standard space-separated or regulation-separated
    /(?:^|[^\w])([A-Za-z0-9]{1,5}(?:-[A-Za-z0-9]+)?)\s+(?:[A-Z]\s+)?([A-Za-z0-9]+(?:[\/-]\d{1,3})?)(?:[^\w]|$)/g,
    // Hyphenated or tight code
    /(?:^|[^\w])([A-Za-z0-9]{1,5}(?:-[A-Za-z0-9]+)?)[-_/]([A-Za-z0-9]{1,3})(?:[\/-]\d{1,3})?(?:[^\w]|$)/g,
  ];

  for (const regex of genericPatterns) {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(cleanText)) !== null) {
      const rawSet = match[1];
      const rawNum = match[2];
      if (!rawSet || !rawNum) continue;

      const correctedSet = cleanOcrSetCode(rawSet, knownSets);
      const sLower = correctedSet.toLowerCase();
      const cardNum = cleanOcrCollectorNum(rawNum);
      const numPrefix = normalizeCollectorNum(cardNum);

      const matched =
        cardLookup.get(`${sLower}:${numPrefix}`) ||
        cardLookup.get(`${sLower}:${cardNum.toLowerCase()}`) ||
        cardLookup.get(`${sLower}:${normalizeCollectorNum(rawNum)}`);

      if (matched) {
        return {
          card: matched,
          extractedSet: matched.set?.id || correctedSet,
          extractedNumber: matched.collectorNumber || cardNum,
          rawMatchedSnippet: match[0].trim(),
          confidence: 0.9,
        };
      }
    }
  }

  // TIER 3: Broader proximity scan for set code and nearest 1-3 digit number
  for (const knownSet of sortedSets) {
    const aliases = getSetAliases(knownSet);
    const escaped = aliases.map((a) => a.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')).join('|');
    const setRegex = new RegExp(`(?:${escaped})[\\s\\S]{0,12}?(\\d{1,3})(?:[\\/-]\\d{1,3})?`, 'i');
    const match = cleanText.match(setRegex);
    if (match) {
      const numPrefix = normalizeCollectorNum(match[1]);
      const sLower = knownSet.toLowerCase();
      const matched = cardLookup.get(`${sLower}:${numPrefix}`);
      if (matched) {
        return {
          card: matched,
          extractedSet: matched.set?.id || knownSet,
          extractedNumber: matched.collectorNumber || match[1],
          rawMatchedSnippet: match[0].trim(),
          confidence: 0.8,
        };
      }
    }
  }

  return {
    card: null,
    extractedSet: null,
    extractedNumber: null,
    rawMatchedSnippet: null,
    confidence: 0,
  };
}

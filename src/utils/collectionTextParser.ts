import {
  isPokillionaireFormat,
  parsePokillionaireExport,
} from './pokillionaireParser';

export interface ParsedCollectionCard {
  cardId: string;
  setCode: string;
  collectorNumber: string;
  quantity: number;
  card: any;
}

export interface CollectionTextParseResult {
  cards: ParsedCollectionCard[];
  totalQuantity: number;
  distinctCardsCount: number;
  unmatchedLines: string[];
  setsFound: string[];
}

/**
 * Normalizes collector numbers by stripping leading zeros, hashes, and prefix abbreviations.
 * e.g. '#001' -> '1', '020' -> '20', '004a' -> '4a'
 */
export function normalizeCollectorNum(str: string): string {
  if (!str) return '';
  const trimmed = str.trim().toLowerCase().replace(/^#/, '').replace(/^no\.?\s*/i, '');
  return trimmed.replace(/^0+/, '') || '0';
}

/**
 * Check if a line is a Set header (e.g. 'Set SC1a', 'Set: SC1a', 'Set SV8', 'ชุด SC1a', '[SC1a]', 'SC1a', 'SV-P').
 * Pure numbers without 'Set' prefix are card numbers, not set headers.
 */
export function extractSetHeader(line: string, knownSets: Set<string>): string | null {
  const trimmed = line.trim().replace(/^\[|\]$/g, '').trim();
  if (!trimmed) return null;

  // Pattern 1: Explicit 'set', 's', or 'ชุด' prefix, e.g. 'Set SC1a', 'Set: SC1a', 'Set-SC1a', 'ชุด SC1a', 's: sv8'
  const setPrefixMatch = trimmed.match(/^(?:set|ชุด|s)\s*[:=-]?\s*([a-zA-Z0-9_-]+)$/i);
  if (setPrefixMatch) {
    const cand = setPrefixMatch[1].toLowerCase();
    for (const s of knownSets) {
      if (s.toLowerCase() === cand) return s;
    }
  }

  // Pattern 2: Alphanumeric set code that starts with letters (e.g. 'SC1a', 'SV8', 'S8a', 'SV-P')
  // Pure numbers (like '1', '13') or lines containing commas/colons must NOT match here so they can be parsed as card numbers.
  if (/^[a-zA-Z]/.test(trimmed) && !trimmed.includes(',') && !trimmed.includes(':') && !trimmed.includes('x') && !/\s+\d+$/.test(trimmed)) {
    for (const s of knownSets) {
      if (s.toLowerCase() === trimmed.toLowerCase()) {
        return s;
      }
    }
  }

  return null;
}

/**
 * Parses collection text or Pokillionaire JSON format.
 */
export function parseCollectionText(
  text: string,
  catalog: any[]
): CollectionTextParseResult {
  const trimmedText = text.trim();

  // If input starts with JSON object, check for Pokillionaire export format
  if (trimmedText.startsWith('{')) {
    try {
      const jsonData = JSON.parse(trimmedText);
      if (isPokillionaireFormat(jsonData)) {
        const pResult = parsePokillionaireExport(jsonData, catalog);
        return {
          cards: pResult.cards.map((c) => ({
            cardId: c.card.id,
            setCode: c.card.set?.id || c.sourceSetId,
            collectorNumber: c.sourceCardNumber,
            quantity: c.quantity,
            card: c.card,
          })),
          totalQuantity: pResult.totalQuantityCount,
          distinctCardsCount: pResult.distinctCardsCount,
          unmatchedLines: pResult.unmatched.map(
            (u) => `ชุด ${u.setId} #${u.cardNumber} (${u.cardName}): ${u.reason}`
          ),
          setsFound: pResult.setsFound,
        };
      }
    } catch {
      // Not valid JSON, proceed with standard text parser
    }
  }

  // Build lookup index for cards
  const cardLookup = new Map<string, any>();
  const knownSets = new Set<string>();

  for (const card of catalog) {
    const setId = card.set?.id;
    if (setId) {
      knownSets.add(setId);
      const setIdLower = setId.toLowerCase();
      const rawCn = card.collectorNumber || '';
      const prefix = rawCn.split(/[-/]/)[0];
      const normPrefix = normalizeCollectorNum(prefix);
      
      // Index by normalized prefix (e.g. "001-154" -> "1")
      cardLookup.set(`${setIdLower}:${normPrefix}`, card);

      // Index by full raw collector number normalized (e.g. "001-154" or "gra")
      const normFull = rawCn.trim().toLowerCase();
      if (normFull) {
        cardLookup.set(`${setIdLower}:${normFull}`, card);
      }

      // Index by localId if present
      if (card.localId) {
        cardLookup.set(`${setIdLower}:${normalizeCollectorNum(card.localId)}`, card);
      }

      // Index by direct card id
      if (card.id) {
        cardLookup.set(card.id.toLowerCase(), card);
      }
    }
  }

  const lines = text.split(/\r?\n/);
  let currentSet: string | null = null;
  const cardsMap = new Map<string, ParsedCollectionCard>();
  const unmatchedLines: string[] = [];
  const setsFound = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Skip empty lines and comment lines (e.g. "// comment" or "# comment")
    // Do NOT skip "#1" or "#001" which are card numbers!
    if (!trimmed || trimmed.startsWith('//') || /^#(?:[\s\t]|[a-zA-Z])/.test(trimmed)) {
      continue;
    }

    // Check if line is a Set Header
    const detectedSet = extractSetHeader(trimmed, knownSets);
    if (detectedSet) {
      currentSet = detectedSet;
      setsFound.add(detectedSet);
      continue;
    }

    // If we haven't seen a set header yet
    if (!currentSet) {
      unmatchedLines.push(
        `บรรทัดที่ ${i + 1}: "${trimmed}" (ยังไม่ได้ระบุรหัสชุด กรุณาใส่ "Set SC1a" ด้านบนบรรทัดนี้)`
      );
      continue;
    }

    // Try to parse card entry: "<num>,<qty>" or "<num> x <qty>" or "<num>"
    // Supports: "1,3", "20,5", "21", "1, 3", "20 x 5", "21: 1", "001, 3", "#21", "001-154, 3"
    const entryMatch = trimmed.match(/^#?\s*([a-zA-Z0-9_\-/]+)\s*(?:[,x:\s]\s*(\d+))?$/i);
    if (!entryMatch) {
      unmatchedLines.push(
        `บรรทัดที่ ${i + 1}: "${trimmed}" (รูปแบบการ์ดไม่ถูกต้อง ควรเป็น "<เลขการ์ด>,<จำนวน>" หรือ "<เลขการ์ด>")`
      );
      continue;
    }

    const rawNum = entryMatch[1];
    const rawQty = entryMatch[2];
    const cardNum = normalizeCollectorNum(rawNum);
    const numPrefix = normalizeCollectorNum(rawNum.split(/[-/]/)[0]);
    const rawNumLower = rawNum.trim().toLowerCase();
    const qty = rawQty !== undefined ? parseInt(rawQty, 10) : 1;

    if (isNaN(qty) || qty <= 0) {
      unmatchedLines.push(`บรรทัดที่ ${i + 1}: "${trimmed}" (จำนวนการ์ดต้องมากกว่า 0)`);
      continue;
    }

    const currentSetLower = currentSet.toLowerCase();
    const matchedCard =
      cardLookup.get(`${currentSetLower}:${cardNum}`) ||
      cardLookup.get(`${currentSetLower}:${numPrefix}`) ||
      cardLookup.get(`${currentSetLower}:${rawNumLower}`);

    if (!matchedCard) {
      unmatchedLines.push(
        `บรรทัดที่ ${i + 1}: "${trimmed}" (ไม่พบการ์ด #${rawNum} ในชุด ${currentSet})`
      );
      continue;
    }

    // Aggregate counts if the same card is listed multiple times in the text
    const existing = cardsMap.get(matchedCard.id);
    if (existing) {
      existing.quantity += qty;
    } else {
      cardsMap.set(matchedCard.id, {
        cardId: matchedCard.id,
        setCode: matchedCard.set?.id || currentSet,
        collectorNumber: matchedCard.collectorNumber || cardNum,
        quantity: qty,
        card: matchedCard,
      });
    }
  }

  const cards = Array.from(cardsMap.values());
  const totalQuantity = cards.reduce((acc, c) => acc + c.quantity, 0);

  return {
    cards,
    totalQuantity,
    distinctCardsCount: cards.length,
    unmatchedLines,
    setsFound: Array.from(setsFound),
  };
}

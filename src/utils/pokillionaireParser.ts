export interface PokillionaireCardRaw {
  setId: string;
  cardId?: string;
  cardNumber: string;
  cardName: string;
  quantity: number;
  ownerValue?: number;
}

export interface PokillionaireMatchedCard {
  card: any; // Card item from pokemonNames.json
  quantity: number;
  ownerValue?: number;
  sourceSetId: string;
  sourceCardNumber: string;
  sourceCardName: string;
}

export interface PokillionaireUnmatchedCard {
  setId: string;
  cardNumber: string;
  cardName: string;
  quantity: number;
  reason: string;
}

export interface PokillionaireParseResult {
  success: boolean;
  cards: PokillionaireMatchedCard[];
  unmatched: PokillionaireUnmatchedCard[];
  distinctCardsCount: number;
  totalQuantityCount: number;
  setsFound: string[];
}

/**
 * Check if the parsed JSON object matches the Pokillionaire export format.
 */
export function isPokillionaireFormat(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, any>;

  // Standard Pokillionaire export structure:
  // { collections: { thai: { ownedCards: [...] }, english: { ownedCards: [...] } } }
  if (obj.collections && typeof obj.collections === 'object') {
    const thai = obj.collections.thai;
    const english = obj.collections.english;
    if (
      (thai && (Array.isArray(thai.ownedCards) || Array.isArray(thai.deckCards))) ||
      (english && (Array.isArray(english.ownedCards) || Array.isArray(english.deckCards)))
    ) {
      return true;
    }
  }

  // Fallback: direct ownedCards array with setId and cardNumber
  if (Array.isArray(obj.ownedCards) && obj.ownedCards.length > 0) {
    const first = obj.ownedCards[0];
    if (first && typeof first === 'object' && ('setId' in first) && ('cardNumber' in first)) {
      return true;
    }
  }

  return false;
}

/**
 * Clean card name by stripping leading numbers e.g. "2 ยันยันมา" -> "ยันยันมา"
 */
export function cleanPokillionaireCardName(rawName: string): string {
  if (!rawName) return '';
  return rawName.replace(/^\d+\s*/, '').trim();
}

/**
 * Parse and match Pokillionaire raw cards against PokéCountTracker card database.
 */
export function parsePokillionaireExport(
  data: unknown,
  cardDatabase: any[]
): PokillionaireParseResult {
  if (!isPokillionaireFormat(data)) {
    return {
      success: false,
      cards: [],
      unmatched: [],
      distinctCardsCount: 0,
      totalQuantityCount: 0,
      setsFound: [],
    };
  }

  const obj = data as Record<string, any>;
  const rawCards: PokillionaireCardRaw[] = [];

  // Extract from collections.thai
  if (obj.collections?.thai?.ownedCards && Array.isArray(obj.collections.thai.ownedCards)) {
    rawCards.push(...obj.collections.thai.ownedCards);
  }
  // Extract from collections.english (if present)
  if (obj.collections?.english?.ownedCards && Array.isArray(obj.collections.english.ownedCards)) {
    rawCards.push(...obj.collections.english.ownedCards);
  }
  // Fallback to direct ownedCards
  if (rawCards.length === 0 && Array.isArray(obj.ownedCards)) {
    rawCards.push(...obj.ownedCards);
  }

  const matchedCards: PokillionaireMatchedCard[] = [];
  const unmatchedCards: PokillionaireUnmatchedCard[] = [];
  const setsFoundSet = new Set<string>();

  for (const raw of rawCards) {
    if (!raw.setId || raw.cardNumber === undefined || raw.cardNumber === null) {
      unmatchedCards.push({
        setId: raw.setId || 'UNKNOWN',
        cardNumber: String(raw.cardNumber || ''),
        cardName: raw.cardName || '',
        quantity: raw.quantity || 1,
        reason: 'ข้อมูลการ์ดไม่สมบูรณ์ (ขาด setId หรือ cardNumber)',
      });
      continue;
    }

    const rawSetId = String(raw.setId).trim();
    const rawCardNumberStr = String(raw.cardNumber).trim();
    const targetSetIdUpper = rawSetId.toUpperCase();
    const cardNumInt = parseInt(rawCardNumberStr, 10);
    const cleanName = cleanPokillionaireCardName(raw.cardName || '');
    const quantity = Math.max(1, Number(raw.quantity) || 1);

    // Filter candidates by set ID (case-insensitive)
    const setCandidates = cardDatabase.filter(
      (p) => p.set?.id && p.set.id.toUpperCase() === targetSetIdUpper
    );

    if (setCandidates.length === 0) {
      unmatchedCards.push({
        setId: rawSetId,
        cardNumber: rawCardNumberStr,
        cardName: raw.cardName || '',
        quantity,
        reason: `ไม่พบชุดการ์ดรหัส "${rawSetId}" ในระบบ`,
      });
      continue;
    }

    setsFoundSet.add(setCandidates[0].set.id || targetSetIdUpper);

    // Try matching by card number
    const numCandidates = setCandidates.filter((p) => {
      const pNumStr = (p.collectorNumber || '').split(/[-/]/)[0];
      return parseInt(pNumStr, 10) === cardNumInt;
    });

    let matchedCandidate: any = null;

    if (numCandidates.length === 1) {
      matchedCandidate = numCandidates[0];
    } else if (numCandidates.length > 1) {
      // Disambiguate using card name
      matchedCandidate =
        numCandidates.find((p) => p.name && p.name.trim() === cleanName) ||
        numCandidates.find((p) => p.name && (p.name.includes(cleanName) || cleanName.includes(p.name))) ||
        numCandidates[0];
    } else {
      // If number didn't match directly, try by cleaned name within set
      if (cleanName) {
        matchedCandidate = setCandidates.find((p) => p.name && p.name.trim() === cleanName);
      }
    }

    if (matchedCandidate) {
      matchedCards.push({
        card: matchedCandidate,
        quantity,
        ownerValue: raw.ownerValue,
        sourceSetId: rawSetId,
        sourceCardNumber: rawCardNumberStr,
        sourceCardName: raw.cardName || '',
      });
    } else {
      unmatchedCards.push({
        setId: rawSetId,
        cardNumber: rawCardNumberStr,
        cardName: raw.cardName || '',
        quantity,
        reason: `ไม่พบการ์ดหมายเลข "${rawCardNumberStr}" ในชุด "${rawSetId}"`,
      });
    }
  }

  const distinctCardsCount = new Set(matchedCards.map((m) => m.card.id)).size;
  const totalQuantityCount = matchedCards.reduce((acc, cur) => acc + cur.quantity, 0);

  return {
    success: matchedCards.length > 0,
    cards: matchedCards,
    unmatched: unmatchedCards,
    distinctCardsCount,
    totalQuantityCount,
    setsFound: Array.from(setsFoundSet),
  };
}

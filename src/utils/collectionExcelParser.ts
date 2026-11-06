import { normalizeCollectorNum } from './collectionTextParser';
import type { CardVariantKey } from '../types/collection';

export interface ParsedExcelCard {
  cardId: string;
  setCode: string;
  collectorNumber: string;
  quantity: number;
  variant: CardVariantKey;
  card: any;
  rawRow: Record<string, any>;
}

export interface CollectionExcelParseResult {
  cards: ParsedExcelCard[];
  totalQuantity: number;
  distinctCardsCount: number;
  unmatchedRows: {
    rowNumber: number;
    data: Record<string, any> | any[];
    reason: string;
  }[];
  setsFound: string[];
}

function parseVariant(val: any): CardVariantKey {
  if (!val) return 'normal';
  const str = String(val).trim().toLowerCase();
  if (str.includes('promo') || str.includes('โปรโม')) return 'promo';
  if (str.includes('reverse') || str.includes('mirror') || str.includes('รีเวิร์ส') || str.includes('มิลเลอร์')) return 'reverse';
  if (str.includes('holo') || str.includes('foil') || str.includes('โฮโล') || str.includes('ฟอยล์')) return 'holo';
  return 'normal';
}

/**
 * Builds lookup index maps for fast card matching.
 */
export function buildCardLookup(catalog: any[]) {
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

      // Index by full raw collector number normalized
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

  return { cardLookup, knownSets };
}

/**
 * Parses an Excel (.xlsx, .xls) or CSV/TSV file buffer.
 */
export async function parseExcelOrCsvData(
  data: ArrayBuffer | Uint8Array | string,
  catalog: any[]
): Promise<CollectionExcelParseResult> {
  const XLSX = await import('xlsx');

  const workbook = typeof data === 'string'
    ? XLSX.read(data, { type: 'string' })
    : XLSX.read(data, { type: 'array' });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return {
      cards: [],
      totalQuantity: 0,
      distinctCardsCount: 0,
      unmatchedRows: [{ rowNumber: 1, data: {}, reason: 'ไม่พบชีทข้อมูลในไฟล์' }],
      setsFound: [],
    };
  }

  const worksheet = workbook.Sheets[firstSheetName];
  // Parse rows as raw array of arrays first to inspect header vs content
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (!rawRows || rawRows.length === 0) {
    return {
      cards: [],
      totalQuantity: 0,
      distinctCardsCount: 0,
      unmatchedRows: [{ rowNumber: 1, data: {}, reason: 'ไฟล์ไม่มีข้อมูลแถว' }],
      setsFound: [],
    };
  }

  const { cardLookup, knownSets } = buildCardLookup(catalog);

  // Analyze first row for headers
  const firstRow = rawRows[0].map((c) => String(c || '').trim());
  let hasHeader = false;
  let setColIdx = -1;
  let numColIdx = -1;
  let qtyColIdx = -1;
  let variantColIdx = -1;
  let idColIdx = -1;

  const headerAliases = {
    set: ['set', 'setcode', 'set_code', 'set_id', 'setid', 'ชุด', 'รหัสชุด', 'expansion', 'series'],
    num: ['number', 'card_number', 'cardnumber', 'collector_number', 'no', 'num', 'เลข', 'เลขการ์ด', 'ลำดับ', 'หมายเลข'],
    qty: ['quantity', 'qty', 'count', 'จำนวน', 'total', 'amount'],
    variant: ['variant', 'foil', 'finish', 'แบบ', 'ชนิด', 'ประเภท'],
    id: ['id', 'card_id', 'cardid', 'รหัสการ์ด'],
  };

  firstRow.forEach((h, idx) => {
    const clean = h.toLowerCase().replace(/[^a-z0-9\u0E00-\u0E7F]/g, '');
    if (headerAliases.set.some((a) => clean === a || clean.includes(a))) setColIdx = idx;
    if (headerAliases.num.some((a) => clean === a || clean.includes(a))) numColIdx = idx;
    if (headerAliases.qty.some((a) => clean === a || clean.includes(a))) qtyColIdx = idx;
    if (headerAliases.variant.some((a) => clean === a || clean.includes(a))) variantColIdx = idx;
    if (headerAliases.id.some((a) => clean === a || clean.includes(a))) idColIdx = idx;
  });

  if (setColIdx !== -1 || numColIdx !== -1 || idColIdx !== -1) {
    hasHeader = true;
  }

  // Fallback positional heuristics if no headers found
  if (!hasHeader) {
    // Check if column 0 looks like a set code, column 1 is a number
    setColIdx = 0;
    numColIdx = 1;
    qtyColIdx = 2;
    variantColIdx = 3;
  }

  const startRowIdx = hasHeader ? 1 : 0;
  const cardsMap = new Map<string, ParsedExcelCard>();
  const unmatchedRows: CollectionExcelParseResult['unmatchedRows'] = [];
  const setsFound = new Set<string>();

  for (let i = startRowIdx; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.every((c) => c === '' || c === null || c === undefined)) {
      continue; // Skip empty rows
    }

    const rowNumber = i + 1;
    let rawSet = setColIdx >= 0 && row[setColIdx] ? String(row[setColIdx]).trim() : '';
    let rawNum = numColIdx >= 0 && row[numColIdx] ? String(row[numColIdx]).trim() : '';
    const rawId = idColIdx >= 0 && row[idColIdx] ? String(row[idColIdx]).trim() : '';
    const rawQtyVal = qtyColIdx >= 0 && row[qtyColIdx] !== '' ? row[qtyColIdx] : 1;
    const parsedQty = parseInt(String(rawQtyVal), 10);
    const quantity = !isNaN(parsedQty) && parsedQty > 0 ? parsedQty : 1;
    const variant = variantColIdx >= 0 ? parseVariant(row[variantColIdx]) : 'normal';

    let matchedCard: any = null;

    // 1. Try matching by direct card id if available (e.g. 'TH-1' or 'SV8a-025')
    if (rawId) {
      const byId = cardLookup.get(rawId.toLowerCase());
      if (byId) {
        matchedCard = byId;
        rawSet = byId.set?.id || rawSet;
        rawNum = byId.collectorNumber || rawNum;
      }
    }

    // 2. If row[0] contains a combined string like "SV8a 025" or "SV8a-025" or "SC1a #1"
    if (!matchedCard && (!rawSet || !rawNum)) {
      const combined = String(row[0] || '').trim();
      const combinedMatch = combined.match(/^([a-zA-Z0-9_\-]+)[\s:\-#/]+([a-zA-Z0-9_\-/]+)/);
      if (combinedMatch) {
        rawSet = combinedMatch[1];
        rawNum = combinedMatch[2];
      }
    }

    // 3. Match by Set + Collector Number
    if (!matchedCard && rawSet && rawNum) {
      const sLower = rawSet.toLowerCase();
      const numPrefix = normalizeCollectorNum(rawNum.split(/[-/]/)[0]);
      const normFull = rawNum.trim().toLowerCase();

      matchedCard =
        cardLookup.get(`${sLower}:${numPrefix}`) ||
        cardLookup.get(`${sLower}:${normFull}`) ||
        cardLookup.get(`${sLower}:${normalizeCollectorNum(rawNum)}`);

      // Fuzzy matching for set if case or suffix was slightly off
      if (!matchedCard) {
        for (const known of knownSets) {
          if (known.toLowerCase() === sLower) {
            matchedCard =
              cardLookup.get(`${known.toLowerCase()}:${numPrefix}`) ||
              cardLookup.get(`${known.toLowerCase()}:${normFull}`);
            if (matchedCard) break;
          }
        }
      }
    }

    if (!matchedCard) {
      unmatchedRows.push({
        rowNumber,
        data: row,
        reason: `ไม่พบการ์ดรหัสชุด "${rawSet || '-'}" หมายเลข "${rawNum || '-'}"`,
      });
      continue;
    }

    const setId = matchedCard.set?.id || rawSet;
    const colNum = matchedCard.collectorNumber || rawNum;
    setsFound.add(setId);

    // Group cards by cardId + variant
    const key = `${matchedCard.id}_${variant}`;
    const existing = cardsMap.get(key);
    if (existing) {
      existing.quantity += quantity;
    } else {
      const rowObj: Record<string, any> = {};
      row.forEach((val, idx) => {
        const headerName = hasHeader && firstRow[idx] ? firstRow[idx] : `col_${idx}`;
        rowObj[headerName] = val;
      });

      cardsMap.set(key, {
        cardId: matchedCard.id,
        setCode: setId,
        collectorNumber: colNum,
        quantity,
        variant,
        card: matchedCard,
        rawRow: rowObj,
      });
    }
  }

  const cards = Array.from(cardsMap.values());
  const totalQuantity = cards.reduce((sum, c) => sum + c.quantity, 0);

  return {
    cards,
    totalQuantity,
    distinctCardsCount: cards.length,
    unmatchedRows,
    setsFound: Array.from(setsFound).sort(),
  };
}

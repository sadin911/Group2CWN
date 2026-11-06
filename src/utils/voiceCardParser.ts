import type { CardVariantKey } from '../types/collection';
import { normalizeCollectorNum } from './collectionTextParser';
import { createCardMatcher } from './searchHelpers';

export interface VoiceParsedCardMatch {
  card: any;
  quantity: number;
  variant: CardVariantKey;
  confidence: number;
}

export interface VoiceCardParseResult {
  type: 'card' | 'set_change' | 'command' | 'unknown';
  command?: 'undo' | 'clear' | 'increase_last' | 'decrease_last' | 'confirm';
  newActiveSet?: string;
  matchedCard?: any;
  candidates?: any[];
  quantity: number;
  variant: CardVariantKey;
  parsedInfo: {
    rawText: string;
    detectedSet?: string;
    detectedNumber?: string;
    detectedName?: string;
    detectedQty?: number;
    detectedVariant?: CardVariantKey;
  };
  feedbackMessage?: string;
}

// Thai word to number converter (0 - 999)
const THAI_DIGIT_WORDS: Record<string, number> = {
  ศูนย์: 0,
  หนึ่ง: 1,
  สอง: 2,
  สาม: 3,
  สี่: 4,
  ห้า: 5,
  หก: 6,
  เจ็ด: 7,
  แปด: 8,
  เก้า: 9,
};

/**
 * Converts Thai number phrase like 'ยี่สิบห้า', 'หนึ่งร้อยยี่สิบ', 'สิบสอง', 'สาม' into number.
 * Returns null if the string is not a Thai number word phrase.
 */
export function parseThaiNumberWords(raw: string): number | null {
  const str = raw.trim().replace(/\s+/g, '');
  if (!str) return null;

  // Direct single digit
  if (THAI_DIGIT_WORDS[str] !== undefined) {
    return THAI_DIGIT_WORDS[str];
  }

  let total = 0;
  let remaining = str;

  // Hundred (ร้อย)
  const hundredIdx = remaining.indexOf('ร้อย');
  if (hundredIdx !== -1) {
    const hundredPart = remaining.slice(0, hundredIdx);
    const multiplier = THAI_DIGIT_WORDS[hundredPart] || (hundredPart === '' ? 1 : null);
    if (multiplier === null) return null;
    total += multiplier * 100;
    remaining = remaining.slice(hundredIdx + 4);
    if (!remaining) return total;
  }

  // Tens (สิบ)
  const tenIdx = remaining.indexOf('สิบ');
  if (tenIdx !== -1) {
    const tenPart = remaining.slice(0, tenIdx);
    let multiplier = 1;
    if (tenPart === 'ยี่') {
      multiplier = 2;
    } else if (tenPart === '' || tenPart === 'หนึ่ง') {
      multiplier = 1;
    } else if (THAI_DIGIT_WORDS[tenPart] !== undefined) {
      multiplier = THAI_DIGIT_WORDS[tenPart];
    } else {
      return null;
    }
    total += multiplier * 10;
    remaining = remaining.slice(tenIdx + 3);
    if (!remaining) return total;
  }

  // Units
  if (remaining === 'เอ็ด') {
    total += 1;
  } else if (THAI_DIGIT_WORDS[remaining] !== undefined) {
    total += THAI_DIGIT_WORDS[remaining];
  } else if (remaining !== '') {
    return null;
  }

  return total > 0 ? total : null;
}

/**
 * Normalizes speech text for Thai/English card recognition.
 */
export function normalizeSpeechText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[,\.?!'"’`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Known phonetic mappings for Set Codes from speech-to-text.
 */
const SET_SPEECH_MAPPINGS: Record<string, string> = {
  'เอสวี 8 เอ': 'SV8a',
  'เอสวี 8a': 'SV8a',
  'เอสวี 8': 'SV8',
  'เอสวีแปดเอ': 'SV8a',
  'เอสวีแปด': 'SV8',
  'เอสวี 7 เอส': 'SV7s',
  'เอสวี 7': 'SV7',
  'เอสวีเจ็ด': 'SV7',
  'เอสวี พี': 'SV-P',
  'เอสวีพี': 'SV-P',
  'เอสซี 1 เอ': 'SC1a',
  'เอสซีหนึ่งเอ': 'SC1a',
  'เอสซี 1': 'SC1a',
  'เอสซีหนึ่ง': 'SC1a',
  'ซอร์ด แอนด์ ชีลด์': 'SC1a',
  'เมก้า ดรีม': 'M1',
  'เมก้า': 'M1',
  'สตาร์เตอร์': 'SVD',
};

/**
 * Detects if the utterance is a Voice Command.
 */
export function detectVoiceCommand(
  text: string
): 'undo' | 'clear' | 'increase_last' | 'decrease_last' | 'confirm' | null {
  const norm = normalizeSpeechText(text);

  // Undo
  if (
    /^(?:ลบ|ลบล่าสุด|ลบอันล่าสุด|ลบใบสุดท้าย|ยกเลิก|ย้อนกลับ|undo|remove last|delete last)$/.test(
      norm
    ) ||
    norm.includes('ลบอันล่าสุด') ||
    norm.includes('ลบใบสุดท้าย')
  ) {
    return 'undo';
  }

  // Clear
  if (
    /^(?:ล้าง|ล้างหมด|ล้างทั้งหมด|เคลียร์|เคลียร์ทั้งหมด|clear|clear all|reset)$/.test(
      norm
    ) ||
    norm.includes('ล้างทั้งหมด') ||
    norm.includes('ล้างข้อมูล')
  ) {
    return 'clear';
  }

  // Increase Last
  if (
    /^(?:เพิ่ม|เพิ่มอีกใบ|เพิ่ม 1|อีกใบ|บวกหนึ่ง|บวก 1|add more|plus one)$/.test(
      norm
    ) ||
    norm.includes('เพิ่มอีกใบ') ||
    norm.includes('บวกอีกใบ')
  ) {
    return 'increase_last';
  }

  // Decrease Last
  if (
    /^(?:ลด|ลดหนึ่งใบ|ลด 1|ลบหนึ่งใบ|ลบ 1 ใบ|minus one)$/.test(norm) ||
    norm.includes('ลดหนึ่งใบ')
  ) {
    return 'decrease_last';
  }

  // Confirm / Import
  if (
    /^(?:บันทึก|นำเข้า|เซฟ|ยืนยัน|เรียบร้อย|save|import|confirm|done)$/.test(norm) ||
    norm.includes('บันทึกการ์ด') ||
    norm.includes('ยืนยันนำเข้า')
  ) {
    return 'confirm';
  }

  return null;
}

/**
 * Detects Set code from utterance.
 */
export function detectSetFromSpeech(
  text: string,
  knownSets: Set<string>
): string | null {
  const norm = normalizeSpeechText(text);

  // 1. Direct phonetic dictionary match
  for (const [phrase, code] of Object.entries(SET_SPEECH_MAPPINGS)) {
    if (norm.includes(phrase.toLowerCase())) {
      return code;
    }
  }

  // 2. Pattern: "ชุด [set]" or "เซ็ต [set]" or "set [set]"
  const setPrefixMatch = norm.match(/(?:ชุด|เซ็ต|เซต|set|s)\s*[:=-]?\s*([a-z0-9_-]+)/i);
  if (setPrefixMatch) {
    const rawCand = setPrefixMatch[1].toLowerCase();
    for (const s of knownSets) {
      if (s.toLowerCase() === rawCand) {
        return s;
      }
    }
    // Handle without hyphen e.g. "svp" -> "SV-P"
    for (const s of knownSets) {
      if (s.toLowerCase().replace(/[-_]/g, '') === rawCand.replace(/[-_]/g, '')) {
        return s;
      }
    }
  }

  // 3. Check direct mention of known set in text
  for (const s of knownSets) {
    const sLower = s.toLowerCase();
    const regex = new RegExp(`\\b${sLower}\\b`, 'i');
    if (regex.test(norm)) {
      return s;
    }
  }

  return null;
}

/**
 * Detects quantity from speech utterance.
 * e.g. "สองใบ" -> 2, "3 ใบ" -> 3, "สี่แผ่น" -> 4, "x2" -> 2
 */
export function detectQuantityFromSpeech(text: string): {
  quantity: number;
  cleanedText: string;
} {
  let cleaned = text;

  // Pattern 1: Number + ใบ/แผ่น/copies/cards (e.g. "2 ใบ", "3 แผ่น")
  const numUnitMatch = cleaned.match(/(\d+)\s*(?:ใบ|แผ่น|copies|copy|cards|card|x)/i);
  if (numUnitMatch) {
    const qty = parseInt(numUnitMatch[1], 10);
    cleaned = cleaned.replace(numUnitMatch[0], ' ').trim();
    if (qty > 0 && qty <= 99) {
      return { quantity: qty, cleanedText: cleaned };
    }
  }

  // Pattern 2: Thai word + ใบ/แผ่น (e.g. "สองใบ", "สามใบ", "สี่ใบ", "หนึ่งใบ")
  const thaiWordMatch = cleaned.match(
    /(หนึ่ง|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า|สิบ|ยี่สิบ)\s*(?:ใบ|แผ่น)/
  );
  if (thaiWordMatch) {
    const num = parseThaiNumberWords(thaiWordMatch[1]);
    cleaned = cleaned.replace(thaiWordMatch[0], ' ').trim();
    if (num && num > 0) {
      return { quantity: num, cleanedText: cleaned };
    }
  }

  // Pattern 3: Trailing 'x<num>' or 'คูณ <num>'
  const xMatch = cleaned.match(/(?:x|คูณ|\*)\s*(\d+)/i);
  if (xMatch) {
    const qty = parseInt(xMatch[1], 10);
    cleaned = cleaned.replace(xMatch[0], ' ').trim();
    if (qty > 0 && qty <= 99) {
      return { quantity: qty, cleanedText: cleaned };
    }
  }

  return { quantity: 1, cleanedText: cleaned };
}

/**
 * Detects card variant / finish from speech utterance.
 */
export function detectVariantFromSpeech(text: string): {
  variant: CardVariantKey;
  cleanedText: string;
} {
  const norm = text.toLowerCase();
  let cleaned = text;

  if (/โฮโล|holo|ฟอยล์|foil|เอสเออาร์|sar\b|เออาร์|ar\b|เอสอาร์|sr\b|ยูอาร์|ur\b/.test(norm)) {
    cleaned = cleaned
      .replace(/โฮโล|holo|ฟอยล์|foil|เอสเออาร์|sar\b|เออาร์|ar\b|เอสอาร์|sr\b|ยูอาร์|ur\b/gi, ' ')
      .trim();
    return { variant: 'holo', cleanedText: cleaned };
  }

  if (/รีเวิร์ส|reverse/.test(norm)) {
    cleaned = cleaned.replace(/รีเวิร์ส|reverse/gi, ' ').trim();
    return { variant: 'reverse', cleanedText: cleaned };
  }

  if (/โปรโม|promo/.test(norm)) {
    cleaned = cleaned.replace(/โปรโม|promo/gi, ' ').trim();
    return { variant: 'promo', cleanedText: cleaned };
  }

  return { variant: 'normal', cleanedText: cleaned };
}

/**
 * Detects card number from speech text.
 * e.g. "เบอร์ 25", "เลข 025", "25/187", "เบอร์ยี่สิบห้า", "number 25"
 */
export function detectCardNumberFromSpeech(text: string): {
  number: string | null;
  cleanedText: string;
} {
  let cleaned = text;

  // 1. Explicit pattern: 'เบอร์ 25', 'หมายเลข 25', 'เลข 25', 'number 25', 'no. 25', '#25'
  const explicitMatch = cleaned.match(
    /(?:เบอร์|หมายเลข|เลข|ลำดับที่|number|no\.?|#)\s*([0-9]{1,4}(?:[-/][0-9]{1,4})?|[a-z0-9_-]+)/i
  );
  if (explicitMatch) {
    const rawNum = explicitMatch[1];
    cleaned = cleaned.replace(explicitMatch[0], ' ').trim();
    return { number: rawNum, cleanedText: cleaned };
  }

  // 2. Pattern: 'เบอร์ <คำอ่านไทย>' e.g. 'เบอร์ ยี่สิบห้า', 'เลข หนึ่งร้อย'
  const explicitThaiWordMatch = cleaned.match(
    /(?:เบอร์|หมายเลข|เลข)\s*([หนึ่งสองสามสี่ห้าหกเจ็ดแปดเก้าสิบเอ็ดยี่ร้อย]+)/
  );
  if (explicitThaiWordMatch) {
    const num = parseThaiNumberWords(explicitThaiWordMatch[1]);
    if (num !== null) {
      cleaned = cleaned.replace(explicitThaiWordMatch[0], ' ').trim();
      return { number: String(num), cleanedText: cleaned };
    }
  }

  // 3. Fraction collector number pattern: '025/187' or '025-187'
  const fractionMatch = cleaned.match(/\b([0-9]{1,4}[-/][0-9]{1,4})\b/);
  if (fractionMatch) {
    const rawNum = fractionMatch[1];
    cleaned = cleaned.replace(fractionMatch[0], ' ').trim();
    return { number: rawNum, cleanedText: cleaned };
  }

  // 4. Standalone digits in text e.g. '25' or '025'
  const standaloneDigits = cleaned.match(/\b([0-9]{1,4})\b/);
  if (standaloneDigits) {
    const rawNum = standaloneDigits[1];
    cleaned = cleaned.replace(standaloneDigits[0], ' ').trim();
    return { number: rawNum, cleanedText: cleaned };
  }

  // 5. Standalone Thai number word phrase e.g. 'ยี่สิบห้า', 'หนึ่งร้อยยี่สิบ', 'สิบสอง', 'ห้า'
  const thaiWordTokens = cleaned.match(/([หนึ่งสองสามสี่ห้าหกเจ็ดแปดเก้าสิบเอ็ดยี่ร้อย]+)/);
  if (thaiWordTokens) {
    const num = parseThaiNumberWords(thaiWordTokens[1]);
    if (num !== null) {
      cleaned = cleaned.replace(thaiWordTokens[0], ' ').trim();
      return { number: String(num), cleanedText: cleaned };
    }
  }

  return { number: null, cleanedText: cleaned };
}

/**
 * Main Voice Card Parsing Engine.
 * Analyzes spoken text and extracts card matches, set context, or voice commands.
 */
export function parseVoiceInput(
  rawTranscript: string,
  catalog: any[],
  currentActiveSet?: string | null
): VoiceCardParseResult {
  const norm = normalizeSpeechText(rawTranscript);

  if (!norm) {
    return {
      type: 'unknown',
      quantity: 1,
      variant: 'normal',
      parsedInfo: { rawText: rawTranscript },
    };
  }

  // 1. Check if it is a Voice Command
  const command = detectVoiceCommand(norm);
  if (command) {
    let msg = '';
    switch (command) {
      case 'undo':
        msg = 'ยกเลิกการ์ดล่าสุดแล้ว';
        break;
      case 'clear':
        msg = 'ล้างรายการการ์ดทั้งหมดแล้ว';
        break;
      case 'increase_last':
        msg = 'เพิ่มจำนวนการ์ดล่าสุดแล้ว (+1)';
        break;
      case 'decrease_last':
        msg = 'ลดจำนวนการ์ดล่าสุดแล้ว (-1)';
        break;
      case 'confirm':
        msg = 'ยืนยันนำเข้าการ์ดเข้าสมุดสะสม';
        break;
    }
    return {
      type: 'command',
      command,
      quantity: 1,
      variant: 'normal',
      parsedInfo: { rawText: rawTranscript },
      feedbackMessage: msg,
    };
  }

  // Collect known sets from catalog
  const knownSets = new Set<string>();
  const cardLookupBySetAndNum = new Map<string, any>();

  for (const card of catalog) {
    const setId = card.set?.id;
    if (setId) {
      knownSets.add(setId);
      const sLower = setId.toLowerCase();
      const rawCn = card.collectorNumber || card.localId || '';
      const normCn = normalizeCollectorNum(rawCn);
      const prefix = normalizeCollectorNum(rawCn.split(/[-/]/)[0]);

      if (normCn) cardLookupBySetAndNum.set(`${sLower}:${normCn}`, card);
      if (prefix) cardLookupBySetAndNum.set(`${sLower}:${prefix}`, card);
      if (card.localId) {
        cardLookupBySetAndNum.set(`${sLower}:${normalizeCollectorNum(card.localId)}`, card);
      }
    }
  }

  // 2. Check Set detection
  const detectedSet = detectSetFromSpeech(norm, knownSets);
  const effectiveSet = detectedSet || currentActiveSet || null;

  // 3. Extract quantity & variant
  const { quantity, cleanedText: textAfterQty } = detectQuantityFromSpeech(norm);
  const { variant, cleanedText: textAfterVariant } = detectVariantFromSpeech(textAfterQty);

  // 4. Check if the utterance is purely a Set Change command (e.g. "ชุด SV8", "เซ็ต SV8a")
  const isPureSetChange =
    detectedSet &&
    (norm.startsWith('ชุด') || norm.startsWith('เซ็ต') || norm.startsWith('set')) &&
    !/\d{1,4}/.test(textAfterVariant.replace(detectedSet.toLowerCase(), '')) &&
    textAfterVariant.replace(detectedSet.toLowerCase(), '').trim().length <= 4;

  if (isPureSetChange) {
    return {
      type: 'set_change',
      newActiveSet: detectedSet,
      quantity: 1,
      variant: 'normal',
      parsedInfo: {
        rawText: rawTranscript,
        detectedSet,
      },
      feedbackMessage: `สลับเป็นชุด ${detectedSet} แล้ว`,
    };
  }

  // 5. Extract Card Number
  // Remove detected set string from text to avoid false number matches (e.g. "sv8" -> 8)
  let textForNum = textAfterVariant;
  if (detectedSet) {
    textForNum = textForNum.replace(new RegExp(`\\b${detectedSet}\\b`, 'i'), ' ');
  }

  const { number: detectedNumber, cleanedText: remainingText } =
    detectCardNumberFromSpeech(textForNum);

  // Case A: We have Set + Number
  if (effectiveSet && detectedNumber) {
    const normNum = normalizeCollectorNum(detectedNumber);
    const prefixNum = normalizeCollectorNum(detectedNumber.split(/[-/]/)[0]);
    const setKey = effectiveSet.toLowerCase();

    const matched =
      cardLookupBySetAndNum.get(`${setKey}:${normNum}`) ||
      cardLookupBySetAndNum.get(`${setKey}:${prefixNum}`);

    if (matched) {
      return {
        type: 'card',
        matchedCard: matched,
        quantity,
        variant,
        parsedInfo: {
          rawText: rawTranscript,
          detectedSet: effectiveSet,
          detectedNumber,
          detectedQty: quantity,
          detectedVariant: variant,
        },
        feedbackMessage: `เพิ่ม ${matched.name} #${detectedNumber} (${effectiveSet}) x${quantity}`,
      };
    }
  }

  // Case B: We have a Card Name spoken (Thai or English) e.g. "พิคาชู", "ลิซาร์ดอน ex", "Iono"
  const cleanRemaining = remainingText.trim();
  const searchPhrase = cleanRemaining || norm;

  if (searchPhrase.length >= 2) {
    const matcher = createCardMatcher(searchPhrase);

    // If active set is present, search within active set first
    let matchingCards: any[] = [];
    if (effectiveSet) {
      matchingCards = catalog.filter(
        (c) => c.set?.id?.toLowerCase() === effectiveSet.toLowerCase() && matcher(c)
      );
    }

    // If nothing found in active set or no active set, search across all sets
    if (matchingCards.length === 0) {
      matchingCards = catalog.filter(matcher);
    }

    if (matchingCards.length > 0) {
      const primaryMatch = matchingCards[0];
      const candidates = matchingCards.length > 1 ? matchingCards.slice(0, 8) : undefined;

      return {
        type: 'card',
        matchedCard: primaryMatch,
        candidates,
        quantity,
        variant,
        parsedInfo: {
          rawText: rawTranscript,
          detectedSet: effectiveSet || primaryMatch.set?.id,
          detectedNumber: detectedNumber || primaryMatch.collectorNumber,
          detectedName: primaryMatch.name,
          detectedQty: quantity,
          detectedVariant: variant,
        },
        feedbackMessage: `เพิ่ม ${primaryMatch.name} (${primaryMatch.set?.id || ''}) x${quantity}`,
      };
    }
  }

  // Case C: Utterance had a set change along with unrecognized content
  if (detectedSet) {
    return {
      type: 'set_change',
      newActiveSet: detectedSet,
      quantity: 1,
      variant: 'normal',
      parsedInfo: {
        rawText: rawTranscript,
        detectedSet,
      },
      feedbackMessage: `สลับเป็นชุด ${detectedSet} แล้ว`,
    };
  }

  // Unrecognized input
  return {
    type: 'unknown',
    quantity,
    variant,
    parsedInfo: {
      rawText: rawTranscript,
      detectedNumber: detectedNumber || undefined,
      detectedQty: quantity,
      detectedVariant: variant,
    },
    feedbackMessage: `ไม่พบการ์ดที่ตรงกับ "${rawTranscript}"`,
  };
}

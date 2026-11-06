// @ts-check
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const THAI_CARDS_FILE = path.join(ROOT_DIR, 'src', 'data', 'pokemonNames.json');
const TRANSLATIONS_FILE = path.join(ROOT_DIR, 'src', 'data', 'pokemonNameTranslations.json');
const CARD_MAP_FILE = path.join(ROOT_DIR, 'src', 'data', 'thaiEnglishCardMap.json');
const EN_SETS_FILE = path.join(ROOT_DIR, 'src', 'data', 'pokemonSetsEn.json');
const OUTPUT_META_DECKS_FILE = path.join(ROOT_DIR, 'src', 'data', 'metaDecks.json');

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)';

/**
 * Basic Energy names mapping (EN -> TH)
 */
const BASIC_ENERGIES_MAP = {
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
 * Playstyle, Pros & Cons metadata by Archetype name keyword
 */
const ARCHETYPE_INFO = {
  'dragapult': {
    playstyle: 'Setup',
    pros: ['แดเมจกระจายตีเบนช์ทรงพลัง (Phantom Dive)', 'มีเอนจิ้นโดรอนจิจั่วการ์ดเสถียรมาก', 'พลังชีวิตสูง 320 HP รับมือยาก'],
    cons: ['แพ้ทางโปเกมอนที่กันแดเมจบนเบนช์ เช่น มิว/มานาฟี', 'ใช้เวลาเซ็ตโปเกมอนร่าง 2'],
  },
  'basic box': {
    playstyle: 'Toolbox',
    pros: ['ไม่ต้องรอวิวัฒนาการ เล่นเร็วและยืดหยุ่นสูง', 'มีตัวตีหลากหลายธาตุรับมือได้ทุกเมต้า', 'ดึงการ์ดแก้ทางได้ง่าย'],
    cons: ['ตัวตีเป็นโปเกมอน Basic อาจมีเพดานแดเมจจำกัดในบางรอบ', 'แพ้การ์ดล็อกไอเทม/ความสามารถ Basic'],
  },
  'alakazam': {
    playstyle: 'Control',
    pros: ['โจมตีจากบนเบนช์ได้ ปลอดภัยจากตัวตีหน้าสนาม', 'มือหนาจั่วการ์ดมหาศาล ยิ่งการ์ดในมือเยอะยิ่งตีแรง', 'คุมจังหวะเกมได้เฉียบขาด'],
    cons: ['แพ้การ์ดรีเซ็ตมือ (Iono / Judge / Roxanne)', 'ต้องใช้เวลาสะสมการ์ดบนมือ'],
  },
  'zoroark': {
    playstyle: 'Toolbox',
    pros: ['อบิลิตี้เปลี่ยนร่างก็อปปี้สกิลโปเกมอน Basic Stage 1 ได้อิสระ', 'แก้ทางได้แทบทุกสถานการณ์', 'ใช้ของคู่แข่งเป็นประโยชน์'],
    cons: ['ต้องพึ่งพาการทิ้งการ์ดลงสุสาน', 'กินทรัพยากรการ์ดบนมือสูง'],
  },
  'slowking': {
    playstyle: 'Single Prize',
    pros: ['แลก Prize คุ้มค่า แจกเพียง 1 Prize เมื่อหมดสภาพ', 'สุ่มใช้ท่าโจมตีทรงพลังจากการ์ดบนสุดของกองการ์ด', 'ประหยัดงบประกอบเด็ค'],
    cons: ['ต้องพึ่งดวงหรือการเซ็ตกองการ์ดให้แม่นยำ', 'พลังชีวิตน้อย โดนเก็บง่าย'],
  },
  'excadrill': {
    playstyle: 'Setup',
    pros: ['ขุดทรัพยากรและเร่งพลังงานโลหะได้อย่างรวดเร็ว', 'เมก้าวิวัฒนาการเพิ่มพลังบุกมหาศาล', 'ทนทานต่อการโจมตียอดนิยม'],
    cons: ['แพ้ทางธาตุไฟหนักมาก', 'หากโดนขัดขวางจังหวะตั้งตัวจะชะงัก'],
  },
  'festival': {
    playstyle: 'Single Prize',
    pros: ['โจมตีได้สองครั้งในเทิร์นเดียวจากอบิลิตี้ Festival Lead', 'เด็คตัวเล็ก Prize Trade ได้เปรียบสูง', 'คอมโบกับ Festival Grounds'],
    cons: ['ต้องพึ่งพาสเตเดียม Festival Grounds อย่างต่อเนื่อง', 'HP ต่ำ เสี่ยงโดนแดเมจกระจายกวาดเรียบ'],
  },
  'clefairy': {
    playstyle: 'Aggro',
    pros: ['เร่งพลังงานพลังจิตได้ไวติดสปีด', 'แดเมจพุ่งทะลุตามจำนวนพลังงานบนบอร์ด', 'เริ่มเกมเร็ว บดขยี้ไว'],
    cons: ['ตัวบาง โดน One-Hit KO ได้ง่าย', 'หากเสียกระดานพลังงานจะกู้คืนลำบาก'],
  },
  'crustle': {
    playstyle: 'Control',
    pros: ['อบิลิตี้บล็อกการโจมตีจากโปเกมอนที่มีอบิลิตี้หรือพลังงานพิเศษ', 'ทำให้คู่แข่งเล่นไม่ออกและทรัพยากรหมด', 'เกมยืดเยื้อได้เปรียบ'],
    cons: ['จังหวะจบเกมช้า', 'แพ้การ์ดที่ยกเลิกอบิลิตี้ (เช่น Iron Thorns / Cologne)'],
  },
  'raging bolt': {
    playstyle: 'Aggro',
    pros: ['ทิ้งพลังงานทำแดเมจแบบไร้ขีดจำกัด One-Hit KO โปเกมอนตัวใหญ่ได้ทุกตัว', 'จับคู่ Ogerpon เร่งพลังงานเร็วที่สุดในเมต้า'],
    cons: ['แจก 2 Prize ทุกตัว เสียจังหวะแล้วกู้ยาก', 'ทิ้งพลังงานบ่อย ต้องบริหารการ์ดกู้พลังงาน'],
  },
  'grimmsnarl': {
    playstyle: 'Control',
    pros: ['รบกวนพลังงานและตัวป่วนของฝ่ายตรงข้าม', 'ตัดโอกาสการโจมตีของคู่แข่งอย่างต่อเนื่อง', 'พลังป้องกันสูง'],
    cons: ['แดเมจไม่สูงมาก ปิดเกมช้า', 'ต้องคำนวณการใช้ทรัพยากรอย่างละเอียด'],
  },
  'lopunny': {
    playstyle: 'Aggro',
    pros: ['ความคล่องตัวสูง ถอยหนีและสลับตัวได้ฟรี', 'คอมโบโจมตีฉับพลัน', 'ใช้พลังงานน้อย'],
    cons: ['พลังทำลายล้างสูงสุดยังไม่ทะลุโปเกมอน HP 330+', 'เปราะบางต่อการโจมตีสวนกลับ'],
  },
  'lucario': {
    playstyle: 'Aggro',
    pros: ['ธาตุต่อสู้แก้ทางโปเกมอนไร้สีและสายฟ้าในเมต้า', 'แดเมจเพิ่มขึ้นตามโปเกมอนที่บาดเจ็บ', 'เร่งเครื่องได้เร็ว'],
    cons: ['แพ้ทางธาตุพลังจิต', 'ต้องบริหารตัวเจ็บอย่างระมัดระวัง'],
  },
  'dhelmise': {
    playstyle: 'Control',
    pros: ['ซ่อนตัวหลบการโจมตีและดึงโปเกมอนคู่แข่งมาขัง', 'ทำให้ฝ่ายตรงข้ามติดสถานะผิดปกติ', 'สกัดแผนบุกของศัตรู'],
    cons: ['พลังโจมตีต่ำ', 'แพ้การ์ดไอเทมประเภทสลับตัวจำนวนมาก'],
  },
  'hydrapple': {
    playstyle: 'Setup',
    pros: ['ฮีลพลังชีวิตได้มหาศาลทุกเทิร์น', 'ยิ่งพลังงานพืชเยอะ ยิ่งตีแรง', 'ยืนบอร์ดอึดยากจะล้มลงได้'],
    cons: ['แพ้ทางธาตุไฟ', 'ต้องใช้เวลาตั้งต้นบอร์ดหลายเทิร์น'],
  },
  'toxtricity': {
    playstyle: 'Aggro',
    pros: ['ปล่อยพิษและแดเมจพุ่งฉับพลัน', 'ค่าร่ายพลังงานต่ำ โจมตีได้ต่อเนื่อง', 'กดดัน HP ฝ่ายตรงข้ามทุกช่วงจบเทิร์น'],
    cons: ['แพ้การ์ดฮีลและโปเกมอนสายป้องกัน', 'ความทนทานในสนามปานกลาง'],
  },
  'absol': {
    playstyle: 'Toolbox',
    pros: ['ย้ายเคาน์เตอร์แดเมจ ป่วนบอร์ดอย่างชาญฉลาด', 'ใช้การ์ดตัดจังหวะสไตล์ความมืด', 'มีคำตอบให้กับบอร์ดคู่แข่ง'],
    cons: ['แดเมจพื้นฐานไม่สูงมาก ต้องใช้ทักษะการเล่นสูง'],
  },
  'greninja': {
    playstyle: 'Setup',
    pros: ['สไนเปอร์เบนช์เจาะจงเป้าหมายได้อย่างแม่นยำ', 'มีท่าปั่นการ์ดและความคล่องตัวสูงสุด', 'เล่นได้หลากหลายสไตล์'],
    cons: ['ต้องใช้ชิ้นส่วนคอมโบหลายใบในการตั้งตัว'],
  },
  'garchomp': {
    playstyle: 'Setup',
    pros: ['ตีด้วยพลังงานน้ำ/ต่อสู้เพียง 1 ลูก และเร่งพลังงานให้เพื่อนบนเบนช์', 'HP 320 ถอยหนีฟรี 0 Energy', 'ยืดหยุ่นในการจัดทีม'],
    cons: ['แดเมจจำกัดที่ 160-200 ต้องพึ่งพาการตีซ้ำ'],
  },
  'sharpedo': {
    playstyle: 'Aggro',
    pros: ['ความเร็วสูง กัดกร่อนพลังชีวิตศัตรูแบบฉับไว', 'ใช้พลังงานน้อยมาก'],
    cons: ['HP ไม่สูง โดนสวนกลับตายในทีเดียว'],
  },
  'mewtwo': {
    playstyle: 'Aggro',
    pros: ['โจมตีด้วยพลังจิตเข้มข้น รุนแรงระดับ Top Tier', 'ความสามารถสาย Team Rocket ขัดขวางคู่แข่ง'],
    cons: ['แจก 2 Prize และใช้พลังงานเฉพาะทาง'],
  },
  'venusaur': {
    playstyle: 'Setup',
    pros: ['ฮีลตัวเองและสร้างสถานะผิดปกติ สับสน/หลับ', 'หนาและล้มยากมากในระยะยาว'],
    cons: ['ค่าหนีสูงมาก แพ้ธาตุไฟรุนแรง'],
  },
  'kangaskhan': {
    playstyle: 'Toolbox',
    pros: ['เหรียญนำโชคทำแดเมจมหาศาล', 'ไร้จุดอ่อนที่เสียเปรียบชัดเจน จั่วการ์ดเร็ว'],
    cons: ['ต้องพึ่งพาการโยนเหรียญ'],
  },
  'chandelure': {
    playstyle: 'Control',
    pros: ['เผาการ์ดบนกองคู่แข่ง สกัดการใช้ไอเทม/ซัพพอร์ตเตอร์', 'คุมจังหวะเกมได้อย่างไม่น่าเชื่อ'],
    cons: ['เป็นโปเกมอนร่าง 2 ต้องใช้เวลาฟักตัว'],
  },
};

function getArchetypeDetails(deckName) {
  const lower = deckName.toLowerCase();
  for (const [key, info] of Object.entries(ARCHETYPE_INFO)) {
    if (lower.includes(key)) {
      return info;
    }
  }
  // Default fallback
  return {
    playstyle: 'Toolbox',
    pros: ['มีแนวทางการเล่นที่ปรับเปลี่ยนได้ตามสถานการณ์', 'ใช้การ์ดสนับสนุนที่หลากหลาย'],
    cons: ['ต้องบริหารทรัพยากรการ์ดบนมืออย่างระมัดระวัง'],
  };
}


async function main() {
  console.log('🚀 [Limitless Meta Sync] Starting synchronization...');

  // 1. Load local card database and dictionaries
  console.log('📦 Loading local datasets...');
  const thaiCards = JSON.parse(await fs.readFile(THAI_CARDS_FILE, 'utf-8'));
  const translations = JSON.parse(await fs.readFile(TRANSLATIONS_FILE, 'utf-8'));
  const cardMap = JSON.parse(await fs.readFile(CARD_MAP_FILE, 'utf-8'));
  const enSetsRaw = JSON.parse(await fs.readFile(EN_SETS_FILE, 'utf-8'));
  const enSets = Array.isArray(enSetsRaw) ? enSetsRaw : enSetsRaw.data || [];

  // Indexing
  const ptcgoCodeToEnSetIds = {};
  for (const s of enSets) {
    if (s.ptcgoCode && s.id) {
      (ptcgoCodeToEnSetIds[s.ptcgoCode.toUpperCase()] ||= []).push(s.id);
    }
  }

  const enCardIdToThaiCardIds = new Map();
  for (const [thId, m] of Object.entries(cardMap)) {
    if (m?.enCardId) {
      if (!enCardIdToThaiCardIds.has(m.enCardId)) enCardIdToThaiCardIds.set(m.enCardId, []);
      enCardIdToThaiCardIds.get(m.enCardId).push(thId);
    }
  }

  const thaiById = new Map();
  for (const c of thaiCards) thaiById.set(c.id, c);

  // Helper to pick the best Thai card print (prefer Standard regulation marks G/H/I/J, REGULAR rarity, and newest set)
  const REGULATION_RANK = { J: 10, I: 9, H: 8, G: 7, F: 4, E: 3, D: 2, C: 1, B: 1, A: 1 };
  function pickBestThaiCard(candidateCards) {
    if (!candidateCards || candidateCards.length === 0) return null;
    const items = candidateCards.map((c) => (typeof c === 'string' ? thaiById.get(c) : c)).filter(Boolean);
    if (items.length === 0) return null;

    items.sort((a, b) => {
      // 1. Regulation rank (Standard G, H, I, J preferred)
      const rankA = REGULATION_RANK[a.regulationMark?.toUpperCase()] || 0;
      const rankB = REGULATION_RANK[b.regulationMark?.toUpperCase()] || 0;
      if (rankA !== rankB) return rankB - rankA;

      // 2. Regular rarity preferred over secret/AR/SAR/UR for standard deck building
      const isRegularA = a.rarityCode === 'REGULAR' || !a.rarityCode ? 1 : 0;
      const isRegularB = b.rarityCode === 'REGULAR' || !b.rarityCode ? 1 : 0;
      if (isRegularA !== isRegularB) return isRegularB - isRegularA;

      // 3. Newer numeric ID (most recent printing)
      const numA = parseInt((a.id || '').replace(/\D/g, '') || '0', 10);
      const numB = parseInt((b.id || '').replace(/\D/g, '') || '0', 10);
      return numB - numA;
    });

    return items[0].id;
  }

  const pokemonDict = translations.pokemon || {};
  const trainersDict = translations.trainers || {};

  function translateEnName(rawName) {
    const trimmed = rawName.trim();
    const lower = trimmed.toLowerCase();
    if (trainersDict[lower]) return trainersDict[lower];
    if (pokemonDict[lower]) return pokemonDict[lower];

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
        if (baseTh) return `${baseTh}${th}`;
      }
    }

    const prefixes = [
      { en: 'mega ', th: 'เมก้า' },
      { en: 'alolan ', th: 'อโลลา' },
      { en: 'galarian ', th: 'กาลาร์' },
      { en: 'hisuian ', th: 'ฮิซุย' },
      { en: 'paldean ', th: 'พัลเดีย' },
      { en: 'radiant ', th: 'ส่องประกาย' },
    ];
    for (const p of prefixes) {
      if (lower.startsWith(p.en)) {
        const rem = lower.slice(p.en.length).trim();
        const remTh = translateEnName(rem);
        if (remTh && remTh !== rem) return `${p.th}${remTh}`;
      }
    }

    return trimmed;
  }

  // 2. Fetch Limitless Decks Page
  console.log('🌐 Fetching https://limitlesstcg.com/decks ...');
  const decksRes = await fetch('https://limitlesstcg.com/decks', {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!decksRes.ok) {
    throw new Error(`Failed to fetch Limitless decks: ${decksRes.status} ${decksRes.statusText}`);
  }
  const decksHtml = await decksRes.text();

  const deckMatches = [
    ...decksHtml.matchAll(
      /<tr>[\s\S]*?<td>(\d+)<\/td>[\s\S]*?<a\s+href="(\/decks\/(\d+))"[^>]*>([^<]+(?:<span[^>]*>[^<]*<\/span>)?)<\/a>[\s\S]*?<td>(\d+)<\/td>[\s\S]*?<td>([\d.]+)%<\/td>[\s\S]*?<\/tr>/g
    ),
  ];

  console.log(`📊 Found ${deckMatches.length} archetypes on Limitless TCG.`);

  // Fetch all available archetypes from Limitless (up to 25 archetypes)
  const targetArchetypes = deckMatches.slice(0, 25);
  const metaDecks = [];

  for (let i = 0; i < targetArchetypes.length; i++) {
    const m = targetArchetypes[i];
    const rank = parseInt(m[1], 10);
    const archetypePath = m[2];
    const archetypeId = m[3];
    const rawName = m[4].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const points = parseInt(m[5], 10);
    const sharePercent = parseFloat(m[6]);

    let tier = 'Tier 1';
    if (rank > 4 && rank <= 8) tier = 'Tier 2';
    else if (rank > 8 && rank <= 14) tier = 'Tier 3';
    else if (rank > 14) tier = 'Rogue';

    console.log(`\n🔍 [#${rank}] Processing ${rawName} (${sharePercent}% share)...`);

    // Fetch archetype page to get top tournament list
    const archUrl = `https://limitlesstcg.com${archetypePath}`;
    const archRes = await fetch(archUrl, { headers: { 'User-Agent': USER_AGENT } });
    if (!archRes.ok) {
      console.warn(`⚠️ Failed to fetch archetype ${rawName}`);
      continue;
    }
    const archHtml = await archRes.text();

    const listMatch = archHtml.match(/href="(\/decks\/list\/(\d+))"/);
    if (!listMatch) {
      console.warn(`⚠️ No decklist found for ${rawName}`);
      continue;
    }

    const listPath = listMatch[1];
    const listId = listMatch[2];
    const eventMatch = archHtml.match(/<a href="\/tournaments\/\d+">([^<]+)<\/a>/);
    const playerMatch = archHtml.match(/<a href="\/players\/\d+">([^<]+)<\/a>/);
    const eventName = eventMatch ? eventMatch[1].trim() : 'Official Tournament';
    const playerName = playerMatch ? playerMatch[1].trim() : 'Top Competitor';

    // Fetch decklist page
    const listUrl = `https://limitlesstcg.com${listPath}`;
    const listRes = await fetch(listUrl, { headers: { 'User-Agent': USER_AGENT } });
    if (!listRes.ok) {
      console.warn(`⚠️ Failed to fetch list ${listUrl}`);
      continue;
    }
    const listHtml = await listRes.text();

    // Parse cards from HTML
    const cardRegex =
      /<div class="decklist-card"[^>]*data-set="([^"]+)"[^>]*data-number="([^"]+)"[^>]*>[\s\S]*?<span class="card-count">(\d+)<\/span>[\s\S]*?<span class="card-name">([^<]+)<\/span>/g;
    let cardMatch;
    const cardsMap = {};
    const ptcglExportLines = [];
    const keyPokemon = [];
    let totalCount = 0;
    let coverCardId = null;

    while ((cardMatch = cardRegex.exec(listHtml)) !== null) {
      const setCode = cardMatch[1].toUpperCase();
      const colNum = cardMatch[2];
      const count = parseInt(cardMatch[3], 10);
      const enName = cardMatch[4].trim();

      totalCount += count;
      ptcglExportLines.push(`${count} ${enName} ${setCode} ${colNum}`);

      // Map to Thai card ID
      let resolvedThId = null;

      // Method A: Direct English set + collector number match in cardMap
      const enSetIds = ptcgoCodeToEnSetIds[setCode] || [];
      const directCandidates = [];
      for (const enSetId of enSetIds) {
        const matches = enCardIdToThaiCardIds.get(`EN-${enSetId}-${colNum.split('/')[0]}`);
        if (matches && matches.length > 0) {
          directCandidates.push(...matches);
        }
      }
      if (directCandidates.length > 0) {
        resolvedThId = pickBestThaiCard(directCandidates);
      }

      // Method B: Name Translation Match
      if (!resolvedThId) {
        const thName = translateEnName(enName);
        if (thName) {
          const exactMatches = thaiCards.filter((c) => c.name === thName);
          if (exactMatches.length > 0) {
            resolvedThId = pickBestThaiCard(exactMatches);
          } else {
            const partialMatches = thaiCards.filter((c) => c.name.includes(thName));
            if (partialMatches.length > 0) {
              resolvedThId = pickBestThaiCard(partialMatches);
            }
          }
        }
      }

      // Method C: Energy Match
      if (!resolvedThId && enName.toLowerCase().includes('energy')) {
        const enType = enName.toLowerCase().replace('energy', '').trim();
        const energyTh = BASIC_ENERGIES_MAP[enType] || 'พลังงานพื้นฐาน';
        const energyCandidates = thaiCards.filter((c) => c.name === energyTh || c.name.includes(energyTh));
        if (energyCandidates.length > 0) {
          resolvedThId = pickBestThaiCard(energyCandidates);
        }
      }

      // Fallback: If still not matched, pick card matching partial name
      if (!resolvedThId) {
        const fallbackCandidates = thaiCards.filter((c) => c.name.toLowerCase().includes(enName.toLowerCase()));
        if (fallbackCandidates.length > 0) {
          resolvedThId = pickBestThaiCard(fallbackCandidates);
        }
      }

      if (resolvedThId) {
        cardsMap[resolvedThId] = {
          cardId: resolvedThId,
          count: (cardsMap[resolvedThId]?.count || 0) + count,
        };

        const thCard = thaiById.get(resolvedThId);
        if (thCard && thCard.category === 'Pokemon') {
          if (!keyPokemon.includes(thCard.name) && keyPokemon.length < 4) {
            keyPokemon.push(thCard.name);
          }
        }
      } else {
        console.warn(`  ⚠️ Unmatched card: ${count}x ${enName} (${setCode} ${colNum})`);
      }
    }

    // Determine the most representative cover card
    const pokemonCardsInDeck = Object.keys(cardsMap)
      .map((id) => thaiById.get(id))
      .filter((c) => c && c.category === 'Pokemon');

    // 1. Prioritize card whose name matches archetype keywords (e.g. Dragapult, Zoroark, Excadrill, Lopunny)
    const archTokens = rawName.toLowerCase().split(/\s+/).filter((t) => t !== 'ex' && t !== 'the' && t !== 'box');
    for (const card of pokemonCardsInDeck) {
      const thName = card.name.toLowerCase();
      for (const tok of archTokens) {
        const trans = pokemonDict[tok] || tok;
        if (thName.includes(trans.toLowerCase())) {
          coverCardId = card.id;
          break;
        }
      }
      if (coverCardId) break;
    }

    // 2. If not matched, pick first ex, VMAX, VSTAR, or highest HP Pokemon
    if (!coverCardId && pokemonCardsInDeck.length > 0) {
      const boss = pokemonCardsInDeck.find(
        (c) => c.name.includes('ex') || c.name.includes('VMAX') || c.name.includes('VSTAR')
      );
      coverCardId = boss ? boss.id : pokemonCardsInDeck[0].id;
    }

    const coverCard = coverCardId ? thaiById.get(coverCardId) : null;
    const details = getArchetypeDetails(rawName);

    const metaDeckEntry = {
      id: `meta-limitless-${archetypeId}`,
      name: rawName,
      tier,
      playstyle: details.playstyle,
      pros: details.pros,
      cons: details.cons,
      sharePercent,
      points,
      event: eventName,
      author: playerName,
      tournamentDate: '2026',
      sourceUrl: listUrl,
      coverCardId: coverCardId || Object.keys(cardsMap)[0],
      coverImageUrl: coverCard?.imageUrl || coverCard?.officialImageUrl,
      strategyDescription: `เด็ค ${rawName} อันดับ #${rank} (${details.playstyle}) สถิติแข่งขันระดับโลก (${sharePercent}% Meta Share) เล่นโดย ${playerName} (${eventName})`,
      keyPokemon,
      cards: cardsMap,
      exportText: ptcglExportLines.join('\n'),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const resolvedTotalCount = Object.values(cardsMap).reduce((acc, c) => acc + c.count, 0);

    if (resolvedTotalCount === 60) {
      metaDecks.push(metaDeckEntry);
      console.log(`  ✅ Synced: ${rawName} (${Object.keys(cardsMap).length} unique cards, total: ${resolvedTotalCount}/60) [${details.playstyle}]`);
    } else {
      console.warn(`  ⚠️ Skipped ${rawName}: Only resolved ${resolvedTotalCount}/60 cards (contains unreleased Thai expansion cards)`);
    }
  }

  console.log(`\n💾 Writing ${metaDecks.length} meta decks to ${OUTPUT_META_DECKS_FILE} ...`);
  await fs.writeFile(OUTPUT_META_DECKS_FILE, JSON.stringify(metaDecks, null, 2), 'utf-8');
  console.log('🎉 [Limitless Meta Sync] Done! Meta decks successfully updated.');
}

main().catch((err) => {
  console.error('❌ Error in sync script:', err);
  process.exit(1);
});

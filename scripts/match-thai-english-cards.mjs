// @ts-check
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const THAI_CARDS_FILE = path.join(ROOT_DIR, 'src', 'data', 'pokemonNames.json');
const EN_CARDS_FILE = path.join(ROOT_DIR, 'src', 'data', 'pokemonCardsEn.json');
const TRANSLATIONS_FILE = path.join(ROOT_DIR, 'src', 'data', 'pokemonNameTranslations.json');
const OUTPUT_MAP_FILE = path.join(ROOT_DIR, 'src', 'data', 'thaiEnglishCardMap.json');

// Extended Dictionary for Trainer & Energy cards
const TRAINER_TRANSLATIONS = {
  "คำสั่งของบอส": "Boss's Orders",
  "ไอโอโน": "Iono",
  "นันจาโม": "Iono",
  "เพพเพอร์": "Arven",
  "เปปเปอร์": "Arven",
  "ศุภโชคของศาสตราจารย์โอลิม": "Professor Sada's Vitality",
  "จิตมุ่งมั่นของศาสตราจารย์โอลิม": "Professor Sada's Vitality",
  "แผนการของศาสตราจารย์ฟูทูร์": "Professor Turo's Scenario",
  "การวิจัยของศาสตราจารย์": "Professor's Research",
  "งานวิจัยของศาสตราจารย์": "Professor's Research",
  "เนสต์บอล": "Nest Ball",
  "ไฮเปอร์บอล": "Ultra Ball",
  "เกรทบอล": "Great Ball",
  "ซูเปอร์บอล": "Great Ball",
  "มอนสเตอร์บอล": "Poké Ball",
  "โปเกบอล": "Poké Ball",
  "เลเวลบอล": "Level Ball",
  "ควิกบอล": "Quick Ball",
  "เฮฟวี่บอลของฮิซุย": "Hisuian Heavy Ball",
  "บัดดี้โปฟฟิน": "Buddy-Buddy Poffin",
  "โปฟฟินเพื่อนรัก": "Buddy-Buddy Poffin",
  "ไพรม์แคตเชอร์": "Prime Catcher",
  "เคาน์เตอร์แคตเชอร์": "Counter Catcher",
  "เคาน์เตอร์ แคชเชอร์": "Counter Catcher",
  "สวิตช์": "Switch",
  "ลูกอมประหลาด": "Rare Candy",
  "ซูเปอร์เบ็ด": "Super Rod",
  "คันเบ็ดธรรมดา": "Ordinary Rod",
  "เชือกสลับตัว": "Escape Rope",
  "โปเกสต็อป": "PokéStop",
  "เรือแคนูซุปเปอร์สคูป": "Super Scoop Up",
  "เข็มขัดผู้กล้า": "Hero's Cape",
  "เครื่องยึดเกาะสูงสุด": "Maximum Belt",
  "หมวกกันกระทบ": "Rigid Band",
  "กลองปลุกใจ": "Awakening Drum",
  "ไซเฟอร์มาเนียก": "Ciphermaniac's Codebreaking",
  "เซวาสเทียน": "Salvatore",
  "เอริกะ": "Erika's Invitation",
  "เคียรา": "Kieran",
  "สุกุโรมิ": "Kieran",
  "คาร์ไมน์": "Carmine",
  "เซย์ยุ": "Carmine",
  "บริอาห์": "Briar",
  "บิวะ": "Eri",
  "ไครัน": "Clavell",
  "โทโกะ": "Hilda",
  "ฮิคาริ": "Dawn",
  "อัจฉริยะ": "Night Stretcher",
  "สายยืดหยุ่นยามค่ำคืน": "Night Stretcher",
  "แก้วล้ำค่า": "Earthen Vessel",
  "ภาชนะดินเผา": "Earthen Vessel",
  "ภาชนะแห่งผืนปฐพี": "Earthen Vessel",
  "ถังน้ำอเนกประสงค์": "Capacious Bucket",
  "ถังเต็มเปี่ยม": "Capacious Bucket",
  "เกลือทะเลบำบัด": "Ancient Booster Energy Capsule",
  "แคปซูลเสริมกำลังอดีต": "Ancient Booster Energy Capsule",
  "แคปซูลเสริมกำลังอนาคต": "Future Booster Energy Capsule",
  "โปเกเกีย 3.0": "Pokégear 3.0",
  "ผู้ตัดสิน": "Judge",
  "ลูกโป่ง": "Air Balloon",
  "แมรี": "Marnie",
  "มารีィ": "Marnie",
  "กู้คืนพลังงาน": "Energy Retrieval",
  "สลับการ์ดพลังงาน": "Energy Switch",
  "ส่งต่อพลังงาน": "Energy Spinner",
  "แครชแฮมเมอร์": "Crushing Hammer",
  "เทิร์ฟสเตเดียม": "Turffield Stadium",
  "คริสตัลหมอก": "Fog Crystal",
  "เครื่องรางแห่งความกล้า": "Bravery Charm",
  "ทูลสแครปเปอร์": "Tool Scrapper",
  "ยารักษาแผล": "Potion",
  "ยารักษาแผลชั้นยอด": "Max Potion",
  "ฮ็อป": "Hop",
  "ชุดจับแมลง": "Bug Catching Set",
  "เมทัลซอเซอร์": "Metal Saucer",
  "ยาร์โรว์": "Milo",
  "ผ้าพันคอลุกโชน": "Burning Scarf",
  "รูรินะ": "Nessa",
  "อุปกรณ์ช่วยเรียนรู้": "Exp. Share",
  "ชิบะ": "Bruno",
  "เอนเนอร์จี้รีไซเคิล": "Energy Recycler",
  "คอร์นีสู้สุดใจ": "Korrina's Focus",
  "เทือกเขาแห่งพายุ": "Stormy Mountains",
  "โบตั๋น": "Penny",
  "กู้คืนพลังงานแบบพิเศษ": "Superior Energy Retrieval",
  "โบวล์ทาวน์": "Artazon",
  "เมโลโก": "Mela",
  "บอร์ดฉุกเฉิน": "Rescue Board",
  "เครื่องหอมวิวัฒนาการ": "Evolution Incense",
  "ตาข่ายจับคืน": "Scoop Up Net",
  "เครื่องรางยักษ์": "Big Charm",
  "จักรยานโรตอม": "Rotom Bike",
  "ผลโอบง": "Sitrus Berry",
  "ผลลัม": "Lum Berry",
  "ลูกสมุนแก๊งเยล": "Team Yell Grunt",
  "โซเนีย": "Sonia",
  "ดันเปย์": "Milo",
  "บีต": "Bede",
  "ฟูโร": "Skyla",
  "เทรนนิงคอร์ท": "Training Court"
};

const OWNER_MAP = {
  "ฮิบิกิ": "Ethan's",
  "ชิโรนะ": "Cynthia's",
  "แก๊งร็อกเกต": "Team Rocket's",
  "ซาคากิ": "Giovanni's",
  "วาตารุ": "Lance's",
  "เรด": "Red's",
  "ลีลี่": "Lillie's",
  "มารีィ": "Marnie's",
  "แมรี": "Marnie's",
  "เอ็น": "N's",
  "ไดโกะ": "Steven's",
  "ฮอป": "Hop's",
  "ฮ็อป": "Hop's",
  "นันจาโม": "Iono's",
  "ไอโอโน": "Iono's",
  "เปปเปอร์": "Arven's",
  "เพพเพอร์": "Arven's",
  "โฮมิคะ": "Roxie's",
  "คิบานะ": "Raihan's",
  "ดันเด": "Leon's"
};

const ENERGY_MAP = {
  "หญ้า": "Grass Energy",
  "ไฟ": "Fire Energy",
  "น้ำ": "Water Energy",
  "สายฟ้า": "Lightning Energy",
  "พลังจิต": "Psychic Energy",
  "ต่อสู้": "Fighting Energy",
  "ความมืด": "Darkness Energy",
  "โลหะ": "Metal Energy"
};

const SPECIAL_POKEMON_MAP = {
  "คาปู โคเคโค": "Tapu Koko",
  "คาปู เทเทฟู": "Tapu Lele",
  "คาปู บูลู": "Tapu Bulu",
  "คาปู ฟีนี": "Tapu Fini",
  "โอการ์ปอง": "Ogerpon",
  "โอการ์ปอง หน้ากากสีทีล": "Teal Mask Ogerpon",
  "โอการ์ปอง หน้ากากเตาไฟ": "Hearthflame Mask Ogerpon",
  "โอการ์ปอง หน้ากากบ่อน้ำ": "Wellspring Mask Ogerpon",
  "โอการ์ปอง หน้ากากศิลา": "Cornerstone Mask Ogerpon",
  "เทราปาโกส": "Terapagos"
};

function normalizeText(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function main() {
  console.log('[Matcher] Loading datasets...');
  const thaiCards = JSON.parse(await fs.readFile(THAI_CARDS_FILE, 'utf-8'));
  const enCards = JSON.parse(await fs.readFile(EN_CARDS_FILE, 'utf-8'));
  const translationsData = JSON.parse(await fs.readFile(TRANSLATIONS_FILE, 'utf-8'));

  // Build reverse lookup: Thai Pokemon & Trainer name -> English name
  const thaiToEnName = new Map();
  if (translationsData?.pokemon) {
    for (const [enName, thName] of Object.entries(translationsData.pokemon)) {
      thaiToEnName.set(thName.trim(), enName.trim());
    }
  }
  if (translationsData?.trainers) {
    for (const [enName, thName] of Object.entries(translationsData.trainers)) {
      thaiToEnName.set(thName.trim(), enName.trim());
    }
  }

  // Pre-index English cards for fast multi-index searching
  // Map by: normName -> array of cards
  const enByName = new Map();
  // Map by: normName + normRegMark -> array of cards
  const enByNameAndReg = new Map();
  // Map by: normName + hp + type -> array of cards
  const enBySpec = new Map();

  for (const card of enCards) {
    const norm = normalizeText(card.name);
    if (!enByName.has(norm)) enByName.set(norm, []);
    enByName.get(norm).push(card);

    const regKey = `${norm}_${card.regulationMark || ''}`;
    if (!enByNameAndReg.has(regKey)) enByNameAndReg.set(regKey, []);
    enByNameAndReg.get(regKey).push(card);

    const typeStr = (card.types || []).sort().join('-');
    const specKey = `${norm}_${card.hp || 0}_${typeStr}`;
    if (!enBySpec.has(specKey)) enBySpec.set(specKey, []);
    enBySpec.get(specKey).push(card);
  }

  console.log(`[Matcher] Pre-indexed ${enCards.length} English cards. Matching ${thaiCards.length} Thai cards...`);

  const resultMap = {};
  let matchCount = 0;
  let highConfCount = 0;

  for (const thCard of thaiCards) {
    const thName = thCard.name || '';
    let expectedEnName = '';

    // 1. Energy Cards
    if (thCard.category === 'Energy') {
      for (const [thType, enEn] of Object.entries(ENERGY_MAP)) {
        if (thName.includes(thType)) {
          expectedEnName = enEn;
          break;
        }
      }
      if (!expectedEnName && thName.includes('ดับเบิลเทอร์โบ')) {
        expectedEnName = 'Double Turbo Energy';
      }
    }

    // 2. Trainer Cards
    if (!expectedEnName && thCard.category === 'Trainer') {
      const cleanTrainer = thName.replace(/\s*\([^)]*\)/g, '').trim();
      if (TRAINER_TRANSLATIONS[thName] || TRAINER_TRANSLATIONS[cleanTrainer]) {
        expectedEnName = TRAINER_TRANSLATIONS[thName] || TRAINER_TRANSLATIONS[cleanTrainer];
      } else if (thaiToEnName.has(cleanTrainer)) {
        expectedEnName = thaiToEnName.get(cleanTrainer);
      } else if (thaiToEnName.has(thName)) {
        expectedEnName = thaiToEnName.get(thName);
      }
    }

    // 3. Pokemon Cards
    if (!expectedEnName && thCard.category === 'Pokemon') {
      let prefix = '';
      let suffix = '';
      let workingName = thName;

      // Owner pokemon check <ของ...>
      const ownerMatch = workingName.match(/<ของ([^>]+)>/);
      if (ownerMatch) {
        const ownerTh = ownerMatch[1].trim();
        if (OWNER_MAP[ownerTh]) {
          prefix = OWNER_MAP[ownerTh] + ' ';
        }
        workingName = workingName.replace(/\s*<ของ[^>]+>/g, '').trim();
      }

      // Regional prefixes
      if (/กาลาร์/i.test(workingName)) {
        prefix += 'Galarian ';
        workingName = workingName.replace(/กาลาร์\s*/g, '');
      } else if (/ฮิซุย/i.test(workingName)) {
        prefix += 'Hisuian ';
        workingName = workingName.replace(/ฮิซุย\s*/g, '');
      } else if (/พัลเดีย/i.test(workingName)) {
        prefix += 'Paldean ';
        workingName = workingName.replace(/พัลเดีย\s*/g, '');
      } else if (/อโลลา/i.test(workingName)) {
        prefix += 'Alolan ';
        workingName = workingName.replace(/อโลลา\s*/g, '');
      } else if (/เมก้า/i.test(workingName)) {
        prefix += 'Mega ';
        workingName = workingName.replace(/เมก้า\s*/g, '');
      } else if (/คากายากุ|เปล่งประกาย|ส่องประกาย/i.test(workingName)) {
        prefix += 'Radiant ';
        workingName = workingName.replace(/(คากายากุ|เปล่งประกาย|ส่องประกาย)\s*/g, '');
      }

      // Special suffixes (V, VMAX, VSTAR, ex, EX, GX, V-UNION) with or without space
      const suffixMatch = workingName.match(/(VMAX|VSTAR|V-UNION|V|ex|EX|GX)$/i);
      if (suffixMatch) {
        suffix = ' ' + suffixMatch[1];
        workingName = workingName.slice(0, suffixMatch.index).trim();
      }

      // Direct special pokemon mapping
      if (SPECIAL_POKEMON_MAP[workingName]) {
        expectedEnName = `${prefix}${SPECIAL_POKEMON_MAP[workingName]}${suffix}`.trim();
      } else if (thaiToEnName.has(workingName)) {
        const enBase = thaiToEnName.get(workingName);
        expectedEnName = `${prefix}${enBase}${suffix}`.trim();
      }
    }

    if (!expectedEnName) {
      // Direct phonetic / english letters in Thai card name
      const enLetters = thName.match(/[a-zA-Z]+/g);
      if (enLetters && enLetters.join(' ').length > 3) {
        expectedEnName = enLetters.join(' ');
      }
    }

    if (!expectedEnName) {
      continue;
    }

    const normExpected = normalizeText(expectedEnName);
    const thReg = thCard.regulationMark || '';
    const thHp = thCard.hp || 0;
    const thTypeStr = (thCard.types || []).sort().join('-');
    const thRarity = thCard.rarityCode || 'REGULAR';

    // Candidate lookup strategies
    let candidates = enByNameAndReg.get(`${normExpected}_${thReg}`) || [];
    if (candidates.length === 0) {
      candidates = enByName.get(normExpected) || [];
    }
    if (candidates.length === 0 && thCard.category === 'Energy') {
      candidates = enByName.get(normalizeText('Basic ' + expectedEnName)) || [];
    }

    if (candidates.length === 0) {
      continue;
    }

    // Score candidates
    let bestCandidate = null;
    let highestScore = -1;

    for (const en of candidates) {
      let score = 50; // base score for name match

      // Regulation mark match
      if (thReg && en.regulationMark === thReg) {
        score += 20;
      }

      // HP match
      if (thHp && en.hp === thHp) {
        score += 15;
      }

      // Type match
      const enTypeStr = (en.types || []).sort().join('-');
      if (thTypeStr && enTypeStr === thTypeStr) {
        score += 10;
      }

      // Category / Supertype match
      if (thCard.category && en.category && thCard.category === en.category) {
        score += 5;
      }

      // Rarity alignment: AR / SAR / UR
      const enRarity = (en.rarity || '').toUpperCase();
      if ((thRarity === 'SAR' || thRarity === 'SR') && (enRarity.includes('SPECIAL') || enRarity.includes('ULTRA') || enRarity.includes('ILLUSTRATION'))) {
        score += 10;
      } else if (thRarity === 'AR' && enRarity.includes('ILLUSTRATION')) {
        score += 10;
      } else if (thRarity === 'UR' && (enRarity.includes('HYPER') || enRarity.includes('GOLD'))) {
        score += 10;
      } else if (thRarity === 'REGULAR' && (enRarity.includes('COMMON') || enRarity.includes('UNCOMMON') || enRarity.includes('RARE') || enRarity.includes('DOUBLE'))) {
        score += 5;
      }

      if (score > highestScore) {
        highestScore = score;
        bestCandidate = en;
      }
    }

    if (bestCandidate && highestScore >= 55) {
      const confidence = Math.min(100, Math.round(highestScore));
      resultMap[thCard.id] = {
        enCardId: bestCandidate.id,
        enName: bestCandidate.name,
        enSetId: bestCandidate.set.id,
        enSetName: bestCandidate.set.name,
        enNumber: bestCandidate.localId,
        enImageUrl: bestCandidate.imageUrl,
        confidence,
        matchMethod: 'hybrid_cv_heuristic',
        verified: confidence >= 95,
        matchedAt: new Date().toISOString(),
        enOfficialImageUrl: bestCandidate.officialImageUrl || `https://images.pokemontcg.io/${bestCandidate.set.id}/${bestCandidate.localId}.png`
      };
      matchCount++;
      if (confidence >= 85) highConfCount++;
    }
  }

  console.log(`[Matcher] Successfully matched ${matchCount} Thai cards!`);
  console.log(`          High confidence (>= 85%): ${highConfCount} cards`);

  await fs.writeFile(OUTPUT_MAP_FILE, JSON.stringify(resultMap, null, 2), 'utf-8');
  console.log(`[Matcher] Mapping saved to ${OUTPUT_MAP_FILE}`);
}

main().catch((err) => {
  console.error('[Matcher] Fatal error:', err);
  process.exit(1);
});

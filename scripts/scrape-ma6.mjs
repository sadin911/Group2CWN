import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, '../src/data/pokemonNames.json');
const RELEASE_ORDER_FILE = path.join(__dirname, '../src/data/setReleaseOrder.json');
const BOOSTER_IMAGES_FILE = path.join(__dirname, '../src/data/setBoosterImages.json');

const CONCURRENCY = 10;
const SET_CODE = 'MA6';
const SET_NAME = 'การ์ดชุดเสริม "30th CELEBRATION"';

function decodeHtml(html) {
  return html
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

async function fetchWithRetry(url, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'th,en;q=0.9',
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 600 * (i + 1)));
    }
  }
}

async function getAllMa6CardIds() {
  console.log('🔍 Step 1: Discovering MA6 cards from official list...');
  const cardIds = [];
  for (let p = 1; p <= 10; p++) {
    const html = await fetchWithRetry(
      `https://asia.pokemon-card.com/th/card-search/list/?expansionCodes=${SET_CODE}&pageNo=${p}`
    );
    const matches = [...html.matchAll(/href="\/th\/card-search\/detail\/(\d+)\/"/g)];
    for (const m of matches) {
      if (!cardIds.includes(m[1])) {
        cardIds.push(m[1]);
      }
    }
  }
  console.log(`✅ Discovered ${cardIds.length} cards for ${SET_CODE}`);
  return cardIds;
}

function classifyMa6Rarity(name, collectorNumber, category) {
  if (name.includes('ACE SPEC') || name.includes('เอซสเปก')) return 'ACE_SPEC';

  const match = collectorNumber.match(/^0*(\d+)[-/]0*(\d+)/);
  if (match) {
    const num = parseInt(match[1], 10);
    const total = parseInt(match[2], 10);

    if (num >= 131 && num <= 152) return 'AR';
    if (num >= 153 && num <= 166) return 'SAR';
    if (num >= 167 && num <= 196) return 'SR';
    if (num > total) return 'SR';
  }

  if (name.includes('ex') || name.includes('EX')) return 'EX';
  if (name.includes('VMAX')) return 'VMAX';
  if (name.includes('VSTAR')) return 'VSTAR';
  if (/(?:[\u0E00-\u0E7F]|\s)V(?:$|[\s\(\[\{【])/i.test(name) || name.endsWith('V')) return 'V';

  return 'REGULAR';
}

function parseCardDetail(id, html) {
  // Extract Name & Stage
  const headerMatch = html.match(/<h1 class="pageHeader cardDetail">([\s\S]*?)<\/h1>/);
  let name = '';
  let stage = '';
  if (headerMatch) {
    const raw = decodeHtml(headerMatch[1]);
    const stageMatch = raw.match(/<span class="evolveMarker">\s*([\s\S]*?)\s*<\/span>/);
    if (stageMatch) {
      stage = stageMatch[1].trim();
    }
    name = raw.replace(/<span[\s\S]*?<\/span>/g, '').replace(/<[^>]+>/g, '').trim();
  }

  // Extract HP
  const hpMatch = html.match(/<span class="hitPoint">HP<\/span>\s*<span class="number">(\d+)<\/span>/);
  const hp = hpMatch ? parseInt(hpMatch[1], 10) : null;

  // Extract Types
  const typeMatches = [...html.matchAll(/various_images\/energy\/([A-Za-z]+)\.png/g)];
  const types = typeMatches.length > 0 ? [typeMatches[0][1]] : [];

  // Extract Collector Number & Regulation Mark
  const colMatch = html.match(/<span class="collectorNumber">\s*([^<]+)\s*<\/span>/);
  const rawCol = colMatch ? colMatch[1].trim() : String(id);
  const collectorNumber = rawCol.replace(/\//g, '-').replace(/\s+/g, '');

  const regMatch = html.match(/<span class="alpha">\s*([A-Za-z0-9]+)\s*<\/span>/);
  const regulationMark = regMatch ? regMatch[1].trim() : 'J';

  // Category & Subtype
  let category = 'Pokemon';
  if (hp === null && !stage) {
    if (
      html.includes('การ์ดเทรนเนอร์') ||
      html.includes('ไอเท็ม') ||
      html.includes('ซัพพอร์ต') ||
      html.includes('สเตเดียม')
    ) {
      category = 'Trainer';
    } else if (
      html.includes('การ์ดพลังงาน') ||
      html.includes('พลังงานพื้นฐาน') ||
      html.includes('พลังงานพิเศษ') ||
      name.includes('พลังงาน')
    ) {
      category = 'Energy';
    } else {
      category = 'Trainer';
    }
  }

  // Official Image URL
  const paddedId = String(id).padStart(8, '0');
  const officialImageUrl = `https://asia.pokemon-card.com/th/card-img/th${paddedId}.png`;

  const safeName = encodeURIComponent(name);
  const imageUrl = `/PokeCountTracker/card-images/${SET_CODE}/${collectorNumber}_${safeName}.webp`;

  const rarityCode = classifyMa6Rarity(name, collectorNumber, category);

  return {
    id: `TH-${id}`,
    localId: String(id),
    name: name || `Card #${id}`,
    stage,
    category,
    hp,
    types,
    set: {
      id: SET_CODE,
      name: SET_NAME,
    },
    imageUrl,
    imageUrlHigh: imageUrl,
    collectorNumber,
    regulationMark: regulationMark || 'J',
    officialImageUrl,
    rarityCode,
  };
}

async function main() {
  const cardIds = await getAllMa6CardIds();
  const results = [];
  let completed = 0;

  console.log(`📦 Step 2: Fetching details for ${cardIds.length} cards (concurrency: ${CONCURRENCY})...`);

  async function worker(queue) {
    while (queue.length > 0) {
      const id = queue.shift();
      if (!id) break;
      try {
        const html = await fetchWithRetry(`https://asia.pokemon-card.com/th/card-search/detail/${id}/`);
        const card = parseCardDetail(id, html);
        results.push(card);
      } catch (err) {
        console.error(`❌ Failed to fetch card ${id}:`, err.message);
      } finally {
        completed++;
        if (completed % 25 === 0 || completed === cardIds.length) {
          console.log(`Progress: ${completed}/${cardIds.length}`);
        }
      }
    }
  }

  const queue = [...cardIds];
  const workers = Array.from({ length: CONCURRENCY }, () => worker(queue));
  await Promise.all(workers);

  console.log(`✅ Successfully fetched ${results.length} cards`);

  // Supplemental cards omitted by the official card-search system
  const SUPPLEMENTAL_CARDS = [
    {
      id: 'TH-MA6-148',
      localId: '148',
      name: 'จารารังกา',
      stage: 'ร่าง 2',
      category: 'Pokemon',
      hp: 180,
      types: ['Dragon'],
      set: { id: SET_CODE, name: SET_NAME },
      imageUrl: '/PokeCountTracker/card-images/MA6/148-130_%E0%B8%88%E0%B8%B2%E0%B8%A3%E0%B8%B2%E0%B8%A3%E0%B8%B1%E0%B8%87%E0%B8%81%E0%B8%B2.webp',
      imageUrlHigh: '/PokeCountTracker/card-images/MA6/148-130_%E0%B8%88%E0%B8%B2%E0%B8%A3%E0%B8%B2%E0%B8%A3%E0%B8%B1%E0%B8%87%E0%B8%81%E0%B8%B2.webp',
      collectorNumber: '148-130',
      regulationMark: 'J',
      officialImageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_143_R_EN_LG.png',
      rarityCode: 'AR',
    },
    {
      id: 'TH-MA6-157',
      localId: '157',
      name: 'มิวทูex',
      stage: 'พื้นฐาน',
      category: 'Pokemon',
      hp: 230,
      types: ['Psychic'],
      set: { id: SET_CODE, name: SET_NAME },
      imageUrl: '/PokeCountTracker/card-images/MA6/157-130_%E0%B8%A1%E0%B8%B4%E0%B8%A7%E0%B8%97%E0%B8%B9ex.webp',
      imageUrlHigh: '/PokeCountTracker/card-images/MA6/157-130_%E0%B8%A1%E0%B8%B4%E0%B8%A7%E0%B8%97%E0%B8%B9ex.webp',
      collectorNumber: '157-130',
      regulationMark: 'J',
      officialImageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_151_R_EN_LG.png',
      rarityCode: 'SAR',
    },
    {
      id: 'TH-MA6-158',
      localId: '158',
      name: 'มิวex',
      stage: 'พื้นฐาน',
      category: 'Pokemon',
      hp: 160,
      types: ['Psychic'],
      set: { id: SET_CODE, name: SET_NAME },
      imageUrl: '/PokeCountTracker/card-images/MA6/158-130_%E0%B8%A1%E0%B8%B4%E0%B8%A7ex.webp',
      imageUrlHigh: '/PokeCountTracker/card-images/MA6/158-130_%E0%B8%A1%E0%B8%B4%E0%B8%A7ex.webp',
      collectorNumber: '158-130',
      regulationMark: 'J',
      officialImageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_152_R_EN_LG.png',
      rarityCode: 'SAR',
    },
    {
      id: 'TH-MA6-161',
      localId: '161',
      name: 'เก็งกาex',
      stage: 'ร่าง 2',
      category: 'Pokemon',
      hp: 280,
      types: ['Darkness'],
      set: { id: SET_CODE, name: SET_NAME },
      imageUrl: '/PokeCountTracker/card-images/MA6/161-130_%E0%B9%80%E0%B8%81%E0%B9%87%E0%B8%87%E0%B8%81%E0%B8%B2ex.webp',
      imageUrlHigh: '/PokeCountTracker/card-images/MA6/161-130_%E0%B9%80%E0%B8%81%E0%B9%87%E0%B8%87%E0%B8%81%E0%B8%B2ex.webp',
      collectorNumber: '161-130',
      regulationMark: 'J',
      officialImageUrl: 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_154_R_EN_LG.png',
      rarityCode: 'SAR',
    },
    {
      id: 'TH-MA6-183',
      localId: '183',
      name: 'ดาร์กไร&เครเซเลียLEGEND (ส่วนล่าง)',
      stage: 'อื่น ๆ',
      category: 'Pokemon',
      hp: 150,
      types: ['Psychic'],
      set: { id: SET_CODE, name: SET_NAME },
      imageUrl: '/PokeCountTracker/card-images/MA6/183-130_%E0%B8%94%E0%B8%B2%E0%B8%A3%E0%B9%8C%E0%B8%81%E0%B9%84%E0%B8%A3%26%E0%B9%80%E0%B8%84%E0%B8%A3%E0%B9%80%E0%B8%8B%E0%B9%80%E0%B8%A5%E0%B8%B5%E0%B8%A2LEGEND.webp',
      imageUrlHigh: '/PokeCountTracker/card-images/MA6/183-130_%E0%B8%94%E0%B8%B2%E0%B8%A3%E0%B9%8C%E0%B8%81%E0%B9%84%E0%B8%A3%26%E0%B9%80%E0%B8%84%E0%B8%A3%E0%B9%80%E0%B8%8B%E0%B9%80%E0%B8%A5%E0%B8%B5%E0%B8%A2LEGEND.webp',
      collectorNumber: '183-130',
      regulationMark: 'J',
      officialImageUrl: 'https://asia.pokemon-card.com/th/card-img/th00014897.png',
      rarityCode: 'SR',
    },
  ];

  // Adjust card 182 if merged
  const card182 = results.find((c) => c.id === 'TH-14897');
  if (card182) {
    card182.name = 'ดาร์กไร&เครเซเลียLEGEND (ส่วนบน)';
    card182.collectorNumber = '182-130';
    card182.imageUrl = '/PokeCountTracker/card-images/MA6/182-130_%E0%B8%94%E0%B8%B2%E0%B8%A3%E0%B9%8C%E0%B8%81%E0%B9%84%E0%B8%A3%26%E0%B9%80%E0%B8%84%E0%B8%A3%E0%B9%80%E0%B8%8B%E0%B9%80%E0%B8%A5%E0%B8%B5%E0%B8%A2LEGEND.webp';
    card182.imageUrlHigh = '/PokeCountTracker/card-images/MA6/182-130_%E0%B8%94%E0%B8%B2%E0%B8%A3%E0%B9%8C%E0%B8%81%E0%B9%84%E0%B8%A3%26%E0%B9%80%E0%B8%84%E0%B8%A3%E0%B9%80%E0%B8%8B%E0%B9%80%E0%B8%A5%E0%B8%B5%E0%B8%A2LEGEND.webp';
  }

  // Merge supplemental cards into results
  for (const sup of SUPPLEMENTAL_CARDS) {
    if (!results.some((r) => r.id === sup.id)) {
      results.push(sup);
    }
  }

  // Sort by collector number or ID
  results.sort((a, b) => {
    const parseCol = (c) => {
      if (c.collectorNumber) {
        const num = parseInt(c.collectorNumber.split(/[-/,]/)[0], 10);
        if (!isNaN(num)) return num;
      }
      const local = parseInt(String(c.localId).replace(/\D/g, ''), 10);
      return isNaN(local) ? 99999 : local;
    };
    const numA = parseCol(a);
    const numB = parseCol(b);
    if (numA !== numB) return numA - numB;
    return String(a.id).localeCompare(String(b.id));
  });

  // Step 3: Merge into pokemonNames.json
  console.log('💾 Step 3: Merging into src/data/pokemonNames.json...');
  const existingCards = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

  // Remove existing MA6 if any to avoid duplication
  const filteredExisting = existingCards.filter((c) => c.set?.id !== SET_CODE);
  const merged = [...filteredExisting, ...results];

  fs.writeFileSync(DATA_FILE, JSON.stringify(merged, null, 2));
  console.log(`🎉 Saved ${merged.length} cards (+${results.length} MA6 cards) to ${DATA_FILE}`);

  // Step 4: Update setReleaseOrder.json
  if (fs.existsSync(RELEASE_ORDER_FILE)) {
    const releaseOrder = JSON.parse(fs.readFileSync(RELEASE_ORDER_FILE, 'utf8'));
    releaseOrder[SET_CODE] = 0; // Top priority / newest release
    fs.writeFileSync(RELEASE_ORDER_FILE, JSON.stringify(releaseOrder, null, 2));
    console.log(`✅ Updated setReleaseOrder.json with ${SET_CODE}: 0`);
  }

  // Step 5: Update setBoosterImages.json if needed
  if (fs.existsSync(BOOSTER_IMAGES_FILE)) {
    const boosterImages = JSON.parse(fs.readFileSync(BOOSTER_IMAGES_FILE, 'utf8'));
    boosterImages[SET_CODE] = `/set-boosters/${SET_CODE}.webp`;
    boosterImages[SET_CODE.toLowerCase()] = `/set-boosters/${SET_CODE}.webp`;
    fs.writeFileSync(BOOSTER_IMAGES_FILE, JSON.stringify(boosterImages, null, 2));
    console.log(`✅ Updated setBoosterImages.json with ${SET_CODE}`);
  }

  console.log('🏁 MA6 database update complete!');
}

main().catch(console.error);

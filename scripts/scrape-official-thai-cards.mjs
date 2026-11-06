import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_FILE = path.join(__dirname, '../data/pokemon-tcg-th/official_cards_cache.json');
const OUTPUT_FILE = path.join(__dirname, '../src/data/pokemonNames.json');
const CONCURRENCY = 25;

// Ensure directory exists
fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });

// Load existing cache if any
let cardCache = {};
if (fs.existsSync(CACHE_FILE)) {
  try {
    cardCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    console.log(`Loaded ${Object.keys(cardCache).length} cards from cache.`);
  } catch (e) {
    console.error('Error reading cache:', e);
  }
}

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'th,en;q=0.9',
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 500 * (i + 1)));
    }
  }
}

// 1. Get total pages and all card IDs from list pages
async function getAllCardIds() {
  console.log('Step 1: Discovering total pages from official list...');
  const firstPageHtml = await fetchWithRetry('https://asia.pokemon-card.com/th/card-search/list/?pageNo=1&regulation=all');
  
  const totalPagesMatch = firstPageHtml.match(/ทั้งหมด\s*(\d+)\s*หน้า/);
  const totalPages = totalPagesMatch ? parseInt(totalPagesMatch[1], 10) : 480;
  console.log(`Found ${totalPages} list pages on official site.`);

  const cardIds = new Set();
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  // Fetch list pages concurrently
  let processedPages = 0;
  async function processPageBatch(pages) {
    await Promise.all(pages.map(async page => {
      try {
        const html = await fetchWithRetry(`https://asia.pokemon-card.com/th/card-search/list/?pageNo=${page}&regulation=all`);
        const matches = [...html.matchAll(/href="\/th\/card-search\/detail\/(\d+)\/"/g)];
        for (const m of matches) {
          cardIds.add(m[1]);
        }
      } catch (err) {
        console.error(`Error on list page ${page}:`, err.message);
      } finally {
        processedPages++;
        if (processedPages % 50 === 0 || processedPages === totalPages) {
          console.log(`Discovered list pages: ${processedPages}/${totalPages} (Found ${cardIds.size} unique cards so far)`);
        }
      }
    }));
  }

  // Run in chunks
  const chunkSize = 20;
  for (let i = 0; i < pageNumbers.length; i += chunkSize) {
    const chunk = pageNumbers.slice(i, i + chunkSize);
    await processPageBatch(chunk);
  }

  return Array.from(cardIds);
}

// 2. Parse individual card detail
function parseCardDetail(id, html) {
  // Extract Name & Stage
  const headerMatch = html.match(/<h1 class="pageHeader cardDetail">([\s\S]*?)<\/h1>/);
  let name = '';
  let stage = '';
  if (headerMatch) {
    const raw = headerMatch[1];
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

  // Extract Category
  let category = 'Pokemon';
  if (hp === null && !stage) {
    if (html.includes('การ์ดเทรนเนอร์') || html.includes('ไอเท็ม') || html.includes('ซัพพอร์ต') || html.includes('สเตเดียม')) {
      category = 'Trainer';
    } else if (html.includes('การ์ดพลังงาน') || html.includes('พลังงานพื้นฐาน') || html.includes('พลังงานพิเศษ')) {
      category = 'Energy';
    } else {
      category = 'Trainer';
    }
  }

  // Extract Expansion / Set Name
  const expMatch = html.match(/<section class="expansionLinkColumn">[\s\S]*?<a[^>]*>\s*([\s\S]*?)\s*<\/a>/);
  const setName = expMatch ? expMatch[1].trim() : '';

  // Image URL
  const paddedId = String(id).padStart(8, '0');
  const imageUrl = `https://asia.pokemon-card.com/th/card-img/th${paddedId}.png`;

  return {
    id: `TH-${id}`,
    localId: String(id),
    name: name || `Card #${id}`,
    stage,
    category,
    hp,
    types,
    set: {
      name: setName,
    },
    imageUrl,
    imageUrlHigh: imageUrl,
  };
}

// 3. Fetch details for all missing cards
async function fetchAllCards() {
  const allIds = await getAllCardIds();
  console.log(`Total unique cards to verify/fetch: ${allIds.length}`);

  const missingIds = allIds.filter(id => !cardCache[id]);
  console.log(`Already cached: ${allIds.length - missingIds.length}, Need to fetch: ${missingIds.length}`);

  let completed = 0;
  const totalToFetch = missingIds.length;

  async function worker(idQueue) {
    while (idQueue.length > 0) {
      const id = idQueue.shift();
      if (!id) break;
      try {
        const html = await fetchWithRetry(`https://asia.pokemon-card.com/th/card-search/detail/${id}/`);
        const card = parseCardDetail(id, html);
        cardCache[id] = card;
      } catch (err) {
        console.error(`Failed to fetch card ${id}:`, err.message);
      } finally {
        completed++;
        if (completed % 100 === 0 || completed === totalToFetch) {
          console.log(`Fetched details: ${completed}/${totalToFetch}`);
          // Periodically save cache
          fs.writeFileSync(CACHE_FILE, JSON.stringify(cardCache, null, 2));
        }
      }
    }
  }

  // Run workers
  const queue = [...missingIds];
  const workers = Array.from({ length: CONCURRENCY }, () => worker(queue));
  await Promise.all(workers);

  // Final cache save
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cardCache, null, 2));
  console.log('Cache saved successfully.');

  // Convert to array sorted by ID
  const allCardsArray = Object.values(cardCache).sort((a, b) => {
    return parseInt(a.localId, 10) - parseInt(b.localId, 10);
  });

  // Filter out any blank cards if any
  const validCards = allCardsArray.filter(c => c.name && c.name !== `Card #${c.localId}`);

  console.log(`Total valid cards parsed: ${validCards.length}`);
  const pokemonCards = validCards.filter(c => c.category === 'Pokemon');
  console.log(`Total Pokemon cards: ${pokemonCards.length}`);

  // Write to src/data/pokemonNames.json
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(validCards, null, 2));
  console.log(`Saved ${validCards.length} cards to ${OUTPUT_FILE}`);
}

fetchAllCards().catch(console.error);

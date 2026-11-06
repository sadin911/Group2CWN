import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IMAGES_DIR = path.join(__dirname, '../public/card-images');
const CACHE_FILE = path.join(__dirname, '../data/pokemon-tcg-th/official_cards_cache.json');
const DATA_FILE = path.join(__dirname, '../src/data/pokemonNames.json');
const CONCURRENCY = 30;

function decodeEntities(str) {
  if (!str) return '';
  const translate = {
    nbsp: ' ',
    amp: '&',
    quot: '"',
    lt: '<',
    gt: '>',
  };
  return str
    .replace(/&(nbsp|amp|quot|lt|gt);/g, (_, entity) => translate[entity] || '')
    .replace(/&#(\d+);/gi, (_, num) => String.fromCharCode(parseInt(num, 10)));
}

function sanitizeFilename(str) {
  return decodeEntities(str)
    .replace(/[\/\\:*?"<>|]/g, '')
    .replace(/\s+/g, '_')
    .trim();
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
      await new Promise(r => setTimeout(r, 400 * (i + 1)));
    }
  }
}

async function main() {
  console.log('Loading card list...');
  let cards = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  let cache = fs.existsSync(CACHE_FILE) ? JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) : {};

  console.log(`Enriching metadata for ${cards.length} cards with Set Code, Collector Number, and Regulation Mark...`);

  const queue = cards.map(c => c.localId);
  let processed = 0;
  const total = queue.length;

  async function worker() {
    while (queue.length > 0) {
      const id = queue.shift();
      if (!id) break;

      try {
        // If cache already has code and collectorNumber, skip fetch
        let cached = cache[id];
        if (!cached || !cached.setCode || !cached.collectorNumber) {
          const html = await fetchWithRetry(`https://asia.pokemon-card.com/th/card-search/detail/${id}/`);
          
          // Set Code
          const expCodeMatch = html.match(/expansionCodes=([^"&]+)/);
          const setCode = expCodeMatch ? expCodeMatch[1].trim() : 'PROMO';

          // Regulation Mark
          const regMatch = html.match(/<span class="alpha">\s*([A-Za-z0-9]+)\s*<\/span>/);
          const regulationMark = regMatch ? regMatch[1].trim() : '';

          // Collector Number
          const colMatch = html.match(/<span class="collectorNumber">\s*([^<]+)\s*<\/span>/);
          const rawCol = colMatch ? colMatch[1].trim() : String(id);
          const collectorNumber = rawCol.replace(/\//g, '-').replace(/\s+/g, '');

          // Update cached entry
          if (!cached) cached = {};
          cached.setCode = setCode;
          cached.regulationMark = regulationMark;
          cached.collectorNumber = collectorNumber;
          cache[id] = { ...cached, ...cache[id] };
        }
      } catch (err) {
        console.error(`Error enriching card ${id}:`, err.message);
      } finally {
        processed++;
        if (processed % 500 === 0 || processed === total) {
          console.log(`Enriched metadata: ${processed}/${total}`);
        }
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  // Save enriched cache
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));

  console.log('Organizing images into set subfolders...');
  let movedCount = 0;

  for (const card of cards) {
    const id = card.localId;
    const cardMeta = cache[id] || {};
    const setCode = sanitizeFilename(cardMeta.setCode || card.set?.id || 'MISC') || 'MISC';
    const collectorNumber = sanitizeFilename(cardMeta.collectorNumber || id) || id;
    const safeName = sanitizeFilename(card.name) || `Card_${id}`;
    const regulationMark = cardMeta.regulationMark || card.regulationMark || '';

    // Folder: public/card-images/[setCode]/
    const setDir = path.join(IMAGES_DIR, setCode);
    if (!fs.existsSync(setDir)) {
      fs.mkdirSync(setDir, { recursive: true });
    }

    const newFilename = `${collectorNumber}_${safeName}.png`;
    const newRelativePath = `/PokeCountTracker/card-images/${setCode}/${encodeURIComponent(newFilename)}`;
    const newFilePath = path.join(setDir, newFilename);

    // Old flat file path
    const oldFilePath = path.join(IMAGES_DIR, `${id}.png`);

    if (fs.existsSync(oldFilePath)) {
      // Move / rename to new location
      try {
        fs.renameSync(oldFilePath, newFilePath);
        movedCount++;
      } catch (e) {
        // If rename fails across filesystem boundaries, copy and unlink
        fs.copyFileSync(oldFilePath, newFilePath);
        fs.unlinkSync(oldFilePath);
        movedCount++;
      }
    }

    // Update card object
    card.set = {
      id: setCode,
      name: decodeEntities(card.set?.name || setCode),
    };
    card.collectorNumber = cardMeta.collectorNumber || '';
    card.regulationMark = regulationMark;
    card.imageUrl = newRelativePath;
    card.imageUrlHigh = newRelativePath;
  }

  console.log(`Successfully organized ${movedCount} images into set folders.`);

  // Save updated pokemonNames.json
  fs.writeFileSync(DATA_FILE, JSON.stringify(cards, null, 2));
  console.log(`Updated ${DATA_FILE} successfully!`);
}

main().catch(console.error);

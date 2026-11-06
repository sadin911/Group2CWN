import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IMAGES_DIR = path.join(__dirname, '../public/card-images');
const DATA_FILE = path.join(__dirname, '../src/data/pokemonNames.json');
const CONCURRENCY = 30;

fs.mkdirSync(IMAGES_DIR, { recursive: true });

if (!fs.existsSync(DATA_FILE)) {
  console.error('pokemonNames.json not found.');
  process.exit(1);
}

const cards = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
console.log(`Starting image download for ${cards.length} cards...`);

// Filter cards needing download
const queue = [];
for (const card of cards) {
  const localId = card.localId;
  if (!localId) continue;
  const filePath = path.join(IMAGES_DIR, `${localId}.png`);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
    queue.push(card);
  }
}

console.log(`Total cards: ${cards.length}, Already downloaded: ${cards.length - queue.length}, To download: ${queue.length}`);

let downloaded = cards.length - queue.length;
let total = cards.length;
let errors = 0;

async function downloadCardImage(card) {
  const localId = card.localId;
  const paddedId = String(localId).padStart(8, '0');
  const remoteUrl = card.imageUrl && card.imageUrl.startsWith('http') 
    ? card.imageUrl 
    : `https://asia.pokemon-card.com/th/card-img/th${paddedId}.png`;
  
  const destPath = path.join(IMAGES_DIR, `${localId}.png`);

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(remoteUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://asia.pokemon-card.com/th/card-search/',
        }
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(destPath, buffer);
      return;
    } catch (err) {
      if (attempt === 2) {
        errors++;
      } else {
        await new Promise(r => setTimeout(r, 400 * (attempt + 1)));
      }
    }
  }
}

async function worker() {
  while (queue.length > 0) {
    const card = queue.shift();
    if (!card) break;
    await downloadCardImage(card);
    downloaded++;
    if (downloaded % 200 === 0 || downloaded === total) {
      const percent = ((downloaded / total) * 100).toFixed(1);
      console.log(`Progress: ${downloaded}/${total} (${percent}%) - Errors: ${errors}`);
    }
  }
}

async function run() {
  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  console.log(`Download finished! Downloaded: ${downloaded}/${total}, Errors: ${errors}`);

  // Update src/data/pokemonNames.json to use local image paths
  console.log('Updating pokemonNames.json to point to local images...');
  for (const card of cards) {
    const localId = card.localId;
    const destPath = path.join(IMAGES_DIR, `${localId}.png`);
    if (fs.existsSync(destPath) && fs.statSync(destPath).size > 0) {
      card.imageUrl = `/PokeCountTracker/card-images/${localId}.png`;
      card.imageUrlHigh = `/PokeCountTracker/card-images/${localId}.png`;
    }
  }

  fs.writeFileSync(DATA_FILE, JSON.stringify(cards, null, 2));
  console.log('Updated pokemonNames.json successfully!');
}

run().catch(console.error);

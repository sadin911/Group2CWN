import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, '../src/data/pokemonNames.json');
const PUBLIC_DIR = path.join(__dirname, '../public');
const R2_BASE = 'https://pub-af524b77e8e3403685545bc0a8222090.r2.dev';
const CONCURRENCY = 40;

if (!fs.existsSync(DATA_FILE)) {
  console.error('❌ Data file not found:', DATA_FILE);
  process.exit(1);
}

const cards = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
console.log(`🔍 Found ${cards.length} cards in dataset.`);

// Prepare download tasks
const queue = [];
for (const card of cards) {
  if (!card.imageUrl) continue;

  // Clean relative path, e.g. /PokeCountTracker/card-images/SC1a/001-154_สไตรค์.webp
  const cleanRelPath = decodeURIComponent(card.imageUrl)
    .replace(/^\/?PokeCountTracker/, '')
    .replace(/^\/+/, '');

  const destPath = path.join(PUBLIC_DIR, cleanRelPath);
  
  if (!fs.existsSync(destPath) || fs.statSync(destPath).size === 0) {
    // URL on R2
    const r2Url = `${R2_BASE}/${cleanRelPath}`;
    queue.push({
      card,
      destPath,
      r2Url: encodeURI(r2Url),
      fallbackUrl: card.officialImageUrl,
    });
  }
}

const totalToDownload = queue.length;
console.log(`📦 Already present: ${cards.length - totalToDownload} / ${cards.length}`);
console.log(`🚀 Starting download for ${totalToDownload} card images with ${CONCURRENCY} concurrent connections...\n`);

let downloaded = 0;
let errors = 0;
const startTime = Date.now();

async function downloadFile(item) {
  const { destPath, r2Url, fallbackUrl } = item;
  fs.mkdirSync(path.dirname(destPath), { recursive: true });

  // 1. Try Cloudflare R2
  try {
    const res = await fetch(r2Url);
    if (res.ok) {
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(destPath, buffer);
      return true;
    }
  } catch (err) {}

  // 2. Fallback to Official Asia CDN if R2 fails
  if (fallbackUrl) {
    try {
      const res = await fetch(fallbackUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://asia.pokemon-card.com/th/card-search/',
        }
      });
      if (res.ok) {
        const buffer = Buffer.from(await res.arrayBuffer());
        fs.writeFileSync(destPath, buffer);
        return true;
      }
    } catch (err) {}
  }

  return false;
}

async function worker() {
  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) break;

    const success = await downloadFile(item);
    if (success) {
      downloaded++;
    } else {
      errors++;
    }

    const current = downloaded + errors;
    if (current % 300 === 0 || current === totalToDownload) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const rate = (current / (elapsed || 1)).toFixed(1);
      const pct = ((current / totalToDownload) * 100).toFixed(1);
      console.log(`[Images] ${current}/${totalToDownload} (${pct}%) | ${rate} imgs/s | Errors: ${errors} | ${elapsed}s`);
    }
  }
}

async function run() {
  if (totalToDownload === 0) {
    console.log('✅ All card images are already downloaded and up to date!');
    return;
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n🎉 Image Download Complete!`);
  console.log(`✅ Downloaded: ${downloaded}`);
  console.log(`⚠️ Errors: ${errors}`);
  console.log(`⏱️ Time: ${totalTime}s`);
}

run().catch(console.error);

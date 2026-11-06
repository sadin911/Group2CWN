// @ts-check
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// 1. Read Cloudflare R2 Credentials
const secretPath = path.join(ROOT_DIR, 'secret.yaml');
if (!fs.existsSync(secretPath)) {
  console.error('❌ secret.yaml not found! Please ensure Cloudflare R2 credentials are configured.');
  process.exit(1);
}

const secretRaw = fs.readFileSync(secretPath, 'utf-8');
const accessKey = secretRaw.match(/AccessKey:\s*([^\r\n]+)/)?.[1]?.trim();
const secretKey = secretRaw.match(/Secret:\s*([^\r\n]+)/)?.[1]?.trim();
const endpoint = secretRaw.match(/S3Endpoint:\s*([^\r\n]+)/)?.[1]?.trim();
const BUCKET_NAME = 'pokecount-cards';

if (!accessKey || !secretKey || !endpoint) {
  console.error('❌ Missing R2 credentials in secret.yaml!');
  process.exit(1);
}

const s3 = new S3Client({
  region: 'auto',
  endpoint,
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
  },
});

// 2. Parse CLI flags
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const setFilterArg = args.find((a) => a.startsWith('--set='))?.split('=')[1]?.toLowerCase();
const limitArg = args.find((a) => a.startsWith('--limit='))?.split('=')[1];
const limit = limitArg ? parseInt(limitArg, 10) : Infinity;
const concurrencyArg = args.find((a) => a.startsWith('--concurrency='))?.split('=')[1];
const CONCURRENCY = concurrencyArg ? parseInt(concurrencyArg, 10) : 25;

// 3. Load English cards dataset
const CARDS_EN_PATH = path.join(ROOT_DIR, 'src', 'data', 'pokemonCardsEn.json');
const allCards = JSON.parse(fs.readFileSync(CARDS_EN_PATH, 'utf-8'));

let targetCards = allCards;
if (setFilterArg) {
  targetCards = targetCards.filter((c) => (c.set?.id || '').toLowerCase() === setFilterArg);
  console.log(`🎯 Filtered for set '${setFilterArg}': ${targetCards.length} cards`);
}

if (limit < targetCards.length) {
  targetCards = targetCards.slice(0, limit);
  console.log(`🎯 Limited to first ${limit} cards`);
}

console.log(`\n======================================================`);
console.log(`⚡ Cloudflare R2 English Card Image Sync Pipeline`);
console.log(`======================================================`);
console.log(`📦 Bucket:      ${BUCKET_NAME}`);
console.log(`🌐 Total Cards: ${targetCards.length.toLocaleString()}`);
console.log(`🔄 Concurrency: ${CONCURRENCY}`);
console.log(`🚀 Dry Run:     ${isDryRun ? 'YES (Simulated)' : 'NO (Live Upload)'}`);
console.log(`======================================================\n`);

/**
 * Check if an object exists on R2
 */
async function objectExists(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Fetch buffer with timeout & retry
 */
async function fetchBufferWithRetry(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'PokeCountTracker/2.27 (R2 Card Sync Pipeline)' },
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error(`HTTP ${res.status}`);
      }
      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 600 * attempt));
    }
  }
  return null;
}

let completed = 0;
let skipped = 0;
let uploaded = 0;
let failed = 0;
const total = targetCards.length;
const startTime = Date.now();

async function processCard(card) {
  const setId = (card.set?.id || '').toLowerCase();
  const localId = card.localId;
  if (!setId || !localId) return;

  const r2ThumbKey = `card-images-en/${setId}/${localId}.webp`;
  const r2HdKey = `card-images-en-hd/${setId}/${localId}.jpg`;

  try {
    // Check if thumbnail already uploaded
    const thumbExists = await objectExists(r2ThumbKey);
    if (thumbExists) {
      skipped++;
      completed++;
      return;
    }

    if (isDryRun) {
      completed++;
      uploaded++;
      return;
    }

    // Source URLs
    const scrydexUrl = `https://images.scrydex.com/pokemon/${setId}-${localId}/large`;
    const officialThumbUrl = card.officialImageUrl || `https://images.pokemontcg.io/${setId}/${localId}.png`;
    const officialHiresUrl = card.officialImageUrlHigh || `https://images.pokemontcg.io/${setId}/${localId}_hires.png`;

    // Download thumbnail or hires (check official, scrydex, and pokemontcg.io)
    const rawBuffer = (await fetchBufferWithRetry(officialThumbUrl)) || 
                      (await fetchBufferWithRetry(scrydexUrl)) ||
                      (await fetchBufferWithRetry(officialHiresUrl)) ||
                      (await fetchBufferWithRetry(`https://images.pokemontcg.io/${setId}/${localId}.png`));
    if (!rawBuffer) {
      console.warn(`⚠️ [${card.id}] Image not found on official sources or Scrydex`);
      failed++;
      completed++;
      return;
    }

    // 1. Optimize standard thumbnail (WebP, max width 480px, quality 85)
    const webpThumbBuffer = await sharp(rawBuffer)
      .resize({ width: 480, withoutEnlargement: true })
      .webp({ quality: 85, effort: 4 })
      .toBuffer();

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: r2ThumbKey,
        Body: webpThumbBuffer,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );

    // 2. If hires available, download & optimize HD version
    try {
      const hiresBuffer = await fetchBufferWithRetry(officialHiresUrl);
      if (hiresBuffer) {
        const hdJpgBuffer = await sharp(hiresBuffer)
          .jpeg({ quality: 85, mozjpeg: true })
          .toBuffer();

        await s3.send(
          new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: r2HdKey,
            Body: hdJpgBuffer,
            ContentType: 'image/jpeg',
            CacheControl: 'public, max-age=31536000, immutable',
          })
        );
      }
    } catch {
      // HD is optional bonus, do not fail item if hires is unavailable
    }

    uploaded++;
    completed++;
  } catch (err) {
    console.error(`❌ [${card.id}] Failed: ${err.message}`);
    failed++;
    completed++;
  }
}

async function runWorker(iterator) {
  for (const card of iterator) {
    await processCard(card);
  }
}

// Iterator for thread-safe work distribution
function* cardIterator(cards) {
  for (const card of cards) {
    yield card;
  }
}

async function main() {
  const iterator = cardIterator(targetCards);
  const workers = Array.from({ length: CONCURRENCY }, () => runWorker(iterator));

  const progressInterval = setInterval(() => {
    const elapsedSec = (Date.now() - startTime) / 1000;
    const rate = (completed / elapsedSec).toFixed(1);
    const pct = ((completed / total) * 100).toFixed(1);
    const etaSec = rate > 0 ? ((total - completed) / rate).toFixed(0) : '?';
    process.stdout.write(
      `\r⏳ [${completed}/${total}] ${pct}% | Uploaded: ${uploaded} | Skipped: ${skipped} | Failed: ${failed} | Speed: ${rate} cards/s | ETA: ${etaSec}s   `
    );
  }, 1000);

  await Promise.all(workers);
  clearInterval(progressInterval);

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\n🎉 Done in ${duration}s!`);
  console.log(`   - Uploaded: ${uploaded}`);
  console.log(`   - Skipped (Already in R2): ${skipped}`);
  console.log(`   - Failed: ${failed}`);
  console.log(`   - Total: ${completed}\n`);
}

main().catch((err) => {
  console.error('Fatal sync pipeline error:', err);
  process.exit(1);
});

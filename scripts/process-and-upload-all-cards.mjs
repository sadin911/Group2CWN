import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read credentials from secret.yaml
const secretRaw = fs.readFileSync(path.join(__dirname, '../secret.yaml'), 'utf-8');
const accessKey = secretRaw.match(/AccessKey:\s*([^\r\n]+)/)?.[1]?.trim();
const secretKey = secretRaw.match(/Secret:\s*([^\r\n]+)/)?.[1]?.trim();
const endpoint = secretRaw.match(/S3Endpoint:\s*([^\r\n]+)/)?.[1]?.trim();
const BUCKET_NAME = 'pokecount-cards';

const s3 = new S3Client({
  region: 'auto',
  endpoint: endpoint,
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
  },
});

const JSON_PATH = path.join(__dirname, '../src/data/pokemonNames.json');
const RAW_DIR = path.join(__dirname, '../data/pokemon-tcg-th/raw-images');
const THUMB_DIR = path.join(__dirname, '../public/card-images');
const HD_DIR = path.join(__dirname, '../public/card-images-hd');

const CONCURRENCY = 30;

if (!fs.existsSync(JSON_PATH)) {
  console.error('❌ Data file not found:', JSON_PATH);
  process.exit(1);
}

const cards = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
console.log(`🔍 Total cards in dataset: ${cards.length}`);

// Ensure directories exist
fs.mkdirSync(RAW_DIR, { recursive: true });
fs.mkdirSync(THUMB_DIR, { recursive: true });
fs.mkdirSync(HD_DIR, { recursive: true });

// Filter cards with officialImageUrl or image paths
const queue = [];
for (const card of cards) {
  if (!card.imageUrl && !card.officialImageUrl) continue;

  const cleanRelPath = decodeURIComponent(card.imageUrl || '')
    .replace(/^\/?PokeCountTracker/, '')
    .replace(/^\/+/, '');

  if (!cleanRelPath) continue;

  // Relative subpath, e.g. "SV4a/331-190_ลิซาร์ดอนex"
  const subPathWithoutExt = cleanRelPath
    .replace(/^card-images\//, '')
    .replace(/\.(webp|png|jpg|jpeg)$/, '');

  const rawPath = path.join(RAW_DIR, `${subPathWithoutExt}.png`);
  const thumbPath = path.join(THUMB_DIR, `${subPathWithoutExt}.webp`);
  const hdPath = path.join(HD_DIR, `${subPathWithoutExt}.webp`);

  const thumbR2Key = `card-images/${subPathWithoutExt}.webp`;
  const hdR2Key = `card-images-hd/${subPathWithoutExt}.webp`;

  queue.push({
    card,
    subPathWithoutExt,
    rawPath,
    thumbPath,
    hdPath,
    thumbR2Key,
    hdR2Key,
    officialUrl: card.officialImageUrl,
  });
}

console.log(`📦 Cards to process: ${queue.length}`);

let completed = 0;
let skipped = 0;
let errors = 0;
const startTime = Date.now();

async function uploadBufferToR2(key, buffer) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: 'image/webp',
    CacheControl: 'public, max-age=31536000, immutable',
  });
  await s3.send(command);
}

async function processCard(item) {
  const { card, rawPath, thumbPath, hdPath, thumbR2Key, hdR2Key, officialUrl } = item;

  // Ensure local directories exist
  fs.mkdirSync(path.dirname(rawPath), { recursive: true });
  fs.mkdirSync(path.dirname(thumbPath), { recursive: true });
  fs.mkdirSync(path.dirname(hdPath), { recursive: true });

  let rawBuf = null;

  // 1. Get raw buffer (Check local preserved raw file first)
  if (fs.existsSync(rawPath) && fs.statSync(rawPath).size > 100) {
    rawBuf = fs.readFileSync(rawPath);
  } else if (officialUrl) {
    // Download from official CDN and save original locally permanently
    try {
      const res = await fetch(officialUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)',
          'Referer': 'https://asia.pokemon-card.com/th/card-search/',
        },
      });

      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 100) {
          rawBuf = buf;
          // PERMANENTLY SAVE ORIGINAL RAW ON DISK (Do not delete)
          fs.writeFileSync(rawPath, rawBuf);
        }
      }
    } catch (e) {}
  }

  // Fallback: If no official URL or failed, check existing local thumb/hd webp to convert from
  if (!rawBuf && fs.existsSync(thumbPath) && fs.statSync(thumbPath).size > 100) {
    rawBuf = fs.readFileSync(thumbPath);
  }

  if (!rawBuf) {
    return false;
  }

  // 2. Generate Thumbnail (340x475, ~30-60KB) & Ultra-HD (1150x1606, ~200-800KB)
  let thumbBuf = null;
  let hdBuf = null;

  try {
    const meta = await sharp(rawBuf).metadata();
    const origW = meta.width || 227;
    const isSmallSource = origW < 500;

    // A. Thumbnail
    thumbBuf = await sharp(rawBuf)
      .resize(340, 475, { kernel: sharp.kernel.lanczos3, fit: 'fill' })
      .sharpen({ sigma: 0.8, m1: 1.0, m2: 0.5 })
      .webp({ quality: 84, effort: 4 })
      .toBuffer();

    // B. Ultra-HD High-Res
    let hdPipeline = sharp(rawBuf);
    if (isSmallSource) {
      hdPipeline = hdPipeline
        .resize(1000, 1400, { kernel: sharp.kernel.lanczos3, fit: 'fill' })
        .sharpen({ sigma: 1.4, m1: 1.8, m2: 0.7 });
    } else {
      hdPipeline = hdPipeline
        .resize(1150, 1606, { kernel: sharp.kernel.lanczos3, fit: 'fill' })
        .sharpen({ sigma: 0.9, m1: 1.2, m2: 0.6 });
    }

    hdBuf = await hdPipeline.webp({ quality: 92, effort: 4 }).toBuffer();

    // Save both local webp files
    fs.writeFileSync(thumbPath, thumbBuf);
    fs.writeFileSync(hdPath, hdBuf);
  } catch (err) {
    console.error(`❌ Sharp error for ${card.name}:`, err.message);
    return false;
  }

  // 3. Upload both to Cloudflare R2
  try {
    await Promise.all([
      uploadBufferToR2(thumbR2Key, thumbBuf),
      uploadBufferToR2(hdR2Key, hdBuf),
    ]);
    return true;
  } catch (err) {
    console.error(`❌ R2 upload error for ${card.name}:`, err.message);
    return false;
  }
}

async function worker() {
  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) break;

    try {
      const success = await processCard(item);
      if (success) {
        completed++;
      } else {
        errors++;
      }
    } catch (e) {
      errors++;
    }

    const total = completed + errors;
    if (total % 100 === 0 || total === cards.length || queue.length === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const rate = (total / (elapsed || 1)).toFixed(1);
      const remaining = queue.length;
      const estSec = (remaining / (rate || 1)).toFixed(0);
      const pct = (((total) / cards.length) * 100).toFixed(1);
      console.log(
        `[Dual-Res + R2] ${total}/${cards.length} (${pct}%) | ${rate} cards/s | Errors: ${errors} | ${elapsed}s elapsed (ETA ~${estSec}s)`
      );
    }
  }
}

async function main() {
  console.log(`🚀 Starting Full Dual-Resolution Processing + R2 Upload with ${CONCURRENCY} workers...`);
  console.log(`📁 Local raw originals directory: ${RAW_DIR} (kept permanently)\n`);

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n🎉 Full Processing & R2 Upload Complete!`);
  console.log(`✅ Successfully Processed & Uploaded: ${completed}`);
  console.log(`⚠️ Errors / Missing: ${errors}`);
  console.log(`⏱️ Total Time: ${totalTime}s`);
}

main().catch(console.error);

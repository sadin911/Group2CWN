import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
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
const HD_DIR = path.join(__dirname, '../public/card-images-hd');

const CONCURRENCY = 35;

// Step 1: Clean up redundant .webp files inside card-images-hd on Cloudflare R2
async function cleanR2HdWebpDuplicates() {
  console.log('🧹 Scanning R2 for redundant card-images-hd/*.webp to delete...');
  let continuationToken = undefined;
  let totalDeleted = 0;

  do {
    const listRes = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: 'card-images-hd/',
        ContinuationToken: continuationToken,
      })
    );

    const keysToDelete = (listRes.Contents || [])
      .filter((obj) => obj.Key && obj.Key.endsWith('.webp'))
      .map((obj) => ({ Key: obj.Key }));

    if (keysToDelete.length > 0) {
      // Delete in batches of 1000
      for (let i = 0; i < keysToDelete.length; i += 1000) {
        const batch = keysToDelete.slice(i, i + 1000);
        await s3.send(
          new DeleteObjectsCommand({
            Bucket: BUCKET_NAME,
            Delete: { Objects: batch },
          })
        );
        totalDeleted += batch.length;
      }
      console.log(`🗑️ Deleted ${totalDeleted} redundant .webp files from R2 card-images-hd/`);
    }

    continuationToken = listRes.IsTruncated ? listRes.NextContinuationToken : undefined;
  } while (continuationToken);

  console.log(`✅ Finished R2 cleanup! Total redundant .webp removed from R2: ${totalDeleted}`);
}

await cleanR2HdWebpDuplicates();

// Step 2: Convert & Upload ONLY HD .jpg to R2
const cards = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
fs.mkdirSync(RAW_DIR, { recursive: true });
fs.mkdirSync(HD_DIR, { recursive: true });

const queue = [];
for (const card of cards) {
  if (!card.imageUrl && !card.officialImageUrl) continue;

  const cleanRelPath = decodeURIComponent(card.imageUrl || '')
    .replace(/^\/?PokeCountTracker/, '')
    .replace(/^\/+/, '');

  if (!cleanRelPath) continue;

  const subPathWithoutExt = cleanRelPath
    .replace(/^card-images\//, '')
    .replace(/\.(webp|png|jpg|jpeg)$/, '');

  const rawPath = path.join(RAW_DIR, `${subPathWithoutExt}.png`);
  const hdJpgPath = path.join(HD_DIR, `${subPathWithoutExt}.jpg`);
  const hdJpgR2Key = `card-images-hd/${subPathWithoutExt}.jpg`;

  queue.push({
    card,
    subPathWithoutExt,
    rawPath,
    hdJpgPath,
    hdJpgR2Key,
    officialUrl: card.officialImageUrl || null,
  });
}

console.log(`📦 Processing & Uploading only necessary .jpg for HD (Total: ${queue.length})...`);

let completed = 0;
let errors = 0;
const startTime = Date.now();

async function uploadBufferToR2(key, buffer, contentType = 'image/jpeg') {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  });
  await s3.send(command);
}

async function processCard(item) {
  const { card, rawPath, hdJpgPath, hdJpgR2Key, officialUrl } = item;

  fs.mkdirSync(path.dirname(rawPath), { recursive: true });
  fs.mkdirSync(path.dirname(hdJpgPath), { recursive: true });

  let rawBuf = null;

  if (fs.existsSync(rawPath) && fs.statSync(rawPath).size > 100) {
    rawBuf = fs.readFileSync(rawPath);
  } else if (officialUrl) {
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
          fs.writeFileSync(rawPath, rawBuf);
        }
      }
    } catch (e) {}
  }

  if (!rawBuf) {
    const thumbFallback = path.join(__dirname, '../public/card-images', `${item.subPathWithoutExt}.webp`);
    if (fs.existsSync(thumbFallback) && fs.statSync(thumbFallback).size > 100) {
      rawBuf = fs.readFileSync(thumbFallback);
    }
  }

  if (!rawBuf) return false;

  let jpgBuf = null;
  try {
    const meta = await sharp(rawBuf).metadata();
    const origW = meta.width || 250;
    const isSmallSource = origW < 500;

    let pipeline = sharp(rawBuf);

    if (isSmallSource) {
      pipeline = pipeline
        .resize(1080, 1508, {
          kernel: sharp.kernel.lanczos3,
          fit: 'fill',
          fastShrinkOnLoad: false,
        })
        .sharpen({ sigma: 1.2, m1: 1.5, m2: 0.5 });
    }

    jpgBuf = await pipeline
      .jpeg({ quality: 75, mozjpeg: true })
      .toBuffer();

    fs.writeFileSync(hdJpgPath, jpgBuf);
  } catch (err) {
    console.error(`❌ Sharp error for ${card.name}:`, err.message);
    return false;
  }

  try {
    await uploadBufferToR2(hdJpgR2Key, jpgBuf, 'image/jpeg');
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

    const ok = await processCard(item);
    if (ok) completed++;
    else errors++;

    const totalDone = completed + errors;
    if (totalDone % 300 === 0 || queue.length === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const rate = (totalDone / (elapsed || 1)).toFixed(1);
      console.log(
        `⚡ [${totalDone}/${cards.length}] Completed: ${completed}, Errors: ${errors} | Speed: ${rate} cards/s`
      );
    }
  }
}

console.log(`🚀 Starting HD JPG 75% Conversion & Single-Upload to R2 with ${CONCURRENCY} workers...`);
const workers = Array.from({ length: CONCURRENCY }, () => worker());
await Promise.all(workers);

console.log(`\n🎉 HD Processing & Single Storage Upload Complete!`);

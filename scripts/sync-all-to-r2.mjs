import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const secretRaw = fs.readFileSync('secret.yaml', 'utf-8');
const accessKey = secretRaw.match(/AccessKey:\s*([^\r\n]+)/)?.[1]?.trim();
const secretKey = secretRaw.match(/Secret:\s*([^\r\n]+)/)?.[1]?.trim();
const endpoint = secretRaw.match(/S3Endpoint:\s*([^\r\n]+)/)?.[1]?.trim();
const BUCKET_NAME = 'pokecount-cards';

const s3 = new S3Client({
  region: 'auto',
  endpoint: endpoint,
  credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
});

const CARD_DIR = path.resolve('public/card-images');

function getAllFiles(dir, list = []) {
  if (!fs.existsSync(dir)) return list;
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) getAllFiles(full, list);
    else if (f.endsWith('.webp') || f.endsWith('.png')) list.push(full);
  }
  return list;
}

async function uploadOne(filePath, attempt = 1) {
  const relativeKey = path.relative(path.resolve('public'), filePath).replace(/\\/g, '/');
  let fileBuffer = fs.readFileSync(filePath);

  try {
    const meta = await sharp(fileBuffer).metadata();
    if (meta.width && meta.width < 500) {
      fileBuffer = await sharp(fileBuffer)
        .resize(750, 1050, { kernel: sharp.kernel.lanczos3, fit: 'fill' })
        .sharpen({ sigma: 1.3, m1: 1.6, m2: 0.8 })
        .webp({ quality: 92, effort: 4 })
        .toBuffer();
      fs.writeFileSync(filePath, fileBuffer);
    }
  } catch (e) {}

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: relativeKey,
        Body: fileBuffer,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );
    return true;
  } catch (err) {
    if (attempt <= 3) {
      await new Promise((r) => setTimeout(r, 1000 * attempt));
      return uploadOne(filePath, attempt + 1);
    }
    console.error('Failed:', path.basename(filePath), err.message);
    return false;
  }
}

async function main() {
  const allFiles = getAllFiles(CARD_DIR);
  console.log(`📦 Found ${allFiles.length} files. Starting full sync to R2...`);

  const CONCURRENCY = 40;
  let done = 0;
  let success = 0;
  let failed = 0;
  const queue = [...allFiles];

  async function worker() {
    while (queue.length > 0) {
      const file = queue.shift();
      if (!file) break;
      const ok = await uploadOne(file);
      done++;
      if (ok) success++;
      else failed++;
      if (done % 500 === 0 || done === allFiles.length) {
        console.log(
          `[R2 Sync] ${done}/${allFiles.length} (${((done / allFiles.length) * 100).toFixed(1)}%) | Success: ${success} | Failed: ${failed}`
        );
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  console.log(`\n🎉 Sync Complete! ✅ ${success} uploaded, ❌ ${failed} failed.`);
}

main().catch(console.error);

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Read R2 credentials from secret.yaml
const secretRaw = fs.readFileSync('secret.yaml', 'utf-8');
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

const CARD_DIR = path.resolve('public/card-images');

function getAllFiles(dir, list = []) {
  if (!fs.existsSync(dir)) return list;
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      getAllFiles(full, list);
    } else if (f.endsWith('.webp') || f.endsWith('.png')) {
      list.push(full);
    }
  }
  return list;
}

async function enhanceAndUploadFile(filePath) {
  const relativeKey = path.relative(path.resolve('public'), filePath).replace(/\\/g, '/');
  let fileBuffer = fs.readFileSync(filePath);

  try {
    const meta = await sharp(fileBuffer).metadata();
    
    // If small image (227x317), apply Lanczos3 High-Res upscaling + Unsharp Mask
    if (meta.width && meta.width < 500) {
      fileBuffer = await sharp(fileBuffer)
        .resize(750, 1050, { kernel: sharp.kernel.lanczos3, fit: 'fill' })
        .sharpen({ sigma: 1.3, m1: 1.6, m2: 0.8 })
        .webp({ quality: 92, effort: 4 })
        .toBuffer();

      // Overwrite local disk file with enhanced HD version too
      fs.writeFileSync(filePath, fileBuffer);
    }
  } catch (err) {
    // If sharp fails for any reason, use existing buffer
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: relativeKey,
    Body: fileBuffer,
    ContentType: 'image/webp',
    CacheControl: 'public, max-age=31536000, immutable',
  });

  await s3.send(command);
}

async function main() {
  console.log(`🔍 Scanning local card images in ${CARD_DIR}...`);
  const allFiles = getAllFiles(CARD_DIR);
  console.log(`📦 Found ${allFiles.length} card images to enhance and upload to Cloudflare R2 bucket: "${BUCKET_NAME}"\n`);

  const CONCURRENCY = 35;
  let completed = 0;
  let enhancedSmallCount = 0;
  let errors = 0;
  const startTime = Date.now();

  const queue = [...allFiles];

  async function worker(workerId) {
    while (queue.length > 0) {
      const file = queue.shift();
      if (!file) break;
      try {
        await enhanceAndUploadFile(file);
        completed++;
        if (completed % 300 === 0 || completed === allFiles.length) {
          const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
          const rate = (completed / elapsedSec).toFixed(1);
          const pct = ((completed / allFiles.length) * 100).toFixed(1);
          console.log(`[R2 Super-HD Upload] ${completed}/${allFiles.length} (${pct}%) | ${rate} files/sec | ${elapsedSec}s elapsed`);
        }
      } catch (err) {
        errors++;
        console.error(`❌ Failed to upload ${path.basename(file)}:`, err.message);
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, (_, i) => worker(i));
  await Promise.all(workers);

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n🎉 Super-HD Enhancement & Upload Complete!`);
  console.log(`✅ Uploaded to R2: ${completed} files`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`⏱️ Total Time: ${totalTime}s`);
}

main().catch(console.error);

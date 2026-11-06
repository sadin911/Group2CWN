import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

const uploadDirs = [
  path.resolve('public/card-images/MA6'),
  path.resolve('public/card-images-hd/MA6'),
];

function getFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.webp') || f.endsWith('.jpg') || f.endsWith('.png'))
    .map(f => path.join(dir, f));
}

async function uploadFile(filePath) {
  const relativeKey = path.relative(path.resolve('public'), filePath).replace(/\\/g, '/');
  const fileBuffer = fs.readFileSync(filePath);
  const contentType = filePath.endsWith('.webp')
    ? 'image/webp'
    : filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')
    ? 'image/jpeg'
    : 'image/png';

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: relativeKey,
    Body: fileBuffer,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  });

  await s3.send(command);
  return relativeKey;
}

async function main() {
  const allFiles = [];
  for (const d of uploadDirs) {
    allFiles.push(...getFiles(d));
  }

  console.log(`📦 Found ${allFiles.length} files to sync to R2 (${BUCKET_NAME})...\n`);

  const CONCURRENCY = 20;
  let completed = 0;
  let errors = 0;
  const startTime = Date.now();
  const queue = [...allFiles];

  async function worker() {
    while (queue.length > 0) {
      const file = queue.shift();
      if (!file) break;
      try {
        await uploadFile(file);
        completed++;
        if (completed % 25 === 0 || completed === allFiles.length) {
          console.log(`[R2 Sync] ${completed}/${allFiles.length} files uploaded`);
        }
      } catch (err) {
        errors++;
        console.error(`❌ Failed to upload ${file}:`, err.message);
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n🎉 Sync finished in ${duration}s! Uploaded: ${completed}, Errors: ${errors}`);
}

main().catch(console.error);

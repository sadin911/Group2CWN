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

const dir = path.resolve('public/set-boosters');

async function main() {
  if (!fs.existsSync(dir)) {
    console.error('Directory not found:', dir);
    return;
  }

  const files = fs.readdirSync(dir);
  console.log(`📦 Found ${files.length} booster files to process and upload to R2...`);

  let uploaded = 0;
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (!fs.statSync(filePath).isFile()) continue;

    const ext = path.extname(file);
    const setId = path.basename(file, ext);

    const webpBuffer = await sharp(fs.readFileSync(filePath))
      .webp({ quality: 92, effort: 4 })
      .toBuffer();

    const webpPath = path.join(dir, `${setId}.webp`);
    fs.writeFileSync(webpPath, webpBuffer);
    if (ext !== '.webp') {
      try { fs.unlinkSync(filePath); } catch (e) {}
    }

    const r2Key = `set-boosters/${setId}.webp`;
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: r2Key,
        Body: webpBuffer,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );

    uploaded++;
    console.log(`Uploaded (${uploaded}/${files.length}):`, r2Key);
  }

  console.log(`✨ All ${uploaded} booster pack images successfully uploaded to R2!`);
}

main();

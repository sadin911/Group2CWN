import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonPath = path.join(__dirname, '../src/data/pokemonNames.json');
const cards = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

/**
 * Process a card to generate both:
 * 1. Fast Thumbnail (public/card-images/...)
 * 2. Ultra-HD High Res (public/card-images-hd/...)
 */
export async function processCardImage(card) {
  if (!card.officialImageUrl) {
    console.log(`⚠️ No officialImageUrl for ${card.name} (${card.set?.id} ${card.collectorNumber})`);
    return false;
  }

  const cleanRelPath = decodeURIComponent(card.imageUrl || '')
    .replace(/^\/?PokeCountTracker/, '')
    .replace(/^\/+/, '');

  if (!cleanRelPath) return false;

  const thumbPath = path.join(__dirname, '../public', cleanRelPath);
  const hdPath = path.join(__dirname, '../public', cleanRelPath.replace('card-images/', 'card-images-hd/'));

  fs.mkdirSync(path.dirname(thumbPath), { recursive: true });
  fs.mkdirSync(path.dirname(hdPath), { recursive: true });

  try {
    const res = await fetch(card.officialImageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': 'https://asia.pokemon-card.com/th/card-search/',
      },
    });

    if (!res.ok) {
      console.log(`❌ Fetch failed (${res.status}) for ${card.officialImageUrl}`);
      return false;
    }

    const rawBuf = Buffer.from(await res.arrayBuffer());
    if (rawBuf.length === 0) return false;

    const meta = await sharp(rawBuf).metadata();
    const origW = meta.width || 227;
    const isSmallSource = origW < 500;

    // 1. Thumbnail: lightweight 340px width, sharp & optimized (~30-50KB)
    const thumbBuf = await sharp(rawBuf)
      .resize(340, 475, { kernel: sharp.kernel.lanczos3, fit: 'fill' })
      .sharpen({ sigma: 0.8, m1: 1.0, m2: 0.5 })
      .webp({ quality: 84, effort: 4 })
      .toBuffer();

    // 2. High-Res HD: 1150px width (or upscaled for older cards), ultra-sharp quality (~200-800KB)
    let hdPipeline = sharp(rawBuf);
    if (isSmallSource) {
      // Super-resolution upscale + edge enhancement for older low-res cards
      hdPipeline = hdPipeline
        .resize(1000, 1400, { kernel: sharp.kernel.lanczos3, fit: 'fill' })
        .sharpen({ sigma: 1.4, m1: 1.8, m2: 0.7 });
    } else {
      // Natural high-resolution compression from crystal clear source
      hdPipeline = hdPipeline
        .resize(1150, 1606, { kernel: sharp.kernel.lanczos3, fit: 'fill' })
        .sharpen({ sigma: 0.9, m1: 1.2, m2: 0.6 });
    }

    const hdBuf = await hdPipeline.webp({ quality: 92, effort: 4 }).toBuffer();

    fs.writeFileSync(thumbPath, thumbBuf);
    fs.writeFileSync(hdPath, hdBuf);

    console.log(`✅ [${card.set?.id} ${card.collectorNumber}] ${card.name}`);
    console.log(`   Source: ${meta.width}x${meta.height} (${(rawBuf.length / 1024).toFixed(1)} KB)`);
    console.log(`   Thumb:  340x475 (${(thumbBuf.length / 1024).toFixed(1)} KB) -> ${path.basename(thumbPath)}`);
    console.log(`   HD:     1150x1606 (${(hdBuf.length / 1024).toFixed(1)} KB) -> ${path.basename(hdPath)}`);
    return true;
  } catch (err) {
    console.error(`❌ Error processing ${card.name}:`, err.message);
    return false;
  }
}

// If run directly, process selected test cards
async function main() {
  const sampleTargets = [
    { set: 'SV4a', num: '331' }, // Shiny Charizard ex SAR
    { set: 'SC3a', num: '003' }, // Charizard
    { set: 'SC3a', num: '005' }, // Charizard VMAX
    { set: 'S12a', num: '253' }, // Giratina VSTAR UR
    { set: 'SV-P', num: '001' }, // Pikachu Promo
    { set: 'SV3', num: '028' },  // Charizard ex
  ];

  console.log(`🚀 Processing ${sampleTargets.length} sample cards for Ultra-HD vs Thumbnail separation...\n`);

  for (const target of sampleTargets) {
    const card = cards.find(
      (c) => c.set?.id === target.set && (c.collectorNumber || '').includes(target.num)
    );
    if (card) {
      await processCardImage(card);
      console.log('----------------------------------------------------');
    }
  }

  console.log('\n🎉 Finished sample processing!');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}

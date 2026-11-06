// @ts-check
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const THAI_CARDS_FILE = path.join(ROOT_DIR, 'src', 'data', 'pokemonNames.json');
const OUTPUT_HASH_FILE = path.join(ROOT_DIR, 'src', 'data', 'thaiCardArtHashes.json');

/**
 * Extract dual perceptual hashes:
 * 1. boxHash: upper standard illustration frame
 * 2. fullHash: wide center card art frame
 */
async function computeArtHashes(imageBufferOrPath) {
  try {
    const meta = await sharp(imageBufferOrPath).metadata();
    const w = meta.width || 300;
    const h = meta.height || 420;

    // 1. Box Art (Standard Upper illustration frame)
    const bLeft = Math.round(w * 0.12);
    const bTop = Math.round(h * 0.15);
    const bW = Math.round(w * 0.76);
    const bH = Math.round(h * 0.38);

    const { data: bData } = await sharp(imageBufferOrPath)
      .extract({ left: bLeft, top: bTop, width: bW, height: bH })
      .resize(9, 8, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let boxHash = '';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        boxHash += bData[r * 9 + c] < bData[r * 9 + c + 1] ? '1' : '0';
      }
    }

    // 2. Full Center Art (for Full Arts / Trainers / SARs)
    const fLeft = Math.round(w * 0.10);
    const fTop = Math.round(h * 0.15);
    const fW = Math.round(w * 0.80);
    const fH = Math.round(h * 0.65);

    const { data: fData } = await sharp(imageBufferOrPath)
      .extract({ left: fLeft, top: fTop, width: fW, height: fH })
      .resize(9, 8, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let fullHash = '';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        fullHash += fData[r * 9 + c] < fData[r * 9 + c + 1] ? '1' : '0';
      }
    }

    return { boxHash, fullHash };
  } catch (err) {
    return null;
  }
}

async function main() {
  console.log('[Thai-Hashes] Loading Thai cards...');
  const thaiCards = JSON.parse(await fs.readFile(THAI_CARDS_FILE, 'utf-8'));
  console.log(`[Thai-Hashes] Processing ${thaiCards.length} cards...`);

  const hashes = {};
  let count = 0;
  const t0 = Date.now();

  for (const card of thaiCards) {
    const cleanPath = (card.imageUrl || '').replace(/^\/?PokeCountTracker\/?/, '');
    const localFile = path.join(ROOT_DIR, 'public', decodeURIComponent(cleanPath));

    try {
      const res = await computeArtHashes(localFile);
      if (res) {
        hashes[card.id] = res;
        count++;
      }
    } catch {
      // File not found locally or format error
    }

    if (count % 1000 === 0 && count > 0) {
      const sec = (Date.now() - t0) / 1000;
      console.log(`  [Progress] ${count}/${thaiCards.length} hashed (${(count / sec).toFixed(0)} cards/s)`);
    }
  }

  console.log(`[Thai-Hashes] Complete! Hashed ${count}/${thaiCards.length} cards.`);
  await fs.writeFile(OUTPUT_HASH_FILE, JSON.stringify(hashes), 'utf-8');
  console.log(`[Thai-Hashes] Saved to ${OUTPUT_HASH_FILE}`);
}

main().catch(console.error);

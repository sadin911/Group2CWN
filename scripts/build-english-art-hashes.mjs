// @ts-check
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const EN_CARDS_FILE = path.join(ROOT_DIR, 'src', 'data', 'pokemonCardsEn.json');
const OUTPUT_HASH_FILE = path.join(ROOT_DIR, 'src', 'data', 'enCardArtHashes.json');

async function computeArtHashes(imageBuffer) {
  try {
    const meta = await sharp(imageBuffer).metadata();
    const w = meta.width || 300;
    const h = meta.height || 420;

    // 1. Box Art (Standard Upper illustration frame)
    const bLeft = Math.round(w * 0.12);
    const bTop = Math.round(h * 0.15);
    const bW = Math.round(w * 0.76);
    const bH = Math.round(h * 0.38);

    const { data: bData } = await sharp(imageBuffer)
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

    const { data: fData } = await sharp(imageBuffer)
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
  console.log('[EN-Hashes] Loading English cards...');
  const enCards = JSON.parse(await fs.readFile(EN_CARDS_FILE, 'utf-8'));
  console.log(`[EN-Hashes] Total cards: ${enCards.length}`);

  let existing = {};
  try {
    existing = JSON.parse(await fs.readFile(OUTPUT_HASH_FILE, 'utf-8'));
    console.log(`[EN-Hashes] Found ${Object.keys(existing).length} existing hashes to reuse.`);
  } catch {
    // Start fresh
  }

  const queue = enCards.filter(c => !existing[c.id]);
  console.log(`[EN-Hashes] Remaining cards to process: ${queue.length}`);

  const CONCURRENCY = 35;
  let completed = 0;
  let successCount = Object.keys(existing).length;
  const t0 = Date.now();

  async function worker() {
    while (queue.length > 0) {
      const card = queue.shift();
      if (!card) break;

      let buf = null;
      const urlsToTry = [card.imageUrl, card.officialImageUrl].filter(Boolean);

      for (const u of urlsToTry) {
        try {
          const resp = await fetch(u, { signal: AbortSignal.timeout(6000) });
          if (resp.ok) {
            buf = Buffer.from(await resp.arrayBuffer());
            break;
          }
        } catch {}
      }

      if (buf) {
        const hashes = await computeArtHashes(buf);
        if (hashes) {
          existing[card.id] = hashes;
          successCount++;
        }
      }

      completed++;
      if (completed % 500 === 0) {
        const sec = (Date.now() - t0) / 1000;
        console.log(`  [Progress] ${completed}/${queue.length + completed} processed (${(completed / sec).toFixed(1)} cards/s) | Valid Hashes: ${successCount}`);
        await fs.writeFile(OUTPUT_HASH_FILE, JSON.stringify(existing), 'utf-8');
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  await fs.writeFile(OUTPUT_HASH_FILE, JSON.stringify(existing), 'utf-8');
  console.log(`[EN-Hashes] Complete! Total hashes: ${Object.keys(existing).length}. Saved to ${OUTPUT_HASH_FILE}`);
}

main().catch(console.error);

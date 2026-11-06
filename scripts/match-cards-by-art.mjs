// @ts-check
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const THAI_CARDS_FILE = path.join(ROOT_DIR, 'src', 'data', 'pokemonNames.json');
const THAI_HASHES_FILE = path.join(ROOT_DIR, 'src', 'data', 'thaiCardArtHashes.json');
const EN_CARDS_FILE = path.join(ROOT_DIR, 'src', 'data', 'pokemonCardsEn.json');
const EN_HASHES_FILE = path.join(ROOT_DIR, 'src', 'data', 'enCardArtHashes.json');
const OUTPUT_MAP_FILE = path.join(ROOT_DIR, 'src', 'data', 'thaiEnglishCardMap.json');

function parseHashTo32BitPair(hashStr) {
  if (!hashStr || hashStr.length !== 64) return null;
  const hi = parseInt(hashStr.slice(0, 32), 2) >>> 0;
  const lo = parseInt(hashStr.slice(32, 64), 2) >>> 0;
  return { hi, lo };
}

function popcount32(v) {
  v = (v - ((v >>> 1) & 0x55555555)) >>> 0;
  v = ((v & 0x33333333) + ((v >>> 2) & 0x33333333)) >>> 0;
  return ((((v + (v >>> 4)) & 0x0F0F0F0F) * 0x01010101) >>> 24);
}

function hammingDistance32(p1, p2) {
  if (!p1 || !p2) return 64;
  return popcount32((p1.hi ^ p2.hi) >>> 0) + popcount32((p1.lo ^ p2.lo) >>> 0);
}

async function main() {
  console.log('🎨 [Art-Matcher] Loading datasets and visual hashes...');
  const [thaiCards, thaiHashes, enCards, enHashes] = await Promise.all([
    fs.readFile(THAI_CARDS_FILE, 'utf-8').then(JSON.parse),
    fs.readFile(THAI_HASHES_FILE, 'utf-8').then(JSON.parse),
    fs.readFile(EN_CARDS_FILE, 'utf-8').then(JSON.parse),
    fs.readFile(EN_HASHES_FILE, 'utf-8').then(JSON.parse).catch(() => ({}))
  ]);

  console.log(`  -> Thai Cards: ${thaiCards.length} (${Object.keys(thaiHashes).length} hashes)`);
  console.log(`  -> English Cards: ${enCards.length} (${Object.keys(enHashes).length} hashes)`);

  const enCardById = new Map();
  for (const c of enCards) {
    enCardById.set(c.id, c);
  }

  // Pre-index English hashes as 32-bit integer pairs for rapid comparison
  const enHashList = [];
  for (const [id, h] of Object.entries(enHashes)) {
    const card = enCardById.get(id);
    if (card && (h.boxHash || h.fullHash)) {
      enHashList.push({
        id,
        card,
        boxPair: parseHashTo32BitPair(h.boxHash),
        fullPair: parseHashTo32BitPair(h.fullHash)
      });
    }
  }
  console.log(`  -> Indexed ${enHashList.length} English cards with visual hashes for matching.`);

  // Load existing manual overrides if any
  let existingMap = {};
  try {
    existingMap = JSON.parse(await fs.readFile(OUTPUT_MAP_FILE, 'utf-8'));
  } catch {}

  const resultMap = {};
  let exactArtCount = 0;
  let highArtCount = 0;
  let manualKept = 0;

  console.log('🎨 [Art-Matcher] Matching Thai cards purely by illustration artwork hashes...');

  let processedTh = 0;
  const t0 = Date.now();

  for (const thCard of thaiCards) {
    processedTh++;
    const thId = thCard.id;
    const thHash = thaiHashes[thId];

    // Check if user manually confirmed or edited this mapping
    if (existingMap[thId]?.matchType === 'manual') {
      resultMap[thId] = existingMap[thId];
      manualKept++;
      continue;
    }

    if (!thHash || (!thHash.boxHash && !thHash.fullHash)) {
      if (existingMap[thId]) {
        resultMap[thId] = existingMap[thId];
      }
      continue;
    }

    const thBoxPair = parseHashTo32BitPair(thHash.boxHash);
    const thFullPair = parseHashTo32BitPair(thHash.fullHash);

    let bestMatch = null;
    let minDistance = 64;

    for (let i = 0; i < enHashList.length; i++) {
      const enItem = enHashList[i];
      let dBox = 64;
      let dFull = 64;

      if (thBoxPair && enItem.boxPair) {
        dBox = hammingDistance32(thBoxPair, enItem.boxPair);
      }
      if (thFullPair && enItem.fullPair) {
        dFull = hammingDistance32(thFullPair, enItem.fullPair);
      }

      const dist = dBox < dFull ? dBox : dFull;

      // We only care about close visual matches
      if (dist <= 10) {
        if (dist < minDistance) {
          minDistance = dist;
          bestMatch = enItem;
        } else if (dist === minDistance && bestMatch) {
          // Tie-break: Prefer matching regulation mark, or matching era
          const thReg = (thCard.regulationMark || '').toUpperCase();
          const enReg = (enItem.card.regulationMark || '').toUpperCase();
          const bestReg = (bestMatch.card.regulationMark || '').toUpperCase();

          if (thReg && enReg === thReg && bestReg !== thReg) {
            bestMatch = enItem;
          }
        }
      }
    }

    if (bestMatch && minDistance <= 10) {
      const isExact = minDistance <= 7;
      if (isExact) exactArtCount++;
      else highArtCount++;

      resultMap[thId] = {
        thCardId: thId,
        thCardName: thCard.name,
        thSetId: thCard.set?.id,
        enCardId: bestMatch.card.id,
        enName: bestMatch.card.name,
        enCardName: bestMatch.card.name,
        enSetId: bestMatch.card.set?.id,
        enSetName: bestMatch.card.set?.name,
        enNumber: bestMatch.card.collectorNumber,
        enCollectorNumber: bestMatch.card.collectorNumber,
        enImageUrl: bestMatch.card.imageUrl,
        enOfficialImageUrl: bestMatch.card.officialImageUrl || '',
        matchMethod: 'art',
        matchType: 'art',
        confidence: isExact ? 95 : 85,
        verified: isExact,
        matchedAt: new Date().toISOString(),
        artDistance: minDistance
      };
    } else if (existingMap[thId] && existingMap[thId].confidence) {
      resultMap[thId] = existingMap[thId];
    }
  }

  const totalMapped = Object.keys(resultMap).length;
  console.log(`\n🎉 [Art-Matcher] Summary:`);
  console.log(`   - Exact Art Matches (dist <= 7): ${exactArtCount}`);
  console.log(`   - Close Art Matches (dist 8-10): ${highArtCount}`);
  console.log(`   - Manual overrides preserved:   ${manualKept}`);
  console.log(`   - Total Mapped:                 ${totalMapped}/${thaiCards.length} (${((totalMapped / thaiCards.length) * 100).toFixed(1)}%)`);

  await fs.writeFile(OUTPUT_MAP_FILE, JSON.stringify(resultMap, null, 2), 'utf-8');
  console.log(`💾 Saved updated visual art mappings to ${OUTPUT_MAP_FILE}`);
}

main().catch(console.error);

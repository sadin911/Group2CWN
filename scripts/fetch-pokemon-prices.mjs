/**
 * Fetch latest Pokemon TCG card market prices from pokemontcg.io (TCGPlayer feed).
 *
 * Emits:
 *   public/data/market_prices.json - Static fetch target for web clients
 *   src/data/market_prices.json    - Bundled static fallback
 */
import fs from 'fs';
import path from 'path';

const API_BASE = 'https://api.pokemontcg.io/v2';
const API_KEY = process.env.POKEMONTCG_API_KEY || '';
const MAX_FETCH_ATTEMPTS = 5;

// Core Standard & Expanded sets to index for Master version
// Every English set the Thai/English card map points at. Fetching only the
// Scarlet & Violet era left 2,727 Thai cards priceless despite already being
// paired — their English counterpart simply was never requested. Keep this in
// step with the sets in src/data/thaiEnglishCardMap.json; the coverage test in
// src/data/thaiPriceRatio.test.ts will not catch a set going missing here.
const SET_IDS = [
  // Scarlet & Violet
  'sv10',   // Destined Rivals
  'sv9',    // Journey Together
  'sv8pt5', // Prismatic Evolutions
  'sv8',    // Surging Sparks
  'sv7',    // Stellar Crown
  'sv6pt5', // Shrouded Fable
  'sv6',    // Twilight Masquerade
  'sv5',    // Temporal Forces
  'sv4pt5', // Paldean Fates
  'sv4',    // Paradox Rift
  'sv3pt5', // 151
  'sv3',    // Obsidian Flames
  'sv2',    // Paldea Evolved
  'sv1',    // Scarlet & Violet Base
  'svp',    // SV Promos
  'rsv10pt5',
  'zsv10pt5',

  // Mega Evolution
  'me1', 'me2', 'me2pt5', 'me3', 'me4', 'me5', 'mep',

  // Sword & Shield
  'swsh1', 'swsh2', 'swsh3', 'swsh35', 'swsh4', 'swsh45', 'swsh45sv',
  'swsh5', 'swsh6', 'swsh7', 'swsh8', 'swsh9', 'swsh9tg',
  'swsh10', 'swsh10tg', 'swsh11', 'swsh11tg', 'swsh12',
  'swsh12pt5', 'swsh12pt5gg', 'swshp',

  // Sun & Moon and specials still referenced by the map
  'sm1', 'sma', 'cel25', 'pgo',
];

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchCardsPage(setId, page = 1, attempt = 1) {
  const url = `${API_BASE}/cards?q=set.id:${setId}&pageSize=250&page=${page}`;
  const headers = {
    Accept: 'application/json',
  };
  if (API_KEY) {
    headers['X-Api-Key'] = API_KEY;
  }

  try {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const text = await res.text();
    return JSON.parse(text);
  } catch (err) {
    // 50 sets in one run makes transient 500/502 from the upstream API common,
    // so retry further and back off harder than the original 3 x 1s. A set that
    // still fails is not lost: pricesMap is seeded from the previous run's file,
    // so its old prices carry over and the next run picks it up.
    if (attempt >= MAX_FETCH_ATTEMPTS) {
      console.warn(
        `   ⚠️ Warning: Set ${setId} (page ${page}) failed after ${MAX_FETCH_ATTEMPTS} attempts: ${err.message}`
      );
      return { data: [], totalCount: 0 };
    }
    await sleep(1500 * attempt);
    return fetchCardsPage(setId, page, attempt + 1);
  }
}

function parsePrice(val) {
  if (val === null || val === undefined || val === '') return null;
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.]/g, ''));
  return isNaN(num) ? null : Math.round(num * 100) / 100;
}

/**
 * Thai cards are estimated at one third of the English market price.
 *
 * This must stay in sync with the same ratio in src/store/pricingStore.ts.
 * `isThaiEstimated` and `enReference` are not optional: getCardMarketPrice
 * matches a Thai cardId directly before it ever reaches its own divide-by-3
 * paths, so an unmarked record here is served to users verbatim — i.e. at the
 * full English price. `enReference` is also what unwrapEnglish() reads to show
 * the English price on demand.
 */
export const THAI_PRICE_DIVISOR = 3;

function toThaiEstimate(record, thId, enName) {
  const third = (value) =>
    value != null ? Math.round((value / THAI_PRICE_DIVISOR) * 100) / 100 : null;

  // Idempotent: the script seeds pricesMap from the previous run's file, so a
  // record reaching here may already be a Thai estimate. Dividing that again
  // would yield a ninth of the English price.
  const enRecord = record.isThaiEstimated && record.enReference
    ? { ...record, regular: record.enReference.regular, foil: record.enReference.foil }
    : record;

  return {
    ...enRecord,
    cardId: thId,
    enName: enName ?? enRecord.enName,
    regular: third(enRecord.regular),
    foil: third(enRecord.foil),
    psa10: third(enRecord.psa10),
    lastSold: third(enRecord.lastSold),
    isThaiEstimated: true,
    enReference: {
      regular: enRecord.regular,
      foil: enRecord.foil,
    },
  };
}

async function main() {
  console.log('⚡ Starting Pokemon TCG Market Price Fetch (Master v1)...');
  console.log(`   Targeting ${SET_IDS.length} modern sets: ${SET_IDS.join(', ')}`);

  // 1. Load Thai-English Card Map to link Thai card IDs
  const thaiMapPath = path.resolve('src/data/thaiEnglishCardMap.json');
  const enToThaiIds = new Map(); // enCardId -> thCardId[]

  if (fs.existsSync(thaiMapPath)) {
    try {
      const mapRaw = JSON.parse(fs.readFileSync(thaiMapPath, 'utf8'));
      for (const [thId, mapping] of Object.entries(mapRaw)) {
        const enId = mapping.enCardId; // e.g. "EN-sv8-1"
        const rawEnId = mapping.enCardId ? mapping.enCardId.replace(/^EN-/, '') : null; // e.g. "sv8-1"

        if (enId) {
          if (!enToThaiIds.has(enId)) enToThaiIds.set(enId, []);
          enToThaiIds.get(enId).push(thId);
        }
        if (rawEnId) {
          if (!enToThaiIds.has(rawEnId)) enToThaiIds.set(rawEnId, []);
          enToThaiIds.get(rawEnId).push(thId);
        }
      }
      console.log(`   Mapped ${enToThaiIds.size} EN IDs to Thai card counterparts.`);
    } catch (e) {
      console.warn('   Could not read thaiEnglishCardMap.json:', e.message);
    }
  }

  // 2. Load existing market prices to preserve English prices if upstream sets fail
  let existingPrices = {};
  const existingPath = path.resolve('public/data/market_prices.json');
  if (fs.existsSync(existingPath)) {
    try {
      const oldData = JSON.parse(fs.readFileSync(existingPath, 'utf8'));
      existingPrices = oldData.prices || {};
    } catch {
      // Ignore
    }
  }

  // Only keep English card price records (EN-* or raw alphanumeric IDs like sv8-25)
  // NEVER seed Thai cards (TH-*) or plain names to avoid ghost/corrupted cross-rarity prices!
  const pricesMap = {};
  for (const [k, v] of Object.entries(existingPrices)) {
    if (!k.startsWith('TH-') && !k.startsWith('custom_') && (k.startsWith('EN-') || /^[a-z0-9]+-[0-9]+[a-z]?$/i.test(k))) {
      pricesMap[k] = v;
    }
  }

  // Baseline for standard Common Basic Energies (sve-1 to sve-16)
  const BASE_ENERGIES = [
    'sve-1', 'sve-2', 'sve-3', 'sve-4', 'sve-5', 'sve-6', 'sve-7', 'sve-8',
    'sve-9', 'sve-10', 'sve-11', 'sve-12', 'sve-13', 'sve-14', 'sve-15', 'sve-16'
  ];
  for (const sveId of BASE_ENERGIES) {
    if (!pricesMap[sveId] && !pricesMap[`EN-${sveId}`]) {
      const sveRecord = {
        cardId: sveId,
        enName: 'Basic Energy',
        regular: 0.15,
        foil: 0.35,
        psa10: null,
        lastSold: 0.15,
        lastSoldDate: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString(),
        source: 'pokemontcg_io',
      };
      pricesMap[sveId] = sveRecord;
      pricesMap[`EN-${sveId}`] = sveRecord;
    }
  }

  let totalCardsFetched = 0;
  let totalPricedCards = 0;

  for (const setId of SET_IDS) {
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      process.stdout.write(`   Fetching set [${setId}] page ${page}... `);
      const json = await fetchCardsPage(setId, page);
      const cards = json.data || [];
      const totalInSet = json.totalCount || cards.length;
      totalCardsFetched += cards.length;

      for (const card of cards) {
        const tcg = card.tcgplayer?.prices || {};
        const normal = tcg.normal;
        const holofoil = tcg.holofoil;
        const reverseHolofoil = tcg.reverseHolofoil;
        const unlimited = tcg.unlimitedNormal;

        const regular =
          parsePrice(normal?.market) ??
          parsePrice(normal?.mid) ??
          parsePrice(unlimited?.market) ??
          parsePrice(holofoil?.market) ??
          null;

        const foil =
          parsePrice(holofoil?.market) ??
          parsePrice(reverseHolofoil?.market) ??
          parsePrice(holofoil?.mid) ??
          parsePrice(reverseHolofoil?.mid) ??
          null;

        if (regular === null && foil === null) {
          continue;
        }

        totalPricedCards++;

        const enCardId = `EN-${card.id}`;
        const rawCardId = card.id;

        // Base price record
        const priceRecord = {
          cardId: card.id,
          enName: card.name,
          regular,
          foil,
          psa10: existingPrices[card.id]?.psa10 ?? null,
          lastSold: existingPrices[card.id]?.lastSold ?? foil ?? regular,
          lastSoldDate: existingPrices[card.id]?.lastSoldDate ?? new Date().toISOString().split('T')[0],
          updatedAt: new Date().toISOString(),
          source: 'pokemontcg_io',
          url: card.tcgplayer?.url || undefined,
        };

        // Key by raw ID (e.g. sv8-25)
        pricesMap[rawCardId] = priceRecord;
        // Key by EN- ID (e.g. EN-sv8-25)
        pricesMap[enCardId] = priceRecord;
      }

      console.log(`OK (${cards.length} cards)`);

      if (cards.length < 250 || totalCardsFetched >= totalInSet) {
        hasMore = false;
      } else {
        page++;
        await sleep(350);
      }
    }

    // Rate-limit safety between sets
    await sleep(600);
  }

  // 3. Link all mapped Thai cards to English prices
  // Cleanly derive all Thai cards from their active English mappings
  if (fs.existsSync(thaiMapPath)) {
    try {
      const mapRaw = JSON.parse(fs.readFileSync(thaiMapPath, 'utf8'));
      let thaiLinked = 0;
      for (const [thId, mapping] of Object.entries(mapRaw)) {
        const enId = mapping.enCardId;
        const rawEnId = enId ? enId.replace(/^EN-/, '') : null;
        const match = (enId && pricesMap[enId]) || (rawEnId && pricesMap[rawEnId]);
        if (match) {
          pricesMap[thId] = toThaiEstimate(match, thId, mapping.enName || match.enName);
          thaiLinked++;
        }
      }
      console.log(`   Linked ${thaiLinked} Thai cards directly to English price feed.`);
    } catch (e) {
      console.warn('   Could not link Thai cards:', e.message);
    }
  }

  const outputPayload = {
    updatedAt: new Date().toISOString(),
    version: '1.0.0',
    totalSets: SET_IDS.length,
    totalPriced: Object.keys(pricesMap).length,
    currency: 'USD',
    prices: pricesMap,
  };

  // Ensure directories exist
  const publicDataDir = path.resolve('public/data');
  if (!fs.existsSync(publicDataDir)) {
    fs.mkdirSync(publicDataDir, { recursive: true });
  }
  const publicPath = path.join(publicDataDir, 'market_prices.json');
  fs.writeFileSync(publicPath, JSON.stringify(outputPayload, null, 2), 'utf8');

  const srcDataDir = path.resolve('src/data');
  const srcPath = path.join(srcDataDir, 'market_prices.json');
  fs.writeFileSync(srcPath, JSON.stringify(outputPayload, null, 2), 'utf8');

  console.log(`\n🎉 Successfully generated Master Market Prices v1!`);
  console.log(`   Total Index Keys: ${Object.keys(pricesMap).length}`);
  console.log(`   -> ${publicPath}`);
  console.log(`   -> ${srcPath}`);
}

main().catch((err) => {
  console.error('❌ Failed to fetch Pokemon prices:', err);
  process.exit(1);
});

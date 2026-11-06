// @ts-check
import fs from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();
const THAI_CARDS_FILE = path.join(ROOT_DIR, 'src/data/pokemonNames.json');
const EN_CARDS_FILE = path.join(ROOT_DIR, 'src/data/pokemonCardsEn.json');
const MAP_FILE = path.join(ROOT_DIR, 'src/data/thaiEnglishCardMap.json');
const TRANSLATIONS_FILE = path.join(ROOT_DIR, 'src/data/pokemonNameTranslations.json');
const MARKET_PRICES_PUB = path.join(ROOT_DIR, 'public/data/market_prices.json');
const MARKET_PRICES_SRC = path.join(ROOT_DIR, 'src/data/market_prices.json');

const thaiCards = JSON.parse(fs.readFileSync(THAI_CARDS_FILE, 'utf8'));
const enCards = JSON.parse(fs.readFileSync(EN_CARDS_FILE, 'utf8'));
const cardMap = JSON.parse(fs.readFileSync(MAP_FILE, 'utf8'));
const transData = JSON.parse(fs.readFileSync(TRANSLATIONS_FILE, 'utf8'));
const marketData = JSON.parse(fs.readFileSync(MARKET_PRICES_PUB, 'utf8'));

const enCardById = new Map();
for (const ec of enCards) {
  enCardById.set(ec.id, ec);
  if (ec.rawId) enCardById.set(ec.rawId, ec);
}

const thToEnName = new Map();
if (transData.pokemon) {
  for (const [enName, thName] of Object.entries(transData.pokemon)) {
    thToEnName.set(thName.trim().toLowerCase(), enName.trim());
  }
}

// 1. Specific High-Priority Target Fixes for known mismatches and unmapped AR/UR/HR cards
const MANUAL_TARGET_REMAP = {
  // Basic Energies (REGULAR) - Must map to standard SVE basic energies, NOT Gold/SIR cards!
  'TH-1717': 'EN-sve-1', // Grass Energy
  'TH-1718': 'EN-sve-2', // Fire Energy (was Excadrill ex SIR!)
  'TH-1720': 'EN-sve-4', // Lightning Energy
  'TH-1721': 'EN-sve-5', // Psychic Energy
  'TH-1722': 'EN-sve-6', // Fighting Energy
  'TH-1724': 'EN-sve-8', // Metal Energy
  'TH-2867': 'EN-sve-2', // Fire Energy
  'TH-2868': 'EN-sve-3', // Water Energy
  'TH-2869': 'EN-sve-4', // Lightning Energy
  'TH-2870': 'EN-sve-5', // Psychic Energy
  'TH-2871': 'EN-sve-6', // Fighting Energy
  'TH-2873': 'EN-sve-8', // Metal Energy
  'TH-3297': 'EN-sve-1', // Grass Energy
  'TH-3299': 'EN-sve-3', // Water Energy
  'TH-3329': 'EN-sve-1', // Grass Energy
  'TH-3356': 'EN-sve-4', // Lightning Energy
  'TH-4532': 'EN-sve-5', // Psychic Energy
  'TH-4535': 'EN-sve-8', // Metal Energy

  // Promos & Regular cards that were corrupted
  'TH-2964': 'EN-swshp-SWSH286', // Pikachu VMAX Promo
  'TH-2963': 'EN-swshp-SWSH285', // Pikachu V Promo
  'TH-2935': 'EN-swsh8-270',     // Espeon VMAX Alt Art / Promo

  // Blatant AR mismatches
  'TH-8516': 'EN-sv4pt5-96',   // Hoppip AR (SV4a 195-190) -> Hoppip Shiny Rare (was Darumaka Common!)
  'TH-8538': 'EN-sv4pt5-115',  // Charcadet AR (SV4a 217-190) -> Charcadet Shiny Rare (was Fletchinder Uncommon!)

  // SWSH Secret Rares (UR / Gold / HR)
  'TH-SEC-10010': 'EN-swsh1-216', // Quick Ball Gold UR
  'TH-SEC-10011': 'EN-swsh1-214', // Metal Saucer Gold UR
  'TH-SEC-10012': 'EN-swsh1-215', // Ordinary Rod Gold UR
  'TH-SEC-10023': 'EN-swsh9-186', // Ultra Ball Gold UR
  'TH-SEC-10024': 'EN-swsh1-204', // Rare Candy Gold UR
  'TH-SEC-10025': 'EN-swsh3-200', // Turbo Patch Gold UR
  'TH-SEC-10027': 'EN-swsh1-206', // Switch Gold UR
  'TH-SEC-10041': 'EN-swsh5-181', // Level Ball Gold UR
  'TH-SEC-10054': 'EN-swsh7-232', // Stormy Mountains Gold UR
  'TH-SEC-10060': 'EN-swsh8-268', // Cross Switcher Gold UR
  'TH-SEC-10064': 'EN-swsh9-186', // Ultra Ball Gold UR
  'TH-SEC-10066': 'EN-swsh9-185', // Magma Basin Gold UR
  'TH-SEC-10071': 'EN-swsh10-214', // Temple of Sinnoh Gold UR
  'TH-SEC-10073': 'EN-swsh2-207', // Scoop Up Net Gold UR
  'TH-SEC-10077': 'EN-swsh11-214', // Mirage Gate Gold UR
  'TH-SEC-10079': 'EN-swsh12-207', // Serena Rainbow Rare HR
  'TH-SEC-10080': 'EN-swsh12-212', // Energy Switch Gold UR
  'TH-SEC-10082': 'EN-swsh12-209', // Worker Rainbow Rare HR
  'TH-12649': 'EN-sv1-257',        // Lightning Energy Gold UR

  // Unmapped AR Cards
  'TH-6355': 'EN-sv3pt5-173', // Pikachu AR (SV2a 173-165) -> Pikachu Illustration Rare 173/165
  'TH-6364': 'EN-sv3pt5-181', // Dragonair AR (SV2a 182-165) -> Dragonair Illustration Rare 181/165
  'TH-6503': 'EN-sv3-199',     // Ninetales AR (SV3 110-108) -> Ninetales Illustration Rare 199/197
  'TH-6506': 'EN-sv3-202',     // Cleffa AR (SV3 113-108) -> Cleffa Illustration Rare 202/197
  'TH-7570': 'EN-sv4-216',     // Iron Jugulis AR (SV4M 078-066) -> Iron Jugulis Illustration Rare 216/182
  'TH-8286': 'EN-sv6-174',     // Froslass AR (SV6 104-101) -> Froslass Illustration Rare 174/167
  'TH-8293': 'EN-sv6-184',     // Lairon AR (SV6 111-101) -> Lairon Illustration Rare 184/167
  'TH-12620': 'EN-sv1-199',    // Tarountula AR (SV1V 079-078) -> Tarountula Illustration Rare 199/198
  'TH-12622': 'EN-sv1-202',    // Scovillain AR (SV1V 081-078) -> Scovillain Illustration Rare 202/198
  'TH-12691': 'EN-sv2-221',    // Paldean Wooper AR (SV1a 085-073) -> Paldean Wooper Illustration Rare 221/193
  'TH-12719': 'EN-sv2-224',    // Orthworm AR (SV2P 081-071) -> Orthworm Illustration Rare 224/193
  'TH-12742': 'EN-sv2-216',    // Tinkatink AR (SV2D 076-071) -> Tinkatink Illustration Rare 216/193
  'TH-12748': 'EN-sv2-227',    // Flamigo AR (SV2D 082-071) -> Flamigo Illustration Rare 227/193
  'TH-12349': 'EN-me1-141',    // Clawitzer AR (MA1 135-126) -> Clawitzer Illustration Rare 141/132
  'TH-13914': 'EN-me2pt5-234', // Banette AR (MA4 135-123) -> Banette Illustration Rare 234/217
};

function createMappingEntry(thCard, enCard, method = 'manual_verified') {
  return {
    thCardId: thCard.id,
    thCardName: thCard.name,
    thSetId: thCard.set?.id,
    enCardId: enCard.id,
    enName: enCard.name,
    enCardName: enCard.name,
    enSetId: enCard.set?.id,
    enSetName: enCard.set?.name,
    enNumber: enCard.collectorNumber,
    enCollectorNumber: enCard.collectorNumber,
    enImageUrl: enCard.imageUrl,
    enOfficialImageUrl: enCard.officialImageUrl || '',
    matchMethod: method,
    matchType: 'manual',
    confidence: 100,
    verified: true,
    matchedAt: new Date().toISOString(),
  };
}

// 2. Apply Manual Targets
let manualApplied = 0;
for (const [thId, targetEnId] of Object.entries(MANUAL_TARGET_REMAP)) {
  const thCard = thaiCards.find(c => c.id === thId);
  const enCard = enCardById.get(targetEnId);
  if (thCard && enCard) {
    cardMap[thId] = createMappingEntry(thCard, enCard, 'manual_verified_fix');
    manualApplied++;
  } else {
    console.warn(`Could not find thCard ${thId} or enCard ${targetEnId}`);
  }
}
console.log(`✅ Applied ${manualApplied} manual target mappings.`);

// 3. Automated Set-Equivalent Match for unmapped SV4a Shiny Cards
const unmappedSV4a = thaiCards.filter(c => c.set?.id === 'SV4a' && c.rarityCode === 'AR' && (!cardMap[c.id] || cardMap[c.id].matchMethod === 'art'));
let sv4aCount = 0;
for (const tc of unmappedSV4a) {
  const enName = thToEnName.get(tc.name.trim().toLowerCase());
  if (enName) {
    const enMatch = enCards.find(ec => ec.set?.id === 'sv4pt5' && ec.name.toLowerCase() === enName.toLowerCase() && ec.rarity === 'Shiny Rare');
    if (enMatch) {
      cardMap[tc.id] = createMappingEntry(tc, enMatch, 'sv4a_shiny_match');
      sv4aCount++;
    }
  }
}
console.log(`✅ Mapped ${sv4aCount} SV4a Shiny Rare cards to Paldean Fates.`);

// Save updated cardMap
fs.writeFileSync(MAP_FILE, JSON.stringify(cardMap, null, 2), 'utf8');
console.log(`💾 Saved updated ${MAP_FILE}`);

// 4. Clean and Rebuild market_prices.json
const pricesMap = marketData.prices || {};

// Remove all pure single name keys from pricesMap that cause cross-card pollution
for (const key of Object.keys(pricesMap)) {
  // If key is not TH- and not EN- and does not contain a hyphen with set id (e.g. sv8-1)
  if (!key.startsWith('TH-') && !key.startsWith('EN-') && !/^[a-z0-9]+-\d+$/i.test(key)) {
    // This is a plain name key like "Pikachu", "Water Energy", etc.
    delete pricesMap[key];
  }
}

// Helper to calculate Thai estimated price (1/3 ratio)
function toThaiEstimate(record, thId, enName) {
  const third = (v) => (v != null ? Math.round((v / 3) * 100) / 100 : null);
  const raw = record.enReference || record;
  return {
    cardId: thId,
    enName: enName || record.enName,
    regular: third(raw.regular),
    foil: third(raw.foil),
    psa10: third(raw.psa10),
    lastSold: third(raw.lastSold),
    lastSoldDate: record.lastSoldDate,
    updatedAt: new Date().toISOString(),
    source: record.source || 'pokemontcg_io',
    sourceLabel: record.sourceLabel,
    url: record.url,
    isThaiEstimated: true,
    enReference: {
      regular: raw.regular,
      foil: raw.foil,
    },
  };
}

// Re-link ALL mapped Thai cards strictly by exact enCardId / rawId
let linkedCount = 0;
let repairedCount = 0;

for (const [thId, mapping] of Object.entries(cardMap)) {
  const enId = mapping.enCardId;
  const rawEnId = enId ? enId.replace(/^EN-/, '') : null;
  const match = (enId && pricesMap[enId]) || (rawEnId && pricesMap[rawEnId]);

  if (match) {
    const existing = pricesMap[thId];
    // Check if existing had the wrong URL or mismatch
    if (existing && existing.url && rawEnId && !existing.url.includes(rawEnId)) {
      repairedCount++;
    }
    pricesMap[thId] = toThaiEstimate(match, thId, mapping.enName || match.enName);
    linkedCount++;
  }
}

console.log(`✅ Linked ${linkedCount} Thai cards to exact English prices (Repaired ${repairedCount} corrupted links).`);

marketData.updatedAt = new Date().toISOString();
marketData.prices = pricesMap;
marketData.totalPriced = Object.keys(pricesMap).length;

fs.writeFileSync(MARKET_PRICES_PUB, JSON.stringify(marketData, null, 2), 'utf8');
fs.writeFileSync(MARKET_PRICES_SRC, JSON.stringify(marketData, null, 2), 'utf8');
console.log(`💾 Saved cleaned market_prices to ${MARKET_PRICES_PUB} and ${MARKET_PRICES_SRC}`);

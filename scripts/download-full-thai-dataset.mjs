import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, join } from 'path';

const BASE = 'https://api.tcgdex.net/v2/th';
const DATA_DIR = resolve('./data/pokemon-tcg-th');
const CARDS_DIR = join(DATA_DIR, 'cards');

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.json();
}

async function runPool(items, fn, concurrency = 20, onProgress = null) {
  let index = 0;
  let completed = 0;
  const results = new Array(items.length);

  async function worker() {
    while (index < items.length) {
      const i = index++;
      try {
        results[i] = await fn(items[i], i);
      } catch (err) {
        results[i] = null;
      }
      completed++;
      if (onProgress) onProgress(completed, items.length);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function main() {
  console.log('🚀 Starting Full Thai Pokémon TCG Dataset Download...\n');

  mkdirSync(DATA_DIR, { recursive: true });
  mkdirSync(CARDS_DIR, { recursive: true });

  // 1. Fetch Sets
  console.log('📦 1/4 Fetching Sets list...');
  const setsBrief = await fetchJSON(`${BASE}/sets`);
  console.log(`   Found ${setsBrief.length} sets. Fetching full details for each set...`);

  const fullSets = await runPool(
    setsBrief,
    async (s) => fetchJSON(`${BASE}/sets/${s.id}`),
    10,
    (done, total) => {
      process.stdout.write(`\r   Progress: ${done}/${total} sets fetched`);
    }
  );
  console.log('\n   Saving sets.json...');
  const validSets = fullSets.filter(Boolean);
  writeFileSync(join(DATA_DIR, 'sets.json'), JSON.stringify(validSets, null, 2));

  // 2. Fetch Cards List
  console.log('\n🃏 2/4 Fetching complete Cards index...');
  const cardsBrief = await fetchJSON(`${BASE}/cards`);
  console.log(`   Found ${cardsBrief.length} cards.`);
  writeFileSync(join(DATA_DIR, 'cards_brief.json'), JSON.stringify(cardsBrief, null, 2));

  // 3. Fetch Full Card Details for all cards
  console.log('\n🔍 3/4 Fetching detailed data for all cards...');
  const fullCards = await runPool(
    cardsBrief,
    async (c) => {
      const detail = await fetchJSON(`${BASE}/cards/${c.id}`);
      // Save individual card file
      writeFileSync(join(CARDS_DIR, `${c.id}.json`), JSON.stringify(detail, null, 2));
      return detail;
    },
    25,
    (done, total) => {
      if (done % 50 === 0 || done === total) {
        process.stdout.write(`\r   Progress: ${done}/${total} cards (${Math.round((done / total) * 100)}%)`);
      }
    }
  );

  console.log('\n   Saving all_cards.json (complete dataset)...');
  const validCards = fullCards.filter(Boolean);
  writeFileSync(join(DATA_DIR, 'all_cards.json'), JSON.stringify(validCards, null, 2));

  // 4. Update src/data/pokemonNames.json with full card data
  console.log('\n✨ 4/4 Updating src/data/pokemonNames.json with full card data & images...');
  const enrichedCards = validCards.map(c => ({
    ...c,
    imageUrl: c.image ? `${c.image}/low.webp` : null,
    imageUrlHigh: c.image ? `${c.image}/high.webp` : null
  }));

  // Sort by name in Thai alphabetical order
  enrichedCards.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'th'));

  mkdirSync('./src/data', { recursive: true });
  writeFileSync('./src/data/pokemonNames.json', JSON.stringify(enrichedCards, null, 2));

  console.log(`\n🎉 Completed Successfully!`);
  console.log(`   - Sets Saved: ${validSets.length} → data/pokemon-tcg-th/sets.json`);
  console.log(`   - Cards Saved: ${validCards.length} → data/pokemon-tcg-th/all_cards.json`);
  console.log(`   - Individual Files: ${validCards.length} → data/pokemon-tcg-th/cards/*.json`);
  console.log(`   - Full App Data Saved: ${enrichedCards.length} cards → src/data/pokemonNames.json\n`);
}

main().catch((err) => {
  console.error('❌ Error during download:', err);
  process.exit(1);
});

// @ts-check
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_FILE = path.join(ROOT_DIR, 'src', 'data', 'pokemonCardsEn.json');
const SETS_OUTPUT_FILE = path.join(ROOT_DIR, 'src', 'data', 'pokemonSetsEn.json');

const RAW_BASE_URL = 'https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master';

// Target all modern eras that exist in Thai Pokémon TCG (Sun & Moon 2019 to Present)
const TARGET_SERIES = ['Mega Evolution', 'Scarlet & Violet', 'Sword & Shield', 'Sun & Moon'];

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return res.json();
}

async function main() {
  console.log(`[EN-Cards] Fetching English sets metadata...`);
  const allSets = await fetchJson(`${RAW_BASE_URL}/sets/en.json`);
  
  // Filter all sets matching the modern eras
  const validSets = allSets.filter(s => TARGET_SERIES.includes(s.series));
  
  // Sort sets chronologically by release date (newest first for UI dropdown)
  validSets.sort((a, b) => new Date(b.releaseDate || '1990-01-01').getTime() - new Date(a.releaseDate || '1990-01-01').getTime());
  
  await fs.writeFile(SETS_OUTPUT_FILE, JSON.stringify(validSets, null, 2), 'utf-8');
  console.log(`[EN-Cards] Saved ${validSets.length} sets metadata to ${SETS_OUTPUT_FILE}`);

  console.log(`[EN-Cards] Downloading cards for ${validSets.length} modern English sets...`);
  const allCards = [];

  for (const setMeta of validSets) {
    const setId = setMeta.id;
    const url = `${RAW_BASE_URL}/cards/en/${setId}.json`;
    try {
      console.log(` -> Fetching ${setId} (${setMeta.name}, ${setMeta.series})...`);
      const cards = await fetchJson(url);
      
      const normalized = cards.map(c => {
        const hpNum = c.hp ? parseInt(c.hp, 10) : undefined;
        const category = c.supertype === 'Pokémon' ? 'Pokemon' : c.supertype;
        const stage = c.subtypes?.[0] || 'Basic';
        return {
          id: `EN-${c.id}`,
          rawId: c.id,
          localId: c.number,
          name: c.name,
          supertype: c.supertype,
          category,
          stage,
          subtypes: c.subtypes || [],
          hp: isNaN(hpNum) ? undefined : hpNum,
          types: c.types || [],
          set: {
            id: setId,
            name: setMeta.name || setId,
            series: setMeta.series || 'Scarlet & Violet',
            releaseDate: setMeta.releaseDate || ''
          },
          collectorNumber: `${c.number}/${setMeta.printedTotal || setMeta.total || ''}`,
          regulationMark: c.regulationMark || '',
          rarity: c.rarity || 'Common',
          imageUrl: c.images?.small || c.images?.large || '',
          imageUrlHigh: c.images?.large || c.images?.small || '',
          artist: c.artist || '',
          officialImageUrl: c.images?.small || '',
          officialImageUrlHigh: c.images?.large || ''
        };
      });

      allCards.push(...normalized);
      console.log(`    ✓ ${setId}: ${normalized.length} cards`);
    } catch (err) {
      console.warn(`    ⚠️ Failed to fetch ${setId}: ${err.message}`);
    }
  }

  console.log(`[EN-Cards] Total English cards collected: ${allCards.length}`);
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(allCards, null, 2), 'utf-8');
  console.log(`[EN-Cards] Saved normalized cards to ${OUTPUT_FILE}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

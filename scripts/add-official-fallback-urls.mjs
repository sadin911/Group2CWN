import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_FILE = path.join(__dirname, '../data/pokemon-tcg-th/official_cards_cache.json');
const POKEMON_JSON = path.join(__dirname, '../src/data/pokemonNames.json');

if (fs.existsSync(CACHE_FILE) && fs.existsSync(POKEMON_JSON)) {
  const cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  const cards = JSON.parse(fs.readFileSync(POKEMON_JSON, 'utf8'));

  for (const card of cards) {
    if (card.localId && cache[card.localId]) {
      const official = cache[card.localId];
      if (official.imageUrl) {
        card.officialImageUrl = official.imageUrl;
      }
    }
  }

  fs.writeFileSync(POKEMON_JSON, JSON.stringify(cards, null, 2), 'utf8');
  console.log(`Added officialImageUrl to ${cards.length} cards in pokemonNames.json!`);
}

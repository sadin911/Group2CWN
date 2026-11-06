// @ts-check
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const R2_BASE = 'https://pub-af524b77e8e3403685545bc0a8222090.r2.dev';

async function main() {
  console.log('🔄 Updating English cards dataset and mappings with Cloudflare R2 URLs...');

  // 1. Update src/data/pokemonCardsEn.json
  const cardsEnPath = path.join(ROOT_DIR, 'src', 'data', 'pokemonCardsEn.json');
  const cardsEnRaw = await fs.readFile(cardsEnPath, 'utf-8');
  const cardsEn = JSON.parse(cardsEnRaw);

  const updatedCardsEn = cardsEn.map((c) => {
    const setId = (c.set?.id || '').toLowerCase();
    const num = c.localId;
    return {
      ...c,
      imageUrl: `${R2_BASE}/card-images-en/${setId}/${num}.webp`,
      imageUrlHigh: `${R2_BASE}/card-images-en-hd/${setId}/${num}.jpg`,
      officialImageUrl: `https://images.pokemontcg.io/${setId}/${num}.png`,
      officialImageUrlHigh: `https://images.pokemontcg.io/${setId}/${num}_hires.png`,
    };
  });

  await fs.writeFile(cardsEnPath, JSON.stringify(updatedCardsEn, null, 2), 'utf-8');
  console.log(`✅ Updated ${updatedCardsEn.length} cards in ${cardsEnPath}`);

  // 2. Update src/data/thaiEnglishCardMap.json
  const mapPath = path.join(ROOT_DIR, 'src', 'data', 'thaiEnglishCardMap.json');
  const mapRaw = await fs.readFile(mapPath, 'utf-8');
  const mapping = JSON.parse(mapRaw);

  for (const key of Object.keys(mapping)) {
    const item = mapping[key];
    if (item && item.enSetId && item.enNumber) {
      const setId = item.enSetId.toLowerCase();
      const num = item.enNumber;
      item.enImageUrl = `${R2_BASE}/card-images-en/${setId}/${num}.webp`;
      item.enOfficialImageUrl = `https://images.pokemontcg.io/${setId}/${num}.png`;
    }
  }

  await fs.writeFile(mapPath, JSON.stringify(mapping, null, 2), 'utf-8');
  console.log(`✅ Updated ${Object.keys(mapping).length} mappings in ${mapPath}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

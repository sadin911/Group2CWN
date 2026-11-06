import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IMAGES_DIR = path.join(__dirname, '../public/card-images');
const POKEMON_JSON_FILE = path.join(__dirname, '../src/data/pokemonNames.json');
const CONCURRENCY = 30;

function getAllPngFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      results = results.concat(getAllPngFiles(filePath));
    } else if (file.endsWith('.png')) {
      results.push({ path: filePath, size: stat.size });
    }
  }
  return results;
}

async function convertBatch(files) {
  let totalOrigSize = 0;
  let totalNewSize = 0;
  let convertedCount = 0;

  for (const item of files) {
    totalOrigSize += item.size;
  }

  console.log(`Starting WebP conversion for ${files.length} PNG images with concurrency ${CONCURRENCY}...`);

  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const chunk = files.slice(i, i + CONCURRENCY);
    await Promise.all(
      chunk.map(async item => {
        const webpPath = item.path.replace(/\.png$/, '.webp');
        try {
          // Convert PNG to WebP (quality 82 provides crisp details while cutting size 90%+)
          await sharp(item.path)
            .webp({ quality: 82, effort: 4 })
            .toFile(webpPath);

          const stat = fs.statSync(webpPath);
          totalNewSize += stat.size;

          // Delete original PNG to free up disk space
          fs.unlinkSync(item.path);
          convertedCount++;
        } catch (err) {
          console.error(`Error converting ${item.path}:`, err.message);
        }
      })
    );

    if ((i + CONCURRENCY) % 600 === 0 || i + CONCURRENCY >= files.length) {
      const pct = Math.min(100, Math.round(((i + CONCURRENCY) / files.length) * 100));
      console.log(`Progress: ${convertedCount}/${files.length} (${pct}%)`);
    }
  }

  const origMB = (totalOrigSize / (1024 * 1024)).toFixed(1);
  const newMB = (totalNewSize / (1024 * 1024)).toFixed(1);
  const savingsPct = (((totalOrigSize - totalNewSize) / totalOrigSize) * 100).toFixed(1);

  console.log(`\n🎉 Conversion complete!`);
  console.log(`- Original Size: ${origMB} MB`);
  console.log(`- New WebP Size: ${newMB} MB`);
  console.log(`- Space Saved:   ${(totalOrigSize - totalNewSize) / (1024 * 1024 * 1024) > 1 ? ((totalOrigSize - totalNewSize) / (1024 * 1024 * 1024)).toFixed(2) + ' GB' : (totalOrigSize - totalNewSize) / (1024 * 1024) + ' MB'} (${savingsPct}%)`);
}

function updatePokemonJson() {
  console.log('\nUpdating src/data/pokemonNames.json image extensions to .webp...');
  if (!fs.existsSync(POKEMON_JSON_FILE)) {
    console.error('pokemonNames.json not found!');
    return;
  }

  const cards = JSON.parse(fs.readFileSync(POKEMON_JSON_FILE, 'utf8'));
  let updatedCount = 0;

  for (const card of cards) {
    if (card.imageUrl && card.imageUrl.endsWith('.png')) {
      card.imageUrl = card.imageUrl.replace(/\.png$/, '.webp');
      updatedCount++;
    }
    if (card.imageUrlHigh && card.imageUrlHigh.endsWith('.png')) {
      card.imageUrlHigh = card.imageUrlHigh.replace(/\.png$/, '.webp');
    }
  }

  fs.writeFileSync(POKEMON_JSON_FILE, JSON.stringify(cards, null, 2), 'utf8');
  console.log(`Updated ${updatedCount} card image paths in pokemonNames.json to .webp.`);
}

async function main() {
  const pngFiles = getAllPngFiles(IMAGES_DIR);
  if (pngFiles.length === 0) {
    console.log('No PNG files found to convert in public/card-images.');
  } else {
    await convertBatch(pngFiles);
  }
  updatePokemonJson();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

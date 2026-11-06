import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, '../src/data/pokemonNames.json');
const OUTPUT_FILE = path.join(__dirname, '../src/data/evolutionLines.json');
const CONCURRENCY = 30;

const cards = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
const pokemonCards = cards.filter(c => c.category === 'Pokemon');

// Map: Pokemon Name -> Set of related evolution names
const evoMap = {};

function addRelation(nameA, nameB) {
  if (!nameA || !nameB || nameA === nameB) return;
  const a = nameA.trim();
  const b = nameB.trim();
  if (!evoMap[a]) evoMap[a] = new Set();
  if (!evoMap[b]) evoMap[b] = new Set();
  evoMap[a].add(b);
  evoMap[b].add(a);
}

// Pick one card ID per unique Pokemon name to minimize requests (~1,800 requests)
const nameToCardId = new Map();
for (const card of pokemonCards) {
  const name = card.name.trim();
  if (!nameToCardId.has(name)) {
    nameToCardId.set(name, card.localId);
  }
}

const uniqueEntries = Array.from(nameToCardId.entries());
console.log(`Extracting evolution lines for ${uniqueEntries.length} unique Pokemon names...`);

let completed = 0;
const total = uniqueEntries.length;

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept-Language': 'th,en;q=0.9',
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 400 * (i + 1)));
    }
  }
}

async function worker(queue) {
  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) break;
    const [name, id] = item;

    try {
      const html = await fetchWithRetry(`https://asia.pokemon-card.com/th/card-search/detail/${id}/`);
      const evoMatch = html.match(/<div class="evolution">([\s\S]*?)<\/div>/);
      if (evoMatch) {
        const steps = [...evoMatch[1].matchAll(/<li class="step[^"]*"><a[^>]*>([\s\S]*?)<\/a><\/li>/g)]
          .map(m => m[1].replace(/<[^>]+>/g, '').trim())
          .filter(Boolean);

        // Connect all steps in this chain
        for (let i = 0; i < steps.length; i++) {
          for (let j = 0; j < steps.length; j++) {
            if (i !== j) {
              addRelation(steps[i], steps[j]);
            }
          }
        }
      }
    } catch (err) {
      console.error(`Error on card ${id} (${name}):`, err.message);
    } finally {
      completed++;
      if (completed % 200 === 0 || completed === total) {
        console.log(`Evolution progress: ${completed}/${total} (${((completed/total)*100).toFixed(1)}%)`);
      }
    }
  }
}

async function run() {
  const queue = [...uniqueEntries];
  const workers = Array.from({ length: CONCURRENCY }, () => worker(queue));
  await Promise.all(workers);

  // Convert Sets to Arrays
  const finalJson = {};
  for (const [key, set] of Object.entries(evoMap)) {
    finalJson[key] = Array.from(set);
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalJson, null, 2));
  console.log(`Saved evolution lines for ${Object.keys(finalJson).length} Pokemon to ${OUTPUT_FILE}!`);
}

run().catch(console.error);

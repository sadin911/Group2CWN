import { writeFileSync, mkdirSync } from 'fs';

const BASE = 'https://api.tcgdex.net/v2/th';

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function runBatch(tasks, concurrency = 15) {
  for (let i = 0; i < tasks.length; i += concurrency) {
    await Promise.allSettled(tasks.slice(i, i + concurrency).map(fn => fn()));
  }
}

async function main() {
  // Step 1: Collect one representative card ID per unique name
  console.log('Fetching sets...');
  const sets = await fetchJSON(`${BASE}/sets`);
  const nameToCardId = new Map(); // name → last seen card id
  let populated = 0;

  await runBatch(sets.map(set => async () => {
    try {
      const data = await fetchJSON(`${BASE}/sets/${set.id}`);
      if (data.cards?.length > 0) {
        data.cards.forEach(c => { if (c.name && c.id) nameToCardId.set(c.name.trim(), c.id); });
        populated++;
        process.stdout.write(`\r  ${populated} sets, ${nameToCardId.size} unique names...`);
      }
    } catch {}
  }), 6);

  console.log(`\n${nameToCardId.size} unique names from ${populated} sets`);

  // Step 2: Fetch HP for each representative card
  console.log('Fetching HP data per card...');
  const entries = Array.from(nameToCardId.entries());
  const result = new Map();
  let fetched = 0;

  await runBatch(entries.map(([name, cardId]) => async () => {
    try {
      const card = await fetchJSON(`${BASE}/cards/${cardId}`);
      result.set(name, { name, hp: card.hp ?? null });
    } catch {
      result.set(name, { name, hp: null });
    }
    fetched++;
    if (fetched % 100 === 0) process.stdout.write(`\r  ${fetched}/${entries.length} cards...`);
  }), 20);

  console.log(`\nDone! ${result.size} entries`);

  const sorted = Array.from(result.values()).sort((a, b) => a.name.localeCompare(b.name, 'th'));
  mkdirSync('./src/data', { recursive: true });
  writeFileSync('./src/data/pokemonNames.json', JSON.stringify(sorted));
  console.log('Saved → src/data/pokemonNames.json');
}

main().catch(err => { console.error(err); process.exit(1); });

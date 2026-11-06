/**
 * One-off repair for Thai card prices that were stored at the full English
 * price instead of one third of it.
 *
 * Cause: fetch-pokemon-prices.mjs wrote the English price record straight into
 * the mapped Thai card ids, with no division and without setting
 * `isThaiEstimated` / `enReference`. Because getCardMarketPrice matches a Thai
 * cardId directly before reaching its own divide-by-3 paths, those records were
 * served to users verbatim. The generator is fixed; this repairs the data it
 * already produced.
 *
 * Only records that are BOTH unmarked (`isThaiEstimated` falsy) AND still equal
 * to their mapped English price are touched, so re-running is safe and already
 * correct records are left alone.
 *
 * Run with: node scripts/repair-thai-price-ratio.mjs [--write]
 * Without --write it reports what it would change and exits.
 */
import fs from 'node:fs';
import path from 'node:path';

const DIVISOR = 3;
const WRITE = process.argv.includes('--write');

const TARGETS = ['src/data/market_prices.json', 'public/data/market_prices.json'];
const MAP_PATH = 'src/data/thaiEnglishCardMap.json';

const third = (v) => (v != null ? Math.round((v / DIVISOR) * 100) / 100 : null);
const near = (a, b) => a != null && b != null && b !== 0 && Math.abs(a / b - 1) < 0.02;

const cardMap = JSON.parse(fs.readFileSync(path.resolve(MAP_PATH), 'utf8'));

for (const target of TARGETS) {
  const file = path.resolve(target);
  if (!fs.existsSync(file)) {
    console.log(`- ${target}: missing, skipped`);
    continue;
  }

  const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
  const prices = payload.prices || {};

  let repaired = 0;
  let alreadyMarked = 0;
  let noEnglishPrice = 0;

  for (const [thId, mapping] of Object.entries(cardMap)) {
    const record = prices[thId];
    if (!record) continue;

    if (record.isThaiEstimated) {
      alreadyMarked++;
      continue;
    }

    const enId = mapping.enCardId;
    const en =
      (enId && prices[enId]) ||
      (enId && prices[enId.replace(/^EN-/, '')]) ||
      (mapping.enName && prices[mapping.enName]);

    if (!en || en.regular == null) {
      noEnglishPrice++;
      continue;
    }

    // Only repair records that still carry the undivided English price.
    if (!near(record.regular, en.regular)) continue;

    prices[thId] = {
      ...record,
      regular: third(en.regular),
      foil: third(en.foil),
      psa10: third(en.psa10),
      lastSold: third(en.lastSold),
      isThaiEstimated: true,
      enReference: { regular: en.regular, foil: en.foil },
    };
    repaired++;
  }

  console.log(`\n${target}`);
  console.log(`  repaired            : ${repaired}`);
  console.log(`  already correct     : ${alreadyMarked}`);
  console.log(`  no English price    : ${noEnglishPrice}`);

  if (WRITE && repaired > 0) {
    payload.prices = prices;
    fs.writeFileSync(file, JSON.stringify(payload, null, 2) + '\n');
    console.log('  -> written');
  } else if (!WRITE) {
    console.log('  -> dry run, nothing written (pass --write to apply)');
  }
}

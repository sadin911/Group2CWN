/**
 * Exports the project's live Firestore indexes to firestore.indexes.json.
 *
 * Run with: npm run rules:indexes:export
 *
 * Writes the file only after the CLI output parses as JSON. A plain
 * `firebase firestore:indexes > firestore.indexes.json` truncates the file
 * before the command runs, so a failure (not logged in, wrong project) leaves
 * an empty or half-written file behind — and that file is precisely what a
 * later `firebase deploy --only firestore:indexes` uses to decide which
 * indexes to delete. Deleting an index does not lose documents, but it breaks
 * every query that needed it until the index is rebuilt.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync, existsSync, readFileSync } from 'node:fs';

const OUT = 'firestore.indexes.json';

function fail(message, detail) {
  console.error(`\n✗ ${message}`);
  if (detail) console.error(String(detail).trim());
  console.error(`\n${OUT} was NOT modified.`);
  process.exit(1);
}

let raw;
try {
  // stdio[2] inherit so login prompts and CLI errors stay visible.
  raw = execFileSync('npx', ['-y', 'firebase-tools', 'firestore:indexes'], {
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'inherit'],
    maxBuffer: 32 * 1024 * 1024,
  });
} catch (err) {
  fail(
    'firebase-tools could not read the indexes.',
    'If this is an auth error, run:  npx -y firebase-tools login'
  );
}

let parsed;
try {
  parsed = JSON.parse(raw);
} catch (err) {
  fail('The CLI output was not valid JSON, so nothing was written.', raw?.slice(0, 400));
}

const indexes = Array.isArray(parsed.indexes) ? parsed.indexes : [];
const fieldOverrides = Array.isArray(parsed.fieldOverrides) ? parsed.fieldOverrides : [];

if (existsSync(OUT)) {
  const previous = readFileSync(OUT, 'utf8');
  if (previous === JSON.stringify(parsed, null, 2) + '\n') {
    console.log(`✓ ${OUT} already matches the project. Nothing to do.`);
    process.exit(0);
  }
  console.log(`ℹ ${OUT} exists and differs — overwriting with what the project actually has.`);
}

writeFileSync(OUT, JSON.stringify(parsed, null, 2) + '\n');

console.log(`\n✓ Wrote ${OUT}`);
console.log(`  composite indexes : ${indexes.length}`);
console.log(`  field overrides   : ${fieldOverrides.length}`);

if (indexes.length === 0 && fieldOverrides.length === 0) {
  console.log('\nNothing is defined, so wiring indexes into firebase.json risks nothing.');
} else {
  console.log('\nKeep this file exactly as exported. Review it before enabling');
  console.log('"indexes" in firebase.json, and never deploy indexes with --force.');
}

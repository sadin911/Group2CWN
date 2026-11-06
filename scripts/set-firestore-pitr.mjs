/**
 * Inspect or change the two Firestore safety settings this project cares about:
 * point-in-time recovery, and delete protection.
 *
 * Without PITR, Firestore keeps only about an hour of document versions. That
 * hour is the only reason the binder wiped on 2026-08-28 was recoverable at
 * all. With PITR the window is 7 days.
 *
 * Usage:
 *   node scripts/set-firestore-pitr.mjs                        # show current state
 *   node scripts/set-firestore-pitr.mjs --enable               # PITR on
 *   node scripts/set-firestore-pitr.mjs --disable              # PITR off
 *   node scripts/set-firestore-pitr.mjs --enable-delete-protection
 *   node scripts/set-firestore-pitr.mjs --disable-delete-protection
 *
 * Delete protection blocks deletion of the whole database. It is free, and it
 * guards a different failure than PITR does: PITR recovers content, delete
 * protection stops the database itself from being removed.
 *
 * Note: enabling is not retroactive. The window starts at one hour before the
 * moment you enable, and only reaches a full 7 days after PITR has been on for
 * a week.
 */
import { GoogleAuth } from 'google-auth-library';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');

function findServiceAccountKey() {
  const file = fs
    .readdirSync(ROOT)
    .find((f) => f.includes('firebase-adminsdk') && f.endsWith('.json'));
  if (!file) throw new Error('service account key not found in the project root');
  return path.join(ROOT, file);
}

const sa = JSON.parse(fs.readFileSync(findServiceAccountKey(), 'utf8'));
const auth = new GoogleAuth({
  credentials: sa,
  scopes: ['https://www.googleapis.com/auth/datastore', 'https://www.googleapis.com/auth/cloud-platform'],
});
const client = await auth.getClient();
const url = `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)`;

async function show(label) {
  const { data } = await client.request({ url });
  console.log(`${label}`);
  console.log(`  pointInTimeRecoveryEnablement: ${data.pointInTimeRecoveryEnablement}`);
  console.log(`  earliestVersionTime          : ${data.earliestVersionTime}`);
  console.log(`  deleteProtectionState        : ${data.deleteProtectionState}`);
  return data;
}

const args = process.argv.slice(2);
const enable = args.includes('--enable');
const disable = args.includes('--disable');
const protect = args.includes('--enable-delete-protection');
const unprotect = args.includes('--disable-delete-protection');

await show(`project ${sa.project_id} — current:`);

const changes = {};
const masks = [];
if (enable || disable) {
  changes.pointInTimeRecoveryEnablement = enable
    ? 'POINT_IN_TIME_RECOVERY_ENABLED'
    : 'POINT_IN_TIME_RECOVERY_DISABLED';
  masks.push('pointInTimeRecoveryEnablement');
}
if (protect || unprotect) {
  changes.deleteProtectionState = protect
    ? 'DELETE_PROTECTION_ENABLED'
    : 'DELETE_PROTECTION_DISABLED';
  masks.push('deleteProtectionState');
}

if (masks.length === 0) {
  console.log(
    '\n(no change requested — pass --enable / --disable / --enable-delete-protection / --disable-delete-protection)'
  );
  process.exit(0);
}

for (const [field, value] of Object.entries(changes)) {
  console.log(`\nsetting ${field}=${value} ...`);
}

try {
  await client.request({
    url: `${url}?${masks.map((m) => `updateMask=${m}`).join('&')}`,
    method: 'PATCH',
    data: changes,
  });
} catch (err) {
  const status = err?.response?.status;
  const message = err?.response?.data?.error?.message || err.message;
  console.error(`\nFAILED (${status ?? 'error'}): ${message}`);
  if (status === 403) {
    console.error(
      '\nThe service account can read these settings but not change them: updating a\n' +
        'database needs datastore.databases.update, which the Firebase Admin SDK service\n' +
        'agent role does not carry. Either change it in the console:\n' +
        '  Google Cloud Console -> Firestore -> Databases -> (default) -> Edit\n' +
        'or grant the service account roles/datastore.owner and re-run.'
    );
  }
  process.exit(1);
}

await show('\nafter:');

if (enable) {
  console.log(
    '\nReminder: this is not retroactive. Right now you can read back to one hour\n' +
      'before enablement; the window grows to the full 7 days after a week.'
  );
}

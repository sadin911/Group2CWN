---
name: data-safety-sync
description: Use when about to change any code that writes, merges, overwrites, or deletes user collection/deck/binder data — Firestore writes, cloud sync, migrations, localStorage persistence, sign-in hydration, or bulk import. Also use when a user reports missing cards, a shrunken collection, or data that reverted after signing in.
---

# Data Safety: Sync & Destructive Writes

## Overview

A sync change once wiped a live 228-card collection. Collection data is the product.
**A write path that can replace real data with less data is a bug, even when no one has hit it yet.**

Rule: **red test first, guard second, deploy third.** No sync change ships without a test
that fails before the fix and passes after.

## When to Use

Trigger on any diff touching:
- `src/store/collectionStore.ts`, `deckStore.ts`, `authStore.ts`, `communityStore.ts` write/merge paths
- anything calling `setDoc`, `updateDoc`, `deleteDoc`, `writeBatch`, `runTransaction`
- localStorage/IndexedDB persistence or rehydration
- scripts under `scripts/` that upload, repair, or reorganize card data
- sign-in / sign-out hydration and "link cloud binder" flows

Skip only for pure read paths (queries, selectors, display).

## The Invariants

Every write path must satisfy all four. State which ones your change touches.

1. **Never shrink to empty.** A remote/local read of `[]` or `undefined` must never
   overwrite a non-empty stored collection. Treat empty as "unknown", not "deleted".
2. **Merge by id, resolve by timestamp.** Never blind-replace a collection document.
   Merge entries by card id; on conflict the higher `updatedAt` wins.
3. **Deletes are explicit and singular.** A delete must originate from a user action on a
   specific id. No code path deletes "everything not present in the incoming payload".
4. **Writes are atomic.** Multi-document updates use `writeBatch`/`runTransaction` so a
   mid-flight network failure cannot leave a half-written collection.

## Required Workflow

1. **Map the blast radius.** List every function that can mutate stored data for this
   change, as a table of `file:line | what it writes | worst-case failure`.
2. **Write the red tests BEFORE touching production code.** Minimum scenarios:
   - remote returns `[]` while local has N cards
   - remote returns a partial/truncated page
   - local and remote both modified, conflicting `updatedAt`
   - write fails mid-batch (mock a rejection)
   - fresh device, first sign-in, empty local + populated remote
   - populated local, populated remote, no overlap (union expected, not replacement)
3. **Run `npm test` and show the failures.** A test that passes before the fix proves nothing —
   rewrite it until it fails for the right reason.
4. **Implement the guard**, then iterate to green.
5. **Report** the invariants added, the test names covering each, and anything left unsafe.

## Red Flags — Stop

- "The guard is obvious, I'll just add it and eyeball it"
- "It's only a refactor of the sync function"
- "I'll add tests after it works"
- "Empty array just means the user has no cards"
- "The existing tests already cover this area"

All of these mean: write the failing test first.

## Verification

```bash
npm test        # Vitest — store logic incl. the cloud-write guard
npm run lint
npm run build
```

Do not verify sync behavior with a browser or screenshots. Tests and logs only.

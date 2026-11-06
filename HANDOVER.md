# Handover — 2026-09-08 (updated)

State of the project after the Claude Code session on 2026-09-08.

`main` is at **v2.33.0**, deployed and verified live at https://poke.tcgcount.com.
No uncommitted work. The previous session's Share Collection feature is merged.

---

## 0. TL;DR — What to do next

Nothing is blocked. Optional follow-ups are in section 5.

---

## 1. Share Collection — shipped in v2.33.0

The feature the previous handover left uncommitted is now committed, fixed, and released.
It did **not** compile as handed over; four defects were found and fixed:

| Defect | Impact | Fix |
| --- | --- | --- |
| `incrementVariant(cardId, vKey, newProfileId)` — 3 args, signature takes 2 | Clone wrote into whichever binder was active | Call `switchProfile(newProfileId)` explicitly first |
| `entry.costPrice` not on `CollectionCardEntry` | Did not compile; field never read; would have published the owner's **purchase cost** publicly under a toggle promising only market valuation | Removed `customPrice` from the snapshot and from `SharedCardEntry` |
| Mount-time URL sync rewrote `/share/<id>` to `/collection` | Every share link opened to ไม่พบสมุดสะสมที่แชร์ | URL is source of truth until the URL-derived mode is applied ([src/App.tsx](src/App.tsx)) |
| Unused `formatPrice`, unreachable `setSelectedRarity` | Build errors | Removed / reduced |

The URL fix is a **condition, not a one-shot ref** — StrictMode double-invokes effects and
burned through the first attempt at this guard. If you touch that effect, keep it idempotent.

### Known gap

`selectedRarity` in `SharedCollectionViewer` has no UI control, so the rarity filter is a
permanent no-op. Either add the dropdown or drop the filter.

## 2. Architecture Details

### Data Flow

```
Owner clicks "Share" → ShareCollectionModal opens
  → Owner configures settings (prices, wishlist, notes, clone)
  → Owner clicks "สร้างลิงก์แชร์สมุด"
  → publishSharedCollection() runs:
      1. Builds SharedCollectionSnapshot from active profile
      2. Calculates stats (totalCards, uniqueCards, estimatedValue)
      3. Writes to Firestore `shared_collections/{shareId}`
      4. Saves MyShareRecord to localStorage (`pokecount_my_shares`)
      5. Caches full snapshot in localStorage (`pokecount_shared_snap_{shareId}`)
      6. Returns { snapshot, shareUrl }
  → Modal shows URL + QR code + social share buttons
```

```
Visitor opens /share/{shareId}
  → App.tsx detects share route via getShareIdFromURL()
  → Sets mode to 'share', renders SharedCollectionViewer
  → getSharedCollection() runs:
      1. Check localStorage cache first (instant if local)
      2. Check URL ?d= or ?data= param for base64-encoded snapshot
      3. Fallback to Firestore fetch
      4. Increment viewCount in background
  → Viewer renders full collection with filters/sort/search
```

### Key Design Decisions

- **Firestore with URL fallback**: If Firestore write fails (quota, offline), the service
  still works by encoding snapshot data in the URL via base64.
- **localStorage double-cache**: Both `MyShareRecord` (metadata) and full snapshot are cached
  locally, so the owner sees their shared link instantly without a network round-trip.
- **ShareId format**: `pk_` + 8 random alphanumeric chars (e.g., `pk_a3x9b2m7`).
- **Read-only mode on CardCollectionModal**: The existing modal now accepts `readOnly` and
  `sharedCardEntry` props to render in a non-editable state for the shared view.

### Firestore Collection

- **Collection**: `shared_collections`
- **Document ID**: `shareId` (e.g., `pk_a3x9b2m7`)
- **Fields**: All fields from `SharedCollectionSnapshot` type

---

## 3. Quality Gates

All four must pass before a release. They were green for v2.33.0.

```bash
npm run lint          # oxlint — must exit 0 (it reports warnings; only errors block)
npm run build         # tsc -b && vite build — the typecheck is the gate that caught 4 defects
npm test              # Vitest — 148 tests
npx playwright test   # E2E — 92 tests, 4 skipped
```

**Run `npm run build` before trusting any handover that claims code is finished.**
The Share Collection feature was handed over as "fully coded" and did not compile.

---

## 4. Release Procedure

```bash
# 1. Commit work on the feature branch, then bump package.json
# 2. Run all four gates above
# 3. Merge and verify the merge did not change what you tested:
git checkout main && git merge --no-ff <branch>
git rev-parse main^{tree} <branch>^{tree}   # these must match

# 4. Tag and push — pushing main triggers the GitHub Pages deploy
git tag -a vX.Y.Z -m "Release vX.Y.Z - <summary>"
git push origin main && git push origin vX.Y.Z
gh run watch <run-id> --exit-status
```

Deploy is `.github/workflows/deploy.yml`, triggered by any push to `main`.
After it completes, confirm the live bundle actually changed rather than assuming:
`curl -s https://poke.tcgcount.com/ | grep -oE '/assets/index-[A-Za-z0-9_-]+\.js'`

---

## 4b. Firestore Security Rules

Rules live in [firestore.rules](firestore.rules) and are version controlled as of
2026-09-08. `firebase.json` + `.firebaserc` (project `pokecount-tracker`) make the repo
deployable:

```bash
npm run rules:deploy    # npx -y firebase-tools deploy --only firestore:rules
```

**The repo is only the source of truth once you deploy from it.** Editing rules in the
Firebase console without mirroring the change here puts the two out of sync silently —
nothing detects that drift. Change rules here, then deploy.

### Indexes

Tracked in [firestore.indexes.json](firestore.indexes.json) and wired into
`firebase.json`. The project has **0 composite indexes and 0 field overrides**, which
matches the code: there is no `query()`, `where()` or `orderBy()` anywhere in `src/` or
`scripts/`. Every read is a single `doc()` get or an unfiltered `getDocs(collection)`,
and neither needs a composite index.

```bash
npm run rules:indexes:export     # refresh the file from the live project
npm run indexes:deploy           # push it back
```

Because the file is empty, deploying it is a no-op today. That changes the moment
someone adds a filtered or ordered query: Firestore will name the index it needs in the
error, and the workflow is to add it, deploy, then commit.

**Re-export before editing by hand.** If someone adds an index in the console, this file
goes stale, and deploying a stale file removes what it does not list. Deleting an index
does not delete documents — but every query needing it fails until the index is rebuilt.

**Never pass `--force` to an index deploy.** The CLI prompts before deleting; that
prompt is the last safety net.

Watch `fieldOverrides` more closely than `indexes`. Those are single-field index
exemptions living in the same file. Deploying `fieldOverrides: []` over real exemptions
silently re-enables automatic indexing on those fields, growing storage and risking
write-size limits on large arrays.

The CLI is not installed globally; every firebase script goes through `npx -y
firebase-tools`, and `npm run firebase:login` handles the one-time auth. Do not use a
bare `firebase ... > file` redirect: the shell truncates the target before the command
runs, so a missing CLI or an auth failure leaves an empty `firestore.indexes.json`
behind — the worst possible input to an index deploy. This actually happened once.
`npm run rules:indexes:export` validates the JSON and only then writes.

### Cross-user aggregation runs on the Admin SDK only

`community_stats/ownership` is built by reading `binders` as a collection group across
every user. The rules deny that to client SDKs on purpose, and collection group queries
would need a `match /{path=**}/binders/{id}` rule to be allowed at all — which would
reopen every binder to every signed-in user.

Run it with the service account instead:

```bash
npm run community:sync     # node scripts/sync-community-stats-admin.mjs
```

A client-SDK twin of this script (`scripts/sync-community-stats.mjs`) was removed. It
was unreferenced, superseded by the Admin SDK version, and broken by the rules change.
Do not reintroduce one.

### What the rules changed

The previous rules were a single catch-all:

```
match /{document=**} { allow read, write: if request.auth != null; }
```

which let any signed-in user read and write **any** document, including other users'
binders, while blocking signed-out visitors from reading public data. The current rules
scope `users/{uid}` to its owner, make `shared_collections` publicly readable but
owner-only writable, and allow anonymous visitors to bump `viewCount` and nothing else.

### Not yet verified by tests

There are **no automated rules tests**. `@firebase/rules-unit-testing` needs the
Firestore emulator, which needs a Java runtime that is not installed on this machine.
Until that exists, verify rule changes in the console's Rules Playground:

- signed-out read of `shared_collections/{id}` → allow
- user A writing `users/{B}/binders/{x}` → deny
- owner writing their own `shared_collections/{id}` → allow

### Known gaps

- `market_prices` is writable by any signed-in user, because
  `logCardSaleTransaction` writes it from a normal user flow. Admin gating is
  client-side only (`isAdminEmail` plus a default passkey compiled into the bundle),
  so it is not enforceable server-side without checking `request.auth.token.email`.
- Guests cannot publish a share. `ownerUid` is absent from a guest snapshot, so the
  create rule rejects it. This matches the behaviour before the rules change; guests
  still get a localStorage-backed link that only works on their own device.

---

## 5. Known Issues / Edge Cases to Watch

1. **Large collections may exceed localStorage quota**: The full snapshot is cached locally.
   If a user has 5000+ cards, the JSON may exceed 5MB. The code silently catches the error,
   but the cache won't work. Consider compressing with `CompressionStream` in the future.

2. **QR Code service dependency**: QR codes are generated via `api.qrserver.com`. If that
   service goes down, QR codes will show broken images. Consider a client-side QR library
   (`qrcode` npm package) as a future improvement.

3. **Firestore security rules**: The `shared_collections` collection needs read rules for
   unauthenticated users (visitors without accounts). Verify Firestore rules allow:
   ```
   match /shared_collections/{shareId} {
     allow read: if true;
     allow write: if request.auth != null;
   }
   ```

4. **SPA routing on GitHub Pages**: The `/share/{shareId}` route uses pathname-based routing.
   GitHub Pages may 404 on direct navigation. The existing `404.html → index.html` redirect
   in the project should handle this, but verify.

---

## 6. Previous Handover Context (2026-08-28)

### Production incident — resolved

A user's binder lost 228 cards due to a race condition between `onAuthStateChanged` and
`loadUserFromCloud()`. Fixed in v2.16.3 with `cloudLoadedUid` guard. PITR is enabled.
Full details in the git history.

### Paused branches (may be outdated)

- `feature/card-pricing-and-market-valuation` — **merged as v2.32.0** ✅
- `feature/thai-japanese-card-name-map` — still paused, 82.9% coverage

### Quality gates remain the same

```bash
npm run lint          # oxlint
npm run build         # tsc + vite
npm test              # Vitest
npx playwright test   # Playwright E2E
```

### Things that will bite you

- **Playwright uses port 5173** — `playwright.config.ts` sets baseURL and webServer to 5173, and `reuseExistingServer` is on outside CI, so a stale dev server there will be reused
- **`/data/` is gitignored** — contains user data and API caches
- **Service account JSON** in project root is gitignored
- **`gh`** stores its token in the macOS keyring, not `~/.config/gh/hosts.yml`

---

## 7. File Reference Map

### Core Feature Files

```
src/types/share.ts                                    # Type definitions
src/services/sharedCollectionService.ts               # Publish/Get/Delete logic
src/services/sharedCollectionService.test.ts           # Unit tests
src/components/collection/ShareCollectionModal.tsx     # Owner's share config modal
src/components/collection/SharedCollectionViewer.tsx   # Visitor's collection viewer
src/components/collection/CollectionHeader.tsx         # Share button integration
src/App.tsx                                            # Share route detection
src/store/gameStore.ts                                 # 'share' mode type
e2e/share-collection.spec.ts                           # E2E test
```

### Supporting Files (used but not modified)

```
src/store/pricingStore.ts          # Market prices for valuation
src/store/collectionStore.ts       # Profile data & sanitizeForFirestore
src/utils/firebase.ts              # Firestore db instance & auth
src/components/pricing/CardPriceBadge.tsx  # Price display component
src/utils/cardFoil.ts              # Foil detection for 3D effects
src/utils/cardImage.ts             # Image URL resolution & fallback
src/data/pokemonNames.json         # Card metadata (name, set, rarity)
```

---

Cross-agent activity log: `AI_LOG.md`. Previous handover: git history.

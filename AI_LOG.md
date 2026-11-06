[2026-08-15 09:47] Major | Antigravity | Write | .gitignore - updated gitignore rules
[2026-08-19 09:47] Major | Antigravity | Write | scripts/download-full-thai-dataset.mjs - downloaded full Thai TCG dataset
[2026-08-19 09:49] Major | Antigravity | Edit | src/data/pokemonNames.json - populated full card fields and images
[2026-08-19 10:08] Major | Antigravity | Delete | scratch/ and data/pokemon-tcg-th/cards/ cleaned up
[2026-08-19 10:08] Major | Antigravity | Edit | src/components/pokemon/HPPresetPicker.tsx - added HP card match
[2026-08-19 10:08] Major | Antigravity | Edit | src/components/mini/MiniPokemonCard.tsx - card display & type
[2026-08-19 10:26] Major | Antigravity | Write | scripts/scrape-official-thai-cards.mjs - scraped 9,554 official Thai cards
[2026-08-19 10:27] Major | Antigravity | Edit | src/data/pokemonNames.json - synced full official dataset (Series H, I, J, Megas)
[2026-08-19 10:29] Major | Antigravity | Write | scripts/download-card-images.mjs - downloaded 9,554 local images
[2026-08-19 10:29] Major | Antigravity | Edit | src/data/pokemonNames.json - linked cards to local public/card-images
[2026-08-19 10:33] Major | Antigravity | Write | scripts/reorganize-and-enrich-cards.mjs - reorganized images by set
[2026-08-19 10:33] Major | Antigravity | Edit | public/card-images - structured into set subfolders [SetCode]/[No]_[Name]
[2026-08-19 10:37] Major | Antigravity | Edit | src/components/pokemon/HPPresetPicker.tsx - added Type/Stage filter & visual grid
[2026-08-19 10:41] Major | Antigravity | Write | src/data/evolutionLines.json - indexed official Thai evolution lines
[2026-08-19 10:42] Major | Antigravity | Write | src/components/pokemon/EvolutionModal.tsx - built 1-tap evolution modal
[2026-08-19 10:42] Major | Antigravity | Edit | src/components/mini/MiniPokemonCard.tsx - added Evolve button & rule handling
[2026-08-19 10:47] Major | Antigravity | Write | src/components/pokemon/CardImagePreviewModal.tsx - high-res card zoom modal
[2026-08-19 10:47] Major | Antigravity | Edit | src/components/pokemon/HPPresetPicker.tsx - added 🔍 card zoom preview
[2026-08-19 10:47] Major | Antigravity | Edit | src/components/pokemon/EvolutionModal.tsx - added 🔍 evolution card zoom
[2026-08-19 10:47] Major | Antigravity | Edit | src/components/mini/MiniPokemonCard.tsx - added 🔍 zoom for active/bench card
[2026-08-19 10:50] Major | Antigravity | Command | git tag v1.5.0 - tagged complete multi-mode version
[2026-08-19 10:51] Major | Antigravity | Delete | src/components/player/PlayerBoard.tsx, CenterDivider.tsx, BenchRow.tsx
[2026-08-19 10:51] Major | Antigravity | Edit | src/components/mini/MiniGameBoard.tsx - integrated theme & fullscreen
[2026-08-19 10:51] Major | Antigravity | Edit | src/components/layout/GameBoard.tsx - streamlined to pure Mini mode
[2026-08-19 10:52] Major | Antigravity | Command | git tag v2.0.0 - tagged consolidated pure Mini Card version
[2026-08-19 10:56] Major | Antigravity | Write | scripts/convert-to-webp.mjs - converted 9,144 PNGs to WebP (-77% size)
[2026-08-19 10:58] Major | Antigravity | Write | scripts/add-official-fallback-urls.mjs - added official CDN fallback
[2026-08-19 11:02] Major | Antigravity | Edit | src/components/pokemon/ - added onError CDN fallback in all image modals
[2026-08-19 11:34] Major | Antigravity | Write | scripts/upload-to-r2.mjs - uploaded 9,144 WebP cards to Cloudflare R2
[2026-08-19 11:47] Major | Antigravity | Command | git push origin main --tags - deployed v1.5.0 & v2.0.0 to GitHub
[2026-08-19 11:51] Major | Antigravity | Fix | .gitignore & src/data/evolutionLines.json - fixed CI build missing file
[2026-08-19 12:02] Major | Antigravity | Edit | src/components/pokemon/HPPresetPicker.tsx - added persistent last-used Energy Type memory
[2026-08-24 14:15] Major | Antigravity | Write | src/components/collection/ - built PokéCollection Tracker with Multi-Profile, Variant tracking, Full-Screen view, and Set Search
[2026-08-24 15:05] Major | Antigravity | Command | git tag v2.1.0 - tagged Collection Tracker release
[2026-08-24 15:45] Major | Antigravity | Write | src/utils/firebase.ts & src/store/authStore.ts - integrated Google Authentication and Cloud Firestore NoSQL Sync
[2026-08-24 15:48] Major | Antigravity | Command | git tag v2.2.0 - tagged Google Auth & Firestore Cloud Sync release
[2026-08-24 15:53] Minor | Antigravity | Fix | public/404.html & index.html - fixed direct URL access (404 error) on GitHub Pages for /collection and /lorcana
[2026-08-24 16:15] Major | Antigravity | Write | src/components/collection/ - added Card Rarity Class filter (Secret Rare, ex, VMAX, VSTAR, V, Promo, Regular)
[2026-08-24 16:26] Major | Antigravity | Write | src/data/pokemonNames.json & src/components/collection/ - separated SAR, AR, SR, UR, EX, VMAX, VSTAR, V, Promo into distinct individual rarity filters
[2026-08-24 16:50] Major | Antigravity | Write | src/components/collection/ - added Full Color viewing toggle mode and smooth interactive hover zoom elevation effect on card tiles
[2026-08-24 16:53] Minor | Antigravity | Write | src/components/collection/CollectionTracker.tsx - added smooth floating 'Back to Top' button
[2026-08-24 16:56] Major | Antigravity | Command | git tag v2.3.0 - tagged Advanced Rarity Filters, Full Color View Mode, Hover Zoom, and Back to Top release
[2026-08-24 17:02] Major | Antigravity | Write | src/components/deck/ & src/store/deckStore.ts - built PokéDeck Builder & Missing Cards Collection Calculator with dedicated URL subpath /deck, multi-deck management, 60-card rules, missing card shopping list, and PTCGL import/export
[2026-08-24 17:03] Major | Antigravity | Command | git tag v2.4.0 - tagged PokéDeck Builder & Missing Cards Calculator release
[2026-08-25 17:58] Major | Antigravity | Edit | src/utils/rarity.ts - fixed SAR/SR/AR/UR rarity classification
[2026-08-25 17:58] Major | Antigravity | Bash | npm run build - build verified successfully
[2026-08-25 18:00] Major | Antigravity | Bash | npm run dev - started dev server at localhost:5173
[2026-08-25 18:02] Major | Antigravity | Git | merged feature/deck-builder into main and pushed
[2026-08-25 18:10] Major | Antigravity | Edit | src/store/collectionStore.ts - persisted collection filter state in store & localStorage
[2026-08-25 18:12] Major | Antigravity | Write | src/components/common/SearchableSetSelect.tsx - built searchable set filter
[2026-08-25 18:15] Major | Antigravity | Edit | src/App.tsx & gameStore.ts - set collection as root default & configured subpaths
[2026-08-25 18:17] Major | Antigravity | Command | git tag v2.5.0 - Searchable Set Filter, Collection Persistence & Subpath Routing
[2026-08-25 18:41] Major | Antigravity | Edit | src/components/ - enhanced prominent close buttons & ESC support in all modals
[2026-08-25 18:42] Major | Antigravity | Command | git tag v2.5.1 - Prominent Modal Controls & Clean Reset Release
[2026-08-25 18:54] Major | Antigravity | Git | checkout -b feature/mobile-ui-enhancement & drafted mobile plan
[2026-08-25 18:59] Major | Antigravity | Write | src/components/ - built mobile BottomNav, quick rarity chips, collapsible filters & Deck tab switcher
[2026-08-25 19:00] Major | Antigravity | Command | git tag v2.6.0 & push - Mobile UI Overhaul Release
[2026-08-25 19:12] Major | Antigravity | Edit | src/components/collection/CollectionFilterBar.tsx - redesigned Vivid Full Color button into high-visibility hero toggle
[2026-08-25 19:14] Major | Antigravity | Command | git tag v2.6.1 & push - High-Visibility Vivid Color Hero Toggle Release
[2026-08-25 19:24] Major | Antigravity | Edit | src/utils/firebase.ts - added explicit local persistence & popup resolver for iOS Safari
[2026-08-26 01:10] Major | Antigravity | Fix | src/components/collection/ - fixed pagination reset on card actions to preserve scroll position
[2026-08-26 01:18] Major | Antigravity | Edit | src/components/collection/CollectionCardItem.tsx - enabled always-visible Quick Add button on Tablet and Mobile
[2026-08-26 01:31] Major | Antigravity | Fix | src/ - resolved Battle & Lorcana board scaling and full height on desktop/tablet
[2026-08-26 01:35] Major | Antigravity | Edit | src/components/mini/MiniGameBoard.tsx - fixed portrait layout ratio for Battle mode
[2026-08-26 01:41] Major | Antigravity | Edit | src/components/mini/MiniPokemonCard.tsx - applied real card aspect ratio (63/88) & enhanced opacity/contrast
[2026-08-26 01:51] Major | Antigravity | Edit | src/components/mini/MiniPokemonCard.tsx - boosted card art to full 90% vivid color with frosted control pills
[2026-08-26 01:57] Major | Antigravity | Command | git tag v2.7.0 & push - Battle & Lorcana Board Scaling, Real Card Ratio (63:88) & Vivid Display Release
[2026-08-26 11:55] Major | Antigravity | Command | git pull --all, download-all-card-images & build verified
[2026-08-26 12:02] Major | Antigravity | Write | src/components/ - added fullscreen card zoom in details & enhanced modal
[2026-08-26 12:03] Major | Antigravity | Command | npm run dev - started dev server at http://localhost:5173/PokeCountTracker/
[2026-08-26 12:07] Major | Antigravity | Write | src/utils/cardImage.ts & scripts/ - separated HD vs thumbnail with sample cards
[2026-08-26 12:11] Major | Antigravity | Command | node scripts/process-and-upload-all-cards.mjs - started dual-res & raw pipeline
[2026-08-26 12:24] Major | Antigravity | Command | 9,553 dual-res cards generated, raw saved locally, uploaded to R2 & build verified
[2026-08-26 12:37] Major | Antigravity | Command | git tag v2.9.0 & push - Fullscreen Ultra-HD Card Preview & Dual-Resolution Architecture Release
[2026-08-26 12:51] Major | Antigravity | Command | node scripts/process-and-upload-hd-jpg.mjs - 9,553 cards converted to full-res JPG 70% & uploaded to R2
[2026-08-26 12:52] Major | Antigravity | Command | git tag v2.9.1 & push - Native 100% Full-Res JPG 70% HD Release
[2026-08-26 13:18] Major | Antigravity | Command | node scripts/sync-storage-clean.mjs - cleaned R2 redundant webp, uploaded HD JPGs
[2026-08-26 13:19] Major | Antigravity | Fix | src/components/ - fixed search filter instant reset on clear & unified single storage
[2026-08-26 13:20] Major | Antigravity | Command | git tag v2.9.2 & push - Clean Single Storage & Search Reset Bugfix Release
[2026-08-26 13:30] Major | Antigravity | Write | src/store/communityStore.ts & src/components/ - added Community Ownership Stats in Card Details & Preview Modal
[2026-08-26 13:41] Major | Antigravity | Fix | src/store/communityStore.ts - guaranteed active user owned cards instantly reflected in stats calculation
[2026-08-26 13:44] Major | Antigravity | Write | src/data/communityStatsDefault.json - created default baseline community stats file
[2026-08-26 14:46] Major | Antigravity | Write | scripts/sync-community-stats-admin.mjs - added Firebase Admin real-user & binder sync script
[2026-08-26 14:54] Major | Antigravity | Command | node scripts/sync-community-stats-admin.mjs - synced 5 real users & 110 owned cards to Firestore & baseline JSON
[2026-08-26 14:56] Major | Antigravity | Command | git tag v2.10.0 & push - Community Card Ownership Stats Release
[2026-08-26 15:17] Major | Antigravity | Fix | src/components/ - removed 'ใบนี้' evolution label & restored 100% vivid card color in details modal
[2026-08-26 15:17] Major | Antigravity | Command | git tag v2.10.1 & push - Clean Evolution Badges & 100% Vivid Modal Card Color Release
[2026-08-27 00:30] Major | Claude | Delete | src/store/lorcanaStore.ts & src/components/lorcana/ - split Disney Lorcana out into its own repo (github.com/sadin911/LorcanaCountTracker); recoverable from commit 129d049 if ever needed here again
[2026-08-27 00:30] Major | Claude | Edit | src/ - removed the 'lorcana' GameMode: gameStore union, App.tsx routing & render branch, BottomNav tab, CollectionHeader/DeckHeader nav buttons, MiniGameBoard switch button, index.css selectors
[2026-08-27 00:30] Minor | Claude | Edit | README.md - dropped the Lorcana sections, pointed at the new repo, corrected the React/TypeScript version badges to match package.json
[2026-08-27 01:35] Major | Claude | Fix | src/store/collectionStore.ts - cleared cards never left Firestore: both write paths now write whole documents instead of setDoc(..., {merge:true}), which could only add or update map keys and never remove them
[2026-08-27 01:35] Major | Claude | Write | src/store/collectionStore.ts - one-time binder migration stamped with schemaVersion 2, prunes entries carrying no information and rewrites each pre-v2 document whole; retries on next sign-in if it fails
[2026-08-27 01:35] Major | Claude | Fix | src/store/collectionStore.ts - deleteProfile checked the last-binder guard after deleting the Firestore doc, wiping your final binder from the cloud while keeping it locally; guard now runs first and the localStorage write moved out of the set() updater
[2026-08-27 01:35] Minor | Claude | Fix | src/store/collectionStore.ts - setCardDetails now prunes, so clearing a note on an unowned card no longer leaves a zeroed entry forever; loadUserFromCloud keeps the selected binder instead of resetting to whichever doc Firestore returned first
[2026-08-27 01:35] Major | Claude | Command | git tag v2.11.0 & push - Lorcana Split & Firestore Card Deletion Fix Release
[2026-08-27 08:26] Major | Antigravity | Write | PWA support - integrated vite-plugin-pwa, icons, manifest & install UI
[2026-08-27 08:27] Major | Antigravity | Command | git tag v2.12.0 & push - Progressive Web App (PWA) & Mobile Install Release
[2026-08-27 09:00] Major | Antigravity | Edit | src/components/deck/ & collection/ - unified CardCollectionModal with Deck support & Missing Cards refill
[2026-08-27 09:06] Major | Antigravity | Write | src/ - added Regulation Mark Series filtering & set grouping across Collection & Deck Builder
[2026-08-27 09:16] Major | Antigravity | Edit | src/data/pokemonNames.json - fixed 353 mismatched regulation marks from official scrape data
[2026-08-27 09:19] Major | Antigravity | Edit | src/ - updated Standard format regulation marks to H, I, J (Standard: H-J)
[2026-08-27 09:23] Major | Antigravity | Edit | src/data/pokemonNames.json - categorized 234 Basic & Special Energy cards from Trainer to Energy
[2026-08-27 09:26] Major | Antigravity | Write | src/components/ - added prominent Category quick chips (Pokemon, Trainer, Energy) & populated Energy card types
[2026-08-27 09:34] Major | Antigravity | Command | git tag v2.13.0 & push - Regulation Mark Series Filter, Data Sanitation & Category Separation Release
[2026-08-27 09:38] Major | Antigravity | Write | SEO & Admin Dashboard - added robots.txt, sitemap, meta tags, schema & Admin Page
[2026-08-27 09:40] Major | Antigravity | Command | git tag v2.14.0 & push - SEO Optimization & Admin Analytics Dashboard Release
[2026-08-27 10:02] Major | Antigravity | Write | Custom Domain - configured poke.tcgcount.com (CNAME, vite root base, sitemap, metadata)
[2026-08-27 10:08] Major | Antigravity | Command | git tag v2.14.1 & push - Custom Domain poke.tcgcount.com Production Release
[2026-08-27 10:55] Major | Antigravity | Command | git tag v2.14.2 & push - Instant Force Redirect & Service Worker Cleanup Release
[2026-08-27 11:38] Major | Antigravity | Fix | src/components/ - positioned Back to Top above BottomNav & safe area on mobile PWA (Collection & Deck)
[2026-08-27 11:38] Major | Antigravity | Command | git tag v2.14.3 & push - Mobile PWA Back to Top Button Fix Release
[2026-08-27 11:41] Major | Antigravity | Edit | src/ - updated Standard regulation filter display label to HIJ (Standard: HIJ)
[2026-08-27 11:42] Major | Antigravity | Command | git tag v2.14.4 & push - Standard Regulation HIJ Label Update Release
[2026-08-27 12:03] Major | Antigravity | Edit | src/components/ - restricted Admin button visibility in user menu to admin emails only
[2026-08-27 12:04] Major | Antigravity | Command | git tag v2.14.5 & push - Admin Menu Button Visibility Restriction Release
[2026-08-27 12:09] Major | Antigravity | Write | feature/pokemon-franchise-theme - applied official Pokemon franchise color palette
[2026-08-27 12:16] Major | Antigravity | Write | src/ - added Pokeball theme with Light, Dark, and Auto system mode switcher
[2026-08-27 12:22] Major | Antigravity | Write | src/ - added Master Ball icon and ultra-bright clean Light Mode styling
[2026-08-27 12:28] Major | Antigravity | Write | src/ - added official booster pack images and zoom preview modal
[2026-08-27 12:32] Major | Antigravity | Write | R2 Sync - uploaded all booster pack images to R2 CDN & added to .gitignore
[2026-08-27 12:35] Major | Antigravity | Edit | src/ - sorted set filter lists by Thai release date descending (Newest first)
[2026-08-27 12:41] Major | Antigravity | Command | git merge & push origin main - Tagged v2.15.0 Release
[2026-08-27 12:50] Major | Antigravity | Write | src/ - added mobile PWA Pull-to-Refresh & filter reset + fixed top safe-area insets
[2026-08-27 14:58] Major | Antigravity | Commit | PokeCountTracker mobile header and filter layout cleanup
[2026-08-27 15:10] Major | Antigravity | Feature | Move Rarity filter to main toolbar as compact dropdown
[2026-08-27 15:21] Major | Antigravity | Fix | Fixed mobile horizontal overflow in Set & Rarity filter bar
[2026-08-27 15:24] Major | Antigravity | Fix | Fixed dropdown z-index stacking above card grid
[2026-08-27 16:30] Major | Antigravity | Fix | Enhanced pull-to-refresh touch detection and responsiveness
[2026-08-27 16:51] Major | Antigravity | Write | e2e/ - built comprehensive Playwright E2E test suites (34 tests)
[2026-08-27 16:54] Major | Antigravity | Command | npx playwright test - verified 34 E2E tests passed (100% green)
[2026-08-27 16:56] Major | Antigravity | Command | git push origin main - Deploying latest E2E test suites & mobile PWA fixes
[2026-08-27 17:03] Major | Antigravity | Feature | src/ - added Lorcana-style 3D Holographic / Foil card shimmer & tilt effects
[2026-08-27 17:03] Major | Antigravity | Command | npx playwright test - verified 34 E2E tests passed (100% green with foil tests)
[2026-08-27 17:04] Major | Antigravity | Command | git push origin main - Deploying 3D Holographic Foil Card Effects Release
[2026-08-27 17:11] Major | Antigravity | Fix | src/ - synced exact Lorcana 3D tilt constants & removed blocking hover overlay
[2026-08-27 17:11] Major | Antigravity | Command | npx playwright test - verified 34 E2E tests passed (100% green)
[2026-08-27 17:11] Major | Antigravity | Command | git push origin main - Deploying refined natural 3D foil tilt & clear artwork view
[2026-08-27 17:18] Major | Antigravity | Fix | src/ - fixed PWA fullscreen GPU color flickering & added zero-latency touch drag tilt
[2026-08-27 17:18] Major | Antigravity | Command | npx playwright test - verified 34 E2E tests passed (100% green)
[2026-08-27 17:18] Major | Antigravity | Command | git push origin main - Deploying PWA fullscreen flicker fix & smooth touch tilt
[2026-08-27 17:25] Major | Antigravity | Feature | src/ - removed static rainbow bars; upgraded to smooth dynamic specular sheen & 60fps physics loop
[2026-08-27 17:25] Major | Antigravity | Command | npx playwright test - verified 34 E2E tests passed (100% green)
[2026-08-27 17:25] Major | Antigravity | Command | git push origin main - Deploying clean specular sheen & smooth framerate-controlled 3D tilt
[2026-08-27 17:33] Major | Antigravity | Feature | src/store/collectionStore.ts - set showFullColor=true (Vivid Color mode) as default
[2026-08-27 17:33] Major | Antigravity | Command | npx playwright test - verified 34 E2E tests passed (100% green with pull-to-refresh & color mode)
[2026-08-27 17:33] Major | Antigravity | Command | git push origin main - Deploying Default Color Mode & Pull-To-Refresh Filter Reset
[2026-08-27 17:41] Major | Antigravity | Feature | src/ - 100% exact copy of Lorcana physics constants, useFoilTilt, and modal architecture
[2026-08-27 17:41] Major | Antigravity | Command | npx playwright test - verified 34 E2E tests passed (100% green)
[2026-08-27 17:41] Major | Antigravity | Command | git push origin main - Deploying exact Lorcana 3D foil architecture & clean zoom
[2026-08-27 17:46] Major | Antigravity | Refactor | src/ - Fullscreen mode is 100% static clean artwork zoom; 3D tilt is strictly in Detail Modal only
[2026-08-27 17:46] Major | Antigravity | Command | npx playwright test - verified 34 E2E tests passed (100% green)
[2026-08-27 17:46] Major | Antigravity | Command | git push origin main - Deploying Lorcana-matched Detail-only 3D Tilt & Pure Static Fullscreen
[2026-08-27 17:50] Major | Antigravity | Fix | src/components/collection/CardCollectionModal.tsx - removed conflicting nested group-hover:scale & duration-300
[2026-08-27 17:50] Major | Antigravity | Command | npx playwright test - verified 34 E2E tests passed (100% green)
[2026-08-27 17:50] Major | Antigravity | Command | git push origin main - Deploying nested scale conflict elimination
[2026-08-27 17:56] Major | Antigravity | Refactor | src/ - 100% exact copy of Lorcana DOM hierarchy, grid cols, button wrappers, and color-dodge CSS
[2026-08-27 17:56] Major | Antigravity | Command | npx playwright test - verified 34 E2E tests passed (100% green)
[2026-08-27 17:56] Major | Antigravity | Command | git push origin main - Deploying 100% Lorcana layer architecture
[2026-08-27 18:39] Major | Antigravity | Clean | src/data/pokemonNames.json - deduplicated 402 redundant card entries (from 9,643 to 9,241 cards)
[2026-08-27 23:55] Major | Antigravity | Feature | src/store/collectionStore.ts & CollectionHeader.tsx - added dedicated Force Cloud Sync button & handler
[2026-08-27 23:55] Major | Antigravity | Command | npx playwright test - verified 34 E2E tests passed (100% green)
[2026-08-27 23:55] Major | Antigravity | Command | git push origin main - Deploying Force Cloud Sync feature
[2026-08-28 00:03] Major | Antigravity | Feature | src/hooks/useOTAUpdate.ts, OTAUpdateBanner, OTAUpdateButton - built 1-tap OTA updates
[2026-08-28 00:03] Major | Antigravity | Command | npx playwright test - verified 34 E2E tests passed (100% green)
[2026-08-28 00:03] Major | Antigravity | Command | git push origin main - Deploying Over-The-Air (OTA) Instant App Update System
[2026-08-28 11:20] Major | Antigravity | Write | AGENTS.md, CLAUDE.md - added cross-agent mandatory version tagging rules
[2026-08-28 12:59] Major | Antigravity | Write | CLAUDE.md - expanded full agent operating guide & workflows for Claude Code
[2026-08-28 15:05] Major | Claude | Feature | src/components/layout/AppHeaderBar.tsx, AccountMenu.tsx, HeaderStats.tsx - shared top bar, single account control
[2026-08-28 15:05] Major | Claude | Refactor | CollectionHeader 479 -> 59 lines, DeckHeader 255 -> 52 lines; duplicated toolbar removed
[2026-08-28 15:05] Major | Claude | Refactor | src/index.css - surface/accent tokens replace six per-button colour schemes
[2026-08-28 15:05] Major | Claude | Clean | removed dead PWAInstallButton.tsx; ThemeToggle gains a segmented variant used in the menu
[2026-08-28 15:05] Major | Claude | Write | e2e/top-bar.spec.ts + updated navigation-and-theme.spec.ts for the relocated theme control
[2026-08-28 15:05] Major | Claude | Command | npx oxlint / npm run build / npx playwright test - 0 lint errors, build OK, 48 E2E passed
[2026-08-28 15:20] Major | Claude | Feature | vite.config.ts + AccountMenu - app version injected from package.json, shown on the update row
[2026-08-28 15:20] Major | Claude | Release | package.json 2.15.1 -> 2.16.0
[2026-08-28 15:25] Major | Claude | Release | v2.16.0 - Top bar rebuilt around a single account control; app version visible
[2026-08-28 15:45] Major | Claude | Feature | CollectionFilterBar - Regulation + Category merged into one row of dropdowns (was two scrolling chip rows)
[2026-08-28 15:45] Major | Claude | Write | e2e/collection-tracker.spec.ts - category test now drives the select; adds regulation coverage
[2026-08-28 16:00] Major | Claude | Release | v2.16.1 - Regulation + Category filters folded into one row of dropdowns
[2026-08-28 16:20] Major | Claude | Fix | .github/workflows/deploy.yml - upgraded all actions to their node24 majors, clearing the Node 20 deprecation
[2026-08-28 16:20] Major | Claude | Release | v2.16.2 - CI action upgrade; no application code changed
[2026-08-28 16:05] Major | Claude | Investigate | production data loss - 228-card binder overwritten with an empty one at 08:49Z; recovered via Firestore point-in-time read
[2026-08-28 16:05] Major | Claude | Fix | collectionStore - cloudLoadedUid gate; no cloud write until that account's binders have been read
[2026-08-28 16:05] Major | Claude | Write | vitest + collectionStore.cloudGuard.test.ts - 4 regression tests, confirmed failing before the fix
[2026-08-28 16:15] Major | Claude | Release | v2.16.3 - cloud-write guard; fixes the empty-binder overwrite that caused production data loss
[2026-08-28 16:15] Major | Claude | Recover | restored binder (228 cards / 246 copies) + 2 deleted decks from the 08:48Z point-in-time snapshot; verified byte-identical
[2026-08-28 16:30] Major | Claude | Write | scripts/set-firestore-pitr.mjs - inspect/toggle Firestore point-in-time recovery via the Admin API
[2026-08-28 16:40] Major | Claude | Write | HANDOVER.md - session handover: incident write-up, branch state, outstanding safety work, known traps
[2026-08-28 16:56] Major | Antigravity | Feature | branch feature/deck-equivalent-missing-cards: cross-set card equivalence missing calc
[2026-08-28 16:56] Major | Antigravity | Write | src/utils/deckCalculator.test.ts - 8 unit tests for equivalent missing cards & basic energy
[2026-08-28 16:56] Major | Antigravity | Command | npm test (12 passed), npm run lint (0 errors), npm run build (OK), npx playwright test (48 passed)
[2026-08-28 17:23] Major | Antigravity | Release | v2.17.0 - cross-set equivalent card missing calculation for deck builder
[2026-09-02 13:15] Major | Antigravity | Plan | implementation_plan.md - planned card text import feature
[2026-09-02 13:21] Major | Antigravity | Write | src/utils/collectionTextParser.ts - set & number card list text parser
[2026-09-02 13:21] Major | Antigravity | Write | src/utils/collectionTextParser.test.ts - parser unit tests
[2026-09-02 13:21] Major | Antigravity | Edit | src/store/collectionStore.ts - added importCollectionText action
[2026-09-02 13:21] Major | Antigravity | Write | src/store/collectionStore.importText.test.ts - store import text tests
[2026-09-02 13:21] Major | Antigravity | Write | src/components/collection/CollectionTextImportModal.tsx - text import modal
[2026-09-02 13:21] Major | Antigravity | Edit | src/components/collection/CollectionHeader.tsx - added text import button
[2026-09-02 13:21] Major | Antigravity | Edit | src/components/collection/CollectionBackupModal.tsx - text import banner
[2026-09-02 13:21] Major | Antigravity | Edit | src/components/layout/AccountMenu.tsx - connected text import modal
[2026-09-02 13:21] Major | Antigravity | Edit | e2e/collection-tracker.spec.ts - added card text import e2e test
[2026-09-02 13:21] Major | Antigravity | Edit | package.json - bumped version to v2.18.0
[2026-09-02 13:22] Major | Antigravity | Command | npm run dev - started dev server on http://localhost:5173
[2026-09-02 13:27] Major | Antigravity | Release | v2.18.0 - bulk card text import by set and number
[2026-09-02 13:33] Minor | Antigravity | Research | exampleimport.json - mapped 169/169 cards against pokemonNames.json
[2026-09-02 13:44] Major | Antigravity | Write | src/utils/pokillionaireParser.ts - Pokillionaire JSON format parser
[2026-09-02 13:44] Major | Antigravity | Write | src/utils/pokillionaireParser.test.ts - parser unit tests
[2026-09-02 13:44] Major | Antigravity | Edit | src/store/collectionStore.ts - importCollectionJSON Pokillionaire support
[2026-09-02 13:44] Major | Antigravity | Write | src/store/collectionStore.pokillionaire.test.ts - store import tests
[2026-09-02 13:44] Major | Antigravity | Edit | src/components/collection/CollectionBackupModal.tsx - Pokillionaire UI
[2026-09-02 13:44] Major | Antigravity | Edit | src/components/collection/CollectionTextImportModal.tsx - JSON note
[2026-09-02 13:44] Major | Antigravity | Edit | e2e/collection-tracker.spec.ts - Pokillionaire E2E test
[2026-09-02 13:47] Major | Antigravity | Edit | package.json - bumped version to v2.19.0
[2026-09-02 13:49] Major | Antigravity | Release | v2.19.0 - Pokillionaire JSON format import support
[2026-09-02 14:15] Major | Antigravity | Write | src/utils/ptcglDeckParser.ts - Limitless & PTCGL deck parser
[2026-09-02 14:15] Major | Antigravity | Write | src/utils/ptcglDeckParser.test.ts - deck parser unit tests
[2026-09-02 14:15] Major | Antigravity | Edit | src/store/deckStore.ts - added importParsedDeck action
[2026-09-02 14:15] Major | Antigravity | Edit | src/components/deck/DeckImportExportModal.tsx - live preview & import
[2026-09-02 14:15] Major | Antigravity | Edit | e2e/deck-builder.spec.ts - Limitless deck import E2E test
[2026-09-02 14:27] Major | Antigravity | Release | v2.20.0 - Limitless & PTCGL English decklist import support
[2026-09-02 14:44] Major | Antigravity | Write | src/store/customMappingStore.ts - custom card mapping store with localStorage and Firestore community suggestions
[2026-09-02 14:44] Major | Antigravity | Write | src/components/deck/CardMappingPickerModal.tsx - interactive Thai card mapping picker modal
[2026-09-02 14:44] Major | Antigravity | Edit | src/components/deck/DeckImportExportModal.tsx - interactive mapping for unmatched cards
[2026-09-02 14:44] Major | Antigravity | Edit | src/utils/ptcglDeckParser.ts - unmatched details and custom mapping dictionary integration
[2026-09-02 14:44] Major | Antigravity | Release | v2.21.0 - Interactive card mapping & user suggestion system for Limitless deck import
[2026-09-02 14:54] Major | Antigravity | Fix | src/components/deck/ - resolved card images via resolveCardImageUrl and handleCardImageError
[2026-09-02 14:54] Major | Antigravity | Release | v2.21.1 - Fix card image URL resolution in Deck Import & Mapping Picker
[2026-09-02 15:15] Major | Antigravity | Edit | src/components/deck/ - added re-mapping button and separated non-auto-selected custom mapped cards
[2026-09-02 15:15] Major | Antigravity | Edit | src/utils/ptcglDeckParser.ts - split autoMatchedEntries and customMappedEntries
[2026-09-02 15:15] Major | Antigravity | Edit | package.json - bumped version to v2.22.0
[2026-09-02 15:16] Major | Antigravity | Release | v2.22.0 - Allow re-mapping cards and separate non-auto-selected custom mapped cards
[2026-09-02 15:46] Major | Antigravity | Write | src/components/mapping/CardMappingPage.tsx - dedicated Card Mapping Studio page
[2026-09-02 15:46] Major | Antigravity | Edit | src/App.tsx - added mapping route and navigation support
[2026-09-02 15:46] Major | Antigravity | Edit | src/components/deck/DeckManager.tsx - added mapping studio button in toolbar
[2026-09-02 15:46] Major | Antigravity | Edit | src/components/layout/AccountMenu.tsx - added mapping studio entry
[2026-09-02 15:46] Major | Antigravity | Write | e2e/card-mapping.spec.ts - comprehensive E2E tests for mapping studio
[2026-09-02 15:46] Major | Antigravity | Release | v2.23.0 - Dedicated Card Mapping Studio page
[2026-09-03 17:25] Major | Antigravity | Plan | implementation_plan.md - deck card swap & grid view features
[2026-09-03 17:55] Major | Antigravity | Write | src/components/deck/CardSwapModal.tsx & DeckViewModal.tsx - card swap & grid view
[2026-09-03 17:55] Major | Antigravity | Edit | src/components/deck/DeckEditor.tsx & DeckManager.tsx - list/grid toggle & swap button
[2026-09-03 17:55] Major | Antigravity | Write | src/store/deckStore.test.ts & e2e/deck-builder.spec.ts - unit & e2e test suites
[2026-09-03 17:55] Major | Antigravity | Release | v2.24.0 - Deck Card Swap & Grid View Display Modes
[2026-09-03 20:45] Major | Antigravity | Feature | src/components/common/OptimizedCardImage.tsx - high-perf ahead-of-time loader
[2026-09-03 20:45] Major | Antigravity | Edit | vite.config.ts - Workbox CacheFirst runtimeCaching for R2 & Asia CDN images
[2026-09-03 20:45] Major | Antigravity | Edit | src/components/ - 1400px rootMargin, priority loading, & idle preloading
[2026-09-03 20:45] Major | Antigravity | Release | v2.25.0 - Ultra-fast card image loading & smooth scrolling UX
[2026-09-03 23:00] Major | Antigravity | Write | src/utils/collectionExcelParser.ts - Excel (.xlsx/.xls) & CSV card import parser
[2026-09-03 23:00] Major | Antigravity | Write | src/utils/cardOcrMatcher.ts - Thai Pokemon set & number OCR matcher
[2026-09-03 23:00] Major | Antigravity | Write | src/components/collection/CardCameraScannerModal.tsx - continuous live camera OCR scanner
[2026-09-03 23:00] Major | Antigravity | Edit | src/components/collection/CollectionTextImportModal.tsx - 3-tab hub & draft persistence
[2026-09-03 23:00] Major | Antigravity | Edit | src/store/collectionStore.ts - added importCollectionParsedCards action
[2026-09-03 23:00] Major | Antigravity | Edit | package.json - bumped version to v2.26.0
[2026-09-03 23:00] Major | Antigravity | Release | v2.26.0 - Excel/CSV card import, continuous live camera OCR, & draft persistence
[2026-09-03 23:03] Major | Antigravity | Write | public/sample_cards.xlsx & sample_cards.csv - added downloadable sample templates
[2026-09-03 23:10] Major | Antigravity | Edit | src/utils/cardOcrMatcher.ts, CardCameraScannerModal.tsx - upgraded OCR accuracy, auto-inversion, & quick code input
[2026-09-03 23:10] Major | Antigravity | Edit | package.json - bumped version to v2.26.1
[2026-09-03 23:10] Major | Antigravity | Release | v2.26.1 - Enhanced OCR camera scanner accuracy, reticle alignment, and quick code search
[2026-09-03 23:34] Major | Antigravity | Feature | CollectionHeader & ImportModal - disabled camera scanner UI behind feature flag
[2026-09-03 23:34] Major | Antigravity | Edit | package.json - bumped version to v2.26.2
[2026-09-03 23:34] Major | Antigravity | Release | v2.26.2 - Temporarily disable camera scanner feature while preserving code
[2026-09-04 23:01] Major | Antigravity | Write | src/utils/voiceCardParser.ts - natural voice card parser
[2026-09-04 23:01] Major | Antigravity | Write | src/hooks/useVoiceCardRecognition.ts - Web Speech & Audio visualizer
[2026-09-04 23:01] Major | Antigravity | Write | src/components/collection/VoiceCardCollectorTab.tsx - Voice Studio UI
[2026-09-04 23:01] Major | Antigravity | Edit | src/components/collection/CollectionTextImportModal.tsx - Voice Tab
[2026-09-04 23:01] Major | Antigravity | Edit | src/components/collection/CollectionHeader.tsx - header voice button
[2026-09-04 23:01] Major | Antigravity | Edit | e2e/collection-tracker.spec.ts - added voice collector E2E tests
[2026-09-04 23:01] Major | Antigravity | Edit | package.json - bumped version to v2.27.0
[2026-09-04 23:01] Major | Antigravity | Release | v2.27.0 - Voice Card Collector with live waveform visualizer & audio cues
[2026-09-05 00:02] Major | Antigravity | Write | scripts/download-english-cards.mjs - 6,779 modern English cards
[2026-09-05 00:02] Major | Antigravity | Write | scripts/match-thai-english-cards.mjs - multi-signal card matcher
[2026-09-05 00:02] Major | Antigravity | Write | src/components/collection/CardMappingStudioModal.tsx - mapping studio UI
[2026-09-05 00:02] Major | Antigravity | Edit | src/components/collection/CollectionHeader.tsx - added mapping studio button
[2026-09-05 00:02] Major | Antigravity | Write | BACKLOG_V3_MEMO.md - comprehensive v3 vision & roadmap memo
[2026-09-05 00:13] Major | Antigravity | Write | src/components/collection/EnglishCardBrowser.tsx - 6,779 EN cards browser
[2026-09-05 00:13] Major | Antigravity | Edit | src/components/collection/CardCollectionModal.tsx - bilingual switch & rematch
[2026-09-05 00:13] Major | Antigravity | Edit | src/components/collection/CollectionTracker.tsx - wired EN catalog mode
[2026-09-05 00:23] Major | Antigravity | Edit | AGENTS.md & CLAUDE.md - added automated E2E only testing rule
[2026-09-05 00:23] Major | Antigravity | Write | e2e/english-card-catalog.spec.ts - automated Playwright E2E suite
[2026-09-05 00:24] Major | Antigravity | Command | git checkout -b feature/english-card-catalog-and-bilingual-detail
[2026-09-05 00:29] Major | Antigravity | Write | scripts/sync-english-cards-to-r2.mjs - R2 English image sync pipeline
[2026-09-05 00:29] Major | Antigravity | Edit | src/utils/cardImage.ts - added English R2 routing & multi-tier fallback
[2026-09-05 00:29] Major | Antigravity | Write | src/utils/cardImage.test.ts - unit tests for English R2 card image resolution
[2026-09-05 00:29] Major | Antigravity | Edit | src/data/pokemonCardsEn.json - updated English cards to R2 CDN URLs
[2026-09-05 00:44] Major | Antigravity | Fix | src/components/collection/CardMappingStudioModal.tsx - added image error fallback
[2026-09-05 00:44] Major | Antigravity | Edit | scripts/match-thai-english-cards.mjs - upgraded matcher to 7,576 cards (82.0%)
[2026-09-05 01:05] Major | Antigravity | Write | scripts/build-thai-art-hashes.mjs - 9,151 Thai perceptual art hashes
[2026-09-05 01:07] Major | Antigravity | Edit | src/data/pokemonCardsEn.json - expanded EN DB to 11,303 modern cards
[2026-09-05 01:08] Major | Antigravity | Write | scripts/match-cards-by-art.mjs - pure visual illustration art matcher
[2026-09-05 01:24] Major | Antigravity | Command | node scripts/sync-english-cards-to-r2.mjs - 10,567 EN cards in R2 bucket
[2026-09-05 01:42] Major | Antigravity | Fix | EnglishCardBrowser & CardCollectionModal - added image fallback pipeline
[2026-09-05 01:42] Major | Antigravity | Edit | src/data/pokemonSetsEn.json & pokemonCardsEn.json - released sets first
[2026-09-05 01:42] Major | Antigravity | Command | synced mep (89) and cel25c (25) to R2 and verified 8/8 E2E tests pass
[2026-09-05 01:50] Major | Antigravity | Edit | EnglishCardBrowser.tsx - added Reg J filter option (419 cards)
[2026-09-05 01:50] Major | Antigravity | Fix | CardMappingStudioModal.tsx - fixed Thai fallback to mapped counterpart
[2026-09-05 01:58] Major | Antigravity | Command | synced me5 (120), me4 (122), me3 (124), me2pt5 (295), mep (89) to R2
[2026-09-05 01:59] Major | Antigravity | Edit | src/components/collection/EnglishCardBrowser.tsx - removed upcoming overlay
[2026-09-05 02:00] Major | Antigravity | Command | scripts/match-cards-by-art.mjs - mapped Mark J Darkrai ex cards (8,864 total)
[2026-09-05 02:01] Major | Antigravity | Test | Playwright & Vitest - verified Mark J and Darkrai ex display artwork
[2026-09-05 02:25] Major | Claude | Command | npm run build && npm test - verified release build (14.4s) and 91/91 unit tests passing
[2026-09-05 02:25] Major | Claude | Edit | package.json - bumped version 2.27.0 -> 2.28.0
[2026-09-05 02:25] Major | Claude | Command | git merge feature/english-card-catalog-and-bilingual-detail into main - English card catalog, bilingual TH/EN detail modal, R2 image migration
[2026-09-05 02:25] Major | Claude | Command | git tag v2.28.0 - tagged English Card Catalog & Bilingual Detail release
[2026-09-05 02:45] Major | Claude | Write | src/utils/deckMapAssist.ts - bridged PTCGL set code -> EN set id (ptcgoCode) -> Thai card via thaiEnglishCardMap
[2026-09-05 02:45] Major | Claude | Edit | src/utils/ptcglDeckParser.ts - cross-check deck import picks against TH/EN map; fixed Crushing Hammer matching Enhanced Hammer and Fezandipiti ex matching non-ex
[2026-09-05 02:45] Major | Claude | Test | deckMapAssist.test.ts - 9 new tests; full suite 100/100, tsc clean, exampleENImport still 24/24 lines & 60 cards
[2026-09-05 02:45] Major | Claude | Edit | package.json - bumped version 2.28.0 -> 2.28.1
[2026-09-05 20:17] Major | Antigravity | Git | checkout -b feature/voice-card-collector (based on main v2.28.1)
[2026-09-05 20:18] Major | Antigravity | Write | src/utils/voiceTts.ts - fast Web Speech TTS engine with mobile unlock
[2026-09-05 20:18] Major | Antigravity | Write | src/utils/voiceTts.test.ts - 10 unit tests for fast voice TTS engine
[2026-09-05 20:20] Major | Antigravity | Edit | src/hooks/useVoiceCardRecognition.ts - Android mic fix & iOS silence timeout
[2026-09-05 20:21] Major | Antigravity | Edit | src/components/collection/VoiceCardCollectorTab.tsx - wired fast TTS feedback
[2026-09-05 20:26] Major | Antigravity | Edit | e2e/collection-tracker.spec.ts - added TTS toggle button E2E test
[2026-09-05 20:29] Major | Antigravity | Test | Vitest & Playwright - 110 unit tests and 82 E2E tests passed cleanly
[2026-09-05 21:26] Major | Antigravity | Release | v2.29.0 - Voice Card Collector with Android mic fix, iOS silence timeout, & Fast TTS verification
[2026-09-06 06:44] Major | Antigravity | Fix | src/utils/voiceTts.ts & voiceCardParser.ts - Mac TTS English fallback & Thai number parsing
[2026-09-06 07:18] Major | Antigravity | Write | src/store/collectionStore.ts & useCloudForegroundSync.ts - two-way cloud reconcile & foreground auto-sync
[2026-09-06 07:18] Major | Antigravity | Release | v2.30.0 - Two-Way Cloud Sync & Multi-Device Foreground Reconnect
[2026-09-06 20:07] Major | Antigravity | Fix | src/store/collectionStore.ts - sanitized undefined Firestore values, safeguard harvest, safe load
[2026-09-06 20:07] Major | Antigravity | Release | v2.31.0 - iPhone Sync Fix, Firestore Undefined Sanitizer, & Multi-Source Safeguard
[2026-09-08 02:55] Major | Antigravity | Write | implementation_plan.md - card pricing feature plan
[2026-09-08 02:56] Major | Antigravity | Git | checkout -b feature/card-pricing-and-market-data
[2026-09-08 02:56] Major | Antigravity | Write | src/types/pricing.ts - pricing, currency, & transaction types
[2026-09-08 02:56] Major | Antigravity | Write | src/data/market_prices.json - baseline static market prices snapshot
[2026-09-08 02:56] Major | Antigravity | Write | src/services/pokemonPricingService.ts - free pokemontcg.io v2 client & cache
[2026-09-08 02:57] Major | Antigravity | Write | src/store/pricingStore.ts - Zustand store for market & user prices
[2026-09-08 02:57] Major | Antigravity | Write | src/components/pricing/CardPriceBadge.tsx - isolated price badge chip
[2026-09-08 02:57] Major | Antigravity | Test | vitest & build - 137 unit tests passed, 0 build errors
[2026-09-08 03:02] Major | Antigravity | Edit | src/components/collection/CardCollectionModal.tsx - integrated live market price bar & TCGPlayer sync
[2026-09-08 03:03] Major | Antigravity | Command | npm run dev - launched local dev server at http://localhost:5173
[2026-09-08 03:06] Major | Antigravity | Write | scripts/fetch-pokemon-prices.mjs - master price indexer & builder
[2026-09-08 03:06] Major | Antigravity | Write | .github/workflows/update-prices-cron.yml - daily 00:00 UTC price sync cron
[2026-09-08 03:07] Major | Antigravity | Command | npm run data:prices - generated Master market prices v1 (9,835 keys indexed)
[2026-09-08 03:30] Major | Antigravity | Edit | src/types/collection.ts & CollectionFilterBar.tsx - added price sort option
[2026-09-08 03:31] Major | Antigravity | Edit | src/components/collection/CollectionTracker.tsx - implemented price sorting
[2026-09-08 03:31] Major | Antigravity | Edit | src/components/collection/CollectionCardItem.tsx - added card price badge chip
[2026-09-08 03:31] Major | Antigravity | Edit | src/components/collection/EnglishCardBrowser.tsx - added price sort & badge
[2026-09-08 03:32] Major | Antigravity | Write | src/components/pricing/CardPricingDetailSection.tsx - Lorcana-style pricing
[2026-09-08 03:33] Major | Antigravity | Edit | src/components/collection/CardCollectionModal.tsx - integrated Lorcana pricing
[2026-09-08 03:33] Major | Antigravity | Write | src/utils/pricingUrlsAndSort.test.ts - tests for eBay URLs & price sorting
[2026-09-08 03:37] Major | Antigravity | Fix | src/components/pricing/CardPricingDetailSection.tsx - fixed stat card text overlap
[2026-09-08 03:38] Major | Antigravity | Test | npm test && npm run build - 142/142 tests passed, 0 build errors
[2026-09-08 03:47] Major | Antigravity | Feature | Multi-source price fallback (Cardmarket/TCGdex) & source indicators
[2026-09-08 03:48] Major | Antigravity | Fix | CardPricingDetailSection.tsx - fixed 1-click verification button overlap
[2026-09-08 03:48] Major | Antigravity | Test | npm test && npm run build - 144/144 tests passed, 0 build errors
[2026-09-08 04:00] Major | Antigravity | Fix | App.tsx & CollectionCardItem.tsx - fixed front page card price chips & init
[2026-09-08 04:01] Major | Antigravity | Feature | pricingStore.ts - set Thai card estimate to 1/3 of EN reference price
[2026-09-08 04:02] Major | Antigravity | Edit | CardPricingDetailSection.tsx & CardPriceBadge.tsx - added Thai 1/3 ratio badges
[2026-09-08 04:03] Major | Antigravity | Test | e2e/card-pricing.spec.ts - verified front page chips, sorting & 1/3 modal
[2026-09-08 04:16] Major | Antigravity | Feature | CardPricingDetailSection.tsx - show full 100% EN price when viewing EN card
[2026-09-08 04:34] Major | Antigravity | Fix | index.css & CardPriceBadge.tsx - fixed .foil-holo class bundling & badge
[2026-09-08 04:34] Major | Antigravity | Release | v2.32.0 - Card Pricing, Market Valuation, Daily Price Sync, and Thai 1/3 Ratio
[2026-09-08 04:35] Major | Antigravity | Git | checkout -b feature/share-collection
[2026-09-08 05:16] Major | Antigravity | Write | HANDOVER.md - share-collection feature handover for Claude
[2026-09-08 05:35] Major | Claude | Write | src/services/sharedCollectionService.ts + ShareCollectionModal/SharedCollectionViewer - committed Share Collection feature left uncommitted by the Antigravity session
[2026-09-08 05:35] Major | Claude | Fix | src/App.tsx - share deep link lost its id: mount-time URL sync rewrote /share/<id> to /collection from a stale gameMode; guard is condition-based so StrictMode double-invoke cannot burn it
[2026-09-08 05:35] Major | Claude | Fix | SharedCollectionViewer.tsx - clone wrote into the active binder instead of the new one; now switchProfile explicitly
[2026-09-08 05:35] Major | Claude | Fix | sharedCollectionService.ts - removed customPrice (did not compile, never read, would have published owner purchase cost publicly)
[2026-09-08 05:35] Major | Claude | Test | oxlint 0 errors, build clean, Vitest 148/148, Playwright 92/92
[2026-09-08 05:35] Major | Claude | Edit | package.json - bumped version 2.32.0 -> 2.33.0
[2026-09-08 06:35] Minor | Claude | Edit | src/components/collection/CollectionHeader.tsx - Share button icon 📤 -> 🔗; 📤 was indistinguishable from the adjacent 📥 Import at 14px and the label is hidden on phones, and 🔗 matches ShareCollectionModal's own icon
[2026-09-08 06:35] Major | Claude | Test | Playwright share flow 2/2, build clean, oxlint 0 errors, Vitest 148/148
[2026-09-08 06:35] Major | Claude | Edit | package.json - bumped version 2.33.0 -> 2.33.1
[2026-09-08 07:05] Major | Claude | Write | firestore.rules - brought Firestore security rules under version control; replaces catch-all that let any signed-in user read/write any document including other users' binders
[2026-09-08 07:05] Major | Claude | Write | firebase.json + .firebaserc - project pokecount-tracker; declares rules only (not indexes, so a deploy cannot delete existing composite indexes)
[2026-09-08 07:05] Minor | Claude | Edit | package.json - added rules:deploy script
[2026-09-08 07:05] Minor | Claude | Edit | HANDOVER.md - documented rules workflow, drift risk, and that no automated rules tests exist (emulator needs Java, not installed)
[2026-09-08 07:25] Major | Claude | Delete | scripts/sync-community-stats.mjs - client-SDK collection group read across all users' binders; unreferenced, superseded by the Admin SDK twin, and denied by the tightened rules
[2026-09-08 07:25] Minor | Claude | Edit | scripts/sync-community-stats-admin.mjs - documented why this must stay Admin SDK
[2026-09-08 07:25] Minor | Claude | Edit | package.json - added community:sync and rules:indexes:export scripts
[2026-09-08 07:25] Minor | Claude | Edit | HANDOVER.md - index procedure (deleting an index loses queries, not data) and Admin-SDK-only aggregation
[2026-09-08 07:45] Major | Claude | Fix | package.json - firebase scripts called a CLI that is not installed (sh: firebase: command not found); now routed through npx -y firebase-tools
[2026-09-08 07:45] Major | Claude | Write | scripts/export-firestore-indexes.mjs - validates CLI output as JSON before writing firestore.indexes.json; a bare shell redirect had already left an empty 0-byte file, the worst input to an index deploy
[2026-09-08 07:45] Minor | Claude | Edit | HANDOVER.md - documented npx requirement, firebase:login, and the redirect footgun
[2026-09-08 15:15] Major | Claude | Write | firestore.indexes.json - exported live indexes (0 composite, 0 fieldOverrides, matching the absence of query/where/orderBy in the codebase) and wired "indexes" into firebase.json
[2026-09-08 15:15] Minor | Claude | Edit | package.json - added indexes:deploy script
[2026-09-08 15:15] Minor | Claude | Edit | HANDOVER.md - indexes section now reflects tracked state and the re-export-before-editing rule
[2026-09-08 15:30] Major | Claude | Fix | scripts/fetch-pokemon-prices.mjs - Thai cards were written at the FULL English price; both write sites now use toThaiEstimate() (÷3, isThaiEstimated, enReference) and it is idempotent
[2026-09-08 15:30] Major | Claude | Write | scripts/repair-thai-price-ratio.mjs - repaired 2,139 Thai cards in src/ and public/ market_prices.json; verified idempotent
[2026-09-08 15:30] Major | Claude | Write | src/data/thaiPriceRatio.test.ts - 4 tests asserting the ÷3 invariant on the data file; verified they fail when one card is sabotaged
[2026-09-08 15:30] Major | Claude | Edit | .github/workflows/update-prices-cron.yml - added a verify step before commit; the cron commits with [skip ci] so nothing else ever checked its output
[2026-09-08 15:30] Major | Claude | Edit | package.json - version 2.33.1 -> 2.33.2
[2026-09-08 15:45] Major | Claude | Fix | .github/workflows/update-prices-cron.yml - daily price updates never reached users; the app fetches the static public/data/market_prices.json that Pages serves, and the cron only committed. Verified commit 6c5380a produced 0 workflow runs. Now dispatches deploy.yml explicitly (a GITHUB_TOKEN push cannot trigger a workflow), only when prices actually changed.
[2026-09-08 16:20] Major | Claude | Edit | VoiceCardCollectorTab.tsx - set picker is now SearchableSetSelect (was a native select, untypeable) and prefills from the collection page's set filter
[2026-09-08 16:20] Major | Claude | Edit | SearchableSetSelect.tsx - added allowClear (import has no valid 'ALL' target); the E2E caught that the dropdown's "ทุกชุดการ์ด" row was a second path to ALL and also needed gating
[2026-09-08 16:20] Major | Claude | Edit | SharedCollectionViewer.tsx - reuses CollectionFilterBar for full filter parity; withholds 'missing' (would expose the owner's want-list) and price sort when prices are not shared; wired showFullColor to dim wishlist-only cards
[2026-09-08 16:20] Major | Claude | Edit | CollectionFilterBar.tsx - added hiddenStatuses / hiddenSorts / hideFullColorToggle
[2026-09-08 16:20] Major | Claude | Write | e2e/import-and-share-ux.spec.ts - 5 tests over all three changes
[2026-09-08 16:20] Minor | Claude | Fix | e2e/collection-tracker.spec.ts - de-flaked the foil test; it depended on card image layout and failed on main too under parallel load
[2026-09-08 16:20] Major | Claude | Edit | package.json - version 2.33.2 -> 2.34.0
[2026-09-08 17:10] Major | Claude | Delete | Share clone feature removed - button, handler, allowClone setting and type field; sharing is view-only this phase. It made the copier's binder claim cards they do not own, which fed valuation, missing-card lists and the community ownership counts.
[2026-09-08 17:10] Major | Claude | Edit | SharedCollectionViewer.tsx - page was hardcoded dark with zero light variants, so the filter bar rendered light on a dark page; added light/dark pairs throughout and a ThemeToggle in the header
[2026-09-08 17:10] Minor | Claude | Edit | ThemeToggle.tsx - dropped the 'icon-only' variant, declared in the union but never branched on
[2026-09-08 17:10] Major | Claude | Test | e2e 104/104, Vitest 152/152, build clean, oxlint 0. Theme test asserts page and bar both follow a switch.
[2026-09-08 17:10] Minor | Claude | Note | Chased a phantom transition-colors bug for several rounds; the Browser pane reports innerWidth 0 which suspends style resolution. Playwright at 1280px showed theme switching always worked. Reverted both speculative fixes.
[2026-09-08 18:00] Major | Claude | Fix | MissingCardsModal.tsx - on 390x844 the fixed chrome took 563 of 760px leaving the card list 128px; full-height sheet on mobile, foldable settings/stats/progress, tabs stay put, tighter padding. List 128px -> 609px (17% -> 72% of the modal).
[2026-09-08 18:00] Major | Claude | Fix | DeckEditor.tsx - deck list had max-h-[calc(100vh-390px)] with its own overflow; below xl the columns stack so that produced a nested scroller inside an already-scrolling page. Scoped to xl.
[2026-09-08 18:00] Major | Claude | Write | e2e/deck-mobile-ux.spec.ts - 5 tests asserting measured proportions, the fold, tab reachability, single-scroll, and that desktop is unchanged
[2026-09-08 18:00] Major | Claude | Edit | package.json - version 2.35.0 -> 2.36.0
[2026-09-08 18:40] Major | Claude | Write | src/utils/pairingCoverage.ts - computes TH-EN pairing coverage grouped by set/rarity/category and separates alt-art (unpairable by nature) from ordinary prints
[2026-09-08 18:40] Major | Claude | Write | src/utils/pairingCoverage.test.ts - 12 tests including assertions against the shipped catalogue
[2026-09-08 18:40] Major | Claude | Edit | CardMappingStudioModal.tsx - added a 📊 สรุป tab: coverage 96% (8,865/9,241), 376 unpaired split into 247 alt-art vs 129 actionable, sets ranked worst-first with click-through to that set's unmatched list, copyable report
[2026-09-08 18:40] Major | Claude | Write | e2e/pairing-summary.spec.ts - 4 tests x 2 viewports
[2026-09-08 18:40] Major | Claude | Edit | package.json - version 2.36.0 -> 2.37.0
[2026-09-08 19:20] Major | Claude | Fix | scripts/fetch-pokemon-prices.mjs - SET_IDS covered only 14 SV-era sets while the TH/EN map references 50, so 2,727 already-paired Thai cards had no price because their EN counterpart was never requested. Expanded to all 50. Price coverage 6,096 -> 8,603 of 9,241 (66% -> 93%).
[2026-09-08 19:20] Minor | Claude | Fix | scripts/fetch-pokemon-prices.mjs - retries 3->5 with longer backoff and 600ms between sets; 50 sets per run makes upstream 500/502 common. Failures are non-destructive because pricesMap seeds from the previous file.
[2026-09-08 19:20] Major | Claude | Command | npm run data:prices - regenerated; residual 638 (262 paired but absent from the TCGPlayer feed, mostly newest sets; 376 unpaired)
[2026-09-08 19:20] Major | Claude | Edit | package.json - version 2.37.0 -> 2.38.0
[2026-09-08 19:55] Major | Claude | Write | src/utils/priceCoverage.ts + test - computes which Thai cards lack a price and splits the cause into unpaired / EN-unpriced / unexpected (a derivation bug). 15 tests including against shipped data.
[2026-09-08 19:55] Major | Claude | Write | src/components/admin/MissingPricePanel.tsx - admin tab 💵 ราคาที่ยังขาด: 93% coverage, 638 missing = 261 EN-unpriced + 376 unpaired + 1 unexpected; sets ranked worst-first with drill-down and manual price entry via adminUpdateMarketPrice (previously an action with no UI caller)
[2026-09-08 19:55] Major | Claude | Fix | MissingPricePanel - E2E caught it reporting all 9,241 cards as unpriced while initPricing was still loading; now waits on marketLoaded
[2026-09-08 19:55] Minor | Claude | Fix | e2e/card-pricing.spec.ts - raised a 10s badge timeout to 25s; market_prices.json went 4.9MB -> 9.7MB raw (0.3 -> 0.5MB gzipped) when the feed widened to 50 sets
[2026-09-08 19:55] Major | Claude | Edit | package.json - version 2.38.0 -> 2.39.0
[2026-09-08 20:00] Major | Antigravity | Edit | src/components/common/OptimizedCardImage.tsx - fixed stuck skeleton shimmer on image error/stall
[2026-09-08 20:02] Major | Antigravity | Edit | src/utils/cardImage.ts - added enFallbackUrl and finalError flag to image error pipeline
[2026-09-08 20:03] Major | Antigravity | Edit | src/components/collection/CollectionCardItem.tsx - wired enFallbackUrl into card image error handling
[2026-09-08 20:10] Major | Antigravity | Write | scripts/repair-card-mappings-and-prices.mjs - remapped 57 cross-rarity errors & 112 SV4a cards, purged name pollution
[2026-09-08 20:15] Major | Antigravity | Edit | src/store/pricingStore.ts - removed loose enName fallback and enforced strict card ID parity for Thai cards
[2026-09-08 20:18] Major | Antigravity | Edit | scripts/fetch-pokemon-prices.mjs - removed pricesMap[cardName] and loose mapping.enName fallback
[2026-09-08 20:20] Major | Antigravity | Edit | src/data/thaiPriceRatio.test.ts - added AR vs Common pricing divergence test and no-plain-name keys test
[2026-09-08 20:25] Major | Antigravity | Edit | e2e/card-pricing.spec.ts - added image loading stability test ensuring no permanent skeleton overlays
[2026-09-08 20:30] Major | Antigravity | Edit | package.json - version 2.39.0 -> 2.40.0
[2026-09-08 20:35] Major | Antigravity | Release | v2.40.0 - Fix AR vs Common Card Pricing Accuracy & Eliminate Image Stalling
[2026-09-08 20:38] Major | Antigravity | Edit | src/data/thaiEnglishCardMap.json - fixed 42 Basic Energy cross-mappings & 11 cross-species errors
[2026-09-08 20:40] Major | Antigravity | Edit | scripts/fetch-pokemon-prices.mjs - stopped ghost TH seeding, added basic energy baseline, pure Step 3 derivation
[2026-09-08 20:45] Major | Antigravity | Command | npm run data:prices - fetched fresh API prices for 49 sets, linked 8,194 Thai cards (0 ghost prices)
[2026-09-08 20:48] Major | Antigravity | Edit | src/store/pricingStore.ts - removed loose next[query.enName] injection in live fetch
[2026-09-08 20:50] Major | Antigravity | Edit | package.json - version 2.40.0 -> 2.40.1
[2026-09-08 20:52] Major | Antigravity | Release | v2.40.1 - Purge Ghost Prices, Fresh API Fetch, & Fix Energy/Species Mappings
[2026-09-08 21:53] Major | Antigravity | Edit | vite.config.ts & index.html - added PWA manifest id and icon version queries for Android WebAPK update
[2026-09-08 21:54] Major | Antigravity | Command | git tag - pruned 54 redundant patch/minor tags on GitHub, kept 14 major milestones
[2026-09-08 22:06] Major | Antigravity | Write | public/_redirects & public/_headers - configured Cloudflare Pages SPA rewrite & caching
[2026-09-08 22:13] Major | Antigravity | Delete | public/_redirects - removed redundant rule; Cloudflare natively handles SPA routing
[2026-09-08 22:23] Major | Antigravity | Edit | index.html & vite.config.ts - simplified Poké to plain Poke for SEO and app names
[2026-09-08 22:31] Major | Antigravity | Delete | .github/workflows/deploy.yml - removed GitHub Pages deploy workflow
[2026-09-08 22:40] Major | Antigravity | Write | public/ - generated glassmorphism pokeball & slab icons suite (Option 1)
[2026-09-08 22:41] Major | Antigravity | Edit | package.json - bumped version 2.40.1 -> 2.41.0
[2026-09-08 22:42] Major | Antigravity | Release | v2.41.0 - New Glassmorphism PokeCount App Logo & PWA Icon Suite
[2026-09-08 22:50] Major | Antigravity | Edit | src/components/ - applied new app logo to web header, pull-to-refresh & admin
[2026-09-08 22:51] Major | Antigravity | Edit | package.json - bumped version 2.41.0 -> 2.41.1
[2026-09-08 22:51] Major | Antigravity | Release | v2.41.1 - Apply New App Logo to Website Header & In-App Surfaces
[2026-09-08 23:18] Major | Antigravity | Edit | src/components/admin/MappingApprovalPanel.tsx - fix resolveCardImageUrl receiving object instead of string
[2026-09-08 23:22] Major | Antigravity | Release | v2.42.0 - Admin Card Mapping Approval & Community Sync System
[2026-09-09 09:30] Major | Antigravity | Edit | src/store/collectionStore.ts - added tombstone tracking for deleted binders
[2026-09-09 09:30] Major | Antigravity | Edit | src/store/collectionStore.syncReconcile.test.ts - added cross-device sync tests
[2026-09-09 09:30] Major | Antigravity | Edit | package.json - bumped version 2.42.0 -> 2.42.1
[2026-09-09 09:30] Major | Antigravity | Release | v2.42.1 - Cross-Device Binder Deletion Tombstone & Resurrection Bugfix
[2026-09-09 09:58] Major | Antigravity | Edit | .gitignore - ignored android-twa/ on main to prevent untracked sdk files
[2026-09-09 11:21] Major | Antigravity | Edit | BACKLOG_V3_MEMO.md - updated v3.0 completed features & roadmap
[2026-09-09 11:25] Major | Antigravity | Command | git checkout -b feature/meta-decks-hub - created feature branch
[2026-09-09 11:32] Major | Antigravity | Write | scripts/fetch-limitless-meta.mjs - Limitless TCG meta deck sync pipeline
[2026-09-09 11:34] Major | Antigravity | Write | src/data/metaDecks.json - synced 12 live tournament decks with Thai card IDs
[2026-09-09 11:36] Major | Antigravity | Write | src/components/deck/MetaDecksHub.tsx - tournament meta decks hub UI
[2026-09-09 11:37] Major | Antigravity | Edit | src/components/deck/DeckManager.tsx - integrated tab navigation & cloning
[2026-09-09 11:38] Major | Antigravity | Write | src/components/deck/MetaDecksHub.test.ts - unit & parity test suite passed
[2026-09-09 11:41] Major | Antigravity | Write | .github/workflows/sync-meta-decks-cron.yml - weekly Monday sync cron
[2026-09-09 11:43] Major | Antigravity | Bash | Killed process on port 5173 (PID 59307)
[2026-09-09 11:48] Major | Antigravity | Edit | Fixed card print resolution to Standard marks and synced metaDecks
[2026-09-09 11:56] Major | Antigravity | Edit | Expanded Limitless meta decks to 24 archetypes with Playstyles and Pros/Cons
[2026-09-09 12:02] Major | Antigravity | Edit | src/components/deck/MetaDecksHub.tsx - responsive grid button layout
[2026-09-09 12:02] Major | Antigravity | Edit | src/components/admin/AdminPage.tsx - resolved duplicate tab icons
[2026-09-09 12:08] Major | Antigravity | Edit | package.json - bumped version 2.42.1 -> 2.43.0
[2026-09-09 12:20] Major | Antigravity | Write | src/components/deck/playtest/ - Solitaire Simulator & Math Engine
[2026-09-09 12:21] Major | Antigravity | Write | e2e/playtest-simulator.spec.ts - automated Playwright E2E test suite
[2026-09-09 12:22] Major | Antigravity | Edit | package.json - bumped version 2.43.0 -> 2.44.0
[2026-09-09 12:32] Major | Antigravity | Edit | PlaytestBoard.tsx - responsive compact board layout to prevent overflow
[2026-09-09 12:37] Major | Antigravity | Edit | PlaytestBoard.tsx - slim down deck/discard controls box to save vertical space
[2026-09-09 12:51] Major | Antigravity | Edit | PlaytestBoard.tsx - add quick actions toolbar and slot card-picker modal
[2026-09-09 12:54] Major | Antigravity | Edit | package.json - bumped version 2.44.0 -> 2.44.1
[2026-09-09 12:54] Major | Antigravity | Release | v2.44.1 - Playtest Simulator Responsive Layout & Interactive Card Placement Fix
[2026-09-09 12:59] Major | Antigravity | Edit | PlaytestBoard.tsx - duels.ink drag-and-drop & evolution/attach stacking
[2026-09-09 13:04] Major | Antigravity | Edit | PlaytestBoard.tsx - compact card slots & Duels.ink floating card zoom on hover
[2026-09-09 14:05] Major | Antigravity | Write | src/data/thaiSupporterNames.json - 230 Thai supporter base names dataset
[2026-09-09 14:05] Major | Antigravity | Edit | src/utils/hypergeometric.ts & test - auto-detect Thai supporters for math
[2026-09-09 14:05] Major | Antigravity | Edit | PlaytestBoard.tsx - full vertical card ratio (aspect 2.5/3.5) for Bench/Hand
[2026-09-09 14:05] Major | Antigravity | Edit | e2e/playtest-simulator.spec.ts - 12/12 Playwright E2E tests verified 100%
[2026-09-09 14:12] Major | Antigravity | Release | v2.45.0 - Duels.ink Card Interaction, Bench Ratio Fix, and Thai Supporter Math
[2026-09-09 14:15] Major | Antigravity | Command | git checkout -b feature/digital-playmat-dual-controller
[2026-09-09 14:17] Major | Antigravity | Write | src/types/playmat.ts - room state, action payload, and board interfaces
[2026-09-09 14:18] Major | Antigravity | Write | src/services/playmatSyncService.ts - dual BroadcastChannel + Firestore sync
[2026-09-09 14:18] Major | Antigravity | Write | src/services/playmatSyncService.test.ts - unit test suite for playmat action reducer
[2026-09-09 14:18] Major | Antigravity | Edit | firestore.rules - allow public read/write for playmat_rooms/{roomCode}
[2026-09-09 14:19] Major | Antigravity | Write | src/components/playmat/PlaymatHostBoard.tsx - Tablet/TV 2-player board with 180° rotation
[2026-09-09 14:20] Major | Antigravity | Write | src/components/playmat/PlaymatMobileController.tsx - smartphone controller with private hand
[2026-09-09 14:21] Major | Antigravity | Write | src/components/playmat/PlaymatHub.tsx - room code generator and hub entry
[2026-09-09 14:21] Major | Antigravity | Edit | src/App.tsx, DeckManager.tsx, AccountMenu.tsx - routing & navigation
[2026-09-09 14:22] Major | Antigravity | Write | e2e/playmat-dualscreen.spec.ts - automated Playwright E2E tests for dual-screen sync
[2026-09-09 14:27] Major | Antigravity | Command | Quality gates passed: oxlint (0 errors), vitest (28 passed), playwright (4 passed), build (OK)
[2026-09-09 14:29] Major | Antigravity | Edit | package.json - bumped version 2.45.0 -> 2.46.0
[2026-09-09 14:30] Major | Antigravity | Release | v2.46.0 - Digital Pokémon Playmat Dual-Device System
[2026-09-09 14:32] Major | Antigravity | Rollback | main & origin/main rolled back to v2.45.0 (31b54bd); tag v2.46.0 deleted
[2026-09-09 14:33] Major | Antigravity | Branch | checkout feature/digital-playmat-dual-controller for local testing
[2026-09-09 14:39] Major | Antigravity | Edit | PlaymatHostBoard.tsx & PlaymatMobileController.tsx - 3-col playmat layout & 5 bench slots
[2026-09-09 14:42] Major | Antigravity | Edit | AppHeaderBar & BottomNav - replaced Battle Tracker with Digital Playmat
[2026-09-09 14:45] Major | Antigravity | Edit | DeckManager.tsx - removed duplicate Digital Playmat button from toolbar
[2026-09-09 14:48] Major | Antigravity | Release | v2.46.0 - Digital Pokémon Playmat with Dual-Screen Controller and Top Navigation
[2026-09-09 15:00] Major | Antigravity | Command | firebase deploy --only firestore:rules (deployed live playmat_rooms rule)
[2026-09-09 15:05] Major | Antigravity | Edit | src/services/playmatSyncService.ts - sanitizeForFirestore, monotonic timestamp guard
[2026-09-09 15:06] Major | Antigravity | Edit | src/components/playmat/PlaymatHub.tsx - 1-tap room resume and host room code re-entry
[2026-09-09 15:07] Major | Antigravity | Edit | src/components/playmat/PlaymatHostBoard.tsx - supporter zone in play & tool/energy badges
[2026-09-09 15:08] Major | Antigravity | Edit | src/components/playmat/PlaymatMobileController.tsx - deck search modal, supporter/tools actions
[2026-09-09 15:09] Major | Antigravity | Edit | e2e/playmat-dualscreen.spec.ts - automated E2E for search deck, supporter, tool, re-entry
[2026-09-09 15:10] Major | Antigravity | Command | Quality gates passed: lint (0 errors), vitest (28 passed), playwright (4 passed), build (OK)
[2026-09-09 15:11] Major | Antigravity | Edit | package.json - bumped version 2.46.0 -> 2.47.0
[2026-09-09 15:12] Major | Antigravity | Release | v2.47.0 - Playmat Realtime Cloud Sync, Deck Search, Supporter Zone & Tools
[2026-09-09 15:20] Major | Antigravity | Edit | src/types/playmat.ts - added officialImageUrl to PlaymatCard
[2026-09-09 15:21] Major | Antigravity | Edit | src/components/playmat/PlaymatHostBoard.tsx - active in front, hover & zoom preview
[2026-09-09 15:22] Major | Antigravity | Edit | src/components/playmat/PlaymatMobileController.tsx - cardDataMap lookup & zoom modal
[2026-09-09 15:24] Major | Antigravity | Edit | e2e/playmat-dualscreen.spec.ts - automated E2E for active front, hover & zoom preview
[2026-09-09 15:25] Major | Antigravity | Command | Quality gates passed: lint (0 errors), vitest (28 passed), playwright (4 passed), build (OK)
[2026-09-09 15:38] Major | Antigravity | Edit | src/types/playmat.ts - mulliganCount, playedItemAnnouncement, core rule actions
[2026-09-09 15:39] Major | Antigravity | Edit | src/services/playmatSyncService.ts - reducers for MULLIGAN, PLAY_ITEM, SHUFFLE/DRAW, DISCARD, KNOCKOUT
[2026-09-09 15:40] Major | Antigravity | Edit | src/components/playmat/PlaymatHostBoard.tsx - live item announcement popup & knock out action
[2026-09-09 15:43] Major | Antigravity | Edit | src/components/playmat/PlaymatMobileController.tsx - mulligan banner, top deck inspect modal, multi-discard modal
[2026-09-09 15:44] Major | Antigravity | Edit | src/services/playmatSyncService.test.ts - unit tests for new playmat reducers
[2026-09-09 15:45] Major | Antigravity | Edit | e2e/playmat-dualscreen.spec.ts - E2E tests for item announcement, top deck inspect, knock out
[2026-09-09 15:45] Major | Antigravity | Command | Quality gates passed: lint (0 errors), vitest (28 passed), playwright (4 passed), build (OK)
[2026-09-09 15:46] Major | Antigravity | Edit | package.json - bumped version 2.48.0 -> 2.49.0
[2026-09-09 15:47] Major | Antigravity | Release | v2.49.0 - Playmat Core Rules: Mulligan, Item Play, Top Deck Inspect, Multi Discard & Knockout
[2026-09-09 16:15] Major | Antigravity | Write | src/utils/qrCode.ts - zero-dependency offline SVG QR code generator
[2026-09-09 16:16] Major | Antigravity | Edit | src/types/playmat.ts - added PIN, undo, quotas, turn, reveal, terminate types
[2026-09-09 16:17] Major | Antigravity | Edit | src/services/playmatSyncService.ts - added undo, turn quotas, reveal, terminate
[2026-09-09 16:18] Major | Antigravity | Edit | src/components/playmat/PlaymatHostBoard.tsx - QR modal, restart, terminate, reveal
[2026-09-09 16:19] Major | Antigravity | Edit | src/components/playmat/PlaymatMobileController.tsx - drag-and-drop, quotas, reveal
[2026-09-09 16:20] Major | Antigravity | Edit | src/components/playmat/PlaymatHub.tsx - PIN protection and URL bypass
[2026-09-09 16:21] Major | Antigravity | Edit | e2e/playmat-dualscreen.spec.ts - automated E2E for match controls & QR
[2026-09-09 16:22] Major | Antigravity | Command | Quality gates passed: lint (0 errors), vitest (218 passed), playwright (156 passed), build (OK)
[2026-09-09 16:23] Major | Antigravity | Edit | package.json - bumped version 2.49.0 -> 2.50.0
[2026-09-09 17:05] Major | Antigravity | Edit | src/types/playmat.ts - added matchId counter and DISMISS_REVEAL action
[2026-09-09 17:05] Major | Antigravity | Edit | src/services/playmatSyncService.ts - incremented matchId on RESTART_ROOM
[2026-09-09 17:05] Major | Antigravity | Edit | src/components/playmat/PlaymatMobileController.tsx - reset hand on match restart
[2026-09-09 17:05] Major | Antigravity | Edit | src/components/playmat/PlaymatHostBoard.tsx - dispatch DISMISS_REVEAL on dismiss
[2026-09-09 17:05] Major | Antigravity | Edit | e2e/playmat-dualscreen.spec.ts - automated E2E for restart match hand reset
[2026-09-09 17:05] Major | Antigravity | Edit | package.json - bumped version 2.50.0 -> 2.51.0
[2026-09-09 17:05] Major | Antigravity | Release | v2.51.0 - Reset Controller Hand & Deck on Playmat Match Restart
[2026-09-09 17:48] Major | Antigravity | Edit | src/components/playmat/PlaymatHub.tsx - added safe area inset padding
[2026-09-09 17:48] Major | Antigravity | Edit | src/components/playmat/PlaymatMobileController.tsx - iPhone notch safe area & meta deck picker
[2026-09-09 17:48] Major | Antigravity | Edit | e2e/playmat-dualscreen.spec.ts - automated E2E for safe-area & deck picker modal
[2026-09-09 17:48] Major | Antigravity | Command | Quality gates passed: lint (0 errors), vitest (218 passed), playwright (8 passed), build (OK)
[2026-09-09 17:48] Major | Antigravity | Edit | package.json - bumped version 2.51.0 -> 2.52.0
[2026-09-09 18:25] Major | Antigravity | Write | src/components/playmat/PlaymatDuelBoard.tsx - Duels.ink style online duel screen
[2026-09-09 18:25] Major | Antigravity | Write | src/services/playmatAccessService.ts - playmat beta access allowlist service
[2026-09-09 18:25] Major | Antigravity | Write | src/store/playmatAccessStore.ts - reactive playmat beta access store & hooks
[2026-09-09 18:25] Major | Antigravity | Write | src/components/playmat/PlaymatAccessGate.tsx - closed beta gate UI with code unlock
[2026-09-09 18:25] Major | Antigravity | Write | src/components/admin/PlaymatAccessPanel.tsx - admin panel for playmat beta allowlist
[2026-09-09 18:25] Major | Antigravity | Edit | src/components/admin/AdminPage.tsx - added playmatAccess tab
[2026-09-09 18:25] Major | Antigravity | Edit | src/App.tsx - guarded Playmat routes behind PlaymatAccessGate
[2026-09-09 18:25] Major | Antigravity | Edit | src/components/layout/AppHeaderBar.tsx - hide playmat nav for non-allowed users
[2026-09-09 18:25] Major | Antigravity | Edit | src/components/layout/BottomNav.tsx - hide playmat nav for non-allowed users
[2026-09-09 18:25] Major | Antigravity | Edit | src/components/layout/AccountMenu.tsx - hide playmat nav for non-allowed users
[2026-09-09 18:25] Major | Antigravity | Edit | src/components/playmat/PlaymatHub.tsx - added Online Duel hero card
[2026-09-09 18:25] Major | Antigravity | Write | e2e/playmat-access-gate.spec.ts - automated E2E for playmat closed beta gate & admin
[2026-09-09 18:25] Major | Antigravity | Write | e2e/playmat-duel-mode.spec.ts - automated E2E for Duels.ink style online duel
[2026-09-09 18:25] Major | Antigravity | Command | Quality gates passed: lint (0 errors), vitest (224 passed), playwright (18 passed), build (OK)
[2026-09-09 18:25] Major | Antigravity | Edit | package.json - bumped version 2.52.0 -> 2.53.0
[2026-09-09 18:25] Major | Antigravity | Release | v2.53.0 - Online Duel Mode (Duels.ink Style) & Playmat Closed Beta Access Gate
[2026-09-09 19:02] Major | Antigravity | Write | src/services/userService.ts - added user profile sync and web user directory
[2026-09-09 19:02] Major | Antigravity | Write | src/components/admin/AllUsersPanel.tsx - admin user management & 1-click beta grant
[2026-09-09 19:02] Major | Antigravity | Edit | src/components/admin/AdminPage.tsx - integrated AllUsersPanel in users tab
[2026-09-09 19:02] Major | Antigravity | Edit | src/components/playmat/PlaymatDuelBoard.tsx - active above bench, drag & drop, evo stack, face-down setup, big item overlay, shuffle & reveal hand
[2026-09-09 19:02] Major | Antigravity | Edit | src/services/playmatSyncService.ts - reducers for evo, shuffle, hand reveal, setup flow
[2026-09-09 19:02] Major | Antigravity | Write | e2e/admin-all-users.spec.ts - automated E2E for admin all users & beta toggle
[2026-09-09 19:02] Major | Antigravity | Edit | e2e/playmat-duel-mode.spec.ts - automated E2E for TCG layout, setup, and shuffle
[2026-09-09 19:02] Major | Antigravity | Command | Quality gates passed: lint (0 errors), vitest (232 passed), playwright (26 passed), build (OK)
[2026-09-09 19:02] Major | Antigravity | Edit | package.json - bumped version 2.53.0 -> 2.54.0
[2026-09-09 19:02] Major | Antigravity | Release | v2.54.0 - Admin All Users Directory & TCG Duel Flow, Layout, Drag-Drop, Evolution, Setup
[2026-09-09 19:11] Major | Antigravity | Edit | firestore.rules - allowed admin access to users directory
[2026-09-09 19:11] Major | Antigravity | Edit | scripts/sync-community-stats-admin.mjs - backfill auth users to Firestore users col
[2026-09-09 19:11] Major | Antigravity | Command | Deploy firestore rules to cloud.firestore
[2026-09-09 19:11] Major | Antigravity | Command | Backfilled 5 registered users into Firestore users collection
[2026-09-09 19:33] Major | Antigravity | Edit | src/components/collection/CollectionFilterBar.tsx - collapsible filter bar on all screens
[2026-09-09 19:33] Major | Antigravity | Edit | src/components/collection/EnglishFilterBar.tsx - collapsible filter bar on all screens
[2026-09-09 19:33] Major | Antigravity | Delete | src/components/deck/playtest/ - removed legacy playtest simulator
[2026-09-09 19:33] Major | Antigravity | Edit | src/components/deck/DeckManager.tsx - replaced playtest with Digital Playmat link
[2026-09-09 19:33] Major | Antigravity | Edit | src/components/deck/DeckEditor.tsx - replaced playtest with Digital Playmat link
[2026-09-09 19:33] Major | Antigravity | Edit | src/components/deck/DeckViewModal.tsx - replaced playtest with Digital Playmat link
[2026-09-09 19:33] Major | Antigravity | Edit | src/components/playmat/PlaymatDuelBoard.tsx - auto-load pending deck from DeckManager
[2026-09-09 19:33] Major | Antigravity | Edit | src/components/playmat/PlaymatMobileController.tsx - auto-load pending deck from DeckManager
[2026-09-09 19:33] Major | Antigravity | Write | e2e/playtest-simulator.spec.ts - automated E2E for Playmat link & collapsible filter
[2026-09-09 19:33] Major | Antigravity | Command | Quality gates passed: lint (0 errors), vitest (232 passed), playwright (26 passed), build (OK)
[2026-09-09 19:33] Major | Antigravity | Edit | package.json - bumped version 2.54.0 -> 2.55.0
[2026-09-09 19:33] Major | Antigravity | Release | v2.55.0 - Collapsible Filter Bar & Digital Playmat Integration (Retired Legacy Playtest)
[2026-09-09 19:44] Major | Antigravity | Edit | src/components/deck/DeckManager.tsx - removed Playmat link, unified h-9 button heights & nowrap
[2026-09-09 19:44] Major | Antigravity | Edit | src/components/deck/DeckViewModal.tsx - removed Playmat button from modal footer
[2026-09-09 19:44] Major | Antigravity | Edit | src/components/deck/DeckEditor.tsx - removed Playmat button from stats bar
[2026-09-09 19:44] Major | Antigravity | Edit | src/components/playmat/PlaymatDuelBoard.tsx - removed pending deck listener
[2026-09-09 19:44] Major | Antigravity | Edit | src/components/playmat/PlaymatMobileController.tsx - removed pending deck listener
[2026-09-09 19:44] Major | Antigravity | Edit | e2e/playtest-simulator.spec.ts - automated E2E for clean deck actions & uniform buttons
[2026-09-09 19:44] Major | Antigravity | Command | Quality gates passed: lint (0 errors), vitest (232 passed), playwright (8 passed), build (OK)
[2026-09-09 19:44] Major | Antigravity | Edit | package.json - bumped version 2.55.0 -> 2.56.0
[2026-09-09 19:44] Major | Antigravity | Release | v2.56.0 - Removed Playmat Link from Deck & Redesigned Uniform Card Action Buttons
[2026-09-09 19:50] Major | Antigravity | Edit | src/components/playmat/PlaymatHub.tsx - removed Duels.ink references and badge
[2026-09-09 19:50] Major | Antigravity | Edit | src/components/playmat/PlaymatAccessGate.tsx - removed Duels.ink references
[2026-09-09 19:50] Major | Antigravity | Edit | src/components/playmat/PlaymatDuelBoard.tsx - cleaned Duels.ink comment
[2026-09-09 19:50] Major | Antigravity | Edit | e2e/playmat-duel-mode.spec.ts - cleaned test suite title
[2026-09-09 19:50] Major | Antigravity | Command | Quality gates passed: vitest (232 passed), lint (0 errors), build (OK), playwright (26 passed)
[2026-09-09 19:50] Major | Antigravity | Edit | package.json - bumped version 2.56.0 -> 2.57.0
[2026-09-09 19:50] Major | Antigravity | Release | v2.57.0 - Remove Duels.ink References and Declutter Playmat UI
[2026-09-09 19:55] Major | Antigravity | Command | Cleaned up 30 redundant git tags, kept key milestones: v1.0.0, v2.0.0, v2.50.0, v2.57.0
[2026-09-10 09:58] Major | Antigravity | Write | public/.well-known/assetlinks.json - configured Android TWA verification
[2026-09-10 09:58] Major | Antigravity | Write | public/.nojekyll - prevent GitHub Pages from dropping .well-known dotfiles
[2026-09-10 09:58] Major | Antigravity | Edit | public/_headers - added application/json header & CORS for assetlinks
[2026-09-10 09:58] Major | Antigravity | Command | Quality gates passed: vitest (232 passed), lint (0 errors), build (OK), playwright (4 passed)
[2026-09-10 09:58] Major | Antigravity | Edit | package.json - bumped version 2.57.0 -> 2.58.0
[2026-09-10 09:58] Major | Antigravity | Release | v2.58.0 - Configure Android Digital Asset Links & Remove URL Bar in APK
[2026-09-10 10:13] Major | Claude | Write | Report.html - full codebase review report (15 findings: 3 critical, 4 high, 5 medium, 3 low)
[2026-09-10 10:23] Major | Antigravity | Command | git checkout -b fix/report-audit-issues
[2026-09-10 10:48] Major | Antigravity | Write | implementation_plan.md - remediation plan for Report.html findings
[2026-09-10 11:00] Major | Antigravity | Fix | Report.html remediation: PWA precache, code splitting, rules, hook deps
[2026-09-10 11:04] Major | Antigravity | Command | Quality gates passed: lint (0 errors), vitest (232 passed), playwright (172 passed), build (OK)
[2026-09-10 11:16] Major | Antigravity | Edit | package.json - bumped version 2.58.0 -> 2.59.0
[2026-09-10 11:16] Major | Antigravity | Release | v2.59.0 - Codebase Audit Remediation: PWA Precache, Bundle Split & Security
[2026-09-10 11:39] Major | Claude | Write | Report-Followup.html - re-review of v2.59.0 remediation (6 fixed, 3 partial, 2 regressed, 4 untouched)
[2026-09-10 11:52] Major | Antigravity | Fix | firestore.rules, pricingStore, useMemo & dynamic imports per Report-Followup
[2026-09-10 11:52] Major | Antigravity | Command | Quality gates passed: lint (0 errors), vitest (232 passed), playwright (172 passed), build (OK)
[2026-09-10 11:53] Major | Antigravity | Edit | package.json - bumped version 2.59.0 -> 2.59.1
[2026-09-10 11:53] Major | Antigravity | Release | v2.59.1 - Fix Playmat room & sale rules, typed empty cards, clean dynamic chunk
[2026-09-10 12:04] Major | Claude | Write | Report-Playmat.html - Playmat handoff brief for Gemini (2 blockers, 6 prioritized tasks)
[2026-09-10 12:10] Major | Antigravity | Write | Report-Playmat-Response.html - architectural response & roadmap for Claude

[2026-09-10 12:17] Major | Claude | Write | Report-Playmat-Agreed.html - merged plan with Antigravity (A0-A5, target v2.60.0)
[2026-09-10 12:26] Major | Antigravity | Fix | Sprint 1: Screen Wake Lock, haptics, A2-a history limit, playmat auth & rules
[2026-09-10 12:45] Major | Antigravity | Feature | Sprint 3: Extracted CardSprite, DamageCountersBadge, AttachedEnergyList dumb components
[2026-09-10 12:47] Major | Antigravity | Edit | package.json - bumped version 2.59.1 -> 2.60.0
[2026-09-10 12:47] Major | Antigravity | Release | v2.60.0 - Digital Playmat Overhaul (A0-A5): Wake Lock, Haptics, 15-step Action Log, Partitioned Sync, Motion & Dumb Components
[2026-09-10 13:01] Major | Claude | Write | Report-Playmat-V260-Review.html - verification review of v2.60.0 (F1-F5)
[2026-09-10 13:04] Major | Antigravity | Fix | firestore.rules - added system_config/playmat_access & host/admin room delete
[2026-09-10 13:05] Major | Antigravity | Feature | src/components/admin/PlaymatRoomsPanel.tsx - Admin room select & delete
[2026-09-10 13:06] Major | Antigravity | Edit | package.json - bumped version 2.60.0 -> 2.60.1
[2026-09-10 13:06] Major | Antigravity | Release | v2.60.1 - Playmat Allowlist Cloud Sync & Admin Playmat Rooms Management
[2026-09-10 13:22] Major | Antigravity | Plan | implementation_plan.md - Online Duel sync & state isolation plan
[2026-09-10 13:26] Major | Antigravity | Plan | implementation_plan.md - Added MA6 expansion database update to plan
[2026-09-10 13:47] Major | Antigravity | Write | src/data/pokemonNames.json - synced 199 MA6 (30th CELEBRATION) cards
[2026-09-10 13:54] Major | Antigravity | Edit | src/data/ - MA6 booster, set release order, Thai supporters & evolutions
[2026-09-10 13:55] Major | Antigravity | Fix | src/components/playmat/PlaymatDuelBoard.tsx - auth & join on duel mount
[2026-09-10 13:58] Major | Antigravity | Fix | playmatSyncService.ts - isolated role board merging and onSnapshot protection
[2026-09-10 14:01] Major | Antigravity | Write | e2e/playmat-duel-concurrent.spec.ts - automated dual-screen concurrent duel test
[2026-09-10 14:02] Major | Antigravity | Command | Quality gates passed: vitest (248 passed), lint (0 errors), build (OK), playwright (12 passed)
[2026-09-10 14:02] Major | Antigravity | Edit | package.json - bumped version 2.60.1 -> 2.61.0
[2026-09-10 14:03] Major | Antigravity | Release | v2.61.0 - Online Duel State Isolation Sync & MA6 30th CELEBRATION Expansion
[2026-09-10 14:46] Major | Antigravity | Git | archive branch archive/playmat-v1-dom-prototype created and pushed
[2026-09-10 14:54] Major | Antigravity | Clean | AppHeaderBar, BottomNav, AccountMenu - uncluttered Playmat links from UI
[2026-09-10 14:54] Major | Antigravity | Feature | useOTAUpdate & VitePWA - seamless background auto-update & micro-toast
[2026-09-10 14:54] Major | Antigravity | Command | Quality gates passed: vitest (250 passed), lint (0 errors), build (OK), playwright (52 passed)
[2026-09-10 14:54] Major | Antigravity | Edit | package.json - bumped version 2.61.0 -> 2.62.0
[2026-09-10 14:54] Major | Antigravity | Release | v2.62.0 - Seamless OTA Auto-Update & Clean Playmat Archive UI
[2026-09-10 14:57] Major | Antigravity | Git | checkout -b feature/playmat-v2-pixijs for PixiJS R&D
[2026-09-10 15:02] Major | Antigravity | Write | docs/POKEMON_TCG_STANDARD_PLAYBOOK.md - comprehensive game rules & architecture playbook
[2026-09-10 15:06] Major | Antigravity | Write | docs/POKEMON_TCG_FULL_GAME_MULTIPLAYER_GUIDELINE.md - master multiplayer engineering guideline
[2026-09-10 15:10] Major | Antigravity | Write | src/engine/types.ts - pure deterministic Pokemon TCG game state definitions
[2026-09-10 15:11] Major | Antigravity | Write | src/engine/ActionValidator.ts - comprehensive official Standard rules validator
[2026-09-10 15:12] Major | Antigravity | Write | src/engine/GameReducer.ts - pure state reducer handling turn, attack, KO & checkup
[2026-09-10 15:13] Major | Antigravity | Test | src/engine/GameEngine.test.ts - 12 deterministic engine test suites passed in 9ms
[2026-09-10 15:17] Major | Antigravity | Write | src/engine/effects/EffectDSL.ts - declarative card effect engine & primitives
[2026-09-10 15:18] Major | Antigravity | Write | src/engine/data/StandardCardCatalog.ts - 60-card Charizard ex & Miraidon ex
[2026-09-10 15:19] Major | Antigravity | Test | src/engine/effects/EffectDSL.test.ts - 8 card effect & ability suites passed
[2026-09-10 15:20] Major | Antigravity | Test | src/engine/simulation/BotMatchSimulator.test.ts - 50-turn bot match passed in 41ms
[2026-09-10 15:21] Major | Antigravity | Command | npm install pixi.js - integrated PixiJS v8.20.1 WebGL renderer
[2026-09-10 15:22] Major | Antigravity | Write | src/engine/pixi/ - BoardViewport letterboxing & CardEntity nested containers
[2026-09-10 15:23] Major | Antigravity | Write | src/engine/pixi/PlaymatScene.ts - 1920x1080 full official Standard battle zones
[2026-09-10 15:24] Major | Antigravity | Write | src/components/playmat-v2/PlaymatV2Canvas.tsx - WebGL battle mat + AI bot
[2026-09-10 15:26] Major | Antigravity | Write | src/engine/network/FogOfWar.ts - zero-knowledge state masking & fog of war
[2026-09-10 15:27] Major | Antigravity | Write | e2e/playmat-v2-webgl.spec.ts - automated E2E test for WebGL canvas & AI turns
[2026-09-10 15:31] Major | Antigravity | Test | Quality gates passed: vitest (273 passed), build (clean), playwright (178 passed)
[2026-09-10 15:33] Major | Antigravity | Command | npm run dev - started local dev server on http://localhost:5173/playmat-v2
[2026-09-10 15:37] Major | Antigravity | Plan | implementation_plan.md - Card Artwork Textures, Deck Picker & Smart Bot AI
[2026-09-10 15:40] Major | Antigravity | Edit | src/engine/data/StandardCardCatalog.ts - card images & Roaring Moon deck
[2026-09-10 15:41] Major | Antigravity | Edit | src/engine/pixi/CardEntity.ts - WebGL card artwork texture rendering
[2026-09-10 15:42] Major | Antigravity | Write | src/engine/ai/SmartBotAI.ts - intelligent Standard turn decision engine
[2026-09-10 15:43] Major | Antigravity | Write | src/engine/ai/SmartBotAI.test.ts - unit tests for smart bot decisions
[2026-09-10 15:44] Major | Antigravity | Write | src/components/playmat-v2/DeckSelectionModal.tsx - deck & mode picker
[2026-09-10 15:45] Major | Antigravity | Edit | src/components/playmat-v2/PlaymatV2Canvas.tsx - wired deck picker & bot
[2026-09-10 15:47] Major | Antigravity | Test | Quality gates: 277 vitest passed, build (clean), 2 playwright passed
[2026-09-10 15:53] Major | Antigravity | Write | src/components/playmat-v2/PromotionModal.tsx - interactive promotion modal on KO
[2026-09-10 15:53] Major | Antigravity | Write | src/components/playmat-v2/CardPickerModal.tsx - interactive card picker modal
[2026-09-10 15:54] Major | Antigravity | Write | src/components/playmat-v2/TestSandboxModal.tsx - in-game test sandbox & scenario runner
[2026-09-10 15:54] Major | Antigravity | Edit | src/components/playmat-v2/PlaymatV2Canvas.tsx - wired interactive modals & multi-target selection
[2026-09-10 15:55] Major | Antigravity | Write | src/engine/simulation/MatchStressTest.test.ts - 100-match headless stress test
[2026-09-10 15:58] Major | Antigravity | Edit | e2e/playmat-v2-webgl.spec.ts - comprehensive E2E tests for Sandbox & Promotion
[2026-09-10 16:09] Major | Antigravity | Test | Quality gates: 281 vitest passed, 100-match stress test (0 err), 8/8 E2E passed, build clean
[2026-09-10 16:58] Major | Antigravity | Test | 281/281 Vitest unit & stress tests passed with official setup & evolution
[2026-09-10 17:23] Major | Antigravity | Test | Quality gates: 281 vitest, 10/10 Playwright E2E, 0 lint err, build clean
[2026-09-10 18:47] Major | Antigravity | Edit | src/components/playmat-v2/DeckSelectionModal.tsx - coin flip & bot-vs-bot
[2026-09-10 18:48] Major | Antigravity | Edit | src/engine/ai/SmartBotAI.ts - 6 advanced tactics & gust trapping
[2026-09-10 18:48] Minor | Antigravity | Test | src/engine/ai/SmartBotAI.test.ts - 7 tests passed (all tactics verified)
[2026-09-10 18:50] Major | Antigravity | Edit | src/components/playmat-v2/PlaymatV2Canvas.tsx - bot-vs-bot spectator & turn 1 supporter lock
[2026-09-10 18:51] Major | Antigravity | Edit | e2e/playmat-v2-webgl.spec.ts - tests for deck modal & bot-vs-bot
[2026-09-10 19:10] Major | Antigravity | Edit | src/components/playmat-v2/DeckSelectionModal.tsx - mobile responsive footer
[2026-09-10 19:11] Major | Antigravity | Edit | src/components/playmat-v2/SetupPhaseModal.tsx - mobile sticky confirm button
[2026-09-10 19:12] Major | Antigravity | Edit | e2e/playmat-v2-webgl.spec.ts - scrollIntoViewIfNeeded for mobile tests
[2026-09-10 19:26] Major | Antigravity | Edit | src/components/playmat-v2/SetupPhaseModal.tsx - dedicated footer & phase guard
[2026-09-10 19:28] Major | Antigravity | Edit | src/components/playmat-v2/DeckSelectionModal.tsx - deck button IDs & status text
[2026-09-10 19:29] Major | Antigravity | Edit | e2e/playmat-v2-webgl.spec.ts - deterministic selectors & flip wait
[2026-09-10 19:44] Major | Antigravity | Write | src/engine/data/LimitlessDeckLoader.ts - 24 Limitless meta decks builder
[2026-09-10 19:44] Major | Antigravity | Edit | src/engine/data/StandardCardCatalog.ts - fixed 4 broken image paths
[2026-09-10 19:45] Major | Antigravity | Test | Quality gates: 290 vitest passed (all 42 test suites green)
[2026-09-10 19:56] Major | Antigravity | Edit | src/components/playmat-v2/ - Limitless decks & card image fallback
[2026-09-10 19:57] Major | Antigravity | Test | Quality gates: 290 vitest passed, 8 Playwright E2E passed, build clean
[2026-09-10 20:05] Major | Antigravity | Plan | implementation_plan.md - in-hand setup, turn sequence & card effects
[2026-09-10 20:25] Major | Antigravity | Edit | in-hand setup & card effects
[2026-09-10 20:26] Major | Antigravity | Test | 290 vitest + 7 Playwright passed
[2026-09-10 20:45] Major | Antigravity | Write | EvolutionResolver.ts - evolution engine
[2026-09-10 20:46] Major | Antigravity | Edit | PlaymatV2 - Bench & Rare Candy UI
[2026-09-10 20:47] Major | Antigravity | Edit | ActionValidator - bench evo rules
[2026-09-10 20:50] Major | Antigravity | Test | 299 vitest, 8 E2E, build clean
[2026-09-10 20:52] Major | Antigravity | Write | walkthrough.md - documented Bench Evolution & Rare Candy system
[2026-09-10 20:57] Major | Antigravity | Test | Verified quality gates: 299 vitest, 8 Playwright E2E, build clean
[2026-09-10 21:05] Major | Antigravity | Plan | implementation_plan.md - card mapping & ability engine fix
[2026-09-10 21:10] Major | Antigravity | Plan | implementation_plan.md - full attack damage & card database plan
[2026-09-10 21:12] Major | Antigravity | Write | StandardCardDatabase.ts - canonical attacks & abilities
[2026-09-10 21:13] Major | Antigravity | Edit | LimitlessDeckLoader.ts - authentic attacks, abilities & types
[2026-09-10 23:10] Major | Antigravity | Edit | EffectDSL.ts - authentic attack damage & ability effects
[2026-09-10 23:11] Major | Antigravity | Edit | GameReducer.ts - per-instance ability tracking & attack damage flow
[2026-09-10 23:12] Major | Antigravity | Edit | PlaymatV2Canvas.tsx - attack cost pills & ability filter
[2026-09-10 23:13] Major | Antigravity | Write | StandardAttackAndAbility.test.ts - verified attacks & abilities
[2026-09-10 23:14] Major | Antigravity | Test | 310 vitest passed, 9 Playwright E2E passed, build clean
[2026-09-11 11:15] Major | Antigravity | Edit | StandardCardDatabase.ts - cleaned duplicate keys
[2026-09-11 11:20] Major | Antigravity | Edit | e2e/playmat-v2-webgl.spec.ts - resilient bench evolution locators
[2026-09-11 11:22] Major | Antigravity | Test | 311 vitest + 9 Playwright E2E passed (100% clean exit)
[2026-09-11 11:35] Major | Antigravity | Write | StandardTrainerDatabase.ts - canonical Trainer cards & rules
[2026-09-11 11:51] Major | Antigravity | Test | 321 vitest + 9 Playwright E2E passed, build clean (0 errors)
[2026-09-11 12:09] Major | Antigravity | Edit | implementation_plan.md - added God-Tier UI/UX design suite
[2026-09-11 12:36] Major | Antigravity | Plan | implementation_plan.md - resumed Playmat V3 Tabletop Engine & God-Tier UI plan
[2026-09-11 12:40] Major | Antigravity | Feature | GameReducer - implemented 22 MANUAL_ tabletop actions, undo stack & 26 tests
[2026-09-11 12:46] Major | Antigravity | Polish | playmat-v2 UI modals - clean unused vars, recoil & gust actions
[2026-09-11 13:54] Major | Antigravity | Release | Playmat V3 Tabletop Sandbox: 348 vitest + 10 E2E passed, build clean
[2026-09-11 14:18] Major | Antigravity | Feature | Playmat V3 Sandbox on separate branch: 6 E2E + 8 vitest passed
[2026-09-11 15:00] Major | Antigravity | Feature | Playmat V3 Dual-Player Board, Center Spotlight & Online Room: 9 E2E passed
[2026-09-11 15:33] Major | Antigravity | Refactor | Playmat V3 Bottom Hand Console & Firestore room permissions fix
[2026-09-11 15:52] Major | Antigravity | Feature | Playmat V3 New Game Deck Picker & Manual Tabletop Setup (11 E2E passed)
[2026-09-11 16:15] Major | Antigravity | Feature | Playmat V3 3-Pass Deck Shuffle & Who Goes First Selector (11 E2E passed)
[2026-09-11 16:28] Major | Antigravity | Feature | Playmat V3 Solo Practice Hand Switcher: Dual Tabs, Tab key & Auto-Swap (12 E2E passed)
[2026-09-11 16:37] Major | Antigravity | Polish | Playmat V3 Responsive Viewports: Mobile, Tablet, Laptop, Desktop (13 E2E passed)
[2026-09-11 16:48] Major | Antigravity | Refactor | Playmat V3 Removed Cluttered Setup Banner, Streamlined Hand Controls (13 E2E passed)
[2026-09-11 16:59] Major | Antigravity | Fix | Playmat V3 Fixed Deck Search card actions: atomic shuffle & functional updater (15 E2E passed)
[2026-09-12 08:05] Major | Antigravity | Feature | Playmat V3 63:88 card ratio, Ability button, Turn tracking & Retreat flow
[2026-09-12 08:05] Major | Antigravity | Test | Playwright E2E 19/19 passed, Vitest 365/365 passed, Build clean
[2026-09-12 08:15] Major | Antigravity | Refactor | Playmat V3 Dual-Flank CenterBoard, Open Active Arena & Symmetrical Layout
[2026-09-12 08:36] Major | Antigravity | Feature | Playmat V3 Large Card Preview & Clear Text Reader (20 E2E passed)
[2026-09-12 09:20] Major | Antigravity | Write | TabletopConsentModal.tsx - opponent consent modal for 2-player & online
[2026-09-12 09:21] Major | Antigravity | Edit | tabletopStateHelper.ts - revealCardToSpotlight places card on board
[2026-09-12 09:22] Major | Antigravity | Edit | PlaymatV3Canvas.tsx - wired revealed card on board & opponent consent
[2026-09-12 09:23] Major | Antigravity | Write | tabletopConsent.test.ts - unit tests for consent actions (3 tests passed)
[2026-09-12 09:24] Major | Antigravity | Edit | e2e/playmat-v3-sandbox.spec.ts - added E2E tests for revealed card, deck bottom & consent
[2026-09-12 09:34] Major | Antigravity | Test | Verified quality gates: 23/23 Playwright E2E passed, 370/370 Vitest passed, build clean
[2026-09-12 09:34] Major | Antigravity | Write | walkthrough.md - documented Thai localization, deck bottom, board reveal & consent
[2026-09-13 08:49] Major | Antigravity | Fix | TabletopPokemonCard uncluttered, Trainer play to tabletop board (23 E2E passed)
[2026-09-13 09:23] Major | Antigravity | Release | v2.63.0-beta.1 - Playmat V3 Tabletop Sandbox Beta
[2026-09-13 09:44] Major | Antigravity | Feature | Attack targeting reticle, weakness x2 calc, bench snipe & action toasts
[2026-09-13 09:44] Major | Antigravity | Test | Verified quality gates: 25/25 Playwright E2E passed, 382 Vitest passed, build OK
[2026-09-13 10:17] Major | Antigravity | Fix | Universal Pointer Drag-and-Drop: 60fps avatar, proximity snapping (27 E2E)
[2026-09-13 10:28] Major | Antigravity | Plan | Authentic Playmat Layout, Large Stadium, Discard DnD & Multi-Select Search
[2026-09-13 10:52] Major | Antigravity | Feature | Authentic Playmat Layout: 3x2 prizes on left, deck over discard on right
[2026-09-13 10:52] Major | Antigravity | Feature | Dedicated Grand Stadium Arena (63:88 ratio) & drag to stadium slot
[2026-09-13 10:52] Major | Antigravity | Feature | Drag cards from hand and Pokemon from field to discard pile
[2026-09-13 10:52] Major | Antigravity | Feature | Multi-card select & bulk actions (hand, bench, discard, lost) in deck search
[2026-09-13 10:52] Major | Antigravity | Feature | Multi-layered radiating typed energy aura & authentic badges on Pokemon
[2026-09-13 10:52] Major | Antigravity | Test | Verified quality gates: 64/64 Playwright E2E passed, 382 Vitest passed, build OK
[2026-09-13 11:06] Major | Antigravity | Feature | Multi-tier Typed Energy Aura, floating elemental crest & modal attach
[2026-09-13 11:06] Major | Antigravity | Test | Verified quality gates: 66/66 Playwright E2E passed, 382 Vitest passed, build OK
[2026-09-13 11:34] Major | Antigravity | Feature | Relocate Stadium to Player Zone, slim Active Arena, fix hand overlap
[2026-09-13 11:34] Major | Antigravity | Fix | Compact facedown quick flip button, safe card surface click targets
[2026-09-13 11:34] Major | Antigravity | Test | Verified quality gates: 66/66 Playwright E2E passed, 23/23 Vitest passed, build OK
[2026-09-13 11:48] Major | Antigravity | Feature | Stadium at Bench 1, Active aligned with Bench 3, Facedown default, Mulligan proof popup
[2026-09-13 12:31] Major | Antigravity | Feature | Compact bench & active arena, hand to deck multi/DnD UX
[2026-09-13 12:48] Major | Antigravity | Layout | Active Arena button-height pill & remove vertical empty space
[2026-09-13 12:56] Major | Antigravity | Layout | Enlarge all cards, slots & hand for maximum clarity and screen utilization
[2026-09-13 13:13] Major | Antigravity | Layout | PC responsive clamp-scaling: 100% viewport fit with zero scroll
[2026-09-13 13:30] Major | Antigravity | Feature | Enforce Active & Prize setup validation before Let's Play (35 E2E)
[2026-09-13 13:40] Major | Antigravity | Fix | Hand card hover toolbar clearance & zoom ease; restore Ability for all Pokemon
[2026-09-13 13:40] Major | Antigravity | Test | Verified quality gates: 35/35 Playwright E2E passed, 385 Vitest passed, build OK
[2026-09-13 13:46] Major | Antigravity | Release | v2.63.0 - Playmat V3 Tabletop Sandbox Stable
[2026-09-13 13:56] Major | Antigravity | Feature | branch feature/playmat-v3-realtime-nextgen: WebRTC P2P, BroadcastChannel, Badge & Fallback
[2026-09-13 13:56] Major | Antigravity | Test | Verified quality gates: 397 Vitest passed, Playwright multi-tab E2E passed, build OK
[2026-09-13 13:58] Major | Antigravity | Release | firestore.rules - deployed playmat_signals rule to Firebase Cloud
[2026-09-13 14:06] Major | Antigravity | Plan | implementation_plan.md - planned online realtime sync & deck selection
[2026-09-13 14:15] Major | Antigravity | Feature | Independent deck selector in OnlineRoomModal for Host & Guest
[2026-09-13 14:17] Major | Antigravity | Fix | tabletopSyncService partitioned role sync & v3_tabletop_rooms collection
[2026-09-13 14:18] Major | Antigravity | Fix | TabletopDeckSelectorModal targetSideOnly prevents modifying opponent deck
[2026-09-13 14:20] Major | Antigravity | Test | Verified quality gates: 2/2 Playwright realtime E2E, 398 Vitest passed, build clean
[2026-09-13 14:30] Major | Antigravity | Plan | implementation_plan.md - planned stutter fix, consent sync & auto-shuffle
[2026-09-13 14:52] Major | Antigravity | Feature | P2P zero-stutter streaming, 3s consent auto-approval & deck auto-shuffle
[2026-09-13 14:52] Major | Antigravity | Test | Verified quality gates: 2/2 Playwright realtime E2E, 399 Vitest passed, build OK
[2026-09-13 15:10] Major | Antigravity | Feature | Custom attack damage inputs, delta adjustments & 2.64.0 version bump
[2026-09-13 15:11] Major | Antigravity | Release | v2.64.0 - Playmat V3 Next-Gen Realtime Sync & Custom Attack Damage
[2026-09-13 15:21] Major | Antigravity | Refactor | Removed Playmat V1 & V2, moved shared modals to playmat-v3/modals
[2026-09-13 15:32] Major | Antigravity | Release | v2.65.0 - Cleanup and removal of legacy Playmat V1 and V2
[2026-09-13 15:46] Major | Antigravity | Write | wrangler.json - added SPA asset handling for Cloudflare Worker
[2026-09-13 15:47] Major | Antigravity | Script | upload-set-boosters-to-r2.mjs - uploaded 81 booster packs to R2
[2026-09-13 15:47] Major | Antigravity | Deploy | wrangler deploy - updated Worker with SPA routing & assets
[2026-09-13 16:03] Major | Antigravity | Release | v2.66.0 - Cloudflare SPA Routing, R2 Booster Packs & V1/V2 Cleanup
[2026-09-13 16:10] Major | Antigravity | Release | v2.67.0 - Restore standard Cloudflare Pages deploy & remove wrangler config
[2026-09-13 16:14] Major | Antigravity | Edit | AGENTS.md - enforced atomic commits (no standalone AI_LOG commits) & Pages
[2026-09-13 16:30] Major | Antigravity | Release | v2.68.0 - Official MA6 box & 199 cards R2 sync with tiered fallback
[2026-09-13 17:03] Major | Antigravity | Feature | Playmat V3 turn decision, realtime damage sync, turn indicator & LAN access
[2026-09-13 17:03] Major | Antigravity | Test | Verified quality gates: Playwright E2E passed, 394 Vitest passed, build OK
[2026-09-13 17:42] Major | Antigravity | Feature | Playmat V3 UX: YOU/OPP coin toss, mutual Let's Play, Rematch, 6-prize victory
[2026-09-13 17:42] Major | Antigravity | Feature | Local mode access bypass vs PlaymatAccessGate closed-beta guard in prod
[2026-09-13 17:42] Major | Antigravity | Test | Verified quality gates: 5/5 Playwright E2E passed, 398 Vitest passed, build OK
[2026-09-13 18:21] Major | Antigravity | Feature | Playmat V3 synchronized 3D metallic coin toss, center coin flip & turn-gated pass turn
[2026-09-13 18:46] Major | Antigravity | Feature | Playmat V3 deck search cut/shuffle consent, tool/energy preview & damage memory
[2026-09-13 18:46] Major | Antigravity | Test | Verified quality gates: Playwright E2E passed, 399 Vitest passed, build OK
[2026-09-13 18:46] Major | Antigravity | Release | v2.69.0 - Playmat V3 3D Metallic Coin, Deck Cut Consent & Safeguards
[2026-09-13 19:26] Major | Antigravity | Edit | src/components/playmat-v3/tabletopStateHelper.ts - added VFX & Mulligan sync
[2026-09-13 19:27] Major | Antigravity | Edit | src/components/playmat-v3/tabletopSyncService.ts - synced VFX & Mulligan
[2026-09-13 19:28] Major | Antigravity | Edit | src/components/playmat-v3/MulliganCheckModal.tsx - reviewer proof & bonus draw
[2026-09-13 19:28] Major | Antigravity | Edit | src/components/playmat-v3/PlaymatV3Canvas.tsx - wired VFX & Mulligan sync
[2026-09-13 20:00] Major | Antigravity | Test | Verified quality gates: 92/92 Playwright E2E passed, 399 Vitest passed, build OK
[2026-09-13 20:00] Major | Antigravity | Release | v2.70.0 - Playmat V3 Reconnect, Active Rooms, VFX & Mulligan Sync
[2026-09-13 20:25] Major | Antigravity | Fix | src/components/playmat-v3/ - fixed deck search reveal sync & repeat popups
[2026-09-13 20:25] Major | Antigravity | Test | Verified quality gates: Playwright E2E passed, build OK, oxlint OK
[2026-09-13 20:25] Major | Antigravity | Release | v2.70.1 - Fix Deck Search Opponent Reveal Sync & Dismiss Loop
[2026-09-13 20:46] Major | Antigravity | Fix | src/components/playmat-v3/ - resolved broken VFX card images & fallback
[2026-09-13 20:46] Major | Antigravity | Feature | TabletopConsentModal.tsx - combined deck search card reveal into consent
[2026-09-13 20:46] Major | Antigravity | Test | Verified quality gates: Playwright E2E passed, Vitest passed, build OK
[2026-09-13 20:46] Major | Antigravity | Release | v2.70.2 - Fix VFX Broken Card Images & Combine Deck Reveal Consent
[2026-09-13 21:05] Major | Antigravity | Fix | playmatAccessService.ts - fixed admin directory localhost bypass bug
[2026-09-13 21:05] Major | Antigravity | Feature | tabletopSyncService.ts - added 30-min inactivity room auto-close
[2026-09-13 21:05] Major | Antigravity | Fix | PlaymatRoomsPanel.tsx - unified V3 & V2 room deletion from Admin
[2026-09-13 21:05] Major | Antigravity | Test | Verified quality gates: 401 Vitest passed, Playwright E2E passed, build OK
[2026-09-13 21:46] Major | Antigravity | Refactor | TabletopPokemonCard.tsx - removed bottom energy pill, kept top-right orb
[2026-09-13 21:46] Major | Antigravity | Feature | PlaymatV3Canvas.tsx - streamlined hand console, dual draw pill, clean tabs
[2026-09-13 21:46] Major | Antigravity | Fix | Playmat V3 Modals - fixed race condition, mutual dismissal & z-index stack
[2026-09-13 21:46] Major | Antigravity | Test | Verified quality gates: Playwright E2E passed, 401 Vitest passed, build OK
[2026-09-13 21:46] Major | Antigravity | Release | v2.70.4 - Streamline Toolbars, Remove Card Energy Pill & Modal Race Fix
[2026-09-13 22:48] Major | Antigravity | Feature | Implemented Thai Language Priority (Rule 5) across UI, engine & playmat
[2026-09-13 22:48] Major | Antigravity | Edit | src/utils/pokemonThaiTranslator.ts - enriched card, attack & ability translations
[2026-09-13 22:48] Major | Antigravity | Test | Verified quality gates: 404 Vitest passed, Playwright E2E passed, build OK
[2026-09-13 22:48] Major | Antigravity | Release | v2.71.0 - Mandatory Thai Language Priority across UI, Playmat V3 & Engine
[2026-09-13 23:52] Major | Antigravity | Command | npm run dev - started dev server at http://localhost:5173/
[2026-09-14 00:54] Major | Antigravity | Refactor | TabletopPokemonCard.tsx - removed card energy pill indicator
[2026-09-14 00:54] Major | Antigravity | Fix | tabletopSyncService.ts & PlaymatV3Canvas - fixed P2 modal race condition
[2026-09-14 00:54] Major | Antigravity | Feature | TabletopConsentModal.tsx - added Boss's Orders Pokemon Switch consent
[2026-09-14 00:54] Major | Antigravity | Feature | PlaymatV3Canvas.tsx - flipped top opponent Deck/Prizes 180 deg
[2026-09-14 00:54] Major | Antigravity | Test | Verified quality gates: 98 Playwright E2E passed, 405 Vitest passed, build OK
[2026-09-14 00:54] Major | Antigravity | Release | v2.72.0 - 180-deg opponent layout, opponent switch consent & modal race fix
[2026-09-14 02:23] Major | Antigravity | Fix | tabletopSyncService.ts - monotonic guard & combat ID to prevent P2 modal bounce
[2026-09-14 02:23] Major | Antigravity | Feature | Mobile Playmat V3 UX overhaul - non-colliding layout, compact dock & cards
[2026-09-14 02:23] Major | Antigravity | Test | Verified quality gates: 406 Vitest passed, Playwright E2E passed, build OK
[2026-09-14 02:23] Major | Antigravity | Release | v2.73.0 - fix P2 damage modal bounce and overhaul mobile playmat UI/UX
[2026-09-14 08:10] Major | Antigravity | Fix | LimitlessDeckLoader & authStore - custom deck cloud hydration & Thai card lookup
[2026-09-14 08:10] Major | Antigravity | Feature | DeckManager - added quick 'Play in Playmat' launch for custom decks
[2026-09-14 08:10] Major | Antigravity | Fix | DeckSearchModal - mobile toolbar non-clipping scrollable action sheet
[2026-09-14 08:10] Major | Antigravity | Feature | OnlineRoomModal - visual deck card, quick chips & full catalog modal
[2026-09-14 08:10] Major | Antigravity | Test | Verified quality gates: 10/10 Playwright E2E passed, 406 Vitest passed, build OK
[2026-09-14 08:10] Major | Antigravity | Release | v2.74.0 - playmat custom deck support, mobile search toolbar & visual deck picker
[2026-09-14 10:17] Major | Antigravity | Plan | implementation_plan.md - planned admin analytics data audit & bugfixes
[2026-09-14 10:27] Major | Antigravity | Write | src/services/adminAnalyticsService.ts - real-time Firestore analytics
[2026-09-14 10:27] Major | Antigravity | Edit | src/utils/analytics.ts - added cardsAdded & add_card tracking
[2026-09-14 10:27] Major | Antigravity | Edit | src/store/collectionStore.ts - added card action telemetry tracking
[2026-09-14 10:28] Major | Antigravity | Edit | src/store/deckStore.ts - added deck action telemetry tracking
[2026-09-14 10:28] Major | Antigravity | Edit | src/components/collection/CollectionTracker.tsx - added type & set filter telemetry
[2026-09-14 10:28] Major | Antigravity | Edit | src/components/admin/AllUsersPanel.tsx - sorted users by lastLoginAt
[2026-09-14 10:33] Major | Antigravity | Edit | src/components/admin/AdminPage.tsx - integrated cloud analytics, KPI cards & tabs
[2026-09-14 10:33] Major | Antigravity | Edit | src/components/deck/DeckImportExportModal.tsx - tracked deck export actions
[2026-09-14 10:33] Major | Antigravity | Write | src/utils/analytics.test.ts - unit tests for analytics
[2026-09-14 10:34] Major | Antigravity | Write | src/services/adminAnalyticsService.test.ts - unit tests for cloud analytics service
[2026-09-14 10:35] Major | Antigravity | Edit | src/services/userService.ts - added safe localStorage guards for test env
[2026-09-14 10:36] Major | Antigravity | Fix | src/components/deck/DeckImportExportModal.tsx - fixed activeTab variable reference
[2026-09-14 10:36] Major | Antigravity | Fix | src/components/admin/AdminPage.tsx - added lastRefreshed header timestamp
[2026-09-14 10:39] Major | Antigravity | Write | e2e/admin-analytics.spec.ts - automated E2E for admin analytics dashboard
[2026-09-14 10:41] Major | Antigravity | Command | Quality gates passed: 413 Vitest passed, Playwright E2E passed, build OK
[2026-09-14 10:43] Major | Antigravity | Command | npm run dev - started local dev server at http://localhost:5173/
[2026-09-14 10:47] Major | Antigravity | Edit | index.html - integrated official Google Tag G-BNNXCMKZZ9 in head
[2026-09-14 10:47] Major | Antigravity | Edit | src/utils/analytics.ts - added G-BNNXCMKZZ9 default ID & gtag forwarding
[2026-09-14 10:47] Major | Antigravity | Edit | src/components/admin/AdminPage.tsx - synced GA4 connected status & gaId
[2026-09-14 10:48] Major | Antigravity | Write | .env.example - documented VITE_GA_MEASUREMENT_ID
[2026-09-14 10:51] Major | Antigravity | Command | Quality gates passed: 413 Vitest passed, Playwright E2E passed, build OK
[2026-09-14 10:58] Major | Antigravity | Edit | package.json - bumped version 2.74.0 -> 2.75.0
[2026-09-14 10:58] Major | Antigravity | Command | Quality gates passed: lint (0 errors), vitest (413 passed), playwright (4 passed), build (OK)
[2026-09-14 10:58] Major | Antigravity | Release | v2.75.0 - Admin Analytics Overhaul & Official Google Analytics 4 Tag Integration
[2026-09-14 11:08] Major | Antigravity | Write | public/privacy.html - created Privacy Policy page for Google Play Store
[2026-09-14 11:23] Major | Antigravity | Write | src/components/layout/DeleteAccountModal.tsx - created in-app account deletion modal
[2026-09-14 11:24] Major | Antigravity | Edit | src/services/userService.ts - added deleteUserCloudData
[2026-09-14 11:24] Major | Antigravity | Edit | src/store/authStore.ts - added deleteAccount action
[2026-09-14 11:24] Major | Antigravity | Edit | src/components/layout/AccountMenu.tsx - added delete account menu item
[2026-09-14 11:28] Major | Antigravity | Edit | package.json - bumped version 2.75.0 -> 2.75.1
[2026-09-14 11:28] Major | Antigravity | Command | Quality gates passed: lint (0 errors), vitest (414 passed), playwright (4 passed), build (OK)
[2026-09-14 11:28] Major | Antigravity | Release | v2.75.1 - In-App Account & Cloud Data Deletion for Google Play Policy Compliance
[2026-09-14 11:35] Major | Antigravity | Write | play_console_data_safety.csv - Google Play Data Safety questionnaire CSV
[2026-09-14 11:55] Major | Antigravity | Edit | index.html, vite.config.ts, README.md - updated descriptions to focus on Binder & Deck Builder
[2026-09-14 11:55] Major | Antigravity | Edit | package.json - bumped version 2.75.1 -> 2.75.2
[2026-09-14 11:55] Major | Antigravity | Release | v2.75.2 - Store Listing & Metadata Alignment for Collection & Deck Builder
[2026-09-14 12:01] Major | Antigravity | Write | play_store_assets/ - generated Feature Graphic (1024x500) & 5 Phone Screenshots (1080x1920)
[2026-09-14 12:12] Major | Antigravity | Write | play_store_assets/ - generated 7-inch & 10-inch tablet screenshots (4 each)
[2026-09-14 12:53] Major | Antigravity | Edit | public/.well-known/assetlinks.json - added Google Play App Signing SHA-256 fingerprint 55:50:E7:...
[2026-09-14 12:53] Major | Antigravity | Edit | package.json - bumped version 2.75.2 -> 2.75.3
[2026-09-14 12:53] Major | Antigravity | Release | v2.75.3 - Digital Asset Links Google Play App Signing Verification for TWA Fullscreen
[2026-09-14 13:05] Major | Antigravity | Edit | public/_headers - assetlinks.json max-age=0 no-cache for instant CDN validation
[2026-09-14 13:05] Major | Antigravity | Edit | e2e/playmat-v3-sandbox.spec.ts - increased container visibility timeout to 30s
[2026-09-14 13:05] Major | Antigravity | Edit | package.json - bumped version 2.75.3 -> 2.75.4
[2026-09-14 13:05] Major | Antigravity | Release | v2.75.4 - Fix TWA URL Bar with Zero-Cache Asset Links & Google Play Signing
[2026-09-14 15:22] Major | Antigravity | Fix | Swap SVAW Water/Psychic & SVAM Grass/Fighting energy images and hashes
[2026-09-14 15:22] Major | Antigravity | Edit | src/engine/data/StandardCardCatalog.ts - fix basic energy images & URLs
[2026-09-14 15:22] Major | Antigravity | Write | src/data/energyImageIntegrity.test.ts - unit tests for energy image colors
[2026-09-14 15:22] Major | Antigravity | Upload | Cloudflare R2 - uploaded corrected SVAW and SVAM energy webp & hd jpg
[2026-09-14 15:22] Major | Antigravity | Edit | package.json - bumped version 2.75.4 -> 2.75.5
[2026-09-14 15:22] Major | Antigravity | Command | Quality gates passed: lint (0 errors), vitest (419 passed), build (OK)
[2026-09-14 15:22] Major | Antigravity | Release | v2.75.5 - Fix Swapped Basic Energy Card Images (SVAW Water/Psychic & SVAM Grass/Fighting)
[2026-09-14 15:52] Major | Antigravity | Edit | src/components/playmat-v3/types.ts - spectator role & metadata types
[2026-09-14 15:52] Major | Antigravity | Edit | src/services/playmatSyncService.ts - spectator & email fields in summary
[2026-09-14 15:52] Major | Antigravity | Edit | src/components/playmat-v3/tabletopSyncService.ts - spectator join/leave & meta
[2026-09-14 15:52] Major | Antigravity | Edit | src/components/playmat-v3/OnlineRoomModal.tsx - custom display name & spec mode
[2026-09-14 15:52] Major | Antigravity | Edit | src/components/playmat-v3/PlaymatV3Canvas.tsx - spectator banner & dock & rename
[2026-09-14 15:52] Major | Antigravity | Edit | src/components/admin/PlaymatRoomsPanel.tsx - player emails & spectator monitor
[2026-09-14 15:52] Major | Antigravity | Write | src/components/playmat-v3/tabletopSpectator.test.ts - unit tests
[2026-09-14 15:52] Major | Antigravity | Write | e2e/playmat-v3-spectator-and-custom-name.spec.ts - automated E2E tests
[2026-09-14 15:52] Major | Antigravity | Edit | package.json - bumped version 2.75.5 -> 2.76.0
[2026-09-14 15:52] Major | Antigravity | Command | Quality gates passed: lint (0 errors), vitest (424 passed), build (OK)
[2026-09-14 15:52] Major | Antigravity | Release | v2.76.0 - Custom Display Name, Spectator Mode, and Admin Email Monitoring
[2026-09-14 17:06] Major | Antigravity | Edit | src/components/deck/MetaDecksHub.tsx - 2-tier responsive action buttons layout
[2026-09-14 17:06] Major | Antigravity | Edit | e2e/deck-builder.spec.ts - multi-viewport boundary tests for meta deck buttons
[2026-09-14 17:06] Major | Antigravity | Edit | package.json - bumped version 2.76.0 -> 2.76.1
[2026-09-14 17:06] Major | Antigravity | Command | Quality gates passed: lint (0 errors), vitest (4 passed), e2e (passed), build (OK)
[2026-09-14 17:06] Major | Antigravity | Release | v2.76.1 - Fix Button Overflow in Meta Decks Hub with Responsive 2-Tier Layout
[2026-09-14 17:28] Major | Antigravity | Write | src/services/metaDeckService.ts, metaDeckService.test.ts - cloud overrides
[2026-09-14 17:28] Major | Antigravity | Write | src/components/deck/MetaDeckEditModal.tsx - remap, add, adjust, save to cloud
[2026-09-14 17:28] Major | Antigravity | Write | src/components/admin/MetaDecksAdminPanel.tsx - admin panel for meta decks
[2026-09-14 17:28] Major | Antigravity | Edit | src/components/admin/AdminPage.tsx, MetaDecksHub.tsx - admin edit integration
[2026-09-14 17:28] Major | Antigravity | Write | e2e/admin-meta-decks.spec.ts - automated E2E tests for admin remap & hub
[2026-09-14 17:28] Major | Antigravity | Edit | package.json - bumped version 2.76.1 -> 2.77.0
[2026-09-14 17:28] Major | Antigravity | Command | Quality gates passed: lint (0 errors), vitest (430 passed), e2e (passed)
[2026-09-14 17:28] Major | Antigravity | Release | v2.77.0 - Admin Meta Decks Card Remap & Cloud Sync System
[2026-09-14 17:32] Major | Antigravity | Command | git tag - pruned 31 non-milestone tags locally & remotely, kept 6 milestones
[2026-09-14 18:05] Major | Antigravity | Edit | src/components/ - dual theme, responsive touch targets & Thai priority
[2026-09-14 18:07] Major | Antigravity | Test | WebKit Safari & Mobile Safari Playwright E2E suites passed 100%
[2026-09-14 18:08] Major | Antigravity | Write | UX_UI_AUDIT_HANDOVER.md - comprehensive audit & resumption guide
[2026-09-14 18:08] Major | Antigravity | Edit | package.json - bumped version 2.77.0 -> 2.78.0
[2026-09-14 18:09] Major | Antigravity | Release | v2.78.0 - Comprehensive UX/UI Modernization, Dual Theme & WebKit Support
[2026-09-14 19:28] Major | Antigravity | Write | public/card-images/MA6/ - downloaded 199 offline card image assets
[2026-09-14 19:28] Major | Antigravity | Edit | src/utils/cardImage.ts - multi-tier fallback & card object support
[2026-09-14 19:28] Major | Antigravity | Edit | src/components/playmat-v3/ - added onError handlers across all modals
[2026-09-14 19:28] Major | Antigravity | Write | e2e/card-images-fallback.spec.ts - automated E2E image tests (passed)
[2026-09-14 19:28] Major | Antigravity | Edit | package.json - bumped version 2.78.0 -> 2.78.1
[2026-09-14 19:28] Major | Antigravity | Release | v2.78.1 - Card Image Multi-Tier Fallback & Playmat V3 Hardening
[2026-09-14 22:19] Major | Antigravity | Write | implementation_plan.md - Playmat V3 switch damage, energy pills & cursor
[2026-09-15 00:55] Major | Antigravity | Edit | src/components/playmat-v3/ - damage isolation per card instance on switch
[2026-09-15 00:55] Major | Antigravity | Edit | src/components/playmat-v3/TabletopPokemonCard.tsx - docked energy tray & 1-click
[2026-09-15 00:55] Major | Antigravity | Edit | src/components/playmat-v3/ - removed +10/-10 buttons from card surface
[2026-09-15 00:55] Major | Antigravity | Feature | src/services/realtime/ - real-time opponent live mouse cursor sync & gaming pointer
[2026-09-15 00:55] Major | Antigravity | Write | e2e/playmat-v3-turn-decision-damage-sync.spec.ts - 12/12 automated E2E tests pass
[2026-09-15 00:55] Major | Antigravity | Edit | package.json - bumped version 2.78.1 -> 2.79.0
[2026-09-15 00:55] Major | Antigravity | Command | Quality gates passed: lint (0 errors), vitest (437 passed), e2e (12 passed), build (OK)
[2026-09-15 00:55] Major | Antigravity | Release | v2.79.0 - Switch Damage Isolation, Energy Tray, Clean Card, & Live Cursor
[2026-09-15 08:00] Major | Antigravity | Edit | src/components/playmat-v3/PlaymatV3Canvas.tsx - fixed live opponent cursor mirroring & arena drift
[2026-09-15 08:00] Major | Antigravity | Edit | src/components/playmat-v3/ - stadium zone rendered on owner side & return to owner discard
[2026-09-15 08:00] Major | Antigravity | Edit | src/components/playmat-v3/TabletopPokemonCard.tsx - energy gem tray cluster & relocated ability button
[2026-09-15 08:00] Major | Antigravity | Edit | src/components/playmat-v3/PokemonActionModal.tsx - clean attack announcement & shuffle to deck
[2026-09-15 08:00] Major | Antigravity | Edit | src/components/playmat-v3/tabletopStateHelper.ts - implemented shufflePokemonToDeck & stadium owner
[2026-09-15 08:00] Major | Antigravity | Edit | e2e/playmat-v3-turn-decision-damage-sync.spec.ts - 16/16 automated E2E tests pass
[2026-09-15 08:00] Major | Antigravity | Edit | package.json - bumped version 2.79.0 -> 2.80.0
[2026-09-15 08:00] Major | Antigravity | Command | Quality gates passed: lint (0 errors), vitest (439 passed), e2e (16 passed), build (OK)
[2026-09-15 08:00] Major | Antigravity | Release | v2.80.0 - Cursor Alignment, Stadium Ownership, Energy Gem Cluster, Attack Announcement, & Shuffle to Deck
[2026-09-15 08:45] Major | Antigravity | Edit | src/components/playmat-v3/ - clean manual attacks/abilities, no auto-extract
[2026-09-15 08:45] Major | Antigravity | Edit | src/components/playmat-v3/ - opponent energy discard request with consent dialog
[2026-09-15 08:45] Major | Antigravity | Edit | src/components/playmat-v3/CenterBoardZone.tsx - single shared stadium & center trackers
[2026-09-15 08:45] Major | Antigravity | Edit | src/components/playmat-v3/ - semantic anchor zone tracking for cross-screen cursor
[2026-09-15 08:45] Major | Antigravity | Edit | src/components/playmat-v3/modals/TurnDecisionModal.tsx - fixed useRef import
[2026-09-15 08:45] Major | Antigravity | Edit | e2e/playmat-v3-turn-decision-damage-sync.spec.ts - 5/5 Playwright tests pass
[2026-09-15 08:45] Major | Antigravity | Edit | package.json - bumped version 2.80.0 -> 2.81.0
[2026-09-15 08:45] Major | Antigravity | Command | Quality gates: lint (0 errors), vitest (51 passed), e2e (5 passed), build (OK)
[2026-09-15 09:00] Major | Antigravity | Edit | src/components/playmat-v3/CenterBoardZone.tsx - centered cluster & straddling stadium
[2026-09-15 09:00] Major | Antigravity | Edit | package.json - bumped version 2.81.0 -> 2.81.1
[2026-09-15 09:00] Major | Antigravity | Command | Quality gates: lint (0 errors), vitest (51 passed), e2e (5 passed), build (OK)
[2026-09-15 09:00] Major | Antigravity | Release | v2.81.1 - Slim Active Arena & Centered Straddling Stadium Release
[2026-09-15 09:10] Major | Antigravity | Edit | src/components/playmat-v3/CenterBoardZone.tsx - stadium in center of cluster
[2026-09-15 09:10] Major | Antigravity | Edit | src/components/playmat-v3/PlaymatV3Canvas.tsx - removed ghost spacers, centered active
[2026-09-15 09:10] Major | Antigravity | Edit | src/components/playmat-v3/TabletopPokemonCard.tsx - expanded card height clamps
[2026-09-15 09:10] Major | Antigravity | Edit | package.json - bumped version 2.81.1 -> 2.81.2
[2026-09-15 09:10] Major | Antigravity | Command | Quality gates: lint (0 errors), vitest (51 passed), e2e (5 passed), build (OK)
[2026-09-15 09:10] Major | Antigravity | Release | v2.81.2 - Centered Straddling Stadium & Zero-Waste Active Arena
[2026-09-15 09:20] Major | Antigravity | Edit | src/components/playmat-v3/CenterBoardZone.tsx - hide pre-game coin toss when started, compact mobile labels
[2026-09-15 09:20] Major | Antigravity | Edit | src/components/playmat-v3/TabletopPokemonCard.tsx - responsive card sizing up to 2xl 16-inch laptop
[2026-09-15 09:20] Major | Antigravity | Edit | src/components/playmat-v3/PlaymatV3Canvas.tsx - responsive deck, discard, lost zone & prizes
[2026-09-15 09:20] Major | Antigravity | Edit | package.json - bumped version 2.81.2 -> 2.81.3
[2026-09-15 09:20] Major | Antigravity | Command | Quality gates: lint (0 errors), vitest (51 passed), e2e (5 passed), build (OK)
[2026-09-15 09:20] Major | Antigravity | Release | v2.81.3 - Hide Pre-Game Coin Toss Once Started, Compact Mobile & 16-Inch Laptop Card Scaling
[2026-09-15 10:20] Major | Antigravity | Edit | src/components/playmat-v3/ - stadium beside active, 5-col alignment, tablet touch-drag engine
[2026-09-15 10:20] Major | Antigravity | Edit | src/components/playmat-v3/CenterBoardZone.tsx - simplified minimal divider bar, clean turn trackers
[2026-09-15 10:20] Major | Antigravity | Edit | src/components/playmat-v3/PlaymatV3Canvas.tsx - mobile quick draw & +7 visible, 140ms haptic touch hold
[2026-09-15 10:20] Major | Antigravity | Edit | e2e/ - 20/20 turn-decision and 8/8 layout inspect automated E2E tests pass
[2026-09-15 10:20] Major | Antigravity | Edit | package.json - bumped version 2.81.3 -> 2.81.4
[2026-09-15 10:20] Major | Antigravity | Command | Quality gates: lint (0 errors), vitest (440 passed), e2e (28 passed), build (OK)
[2026-09-15 10:20] Major | Antigravity | Release | v2.81.4 - Stadium Beside Active Pokémon & Tablet Mode Touch-Drag Enhancement
[2026-09-15 11:00] Major | Antigravity | Edit | src/components/playmat-v3/TabletopPokemonCard.tsx - responsive vh clamps preventing bench overlap
[2026-09-15 11:00] Major | Antigravity | Edit | src/components/playmat-v3/TabletopV3Dock.tsx - mobile dock compact icons & responsive spacing
[2026-09-15 11:00] Major | Antigravity | Edit | src/components/playmat-v3/PlaymatV3Canvas.tsx - centered arena, mobile flank scaling & hand tray clamp
[2026-09-15 11:00] Major | Antigravity | Edit | e2e/layout-inspect.spec.ts - automated layout clearance assertions on desktop & mobile
[2026-09-15 11:00] Major | Antigravity | Edit | package.json - bumped version 2.81.4 -> 2.81.5
[2026-09-15 11:00] Major | Antigravity | Command | Quality gates: lint (0 errors), vitest (440 passed), e2e (24 passed), build (OK)
[2026-09-15 11:00] Major | Antigravity | Release | v2.81.5 - Fix hand cards overlapping bench & declutter mobile layout
[2026-09-15 11:04] Major | Antigravity | Command | npm run dev - started local development server at http://localhost:5173/
[2026-09-15 11:48] Major | Antigravity | Edit | src/components/playmat-v3/ - snug bench row gaps, 0px active center alignment
[2026-09-15 11:48] Major | Antigravity | Edit | e2e/layout-inspect.spec.ts - added bench snugness & alignment E2E assertions
[2026-09-15 11:48] Major | Antigravity | Edit | package.json - bumped version 2.81.5 -> 2.81.6
[2026-09-15 11:48] Major | Antigravity | Command | Quality gates: lint (0 errors), vitest (440 passed), e2e (36 passed), build (OK)
[2026-09-15 11:48] Major | Antigravity | Release | v2.81.6 - Snug Bench Cards Spacing, 0px Active Column Alignment & Multi-Res Scaling
[2026-09-15 12:08] Major | Antigravity | Edit | src/index.css - dynamic container query scaling on playmat board eliminating bottom & center voids
[2026-09-15 12:08] Major | Antigravity | Edit | e2e/layout-inspect.spec.ts - automated laptop resolution gap & clearance E2E assertions
[2026-09-15 12:08] Major | Antigravity | Edit | package.json - bumped version 2.81.6 -> 2.81.7
[2026-09-15 12:08] Major | Antigravity | Command | Quality gates: lint (0 errors), vitest (440 passed), e2e (20 passed), build (OK)
[2026-09-15 12:08] Major | Antigravity | Release | v2.81.7 - Zero Dead Space Adaptive Scaling (Eliminate Both Bottom & Center Gaps)
[2026-09-15 13:12] Major | Antigravity | Edit | src/components/playmat-v3/ - fixed Boss's Orders switch sync & card instanceId damage isolation
[2026-09-15 13:12] Major | Antigravity | Edit | e2e/playmat-v3-realtime.spec.ts - added multi-tab Boss's Orders switch & damage isolation E2E
[2026-09-15 13:12] Major | Antigravity | Edit | package.json - bumped version 2.81.7 -> 2.81.8
[2026-09-15 13:12] Major | Antigravity | Command | Quality gates: lint (0 errors), vitest (441 passed), e2e (32 passed), build (OK)
[2026-09-15 13:12] Major | Antigravity | Release | v2.81.8 - Fix opponent switch consent sync and bind damage counters strictly to card instanceId
[2026-09-15 14:02] Major | Antigravity | Edit | src/components/playmat-v3/ - fix Let's Play START_GAME consent clearance & mutual approval
[2026-09-15 14:02] Major | Antigravity | Edit | e2e/playmat-v3-realtime.spec.ts - added multi-tab Let's Play consent & popup suppression E2E
[2026-09-15 14:02] Major | Antigravity | Edit | package.json - bumped version 2.81.8 -> 2.81.9
[2026-09-15 14:02] Major | Antigravity | Command | Quality gates: lint (0 errors), vitest (442 passed), e2e (36 passed), build (OK)
[2026-09-15 14:02] Major | Antigravity | Release | v2.81.9 - Fix Let's Play consent modal loop and ensure pendingConsent clearance on game start
[2026-09-15 14:26] Major | Antigravity | Edit | src/components/playmat-v3/ - fix P2 Firestore echo loop, drag hit-testing & slot memo
[2026-09-15 14:26] Major | Antigravity | Edit | src/services/realtime/ - grace period WebRTC cleanup for stable direct P2P channel
[2026-09-15 14:26] Major | Antigravity | Edit | package.json - bumped version 2.81.9 -> 2.81.10
[2026-09-15 14:26] Major | Antigravity | Command | Quality gates: lint (0 errors), vitest (442 passed), e2e (36 passed), build (OK)
[2026-09-15 14:26] Major | Antigravity | Release | v2.81.10 - Eliminate P2 lag, Firestore echo loop, and optimize drag-and-drop
[2026-09-15 15:05] Major | Antigravity | Edit | src/components/playmat-v3/ - suppress drag trailing click & clear selection on switch
[2026-09-15 15:05] Major | Antigravity | Edit | e2e/playmat-v3-realtime.spec.ts - added switch modal pop-up suppression E2E
[2026-09-15 15:05] Major | Antigravity | Edit | package.json - bumped version 2.81.10 -> 2.81.11
[2026-09-15 15:05] Major | Antigravity | Command | Quality gates: lint (0 errors), vitest (442 passed), e2e (36 passed), build (OK)
[2026-09-15 15:05] Major | Antigravity | Release | v2.81.11 - Suppress drag trailing click & prevent Pokemon detail modal pop-up
[2026-09-15 16:54] Major | Antigravity | Merge | feature/playmat-v3-turn-decision-damage-sync into main
[2026-09-15 16:54] Major | Antigravity | Edit | package.json - bumped version 2.81.11 -> 2.82.0 for public release
[2026-09-15 16:54] Major | Antigravity | Command | Quality gates: lint (0 errors), vitest (442 passed), e2e (36 passed), build (OK)
[2026-09-15 16:54] Major | Antigravity | Release | v2.82.0 - Playmat V3 Next-Gen Realtime Multi-Tab Sync & Tabletop Sandbox public release
[2026-09-15 18:40] Minor | Antigravity | Read | Researched stadium bench expansion (Area Zero/Sky Field) in engine & playmat
[2026-09-15 20:24] Major | Antigravity | Write | docs/superpowers/specs/2026-09-15-stadium-bench-expansion-design.md
[2026-09-15 20:41] Major | Antigravity | Edit | src/components/playmat-v3/ - benchLimit 5 <-> 8 state & setBenchLimit
[2026-09-15 21:40] Major | Antigravity | Edit | src/components/playmat-v3/ - dynamic bench slots in HandCardMenu & PokemonAction modals
[2026-09-15 22:10] Minor | Claude | Verify | Adversarial verification of bench findIndex vs benchLimit claim in tabletopStateHelper.ts (moveCardBetweenZones/moveMultipleCardsBetweenZones)
[2026-09-15 22:11] Minor | Claude | Read | Verified createRoom player2 placeholder benchLimit claim in tabletopSyncService.ts (read-only audit)
[2026-09-15 22:29] Major | Antigravity | Edit | src/components/playmat-v3/ - bench toggle buttons & dynamic 5/8 layout sync
[2026-09-16 00:41] Major | Antigravity | Fix | src/components/playmat-v3/ - touch tap drag cancel fix & pointer capture release
[2026-09-16 00:41] Major | Antigravity | Write | e2e/playmat-bench-expansion.spec.ts - 12/12 automated E2E tests pass
[2026-09-16 00:41] Major | Antigravity | Command | Quality gates: lint (0 errors), vitest (454 passed), e2e (12 passed), build (OK)
[2026-09-16 00:44] Major | Antigravity | Edit | package.json - bumped version 2.82.0 -> 2.83.0
[2026-09-16 00:44] Major | Antigravity | Release | v2.83.0 - Stadium Bench Expansion (5 <-> 8 Slots) & Area Zero Underdepths
[2026-09-16 14:29] Major | Claude | Write | Added 5 project skills in .claude/skills/ (data-safety-sync, integration-contract, env-preflight, deliverable-verification, evidence-handoff-review) to close friction patterns from usage insights
[2026-09-16 15:10] Major | Antigravity | Fix | src/ - auto-fetch playmat allowlist on App & gate mount + dual Email/UID match
[2026-09-16 15:10] Major | Antigravity | Edit | src/components/playmat-v3/modals/PlaymatAccessGate.tsx - auto-fetch & re-sync
[2026-09-16 15:10] Major | Antigravity | Write | e2e/playmat-access-verification.spec.ts - 12/12 access gate E2E tests pass
[2026-09-16 15:10] Major | Antigravity | Edit | package.json - bumped version 2.83.0 -> 2.83.1
[2026-09-16 15:10] Major | Antigravity | Command | Quality gates: lint (0 errors), vitest (11 passed), e2e (12 passed), build (OK)
[2026-09-16 15:10] Major | Antigravity | Release | v2.83.1 - Fix Playmat Closed Beta auto-fetch & dual Email/UID verification
[2026-09-16 17:07] Minor | Antigravity | Read | Investigated deck edit revert bug in deckStore & useCloudForegroundSync
[2026-09-16 18:01] Major | Antigravity | Write | src/store/deckStore.syncReconcile.test.ts - TDD suite for deck sync & reconcile
[2026-09-16 18:01] Major | Antigravity | Fix | src/store/deckStore.ts - whole-doc writes, sanitize undefined & smart reconcile
[2026-09-17 01:35] Major | Antigravity | Edit | package.json - bumped version 2.83.1 -> 2.83.2
[2026-09-17 01:35] Major | Antigravity | Command | Quality gates: lint (0 errors), vitest (25 passed), e2e (56 passed), build (OK)
[2026-09-17 01:35] Major | Antigravity | Release | v2.83.2 - Fix deck edit reversion on sync, whole-doc writes & smart reconcile
[2026-09-17 07:23] Major | Antigravity | Write | public/card-images/MA6/ - added WebP images for 148, 157, 158, 161, 182, 183
[2026-09-17 07:25] Major | Antigravity | Edit | src/data/pokemonNames.json - completed MA6 cards 148, 157, 158, 161, split 182/183
[2026-09-17 07:25] Major | Antigravity | Edit | scripts/scrape-ma6.mjs - preserved supplemental cards & 182 split
[2026-09-17 07:26] Major | Antigravity | Edit | src/components/collection/ - sort by collectorNumber integer sequence
[2026-09-17 07:26] Major | Antigravity | Write | src/data/ma6Completeness.test.ts - unit tests for MA6 completeness & order
[2026-09-17 07:27] Major | Antigravity | Edit | e2e/collection-tracker.spec.ts - added MA6 card search & display E2E test
[2026-09-17 07:29] Major | Antigravity | Command | npm run dev - started dev server at http://localhost:5173
[2026-09-17 07:33] Major | Antigravity | Edit | package.json - bumped version 2.83.2 -> 2.83.3
[2026-09-17 07:33] Major | Antigravity | Command | Quality gates: lint (0 errors), vitest (466 passed), e2e (40 passed), build (OK)
[2026-09-17 07:33] Major | Antigravity | Release | v2.83.3 - Complete MA6 30th Celebration dataset (148, 157, 158, 161, 182/183) & sort
[2026-09-17 09:30] Major | Antigravity | Write | public/card-images-hd/MA6/ - generated 205 HD JPG images for modal
[2026-09-17 09:30] Major | Antigravity | Edit | src/data/pokemonNames.json - updated officialImageUrl to high-res illustrations
[2026-09-17 09:30] Major | Antigravity | Write | scripts/sync-ma6-to-r2.mjs - synced 410 WebP & HD JPG images to Cloudflare R2
[2026-09-17 09:33] Major | Antigravity | Edit | package.json - bumped version 2.83.3 -> 2.83.4
[2026-09-17 09:33] Major | Antigravity | Command | Quality gates: lint (0 errors), vitest (466 passed), e2e (40 passed), build (OK)
[2026-09-17 09:33] Major | Antigravity | Release | v2.83.4 - Fix MA6 card illustrations HD resolution and sync to R2 bucket
[2026-09-17 10:27] Major | Antigravity | Command | git checkout -b feature/playmat-new-engine (isolated Playmat branch)
[2026-09-17 11:03] Major | Antigravity | Write | src/components/playmat-pixi/ - PixiJS v8 2D WebGL tabletop engine
[2026-09-17 11:03] Major | Antigravity | Write | src/components/playmat-pixi/playmatPixi.test.ts - 5 unit tests
[2026-09-17 11:03] Major | Antigravity | Write | e2e/playmat-pixi-engine.spec.ts - 4/4 multi-browser Playwright E2E tests
[2026-09-17 11:03] Major | Antigravity | Command | Quality gates: lint (0 errors), vitest (471 passed), e2e (4 passed), build (OK)
[2026-09-17 11:26] Major | Antigravity | Fix | src/components/playmat-pixi/engine/PixiCoinFlipper.ts - unmount safety
[2026-09-17 11:50] Major | Antigravity | Feature | src/components/playmat-pixi/ - 100% V3 gameplay parity & full dock/modals
[2026-09-17 11:50] Major | Antigravity | Command | Quality gates: lint (0 errors), vitest (471 passed), e2e (16 passed), build (OK)
[2026-09-17 12:10] Major | Antigravity | Feature | Playmat PixiJS 100% V3 flow parity & WebKit multiplayer E2E passed
[2026-09-17 12:35] Major | Antigravity | Feature | PixiJS v8 particle system, elemental auras, spotlight & combat VFX
[2026-09-17 13:25] Major | Antigravity | Plan | docs/superpowers/specs/2026-09-17-pixijs-full-animation-suite-design.md
[2026-09-17 13:40] Major | Antigravity | Feature | Fast card motion VFX, turn banner, & HandToDiscardModal
[2026-09-17 14:05] Major | Antigravity | Feature | 3D Field Arena, fluid card motions, & unified non-overlapping turn banner
[2026-09-17 14:05] Major | Antigravity | Command | Quality gates: lint (0 errors), vitest (477 passed), e2e (11 passed), build (OK)
[2026-09-17 14:29] Major | Antigravity | Feature | Side-flank bench 5/8 toggle button & Sword & Shield Galar pitch
[2026-09-17 14:29] Major | Antigravity | Command | Quality gates: lint (0 errors), vitest (477 passed), e2e (9 passed), build (OK)
[2026-09-17 14:38] Major | Antigravity | Feature | AAA futuristic Pokemon Championship arena graphics & battle dais
[2026-09-17 14:38] Major | Antigravity | Command | Quality gates: lint (0 errors), vitest (477 passed), e2e (9 passed), build (OK)
[2026-09-17 14:56] Major | Antigravity | Fix | Fix playmat field flickering on action by stabilizing Pixi app lifecycle
[2026-09-17 14:56] Major | Antigravity | Command | Quality gates: lint (0 errors), vitest (477 passed), e2e (9 passed), build (OK)
[2026-09-17 16:36] Major | Antigravity | Feature | Realistic Championship Stadium graphics & 1:1 #center-board-zone alignment
[2026-09-17 16:37] Major | Antigravity | Command | Quality gates: lint (0 errors), vitest (477 passed), e2e (9 passed), build (OK)
[2026-09-17 16:41] Major | Antigravity | Write | docs/superpowers/specs/2026-09-17-realistic-3d-swaying-grass-stadium-design.md
[2026-09-17 16:47] Major | Antigravity | Feature | Realistic 3D swaying grass blades, wind shimmer & motes (Mac 60fps)
[2026-09-17 16:47] Major | Antigravity | Command | Quality gates: lint (0 errors), vitest (477 passed), e2e (9 passed), build (OK)
[2026-09-17 16:55] Major | Antigravity | Feature | 3D Scarlet & Violet stadium render background & remove stick grass
[2026-09-17 16:56] Major | Antigravity | Command | Quality gates: lint (0 errors), vitest (477 passed), e2e (9 passed), build (OK)
[2026-09-17 17:05] Major | Antigravity | Feature | Dual slow criss-crossing spotlights, tournament banner & card placement VFX
[2026-09-17 17:05] Major | Antigravity | Command | Quality gates: lint (0 errors), vitest (477 passed), e2e (9 passed), build (OK)
[2026-09-17 17:23] Major | Antigravity | Fix | Fix arena scene shifting on lethal knockout by eliminating rootContainer shake
[2026-09-17 17:23] Major | Antigravity | Command | Quality gates: lint (0 errors), vitest (478 passed), e2e (7 passed), build (OK)
[2026-09-18 00:54] Major | Antigravity | Feature | Balatro-style card animation suite (3D tilt, slam, badges, polychrome)
[2026-09-18 01:28] Major | Antigravity | Feature | Bench slot picker modal, Balatro mobile UI & 3D card flight animations
[2026-09-18 01:28] Major | Antigravity | Command | Quality gates: lint (0 errors), vitest (489 passed), e2e (11 passed), build (OK)
[2026-09-18 01:50] Major | Antigravity | Feature | Mobile portrait layout & Balatro tap-to-play card interaction
[2026-09-18 01:50] Major | Antigravity | Command | Quality gates: lint (0 errors), vitest (76 passed), e2e (6 passed), build (OK)
[2026-09-18 01:50] Major | Antigravity | Release | v2.86.0 - mobile portrait layout & Balatro tap-to-play card interaction
[2026-09-18 02:12] Major | Antigravity | Feature | Unify PixiJS v8 engine, 0-rerender cursor & fix join stutter
[2026-09-18 02:12] Major | Antigravity | Command | Quality gates: lint (0 errors), vitest (88 passed), e2e (13 passed), build (OK)
[2026-09-18 02:12] Major | Antigravity | Release | v2.87.0 - eliminate legacy DOM mode & fix online join stutter
[2026-09-18 02:24] Major | Antigravity | Feature | AAA targeted fan slot card draw & 3D casino riffle deck shuffle
[2026-09-18 02:24] Major | Antigravity | Command | Quality gates: lint (0 errors), vitest (89 passed), e2e (13 passed), build (OK)
[2026-09-18 02:24] Major | Antigravity | Release | v2.88.0 - AAA targeted card draw & 3D riffle deck shuffle
[2026-09-18 02:35] Major | Antigravity | Feature | PTCG Pocket in-slot slide-up 3D flip card draw & deck peel (no flying cards)
[2026-09-18 02:35] Major | Antigravity | Command | Quality gates: lint (0 errors), vitest (89 passed), e2e (7 passed), build (OK)
[2026-09-18 02:35] Major | Antigravity | Release | v2.89.0 - PTCG Pocket tactile in-slot card draw & deck peel
[2026-09-18 10:45] Major | Antigravity | Feature | Transform horizontal active dais into vertical 63:88 elemental aura dais
[2026-09-18 10:45] Major | Antigravity | Command | Quality gates: lint (0 errors), vitest (89 passed), e2e (7 passed), build (OK)
[2026-09-18 10:45] Major | Antigravity | Release | v2.90.0 - vertical 63:88 elemental aura dais behind active Pokemon
[2026-09-18 18:08] Major | Antigravity | Release | Merge feature/playmat-new-engine into main (v2.90.0)
[2026-09-19 00:40] Major | Antigravity | Feature | Dedicated Mobile Arena mode & cross-platform multiplayer sync
[2026-09-19 00:40] Major | Antigravity | Command | Quality gates: lint (0 err), vitest (490 pass), e2e (32 pass), build (OK)
[2026-09-19 00:40] Major | Antigravity | Release | v2.91.0 - dedicated Mobile Arena mode & cross-platform multiplayer
[2026-09-19 01:00] Major | Antigravity | Feature | Pokémon TCG Live mobile portrait UI layout replicated for mobile arena
[2026-09-19 01:00] Major | Antigravity | Command | Quality gates: lint (0 err), vitest (490 pass), e2e (32 pass), build (OK)
[2026-09-19 01:00] Major | Antigravity | Release | v2.92.0 - Pokémon TCG Live mobile portrait UI layout
[2026-09-19 09:46] Major | Antigravity | Feature | Portrait Tabletop Mobile Layout with full touch gestures
[2026-09-19 09:46] Major | Antigravity | Command | Quality gates: lint (0 err), vitest (490 pass), e2e (13 pass), build (OK)
[2026-09-19 09:46] Major | Antigravity | Release | v2.93.0 - portrait tabletop mobile layout with full touch gestures
[2026-09-19 10:07] Major | Antigravity | Feature | Android gesture safety, dynamic hand card fanning & header declutter
[2026-09-19 10:07] Major | Antigravity | Release | v2.94.0 - android gesture safety, hand fanning & header declutter
[2026-09-19 10:35] Major | Antigravity | Feature | Mobile sub-modals touch-scroll overhaul & small screen viewport fixes
[2026-09-19 10:35] Major | Antigravity | Command | Quality gates: lint (0 err), vitest (490 pass), e2e (15 pass), build (OK)
[2026-09-19 10:35] Major | Antigravity | Release | v2.95.0 - mobile sub-modals layout & touch-scroll overhaul
[2026-09-19 11:51] Major | Antigravity | Feature | Mobile viewport rigid 100dvh fit & pre-game facedown placement
[2026-09-19 11:51] Major | Antigravity | Command | Quality gates: lint (0 err), vitest (490 pass), e2e (17 pass), build (OK)
[2026-09-19 11:51] Major | Antigravity | Release | v2.96.0 - mobile viewport rigid 100dvh fit & pre-game facedown placement
[2026-09-19 12:08] Major | Antigravity | Feature | Mobile Trainer card drop zone, 1-tap quick play bar & in-play spotlight
[2026-09-19 12:08] Major | Antigravity | Command | Quality gates: lint (0 err), vitest (490 pass), e2e (19 pass), build (OK)
[2026-09-19 12:08] Major | Antigravity | Release | v2.97.0 - mobile trainer card drop zone, quick-play bar & in-play spotlight
[2026-09-19 12:22] Major | Antigravity | Feature | Mobile Mulligan pre-game action button & verification modal integration
[2026-09-19 12:22] Major | Antigravity | Command | Quality gates: lint (0 err), vitest (490 pass), e2e (84 pass), build (OK)
[2026-09-19 12:22] Major | Antigravity | Release | v2.98.0 - mobile mulligan pre-game button & modal integration
[2026-09-19 13:12] Major | Antigravity | Feature | PC mode drag-only placement, remove click-to-place modals, fix hand zoom button
[2026-09-19 13:12] Major | Antigravity | Command | Quality gates: lint (0 err), vitest (490 pass), e2e (31 pass), build (OK)
[2026-09-19 13:12] Major | Antigravity | Release | v2.99.0 - pc mode drag-only placement & hand card zoom button fix
[2026-09-19 13:41] Major | Antigravity | Command | Quality gates on main: lint (0 err), vitest (490 pass), e2e (5 pass), build (OK)
[2026-09-19 13:41] Major | Antigravity | Release | v2.99.0 - deploy to production main
[2026-09-20 02:07] Major | Antigravity | Command | Quality gates: lint (0 err), vitest (490 pass), e2e (5 pass), build (OK)
[2026-09-20 02:07] Major | Antigravity | Release | v3.0.0 - Next-Gen Playmat Engine & Dual Arena Release
[2026-09-20 02:11] Major | Antigravity | Command | git checkout -b feature/virtual-3d-binder - start Virtual 3D Binder feature
[2026-09-20 02:17] Major | Antigravity | Write | docs/superpowers/specs/2026-09-20-virtual-3d-binder-design.md - design spec
[2026-09-20 02:20] Major | Antigravity | Feature | Task 1: binder types, customBinderStore & auto-set computation
[2026-09-20 02:21] Major | Antigravity | Feature | Task 2: BinderPocketSlot with 3D tilt, sleeves & ghost silhouettes
[2026-09-20 02:22] Major | Antigravity | Feature | Task 3: BinderPageSheet & BinderBookSpread 3D book layout with rings
[2026-09-20 02:23] Major | Antigravity | Feature | Task 4: BinderSettingsModal & BinderCardPickerDrawer customization
[2026-09-20 02:26] Major | Antigravity | Feature | Task 5: Virtual3DBinderView & CollectionTracker view toggle
[2026-09-20 02:28] Major | Antigravity | Feature | Task 6: Playwright E2E tests & quality gates for Virtual 3D Binder
[2026-09-20 08:14] Major | Antigravity | Feature | 3D realistic page flip animation with double-sided leaf & curvature shadow
[2026-09-20 08:30] Major | Antigravity | Feature | Multi-select rarity & set filters for Custom Binder drawer & Collection
[2026-09-20 08:44] Major | Antigravity | Feature | Batch insert cards & drag/tap repositioning for custom binder
[2026-09-21 10:36] Major | Antigravity | Release | v3.1.0 - Virtual 3D Binder, Multi-Select Filters & Batch Repositioning
[2026-09-21 11:05] Major | Antigravity | Fix | Card image retries, stall recovery & reactive instant community stats
[2026-09-21 11:22] Major | Antigravity | Release | v3.2.0 - Card Image Retries, Stall Recovery & Instant Community Stats
[2026-09-21 14:04] Major | Antigravity | Fix | Virtual binder row/column layout reflow & reactive auto-set page 1
[2026-09-22 12:16] Major | Antigravity | Fix | Online room invisibility, partitioned sync & restored ultra-fast DOM default
[2026-09-22 12:17] Major | Antigravity | Command | Quality gates: lint (0 err), vitest (544 pass), e2e (16 pass), build (OK)
[2026-09-22 12:18] Major | Antigravity | Release | v3.3.0 - Online Room Sync, Smooth DOM Performance & Anti-Lag Optimization
[2026-09-22 16:41] Major | Antigravity | Fix | Online room reconnect state persistence, session role isolation & heartbeat
[2026-09-22 16:41] Major | Antigravity | Fix | Brave browser WebRTC timeout failover & continuous sync without state drop
[2026-09-22 16:41] Major | Antigravity | Feature | Drag-only card placement, removed click-to-place & updated drop hints
[2026-09-22 16:41] Major | Antigravity | Feature | Quick attack damage adjust buttons (+/- 10, 50, 100) in modal and combat banner
[2026-09-22 16:42] Major | Antigravity | Command | Quality gates: lint (0 err), vitest (544 pass), e2e (5 pass), build (OK)
[2026-09-22 16:42] Major | Antigravity | Release | v3.3.1 - Room reconnect, heartbeat keepalive, drag placement & damage deltas
[2026-10-04 11:44] Major | Antigravity | Edit | .gitignore - ignored cost/ billing directory
[2026-10-04 12:02] Major | Antigravity | Edit | src/components/playmat-v3/tabletopSyncService.ts - disable cloud sync
[2026-10-04 12:02] Major | Antigravity | Edit | src/services/playmatSyncService.ts - disable playmat cloud sync
[2026-10-04 12:02] Major | Antigravity | Edit | src/services/realtime/webRtcDataChannelService.ts - guard signaling
[2026-10-04 12:02] Major | Antigravity | Edit | src/components/playmat-v3/OnlineRoomModal.tsx - add cloud sync notice
[2026-10-04 12:02] Major | Antigravity | Edit | src/components/playmat-v3/PlaymatV3Canvas.tsx - update local 2-tab label
[2026-10-04 12:02] Major | Antigravity | Edit | package.json - bump version to 3.3.2
[2026-10-04 12:02] Major | Antigravity | Command | Quality gates: lint (0 err), vitest (22 pass), build (OK), E2E (pass)
[2026-10-04 12:03] Major | Antigravity | Release | v3.3.2 - Disable Playmat Cloud Online Room Sync to eliminate Firestore billing
[2026-10-09 15:03] Major | Antigravity | Edit | src/utils/rarity.ts & pokemonNames.json - added ACE_SPEC rarity classification
[2026-10-09 15:15] Major | Antigravity | Command | Quality gates: lint (0 err), vitest (551 pass), e2e (44 pass), build (OK)
[2026-10-09 15:15] Major | Antigravity | Release | v3.4.0 - ACE SPEC dedicated filter, visual badges & deck rule limits
[2026-10-26 18:48] Major | Antigravity | Write | wrangler.jsonc - configured Workers Static Assets SPA for Cloudflare CI
[2026-10-26 18:50] Major | Antigravity | Command | Quality gates: lint (0 err), vitest (551 pass), build (OK)
[2026-10-26 18:50] Major | Antigravity | Release | v3.4.1 - Cloudflare Workers Static Assets & SPA routing support
[2026-10-30 14:53] Major | Antigravity | Edit | src/ - removed Playmat simulator menus and blocked direct URL/state access
[2026-10-30 14:56] Major | Antigravity | Command | Quality gates: lint (0 err), vitest (551 pass), e2e (17 pass), build (OK)
[2026-10-30 14:56] Major | Antigravity | Release | v3.4.2 - Disable Playmat simulator menu and direct route access
[2026-10-30 15:20] Major | Antigravity | Edit | src/ - removed Battle Tracker (นับแต้มแข่ง) menus and blocked /battle access
[2026-10-30 15:21] Major | Antigravity | Command | Quality gates: lint (0 err), build (OK), e2e (13 pass)
[2026-10-30 15:21] Major | Antigravity | Release | v3.4.3 - Disable Battle Tracker menu and direct route access


[2026-11-06 14:35] Major | Antigravity | Write | Imported PokéCount Tracker codebase, data catalog, assets, and tests
[2026-11-06 14:35] Major | Antigravity | Write | review/USER-REQUIREMENTS-REVIEW-PLAY.md & review/5.1..5.6.md drama
[2026-11-06 14:35] Major | Antigravity | Command | Build & Deploy to Cloudflare Workers custom domain pokef.tcgcount.com
[2026-11-06 14:35] Major | Antigravity | Command | Quality gates: tsc build (OK), vitest (551/551 pass), Cloudflare HTTP 200
[] Major | Antigravity | Write | .claude/skills/reactive-pwa-guidance/SKILL.md
[2026-11-06 15:05] Major | Antigravity | Write | .claude/skills/reactive-pwa-guidance/SKILL.md
[2026-11-06 15:06] Major | Antigravity | Write | .claude/skills/pwa-offline-state-management/SKILL.md
[2026-11-06 15:06] Major | Antigravity | Write | .claude/skills/playwright-e2e-quality-gates/SKILL.md
[2026-11-06 15:06] Major | Antigravity | Write | .claude/skills/multi-agent-atomic-release/SKILL.md
[2026-11-06 15:19] Major | Antigravity | Edit | Update README.md live URL to pokef.tcgcount.com

[2026-11-06 15:27] Major | Antigravity | Edit | README.md - Comprehensive documentation update in Thai

[2026-11-06 15:36] Major | Antigravity | Edit | README.md - Added prominent web link & Lorcana shared-skills case study

[2026-11-06 16:00] Major | Antigravity | Edit | Compressed interview video from 355MB to 3.2MB for GitHub compatibility

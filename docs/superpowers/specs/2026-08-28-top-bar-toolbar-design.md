# Top Bar & Toolbar Redesign

**Date:** 2026-08-28
**Branch:** `fix/top-bar-toolbar-polish`

## Problem

The top bar has accumulated controls without anyone stepping back to look at the whole. It now carries eight independent things — cloud sync, backup, PWA install, OTA update check, theme, profile switcher, user account and three stat badges — with no hierarchy between them, and each was styled in isolation.

Concretely, in `src/components/collection/CollectionHeader.tsx` (479 lines):

1. **Sync is duplicated.** A `☁️ Cloud` pill next to the title and a `🔄 Sync Cloud` button in the toolbar both call `handleForceSync`.
2. **Rare actions look as important as frequent ones.** Backup, Install App and Check for Update are occasional, yet each is a full labelled button sitting permanently in the bar.
3. **No shared control shape.** `w-8 h-8` icon squares mix with `px-3 py-1.5` text pills; radii mix `rounded-lg` and `rounded-xl`.
4. **Every control brings its own colour.** Emerald sync, amber OTA, purple install, slate backup, plus blue/amber/red stat badges — six competing hues in one strip.
5. **Names get cut off.** The profile pill truncates at 110–130px and the user name at 110px, producing labels like `My Mai…`.
6. **The toolbar is implemented twice.** `src/components/deck/DeckHeader.tsx` re-declares OTA, theme, install and the user menu, so any fix has to be made in two places.

## Goals

- One *action* control in the bar: the account button. Navigation tabs stay, since they are wayfinding rather than tools.
- Every moved action stays reachable, and no more than one click further away than it is today.
- A single control size, radius and surface treatment, with one accent colour.
- One implementation shared by the Collection and Deck pages.
- No horizontal overflow at 360px.

## Non-goals

- No change to what any action *does*. Sync, backup, install, OTA and theme keep their current behaviour and their existing hooks.
- No redesign of the filter bar, card grid, or anything below the context strip.
- No new settings or preferences.

## A note on the theme system

`CLAUDE.md` describes a "Pokémon TCG theme system (Electric, Fire, Water, Grass, Psychic, Darkness, Metal, Dragon, Colorless)". No such engine exists in the code: `src/store/themeStore.ts` supports `light | dark | system` only, and `src/index.css` defines no accent custom properties.

This design therefore introduces its own accent tokens rather than consuming an energy-type theme. Building the energy-type engine is out of scope; `CLAUDE.md` should be corrected separately so it stops describing behaviour the app does not have.

## Architecture

Two new components under `src/components/layout/`, both presentational shells over the hooks and stores that already exist:

### `AppHeaderBar.tsx`

The bar itself. Renders, left to right:

- **Brand** — logo, `PokéCollection` wordmark, and the tagline on `sm` and wider.
- **Nav tabs** — Collection / Deck / Battle, desktop only (mobile keeps `BottomNav`).
- **Account button** — avatar and name when signed in, a Sign in button otherwise. This is the bar's only action control.

Props: `activeMode: GameMode`, plus an optional `contextSlot: ReactNode` rendered in the strip below (see below). It owns no business state; sync, theme, install and OTA state come from their existing hooks inside `AccountMenu`.

### `AccountMenu.tsx`

The popover behind the account button, and the single home for everything moved out of the bar. Sections, top to bottom:

1. **Identity** — display name, email, and cloud status with the last-synced time.
2. **Cloud sync** — the force-sync action, showing `Syncing…` while in flight and the existing feedback string afterwards. Signed-out users see a Sign in row here instead.
3. **Data** — Backup & restore, opening the existing `CollectionBackupModal`.
4. **App** — Check for update (with the current version), and Install app rendered only when `usePWAInstall().canInstall` is true, matching today's behaviour.
5. **Appearance** — a three-way segmented control for `light | dark | system`, replacing the `ThemeToggle` dropdown.
6. **Sign out.**

Signed out, the menu shows only Appearance, App and a Sign in row — the sections that need an account are omitted rather than disabled.

### Attention dot

The account button shows a small dot when something needs attention:

- `useOTAUpdate().needRefresh` — a new version is waiting.
- `syncStatus === 'error'` — the last cloud sync failed.

The dot is the only adaptive element in the bar. Everything else is always present, so the bar never changes shape as state moves.

### Context strip

A slim row rendered directly beneath the bar and above the page's filter bar, holding what is relevant to the current page:

- **Collection** — the profile switcher pill, then the stats.
- **Deck** — the existing `เด็คทั้งหมด` / `นำเข้า / ส่งออกเด็ค` actions, which live in `DeckHeader`'s own toolbar today.

`AppHeaderBar` renders `contextSlot` inside this strip and knows nothing about what goes in it.

### Stats

The three separate coloured chips become one pill with hairline dividers:

```
🎴 1,240 แบบ │ ✨ 3,180 ใบ │ ⭐ 42
```

The wishlist segment keeps its existing behaviour of appearing only when `wishlistCount > 0`.

## Visual system

Added to `src/index.css` as custom properties, defined once for light and once under `.dark`:

| Token | Role |
| --- | --- |
| `--surface` | Default control background |
| `--surface-hover` | Hover state |
| `--border` | Control border |
| `--accent` | Active tab, primary action, attention dot |
| `--accent-fg` | Foreground on accent |

Rules the header follows:

- **One size.** Controls are 36px tall on desktop, 32px on mobile.
- **One radius.** `rounded-xl` throughout.
- **One accent.** Only the active nav tab, the attention dot and the primary action in a menu use `--accent`. Every other control sits on `--surface`.
- **Semantic colour is reserved for state.** Rose for a sync error, amber for in-flight. Never for identity.
- **No truncation under 160px.** The profile and account labels get `max-w-[160px]`, and the account label is hidden below `sm` where the avatar alone is enough.

## Responsive behaviour

| Width | Bar |
| --- | --- |
| `< 640px` | Brand mark, account avatar. Context strip wraps to its own line. |
| `640–767px` | Brand with tagline, account avatar. |
| `≥ 768px` | Brand, nav tabs, account button with name. |

The mobile action group drops from five controls (OTA, theme, install, backup, account) to one, and the profile switcher and stats move to their own line. That is what resolves the crowding at 360–430px.

## Files

| File | Change |
| --- | --- |
| `src/components/layout/AppHeaderBar.tsx` | New |
| `src/components/layout/AccountMenu.tsx` | New |
| `src/components/layout/HeaderStats.tsx` | New — the grouped stats pill |
| `src/components/collection/CollectionHeader.tsx` | Reduced to composing `AppHeaderBar` with a Collection context slot |
| `src/components/deck/DeckHeader.tsx` | Same, with a Deck context slot; duplicated toolbar removed |
| `src/components/common/ThemeToggle.tsx` | Gains a `segmented` variant for use inside the menu |
| `src/index.css` | Accent and surface tokens |
| `e2e/top-bar.spec.ts` | New |

`OTAUpdateButton` and `PWAInstallButton` keep their current variants; the menu uses the hooks (`useOTAUpdate`, `usePWAInstall`) directly so menu rows can be styled as rows rather than as buttons-inside-buttons.

## Testing

`e2e/top-bar.spec.ts`, run against both the chromium and mobile projects:

1. The bar contains the account control and no Backup, Install, Update or Sync button.
2. Opening the account menu reveals Cloud sync, Backup, Check for update and Appearance.
3. Choosing Dark in the menu sets `data-theme="dark"` on the root element.
4. The Collection context strip shows the profile switcher and the stats pill.
5. Switching to the Deck page shows the deck actions in the same strip.
6. At 360px, `document.documentElement.scrollWidth` does not exceed the viewport width.

Existing suites must keep passing. `e2e/navigation-and-theme.spec.ts` drives the theme control and will need updating to reach it through the account menu.

## Risks

- **Sync moves from one click to two.** Accepted deliberately: the brief prioritised a clean bar, and the attention dot still surfaces a failed sync without opening the menu.
- **Two headers change at once.** `CollectionHeader` and `DeckHeader` are both rewritten to compose the shared bar. The E2E suite covers both pages, and every existing test must stay green.

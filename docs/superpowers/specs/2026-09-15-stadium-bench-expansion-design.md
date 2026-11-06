# Design Spec: Dynamic Bench Capacity Expansion (5 ↔ 8 Slots)

**Date**: 2026-09-15  
**Topic**: Stadium Bench Expansion (Area Zero Underdepths / Sky Field)  
**Status**: Approved

---

## 1. Background & Problem Statement
In the Pokémon Trading Card Game, the standard bench limit is 5 Pokémon. However, certain Stadium cards expand the bench capacity to up to 8 Pokémon:
- **Area Zero Underdepths (โพรงถ้ำใหญ่ซีโร่)**: Allows each player who has any Tera Pokémon in play to have up to 8 Pokémon on their Bench.
- **Sky Field (สกายฟิลด์)**: Allows each player to have up to 8 Pokémon on their Bench.

Currently in PokeCountTracker's Playmat V3 Sandbox, bench arrays and canvas rendering hardcode 5 spots (`[0, 1, 2, 3, 4]`). When players play Stadiums such as Area Zero Underdepths, they cannot place 6th, 7th, or 8th Pokémon on the bench.

## 2. Requirements & Constraints
1. **Manual Per-Player Control**:
   - Provide a quick toggle button on the board for each player side (`player1` and `player2`) to toggle between 5 and 8 bench slots.
   - Allows asymmetric bench capacities (e.g. Player 1 with Tera has 8 slots, Player 2 without Tera has 5 slots, strictly matching official TCG rules).
2. **Safety Against Data Loss (Overflow Prevention)**:
   - When switching from 8 slots back to 5 slots, if any Pokémon exists in slots 6, 7, or 8 (indices 5, 6, 7), the reduction is **blocked**.
   - The user receives an action toast in Thai: `"⚠️ กรุณานำโปเกมอนในเบนช์ช่องที่ 6–8 ออกก่อนลดเหลือ 5 ช่อง"`
3. **UI Bible Integrity**:
   - Must preserve the established responsive layout guidelines:
     - 0px offset centerline alignment for the Active Pokémon.
     - Left flank (Stadium slot / Discard pile) and Right flank (Prizes / Deck pile) positions remain undisturbed.
     - Responsive gap scaling: when 8 slots are active, tighten slot gaps (`gap-0.5 sm:gap-1 md:gap-1.5`) and enable responsive container query constraints.
4. **Modal Integration**:
   - `HandCardMenuModal`: Place on Bench buttons adapt dynamically to show available slots (1–5 or 1–8).
   - `PokemonActionModal`: Retreat / Switch with Bench targets list all active bench slots.
5. **Realtime Multi-Tab Sync**:
   - Synchronize `benchLimit` across players in online/multiplayer rooms via Firestore/WebRTC.
6. **Automated Quality Gates**:
   - Vitest unit tests for state actions, validation, and overflow guard.
   - Playwright E2E tests verifying visual rendering and button interactions.

---

## 3. Data Model & Architecture

### 3.1 Types (`src/components/playmat-v3/types.ts`)
```typescript
export interface TabletopPlayerSideState {
  // ... existing fields ...
  benchLimit: 5 | 8; // Bench capacity (default: 5)
  bench: (TabletopPokemonSlot | null)[]; // Up to 8 elements [0..7]
}
```

### 3.2 State Initializer (`tabletopStateHelper.ts`)
- Initialize `bench` with 8 elements: `[null, null, null, null, null, null, null, null]`.
- Initialize `benchLimit: 5`.

### 3.3 State Actions (`tabletopStateHelper.ts`)
- **`setBenchLimit(state, side, limit: 5 | 8)`**:
  - If `limit === 5`:
    - Check indices 5, 6, 7 in `player.bench`.
    - If occupied, add toast and return unchanged state.
    - If empty, set `player.benchLimit = 5` and record in history log: `"${player.name} ปรับขนาดเบนช์เป็น 5 ช่อง"`.
  - If `limit === 8`:
    - Ensure `player.bench` has length 8.
    - Set `player.benchLimit = 8` and record in history log: `"${player.name} ขยายขนาดเบนช์เป็น 8 ช่อง"`.
- **Bounds Checking in Existing Actions**:
  - `placeFromHand(state, side, cardId, target, facedown)`:
    - Upper bound: `Math.min((player.benchLimit || 5) - 1, Math.max(0, target))`.
  - `switchActiveWithBench(state, side, benchIndex)`:
    - Upper bound: `benchIndex >= 0 && benchIndex < (player.benchLimit || 5)`.
  - `swapBenchSlots(state, side, source, dest)`:
    - Bounds check against `player.benchLimit || 5`.

---

## 4. UI & Layout Design (UI Bible Preservation)

### 4.1 PlaymatV3Canvas Layout
- **Bench Container**:
  - Render dynamically: `(player.benchLimit === 8 ? [0, 1, 2, 3, 4, 5, 6, 7] : [0, 1, 2, 3, 4])`.
  - Dynamically select gap class:
    - 5 slots: `gap-1 sm:gap-1.5 md:gap-2`
    - 8 slots: `gap-0.5 sm:gap-1 md:gap-1.5`
  - Ensure centered alignment on 50% vertical axis.
- **Bench Toggle Button**:
  - Positioned beside each player's bench row (or beside the bench header).
  - Compact glassmorphic pill badge:
    ```tsx
    <button
      id={`${side}-bench-limit-toggle`}
      onClick={() => handleToggleBenchLimit(side)}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-slate-900/80 backdrop-blur-sm border border-white/10 hover:border-indigo-500/40 text-slate-300 active:scale-95 transition-all"
    >
      <span>👥</span>
      <span>เบนช์ {player.benchLimit} ช่อง</span>
    </button>
    ```

### 4.2 HandCardMenuModal
- Bench placement grid:
  - If `benchLimit === 8`: Use responsive grid `grid-cols-4 sm:grid-cols-8 gap-1 sm:gap-1.5`.
  - If `benchLimit === 5`: Keep `grid-cols-5 gap-1.5`.

### 4.3 PokemonActionModal
- Retreat / switch options dynamically map up to `benchLimit`.

---

## 5. Verification Plan

### 5.1 Automated Unit Tests (Vitest)
- File: `src/components/playmat-v3/tabletopStateHelper.test.ts`
  - Test initial `benchLimit` defaults to 5.
  - Test expanding to 8 allows placing cards in slots 5, 6, 7.
  - Test switching active with bench slots 5, 6, 7 works correctly.
  - Test reducing 8 -> 5 is blocked with alert toast when slots 5-7 have Pokémon.
  - Test reducing 8 -> 5 succeeds when slots 5-7 are empty.

### 5.2 Automated E2E Tests (Playwright)
- File: `e2e/playmat-bench-expansion.spec.ts`
  - Verify toggle button exists and displays current limit.
  - Click to expand to 8 slots; verify 8 bench cards/slots are rendered.
  - Verify layout clearance: Active Pokémon centerline remains 0px offset and flanks are intact.
  - Place card on bench slot 8.
  - Attempt to click toggle back to 5 slots; verify warning toast appears and 8 slots remain.
  - Remove card from slot 8; click toggle; verify bench collapses to 5 slots cleanly.

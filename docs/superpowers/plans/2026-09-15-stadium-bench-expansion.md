# Dynamic Bench Capacity Expansion (5 ↔ 8 Slots) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow players in Playmat V3 Tabletop Sandbox to manually toggle Bench capacity between 5 and 8 slots (supporting Stadiums like Area Zero Underdepths / Sky Field), with overflow protection and 100% preservation of UI Bible layout standards.

**Architecture:** Extend `TabletopPlayerSideState` with `benchLimit: 5 | 8` and an 8-slot array. Introduce `TabletopActions.setBenchLimit` with safety checks preventing reduction if slots 6–8 have cards. Update canvas rendering and modals to dynamically scale between 5 and 8 slots while preserving 0px active centerline and flank alignment.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide icons, Vitest, Playwright.

## Global Constraints
- Strictly automated testing only (no manual screenshot testing as per repository AGENTS.md rule 4).
- Thai language priority for all user-facing strings and toasts (AGENTS.md rule 5).
- Atomic commit policy with AI_LOG.md (AGENTS.md rule 1, 2).
- Zero dead space and 0px active centerline preservation (UI Bible).

---

### Task 1: Data Model & State Logic (TDD)

**Files:**
- Modify: `src/components/playmat-v3/types.ts:25-35`
- Modify: `src/components/playmat-v3/tabletopStateHelper.ts:50-65, 180-230, 1020-1045`
- Test: `src/components/playmat-v3/tabletopStateHelper.test.ts`

**Interfaces:**
- Produces: `TabletopPlayerSideState.benchLimit: 5 | 8`
- Produces: `TabletopActions.setBenchLimit(state: TabletopV3State, side: 'player1' | 'player2', limit: 5 | 8): TabletopV3State`

- [ ] **Step 1: Write failing unit tests in `tabletopStateHelper.test.ts`**

```typescript
describe('Dynamic Bench Capacity (5 <-> 8)', () => {
  it('initializes benchLimit to 5 and bench array to 8 elements', () => {
    const state = createInitialTabletopState([]);
    expect(state.player1.benchLimit).toBe(5);
    expect(state.player1.bench.length).toBe(8);
    expect(state.player2.benchLimit).toBe(5);
    expect(state.player2.bench.length).toBe(8);
  });

  it('allows expanding benchLimit from 5 to 8', () => {
    let state = createInitialTabletopState([]);
    state = TabletopActions.setBenchLimit(state, 'player1', 8);
    expect(state.player1.benchLimit).toBe(8);
  });

  it('allows placing card in bench slot 7 when benchLimit is 8', () => {
    let state = createInitialTabletopState([
      { instanceId: 'test-card-1', nameTh: 'ปิกาจู', nameEn: 'Pikachu', supertype: 'Pokemon' } as any
    ]);
    state = TabletopActions.setBenchLimit(state, 'player1', 8);
    state = TabletopActions.placeFromHand(state, 'player1', 'test-card-1', 7);
    expect(state.player1.bench[7]?.card.instanceId).toBe('test-card-1');
  });

  it('prevents reducing benchLimit from 8 to 5 if slots 5-7 are occupied', () => {
    let state = createInitialTabletopState([
      { instanceId: 'test-card-1', nameTh: 'ปิกาจู', nameEn: 'Pikachu', supertype: 'Pokemon' } as any
    ]);
    state = TabletopActions.setBenchLimit(state, 'player1', 8);
    state = TabletopActions.placeFromHand(state, 'player1', 'test-card-1', 5);
    
    // Attempt reducing to 5
    state = TabletopActions.setBenchLimit(state, 'player1', 5);
    expect(state.player1.benchLimit).toBe(8); // Still 8
    expect(state.actionToast?.message).toContain('ช่องที่ 6–8');
  });

  it('allows reducing benchLimit from 8 to 5 when slots 5-7 are empty', () => {
    let state = createInitialTabletopState([]);
    state = TabletopActions.setBenchLimit(state, 'player1', 8);
    state = TabletopActions.setBenchLimit(state, 'player1', 5);
    expect(state.player1.benchLimit).toBe(5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/playmat-v3/tabletopStateHelper.test.ts`
Expected: FAIL due to missing `benchLimit` and `setBenchLimit`.

- [ ] **Step 3: Implement `benchLimit` and `setBenchLimit`**

Update `types.ts`:
```typescript
export interface TabletopPlayerSideState {
  // ...
  benchLimit?: 5 | 8;
  bench: (TabletopPokemonSlot | null)[];
  // ...
}
```

Update `tabletopStateHelper.ts`:
In `createPlayerSideState`:
```typescript
benchLimit: 5,
bench: [null, null, null, null, null, null, null, null],
```

In `TabletopActions`:
```typescript
setBenchLimit(
  state: TabletopV3State,
  side: 'player1' | 'player2',
  limit: 5 | 8
): TabletopV3State {
  const next = cloneState(state);
  const player = next[side];
  if (limit === 5) {
    const hasOverflowCards = (player.bench || []).slice(5, 8).some((slot) => slot !== null);
    if (hasOverflowCards) {
      next.actionToast = {
        id: Math.random().toString(),
        message: '⚠️ กรุณานำโปเกมอนในเบนช์ช่องที่ 6–8 ออกก่อนลดเหลือ 5 ช่อง',
        type: 'warning',
      };
      return next;
    }
  }
  player.benchLimit = limit;
  // Ensure array has at least 8 slots
  while (player.bench.length < 8) {
    player.bench.push(null);
  }
  const actionDesc = limit === 8 ? 'ขยายขนาดเบนช์เป็น 8 ช่อง' : 'ปรับขนาดเบนช์เป็น 5 ช่อง';
  next.historyLog.push(`👥 ${player.name} ${actionDesc}.`);
  next.actionToast = {
    id: Math.random().toString(),
    message: `👥 ${player.name} ${actionDesc}`,
    type: 'info',
  };
  return next;
}
```

Update bounds checks in `placeFromHand`, `switchActiveWithBench`, `swapBenchSlots` to use `player.benchLimit || 5`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/playmat-v3/tabletopStateHelper.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/playmat-v3/types.ts src/components/playmat-v3/tabletopStateHelper.ts src/components/playmat-v3/tabletopStateHelper.test.ts
git commit -m "feat: add benchLimit 5 <-> 8 state and setBenchLimit action"
```

---

### Task 2: Modals Dynamic Bench Slots (`HandCardMenuModal` & `PokemonActionModal`)

**Files:**
- Modify: `src/components/playmat-v3/HandCardMenuModal.tsx:10-30, 210-270`
- Modify: `src/components/playmat-v3/PokemonActionModal.tsx:570-600, 760-795`
- Test: `src/components/playmat-v3/HandCardMenuModal.test.tsx` (or vitest)

**Interfaces:**
- Consumes: `benchLimit?: 5 | 8`

- [ ] **Step 1: Write unit test for modal bench slots**
- [ ] **Step 2: Update `HandCardMenuModal` props & grid**
  - Accept `benchLimit?: 5 | 8` (default 5).
  - Generate slot buttons dynamically from `0` to `(benchLimit - 1)`.
  - Use `grid grid-cols-4 sm:grid-cols-8 gap-1` when 8 slots, or `grid grid-cols-5 gap-1.5` when 5 slots.
- [ ] **Step 3: Update `PokemonActionModal`**
  - Ensure `benchSlots.slice(0, benchLimit || 5)` is used for retreat/switch target listing.
- [ ] **Step 4: Run test to verify passes**
- [ ] **Step 5: Commit**

```bash
git add src/components/playmat-v3/HandCardMenuModal.tsx src/components/playmat-v3/PokemonActionModal.tsx
git commit -m "feat: make HandCardMenuModal and PokemonActionModal bench slots dynamic"
```

---

### Task 3: Canvas Layout & Toggle Pill Button (`PlaymatV3Canvas.tsx`)

**Files:**
- Modify: `src/components/playmat-v3/PlaymatV3Canvas.tsx`
- Modify: `src/index.css` (if needed for compact gap classes)

**Interfaces:**
- Renders: Glassmorphic Bench Limit Toggle button for each player side.
- Renders: Top Bench & Bottom Bench dynamically sized by `benchLimit`.
- Ensures: 0px Active spot centerline alignment maintained.

- [ ] **Step 1: Add bench toggle handler in `PlaymatV3Canvas.tsx`**
```typescript
const handleToggleBenchLimit = (side: 'player1' | 'player2') => {
  const currentLimit = state[side].benchLimit || 5;
  const nextLimit = currentLimit === 5 ? 8 : 5;
  commitState((curr) => TabletopActions.setBenchLimit(curr, side, nextLimit));
};
```
- [ ] **Step 2: Update Top & Bottom Bench rendering loops**
  - Use `Array.from({ length: player.benchLimit || 5 }, (_, i) => i)`.
  - Dynamic gap classes: `(player.benchLimit === 8 ? 'gap-0.5 sm:gap-1 md:gap-1.5' : 'gap-1 sm:gap-1.5 md:gap-2')`.
- [ ] **Step 3: Add the Toggle Pill Button beside bench rows**
  - Sleek glassmorphic badge `👥 เบนช์ {player.benchLimit || 5} ช่อง`.
  - On click, toggles 5 ↔ 8.
- [ ] **Step 4: Pass `benchLimit` to `HandCardMenuModal`**
- [ ] **Step 5: Run unit tests**
  - `npm test`
- [ ] **Step 6: Commit**

```bash
git add src/components/playmat-v3/PlaymatV3Canvas.tsx
git commit -m "feat: render dynamic 5/8 bench slots with toggle button on Playmat V3"
```

---

### Task 4: Realtime Sync Support

**Files:**
- Modify: `src/components/playmat-v3/tabletopSyncService.ts`

- [ ] **Step 1: Ensure `benchLimit` is included in sync payloads**
- [ ] **Step 2: Run `tabletopSyncService.test.ts`**
- [ ] **Step 3: Commit**

```bash
git add src/components/playmat-v3/tabletopSyncService.ts
git commit -m "feat: synchronize benchLimit across multiplayer realtime sessions"
```

---

### Task 5: Automated E2E Testing & Quality Gate

**Files:**
- Create: `e2e/playmat-bench-expansion.spec.ts`

- [ ] **Step 1: Write E2E test verifying:**
  - 1. Initial 5 bench slots visible.
  - 2. Clicking toggle pill expands to 8 slots.
  - 3. Placing card on slot 8.
  - 4. Attempting to reduce to 5 slots shows toast and keeps 8 slots.
  - 5. Removing card from slot 8 and clicking toggle collapses back to 5 slots.
  - 6. Active card centerline remains 0px aligned in both 5-slot and 8-slot modes.
- [ ] **Step 2: Run Playwright E2E tests**
  `npx playwright test e2e/playmat-bench-expansion.spec.ts`
- [ ] **Step 3: Run full quality gates**
  - `npm run lint`
  - `npm test`
  - `npm run build`
- [ ] **Step 4: Commit**

```bash
git add e2e/playmat-bench-expansion.spec.ts
git commit -m "test(e2e): add automated tests for dynamic bench expansion"
```

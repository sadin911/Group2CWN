# Virtual 3D Realistic Card Binder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a photorealistic, interactive Virtual 3D Card Binder for Pokémon TCG collection tracking, featuring dual modes (Auto-Set & Custom Showcases), 3D page flip, sleeve/cover customization, and Balatro foil sheen.

**Architecture:** A modular CSS 3D (`perspective(1400px)` + `preserve-3d`) book spread component with realistic leather spine and metal rings. State managed via a dedicated `customBinderStore` with seamless toggle inside `CollectionTracker`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Zustand, Framer Motion, Vitest, Playwright.

## Global Constraints
- High-definition native DOM image rendering for cards (zero texture blurriness).
- Responsive: 2-page spread on desktop/tablet, 1-page flip with swipe on mobile.
- Thai language priority for all UI labels and toasts.
- Quality gates: 0 lint errors, 0 build errors, 100% test pass.

---

### Task 1: Core Data Models & Store Extension

**Files:**
- Create: `src/types/binder.ts`
- Create: `src/store/customBinderStore.ts`
- Test: `src/store/customBinderStore.test.ts`

**Interfaces:**
- Produces: `CustomBinder`, `BinderPage`, `BinderSlotItem`, `useCustomBinderStore`, `computeAutoSetBinderPages`

- [x] **Step 1: Write the failing unit tests for store & auto-set computation**
- [x] **Step 2: Implement `src/types/binder.ts` and `src/store/customBinderStore.ts`**
- [x] **Step 3: Run `npx vitest run src/store/customBinderStore.test.ts` and verify 100% pass**
- [x] **Step 4: Commit changes**

---

### Task 2: 3D Pocket & Card Slot Component

**Files:**
- Create: `src/components/collection/binder/BinderPocketSlot.tsx`
- Test: `src/components/collection/binder/BinderPocketSlot.test.tsx`

**Interfaces:**
- Consumes: `BinderSlotItem`, `useBalatroCardTilt`
- Produces: `<BinderPocketSlot />` with sleeve styling, plastic sheen overlay, foil shimmer, and click zoom handler.

- [x] **Step 1: Write unit tests for BinderPocketSlot (owned vs missing silhouette, sleeve styles)**
- [x] **Step 2: Implement `src/components/collection/binder/BinderPocketSlot.tsx`**
- [x] **Step 3: Run `npx vitest run src/components/collection/binder/BinderPocketSlot.test.tsx`**
- [x] **Step 4: Commit changes**

---

### Task 3: 3D Page Sheet & Book Spread

**Files:**
- Create: `src/components/collection/binder/BinderPageSheet.tsx`
- Create: `src/components/collection/binder/BinderBookSpread.tsx`
- Test: `src/components/collection/binder/BinderBookSpread.test.tsx`

**Interfaces:**
- Consumes: `<BinderPocketSlot />`, `BinderPage`, `CustomBinder`
- Produces: `<BinderBookSpread />` (2-page desktop spread / 1-page mobile flip, leather covers, 3D spine, rings, page stack depth)

- [x] **Step 1: Write unit test for page sheet layout (4/9/12 pocket grid calculation)**
- [x] **Step 2: Implement `BinderPageSheet.tsx` and `BinderBookSpread.tsx`**
- [x] **Step 3: Run `npx vitest run src/components/collection/binder/`**
- [x] **Step 4: Commit changes**

---

### Task 4: Customizer Modal & Card Picker Drawer

**Files:**
- Create: `src/components/collection/binder/BinderSettingsModal.tsx`
- Create: `src/components/collection/binder/BinderCardPickerDrawer.tsx`

**Interfaces:**
- Consumes: `useCustomBinderStore`
- Produces: `<BinderSettingsModal />` (cover/sleeve selection) & `<BinderCardPickerDrawer />` (inserting cards into custom binders)

- [x] **Step 1: Implement `BinderSettingsModal.tsx`**
- [x] **Step 2: Implement `BinderCardPickerDrawer.tsx`**
- [x] **Step 3: Verify TypeScript compilation**
- [x] **Step 4: Commit changes**

---

### Task 5: Main View & Navigation Integration

**Files:**
- Create: `src/components/collection/binder/Virtual3DBinderView.tsx`
- Modify: `src/components/collection/CollectionTracker.tsx`
- Modify: `src/components/collection/CollectionHeader.tsx`

**Interfaces:**
- Integrates `<Virtual3DBinderView />` into Collection tab with seamless view toggle `[ ⊞ ตารางปกติ ]` | `[ 📖 สมุดสะสม 3D ]`

- [x] **Step 1: Implement `Virtual3DBinderView.tsx` with top toolbar, binder picker, page slider**
- [x] **Step 2: Integrate view mode toggle into `CollectionTracker.tsx` & `CollectionHeader.tsx`**
- [x] **Step 3: Verify dev build and check no regressions in existing grid view**
- [x] **Step 4: Commit changes**

---

### Task 6: Automated Playwright E2E Tests & Quality Gates

**Files:**
- Create: `e2e/virtual-3d-binder.spec.ts`

- [x] **Step 1: Write Playwright E2E tests for 3D Binder view switching, page flipping, and zoom modal**
- [x] **Step 2: Run `npx playwright test e2e/virtual-3d-binder.spec.ts --project=chromium`**
- [x] **Step 3: Run all quality gates: `npm run lint`, `npm test`, `npm run build`**
- [x] **Step 4: Commit and update documentation**

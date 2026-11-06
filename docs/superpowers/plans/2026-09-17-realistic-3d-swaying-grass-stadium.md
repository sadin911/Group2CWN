# Realistic 3D Swaying Grass Stadium Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a AAA-grade 3D realistic swaying grass stadium with physical wind sway blade simulation, rolling wind shimmer waves across the Bermuda turf, and floating atmospheric motes in floodlight beams, specifically optimized for high-performance 60 FPS execution on macOS/WebKit.

**Architecture:** Integrate dynamic grass blade tuft simulation and wind wave shimmer layers into `PixiStadiumSpotlight.ts` with zero-allocation ticker updates.

**Tech Stack:** PixiJS v8, WebGL2, React 19, TypeScript, Playwright (WebKit).

## Global Constraints
- Target 60 FPS locked on macOS WebKit with 0 garbage collection allocations in ticker.
- Maintain 1:1 dynamic alignment with `#center-board-zone`.
- Thai language priority across all user-facing UI labels.
- Automated testing via Playwright WebKit only (no screenshots).

---

### Task 1: Realistic 3D Swaying Grass Blade Simulation & Wind Wave Shimmer

**Files:**
- Modify: `src/components/playmat-pixi/engine/PixiStadiumSpotlight.ts`
- Test: `src/components/playmat-pixi/playmatPixi.test.ts`

- [ ] **Step 1: Define GrassTuft and Mote data structures with pre-allocated pools**
- [ ] **Step 2: Implement procedural grass blade distribution along touchlines, sidelines, and penalty boxes**
- [ ] **Step 3: Implement physical wind wave and Bezier sway simulation in `update(deltaRatio)`**
- [ ] **Step 4: Implement rolling floodlight shimmer across the mowed turf bands**
- [ ] **Step 5: Run tests to verify rendering and 60 FPS stability**

---

### Task 2: Quality Gates & Verification

**Files:**
- Test: `e2e/playmat-pixi-engine.spec.ts`
- Test: `e2e/playmat-bench-expansion.spec.ts`

- [ ] **Step 1: Run linter (`npm run lint`)**
- [ ] **Step 2: Run unit test suite (`npm test`)**
- [ ] **Step 3: Run Playwright WebKit E2E tests (`npx playwright test --project=webkit`)**
- [ ] **Step 4: Verify production build (`npm run build`)**
- [ ] **Step 5: Atomic Git commit with `AI_LOG.md`**

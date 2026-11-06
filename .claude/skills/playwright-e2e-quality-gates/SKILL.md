---
name: playwright-e2e-quality-gates
description: Production-grade automated Playwright E2E and Vitest quality verification for web apps. Strictly enforces no-manual-screenshot policies, headless test authoring, and CI regression prevention.
---

# Automated E2E & Quality Gates Guide (`playwright-e2e-quality-gates`)

Strict quality assurance standards enforcing 100% automated verification before any code change is merged, committed, or shipped.

---

## 1. Zero Manual Screenshot Verification Policy

### Why Manual Screenshots Are Forbidden
- Manual visual inspection does not scale and easily misses subtle state regressions.
- Screenshot artifacts pollute git repositories and context windows.
- Code changes must be backed by repeatable, deterministic assertions.

### The Rule
> **Evidence Before Assertions**: Never claim a feature works, a bug is squashed, or a release is ready without running automated tests and verifying their terminal output.

---

## 2. Test Suite Hierarchy & Structure

| Layer | Runner | Scope & Targets | Location |
| :--- | :--- | :--- | :--- |
| **Unit & Store** | Vitest | State reducers, action validators, calculation formulas, cloud guards | `src/store/*.test.ts`, `src/engine/*.test.ts` |
| **End-to-End** | Playwright | Full user flows, gesture events, modal workflows, offline switches | `e2e/*.spec.ts` |
| **Static Guard** | Oxlint + TSC | Syntax correctness, unused imports, strict TypeScript types | `npm run lint`, `tsc -b` |

---

## 3. Playwright Authoring Best Practices for Reactive PWAs

### 3.1 Use Resilient Locators (User-Centric & Accessible)
Avoid fragile CSS paths (`div > div.flex > span.text-sm`). Always prioritize accessible roles and test identifiers:
```typescript
import { test, expect } from '@playwright/test';

test('increments damage counter and displays localized combat toast', async ({ page }) => {
  await page.goto('/');

  // 1. Locate by role and accessible name
  const activePokemon = page.getByRole('region', { name: /active pokemon/i });
  await expect(activePokemon).toBeVisible();

  // 2. Interact with explicit counter actions
  const plusButton = activePokemon.getByRole('button', { name: /\+10/i });
  await plusButton.click();

  // 3. Assert state changes via accessible feedback or data attributes
  const damageDisplay = activePokemon.getByTestId('damage-counter');
  await expect(damageDisplay).toHaveText('10');

  // 4. Assert localized feedback is rendered
  const toast = page.locator('.combat-toast');
  await expect(toast).toBeVisible();
});
```

### 3.2 Handling Web Workers, Offline Modes & Service Workers
When testing PWA behavior, simulate network conditions directly using Playwright's network interception:
```typescript
test('retains changes offline and synchronizes when back online', async ({ page, context }) => {
  await page.goto('/');

  // Simulate network disconnect
  await context.setOffline(true);

  // Perform local edits
  await page.getByRole('button', { name: /add card/i }).click();

  // Verify optimistic local render
  await expect(page.getByText('Offline Staged')).toBeVisible();

  // Restore network and assert sync resolution
  await context.setOffline(false);
  await expect(page.getByText('Synced with Cloud')).toBeVisible({ timeout: 5000 });
});
```

---

## 4. Pre-Release Verification Protocol

Always execute the 4-gate verification sequence in terminal:

```bash
# Gate 1: Linter check (0 warnings/errors)
npm run lint

# Gate 2: Full TypeScript compilation & production build
npm run build

# Gate 3: Vitest store and engine logic
npm test

# Gate 4: Playwright automated headless E2E
npx playwright test
```

If any test fails:
1. Do not apply blind workarounds or bypass checks.
2. Investigate the failure log and locate the breaking component.
3. Fix the regression and re-run the targeted test file (`npx playwright test e2e/target.spec.ts`).

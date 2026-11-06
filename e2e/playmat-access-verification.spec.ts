import { test, expect } from '@playwright/test';

test.describe('Playmat Access Gate & Dual-Identifier Verification', () => {
  test.beforeEach(async () => {
    test.setTimeout(60000);
  });

  test('Guest can unlock Playmat by entering their allowed Email or UID', async ({ page }) => {
    // 1. Pre-seed allowed users in localStorage
    await page.addInitScript(() => {
      // Clear bypass flags to ensure we test the gate
      localStorage.setItem(
        'pokecount_playmat_allowed_users',
        JSON.stringify([
          {
            id: 'u_tester_1',
            identifier: 'kizunaslow@gmail.com',
            email: 'kizunaslow@gmail.com',
            uid: 'TPnGEcIQ8zVadUAabunPsp',
            note: 'Tester Kizunaslow',
            addedAt: Date.now(),
          },
        ])
      );
    });

    // 2. Go to Playmat with a simulated remote host
    await page.goto('/playmat-v3');

    // 3. If gate is shown, test entering invalid key
    const gate = page.locator('#playmat-access-gate');
    if (await gate.isVisible()) {
      const input = page.locator('#playmat-tester-key-input');
      const submit = page.locator('#playmat-tester-key-submit');

      // Invalid key
      await input.fill('unauthorized@example.com');
      await submit.click();
      await expect(page.locator('#playmat-access-error')).toBeVisible();

      // Valid Email unlocks
      await input.fill('kizunaslow@gmail.com');
      await submit.click();
      await expect(page.locator('#playmat-access-success')).toBeVisible();
      await expect(gate).not.toBeVisible({ timeout: 15000 });
    }
  });

  test('Guest can unlock Playmat by entering their allowed UID directly', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'pokecount_playmat_allowed_users',
        JSON.stringify([
          {
            id: 'u_tester_2',
            identifier: 'mihitori@gmail.com',
            email: 'mihitori@gmail.com',
            uid: 'LaLM2wx2yaesUfocPj4dZf',
            note: 'Tester Mihitori',
            addedAt: Date.now(),
          },
        ])
      );
    });

    await page.goto('/playmat-v3');

    const gate = page.locator('#playmat-access-gate');
    if (await gate.isVisible()) {
      const input = page.locator('#playmat-tester-key-input');
      const submit = page.locator('#playmat-tester-key-submit');

      // Enter UID directly
      await input.fill('LaLM2wx2yaesUfocPj4dZf');
      await submit.click();
      await expect(page.locator('#playmat-access-success')).toBeVisible();
      await expect(gate).not.toBeVisible({ timeout: 15000 });
    }
  });
});

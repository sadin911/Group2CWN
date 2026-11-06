import { test, expect } from '@playwright/test';

test.describe('Playmat Beta Access Control & Admin Allowlist', () => {
  test.beforeEach(async () => {
    test.setTimeout(60000);
  });

  test('Admin can add allowed user in Admin Console and test permission', async ({ page }) => {
    // 1. Go to Admin console using secret passkey
    await page.goto('/admin');
    await expect(page.getByText('PokéCount Admin Access')).toBeVisible({ timeout: 10000 });

    // Fill admin passkey
    const passkeyInput = page.locator('input[type="password"]');
    await passkeyInput.fill('poke911admin');
    await page.getByRole('button', { name: /ปลดล็อกระบบ Admin/ }).click();

    // Verify Admin Console dashboard loads
    await expect(page.getByText('PokeCount Admin Console')).toBeVisible({ timeout: 10000 });

    // 2. Click on "สิทธิ์ Playmat Beta" tab
    const accessTab = page.getByRole('button', { name: /สิทธิ์ Playmat Beta/ });
    await expect(accessTab).toBeVisible({ timeout: 10000 });
    await accessTab.click();

    // 3. Verify PlaymatAccessPanel loaded
    await expect(page.getByTestId('playmat-admin-access-panel')).toBeVisible();

    // 4. Add a new test user to allowlist
    const testIdentifier = `tester-${Date.now()}@gmail.com`;
    await page.getByTestId('playmat-add-identifier-input').fill(testIdentifier);
    await page.getByTestId('playmat-add-note-input').fill('E2E Beta Tester');
    await page.getByTestId('playmat-add-user-submit').click();

    // Verify feedback
    await expect(page.getByTestId('playmat-admin-feedback')).toContainText('เพิ่มสิทธิ์ให้');

    // 5. Test permission verification tool in admin panel
    await page.getByTestId('playmat-check-test-input').fill(testIdentifier);
    await page.getByTestId('playmat-check-test-btn').click();
    await expect(page.getByTestId('playmat-check-test-result')).toContainText('ได้รับสิทธิ์เข้าใช้งาน');
  });
});

import { test, expect } from '@playwright/test';

async function openAdminApprovalsTab(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem('pokecount_admin_session_auth', 'poke911admin');
  });
  await page.goto('/admin');
  const approvalBtn = page.getByRole('button', { name: /อนุมัติการจับคู่การ์ด/ });
  await expect(approvalBtn).toBeVisible({ timeout: 10000 });
  await approvalBtn.click();
  await expect(page.locator('[data-testid="mapping-approval-panel"]')).toBeVisible({ timeout: 10000 });
}

test.describe('Admin Card Mapping Approval Suite', () => {
  test('navigates to mapping approval panel and checks sub-tabs', async ({ page }) => {
    await openAdminApprovalsTab(page);

    // Verify sub-tabs exist using testids
    await expect(page.locator('[data-testid="subtab-pending"]')).toBeVisible();
    await expect(page.locator('[data-testid="subtab-quick-pair"]')).toBeVisible();
    await expect(page.locator('[data-testid="subtab-approved"]')).toBeVisible();
    await expect(page.locator('[data-testid="subtab-rejected"]')).toBeVisible();
  });

  test('switches to direct quick-pair sub-tab and searches for unmapped card', async ({ page }) => {
    await openAdminApprovalsTab(page);

    // Switch to quick pair tab
    const quickPairTab = page.locator('[data-testid="subtab-quick-pair"]');
    await quickPairTab.click();

    // Verify quick pair container is visible
    await expect(page.locator('[data-testid="quick-pair-container"]')).toBeVisible({ timeout: 5000 });

    // Search Thai card
    const thaiSearchInput = page.locator('[data-testid="quick-thai-search-input"]');
    await expect(thaiSearchInput).toBeVisible();
    await thaiSearchInput.fill('ลิซาร์ดอน');

    // Verify thai candidate cards appear
    const candidateCards = page.locator('[data-testid="quick-pair-container"] button:has-text("ลิซาร์ดอน")');
    await expect(candidateCards.first()).toBeVisible({ timeout: 10000 });

    // Select candidate card
    await candidateCards.first().click();

    // Verify card is selected: should now see "ID: " in the selected preview
    await expect(page.locator('[data-testid="quick-pair-container"]').getByText('ID:')).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';
import { RiskCalculatorFixture } from '../fixtures/risk-calculator.fixture.js';

test.describe('Risk Calculator - Activation & Panel Controls', () => {
  let riskCalc;

  test.beforeEach(async ({ page }) => {
    riskCalc = new RiskCalculatorFixture(page);
    await riskCalc.navigateToApp();
  });

  test('should enable Risk Calculator from indicator dropdown', async ({ page }) => {
    // Enable Risk Calculator
    await riskCalc.enable();

    // Verify panel is visible
    await expect(page.locator(riskCalc.selectors.panel).first()).toBeVisible();

    // Verify panel shows edit mode initially (since no calculation yet)
    await expect(page.locator(riskCalc.selectors.calculateButton)).toBeVisible();
  });

  test('should close Risk Calculator panel', async ({ page }) => {
    // Enable Risk Calculator
    await riskCalc.enable();
    await expect(page.locator(riskCalc.selectors.panel).first()).toBeVisible();

    // Close panel
    await riskCalc.close();

    // Verify panel is not visible
    await expect(page.locator(riskCalc.selectors.panel).first()).not.toBeVisible();
  });

  test('should minimize and maximize panel', async ({ page }) => {
    // Enable Risk Calculator
    await riskCalc.enable();

    // First perform a calculation so we have results to display
    await riskCalc.openEditMode();
    await riskCalc.fillForm({
      capital: 100000,
      riskPercent: 2,
      entryPrice: 100,
      stopLoss: 95,
    });
    await riskCalc.calculate();

    // Wait for results view
    await page.waitForTimeout(500);

    // Find and click minimize button (second icon button in header)
    const iconButtons = await page.locator('[class*="iconButton"]').all();
    if (iconButtons.length >= 2) {
      await iconButtons[1].click(); // Second button is minimize
    }

    // Verify panel is minimized
    await expect(page.locator(riskCalc.selectors.panelMinimized)).toBeVisible({ timeout: 2000 });

    // Verify minimized panel shows quantity
    const minimizedText = await page.locator(riskCalc.selectors.panelMinimized).textContent();
    expect(minimizedText).toContain('Qty:');

    // Maximize
    await riskCalc.maximize();

    // Verify panel is back to full view
    await expect(page.locator(riskCalc.selectors.panel).first()).toBeVisible();
    await expect(page.locator(riskCalc.selectors.panelMinimized)).not.toBeVisible();
  });

  test('should switch between edit mode and results view', async ({ page }) => {
    // Enable Risk Calculator
    await riskCalc.enable();

    // Initially in edit mode
    await expect(page.locator(riskCalc.selectors.calculateButton)).toBeVisible();

    // Fill and calculate
    await riskCalc.fillForm({
      capital: 100000,
      riskPercent: 2,
      entryPrice: 100,
      stopLoss: 95,
    });
    await riskCalc.calculate();

    // Should now be in results view
    await page.waitForTimeout(500);
    await expect(page.locator(riskCalc.selectors.calculateButton)).not.toBeVisible();

    // Verify edit button is visible
    await expect(page.locator(riskCalc.selectors.editButton)).toBeVisible();

    // Click edit button
    await riskCalc.openEditMode();

    // Should be back in edit mode
    await expect(page.locator(riskCalc.selectors.calculateButton)).toBeVisible();
  });

  test('should re-enable Risk Calculator after closing', async ({ page }) => {
    // Enable Risk Calculator
    await riskCalc.enable();
    await expect(page.locator(riskCalc.selectors.panel).first()).toBeVisible();

    // Close panel
    await riskCalc.close();
    await expect(page.locator(riskCalc.selectors.panel).first()).not.toBeVisible();

    // Re-enable
    await riskCalc.enable();
    await expect(page.locator(riskCalc.selectors.panel).first()).toBeVisible();

    // Should show edit mode again
    await expect(page.locator(riskCalc.selectors.calculateButton)).toBeVisible();
  });

  test('should display panel header with title', async ({ page }) => {
    // Enable Risk Calculator
    await riskCalc.enable();

    // Check panel header
    const header = page.locator('[class*="header"]').first();
    await expect(header).toBeVisible();
    await expect(header).toContainText('Risk Calculator');

    // Verify close button in header
    await expect(page.locator(riskCalc.selectors.closeButton)).toBeVisible();
  });

  test('should track no console errors during activation', async ({ page }) => {
    const errors = riskCalc.setupConsoleErrorTracking();

    // Enable Risk Calculator
    await riskCalc.enable();

    // Wait a bit for any async errors
    await page.waitForTimeout(1000);

    // Should have no console errors
    expect(errors).toHaveLength(0);
  });
});

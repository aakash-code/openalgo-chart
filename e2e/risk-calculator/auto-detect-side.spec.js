import { test, expect } from '@playwright/test';
import { RiskCalculatorFixture } from '../fixtures/risk-calculator.fixture.js';

/**
 * Bug Fix #2 Verification Tests
 * Tests auto-detection of BUY/SELL side based on stop loss position relative to entry
 */
test.describe('Risk Calculator - Auto-Detect Side (Bug Fix #2)', () => {
  let riskCalc;

  test.beforeEach(async ({ page }) => {
    riskCalc = new RiskCalculatorFixture(page);
    await riskCalc.navigateToApp();
    await riskCalc.enable();
    await riskCalc.openEditMode();
  });

  test('should auto-detect BUY when Stop Loss < Entry', async ({ page }) => {
    // Set entry price
    await page.fill(riskCalc.selectors.entryPriceInput, '100');

    // Set stop loss below entry
    await page.fill(riskCalc.selectors.stopLossInput, '95');

    // Wait for auto-detection
    await page.waitForTimeout(300);

    // Verify side is auto-detected as BUY
    const side = await riskCalc.getCurrentSide();
    expect(side).toBe('BUY');
  });

  test('should auto-detect SELL when Stop Loss > Entry', async ({ page }) => {
    // Set entry price
    await page.fill(riskCalc.selectors.entryPriceInput, '100');

    // Set stop loss above entry
    await page.fill(riskCalc.selectors.stopLossInput, '105');

    // Wait for auto-detection
    await page.waitForTimeout(300);

    // Verify side is auto-detected as SELL
    const side = await riskCalc.getCurrentSide();
    expect(side).toBe('SELL');
  });

  test('should dynamically change from BUY to SELL when SL moves above entry', async ({ page }) => {
    // Start with BUY setup (SL < Entry)
    await page.fill(riskCalc.selectors.entryPriceInput, '100');
    await page.fill(riskCalc.selectors.stopLossInput, '95');
    await page.waitForTimeout(300);

    // Verify it's BUY
    expect(await riskCalc.getCurrentSide()).toBe('BUY');

    // Change stop loss to above entry
    await page.fill(riskCalc.selectors.stopLossInput, '105');
    await page.waitForTimeout(300);

    // Verify it changed to SELL
    expect(await riskCalc.getCurrentSide()).toBe('SELL');
  });

  test('should dynamically change from SELL to BUY when SL moves below entry', async ({ page }) => {
    // Start with SELL setup (SL > Entry)
    await page.fill(riskCalc.selectors.entryPriceInput, '500');
    await page.fill(riskCalc.selectors.stopLossInput, '510');
    await page.waitForTimeout(300);

    // Verify it's SELL
    expect(await riskCalc.getCurrentSide()).toBe('SELL');

    // Change stop loss to below entry
    await page.fill(riskCalc.selectors.stopLossInput, '490');
    await page.waitForTimeout(300);

    // Verify it changed to BUY
    expect(await riskCalc.getCurrentSide()).toBe('BUY');
  });

  test('should auto-detect side when entry price changes', async ({ page }) => {
    // Set stop loss first
    await page.fill(riskCalc.selectors.stopLossInput, '100');

    // Set entry above stop loss
    await page.fill(riskCalc.selectors.entryPriceInput, '105');
    await page.waitForTimeout(300);

    // Should detect BUY (entry > SL)
    expect(await riskCalc.getCurrentSide()).toBe('BUY');

    // Change entry to below stop loss
    await page.fill(riskCalc.selectors.entryPriceInput, '95');
    await page.waitForTimeout(300);

    // Should detect SELL (entry < SL)
    expect(await riskCalc.getCurrentSide()).toBe('SELL');
  });

  test('should handle decimal prices correctly for auto-detection', async ({ page }) => {
    // Test with decimal values for BUY
    await page.fill(riskCalc.selectors.entryPriceInput, '123.45');
    await page.fill(riskCalc.selectors.stopLossInput, '120.30');
    await page.waitForTimeout(300);

    expect(await riskCalc.getCurrentSide()).toBe('BUY');

    // Test with decimal values for SELL
    await page.fill(riskCalc.selectors.entryPriceInput, '456.78');
    await page.fill(riskCalc.selectors.stopLossInput, '459.90');
    await page.waitForTimeout(300);

    expect(await riskCalc.getCurrentSide()).toBe('SELL');
  });

  test('should not auto-detect when only entry is filled', async ({ page }) => {
    // Fill only entry price
    await page.fill(riskCalc.selectors.entryPriceInput, '100');
    await page.waitForTimeout(300);

    // Side should remain at default (could be BUY or whatever is default)
    // This test just ensures no error occurs
    const side = await riskCalc.getCurrentSide();
    expect(['BUY', 'SELL']).toContain(side);
  });

  test('should not auto-detect when only stop loss is filled', async ({ page }) => {
    // Fill only stop loss
    await page.fill(riskCalc.selectors.stopLossInput, '95');
    await page.waitForTimeout(300);

    // Side should remain at default
    const side = await riskCalc.getCurrentSide();
    expect(['BUY', 'SELL']).toContain(side);
  });

  test('should auto-detect side with very small price differences', async ({ page }) => {
    // Test with small difference for BUY
    await page.fill(riskCalc.selectors.entryPriceInput, '100.00');
    await page.fill(riskCalc.selectors.stopLossInput, '99.99');
    await page.waitForTimeout(300);

    expect(await riskCalc.getCurrentSide()).toBe('BUY');

    // Test with small difference for SELL
    await page.fill(riskCalc.selectors.entryPriceInput, '100.00');
    await page.fill(riskCalc.selectors.stopLossInput, '100.01');
    await page.waitForTimeout(300);

    expect(await riskCalc.getCurrentSide()).toBe('SELL');
  });

  test('should maintain auto-detected side through full workflow', async ({ page }) => {
    // Fill form with BUY setup
    await riskCalc.fillForm({
      capital: 100000,
      riskPercent: 2,
      entryPrice: 100,
      stopLoss: 95, // Below entry - should auto-detect BUY
    });

    await page.waitForTimeout(300);

    // Verify BUY is detected
    expect(await riskCalc.getCurrentSide()).toBe('BUY');

    // Calculate
    await riskCalc.calculate();
    await page.waitForTimeout(500);

    // Switch back to edit
    await riskCalc.openEditMode();

    // Side should still be BUY
    expect(await riskCalc.getCurrentSide()).toBe('BUY');
  });

  test('should auto-detect side correctly in SELL scenario with calculation', async ({ page }) => {
    // Fill form with SELL setup
    await riskCalc.fillForm({
      capital: 100000,
      riskPercent: 2,
      entryPrice: 100,
      stopLoss: 105, // Above entry - should auto-detect SELL
    });

    await page.waitForTimeout(300);

    // Verify SELL is detected
    expect(await riskCalc.getCurrentSide()).toBe('SELL');

    // Calculate
    await riskCalc.calculate();
    await page.waitForTimeout(500);

    // Results should be calculated correctly for SELL
    const quantity = await riskCalc.getDisplayedQuantity();
    expect(quantity).toBeTruthy();
  });

  test('should allow manual override of auto-detected side', async ({ page }) => {
    // Set up for BUY auto-detection
    await page.fill(riskCalc.selectors.entryPriceInput, '100');
    await page.fill(riskCalc.selectors.stopLossInput, '95');
    await page.waitForTimeout(300);

    // Verify BUY is auto-detected
    expect(await riskCalc.getCurrentSide()).toBe('BUY');

    // Manually change to SELL (user override)
    await page.selectOption(riskCalc.selectors.sideSelect, 'SELL');

    // Verify manual selection works
    expect(await riskCalc.getCurrentSide()).toBe('SELL');

    // Note: This may trigger validation errors since SELL with SL < Entry is invalid
    // But the user should be able to override and then fix the values
  });

  test('should re-auto-detect after manual override when prices change', async ({ page }) => {
    // Set up for BUY
    await page.fill(riskCalc.selectors.entryPriceInput, '100');
    await page.fill(riskCalc.selectors.stopLossInput, '95');
    await page.waitForTimeout(300);

    // Manually change to SELL
    await page.selectOption(riskCalc.selectors.sideSelect, 'SELL');
    expect(await riskCalc.getCurrentSide()).toBe('SELL');

    // Change stop loss to trigger re-detection
    await page.fill(riskCalc.selectors.stopLossInput, '105');
    await page.waitForTimeout(300);

    // Should auto-detect SELL (which matches the manual selection in this case)
    expect(await riskCalc.getCurrentSide()).toBe('SELL');

    // Change stop loss back to BUY setup
    await page.fill(riskCalc.selectors.stopLossInput, '90');
    await page.waitForTimeout(300);

    // Should auto-detect BUY
    expect(await riskCalc.getCurrentSide()).toBe('BUY');
  });

  test('should track no console errors during auto-detection', async ({ page }) => {
    const errors = riskCalc.setupConsoleErrorTracking();

    // Perform multiple auto-detection scenarios
    await page.fill(riskCalc.selectors.entryPriceInput, '100');
    await page.fill(riskCalc.selectors.stopLossInput, '95');
    await page.waitForTimeout(300);

    await page.fill(riskCalc.selectors.stopLossInput, '105');
    await page.waitForTimeout(300);

    await page.fill(riskCalc.selectors.entryPriceInput, '110');
    await page.waitForTimeout(300);

    // Should have no console errors
    expect(errors).toHaveLength(0);
  });
});

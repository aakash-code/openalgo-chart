import { test, expect } from '@playwright/test';
import { RiskCalculatorFixture } from '../fixtures/risk-calculator.fixture.js';

/**
 * Bug Fix #1 Verification Tests
 * Tests that target line stays fixed when entry or stop loss is dragged
 *
 * Note: These tests verify the behavior through input changes rather than
 * direct canvas dragging, which is more reliable for E2E testing.
 */
test.describe('Risk Calculator - Draggable Lines (Bug Fix #1)', () => {
  let riskCalc;

  test.beforeEach(async ({ page }) => {
    riskCalc = new RiskCalculatorFixture(page);
    await riskCalc.navigateToApp();
    await riskCalc.enable();
    await riskCalc.openEditMode();
  });

  test('should keep target fixed when entry price changes (simulating drag)', async ({ page }) => {
    // Set up initial values with explicit target
    await riskCalc.fillForm({
      capital: 100000,
      riskPercent: 2,
      entryPrice: 100,
      stopLoss: 95,
      targetPrice: 110, // Explicitly set target
    });

    // Calculate to lock in values
    await riskCalc.calculate();
    await page.waitForTimeout(500);

    // Switch back to edit mode
    await riskCalc.openEditMode();

    // Verify initial target is 110
    const initialTarget = await riskCalc.getInputValue('targetPrice');
    expect(initialTarget).toBe('110');

    // Change entry price (simulating dragging entry line)
    await page.fill(riskCalc.selectors.entryPriceInput, '105');

    // Target should remain at 110
    const newTarget = await riskCalc.getInputValue('targetPrice');
    expect(newTarget).toBe('110');
  });

  test('should keep target fixed when stop loss changes (simulating drag)', async ({ page }) => {
    // Set up initial values with explicit target
    await riskCalc.fillForm({
      capital: 100000,
      riskPercent: 2,
      entryPrice: 100,
      stopLoss: 95,
      targetPrice: 110,
    });

    // Calculate
    await riskCalc.calculate();
    await page.waitForTimeout(500);

    // Switch back to edit mode
    await riskCalc.openEditMode();

    // Verify initial target
    const initialTarget = await riskCalc.getInputValue('targetPrice');
    expect(initialTarget).toBe('110');

    // Change stop loss (simulating dragging SL line)
    await page.fill(riskCalc.selectors.stopLossInput, '93');

    // Target should remain at 110
    const newTarget = await riskCalc.getInputValue('targetPrice');
    expect(newTarget).toBe('110');
  });

  test('should allow target to change when explicitly modified by user', async ({ page }) => {
    // Set up initial values
    await riskCalc.fillForm({
      capital: 100000,
      riskPercent: 2,
      entryPrice: 100,
      stopLoss: 95,
      targetPrice: 110,
    });

    // Calculate
    await riskCalc.calculate();
    await page.waitForTimeout(500);

    // Switch back to edit mode
    await riskCalc.openEditMode();

    // Explicitly change target price
    await page.fill(riskCalc.selectors.targetPriceInput, '115');

    // Verify target changed
    const newTarget = await riskCalc.getInputValue('targetPrice');
    expect(newTarget).toBe('115');
  });

  test('should maintain target independence through multiple entry changes', async ({ page }) => {
    // Set up initial values
    await riskCalc.fillForm({
      capital: 100000,
      riskPercent: 2,
      entryPrice: 100,
      stopLoss: 95,
      targetPrice: 110,
    });

    await riskCalc.calculate();
    await page.waitForTimeout(500);
    await riskCalc.openEditMode();

    // Change entry multiple times
    await page.fill(riskCalc.selectors.entryPriceInput, '102');
    expect(await riskCalc.getInputValue('targetPrice')).toBe('110');

    await page.fill(riskCalc.selectors.entryPriceInput, '105');
    expect(await riskCalc.getInputValue('targetPrice')).toBe('110');

    await page.fill(riskCalc.selectors.entryPriceInput, '98');
    expect(await riskCalc.getInputValue('targetPrice')).toBe('110');

    // Target should still be 110
    expect(await riskCalc.getInputValue('targetPrice')).toBe('110');
  });

  test('should maintain target independence through multiple stop loss changes', async ({ page }) => {
    // Set up initial values
    await riskCalc.fillForm({
      capital: 100000,
      riskPercent: 2,
      entryPrice: 100,
      stopLoss: 95,
      targetPrice: 110,
    });

    await riskCalc.calculate();
    await page.waitForTimeout(500);
    await riskCalc.openEditMode();

    // Change stop loss multiple times
    await page.fill(riskCalc.selectors.stopLossInput, '94');
    expect(await riskCalc.getInputValue('targetPrice')).toBe('110');

    await page.fill(riskCalc.selectors.stopLossInput, '92');
    expect(await riskCalc.getInputValue('targetPrice')).toBe('110');

    await page.fill(riskCalc.selectors.stopLossInput, '97');
    expect(await riskCalc.getInputValue('targetPrice')).toBe('110');

    // Target should still be 110
    expect(await riskCalc.getInputValue('targetPrice')).toBe('110');
  });

  test('should keep target fixed even when changing both entry and stop loss', async ({ page }) => {
    // Set up initial values
    await riskCalc.fillForm({
      capital: 100000,
      riskPercent: 2,
      entryPrice: 100,
      stopLoss: 95,
      targetPrice: 110,
    });

    await riskCalc.calculate();
    await page.waitForTimeout(500);
    await riskCalc.openEditMode();

    // Change entry
    await page.fill(riskCalc.selectors.entryPriceInput, '105');
    expect(await riskCalc.getInputValue('targetPrice')).toBe('110');

    // Change stop loss
    await page.fill(riskCalc.selectors.stopLossInput, '100');
    expect(await riskCalc.getInputValue('targetPrice')).toBe('110');

    // Change entry again
    await page.fill(riskCalc.selectors.entryPriceInput, '110');
    expect(await riskCalc.getInputValue('targetPrice')).toBe('110');

    // Target should still be 110
    expect(await riskCalc.getInputValue('targetPrice')).toBe('110');
  });

  test('should work correctly in SELL scenario', async ({ page }) => {
    // Set up SELL scenario (entry < target < stop loss)
    await riskCalc.fillForm({
      capital: 100000,
      riskPercent: 2,
      entryPrice: 100,
      stopLoss: 105,
      targetPrice: 95,
    });

    await riskCalc.calculate();
    await page.waitForTimeout(500);
    await riskCalc.openEditMode();

    // Verify SELL side is detected
    expect(await riskCalc.getCurrentSide()).toBe('SELL');

    // Change entry
    await page.fill(riskCalc.selectors.entryPriceInput, '102');

    // Target should remain at 95
    expect(await riskCalc.getInputValue('targetPrice')).toBe('95');

    // Change stop loss
    await page.fill(riskCalc.selectors.stopLossInput, '107');

    // Target should still be 95
    expect(await riskCalc.getInputValue('targetPrice')).toBe('95');
  });

  test('should handle decimal target prices correctly', async ({ page }) => {
    // Set up with decimal values
    await riskCalc.fillForm({
      capital: 100000,
      riskPercent: 2,
      entryPrice: 123.45,
      stopLoss: 120.30,
      targetPrice: 128.75,
    });

    await riskCalc.calculate();
    await page.waitForTimeout(500);
    await riskCalc.openEditMode();

    // Change entry
    await page.fill(riskCalc.selectors.entryPriceInput, '124.50');

    // Target should remain at 128.75
    expect(await riskCalc.getInputValue('targetPrice')).toBe('128.75');
  });

  test('should preserve target through recalculation', async ({ page }) => {
    // Set up initial values
    await riskCalc.fillForm({
      capital: 100000,
      riskPercent: 2,
      entryPrice: 100,
      stopLoss: 95,
      targetPrice: 110,
    });

    await riskCalc.calculate();
    await page.waitForTimeout(500);

    // Edit and change entry
    await riskCalc.openEditMode();
    await page.fill(riskCalc.selectors.entryPriceInput, '105');

    // Target should still be 110
    expect(await riskCalc.getInputValue('targetPrice')).toBe('110');

    // Recalculate
    await riskCalc.calculate();
    await page.waitForTimeout(500);

    // Switch back to edit
    await riskCalc.openEditMode();

    // Target should still be 110
    expect(await riskCalc.getInputValue('targetPrice')).toBe('110');
  });

  test('should not affect target when using R:R ratio instead of explicit target', async ({ page }) => {
    // Set up without explicit target (using R:R ratio)
    await riskCalc.fillForm({
      capital: 100000,
      riskPercent: 2,
      entryPrice: 100,
      stopLoss: 95,
      targetPrice: '', // Empty target
      riskRewardRatio: 2,
    });

    await riskCalc.calculate();
    await page.waitForTimeout(500);

    // In this case, target is auto-calculated based on R:R ratio
    // Expected: entry 100, SL 95, risk 5, reward 10, target 110

    // Switch back to edit
    await riskCalc.openEditMode();

    // Change entry
    await page.fill(riskCalc.selectors.entryPriceInput, '105');

    // Since we're using R:R ratio, target would be recalculated
    // This is expected behavior - only explicitly set targets should stay fixed
    // This test just ensures no error occurs
    const target = await riskCalc.getInputValue('targetPrice');
    expect(target).toBeTruthy();
  });

  test('should maintain target independence when switching between BUY and SELL', async ({ page }) => {
    // Start with BUY setup
    await riskCalc.fillForm({
      capital: 100000,
      riskPercent: 2,
      entryPrice: 100,
      stopLoss: 95,
      targetPrice: 110,
    });

    await riskCalc.calculate();
    await page.waitForTimeout(500);
    await riskCalc.openEditMode();

    // Verify BUY
    expect(await riskCalc.getCurrentSide()).toBe('BUY');

    // Change to SELL setup (but keep target at 110 for now)
    await page.fill(riskCalc.selectors.stopLossInput, '105');
    await page.waitForTimeout(300);

    // Should auto-detect SELL
    expect(await riskCalc.getCurrentSide()).toBe('SELL');

    // Target should still be 110 (though this might be invalid for SELL)
    expect(await riskCalc.getInputValue('targetPrice')).toBe('110');

    // User can manually adjust target for SELL
    await page.fill(riskCalc.selectors.targetPriceInput, '95');
    expect(await riskCalc.getInputValue('targetPrice')).toBe('95');
  });

  test('should track no console errors during line behavior tests', async ({ page }) => {
    const errors = riskCalc.setupConsoleErrorTracking();

    // Perform various operations
    await riskCalc.fillForm({
      capital: 100000,
      riskPercent: 2,
      entryPrice: 100,
      stopLoss: 95,
      targetPrice: 110,
    });

    await riskCalc.calculate();
    await page.waitForTimeout(500);

    await riskCalc.openEditMode();
    await page.fill(riskCalc.selectors.entryPriceInput, '105');
    await page.fill(riskCalc.selectors.stopLossInput, '100');

    // Should have no console errors
    expect(errors).toHaveLength(0);
  });
});

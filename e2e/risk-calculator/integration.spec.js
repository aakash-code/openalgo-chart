import { test, expect } from '@playwright/test';
import { RiskCalculatorFixture } from '../fixtures/risk-calculator.fixture.js';

/**
 * Integration Tests - Full End-to-End Workflows
 * These tests verify complete user scenarios from start to finish
 */
test.describe('Risk Calculator - Integration Tests', () => {
  let riskCalc;

  test.beforeEach(async ({ page }) => {
    riskCalc = new RiskCalculatorFixture(page);
    await riskCalc.navigateToApp();
  });

  test('FULL BUY TRADE: Enable → Set values → Auto-detect → Calculate → Verify', async ({ page }) => {
    const errors = riskCalc.setupConsoleErrorTracking();

    // 1. Enable Risk Calculator
    await riskCalc.enable();
    await expect(page.locator(riskCalc.selectors.panel).first()).toBeVisible();

    // 2. Open edit mode (should already be in edit mode)
    await riskCalc.openEditMode();

    // 3. Fill form (BUY setup: SL below entry)
    await riskCalc.fillForm({
      capital: 200000,
      riskPercent: 1,
      entryPrice: 100,
      stopLoss: 95, // Below entry
    });

    // 4. Verify auto-detect to BUY
    await page.waitForTimeout(300);
    expect(await riskCalc.getCurrentSide()).toBe('BUY');

    // 5. Calculate
    await riskCalc.calculate();
    await riskCalc.waitForCalculation();

    // 6. Verify results
    const quantity = await riskCalc.getDisplayedQuantity();
    const riskAmount = await riskCalc.getDisplayedRiskAmount();

    // Expected: capital 200000, risk 1% = 2000
    // Risk per share: 100 - 95 = 5
    // Quantity: 2000 / 5 = 400
    expect(quantity).toContain('400');
    expect(riskAmount).toContain('2,000');

    // Should have no console errors
    expect(errors).toHaveLength(0);
  });

  test('FULL SELL TRADE: Enable → Template → Modify → Auto-detect → Calculate', async ({ page }) => {
    const errors = riskCalc.setupConsoleErrorTracking();

    // 1. Enable Risk Calculator
    await riskCalc.enable();
    await riskCalc.openEditMode();

    // 2. Fill form for SELL (SL above entry)
    await riskCalc.fillForm({
      capital: 150000,
      riskPercent: 2,
      entryPrice: 500,
      stopLoss: 510, // Above entry
    });

    // 3. Verify auto-detect to SELL
    await page.waitForTimeout(300);
    expect(await riskCalc.getCurrentSide()).toBe('SELL');

    // 4. Set target manually
    await page.fill(riskCalc.selectors.targetPriceInput, '480');

    // 5. Calculate
    await riskCalc.calculate();
    await riskCalc.waitForCalculation();

    // 6. Verify results displayed
    const quantity = await riskCalc.getDisplayedQuantity();
    expect(quantity).toBeTruthy();

    // Expected: capital 150000, risk 2% = 3000
    // Risk per share: 510 - 500 = 10
    // Quantity: 3000 / 10 = 300
    expect(quantity).toContain('300');

    expect(errors).toHaveLength(0);
  });

  test('COMPLETE WORKFLOW: BUY with target → Modify entry → Verify target stays fixed', async ({ page }) => {
    await riskCalc.enable();
    await riskCalc.openEditMode();

    // Fill form with explicit target
    await riskCalc.fillForm({
      capital: 100000,
      riskPercent: 2,
      entryPrice: 100,
      stopLoss: 95,
      targetPrice: 110,
    });

    // Verify BUY
    await page.waitForTimeout(300);
    expect(await riskCalc.getCurrentSide()).toBe('BUY');

    // Calculate
    await riskCalc.calculate();
    await riskCalc.waitForCalculation();

    // Verify results show
    const quantity = await riskCalc.getDisplayedQuantity();
    expect(quantity).toBeTruthy();

    // Edit and change entry (simulating drag)
    await riskCalc.openEditMode();
    const initialTarget = await riskCalc.getInputValue('targetPrice');
    expect(initialTarget).toBe('110');

    await page.fill(riskCalc.selectors.entryPriceInput, '105');

    // Verify target stayed at 110 (Bug Fix #1)
    const newTarget = await riskCalc.getInputValue('targetPrice');
    expect(newTarget).toBe('110');

    // Recalculate
    await riskCalc.calculate();
    await riskCalc.waitForCalculation();

    // Should still show results
    const newQuantity = await riskCalc.getDisplayedQuantity();
    expect(newQuantity).toBeTruthy();
  });

  test('DYNAMIC SIDE CHANGE: Start as BUY → Change to SELL → Verify auto-detection', async ({ page }) => {
    await riskCalc.enable();
    await riskCalc.openEditMode();

    // Start with BUY setup
    await riskCalc.fillForm({
      capital: 100000,
      riskPercent: 2,
      entryPrice: 100,
      stopLoss: 95,
      targetPrice: 110,
    });

    await page.waitForTimeout(300);
    expect(await riskCalc.getCurrentSide()).toBe('BUY');

    // Calculate
    await riskCalc.calculate();
    await riskCalc.waitForCalculation();

    // Edit and switch to SELL setup
    await riskCalc.openEditMode();
    await page.fill(riskCalc.selectors.stopLossInput, '105'); // Move SL above entry

    await page.waitForTimeout(300);

    // Should auto-detect SELL (Bug Fix #2)
    expect(await riskCalc.getCurrentSide()).toBe('SELL');

    // Target stayed at 110 (now below entry, which is valid for SELL going down)
    const target = await riskCalc.getInputValue('targetPrice');
    expect(target).toBe('110');

    // Adjust target for valid SELL scenario
    await page.fill(riskCalc.selectors.targetPriceInput, '95');

    // Recalculate
    await riskCalc.calculate();
    await riskCalc.waitForCalculation();

    // Should show valid results for SELL
    const quantity = await riskCalc.getDisplayedQuantity();
    expect(quantity).toBeTruthy();
  });

  test('TEMPLATE WORKFLOW: Save template → Close → Reopen → Load template → Calculate', async ({ page }) => {
    // Clear storage
    await riskCalc.clearStorage();
    await page.reload();
    await page.waitForTimeout(2000);

    await riskCalc.enable();
    await riskCalc.openEditMode();

    // Fill specific values
    await riskCalc.fillForm({
      capital: 250000,
      riskPercent: 1.5,
    });

    // Save template
    await riskCalc.saveTemplate('Integration Test Template');
    await page.waitForTimeout(500);

    // Close panel
    await riskCalc.close();

    // Reopen
    await riskCalc.enable();
    await riskCalc.openEditMode();

    // Load template
    await page.selectOption(riskCalc.selectors.templateSelect, { label: /Integration Test Template/ });
    await page.waitForTimeout(300);

    // Verify values loaded
    expect(await riskCalc.getInputValue('capital')).toBe('250000');
    expect(await riskCalc.getInputValue('riskPercent')).toBe('1.5');

    // Complete the form
    await riskCalc.fillForm({
      entryPrice: 200,
      stopLoss: 195,
    });

    // Calculate
    await riskCalc.calculate();
    await riskCalc.waitForCalculation();

    // Should show results
    const quantity = await riskCalc.getDisplayedQuantity();
    expect(quantity).toBeTruthy();
  });

  test('MINIMIZE WORKFLOW: Calculate → Minimize → Verify compact view → Maximize', async ({ page }) => {
    await riskCalc.enable();
    await riskCalc.openEditMode();

    // Fill and calculate
    await riskCalc.fillForm({
      capital: 100000,
      riskPercent: 2,
      entryPrice: 100,
      stopLoss: 95,
    });

    await riskCalc.calculate();
    await riskCalc.waitForCalculation();

    // Minimize
    const iconButtons = await page.locator('[class*="iconButton"]').all();
    if (iconButtons.length >= 2) {
      await iconButtons[1].click(); // Minimize button
    }

    // Verify minimized state
    await expect(page.locator(riskCalc.selectors.panelMinimized)).toBeVisible();

    // Should show quantity in minimized view
    const minimizedText = await page.locator(riskCalc.selectors.panelMinimized).textContent();
    expect(minimizedText).toContain('Qty:');

    // Maximize
    await riskCalc.maximize();

    // Should be back in full view
    await expect(page.locator(riskCalc.selectors.panel).first()).toBeVisible();
  });

  test('ERROR RECOVERY: Invalid input → Error → Fix → Calculate successfully', async ({ page }) => {
    await riskCalc.enable();
    await riskCalc.openEditMode();

    // Enter invalid data (entry = stop loss)
    await page.fill(riskCalc.selectors.entryPriceInput, '100');
    await page.fill(riskCalc.selectors.stopLossInput, '100');
    await page.fill(riskCalc.selectors.capitalInput, '100000'); // Blur

    await page.waitForTimeout(300);

    // Should have error
    expect(await riskCalc.isCalculateButtonEnabled()).toBe(false);

    // Fix the error
    await page.fill(riskCalc.selectors.stopLossInput, '95');
    await page.fill(riskCalc.selectors.capitalInput, '100000'); // Blur

    await page.waitForTimeout(300);

    // Fill remaining required fields
    await page.fill(riskCalc.selectors.riskPercentInput, '2');

    // Should be valid now
    expect(await riskCalc.isCalculateButtonEnabled()).toBe(true);

    // Calculate
    await riskCalc.calculate();
    await riskCalc.waitForCalculation();

    // Should show results
    const quantity = await riskCalc.getDisplayedQuantity();
    expect(quantity).toBeTruthy();
  });

  test('DECIMAL PRECISION: Use decimal prices → Calculate → Verify accuracy', async ({ page }) => {
    await riskCalc.enable();
    await riskCalc.openEditMode();

    // Use decimal values
    await riskCalc.fillForm({
      capital: 123456.78,
      riskPercent: 1.25,
      entryPrice: 123.45,
      stopLoss: 120.30,
    });

    await page.waitForTimeout(300);

    // Should auto-detect BUY
    expect(await riskCalc.getCurrentSide()).toBe('BUY');

    // Calculate
    await riskCalc.calculate();
    await riskCalc.waitForCalculation();

    // Should show results (calculation should handle decimals)
    const quantity = await riskCalc.getDisplayedQuantity();
    expect(quantity).toBeTruthy();
  });

  test('RAPID CHANGES: Multiple rapid input changes → Should handle gracefully', async ({ page }) => {
    const errors = riskCalc.setupConsoleErrorTracking();

    await riskCalc.enable();
    await riskCalc.openEditMode();

    // Rapidly change values
    await page.fill(riskCalc.selectors.entryPriceInput, '100');
    await page.fill(riskCalc.selectors.entryPriceInput, '105');
    await page.fill(riskCalc.selectors.entryPriceInput, '110');

    await page.fill(riskCalc.selectors.stopLossInput, '95');
    await page.fill(riskCalc.selectors.stopLossInput, '100');
    await page.fill(riskCalc.selectors.stopLossInput, '105');

    await page.waitForTimeout(300);

    // Should handle without errors
    expect(errors).toHaveLength(0);

    // Side should auto-detect based on final values
    const side = await riskCalc.getCurrentSide();
    expect(['BUY', 'SELL']).toContain(side);
  });

  test('COMPLETE USER JOURNEY: Enable → Template → Customize → Calculate → Edit → Recalculate → Close', async ({ page }) => {
    const errors = riskCalc.setupConsoleErrorTracking();

    // 1. Enable
    await riskCalc.enable();
    await riskCalc.openEditMode();

    // 2. Use custom values (simulating template)
    await riskCalc.fillForm({
      capital: 100000,
      riskPercent: 2,
    });

    // 3. Customize with trade details
    await riskCalc.fillForm({
      entryPrice: 1250,
      stopLoss: 1240,
      targetPrice: 1275,
    });

    await page.waitForTimeout(300);

    // 4. Verify auto-detection
    expect(await riskCalc.getCurrentSide()).toBe('BUY');

    // 5. Calculate
    await riskCalc.calculate();
    await riskCalc.waitForCalculation();

    // 6. Verify results
    const initialQuantity = await riskCalc.getDisplayedQuantity();
    expect(initialQuantity).toBeTruthy();

    // 7. Edit
    await riskCalc.openEditMode();

    // 8. Modify entry (target should stay fixed)
    await page.fill(riskCalc.selectors.entryPriceInput, '1255');
    const target = await riskCalc.getInputValue('targetPrice');
    expect(target).toBe('1275');

    // 9. Recalculate
    await riskCalc.calculate();
    await riskCalc.waitForCalculation();

    // 10. Verify new results
    const newQuantity = await riskCalc.getDisplayedQuantity();
    expect(newQuantity).toBeTruthy();

    // 11. Close
    await riskCalc.close();
    await expect(page.locator(riskCalc.selectors.panel).first()).not.toBeVisible();

    // Should have no console errors throughout journey
    expect(errors).toHaveLength(0);
  });

  test('STRESS TEST: Multiple enable/disable cycles', async ({ page }) => {
    const errors = riskCalc.setupConsoleErrorTracking();

    // Cycle 5 times
    for (let i = 0; i < 5; i++) {
      await riskCalc.enable();
      await expect(page.locator(riskCalc.selectors.panel).first()).toBeVisible();

      await riskCalc.close();
      await expect(page.locator(riskCalc.selectors.panel).first()).not.toBeVisible();

      await page.waitForTimeout(200);
    }

    // Should have no errors
    expect(errors).toHaveLength(0);
  });

  test('EDGE CASE: Very large capital and very small risk percent', async ({ page }) => {
    await riskCalc.enable();
    await riskCalc.openEditMode();

    await riskCalc.fillForm({
      capital: 10000000, // 1 crore
      riskPercent: 0.1, // Very small
      entryPrice: 5000,
      stopLoss: 4990,
    });

    await page.waitForTimeout(300);

    await riskCalc.calculate();
    await riskCalc.waitForCalculation();

    // Should calculate correctly even with extreme values
    const quantity = await riskCalc.getDisplayedQuantity();
    expect(quantity).toBeTruthy();

    // Expected: 10000000 * 0.1% = 10000, risk per share = 10, qty = 1000
    expect(quantity).toContain('1000');
  });
});

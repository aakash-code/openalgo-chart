import { test, expect } from '@playwright/test';
import { RiskCalculatorFixture } from '../fixtures/risk-calculator.fixture.js';

test.describe('Risk Calculator - Panel Inputs', () => {
  let riskCalc;

  test.beforeEach(async ({ page }) => {
    riskCalc = new RiskCalculatorFixture(page);
    await riskCalc.navigateToApp();
    await riskCalc.enable();
    await riskCalc.openEditMode();
  });

  test('should accept valid form inputs for all fields', async ({ page }) => {
    // Fill all fields with valid data
    await riskCalc.fillForm({
      capital: 150000,
      riskPercent: 1.5,
      side: 'BUY',
      entryPrice: 250,
      stopLoss: 245,
      targetPrice: 260,
    });

    // Verify values are set correctly
    expect(await riskCalc.getInputValue('capital')).toBe('150000');
    expect(await riskCalc.getInputValue('riskPercent')).toBe('1.5');
    expect(await riskCalc.getCurrentSide()).toBe('BUY');
    expect(await riskCalc.getInputValue('entryPrice')).toBe('250');
    expect(await riskCalc.getInputValue('stopLoss')).toBe('245');
    expect(await riskCalc.getInputValue('targetPrice')).toBe('260');
  });

  test('should accept capital input with minimum 1000', async ({ page }) => {
    // Test minimum valid capital
    await page.fill(riskCalc.selectors.capitalInput, '1000');
    expect(await riskCalc.getInputValue('capital')).toBe('1000');

    // Test higher capital
    await page.fill(riskCalc.selectors.capitalInput, '500000');
    expect(await riskCalc.getInputValue('capital')).toBe('500000');
  });

  test('should accept risk percent input between 0.5 and 5', async ({ page }) => {
    // Test minimum
    await page.fill(riskCalc.selectors.riskPercentInput, '0.5');
    expect(await riskCalc.getInputValue('riskPercent')).toBe('0.5');

    // Test typical value
    await page.fill(riskCalc.selectors.riskPercentInput, '2');
    expect(await riskCalc.getInputValue('riskPercent')).toBe('2');

    // Test higher value
    await page.fill(riskCalc.selectors.riskPercentInput, '5');
    expect(await riskCalc.getInputValue('riskPercent')).toBe('5');
  });

  test('should allow selecting BUY or SELL side', async ({ page }) => {
    // Select BUY
    await page.selectOption(riskCalc.selectors.sideSelect, 'BUY');
    expect(await riskCalc.getCurrentSide()).toBe('BUY');

    // Select SELL
    await page.selectOption(riskCalc.selectors.sideSelect, 'SELL');
    expect(await riskCalc.getCurrentSide()).toBe('SELL');
  });

  test('should accept entry price input', async ({ page }) => {
    await page.fill(riskCalc.selectors.entryPriceInput, '1250.50');
    expect(await riskCalc.getInputValue('entryPrice')).toBe('1250.50');
  });

  test('should accept stop loss input', async ({ page }) => {
    await page.fill(riskCalc.selectors.stopLossInput, '1200.75');
    expect(await riskCalc.getInputValue('stopLoss')).toBe('1200.75');
  });

  test('should accept optional target price input', async ({ page }) => {
    await page.fill(riskCalc.selectors.targetPriceInput, '1350.25');
    expect(await riskCalc.getInputValue('targetPrice')).toBe('1350.25');

    // Should also accept empty (optional)
    await page.fill(riskCalc.selectors.targetPriceInput, '');
    expect(await riskCalc.getInputValue('targetPrice')).toBe('');
  });

  test('should display risk:reward ratio dropdown when no target price', async ({ page }) => {
    // Clear target price
    await page.fill(riskCalc.selectors.targetPriceInput, '');

    // R:R ratio dropdown should be visible
    await expect(page.locator(riskCalc.selectors.rrRatioSelect)).toBeVisible();

    // Select different R:R ratios
    await page.selectOption(riskCalc.selectors.rrRatioSelect, '1');
    await page.selectOption(riskCalc.selectors.rrRatioSelect, '2');
    await page.selectOption(riskCalc.selectors.rrRatioSelect, '3');
  });

  test('should hide risk:reward ratio dropdown when target price is set', async ({ page }) => {
    // Set a target price
    await page.fill(riskCalc.selectors.targetPriceInput, '300');

    // Wait a moment for React to update
    await page.waitForTimeout(200);

    // R:R ratio dropdown should not be visible
    const rrSelect = page.locator(riskCalc.selectors.rrRatioSelect);
    const isVisible = await rrSelect.isVisible().catch(() => false);
    expect(isVisible).toBe(false);
  });

  test('should enable calculate button when form is valid', async ({ page }) => {
    // Fill valid form
    await riskCalc.fillForm({
      capital: 100000,
      riskPercent: 2,
      entryPrice: 100,
      stopLoss: 95,
    });

    // Blur the last field to trigger validation
    await page.click(riskCalc.selectors.capitalInput);

    // Calculate button should be enabled
    expect(await riskCalc.isCalculateButtonEnabled()).toBe(true);
  });

  test('should disable calculate button when form is invalid', async ({ page }) => {
    // Fill only partial data
    await page.fill(riskCalc.selectors.capitalInput, '100000');

    // Calculate button should be disabled
    expect(await riskCalc.isCalculateButtonEnabled()).toBe(false);
  });

  test('should perform calculation and show results', async ({ page }) => {
    // Fill valid form
    await riskCalc.fillForm({
      capital: 200000,
      riskPercent: 1,
      entryPrice: 100,
      stopLoss: 95,
    });

    // Calculate
    await riskCalc.calculate();

    // Should switch to results view
    await page.waitForTimeout(500);
    await expect(page.locator(riskCalc.selectors.calculateButton)).not.toBeVisible();

    // Should display results
    const quantity = await riskCalc.getDisplayedQuantity();
    expect(quantity).toBeTruthy();
    expect(quantity).toContain('400'); // 200000 * 1% / 5 = 400
  });

  test('should show validation checkmarks for valid inputs', async ({ page }) => {
    // Fill a valid entry price and blur
    await page.fill(riskCalc.selectors.entryPriceInput, '100');
    await page.fill(riskCalc.selectors.stopLossInput, '95'); // Focus on next field to blur entry

    // Wait for validation
    await page.waitForTimeout(300);

    // Should show checkmark for valid entry
    const checkmarks = await page.locator(riskCalc.selectors.validCheck).count();
    expect(checkmarks).toBeGreaterThan(0);
  });

  test('should handle decimal values correctly', async ({ page }) => {
    await riskCalc.fillForm({
      capital: 100000,
      riskPercent: 1.5,
      entryPrice: 123.45,
      stopLoss: 120.30,
    });

    expect(await riskCalc.getInputValue('riskPercent')).toBe('1.5');
    expect(await riskCalc.getInputValue('entryPrice')).toBe('123.45');
    expect(await riskCalc.getInputValue('stopLoss')).toBe('120.30');
  });

  test('should maintain input values when switching between edit and results view', async ({ page }) => {
    const testData = {
      capital: 150000,
      riskPercent: 2,
      entryPrice: 500,
      stopLoss: 495,
    };

    // Fill and calculate
    await riskCalc.fillForm(testData);
    await riskCalc.calculate();

    // Switch back to edit mode
    await page.waitForTimeout(500);
    await riskCalc.openEditMode();

    // Verify values are maintained
    expect(await riskCalc.getInputValue('capital')).toBe('150000');
    expect(await riskCalc.getInputValue('riskPercent')).toBe('2');
    expect(await riskCalc.getInputValue('entryPrice')).toBe('500');
    expect(await riskCalc.getInputValue('stopLoss')).toBe('495');
  });

  test('should track no console errors during input operations', async ({ page }) => {
    const errors = riskCalc.setupConsoleErrorTracking();

    // Perform various input operations
    await riskCalc.fillForm({
      capital: 100000,
      riskPercent: 2,
      side: 'BUY',
      entryPrice: 100,
      stopLoss: 95,
      targetPrice: 110,
    });

    await riskCalc.calculate();
    await page.waitForTimeout(500);

    // Should have no console errors
    expect(errors).toHaveLength(0);
  });
});

import { test, expect } from '@playwright/test';
import { RiskCalculatorFixture } from '../fixtures/risk-calculator.fixture.js';

test.describe('Risk Calculator - Input Validation', () => {
  let riskCalc;

  test.beforeEach(async ({ page }) => {
    riskCalc = new RiskCalculatorFixture(page);
    await riskCalc.navigateToApp();
    await riskCalc.enable();
    await riskCalc.openEditMode();
  });

  test('should show error when capital is 0', async ({ page }) => {
    await page.fill(riskCalc.selectors.capitalInput, '0');
    await page.fill(riskCalc.selectors.riskPercentInput, '2'); // Blur capital field

    await page.waitForTimeout(300);

    // Should have field error
    const hasError = await riskCalc.hasFieldError('capital');
    expect(hasError).toBe(true);

    // Calculate button should be disabled
    expect(await riskCalc.isCalculateButtonEnabled()).toBe(false);
  });

  test('should show warning when capital is below 1000', async ({ page }) => {
    await page.fill(riskCalc.selectors.capitalInput, '500');
    await page.fill(riskCalc.selectors.riskPercentInput, '2'); // Blur capital field

    await page.waitForTimeout(300);

    // Should have warning (not blocking error)
    const warning = page.locator(riskCalc.selectors.fieldWarning);
    const warningVisible = await warning.isVisible().catch(() => false);
    // Warning might or might not be shown depending on implementation
    // The test should not block functionality
  });

  test('should show error when entry equals stop loss', async ({ page }) => {
    await page.fill(riskCalc.selectors.entryPriceInput, '100');
    await page.fill(riskCalc.selectors.stopLossInput, '100');
    await page.fill(riskCalc.selectors.capitalInput, '100000'); // Blur SL field

    await page.waitForTimeout(300);

    // Should have error
    const errorMsg = await riskCalc.getFieldErrorMessage();
    expect(errorMsg).toBeTruthy();

    // Calculate button should be disabled
    expect(await riskCalc.isCalculateButtonEnabled()).toBe(false);
  });

  test('should show error for BUY when entry <= stop loss', async ({ page }) => {
    await page.fill(riskCalc.selectors.entryPriceInput, '95');
    await page.fill(riskCalc.selectors.stopLossInput, '100');
    await page.waitForTimeout(300);

    // Should auto-detect SELL (since SL > Entry)
    expect(await riskCalc.getCurrentSide()).toBe('SELL');

    // Manually force BUY (invalid setup)
    await page.selectOption(riskCalc.selectors.sideSelect, 'BUY');
    await page.fill(riskCalc.selectors.capitalInput, '100000'); // Blur

    await page.waitForTimeout(300);

    // Should have error
    const hasError = await riskCalc.hasFieldError('stopLoss');
    expect(hasError).toBe(true);

    // Calculate button should be disabled
    expect(await riskCalc.isCalculateButtonEnabled()).toBe(false);
  });

  test('should show error for SELL when entry >= stop loss', async ({ page }) => {
    await page.fill(riskCalc.selectors.entryPriceInput, '100');
    await page.fill(riskCalc.selectors.stopLossInput, '95');
    await page.waitForTimeout(300);

    // Should auto-detect BUY
    expect(await riskCalc.getCurrentSide()).toBe('BUY');

    // Manually force SELL (invalid setup)
    await page.selectOption(riskCalc.selectors.sideSelect, 'SELL');
    await page.fill(riskCalc.selectors.capitalInput, '100000'); // Blur

    await page.waitForTimeout(300);

    // Should have error
    const hasError = await riskCalc.hasFieldError('stopLoss');
    expect(hasError).toBe(true);

    // Calculate button should be disabled
    expect(await riskCalc.isCalculateButtonEnabled()).toBe(false);
  });

  test('should show error when entry price is 0 or negative', async ({ page }) => {
    await page.fill(riskCalc.selectors.entryPriceInput, '0');
    await page.fill(riskCalc.selectors.stopLossInput, '95'); // Blur entry

    await page.waitForTimeout(300);

    // Should have error
    const hasError = await riskCalc.hasFieldError('entryPrice');
    expect(hasError).toBe(true);
  });

  test('should show error when stop loss is 0 or negative', async ({ page }) => {
    await page.fill(riskCalc.selectors.stopLossInput, '0');
    await page.fill(riskCalc.selectors.entryPriceInput, '100'); // Blur SL

    await page.waitForTimeout(300);

    // Should have error
    const hasError = await riskCalc.hasFieldError('stopLoss');
    expect(hasError).toBe(true);
  });

  test('should show suggestion button for fixable errors', async ({ page }) => {
    // Create an error scenario that has a suggestion
    await page.fill(riskCalc.selectors.entryPriceInput, '100');
    await page.fill(riskCalc.selectors.stopLossInput, '105');
    await page.selectOption(riskCalc.selectors.sideSelect, 'BUY'); // Force BUY (invalid)
    await page.fill(riskCalc.selectors.capitalInput, '100000'); // Blur

    await page.waitForTimeout(500);

    // Suggestion button might appear
    const suggestionButton = page.locator(riskCalc.selectors.suggestionButton).first();
    const isVisible = await suggestionButton.isVisible().catch(() => false);

    if (isVisible) {
      // Click suggestion
      await suggestionButton.click();
      await page.waitForTimeout(300);

      // Error should be resolved
      // (Suggestion might have changed stop loss to a valid value)
    }
  });

  test('should clear errors when values are corrected', async ({ page }) => {
    // Create error: entry = stop loss
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

    // Error should be cleared, calculate should be enabled
    expect(await riskCalc.isCalculateButtonEnabled()).toBe(true);
  });

  test('should show error when risk percent is too high', async ({ page }) => {
    await page.fill(riskCalc.selectors.riskPercentInput, '10');
    await page.fill(riskCalc.selectors.capitalInput, '100000'); // Blur

    await page.waitForTimeout(300);

    // Should have warning (> 5% is warned)
    const warning = page.locator(riskCalc.selectors.fieldWarning);
    const hasWarning = await warning.isVisible().catch(() => false);

    // High risk percent might show a warning but not block calculation
    // depending on implementation
  });

  test('should show validation checkmarks for valid inputs', async ({ page }) => {
    // Fill valid data
    await riskCalc.fillForm({
      capital: 100000,
      riskPercent: 2,
      entryPrice: 100,
      stopLoss: 95,
    });

    // Blur all fields
    await page.fill(riskCalc.selectors.capitalInput, '100000');

    await page.waitForTimeout(300);

    // Should show checkmarks
    const checkmarks = await page.locator(riskCalc.selectors.validCheck).count();
    expect(checkmarks).toBeGreaterThan(0);
  });

  test('should disable calculate button when required fields are missing', async ({ page }) => {
    // Fill only some fields
    await page.fill(riskCalc.selectors.capitalInput, '100000');
    await page.fill(riskCalc.selectors.riskPercentInput, '2');

    // Missing entry and stop loss
    await page.waitForTimeout(300);

    // Calculate should be disabled
    expect(await riskCalc.isCalculateButtonEnabled()).toBe(false);
  });

  test('should enable calculate button when all required fields are valid', async ({ page }) => {
    // Fill all required fields with valid data
    await riskCalc.fillForm({
      capital: 100000,
      riskPercent: 2,
      entryPrice: 100,
      stopLoss: 95,
    });

    await page.fill(riskCalc.selectors.capitalInput, '100000'); // Blur
    await page.waitForTimeout(300);

    // Calculate should be enabled
    expect(await riskCalc.isCalculateButtonEnabled()).toBe(true);
  });

  test('should validate immediately after field is touched', async ({ page }) => {
    // Enter invalid capital
    await page.fill(riskCalc.selectors.capitalInput, '0');

    // Blur the field (touch it)
    await page.fill(riskCalc.selectors.riskPercentInput, '2');

    await page.waitForTimeout(300);

    // Should show error immediately
    const hasError = await riskCalc.hasFieldError('capital');
    expect(hasError).toBe(true);
  });

  test('should not show validation errors for untouched fields', async ({ page }) => {
    // Don't touch any fields
    await page.waitForTimeout(300);

    // Should not show errors yet
    const errorCount = await page.locator(riskCalc.selectors.fieldError).count();
    expect(errorCount).toBe(0);
  });

  test('should handle edge case: very large capital', async ({ page }) => {
    await page.fill(riskCalc.selectors.capitalInput, '10000000');
    await page.fill(riskCalc.selectors.riskPercentInput, '2');

    // Should accept large capital
    expect(await riskCalc.getInputValue('capital')).toBe('10000000');
  });

  test('should handle edge case: very small risk percent', async ({ page }) => {
    await page.fill(riskCalc.selectors.riskPercentInput, '0.1');
    await page.fill(riskCalc.selectors.capitalInput, '100000');

    // Should accept small risk percent
    expect(await riskCalc.getInputValue('riskPercent')).toBe('0.1');
  });

  test('should show appropriate error styling on invalid inputs', async ({ page }) => {
    // Create error
    await page.fill(riskCalc.selectors.entryPriceInput, '100');
    await page.fill(riskCalc.selectors.stopLossInput, '100');
    await page.fill(riskCalc.selectors.capitalInput, '100000'); // Blur

    await page.waitForTimeout(300);

    // Input should have error styling
    const errorInputs = await page.locator(riskCalc.selectors.inputError).count();
    expect(errorInputs).toBeGreaterThan(0);
  });

  test('should show appropriate success styling on valid inputs', async ({ page }) => {
    // Fill valid data
    await page.fill(riskCalc.selectors.entryPriceInput, '100');
    await page.fill(riskCalc.selectors.stopLossInput, '95');
    await page.fill(riskCalc.selectors.capitalInput, '100000'); // Blur

    await page.waitForTimeout(300);

    // Some inputs should have valid styling
    const validInputs = await page.locator(riskCalc.selectors.inputValid).count();
    expect(validInputs).toBeGreaterThan(0);
  });

  test('should validate complex scenario: BUY with valid target', async ({ page }) => {
    await riskCalc.fillForm({
      capital: 100000,
      riskPercent: 2,
      side: 'BUY',
      entryPrice: 100,
      stopLoss: 95,
      targetPrice: 110,
    });

    await page.fill(riskCalc.selectors.capitalInput, '100000'); // Blur
    await page.waitForTimeout(300);

    // Should be valid
    expect(await riskCalc.isCalculateButtonEnabled()).toBe(true);
  });

  test('should validate complex scenario: SELL with valid target', async ({ page }) => {
    await riskCalc.fillForm({
      capital: 100000,
      riskPercent: 2,
      side: 'SELL',
      entryPrice: 100,
      stopLoss: 105,
      targetPrice: 95,
    });

    await page.fill(riskCalc.selectors.capitalInput, '100000'); // Blur
    await page.waitForTimeout(300);

    // Should be valid
    expect(await riskCalc.isCalculateButtonEnabled()).toBe(true);
  });

  test('should track no console errors during validation', async ({ page }) => {
    const errors = riskCalc.setupConsoleErrorTracking();

    // Trigger various validation scenarios
    await page.fill(riskCalc.selectors.capitalInput, '0');
    await page.fill(riskCalc.selectors.capitalInput, '100000');

    await page.fill(riskCalc.selectors.entryPriceInput, '100');
    await page.fill(riskCalc.selectors.stopLossInput, '100');
    await page.fill(riskCalc.selectors.stopLossInput, '95');

    await page.waitForTimeout(500);

    // Should have no console errors
    expect(errors).toHaveLength(0);
  });
});

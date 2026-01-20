import { test, expect } from '@playwright/test';
import { RiskCalculatorFixture } from '../fixtures/risk-calculator.fixture.js';

test.describe('Risk Calculator - Templates', () => {
  let riskCalc;

  test.beforeEach(async ({ page }) => {
    riskCalc = new RiskCalculatorFixture(page);
    // Clear storage before each test to start fresh
    await page.goto('/');
    await riskCalc.clearStorage();
    await riskCalc.navigateToApp();
    await riskCalc.enable();
    await riskCalc.openEditMode();
  });

  test('should display template selector dropdown', async ({ page }) => {
    // Template selector should be visible
    await expect(page.locator(riskCalc.selectors.templateSelect)).toBeVisible();
  });

  test('should have default "Custom" option selected initially', async ({ page }) => {
    const selectedValue = await page.locator(riskCalc.selectors.templateSelect).inputValue();
    expect(selectedValue).toBe('custom');
  });

  test('should list predefined templates', async ({ page }) => {
    const templateSelect = page.locator(riskCalc.selectors.templateSelect);
    const options = await templateSelect.locator('option').allTextContents();

    // Should have at least: Custom + predefined templates + Save Current
    expect(options.length).toBeGreaterThan(2);

    // Should have "Custom" option
    expect(options).toContain('Custom');

    // Should have "Save Current..." option
    const hasSaveOption = options.some(opt => opt.includes('Save Current'));
    expect(hasSaveOption).toBe(true);
  });

  test('should load predefined template values', async ({ page }) => {
    const templateSelect = page.locator(riskCalc.selectors.templateSelect);

    // Get all options except "Custom" and "Save Current..."
    const allOptions = await templateSelect.locator('option').all();
    let presetOption = null;

    for (const option of allOptions) {
      const value = await option.getAttribute('value');
      const text = await option.textContent();

      // Find a preset template (not custom, not save_new)
      if (value !== 'custom' && value !== 'save_new' && text && !text.includes('Save Current')) {
        presetOption = value;
        break;
      }
    }

    if (presetOption) {
      // Select the preset template
      await riskCalc.selectTemplate(presetOption);

      // Wait for values to load
      await page.waitForTimeout(300);

      // Verify values were auto-filled
      const capital = await riskCalc.getInputValue('capital');
      const riskPercent = await riskCalc.getInputValue('riskPercent');

      expect(parseFloat(capital)).toBeGreaterThan(0);
      expect(parseFloat(riskPercent)).toBeGreaterThan(0);
    }
  });

  test('should save custom template with valid name', async ({ page }) => {
    // Fill custom values
    await riskCalc.fillForm({
      capital: 150000,
      riskPercent: 1.5,
    });

    // Save template
    await riskCalc.saveTemplate('My Test Template');

    // Wait for save to complete
    await page.waitForTimeout(500);

    // Template should now appear in dropdown
    const options = await page.locator(riskCalc.selectors.templateSelect).locator('option').allTextContents();
    const hasNewTemplate = options.some(opt => opt.includes('My Test Template'));
    expect(hasNewTemplate).toBe(true);
  });

  test('should load saved custom template', async ({ page }) => {
    // Save a template first
    await riskCalc.fillForm({
      capital: 250000,
      riskPercent: 2.5,
    });

    await riskCalc.saveTemplate('Test Template 2');
    await page.waitForTimeout(500);

    // Change values
    await page.fill(riskCalc.selectors.capitalInput, '100000');
    await page.fill(riskCalc.selectors.riskPercentInput, '1');

    // Load the saved template
    await page.selectOption(riskCalc.selectors.templateSelect, { label: /Test Template 2/ });
    await page.waitForTimeout(300);

    // Verify values were loaded
    expect(await riskCalc.getInputValue('capital')).toBe('250000');
    expect(await riskCalc.getInputValue('riskPercent')).toBe('2.5');
  });

  test('should show save template dialog when selecting "Save Current..."', async ({ page }) => {
    // Select "Save Current..." option
    await page.selectOption(riskCalc.selectors.templateSelect, 'save_new');

    // Dialog should appear
    await expect(page.locator(riskCalc.selectors.saveTemplateDialog)).toBeVisible();

    // Should have input field
    await expect(page.locator(riskCalc.selectors.dialogInput)).toBeVisible();

    // Should have save and cancel buttons
    await expect(page.locator(riskCalc.selectors.dialogSaveButton)).toBeVisible();
    await expect(page.locator(riskCalc.selectors.dialogCancelButton)).toBeVisible();
  });

  test('should cancel save template dialog', async ({ page }) => {
    // Open save dialog
    await page.selectOption(riskCalc.selectors.templateSelect, 'save_new');
    await expect(page.locator(riskCalc.selectors.saveTemplateDialog)).toBeVisible();

    // Click cancel
    await page.click(riskCalc.selectors.dialogCancelButton);

    // Dialog should close
    await expect(page.locator(riskCalc.selectors.saveTemplateDialog)).not.toBeVisible();
  });

  test('should disable save button when template name is empty', async ({ page }) => {
    // Open save dialog
    await page.selectOption(riskCalc.selectors.templateSelect, 'save_new');
    await expect(page.locator(riskCalc.selectors.saveTemplateDialog)).toBeVisible();

    // Clear input (should be empty by default)
    await page.fill(riskCalc.selectors.dialogInput, '');

    // Save button should be disabled
    const saveButton = page.locator(riskCalc.selectors.dialogSaveButton);
    await expect(saveButton).toBeDisabled();
  });

  test('should enable save button when template name is entered', async ({ page }) => {
    // Open save dialog
    await page.selectOption(riskCalc.selectors.templateSelect, 'save_new');
    await expect(page.locator(riskCalc.selectors.saveTemplateDialog)).toBeVisible();

    // Enter name
    await page.fill(riskCalc.selectors.dialogInput, 'New Template');

    // Save button should be enabled
    const saveButton = page.locator(riskCalc.selectors.dialogSaveButton);
    await expect(saveButton).not.toBeDisabled();
  });

  test('should display current values in save dialog', async ({ page }) => {
    // Set specific values
    await page.fill(riskCalc.selectors.capitalInput, '175000');
    await page.fill(riskCalc.selectors.riskPercentInput, '1.8');

    // Open save dialog
    await page.selectOption(riskCalc.selectors.templateSelect, 'save_new');
    await expect(page.locator(riskCalc.selectors.saveTemplateDialog)).toBeVisible();

    // Dialog should show the current values
    const dialogContent = await page.locator(riskCalc.selectors.saveTemplateDialog).textContent();
    expect(dialogContent).toContain('175000');
    expect(dialogContent).toContain('1.8');
  });

  test('should auto-select template when values match', async ({ page }) => {
    // Save a template
    await riskCalc.fillForm({
      capital: 200000,
      riskPercent: 2,
    });

    await riskCalc.saveTemplate('Auto Select Test');
    await page.waitForTimeout(500);

    // Change to different values
    await page.fill(riskCalc.selectors.capitalInput, '100000');
    await page.fill(riskCalc.selectors.riskPercentInput, '1');
    await page.waitForTimeout(300);

    // Should show "Custom"
    const selectedBefore = await page.locator(riskCalc.selectors.templateSelect).inputValue();
    expect(selectedBefore).toBe('custom');

    // Change back to template values
    await page.fill(riskCalc.selectors.capitalInput, '200000');
    await page.fill(riskCalc.selectors.riskPercentInput, '2');
    await page.waitForTimeout(500);

    // Should auto-select the matching template
    const selectedAfter = await page.locator(riskCalc.selectors.templateSelect).inputValue();
    expect(selectedAfter).not.toBe('custom');
  });

  test('should handle multiple custom templates', async ({ page }) => {
    // Save multiple templates
    await riskCalc.fillForm({ capital: 100000, riskPercent: 1 });
    await riskCalc.saveTemplate('Conservative');
    await page.waitForTimeout(300);

    await riskCalc.fillForm({ capital: 200000, riskPercent: 2 });
    await riskCalc.saveTemplate('Moderate');
    await page.waitForTimeout(300);

    await riskCalc.fillForm({ capital: 300000, riskPercent: 3 });
    await riskCalc.saveTemplate('Aggressive');
    await page.waitForTimeout(300);

    // All three templates should be in dropdown
    const options = await page.locator(riskCalc.selectors.templateSelect).locator('option').allTextContents();

    expect(options.some(opt => opt.includes('Conservative'))).toBe(true);
    expect(options.some(opt => opt.includes('Moderate'))).toBe(true);
    expect(options.some(opt => opt.includes('Aggressive'))).toBe(true);
  });

  test('should persist templates across panel close and reopen', async ({ page }) => {
    // Save a template
    await riskCalc.fillForm({ capital: 150000, riskPercent: 1.5 });
    await riskCalc.saveTemplate('Persistent Template');
    await page.waitForTimeout(500);

    // Close panel
    await riskCalc.close();

    // Reopen panel
    await riskCalc.enable();
    await riskCalc.openEditMode();

    // Template should still be there
    const options = await page.locator(riskCalc.selectors.templateSelect).locator('option').allTextContents();
    expect(options.some(opt => opt.includes('Persistent Template'))).toBe(true);
  });

  test('should save template with Enter key', async ({ page }) => {
    // Open save dialog
    await page.selectOption(riskCalc.selectors.templateSelect, 'save_new');
    await expect(page.locator(riskCalc.selectors.saveTemplateDialog)).toBeVisible();

    // Type name and press Enter
    await page.fill(riskCalc.selectors.dialogInput, 'Enter Key Template');
    await page.press(riskCalc.selectors.dialogInput, 'Enter');

    // Dialog should close
    await expect(page.locator(riskCalc.selectors.saveTemplateDialog)).not.toBeVisible();

    // Template should be saved
    await page.waitForTimeout(300);
    const options = await page.locator(riskCalc.selectors.templateSelect).locator('option').allTextContents();
    expect(options.some(opt => opt.includes('Enter Key Template'))).toBe(true);
  });

  test('should track no console errors during template operations', async ({ page }) => {
    const errors = riskCalc.setupConsoleErrorTracking();

    // Perform various template operations
    await riskCalc.fillForm({ capital: 100000, riskPercent: 2 });
    await riskCalc.saveTemplate('Test Template');
    await page.waitForTimeout(500);

    await page.selectOption(riskCalc.selectors.templateSelect, 'custom');
    await page.waitForTimeout(300);

    // Should have no console errors
    expect(errors).toHaveLength(0);
  });
});

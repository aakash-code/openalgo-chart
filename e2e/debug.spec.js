import { test, expect } from '@playwright/test';
import { RiskCalculatorFixture } from './fixtures/risk-calculator.fixture.js';

test('debug - check navigation and element finding', async ({ page }) => {
  const riskCalc = new RiskCalculatorFixture(page);

  // Navigate to app (should handle login)
  await riskCalc.navigateToApp();

  console.log('App loaded successfully');

  // Take a screenshot after login
  await page.screenshot({ path: 'debug-after-login.png' });

  // Try to find the indicators button
  const indicatorButton = page.locator('button:has-text("Indicators")');
  const buttonCount = await indicatorButton.count();
  console.log(`Found ${buttonCount} indicator buttons`);

  // Try alternative selectors
  const ariaButton = page.locator('button[aria-label="Indicators"]');
  const ariaCount = await ariaButton.count();
  console.log(`Found ${ariaCount} buttons with aria-label Indicators`);

  // List all buttons
  const allButtons = await page.locator('button').all();
  console.log(`Total buttons on page: ${allButtons.length}`);

  // Get text of first few buttons
  for (let i = 0; i < Math.min(5, allButtons.length); i++) {
    const text = await allButtons[i].textContent();
    const ariaLabel = await allButtons[i].getAttribute('aria-label');
    console.log(`Button ${i}: text="${text}", aria-label="${ariaLabel}"`);
  }

  // Check for canvas
  const canvas = page.locator('canvas');
  const canvasCount = await canvas.count();
  console.log(`Found ${canvasCount} canvas elements`);
});

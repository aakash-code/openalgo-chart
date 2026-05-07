import { test, expect } from '@playwright/test';

test('capture indicators list', async ({ page }) => {
  const apiKey = '8319156e5247816c4b8974d5e687fe24156e7f1a8c68fecba62be4fc1ba128ea';
  
  // Inject credentials before navigation
  await page.addInitScript((key) => {
    window.localStorage.setItem('oa_apikey', key);
    window.localStorage.setItem('oa_host_url', 'http://127.0.0.1:8000');
    window.localStorage.setItem('oa_ws_url', 'ws://127.0.0.1:8000/ws');
    window.localStorage.setItem('openalgo_demo_mode', 'false');
  }, apiKey);

  await page.goto('http://localhost:5001/');
  
  // Wait for app to load and login if button appears
  await page.waitForTimeout(3000);
  const loginButton = page.locator('button:has-text("Login to OpenAlgo")');
  if (await loginButton.isVisible()) {
    await loginButton.click();
  }

  // Wait for chart interface (Indicators button)
  const indicatorBtn = page.locator('button[aria-label="Indicators"]');
  await indicatorBtn.waitFor({ state: 'visible', timeout: 15000 });
  
  // Open Indicators
  await indicatorBtn.click();
  
  // Check for the indicator
  const indicatorItem = page.locator('text=Volumetric Candle Pair');
  await expect(indicatorItem).toBeVisible({ timeout: 5000 });
  
  console.log("SUCCESS: Volumetric Candle Pair confirmed in dropdown!");
  await page.screenshot({ path: 'indicators-confirmed.png' });
});

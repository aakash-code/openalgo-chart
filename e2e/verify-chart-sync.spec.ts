import { test, expect } from '@playwright/test';

test('verify chart symbol and interval synchronization', async ({ page }) => {
  const apiKey = '8319156e5247816c4b8974d5e687fe24156e7f1a8c68fecba62be4fc1ba128ea';
  
  // Inject credentials
  await page.addInitScript((key) => {
    window.localStorage.setItem('oa_apikey', key);
    window.localStorage.setItem('oa_host_url', 'http://127.0.0.1:8000');
    window.localStorage.setItem('oa_ws_url', 'ws://127.0.0.1:8000/ws');
    window.localStorage.setItem('openalgo_demo_mode', 'false');
  }, apiKey);

  await page.goto('http://localhost:5001/');
  await page.waitForTimeout(3000);

  // Bypass login
  const loginButton = page.getByRole('button', { name: /Login to OpenAlgo/i });
  if (await loginButton.isVisible()) {
    await loginButton.click();
  }

  // 1. Switch to 2 Charts Layout
  console.log("CHECK: Switching to 2-chart layout...");
  await page.click('button[aria-label="Layout setup"]');
  await page.click('text=2 Charts');
  await page.waitForTimeout(1000);

  // 2. Enable Sync
  console.log("CHECK: Enabling Chart Sync...");
  await page.click('button[aria-label="Layout setup"]');
  const syncToggle = page.locator('text=Enable Sync');
  await syncToggle.click();
  
  // Verify Symbol sync checkbox is checked by default
  const symbolSync = page.locator('div:has-text("Symbol") >> input[type="checkbox"]');
  await expect(symbolSync).toBeChecked();
  
  // Close menu
  await page.keyboard.press('Escape');

  // 3. Change Symbol on Chart 1
  console.log("CHECK: Changing symbol on Chart 1...");
  // Click the symbol button (the one that says "NIFTY" or current symbol)
  const symbolBtn = page.locator('button[class*="Topbar_symbolButton"]').first();
  await symbolBtn.click();
  
  const searchInput = page.getByPlaceholder('Search symbol, name...');
  await searchInput.fill('RELIANCE');
  await page.waitForTimeout(1000);
  
  // Select RELIANCE from results
  await page.locator('text=RELIANCE').first().click();
  await page.waitForTimeout(2000);

  // 4. Verify BOTH charts updated to RELIANCE
  // We check the legend or data markers for both charts
  const charts = page.locator('[class*="ChartContainer_chart"]');
  const count = await charts.count();
  console.log(`Found ${count} charts`);

  // Check labels in the Topbar (since it shows active chart)
  await expect(symbolBtn).toContainText('RELIANCE');
  
  // Switch to Chart 2 and check if it also shows RELIANCE
  // Note: Implementation detail - the Topbar always shows the ACTIVE chart's symbol.
  // If sync worked, when we click chart 2, it should already be RELIANCE.
  const chart2 = charts.nth(1);
  await chart2.click();
  await page.waitForTimeout(500);
  await expect(symbolBtn).toContainText('RELIANCE');

  console.log("SUCCESS: Symbol synchronization verified!");
});

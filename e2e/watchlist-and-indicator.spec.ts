import { test, expect } from '@playwright/test';

test.describe('Watchlist and New Indicator Verification', () => {
  
  test.beforeEach(async ({ page }) => {
    // Inject API Key from environment variable
    const apiKey = process.env.OA_API_KEY || 'demo';
    
    await page.addInitScript((key) => {
      window.localStorage.setItem('oa_apikey', key);
      window.localStorage.setItem('oa_host_url', 'http://127.0.0.1:8000'); // Default OpenAlgo host
      window.localStorage.setItem('oa_ws_url', 'ws://127.0.0.1:8000/ws'); // Default WebSocket host
      window.localStorage.setItem('openalgo_demo_mode', 'false');
    }, apiKey);

    // Navigate to the app
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Wait for chart to load - check for canvas
    try {
      await page.waitForSelector('canvas', { timeout: 15000 });
    } catch (e) {
      // If still seeing connection screen, try to click login
      const loginButton = page.locator('button:has-text("Login to OpenAlgo")');
      if (await loginButton.isVisible()) {
        await loginButton.click();
        await page.waitForTimeout(3000);
      }
    }
    
    await page.waitForTimeout(2000);
  });

  test('should verify Volumetric Candle Pair indicator is available and can be added', async ({ page }) => {
    // 1. Open Indicators dropdown
    await page.click('button[aria-label="Indicators"]');
    
    // 2. Verify "Volumetric Candle Pair" exists in the list
    const indicatorItem = page.locator('text=Volumetric Candle Pair');
    await expect(indicatorItem).toBeVisible({ timeout: 5000 });
    
    // 3. Click to add it
    await indicatorItem.click();
    
    // 4. Verify it appears in the legend (Check for the text in indicator legend)
    // Most indicators show their name in an "indicatorLegend" component
    const legend = page.locator('[class*="indicatorLegend"]');
    await expect(legend).toContainText('Volumetric Candle Pair');
  });

  test('should verify Watchlist search functionality', async ({ page }) => {
    // Ensure watchlist is visible
    const watchlistPanel = page.locator('[class*="Watchlist_watchlist"]');
    await expect(watchlistPanel).toBeVisible();

    // 1. Click search icon (magnifying glass)
    const searchIcon = page.locator('svg[class*="Watchlist_icon"]').first(); // First one is usually search or add
    // Let's try to find it more specifically if possible, or click by position/icon
    await page.click('button[title="Search in watchlist"], svg[class*="Watchlist_icon"]');
    
    // 2. Verify search input appears
    const searchInput = page.locator('input[placeholder="Search symbol..."]');
    await expect(searchInput).toBeVisible();

    // 3. Type a symbol that's likely in default (e.g., "TCS")
    await searchInput.fill('TCS');
    
    // 4. Verify only matching symbols are visible
    // We expect "TCS" to be visible and others to be hidden
    const tcsItem = page.locator('text=TCS').first();
    await expect(tcsItem).toBeVisible();
    
    // Type something that shouldn't exist
    await searchInput.fill('NONEXISTENT_SYMBOL_XYZ');
    const items = page.locator('[class*="WatchlistItem_item"]');
    // Depending on implementation, it might show "No results" or just 0 items
    const count = await items.count();
    // If sections are present, items might be 0
    expect(count).toBe(0);
  });

  test('should verify Watchlist flagging and persistence', async ({ page }) => {
    // 1. Right-click the first item in watchlist
    const firstItem = page.locator('[class*="WatchlistItem_item"]').first();
    await expect(firstItem).toBeVisible();
    const symbolText = await firstItem.locator('[class*="symbolName"]').textContent();
    
    await firstItem.click({ button: 'right' });
    
    // 2. Verify "Flags" section in context menu
    await expect(page.locator('text=Flags')).toBeVisible();
    
    // 3. Select "Red Flag"
    await page.click('text=🔴 Red Flag');
    
    // 4. Verify flag marker appears
    // The flag is a div with class "flag" inside WatchlistItem
    const redFlag = firstItem.locator('[class*="WatchlistItem_flag"]');
    await expect(redFlag).toBeVisible();
    
    // 5. Refresh page and verify persistence
    await page.reload();
    await page.waitForSelector('canvas', { timeout: 30000 });
    await page.waitForTimeout(2000);
    
    // Verify the same symbol still has the red flag
    const persistedItem = page.locator(`[class*="WatchlistItem_item"]:has-text("${symbolText}")`);
    await expect(persistedItem.locator('[class*="WatchlistItem_flag"]')).toBeVisible();
  });

});

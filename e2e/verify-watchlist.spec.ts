import { test, expect } from '@playwright/test';

test('verify watchlist features and persistence', async ({ page }) => {
  const apiKey = '8319156e5247816c4b8974d5e687fe24156e7f1a8c68fecba62be4fc1ba128ea';
  
  // Inject credentials
  await page.addInitScript((key) => {
    window.localStorage.setItem('oa_apikey', key);
    window.localStorage.setItem('oa_host_url', 'http://127.0.0.1:8000');
    window.localStorage.setItem('oa_ws_url', 'ws://127.0.0.1:8000/ws');
    window.localStorage.setItem('openalgo_demo_mode', 'false');

    // Inject explicit watchlist to ensure TCS exists
    const watchlistData = {
      lists: [{
        id: 'wl_default',
        name: 'Watchlist 1',
        symbols: [
          { symbol: 'RELIANCE', exchange: 'NSE' },
          { symbol: 'TCS', exchange: 'NSE' },
          { symbol: 'INFY', exchange: 'NSE' }
        ],
        isFavorite: false,
        collapsedSections: []
      }],
      activeListId: 'wl_default'
    };
    window.localStorage.setItem('tv_watchlists', JSON.stringify(watchlistData));
  }, apiKey);
  await page.goto('http://localhost:5001/');

  // Robust Login Bypass
  const loginButton = page.getByRole('button', { name: /Login to OpenAlgo/i });
  try {
    await loginButton.waitFor({ state: 'visible', timeout: 5000 });
    await loginButton.click();
  } catch (e) {
    // Fallback: Check if login button is visible at all
    if (await loginButton.isVisible()) {
        await loginButton.click();
    }
  }

  // 1. Verify Watchlist is visible
  // Use text that appears in the watchlist
  const watchlistName = page.getByText('Watchlist 1');
  await expect(watchlistName).toBeVisible({ timeout: 20000 });
  console.log("CHECK: Watchlist visible");

  // 2. Test Search
  // Click search icon by title (must match "Search symbols" in implementation)
  const searchBtn = page.getByTitle('Search symbols');
  await searchBtn.click();
  
  // Target the specific watchlist search input (not the positions one)
  const searchInput = page.getByPlaceholder('Search within watchlist...');
  await expect(searchInput).toBeVisible();
  
  await searchInput.fill('TCS');
  await page.waitForTimeout(1000);
  
  // Verify TCS is visible (case insensitive) inside the watchlist
  const watchlistContainer = page.locator('[class*="Watchlist_watchlist"]');
  const tcsItem = watchlistContainer.getByText('TCS', { exact: false }).first();
  await expect(tcsItem).toBeVisible();
  console.log("CHECK: Search working (TCS found)");

  // Clear search 
  const clearBtn = page.locator('svg[class*="Watchlist_clearSearch"]');
  if (await clearBtn.isVisible()) {
      await clearBtn.click();
  } else {
      await searchInput.fill('');
  }
  
  // 3. Test Flagging
  const firstItem = page.locator('[class*="WatchlistItem_item"]').first();
  await expect(firstItem).toBeVisible();
  const symbolText = (await firstItem.locator('[class*="symbolName"]').textContent()) || 'RELIANCE';
  console.log(`CHECK: Flagging symbol: ${symbolText}`);
  
  // Right click to open context menu
  await firstItem.click({ button: 'right' });
  await expect(page.getByText('Flags')).toBeVisible();
  
  // Click Red Flag
  await page.getByText('🔴 Red Flag').click();
  
  // Verify flag marker appears
  const flagMarker = firstItem.locator('[class*="flag"]');
  await expect(flagMarker).toBeVisible();
  console.log("CHECK: Flag assigned successfully");

  // 4. Test Persistence
  console.log("CHECK: Refreshing page to verify persistence...");
  await page.reload();
  await page.waitForTimeout(2000);
  
  // Bypass login again if needed
  if (await loginButton.isVisible()) {
    await loginButton.click();
  }

  // Find the same symbol and check for the flag
  // Use a regex to match the symbol name in the list
  const persistedItem = page.locator(`[class*="WatchlistItem_item"]`).filter({ hasText: symbolText }).first();
  await expect(persistedItem).toBeVisible({ timeout: 10000 });
  
  const persistedFlag = persistedItem.locator('[class*="flag"]');
  await expect(persistedFlag).toBeVisible();
  
  console.log("SUCCESS: Watchlist search, flagging, and persistence verified!");
});

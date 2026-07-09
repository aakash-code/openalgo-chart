/**
 * Auto-Trade Pipeline E2E
 *
 * Pre-market verification that the full VCP-signal → multi-variant order →
 * position-store → soft-exit → trade-journal → leaderboard pipeline works
 * without depending on a live OpenAlgo instance.
 *
 * Strategy:
 *   1. Mock OpenAlgo HTTP endpoints (funds, placeorder, analyzer*) at the
 *      browser level via page.route().
 *   2. Force authenticated state by pre-seeding localStorage.
 *   3. Use window.__autoTrade helpers exposed by _autoTradeTestHelpers.ts to
 *      drive the pipeline programmatically (set config, inject signals).
 *   4. Assert each stage produced the expected state.
 */

import { test, expect, type Page, type Route } from '@playwright/test';

// ==================== TYPES (mirror DEV-only window.__autoTrade) ====================

declare global {
  interface Window {
    __autoTrade?: {
      vcpMonitor: { setWatchlist: (s: unknown[]) => void };
      engine: {
        start: () => void;
        stop: () => void;
        reloadConfig: () => void;
        getCapital: () => number;
        isRunning: () => boolean;
      };
      positionStore: {
        getOpenPositions: () => Array<{
          id: string; variantId: string; symbol: string; qty: number;
          stopLoss: number; entryPrice: number;
        }>;
        getClosedToday: () => Array<{
          id: string; variantId: string; symbol: string; realizedPnL: number;
          rMultiple: number; exitReason: string;
        }>;
      };
      tradeJournal: {
        getAllEntries: () => unknown[];
        getAllStats: (m: Map<string, number>) => Array<{
          variantId: string; trades: number; totalPnL: number;
        }>;
      };
      config: {
        loadAutoTradeConfig: () => unknown;
        saveAutoTradeConfig: (cfg: unknown) => boolean;
        TESTING_PRESET: Record<string, unknown>;
      };
      variants: Array<{ id: string; enabled: boolean; label: string; slStrategy: string; trailStrategy: string }>;
      setVariantEnabled: (id: string, enabled: boolean) => void;
      injectVCPResults: (results: Record<string, unknown>[]) => void;
      makeScanResult: (overrides: Record<string, unknown>) => unknown;
      seedLiquidity: (symbol: string, exchange: string, turnover: number) => void;
    };
  }
}

// ==================== MOCKS ====================

const FAKE_API_KEY = 'test-key-pipeline-spec';

/** Track every OpenAlgo POST so the test can assert on them. */
interface MockState {
  funds: number;
  placedOrders: Array<{
    symbol: string; action: string; quantity: number; strategy?: string;
  }>;
  analyzerMode: boolean;
  totalLogs: number;
}

const installMocks = async (page: Page, state: MockState): Promise<void> => {
  // Auth check — skip the connection screen
  await page.addInitScript((apikey: string) => {
    localStorage.setItem('oa_apikey', apikey);
    localStorage.setItem('oa_host_url', 'http://127.0.0.1:5000');
    // Reset auto-trade state between tests
    localStorage.removeItem('oa_autotrade_config');
    localStorage.removeItem('oa_position_store');
    localStorage.removeItem('oa_trade_journal');
    localStorage.removeItem('oa_strategy_enabled');
    localStorage.removeItem('oa_vcp_fired_signals');
    localStorage.removeItem('oa_liquidity_cache');
  }, FAKE_API_KEY);

  // Single intercept handler for all OpenAlgo API calls
  await page.route('**/api/v1/**', async (route: Route) => {
    const url = route.request().url();
    let body: Record<string, unknown> = {};
    try {
      body = JSON.parse(route.request().postData() || '{}');
    } catch { /* ignore */ }

    // analyzerstatus
    if (url.includes('/analyzerstatus')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            analyze_mode: state.analyzerMode,
            mode: state.analyzerMode ? 'analyze' : 'live',
            total_logs: state.totalLogs,
          },
        }),
      });
    }

    // analyzertoggle
    if (url.includes('/analyzertoggle')) {
      state.analyzerMode = body.mode === true;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            analyze_mode: state.analyzerMode,
            message: `Analyzer mode switched to ${state.analyzerMode ? 'analyze' : 'live'}`,
            mode: state.analyzerMode ? 'analyze' : 'live',
            total_logs: state.totalLogs,
          },
        }),
      });
    }

    // funds
    if (url.includes('/funds')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            availablecash: state.funds,
            collateral: 0,
            m2mrealized: 0,
            m2munrealized: 0,
            utiliseddebits: 0,
          },
        }),
      });
    }

    // placeorder
    if (url.includes('/placeorder')) {
      state.placedOrders.push({
        symbol: String(body.symbol),
        action: String(body.action),
        quantity: Number(body.quantity),
        strategy: body.strategy ? String(body.strategy) : undefined,
      });
      state.totalLogs++;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          orderid: `MOCK-${Date.now()}-${state.placedOrders.length}`,
        }),
      });
    }

    // history (klines) — return enough bars for indicator warmup
    if (url.includes('/history') || url.includes('/intervalhistory')) {
      const bars = Array.from({ length: 200 }, (_, i) => ({
        time: Math.floor(Date.now() / 1000) - (200 - i) * 180,
        open: 100 + i * 0.05,
        high: 100.5 + i * 0.05,
        low: 99.5 + i * 0.05,
        close: 100 + i * 0.05,
        volume: 100000 + (i % 10) * 5000,
      }));
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', data: bars }),
      });
    }

    // ping (keepalive checks etc.)
    if (url.includes('/ping')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success' }),
      });
    }

    // Default — return empty success
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', data: null }),
    });
  });
};

const navigateAndBoot = async (page: Page): Promise<void> => {
  await page.goto('/');

  // Try login button if connection screen shows up
  const loginBtn = page.locator('button:has-text("Login to Dashboard")');
  if (await loginBtn.isVisible().catch(() => false)) {
    await loginBtn.click();
  }

  // Wait for the topbar badges to mount — proof that auth + main render succeeded
  await page.waitForFunction(() => {
    return !!document.body.textContent?.includes('AUTO:');
  }, { timeout: 30_000 });
};

// ==================== TESTS ====================

test.describe('Auto-Trade Pipeline', () => {

  test('badges and panels render after boot', async ({ page }) => {
    const state: MockState = { funds: 10_000_000, placedOrders: [], analyzerMode: true, totalLogs: 0 };
    await installMocks(page, state);
    await navigateAndBoot(page);

    // Both pills should be visible
    await expect(page.locator('text=ANALYZER').first()).toBeVisible();
    await expect(page.locator('text=AUTO:').first()).toBeVisible();

    // Window helpers wired up
    const helpers = await page.evaluate(() => {
      return {
        hasHelpers: !!window.__autoTrade,
        variantCount: window.__autoTrade?.variants.length ?? 0,
      };
    });
    expect(helpers.hasHelpers).toBe(true);
    expect(helpers.variantCount).toBe(8);
  });

  test('auto-trade settings dialog opens, saves, and persists', async ({ page }) => {
    const state: MockState = { funds: 10_000_000, placedOrders: [], analyzerMode: true, totalLogs: 0 };
    await installMocks(page, state);
    await navigateAndBoot(page);

    // Click the AUTO badge to open settings dialog
    await page.locator('button:has-text("AUTO:")').first().click();

    // Dialog should be visible
    await expect(page.locator('text=Auto-Trade Settings')).toBeVisible();

    // Switch to TESTING mode (exact match — there are also "Testing (0.5%...)" buttons)
    await page.getByRole('button', { name: 'TESTING', exact: true }).click();

    // Save
    await page.locator('button:has-text("Save"):not(:has-text("Cancel"))').last().click();

    // Verify config persisted
    const saved = await page.evaluate(() => {
      const raw = localStorage.getItem('oa_autotrade_config');
      return raw ? JSON.parse(raw) : null;
    });
    expect(saved).toMatchObject({ mode: 'testing' });
  });

  test('analyzer toggle calls API and updates badge', async ({ page }) => {
    const state: MockState = { funds: 10_000_000, placedOrders: [], analyzerMode: true, totalLogs: 0 };
    await installMocks(page, state);
    await navigateAndBoot(page);

    // Initial: ANALYZER pill
    await expect(page.locator('text=ANALYZER').first()).toBeVisible();

    // Click → confirm switch to live
    await page.locator('button:has-text("ANALYZER")').first().click();
    await expect(page.locator('text=Switch to LIVE mode?')).toBeVisible();
    await page.locator('button:has-text("Yes, go LIVE")').click();

    // Should now show LIVE pill (next 30s poll, but we set it directly via API)
    await expect(page.locator('button:has-text("LIVE")').first()).toBeVisible({ timeout: 5000 });
    expect(state.analyzerMode).toBe(false);
  });

  test('full pipeline: synthetic VCP signal → orders placed → position opens → SL exit → journal updates', async ({ page }) => {
    const state: MockState = { funds: 10_000_000, placedOrders: [], analyzerMode: true, totalLogs: 0 };
    await installMocks(page, state);
    await navigateAndBoot(page);

    // 1. Configure: testing mode, only enable 2 variants for predictability.
    //    Quality filters are widened so the test can run any time of day and
    //    isn't gated on the (mocked) liquidity numbers.
    await page.evaluate(() => {
      const helpers = window.__autoTrade!;
      const cfg = helpers.config.TESTING_PRESET as Record<string, unknown>;
      const qf = cfg.qualityFilters as Record<string, unknown>;
      helpers.config.saveAutoTradeConfig({
        ...cfg,
        mode: 'testing',
        qualityFilters: {
          ...qf,
          earliestEntry: '00:00',
          latestEntry: '23:59',
          minLiquidityCr: 0,
        },
      });
      // Disable everything except A and D
      for (const v of helpers.variants) {
        helpers.setVariantEnabled(v.id, v.id === 'vcp-A-zone-static' || v.id === 'vcp-D-hybrid-ema');
      }
      helpers.engine.reloadConfig();
      helpers.engine.start();
      // Watchlist has to include the symbol or _refreshTickSubscription ignores it
      helpers.vcpMonitor.setWatchlist([{ symbol: 'TESTCO', exchange: 'NSE' }]);
    });

    // Allow engine + funds refresh to settle
    await page.waitForTimeout(500);

    // 2. Inject a long-breakout VCP scan result
    const inject = await page.evaluate(() => {
      const h = window.__autoTrade!;
      h.injectVCPResults([{
        symbol: 'TESTCO',
        exchange: 'NSE',
        status: 'long_breakout',
        direction: 'long',
        zoneHigh: 105,
        zoneLow: 102,
        c1Time: Math.floor(Date.now() / 1000) - 600,
        c1High: 104,
        c1Low: 101,
        c2Time: Math.floor(Date.now() / 1000) - 300,
        c2High: 105,
        c2Low: 103,
        signalTime: Math.floor(Date.now() / 1000),
        signalText: 'Long Breakout (Delta)',
        entryPrice: 106,
        atr: 1.5,
        ema20: 103.5,
        lastCandleTime: Math.floor(Date.now() / 1000),
      }]);
      // Capture state before exit injection
      return {
        openCount: h.positionStore.getOpenPositions().length,
        ordersPlaced: h.positionStore.getOpenPositions().map((p) => ({
          variantId: p.variantId, qty: p.qty, sl: p.stopLoss,
        })),
      };
    });

    // Allow async _maybeOpenForAllVariants chain to complete (placeOrder mock awaits)
    await page.waitForTimeout(1000);

    const afterOpen = await page.evaluate(() => {
      const h = window.__autoTrade!;
      return {
        openCount: h.positionStore.getOpenPositions().length,
        opens: h.positionStore.getOpenPositions().map((p) => ({
          variantId: p.variantId, symbol: p.symbol, qty: p.qty,
          sl: Math.round(p.stopLoss * 100) / 100,
          entry: p.entryPrice,
        })),
      };
    });

    // 2 enabled variants → 2 orders → 2 positions
    expect(afterOpen.openCount).toBe(2);
    expect(afterOpen.opens.map((o) => o.variantId).sort()).toEqual(
      ['vcp-A-zone-static', 'vcp-D-hybrid-ema'].sort()
    );
    // Both should have qty > 0
    for (const o of afterOpen.opens) expect(o.qty).toBeGreaterThan(0);
    // Variant A SL should be at zoneLow - 0.05 = 101.95
    const variantA = afterOpen.opens.find((o) => o.variantId === 'vcp-A-zone-static')!;
    expect(variantA.sl).toBeCloseTo(101.95, 1);

    // Should have placed 2 entry orders via the mocked placeOrder
    expect(state.placedOrders.length).toBe(2);
    expect(state.placedOrders.every((o) => o.action === 'BUY')).toBe(true);
    expect(state.placedOrders.map((o) => o.strategy).sort()).toEqual(
      ['vcp-A-zone-static', 'vcp-D-hybrid-ema'].sort()
    );

    // 3. Inject a tick that crosses both SLs to force soft-exit
    await page.evaluate(() => {
      const h = window.__autoTrade!;
      // Manually invoke the engine's tick handler by accessing it via the
      // exposed singleton — bypass private member by going through public state.
      // Instead, we inject another scan result that updates ltp implicitly.
      // For SL trigger, use the engine's _onTick path:
      const eng = h.engine as unknown as { _onTick: (t: { symbol: string; exchange: string; last: number }) => void };
      eng._onTick({ symbol: 'TESTCO', exchange: 'NSE', last: 100 });
    });

    // Wait for async close
    await page.waitForTimeout(500);

    const afterExit = await page.evaluate(() => {
      const h = window.__autoTrade!;
      return {
        openCount: h.positionStore.getOpenPositions().length,
        closed: h.positionStore.getClosedToday().map((c) => ({
          variantId: c.variantId, exitReason: c.exitReason, rMultiple: c.rMultiple,
        })),
      };
    });

    expect(afterExit.openCount).toBe(0);
    expect(afterExit.closed.length).toBe(2);
    expect(afterExit.closed.every((c) => c.exitReason === 'sl_hit')).toBe(true);
    // Both should have negative R-multiples (SL hit)
    expect(afterExit.closed.every((c) => c.rMultiple < 0)).toBe(true);

    // 2 close orders should have been placed too — total now 4
    expect(state.placedOrders.length).toBe(4);
    const closes = state.placedOrders.slice(2);
    expect(closes.every((o) => o.action === 'SELL')).toBe(true);

    // 4. Journal & leaderboard should reflect the trades
    const journalState = await page.evaluate(() => {
      const h = window.__autoTrade!;
      const opens = new Map<string, number>();
      for (const p of h.positionStore.getOpenPositions()) {
        opens.set(p.variantId, (opens.get(p.variantId) ?? 0) + 1);
      }
      return {
        entryCount: h.tradeJournal.getAllEntries().length,
        stats: h.tradeJournal.getAllStats(opens),
      };
    });

    expect(journalState.entryCount).toBe(2);
    const variantAStats = journalState.stats.find((s) => s.variantId === 'vcp-A-zone-static')!;
    const variantDStats = journalState.stats.find((s) => s.variantId === 'vcp-D-hybrid-ema')!;
    expect(variantAStats.trades).toBe(1);
    expect(variantDStats.trades).toBe(1);
    expect(variantAStats.totalPnL).toBeLessThan(0); // both lost
    expect(variantDStats.totalPnL).toBeLessThan(0);
  });

  test('quality filter: liquidity gate rejects low-volume symbols', async ({ page }) => {
    const state: MockState = { funds: 10_000_000, placedOrders: [], analyzerMode: true, totalLogs: 0 };
    await installMocks(page, state);

    await navigateAndBoot(page);

    // Seed the liquidity cache directly — far cleaner than mocking the daily
    // klines plumbing. This tests the engine's gate logic in isolation.
    await page.evaluate(() => {
      const h = window.__autoTrade!;
      const cfg = h.config.TESTING_PRESET as Record<string, unknown>;
      const qf = cfg.qualityFilters as Record<string, unknown>;
      h.config.saveAutoTradeConfig({
        ...cfg,
        mode: 'testing',
        qualityFilters: {
          ...qf,
          earliestEntry: '00:00',
          latestEntry: '23:59',
          minLiquidityCr: 50, // 50 Cr threshold
        },
      });
      // Pre-seed cache: ₹10 lakh turnover ≪ ₹50 Cr threshold
      h.seedLiquidity('ILLIQUID', 'NSE', 1_000_000);
      // Only one variant for clarity
      for (const v of h.variants) h.setVariantEnabled(v.id, v.id === 'vcp-A-zone-static');
      h.engine.reloadConfig();
      h.engine.start();
      h.vcpMonitor.setWatchlist([{ symbol: 'ILLIQUID', exchange: 'NSE' }]);
    });

    await page.waitForTimeout(300);

    await page.evaluate(() => {
      window.__autoTrade!.injectVCPResults([{
        symbol: 'ILLIQUID', exchange: 'NSE', status: 'long_breakout', direction: 'long',
        zoneHigh: 105, zoneLow: 102,
        signalTime: Math.floor(Date.now() / 1000), signalText: 'Long Breakout',
        entryPrice: 106, atr: 1.5, ema20: 103.5,
        lastCandleTime: Math.floor(Date.now() / 1000),
      }]);
    });

    // Allow liquidity fetch + filter to complete
    await page.waitForTimeout(2000);

    const result = await page.evaluate(() => ({
      openCount: window.__autoTrade!.positionStore.getOpenPositions().length,
    }));

    // Should have been rejected — 0 positions
    expect(result.openCount).toBe(0);
    expect(state.placedOrders.length).toBe(0);
  });
});

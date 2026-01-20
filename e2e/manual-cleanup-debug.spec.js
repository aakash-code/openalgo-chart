import { test, expect } from '@playwright/test';
import {
    setupChart,
    addIndicator,
    removeIndicator,
    toggleIndicatorVisibility,
    verifyCleanup,
    getSeriesCount,
    getPaneCount,
    setupConsoleTracking,
    verifyNoConsoleErrors
} from '../src/__tests__/integration/indicators/setup/testHelpers.js';

test.describe('Manual Debug - Indicator Cleanup', () => {
    test.setTimeout(300000); // 5 minutes for manual inspection

    test.beforeEach(async ({ page }) => {
        await setupChart(page);
        await setupConsoleTracking(page);
    });

    test('Debug SMA cleanup step-by-step', async ({ page }) => {
        console.log('=== STEP 1: Get initial state ===');
        const initialSeriesCount = await getSeriesCount(page);
        console.log('Initial series count:', initialSeriesCount);

        console.log('=== STEP 2: Add SMA indicator ===');
        const smaId = await addIndicator(page, {
            type: 'sma',
            settings: { period: 20, color: '#FF6D00' }
        });
        console.log('SMA ID:', smaId);

        await page.waitForTimeout(2000); // Wait to see it render

        const afterAddCount = await getSeriesCount(page);
        console.log('Series count after add:', afterAddCount);
        expect(afterAddCount).toBe(initialSeriesCount + 1);

        console.log('=== STEP 3: Hide indicator ===');
        await toggleIndicatorVisibility(page, smaId);
        await page.waitForTimeout(1000);

        // Series still exists but hidden
        const hiddenCount = await getSeriesCount(page);
        console.log('Series count after hide:', hiddenCount);

        console.log('=== STEP 4: Show indicator again ===');
        await toggleIndicatorVisibility(page, smaId);
        await page.waitForTimeout(1000);

        console.log('=== STEP 5: DELETE indicator ===');
        await removeIndicator(page, smaId);
        await page.waitForTimeout(2000); // Wait for cleanup

        const finalSeriesCount = await getSeriesCount(page);
        console.log('Final series count:', finalSeriesCount);
        console.log('Expected:', initialSeriesCount);

        // CRITICAL CHECK
        expect(finalSeriesCount).toBe(initialSeriesCount);

        await verifyNoConsoleErrors(page);
    });

    test('Debug TPO primitive cleanup', async ({ page }) => {
        console.log('=== STEP 1: Add TPO ===');
        const tpoId = await addIndicator(page, {
            type: 'tpo',
            settings: { blockSize: '30m' }
        });

        await page.waitForTimeout(3000); // TPO takes longer to render

        console.log('=== STEP 2: Check primitives attached ===');
        const hasPrimitives = await page.evaluate(() => {
            const container = document.querySelector('.chart-container');
            const primitives = container?.__mainSeriesRef__?._primitives || [];
            return primitives.length > 0;
        });
        console.log('Has primitives:', hasPrimitives);
        expect(hasPrimitives).toBe(true);

        console.log('=== STEP 3: Hide TPO ===');
        await toggleIndicatorVisibility(page, tpoId);
        await page.waitForTimeout(2000);

        console.log('=== STEP 4: DELETE TPO ===');
        await removeIndicator(page, tpoId);
        await page.waitForTimeout(2000);

        console.log('=== STEP 5: Verify primitives detached ===');
        const noPrimitives = await page.evaluate(() => {
            const container = document.querySelector('.chart-container');
            const primitives = container?.__mainSeriesRef__?._primitives || [];
            return primitives.length === 0;
        });
        console.log('Primitives removed:', noPrimitives);
        expect(noPrimitives).toBe(true);

        await verifyNoConsoleErrors(page);
    });

    test('Debug RSI pane + price lines cleanup', async ({ page }) => {
        const initialPaneCount = await getPaneCount(page);

        console.log('=== STEP 1: Add RSI ===');
        const rsiId = await addIndicator(page, {
            type: 'rsi',
            settings: { period: 14, overbought: 70, oversold: 30 }
        });

        await page.waitForTimeout(2000);

        const afterAddPaneCount = await getPaneCount(page);
        console.log('Panes after add:', afterAddPaneCount);
        expect(afterAddPaneCount).toBe(initialPaneCount + 1);

        console.log('=== STEP 2: DELETE RSI ===');
        await removeIndicator(page, rsiId);
        await page.waitForTimeout(2000);

        console.log('=== STEP 3: Verify pane removed ===');
        const finalPaneCount = await getPaneCount(page);
        console.log('Final pane count:', finalPaneCount);
        console.log('Expected:', initialPaneCount);

        expect(finalPaneCount).toBe(initialPaneCount);

        await verifyNoConsoleErrors(page);
    });

    test('Debug Bollinger Bands multi-series cleanup', async ({ page }) => {
        console.log('=== STEP 1: Get initial state ===');
        const initialSeriesCount = await getSeriesCount(page);
        console.log('Initial series count:', initialSeriesCount);

        console.log('=== STEP 2: Add Bollinger Bands ===');
        const bbId = await addIndicator(page, {
            type: 'bollingerBands',
            settings: { period: 20, stdDev: 2 }
        });
        console.log('Bollinger Bands ID:', bbId);

        await page.waitForTimeout(2000);

        const afterAddCount = await getSeriesCount(page);
        console.log('Series count after add:', afterAddCount);
        // Bollinger Bands creates 3 series (upper, middle, lower)
        expect(afterAddCount).toBe(initialSeriesCount + 3);

        console.log('=== STEP 3: DELETE Bollinger Bands ===');
        await removeIndicator(page, bbId);
        await page.waitForTimeout(2000);

        const finalSeriesCount = await getSeriesCount(page);
        console.log('Final series count:', finalSeriesCount);
        console.log('Expected:', initialSeriesCount);

        // CRITICAL: All 3 series should be removed
        expect(finalSeriesCount).toBe(initialSeriesCount);

        await verifyNoConsoleErrors(page);
    });

    test('Debug MACD pane + multi-series cleanup', async ({ page }) => {
        const initialPaneCount = await getPaneCount(page);
        const initialSeriesCount = await getSeriesCount(page);

        console.log('=== STEP 1: Add MACD ===');
        const macdId = await addIndicator(page, {
            type: 'macd',
            settings: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 }
        });

        await page.waitForTimeout(2000);

        const afterAddPaneCount = await getPaneCount(page);
        const afterAddSeriesCount = await getSeriesCount(page);
        console.log('Panes after add:', afterAddPaneCount);
        console.log('Series after add:', afterAddSeriesCount);

        console.log('=== STEP 2: DELETE MACD ===');
        await removeIndicator(page, macdId);
        await page.waitForTimeout(2000);

        const finalPaneCount = await getPaneCount(page);
        const finalSeriesCount = await getSeriesCount(page);
        console.log('Final pane count:', finalPaneCount);
        console.log('Final series count:', finalSeriesCount);

        // Both pane and all series should be removed
        expect(finalPaneCount).toBe(initialPaneCount);
        expect(finalSeriesCount).toBe(initialSeriesCount);

        await verifyNoConsoleErrors(page);
    });

    test('Comprehensive cleanup check - Add multiple indicators', async ({ page }) => {
        console.log('=== STEP 1: Get initial state ===');
        const initialSeriesCount = await getSeriesCount(page);
        const initialPaneCount = await getPaneCount(page);
        console.log('Initial series:', initialSeriesCount, '| Initial panes:', initialPaneCount);

        console.log('=== STEP 2: Add SMA ===');
        const smaId = await addIndicator(page, { type: 'sma', settings: { period: 20 } });
        await page.waitForTimeout(1000);

        console.log('=== STEP 3: Add EMA ===');
        const emaId = await addIndicator(page, { type: 'ema', settings: { period: 50 } });
        await page.waitForTimeout(1000);

        console.log('=== STEP 4: Add RSI ===');
        const rsiId = await addIndicator(page, { type: 'rsi', settings: { period: 14 } });
        await page.waitForTimeout(1000);

        const afterAddSeriesCount = await getSeriesCount(page);
        const afterAddPaneCount = await getPaneCount(page);
        console.log('After adding all:', afterAddSeriesCount, 'series |', afterAddPaneCount, 'panes');

        console.log('=== STEP 5: Remove all indicators ===');
        await removeIndicator(page, smaId);
        await page.waitForTimeout(500);

        await removeIndicator(page, emaId);
        await page.waitForTimeout(500);

        await removeIndicator(page, rsiId);
        await page.waitForTimeout(1000);

        const finalSeriesCount = await getSeriesCount(page);
        const finalPaneCount = await getPaneCount(page);
        console.log('Final:', finalSeriesCount, 'series |', finalPaneCount, 'panes');
        console.log('Expected:', initialSeriesCount, 'series |', initialPaneCount, 'panes');

        // CRITICAL: Everything should be back to initial state
        expect(finalSeriesCount).toBe(initialSeriesCount);
        expect(finalPaneCount).toBe(initialPaneCount);

        await verifyNoConsoleErrors(page);
    });

    test('Debug - Check cleanup infrastructure', async ({ page }) => {
        console.log('=== Checking cleanup infrastructure ===');

        const infrastructure = await page.evaluate(() => {
            const container = document.querySelector('.chart-container');
            return {
                hasChart: !!container?.__chartInstance__,
                hasStore: !!window.__indicatorStore__,
                hasTypesMap: !!container?.__indicatorTypesMap__,
                hasSeriesMap: !!container?.__indicatorSeriesMap__,
                hasMainSeriesRef: !!container?.__mainSeriesRef__
            };
        });

        console.log('Infrastructure check:', infrastructure);

        expect(infrastructure.hasChart).toBe(true);
        expect(infrastructure.hasStore).toBe(true);
        expect(infrastructure.hasTypesMap).toBe(true);
        expect(infrastructure.hasSeriesMap).toBe(true);
        expect(infrastructure.hasMainSeriesRef).toBe(true);
    });
});

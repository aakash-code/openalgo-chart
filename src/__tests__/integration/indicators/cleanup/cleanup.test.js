/**
 * General Cleanup Tests
 * Verifies cleanup system works correctly across different indicator types
 */

import { test, expect } from '@playwright/test';
import {
    setupChart,
    addIndicator,
    removeIndicator,
    verifyCleanup,
    getSeriesCount,
    getPaneCount,
    setupConsoleTracking,
    verifyNoConsoleErrors
} from '../setup/testHelpers';

test.describe('General Indicator Cleanup', () => {
    test.beforeEach(async ({ page }) => {
        await setupChart(page);
        await setupConsoleTracking(page);
    });

    test('should cleanup simple overlay indicators (SMA, EMA)', async ({ page }) => {
        const initialSeriesCount = await getSeriesCount(page);

        const smaId = await addIndicator(page, { type: 'sma', settings: { period: 20 } });
        const emaId = await addIndicator(page, { type: 'ema', settings: { period: 20 } });

        await page.waitForTimeout(500);

        // Verify both added
        const afterAddCount = await getSeriesCount(page);
        expect(afterAddCount).toBe(initialSeriesCount + 2);

        // Remove both
        await removeIndicator(page, smaId);
        await removeIndicator(page, emaId);

        // Verify complete cleanup
        await verifyCleanup(page, {
            seriesCount: initialSeriesCount,
            paneCount: 1
        });

        await verifyNoConsoleErrors(page);
    });

    test('should cleanup multi-series overlay (Bollinger Bands)', async ({ page }) => {
        const initialSeriesCount = await getSeriesCount(page);

        const bbId = await addIndicator(page, {
            type: 'bollingerBands',
            settings: { period: 20, stdDev: 2 }
        });

        await page.waitForTimeout(500);

        // BB creates 3 series
        const afterAddCount = await getSeriesCount(page);
        expect(afterAddCount).toBeGreaterThanOrEqual(initialSeriesCount + 3);

        // Remove BB
        await removeIndicator(page, bbId);

        // Verify all 3 series cleaned up
        await verifyCleanup(page, {
            seriesCount: initialSeriesCount,
            paneCount: 1
        });

        await verifyNoConsoleErrors(page);
    });

    test('should cleanup oscillators with panes (RSI, MACD)', async ({ page }) => {
        const initialPaneCount = await getPaneCount(page);

        const rsiId = await addIndicator(page, { type: 'rsi', settings: { period: 14 } });
        const macdId = await addIndicator(page, {
            type: 'macd',
            settings: { fast: 12, slow: 26, signal: 9 }
        });

        await page.waitForTimeout(500);

        // Verify 2 new panes
        const afterAddPaneCount = await getPaneCount(page);
        expect(afterAddPaneCount).toBe(initialPaneCount + 2);

        // Remove both
        await removeIndicator(page, rsiId);
        await removeIndicator(page, macdId);

        // Verify complete cleanup including panes
        await verifyCleanup(page, {
            paneCount: initialPaneCount
        });

        await verifyNoConsoleErrors(page);
    });

    test('should cleanup mixed indicator types', async ({ page }) => {
        const initialSeriesCount = await getSeriesCount(page);
        const initialPaneCount = await getPaneCount(page);

        // Add variety of indicators
        const smaId = await addIndicator(page, { type: 'sma', settings: { period: 20 } });
        const rsiId = await addIndicator(page, { type: 'rsi', settings: { period: 14 } });
        const bbId = await addIndicator(page, {
            type: 'bollingerBands',
            settings: { period: 20 }
        });

        await page.waitForTimeout(500);

        // Remove all
        await removeIndicator(page, smaId);
        await removeIndicator(page, rsiId);
        await removeIndicator(page, bbId);

        // Verify complete cleanup
        await verifyCleanup(page, {
            seriesCount: initialSeriesCount,
            paneCount: initialPaneCount
        });

        await verifyNoConsoleErrors(page);
    });

    test('should handle cleanup order independence', async ({ page }) => {
        const initialSeriesCount = await getSeriesCount(page);
        const initialPaneCount = await getPaneCount(page);

        const ind1 = await addIndicator(page, { type: 'sma', settings: { period: 20 } });
        const ind2 = await addIndicator(page, { type: 'rsi', settings: { period: 14 } });
        const ind3 = await addIndicator(page, { type: 'macd', settings: {} });

        await page.waitForTimeout(500);

        // Remove in reverse order (should work the same)
        await removeIndicator(page, ind3);
        await removeIndicator(page, ind2);
        await removeIndicator(page, ind1);

        // Verify complete cleanup
        await verifyCleanup(page, {
            seriesCount: initialSeriesCount,
            paneCount: initialPaneCount
        });

        await verifyNoConsoleErrors(page);
    });

    test('should handle rapid cleanup cycles', async ({ page }) => {
        const initialSeriesCount = await getSeriesCount(page);
        const initialPaneCount = await getPaneCount(page);

        for (let i = 0; i < 5; i++) {
            const sma = await addIndicator(page, { type: 'sma', settings: { period: 20 } });
            const rsi = await addIndicator(page, { type: 'rsi', settings: { period: 14 } });

            await page.waitForTimeout(200);

            await removeIndicator(page, sma);
            await removeIndicator(page, rsi);

            await page.waitForTimeout(200);
        }

        // Verify clean state
        await verifyCleanup(page, {
            seriesCount: initialSeriesCount,
            paneCount: initialPaneCount
        });

        await verifyNoConsoleErrors(page);
    });

    test('should cleanup correctly after data updates', async ({ page }) => {
        const initialSeriesCount = await getSeriesCount(page);

        const smaId = await addIndicator(page, { type: 'sma', settings: { period: 20 } });

        await page.waitForTimeout(500);

        // Trigger data update
        await page.evaluate(() => {
            window.dispatchEvent(new Event('resize'));
        });

        await page.waitForTimeout(300);

        // Remove after data update
        await removeIndicator(page, smaId);

        // Verify cleanup still works
        await verifyCleanup(page, {
            seriesCount: initialSeriesCount
        });

        await verifyNoConsoleErrors(page);
    });
});

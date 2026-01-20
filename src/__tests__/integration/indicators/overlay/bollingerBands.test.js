/**
 * E2E Tests for Bollinger Bands Indicator
 * Multi-series indicator with 3 lines: upper, basis, lower
 */

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
    verifyNoConsoleErrors,
    isIndicatorInLegend,
    waitForIndicatorInLegend
} from '../setup/testHelpers';

test.describe('Bollinger Bands Indicator', () => {
    test.beforeEach(async ({ page }) => {
        await setupChart(page);
        await setupConsoleTracking(page);
    });

    test('should render Bollinger Bands with 3 series', async ({ page }) => {
        const initialSeriesCount = await getSeriesCount(page);

        const indicatorId = await addIndicator(page, {
            type: 'bollingerBands',
            settings: { period: 20, stdDev: 2 }
        });

        await page.waitForTimeout(500);

        // Bollinger Bands creates 3 series (upper, basis, lower)
        const newSeriesCount = await getSeriesCount(page);
        expect(newSeriesCount).toBeGreaterThanOrEqual(initialSeriesCount + 3);
        expect(indicatorId).toBeTruthy();
    });

    test('should appear in legend', async ({ page }) => {
        await addIndicator(page, {
            type: 'bollingerBands',
            settings: { period: 20, stdDev: 2 }
        });

        await waitForIndicatorInLegend(page, 'BB');

        const inLegend = await isIndicatorInLegend(page, 'BB');
        expect(inLegend).toBe(true);
    });

    test('should cleanup all 3 series when removed', async ({ page }) => {
        const initialSeriesCount = await getSeriesCount(page);
        const initialPaneCount = await getPaneCount(page);

        const indicatorId = await addIndicator(page, {
            type: 'bollingerBands',
            settings: { period: 20, stdDev: 2 }
        });

        await page.waitForTimeout(500);

        // Verify all series added
        const afterAddCount = await getSeriesCount(page);
        expect(afterAddCount).toBeGreaterThanOrEqual(initialSeriesCount + 3);

        // Remove Bollinger Bands
        await removeIndicator(page, indicatorId);

        // Verify complete cleanup of all 3 series
        await verifyCleanup(page, {
            seriesCount: initialSeriesCount,
            paneCount: initialPaneCount
        });

        await verifyNoConsoleErrors(page);
    });

    test('should support multiple instances', async ({ page }) => {
        const initialSeriesCount = await getSeriesCount(page);

        const bb20 = await addIndicator(page, {
            type: 'bollingerBands',
            settings: { period: 20, stdDev: 2 }
        });

        await page.waitForTimeout(300);

        const bb50 = await addIndicator(page, {
            type: 'bollingerBands',
            settings: { period: 50, stdDev: 2.5 }
        });

        await page.waitForTimeout(300);

        // Should have 6 new series (3 per BB)
        const finalSeriesCount = await getSeriesCount(page);
        expect(finalSeriesCount).toBeGreaterThanOrEqual(initialSeriesCount + 6);

        await removeIndicator(page, bb20);
        await page.waitForTimeout(300);

        // Should remove first 3 series
        const afterRemoveCount = await getSeriesCount(page);
        expect(afterRemoveCount).toBeGreaterThanOrEqual(initialSeriesCount + 3);

        await removeIndicator(page, bb50);
    });

    test('should handle visibility toggle for all series', async ({ page }) => {
        const indicatorId = await addIndicator(page, {
            type: 'bollingerBands',
            settings: { period: 20, stdDev: 2 }
        });

        await page.waitForTimeout(500);

        await toggleIndicatorVisibility(page, indicatorId);
        await page.waitForTimeout(300);

        // All 3 series should be hidden
        const allHidden = await page.evaluate(() => {
            const container = document.querySelector('.chart-container');
            if (container && container.__chartInstance__) {
                const series = container.__chartInstance__.series();
                // Check last 3 series (BB series)
                const lastThree = series.slice(-3);
                return lastThree.every(s => s.options?.visible === false);
            }
            return false;
        });

        expect(allHidden).toBe(true);
    });

    test('should update when settings change', async ({ page }) => {
        const indicatorId = await addIndicator(page, {
            type: 'bollingerBands',
            settings: { period: 20, stdDev: 2 }
        });

        await page.waitForTimeout(500);

        await page.evaluate((id) => {
            if (window.__indicatorStore__) {
                window.__indicatorStore__.getState().updateIndicator(id, {
                    period: 50,
                    stdDev: 3
                });
            }
        }, indicatorId);

        await page.waitForTimeout(500);

        // Verify update (check legend for new period)
        const has50 = await isIndicatorInLegend(page, '50');
        expect(has50).toBe(true);
    });
});

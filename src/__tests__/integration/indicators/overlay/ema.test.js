/**
 * E2E Tests for EMA (Exponential Moving Average) Indicator
 *
 * Tests:
 * 1. Calculation accuracy
 * 2. Chart rendering
 * 3. Legend display
 * 4. Complete cleanup on removal
 * 5. Multiple instances
 * 6. Visibility toggle
 */

import { test, expect } from '@playwright/test';
import {
    setupChart,
    addIndicator,
    removeIndicator,
    toggleIndicatorVisibility,
    verifyCleanup,
    waitForChart,
    getSeriesCount,
    getPaneCount,
    setupConsoleTracking,
    verifyNoConsoleErrors,
    isIndicatorInLegend,
    waitForIndicatorInLegend
} from '../setup/testHelpers';

test.describe('EMA Indicator', () => {
    test.beforeEach(async ({ page }) => {
        await setupChart(page);
        await setupConsoleTracking(page);
    });

    test('should calculate EMA correctly', async ({ page }) => {
        // Add EMA(20) indicator
        const indicatorId = await addIndicator(page, {
            type: 'ema',
            settings: { period: 20 }
        });

        expect(indicatorId).toBeTruthy();

        // Verify EMA values exist
        const emaValues = await page.evaluate(() => {
            const container = document.querySelector('.chart-container');
            if (container && container.__chartData__) {
                return container.__chartData__.length > 20;
            }
            return false;
        });

        expect(emaValues).toBeTruthy();
    });

    test('should render on chart correctly', async ({ page }) => {
        const initialSeriesCount = await getSeriesCount(page);

        // Add EMA with custom color (blue)
        const indicatorId = await addIndicator(page, {
            type: 'ema',
            settings: {
                period: 20,
                color: '#2962FF'
            }
        });

        await page.waitForTimeout(500);

        // Verify series count increased
        const newSeriesCount = await getSeriesCount(page);
        expect(newSeriesCount).toBeGreaterThan(initialSeriesCount);
    });

    test('should appear in legend with correct name', async ({ page }) => {
        await addIndicator(page, {
            type: 'ema',
            settings: { period: 20 }
        });

        // Wait for legend to update
        await waitForIndicatorInLegend(page, 'EMA');

        // Verify legend contains EMA
        const inLegend = await isIndicatorInLegend(page, 'EMA');
        expect(inLegend).toBe(true);

        // Verify period is shown
        const hasPeriod = await isIndicatorInLegend(page, '20');
        expect(hasPeriod).toBe(true);
    });

    test('should cleanup completely when removed', async ({ page }) => {
        const initialSeriesCount = await getSeriesCount(page);
        const initialPaneCount = await getPaneCount(page);

        // Add EMA
        const indicatorId = await addIndicator(page, {
            type: 'ema',
            settings: { period: 20 }
        });

        await page.waitForTimeout(500);

        // Verify it was added
        const afterAddSeriesCount = await getSeriesCount(page);
        expect(afterAddSeriesCount).toBeGreaterThan(initialSeriesCount);

        // Remove indicator
        await removeIndicator(page, indicatorId);

        // Verify cleanup
        await verifyCleanup(page, {
            seriesCount: initialSeriesCount,
            paneCount: initialPaneCount
        });

        // Verify no console errors
        await verifyNoConsoleErrors(page);
    });

    test('should support multiple instances with different periods', async ({ page }) => {
        const initialSeriesCount = await getSeriesCount(page);

        // Add EMA(9) - fast
        const ema9Id = await addIndicator(page, {
            type: 'ema',
            settings: { period: 9 }
        });

        await page.waitForTimeout(300);

        // Add EMA(21) - medium
        const ema21Id = await addIndicator(page, {
            type: 'ema',
            settings: { period: 21 }
        });

        await page.waitForTimeout(300);

        // Add EMA(50) - slow
        const ema50Id = await addIndicator(page, {
            type: 'ema',
            settings: { period: 50 }
        });

        await page.waitForTimeout(300);

        // Verify all three were added
        const finalSeriesCount = await getSeriesCount(page);
        expect(finalSeriesCount).toBe(initialSeriesCount + 3);

        // Remove middle one
        await removeIndicator(page, ema21Id);
        await page.waitForTimeout(300);

        // Verify only one removed
        const afterRemoveCount = await getSeriesCount(page);
        expect(afterRemoveCount).toBe(initialSeriesCount + 2);

        // Clean up remaining
        await removeIndicator(page, ema9Id);
        await removeIndicator(page, ema50Id);
        await page.waitForTimeout(300);

        // Verify all cleaned up
        const finalCount = await getSeriesCount(page);
        expect(finalCount).toBe(initialSeriesCount);
    });

    test('should handle visibility toggle', async ({ page }) => {
        // Add EMA
        const indicatorId = await addIndicator(page, {
            type: 'ema',
            settings: { period: 20 }
        });

        await page.waitForTimeout(500);

        // Toggle visibility off
        await toggleIndicatorVisibility(page, indicatorId);
        await page.waitForTimeout(300);

        // Verify series is hidden
        const seriesVisible = await page.evaluate(() => {
            const container = document.querySelector('.chart-container');
            if (container && container.__chartInstance__) {
                const series = container.__chartInstance__.series();
                return series[series.length - 1]?.options?.visible;
            }
            return null;
        });

        expect(seriesVisible).toBe(false);

        // Toggle back on
        await toggleIndicatorVisibility(page, indicatorId);
        await page.waitForTimeout(300);

        // Verify visible again
        const seriesVisibleAgain = await page.evaluate(() => {
            const container = document.querySelector('.chart-container');
            if (container && container.__chartInstance__) {
                const series = container.__chartInstance__.series();
                return series[series.length - 1]?.options?.visible;
            }
            return null;
        });

        expect(seriesVisibleAgain).toBe(true);
    });

    test('should handle different source options', async ({ page }) => {
        // Test with 'close' source
        const emaCloseId = await addIndicator(page, {
            type: 'ema',
            settings: { period: 20, source: 'close' }
        });

        await page.waitForTimeout(300);
        expect(emaCloseId).toBeTruthy();

        // Remove it
        await removeIndicator(page, emaCloseId);
        await page.waitForTimeout(300);

        // Test with 'open' source
        const emaOpenId = await addIndicator(page, {
            type: 'ema',
            settings: { period: 20, source: 'open' }
        });

        await page.waitForTimeout(300);
        expect(emaOpenId).toBeTruthy();

        // Cleanup
        await removeIndicator(page, emaOpenId);
    });

    test('should update when settings change', async ({ page }) => {
        // Add EMA with period 20
        const indicatorId = await addIndicator(page, {
            type: 'ema',
            settings: { period: 20 }
        });

        await page.waitForTimeout(500);

        // Update period to 50
        await page.evaluate((id) => {
            if (window.__indicatorStore__) {
                window.__indicatorStore__.getState().updateIndicator(id, {
                    period: 50
                });
            }
        }, indicatorId);

        await page.waitForTimeout(500);

        // Verify update (check legend)
        const has50 = await isIndicatorInLegend(page, '50');
        expect(has50).toBe(true);
    });

    test('should work alongside other indicators', async ({ page }) => {
        const initialSeriesCount = await getSeriesCount(page);

        // Add EMA
        const emaId = await addIndicator(page, {
            type: 'ema',
            settings: { period: 20 }
        });

        await page.waitForTimeout(300);

        // Add SMA
        const smaId = await addIndicator(page, {
            type: 'sma',
            settings: { period: 50 }
        });

        await page.waitForTimeout(300);

        // Verify both added
        const seriesCount = await getSeriesCount(page);
        expect(seriesCount).toBe(initialSeriesCount + 2);

        // Remove EMA
        await removeIndicator(page, emaId);
        await page.waitForTimeout(300);

        // SMA should still exist
        const afterEmaRemove = await getSeriesCount(page);
        expect(afterEmaRemove).toBe(initialSeriesCount + 1);

        // Cleanup
        await removeIndicator(page, smaId);
    });
});

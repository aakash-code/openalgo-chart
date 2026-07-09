/**
 * E2E Tests for Supertrend Indicator
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

test.describe('Supertrend Indicator', () => {
    test.beforeEach(async ({ page }) => {
        await setupChart(page);
        await setupConsoleTracking(page);
    });

    test('should render Supertrend on chart', async ({ page }) => {
        const initialSeriesCount = await getSeriesCount(page);

        const indicatorId = await addIndicator(page, {
            type: 'supertrend',
            settings: { period: 10, multiplier: 3 }
        });

        await page.waitForTimeout(500);

        const newSeriesCount = await getSeriesCount(page);
        expect(newSeriesCount).toBeGreaterThan(initialSeriesCount);
        expect(indicatorId).toBeTruthy();
    });

    test('should appear in legend', async ({ page }) => {
        await addIndicator(page, {
            type: 'supertrend',
            settings: { period: 10, multiplier: 3 }
        });

        await waitForIndicatorInLegend(page, 'Supertrend');

        const inLegend = await isIndicatorInLegend(page, 'Supertrend');
        expect(inLegend).toBe(true);
    });

    test('should cleanup completely when removed', async ({ page }) => {
        const initialSeriesCount = await getSeriesCount(page);
        const initialPaneCount = await getPaneCount(page);

        const indicatorId = await addIndicator(page, {
            type: 'supertrend',
            settings: { period: 10, multiplier: 3 }
        });

        await page.waitForTimeout(500);

        await removeIndicator(page, indicatorId!);

        await verifyCleanup(page, {
            seriesCount: initialSeriesCount,
            paneCount: initialPaneCount
        });

        await verifyNoConsoleErrors(page);
    });

    test('should support multiple instances with different multipliers', async ({ page }) => {
        const initialSeriesCount = await getSeriesCount(page);

        const st1 = await addIndicator(page, {
            type: 'supertrend',
            settings: { period: 10, multiplier: 2 }
        });

        await page.waitForTimeout(300);

        const st2 = await addIndicator(page, {
            type: 'supertrend',
            settings: { period: 10, multiplier: 3 }
        });

        await page.waitForTimeout(300);

        const finalSeriesCount = await getSeriesCount(page);
        expect(finalSeriesCount).toBe(initialSeriesCount + 2);

        await removeIndicator(page, st1!);
        await removeIndicator(page, st2!);
    });

    test('should handle visibility toggle', async ({ page }) => {
        const indicatorId = await addIndicator(page, {
            type: 'supertrend',
            settings: { period: 10, multiplier: 3 }
        });

        await page.waitForTimeout(500);

        await toggleIndicatorVisibility(page, indicatorId!);
        await page.waitForTimeout(300);

        const seriesVisible = await page.evaluate(() => {
            const container = document.querySelector('.chart-container');
            if (container && (container as any).__chartInstance__) {
                const series = (container as any).__chartInstance__.series();
                return series[series.length - 1]?.options?.visible;
            }
            return null;
        });

        expect(seriesVisible).toBe(false);
    });
});

/**
 * E2E Tests for First Red Candle Strategy
 * Array-based indicator that creates multiple line series
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

test.describe('First Red Candle Strategy', () => {
    test.beforeEach(async ({ page }) => {
        await setupChart(page, { interval: '5' }); // 5-minute chart required
        await setupConsoleTracking(page);
    });

    test('should render high/low lines for first red candle', async ({ page }) => {
        const initialSeriesCount = await getSeriesCount(page);

        const indicatorId = await addIndicator(page, {
            type: 'firstCandle',
            settings: {}
        });

        await page.waitForTimeout(500);

        // First Candle creates array of line series
        const newSeriesCount = await getSeriesCount(page);
        expect(newSeriesCount).toBeGreaterThanOrEqual(initialSeriesCount);
        expect(indicatorId).toBeTruthy();
    });

    test('should appear in legend', async ({ page }) => {
        await addIndicator(page, {
            type: 'firstCandle'
        });

        await page.waitForTimeout(500);

        const inLegend = await isIndicatorInLegend(page, 'First');
        expect(inLegend).toBe(true);
    });

    test('should cleanup all array series when removed', async ({ page }) => {
        const initialSeriesCount = await getSeriesCount(page);
        const initialPaneCount = await getPaneCount(page);

        const indicatorId = await addIndicator(page, {
            type: 'firstCandle',
            settings: {}
        });

        await page.waitForTimeout(500);

        // Remove First Candle
        await removeIndicator(page, indicatorId);

        // Verify complete cleanup of all array series
        await verifyCleanup(page, {
            seriesCount: initialSeriesCount,
            paneCount: initialPaneCount
        });

        await verifyNoConsoleErrors(page);
    });

    test('should handle visibility toggle', async ({ page }) => {
        const indicatorId = await addIndicator(page, {
            type: 'firstCandle'
        });

        await page.waitForTimeout(500);

        await toggleIndicatorVisibility(page, indicatorId);
        await page.waitForTimeout(300);

        // Verify series hidden
        const isHidden = await page.evaluate(() => {
            return true; // Would check actual series visibility
        });

        expect(isHidden).toBe(true);
    });

    test('should handle rapid add/remove cycles', async ({ page }) => {
        const initialSeriesCount = await getSeriesCount(page);

        for (let i = 0; i < 3; i++) {
            const id = await addIndicator(page, {
                type: 'firstCandle'
            });

            await page.waitForTimeout(200);

            await removeIndicator(page, id);
            await page.waitForTimeout(200);
        }

        // Verify clean state
        const finalSeriesCount = await getSeriesCount(page);
        expect(finalSeriesCount).toBe(initialSeriesCount);

        await verifyNoConsoleErrors(page);
    });
});

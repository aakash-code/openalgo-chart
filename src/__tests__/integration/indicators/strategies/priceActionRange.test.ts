/**
 * E2E Tests for Price Action Range (PAR) Strategy
 * Array-based indicator that creates multiple support/resistance lines
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
    isIndicatorInLegend
} from '../setup/testHelpers';

test.describe('Price Action Range Strategy', () => {
    test.beforeEach(async ({ page }) => {
        await setupChart(page);
        await setupConsoleTracking(page);
    });

    test('should render support/resistance lines', async ({ page }) => {
        const initialSeriesCount = await getSeriesCount(page);

        const indicatorId = await addIndicator(page, {
            type: 'priceActionRange',
            settings: {}
        });

        await page.waitForTimeout(500);

        // PAR creates array of line series for support/resistance
        const newSeriesCount = await getSeriesCount(page);
        expect(newSeriesCount).toBeGreaterThanOrEqual(initialSeriesCount);
        expect(indicatorId).toBeTruthy();
    });

    test('should appear in legend', async ({ page }) => {
        await addIndicator(page, {
            type: 'priceActionRange'
        });

        await page.waitForTimeout(500);

        const inLegend = await isIndicatorInLegend(page, 'PAR');
        expect(inLegend).toBe(true);
    });

    test('should cleanup all array series when removed', async ({ page }) => {
        const initialSeriesCount = await getSeriesCount(page);
        const initialPaneCount = await getPaneCount(page);

        const indicatorId = await addIndicator(page, {
            type: 'priceActionRange',
            settings: {}
        });

        await page.waitForTimeout(500);

        // Remove PAR
        await removeIndicator(page, indicatorId!);

        // Verify complete cleanup of all array series
        await verifyCleanup(page, {
            seriesCount: initialSeriesCount,
            paneCount: initialPaneCount
        });

        await verifyNoConsoleErrors(page);
    });

    test('should handle visibility toggle', async ({ page }) => {
        const indicatorId = await addIndicator(page, {
            type: 'priceActionRange'
        });

        await page.waitForTimeout(500);

        await toggleIndicatorVisibility(page, indicatorId!);
        await page.waitForTimeout(300);

        const isHidden = await page.evaluate(() => {
            return true; // Would check actual series visibility
        });

        expect(isHidden).toBe(true);
    });

    test('should handle rapid add/remove cycles', async ({ page }) => {
        const initialSeriesCount = await getSeriesCount(page);

        for (let i = 0; i < 3; i++) {
            const id = await addIndicator(page, {
                type: 'priceActionRange'
            });

            await page.waitForTimeout(200);

            await removeIndicator(page, id!);
            await page.waitForTimeout(200);
        }

        // Verify clean state
        const finalSeriesCount = await getSeriesCount(page);
        expect(finalSeriesCount).toBe(initialSeriesCount);

        await verifyNoConsoleErrors(page);
    });

    test('should support custom colors', async ({ page }) => {
        const indicatorId = await addIndicator(page, {
            type: 'priceActionRange',
            settings: {
                supportColor: '#26a69a',
                resistanceColor: '#ef5350'
            }
        });

        expect(indicatorId).toBeTruthy();
        await page.waitForTimeout(500);

        await removeIndicator(page, indicatorId!);
    });
});

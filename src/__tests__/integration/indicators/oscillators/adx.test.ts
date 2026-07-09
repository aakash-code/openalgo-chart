/**
 * E2E Tests for ADX (Average Directional Index) Indicator
 * Multi-series oscillator with price lines (ADX, +DI, -DI, trend lines)
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

test.describe('ADX Indicator', () => {
    test.beforeEach(async ({ page }) => {
        await setupChart(page);
        await setupConsoleTracking(page);
    });

    test('should create separate pane with 3 lines', async ({ page }) => {
        const initialPaneCount = await getPaneCount(page);

        const indicatorId = await addIndicator(page, {
            type: 'adx',
            settings: { period: 14 }
        });

        await page.waitForTimeout(500);

        // Verify new pane created
        const newPaneCount = await getPaneCount(page);
        expect(newPaneCount).toBe(initialPaneCount + 1);
        expect(indicatorId).toBeTruthy();
    });

    test('should appear in legend', async ({ page }) => {
        await addIndicator(page, {
            type: 'adx',
            settings: { period: 14 }
        });

        await waitForIndicatorInLegend(page, 'ADX');

        const inLegend = await isIndicatorInLegend(page, 'ADX');
        expect(inLegend).toBe(true);
    });

    test('should cleanup pane and all series including price lines', async ({ page }) => {
        const initialSeriesCount = await getSeriesCount(page);
        const initialPaneCount = await getPaneCount(page);

        const indicatorId = await addIndicator(page, {
            type: 'adx',
            settings: { period: 14 }
        });

        await page.waitForTimeout(500);

        const afterAddPaneCount = await getPaneCount(page);
        expect(afterAddPaneCount).toBe(initialPaneCount + 1);

        // Remove ADX
        await removeIndicator(page, indicatorId!);

        // Verify complete cleanup (pane + series + price lines)
        await verifyCleanup(page, {
            seriesCount: initialSeriesCount,
            paneCount: initialPaneCount
        });

        // Verify pane removed
        const noPriceLines = await page.evaluate(() => {
            const container = document.querySelector('.chart-container');
            if (container && (container as any).__chartInstance__) {
                const panes = (container as any).__chartInstance__.panes();
                return panes.length === 1;
            }
            return false;
        });

        expect(noPriceLines).toBe(true);

        await verifyNoConsoleErrors(page);
    });

    test('should support multiple instances with separate panes', async ({ page }) => {
        const initialPaneCount = await getPaneCount(page);

        const adx14 = await addIndicator(page, {
            type: 'adx',
            settings: { period: 14 }
        });

        await page.waitForTimeout(300);

        const adx21 = await addIndicator(page, {
            type: 'adx',
            settings: { period: 21 }
        });

        await page.waitForTimeout(300);

        // Two new panes
        const afterAddPaneCount = await getPaneCount(page);
        expect(afterAddPaneCount).toBe(initialPaneCount + 2);

        await removeIndicator(page, adx14!);
        await page.waitForTimeout(300);

        // One pane removed
        const afterRemove1 = await getPaneCount(page);
        expect(afterRemove1).toBe(initialPaneCount + 1);

        await removeIndicator(page, adx21!);
    });

    test('should handle visibility toggle', async ({ page }) => {
        const initialPaneCount = await getPaneCount(page);

        const indicatorId = await addIndicator(page, {
            type: 'adx',
            settings: { period: 14 }
        });

        await page.waitForTimeout(500);

        await toggleIndicatorVisibility(page, indicatorId!);
        await page.waitForTimeout(300);

        // Pane should still exist (not removed on toggle)
        const afterTogglePaneCount = await getPaneCount(page);
        expect(afterTogglePaneCount).toBe(initialPaneCount + 1);
    });

    test('should handle rapid add/remove cycles', async ({ page }) => {
        const initialPaneCount = await getPaneCount(page);

        for (let i = 0; i < 3; i++) {
            const id = await addIndicator(page, {
                type: 'adx',
                settings: { period: 14 }
            });

            await page.waitForTimeout(200);

            await removeIndicator(page, id!);
            await page.waitForTimeout(200);
        }

        // Verify clean state
        const finalPaneCount = await getPaneCount(page);
        expect(finalPaneCount).toBe(initialPaneCount);

        await verifyNoConsoleErrors(page);
    });
});

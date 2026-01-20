/**
 * E2E Tests for MACD (Moving Average Convergence Divergence)
 * Multi-series oscillator with separate pane (MACD line, signal line, histogram)
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

test.describe('MACD Indicator', () => {
    test.beforeEach(async ({ page }) => {
        await setupChart(page);
        await setupConsoleTracking(page);
    });

    test('should create separate pane with MACD, signal, and histogram', async ({ page }) => {
        const initialPaneCount = await getPaneCount(page);

        const indicatorId = await addIndicator(page, {
            type: 'macd',
            settings: {
                fast: 12,
                slow: 26,
                signal: 9
            }
        });

        await page.waitForTimeout(500);

        // Verify new pane created
        const newPaneCount = await getPaneCount(page);
        expect(newPaneCount).toBe(initialPaneCount + 1);
        expect(indicatorId).toBeTruthy();
    });

    test('should appear in legend', async ({ page }) => {
        await addIndicator(page, {
            type: 'macd',
            settings: { fast: 12, slow: 26, signal: 9 }
        });

        await waitForIndicatorInLegend(page, 'MACD');

        const inLegend = await isIndicatorInLegend(page, 'MACD');
        expect(inLegend).toBe(true);
    });

    test('should cleanup pane and all series when removed', async ({ page }) => {
        const initialSeriesCount = await getSeriesCount(page);
        const initialPaneCount = await getPaneCount(page);

        const indicatorId = await addIndicator(page, {
            type: 'macd',
            settings: { fast: 12, slow: 26, signal: 9 }
        });

        await page.waitForTimeout(500);

        const afterAddPaneCount = await getPaneCount(page);
        expect(afterAddPaneCount).toBe(initialPaneCount + 1);

        // Remove MACD
        await removeIndicator(page, indicatorId);

        // Verify complete cleanup (pane + all 3 series)
        await verifyCleanup(page, {
            seriesCount: initialSeriesCount,
            paneCount: initialPaneCount
        });

        await verifyNoConsoleErrors(page);
    });

    test('should support multiple instances with separate panes', async ({ page }) => {
        const initialPaneCount = await getPaneCount(page);

        const macd1 = await addIndicator(page, {
            type: 'macd',
            settings: { fast: 12, slow: 26, signal: 9 }
        });

        await page.waitForTimeout(300);

        const macd2 = await addIndicator(page, {
            type: 'macd',
            settings: { fast: 8, slow: 21, signal: 5 }
        });

        await page.waitForTimeout(300);

        // Two new panes
        const afterAddPaneCount = await getPaneCount(page);
        expect(afterAddPaneCount).toBe(initialPaneCount + 2);

        await removeIndicator(page, macd1);
        await page.waitForTimeout(300);

        // One pane removed
        const afterRemove1 = await getPaneCount(page);
        expect(afterRemove1).toBe(initialPaneCount + 1);

        await removeIndicator(page, macd2);
    });

    test('should handle visibility toggle', async ({ page }) => {
        const initialPaneCount = await getPaneCount(page);

        const indicatorId = await addIndicator(page, {
            type: 'macd',
            settings: { fast: 12, slow: 26, signal: 9 }
        });

        await page.waitForTimeout(500);

        await toggleIndicatorVisibility(page, indicatorId);
        await page.waitForTimeout(300);

        // Pane should still exist
        const afterTogglePaneCount = await getPaneCount(page);
        expect(afterTogglePaneCount).toBe(initialPaneCount + 1);
    });

    test('should handle rapid add/remove cycles', async ({ page }) => {
        const initialPaneCount = await getPaneCount(page);

        for (let i = 0; i < 3; i++) {
            const id = await addIndicator(page, {
                type: 'macd',
                settings: { fast: 12, slow: 26, signal: 9 }
            });

            await page.waitForTimeout(200);

            await removeIndicator(page, id);
            await page.waitForTimeout(200);
        }

        // Verify clean state
        const finalPaneCount = await getPaneCount(page);
        expect(finalPaneCount).toBe(initialPaneCount);

        await verifyNoConsoleErrors(page);
    });
});

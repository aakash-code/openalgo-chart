/**
 * E2E Tests for ATR (Average True Range) Indicator
 * Simple oscillator with separate pane
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

test.describe('ATR Indicator', () => {
    test.beforeEach(async ({ page }) => {
        await setupChart(page);
        await setupConsoleTracking(page);
    });

    test('should create separate pane', async ({ page }) => {
        const initialPaneCount = await getPaneCount(page);

        const indicatorId = await addIndicator(page, {
            type: 'atr',
            settings: { period: 14 }
        });

        await page.waitForTimeout(500);

        const newPaneCount = await getPaneCount(page);
        expect(newPaneCount).toBe(initialPaneCount + 1);
        expect(indicatorId).toBeTruthy();
    });

    test('should appear in legend', async ({ page }) => {
        await addIndicator(page, {
            type: 'atr',
            settings: { period: 14 }
        });

        await waitForIndicatorInLegend(page, 'ATR');

        const inLegend = await isIndicatorInLegend(page, 'ATR');
        expect(inLegend).toBe(true);
    });

    test('should cleanup pane when removed', async ({ page }) => {
        const initialSeriesCount = await getSeriesCount(page);
        const initialPaneCount = await getPaneCount(page);

        const indicatorId = await addIndicator(page, {
            type: 'atr',
            settings: { period: 14 }
        });

        await page.waitForTimeout(500);

        await removeIndicator(page, indicatorId);

        await verifyCleanup(page, {
            seriesCount: initialSeriesCount,
            paneCount: initialPaneCount
        });

        await verifyNoConsoleErrors(page);
    });

    test('should support multiple instances', async ({ page }) => {
        const initialPaneCount = await getPaneCount(page);

        const atr14 = await addIndicator(page, {
            type: 'atr',
            settings: { period: 14 }
        });

        await page.waitForTimeout(300);

        const atr21 = await addIndicator(page, {
            type: 'atr',
            settings: { period: 21 }
        });

        await page.waitForTimeout(300);

        const afterAddPaneCount = await getPaneCount(page);
        expect(afterAddPaneCount).toBe(initialPaneCount + 2);

        await removeIndicator(page, atr14);
        await removeIndicator(page, atr21);
    });

    test('should handle visibility toggle', async ({ page }) => {
        const initialPaneCount = await getPaneCount(page);

        const indicatorId = await addIndicator(page, {
            type: 'atr',
            settings: { period: 14 }
        });

        await page.waitForTimeout(500);

        await toggleIndicatorVisibility(page, indicatorId);
        await page.waitForTimeout(300);

        // Pane should still exist
        const afterTogglePaneCount = await getPaneCount(page);
        expect(afterTogglePaneCount).toBe(initialPaneCount + 1);
    });
});

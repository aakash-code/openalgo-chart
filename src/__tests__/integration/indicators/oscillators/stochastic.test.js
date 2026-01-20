/**
 * E2E Tests for Stochastic Oscillator
 * Multi-series oscillator with separate pane (%K and %D lines)
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

test.describe('Stochastic Oscillator', () => {
    test.beforeEach(async ({ page }) => {
        await setupChart(page);
        await setupConsoleTracking(page);
    });

    test('should create separate pane with K and D lines', async ({ page }) => {
        const initialPaneCount = await getPaneCount(page);

        const indicatorId = await addIndicator(page, {
            type: 'stochastic',
            settings: {
                kPeriod: 14,
                dPeriod: 3,
                smooth: 3
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
            type: 'stochastic',
            settings: { kPeriod: 14 }
        });

        await waitForIndicatorInLegend(page, 'Stochastic');

        const inLegend = await isIndicatorInLegend(page, 'Stochastic');
        expect(inLegend).toBe(true);
    });

    test('should cleanup pane and both series when removed', async ({ page }) => {
        const initialSeriesCount = await getSeriesCount(page);
        const initialPaneCount = await getPaneCount(page);

        const indicatorId = await addIndicator(page, {
            type: 'stochastic',
            settings: { kPeriod: 14, dPeriod: 3 }
        });

        await page.waitForTimeout(500);

        const afterAddPaneCount = await getPaneCount(page);
        expect(afterAddPaneCount).toBe(initialPaneCount + 1);

        // Remove Stochastic
        await removeIndicator(page, indicatorId);

        // Verify complete cleanup
        await verifyCleanup(page, {
            seriesCount: initialSeriesCount,
            paneCount: initialPaneCount
        });

        await verifyNoConsoleErrors(page);
    });

    test('should support multiple instances with separate panes', async ({ page }) => {
        const initialPaneCount = await getPaneCount(page);

        const stoch1 = await addIndicator(page, {
            type: 'stochastic',
            settings: { kPeriod: 14 }
        });

        await page.waitForTimeout(300);

        const stoch2 = await addIndicator(page, {
            type: 'stochastic',
            settings: { kPeriod: 21 }
        });

        await page.waitForTimeout(300);

        // Two new panes
        const afterAddPaneCount = await getPaneCount(page);
        expect(afterAddPaneCount).toBe(initialPaneCount + 2);

        await removeIndicator(page, stoch1);
        await removeIndicator(page, stoch2);
    });

    test('should handle visibility toggle', async ({ page }) => {
        const initialPaneCount = await getPaneCount(page);

        const indicatorId = await addIndicator(page, {
            type: 'stochastic',
            settings: { kPeriod: 14 }
        });

        await page.waitForTimeout(500);

        await toggleIndicatorVisibility(page, indicatorId);
        await page.waitForTimeout(300);

        // Pane should still exist
        const afterTogglePaneCount = await getPaneCount(page);
        expect(afterTogglePaneCount).toBe(initialPaneCount + 1);
    });
});

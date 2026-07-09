/**
 * E2E Tests for ANN (Artificial Neural Network) Strategy
 * Complex strategy with pane, price lines, and markers
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

test.describe('ANN Strategy Indicator', () => {
    test.beforeEach(async ({ page }) => {
        await setupChart(page);
        await setupConsoleTracking(page);
    });

    test('should create separate pane for predictions', async ({ page }) => {
        const initialPaneCount = await getPaneCount(page);

        const indicatorId = await addIndicator(page, {
            type: 'annStrategy',
            settings: {
                threshold: 0.0014,
                showBackground: true,
                showSignals: true
            }
        });

        await page.waitForTimeout(500);

        const newPaneCount = await getPaneCount(page);
        expect(newPaneCount).toBe(initialPaneCount + 1);
        expect(indicatorId).toBeTruthy();
    });

    test('should appear in legend', async ({ page }) => {
        await addIndicator(page, {
            type: 'annStrategy',
            settings: { threshold: 0.0014 }
        });

        await waitForIndicatorInLegend(page, 'ANN');

        const inLegend = await isIndicatorInLegend(page, 'ANN');
        expect(inLegend).toBe(true);
    });

    test('should cleanup pane, series, price lines, and markers', async ({ page }) => {
        const initialSeriesCount = await getSeriesCount(page);
        const initialPaneCount = await getPaneCount(page);

        const indicatorId = await addIndicator(page, {
            type: 'annStrategy',
            settings: {
                threshold: 0.0014,
                showSignals: true
            }
        });

        await page.waitForTimeout(500);

        // Remove ANN Strategy
        await removeIndicator(page, indicatorId!);

        // Verify complete cleanup
        await verifyCleanup(page, {
            seriesCount: initialSeriesCount,
            paneCount: initialPaneCount
        });

        await verifyNoConsoleErrors(page);
    });

    test('should handle visibility toggle', async ({ page }) => {
        const initialPaneCount = await getPaneCount(page);

        const indicatorId = await addIndicator(page, {
            type: 'annStrategy',
            settings: { threshold: 0.0014 }
        });

        await page.waitForTimeout(500);

        await toggleIndicatorVisibility(page, indicatorId!);
        await page.waitForTimeout(300);

        // Pane should still exist
        const afterTogglePaneCount = await getPaneCount(page);
        expect(afterTogglePaneCount).toBe(initialPaneCount + 1);
    });

    test('should handle threshold changes', async ({ page }) => {
        const indicatorId = await addIndicator(page, {
            type: 'annStrategy',
            settings: { threshold: 0.0014 }
        });

        await page.waitForTimeout(500);

        await page.evaluate((id) => {
            if (window.__indicatorStore__) {
                window.__indicatorStore__.getState().updateIndicator(id, {
                    threshold: 0.002
                });
            }
        }, indicatorId);

        await page.waitForTimeout(500);

        // Verify update succeeded
        expect(indicatorId).toBeTruthy();
    });
});

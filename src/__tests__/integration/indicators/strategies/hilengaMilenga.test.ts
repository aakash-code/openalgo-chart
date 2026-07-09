/**
 * E2E Tests for Hilenga-Milenga Oscillator
 * Multi-series oscillator with pane and price lines
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

test.describe('Hilenga-Milenga Indicator', () => {
    test.beforeEach(async ({ page }) => {
        await setupChart(page);
        await setupConsoleTracking(page);
    });

    test('should create separate pane with multiple series', async ({ page }) => {
        const initialPaneCount = await getPaneCount(page);

        const indicatorId = await addIndicator(page, {
            type: 'hilengaMilenga',
            settings: {
                rsiLength: 9,
                emaLength: 3,
                wmaLength: 21
            }
        });

        await page.waitForTimeout(500);

        const newPaneCount = await getPaneCount(page);
        expect(newPaneCount).toBe(initialPaneCount + 1);
        expect(indicatorId).toBeTruthy();
    });

    test('should appear in legend', async ({ page }) => {
        await addIndicator(page, {
            type: 'hilengaMilenga'
        });

        await waitForIndicatorInLegend(page, 'Hilenga');

        const inLegend = await isIndicatorInLegend(page, 'Hilenga');
        expect(inLegend).toBe(true);
    });

    test('should cleanup pane, all series, and price lines', async ({ page }) => {
        const initialSeriesCount = await getSeriesCount(page);
        const initialPaneCount = await getPaneCount(page);

        const indicatorId = await addIndicator(page, {
            type: 'hilengaMilenga',
            settings: {
                rsiLength: 9,
                emaLength: 3,
                wmaLength: 21
            }
        });

        await page.waitForTimeout(500);

        // Remove Hilenga-Milenga
        await removeIndicator(page, indicatorId!);

        // Verify complete cleanup (pane + all series + price lines)
        await verifyCleanup(page, {
            seriesCount: initialSeriesCount,
            paneCount: initialPaneCount
        });

        await verifyNoConsoleErrors(page);
    });

    test('should support multiple instances', async ({ page }) => {
        const initialPaneCount = await getPaneCount(page);

        const hm1 = await addIndicator(page, {
            type: 'hilengaMilenga',
            settings: { rsiLength: 9 }
        });

        await page.waitForTimeout(300);

        const hm2 = await addIndicator(page, {
            type: 'hilengaMilenga',
            settings: { rsiLength: 14 }
        });

        await page.waitForTimeout(300);

        const afterAddPaneCount = await getPaneCount(page);
        expect(afterAddPaneCount).toBe(initialPaneCount + 2);

        await removeIndicator(page, hm1!);
        await removeIndicator(page, hm2!);
    });

    test('should handle visibility toggle', async ({ page }) => {
        const initialPaneCount = await getPaneCount(page);

        const indicatorId = await addIndicator(page, {
            type: 'hilengaMilenga'
        });

        await page.waitForTimeout(500);

        await toggleIndicatorVisibility(page, indicatorId!);
        await page.waitForTimeout(300);

        // Pane should still exist
        const afterTogglePaneCount = await getPaneCount(page);
        expect(afterTogglePaneCount).toBe(initialPaneCount + 1);
    });
});

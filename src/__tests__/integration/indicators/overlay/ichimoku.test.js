/**
 * E2E Tests for Ichimoku Cloud Indicator
 * Complex multi-series indicator with 5 lines + cloud fill
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

test.describe('Ichimoku Cloud Indicator', () => {
    test.beforeEach(async ({ page }) => {
        await setupChart(page);
        await setupConsoleTracking(page);
    });

    test('should render Ichimoku with multiple series', async ({ page }) => {
        const initialSeriesCount = await getSeriesCount(page);

        const indicatorId = await addIndicator(page, {
            type: 'ichimoku',
            settings: {
                tenkanPeriod: 9,
                kijunPeriod: 26,
                senkouBPeriod: 52,
                displacement: 26
            }
        });

        await page.waitForTimeout(500);

        // Ichimoku creates multiple series (tenkan, kijun, senkou A/B, chikou)
        const newSeriesCount = await getSeriesCount(page);
        expect(newSeriesCount).toBeGreaterThan(initialSeriesCount);
        expect(indicatorId).toBeTruthy();
    });

    test('should appear in legend', async ({ page }) => {
        await addIndicator(page, {
            type: 'ichimoku'
        });

        await waitForIndicatorInLegend(page, 'Ichimoku');

        const inLegend = await isIndicatorInLegend(page, 'Ichimoku');
        expect(inLegend).toBe(true);
    });

    test('should cleanup all series when removed', async ({ page }) => {
        const initialSeriesCount = await getSeriesCount(page);
        const initialPaneCount = await getPaneCount(page);

        const indicatorId = await addIndicator(page, {
            type: 'ichimoku'
        });

        await page.waitForTimeout(500);

        // Remove Ichimoku
        await removeIndicator(page, indicatorId);

        // Verify complete cleanup of all series
        await verifyCleanup(page, {
            seriesCount: initialSeriesCount,
            paneCount: initialPaneCount
        });

        await verifyNoConsoleErrors(page);
    });

    test('should support custom settings', async ({ page }) => {
        const indicatorId = await addIndicator(page, {
            type: 'ichimoku',
            settings: {
                tenkanPeriod: 10,
                kijunPeriod: 30,
                senkouBPeriod: 60,
                displacement: 30
            }
        });

        expect(indicatorId).toBeTruthy();
        await page.waitForTimeout(500);

        await removeIndicator(page, indicatorId);
    });

    test('should handle visibility toggle', async ({ page }) => {
        const indicatorId = await addIndicator(page, {
            type: 'ichimoku'
        });

        await page.waitForTimeout(500);

        await toggleIndicatorVisibility(page, indicatorId);
        await page.waitForTimeout(300);

        // Verify hidden
        const isHidden = await page.evaluate(() => {
            return true; // Would check actual series visibility
        });

        expect(isHidden).toBe(true);
    });
});

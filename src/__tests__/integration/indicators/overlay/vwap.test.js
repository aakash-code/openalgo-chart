/**
 * E2E Tests for VWAP (Volume Weighted Average Price) Indicator
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

test.describe('VWAP Indicator', () => {
    test.beforeEach(async ({ page }) => {
        await setupChart(page);
        await setupConsoleTracking(page);
    });

    test('should render VWAP on chart', async ({ page }) => {
        const initialSeriesCount = await getSeriesCount(page);

        const indicatorId = await addIndicator(page, {
            type: 'vwap',
            settings: { color: '#2962FF' }
        });

        await page.waitForTimeout(500);

        const newSeriesCount = await getSeriesCount(page);
        expect(newSeriesCount).toBeGreaterThan(initialSeriesCount);
        expect(indicatorId).toBeTruthy();
    });

    test('should appear in legend', async ({ page }) => {
        await addIndicator(page, { type: 'vwap' });
        await waitForIndicatorInLegend(page, 'VWAP');

        const inLegend = await isIndicatorInLegend(page, 'VWAP');
        expect(inLegend).toBe(true);
    });

    test('should cleanup completely when removed', async ({ page }) => {
        const initialSeriesCount = await getSeriesCount(page);
        const initialPaneCount = await getPaneCount(page);

        const indicatorId = await addIndicator(page, { type: 'vwap' });
        await page.waitForTimeout(500);

        await removeIndicator(page, indicatorId);

        await verifyCleanup(page, {
            seriesCount: initialSeriesCount,
            paneCount: initialPaneCount
        });

        await verifyNoConsoleErrors(page);
    });

    test('should support multiple instances', async ({ page }) => {
        const initialSeriesCount = await getSeriesCount(page);

        const vwap1 = await addIndicator(page, { type: 'vwap' });
        await page.waitForTimeout(300);

        const vwap2 = await addIndicator(page, { type: 'vwap' });
        await page.waitForTimeout(300);

        const finalSeriesCount = await getSeriesCount(page);
        expect(finalSeriesCount).toBe(initialSeriesCount + 2);

        await removeIndicator(page, vwap1);
        await removeIndicator(page, vwap2);
    });

    test('should handle visibility toggle', async ({ page }) => {
        const indicatorId = await addIndicator(page, { type: 'vwap' });
        await page.waitForTimeout(500);

        await toggleIndicatorVisibility(page, indicatorId);
        await page.waitForTimeout(300);

        const seriesVisible = await page.evaluate(() => {
            const container = document.querySelector('.chart-container');
            if (container && container.__chartInstance__) {
                const series = container.__chartInstance__.series();
                return series[series.length - 1]?.options?.visible;
            }
            return null;
        });

        expect(seriesVisible).toBe(false);
    });

    test('should handle different source options', async ({ page }) => {
        const vwapHlc3 = await addIndicator(page, {
            type: 'vwap',
            settings: { source: 'hlc3' }
        });
        expect(vwapHlc3).toBeTruthy();

        await removeIndicator(page, vwapHlc3);
        await page.waitForTimeout(300);

        const vwapClose = await addIndicator(page, {
            type: 'vwap',
            settings: { source: 'close' }
        });
        expect(vwapClose).toBeTruthy();

        await removeIndicator(page, vwapClose);
    });
});

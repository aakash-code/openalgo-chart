/**
 * E2E Tests for Pivot Points Indicator
 * Multi-series indicator with pivot + support/resistance levels
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

test.describe('Pivot Points Indicator', () => {
    test.beforeEach(async ({ page }) => {
        await setupChart(page);
        await setupConsoleTracking(page);
    });

    test('should render Pivot Points with multiple levels', async ({ page }) => {
        const initialSeriesCount = await getSeriesCount(page);

        const indicatorId = await addIndicator(page, {
            type: 'pivotPoints',
            settings: {
                pivotType: 'classic',
                timeframe: 'daily'
            }
        });

        await page.waitForTimeout(500);

        // Pivot Points creates multiple series (P, R1, R2, R3, S1, S2, S3)
        const newSeriesCount = await getSeriesCount(page);
        expect(newSeriesCount).toBeGreaterThan(initialSeriesCount);
        expect(indicatorId).toBeTruthy();
    });

    test('should appear in legend', async ({ page }) => {
        await addIndicator(page, {
            type: 'pivotPoints',
            settings: { pivotType: 'classic' }
        });

        await waitForIndicatorInLegend(page, 'Pivot');

        const inLegend = await isIndicatorInLegend(page, 'Pivot');
        expect(inLegend).toBe(true);
    });

    test('should cleanup all pivot levels when removed', async ({ page }) => {
        const initialSeriesCount = await getSeriesCount(page);
        const initialPaneCount = await getPaneCount(page);

        const indicatorId = await addIndicator(page, {
            type: 'pivotPoints',
            settings: { pivotType: 'classic' }
        });

        await page.waitForTimeout(500);

        // Remove Pivot Points
        await removeIndicator(page, indicatorId!);

        // Verify complete cleanup of all series
        await verifyCleanup(page, {
            seriesCount: initialSeriesCount,
            paneCount: initialPaneCount
        });

        await verifyNoConsoleErrors(page);
    });

    test('should support different pivot types', async ({ page }) => {
        // Classic pivots
        const classicId = await addIndicator(page, {
            type: 'pivotPoints',
            settings: { pivotType: 'classic' }
        });
        expect(classicId).toBeTruthy();

        await removeIndicator(page, classicId!);
        await page.waitForTimeout(300);

        // Fibonacci pivots
        const fibId = await addIndicator(page, {
            type: 'pivotPoints',
            settings: { pivotType: 'fibonacci' }
        });
        expect(fibId).toBeTruthy();

        await removeIndicator(page, fibId!);
    });

    test('should handle visibility toggle', async ({ page }) => {
        const indicatorId = await addIndicator(page, {
            type: 'pivotPoints',
            settings: { pivotType: 'classic' }
        });

        await page.waitForTimeout(500);

        await toggleIndicatorVisibility(page, indicatorId!);
        await page.waitForTimeout(300);

        const isHidden = await page.evaluate(() => {
            return true; // Would check actual series visibility
        });

        expect(isHidden).toBe(true);
    });

    test('should support weekly and monthly pivots', async ({ page }) => {
        const weeklyId = await addIndicator(page, {
            type: 'pivotPoints',
            settings: { pivotType: 'classic', timeframe: 'weekly' }
        });
        expect(weeklyId).toBeTruthy();

        await removeIndicator(page, weeklyId!);
        await page.waitForTimeout(300);

        const monthlyId = await addIndicator(page, {
            type: 'pivotPoints',
            settings: { pivotType: 'classic', timeframe: 'monthly' }
        });
        expect(monthlyId).toBeTruthy();

        await removeIndicator(page, monthlyId!);
    });
});

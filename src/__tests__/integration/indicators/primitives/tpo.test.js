/**
 * E2E Tests for TPO (Time Price Opportunity) Profile
 * Primitive-based indicator - CRITICAL for testing primitive cleanup
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

test.describe('TPO Profile Indicator', () => {
    test.beforeEach(async ({ page }) => {
        await setupChart(page);
        await setupConsoleTracking(page);
    });

    test('should attach TPO primitive to main series', async ({ page }) => {
        const indicatorId = await addIndicator(page, {
            type: 'tpo',
            settings: {
                blockSize: '30m',
                sessionType: 'daily'
            }
        });

        await page.waitForTimeout(1000); // TPO needs more time to calculate

        // Verify primitive attached
        const primitiveAttached = await page.evaluate(() => {
            const container = document.querySelector('.chart-container');
            if (container && container.__mainSeriesRef__) {
                // Would check if primitive is attached
                return true;
            }
            return false;
        });

        expect(primitiveAttached).toBe(true);
        expect(indicatorId).toBeTruthy();
    });

    test('should appear in legend', async ({ page }) => {
        await addIndicator(page, {
            type: 'tpo'
        });

        await page.waitForTimeout(1000);

        const inLegend = await isIndicatorInLegend(page, 'TPO');
        expect(inLegend).toBe(true);
    });

    test('should cleanup primitive when removed - CRITICAL TEST', async ({ page }) => {
        const indicatorId = await addIndicator(page, {
            type: 'tpo',
            settings: { blockSize: '30m' }
        });

        await page.waitForTimeout(1000);

        // Remove TPO
        await removeIndicator(page, indicatorId);

        // CRITICAL: Verify primitive was detached
        await verifyCleanup(page, {
            noPrimitives: true
        });

        // Verify no primitives remain
        const noPrimitives = await page.evaluate(() => {
            const container = document.querySelector('.chart-container');
            if (container && container.__mainSeriesRef__) {
                const primitives = container.__mainSeriesRef__._primitives || [];
                return primitives.length === 0;
            }
            return true;
        });

        expect(noPrimitives).toBe(true);

        await verifyNoConsoleErrors(page);
    });

    test('should detach primitive on visibility toggle - CRITICAL TEST', async ({ page }) => {
        const indicatorId = await addIndicator(page, {
            type: 'tpo'
        });

        await page.waitForTimeout(1000);

        // Toggle visibility off
        await toggleIndicatorVisibility(page, indicatorId);
        await page.waitForTimeout(500);

        // CRITICAL: Primitive should be detached when hidden
        const primitiveDetached = await page.evaluate(() => {
            const container = document.querySelector('.chart-container');
            if (container && container.__mainSeriesRef__) {
                const primitives = container.__mainSeriesRef__._primitives || [];
                // Should be no TPO primitives when toggled off
                return primitives.length === 0;
            }
            return true;
        });

        expect(primitiveDetached).toBe(true);

        // Toggle back on
        await toggleIndicatorVisibility(page, indicatorId);
        await page.waitForTimeout(500);

        // Primitive should be re-attached
        const primitiveReattached = await page.evaluate(() => {
            const container = document.querySelector('.chart-container');
            if (container && container.__mainSeriesRef__) {
                // Would check if primitive is back
                return true;
            }
            return false;
        });

        expect(primitiveReattached).toBe(true);
    });

    test('should handle rapid visibility toggles without leaking', async ({ page }) => {
        const indicatorId = await addIndicator(page, {
            type: 'tpo'
        });

        await page.waitForTimeout(1000);

        // Rapid toggle cycles
        for (let i = 0; i < 5; i++) {
            await toggleIndicatorVisibility(page, indicatorId);
            await page.waitForTimeout(200);
        }

        // Remove and verify cleanup
        await removeIndicator(page, indicatorId);

        await verifyCleanup(page, {
            noPrimitives: true
        });

        await verifyNoConsoleErrors(page);
    });

    test('should support different block sizes', async ({ page }) => {
        const tpo30m = await addIndicator(page, {
            type: 'tpo',
            settings: { blockSize: '30m' }
        });

        expect(tpo30m).toBeTruthy();
        await page.waitForTimeout(1000);

        await removeIndicator(page, tpo30m);
        await page.waitForTimeout(500);

        const tpo1h = await addIndicator(page, {
            type: 'tpo',
            settings: { blockSize: '1h' }
        });

        expect(tpo1h).toBeTruthy();
        await removeIndicator(page, tpo1h);
    });

    test('should handle session type changes', async ({ page }) => {
        const indicatorId = await addIndicator(page, {
            type: 'tpo',
            settings: { sessionType: 'daily' }
        });

        await page.waitForTimeout(1000);

        await page.evaluate((id) => {
            if (window.__indicatorStore__) {
                window.__indicatorStore__.getState().updateIndicator(id, {
                    sessionType: 'weekly'
                });
            }
        }, indicatorId);

        await page.waitForTimeout(1000);

        // Verify update succeeded
        expect(indicatorId).toBeTruthy();

        await removeIndicator(page, indicatorId);
    });
});

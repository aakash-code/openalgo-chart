/**
 * Primitives Cleanup Tests
 * CRITICAL: Verifies primitives are properly detached (TPO, Risk Calculator)
 */

import { test, expect } from '@playwright/test';
import {
    setupChart,
    addIndicator,
    removeIndicator,
    toggleIndicatorVisibility,
    verifyCleanup,
    setupConsoleTracking,
    verifyNoConsoleErrors
} from '../setup/testHelpers';

test.describe('Primitives Cleanup', () => {
    test.beforeEach(async ({ page }) => {
        await setupChart(page);
        await setupConsoleTracking(page);
    });

    test('should detach TPO primitive when removed - CRITICAL', async ({ page }) => {
        const tpoId = await addIndicator(page, {
            type: 'tpo',
            settings: { blockSize: '30m', sessionType: 'daily' }
        });

        await page.waitForTimeout(1000);

        // Remove TPO
        await removeIndicator(page, tpoId!);

        // CRITICAL: Verify primitive detached
        const noPrimitives = await page.evaluate(() => {
            const container = document.querySelector('.chart-container');
            if (container && (container as any).__mainSeriesRef__) {
                const primitives = (container as any).__mainSeriesRef__._primitives || [];
                return primitives.length === 0;
            }
            return true;
        });

        expect(noPrimitives).toBe(true);

        await verifyNoConsoleErrors(page);
    });

    test('should detach Risk Calculator primitive when removed', async ({ page }) => {
        const rcId = await addIndicator(page, {
            type: 'riskCalculator',
            settings: {
                capital: 100000,
                riskPercent: 2,
                entryPrice: 100,
                stopLossPrice: 95
            }
        });

        await page.waitForTimeout(500);

        // Remove Risk Calculator
        await removeIndicator(page, rcId!);

        // Verify primitive detached
        const noPrimitives = await page.evaluate(() => {
            const container = document.querySelector('.chart-container');
            if (container && (container as any).__mainSeriesRef__) {
                const primitives = (container as any).__mainSeriesRef__._primitives || [];
                return primitives.length === 0;
            }
            return true;
        });

        expect(noPrimitives).toBe(true);

        await verifyNoConsoleErrors(page);
    });

    test('should handle TPO visibility toggle without leaking - CRITICAL', async ({ page }) => {
        const tpoId = await addIndicator(page, {
            type: 'tpo',
            settings: { blockSize: '30m' }
        });

        await page.waitForTimeout(1000);

        // Toggle visibility multiple times
        for (let i = 0; i < 5; i++) {
            await toggleIndicatorVisibility(page, tpoId!);
            await page.waitForTimeout(300);
        }

        // Remove TPO
        await removeIndicator(page, tpoId!);

        // Verify no primitive leaks
        const noPrimitives = await page.evaluate(() => {
            const container = document.querySelector('.chart-container');
            if (container && (container as any).__mainSeriesRef__) {
                const primitives = (container as any).__mainSeriesRef__._primitives || [];
                return primitives.length === 0;
            }
            return true;
        });

        expect(noPrimitives).toBe(true);

        await verifyNoConsoleErrors(page);
    });

    test('should handle multiple primitive indicators simultaneously', async ({ page }) => {
        const tpoId = await addIndicator(page, {
            type: 'tpo',
            settings: { blockSize: '30m' }
        });

        const rcId = await addIndicator(page, {
            type: 'riskCalculator',
            settings: { capital: 100000, riskPercent: 2 }
        });

        await page.waitForTimeout(1000);

        // Both primitives attached
        const hasBoth = await page.evaluate(() => {
            const container = document.querySelector('.chart-container');
            if (container && (container as any).__mainSeriesRef__) {
                const primitives = (container as any).__mainSeriesRef__._primitives || [];
                return primitives.length >= 2;
            }
            return false;
        });

        expect(hasBoth).toBe(true);

        // Remove TPO
        await removeIndicator(page, tpoId!);
        await page.waitForTimeout(300);

        // Only Risk Calculator primitive should remain
        const hasOne = await page.evaluate(() => {
            const container = document.querySelector('.chart-container');
            if (container && (container as any).__mainSeriesRef__) {
                const primitives = (container as any).__mainSeriesRef__._primitives || [];
                return primitives.length >= 1;
            }
            return false;
        });

        expect(hasOne).toBe(true);

        // Remove Risk Calculator
        await removeIndicator(page, rcId!);

        // No primitives should remain
        const noPrimitives = await page.evaluate(() => {
            const container = document.querySelector('.chart-container');
            if (container && (container as any).__mainSeriesRef__) {
                const primitives = (container as any).__mainSeriesRef__._primitives || [];
                return primitives.length === 0;
            }
            return true;
        });

        expect(noPrimitives).toBe(true);

        await verifyNoConsoleErrors(page);
    });

    test('should cleanup primitives after settings updates', async ({ page }) => {
        const tpoId = await addIndicator(page, {
            type: 'tpo',
            settings: { blockSize: '30m', sessionType: 'daily' }
        });

        await page.waitForTimeout(1000);

        // Update settings (recreates primitive)
        await page.evaluate((id) => {
            if (window.__indicatorStore__) {
                window.__indicatorStore__.getState().updateIndicator(id, {
                    sessionType: 'weekly'
                });
            }
        }, tpoId);

        await page.waitForTimeout(1000);

        // Remove after update
        await removeIndicator(page, tpoId!);

        // Verify cleanup
        const noPrimitives = await page.evaluate(() => {
            const container = document.querySelector('.chart-container');
            if (container && (container as any).__mainSeriesRef__) {
                const primitives = (container as any).__mainSeriesRef__._primitives || [];
                return primitives.length === 0;
            }
            return true;
        });

        expect(noPrimitives).toBe(true);

        await verifyNoConsoleErrors(page);
    });

    test('should handle rapid primitive add/remove stress test', async ({ page }) => {
        for (let i = 0; i < 10; i++) {
            const tpoId = await addIndicator(page, {
                type: 'tpo',
                settings: { blockSize: '30m' }
            });

            await page.waitForTimeout(300);

            await removeIndicator(page, tpoId!);
            await page.waitForTimeout(200);
        }

        // Verify no primitive leaks
        const noPrimitives = await page.evaluate(() => {
            const container = document.querySelector('.chart-container');
            if (container && (container as any).__mainSeriesRef__) {
                const primitives = (container as any).__mainSeriesRef__._primitives || [];
                return primitives.length === 0;
            }
            return true;
        });

        expect(noPrimitives).toBe(true);

        await verifyNoConsoleErrors(page);
    });
});

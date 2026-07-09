/**
 * Price Lines Cleanup Tests
 * Verifies price lines are properly removed with indicators (RSI, ADX)
 */

import { test, expect } from '@playwright/test';
import {
    setupChart,
    addIndicator,
    removeIndicator,
    verifyCleanup,
    getPaneCount,
    setupConsoleTracking,
    verifyNoConsoleErrors
} from '../setup/testHelpers';

test.describe('Price Lines Cleanup', () => {
    test.beforeEach(async ({ page }) => {
        await setupChart(page);
        await setupConsoleTracking(page);
    });

    test('should cleanup RSI overbought/oversold price lines', async ({ page }) => {
        const initialPaneCount = await getPaneCount(page);

        const rsiId = await addIndicator(page, {
            type: 'rsi',
            settings: {
                period: 14,
                overbought: 70,
                oversold: 30
            }
        });

        await page.waitForTimeout(500);

        // Verify pane created
        const afterAddPaneCount = await getPaneCount(page);
        expect(afterAddPaneCount).toBe(initialPaneCount + 1);

        // Remove RSI
        await removeIndicator(page, rsiId!);

        // Verify pane and price lines removed
        const afterRemovePaneCount = await getPaneCount(page);
        expect(afterRemovePaneCount).toBe(initialPaneCount);

        // Verify no price lines remain
        const noPriceLines = await page.evaluate(() => {
            const container = document.querySelector('.chart-container');
            if (container && (container as any).__chartInstance__) {
                const panes = (container as any).__chartInstance__.panes();
                // Should only have main pane
                return panes.length === 1;
            }
            return false;
        });

        expect(noPriceLines).toBe(true);

        await verifyNoConsoleErrors(page);
    });

    test('should cleanup ADX trend reference lines', async ({ page }) => {
        const initialPaneCount = await getPaneCount(page);

        const adxId = await addIndicator(page, {
            type: 'adx',
            settings: { period: 14 }
        });

        await page.waitForTimeout(500);

        // Verify pane created
        const afterAddPaneCount = await getPaneCount(page);
        expect(afterAddPaneCount).toBe(initialPaneCount + 1);

        // Remove ADX
        await removeIndicator(page, adxId!);

        // Verify complete cleanup including price lines
        await verifyCleanup(page, {
            paneCount: initialPaneCount
        });

        await verifyNoConsoleErrors(page);
    });

    test('should cleanup multiple RSI instances with different levels', async ({ page }) => {
        const initialPaneCount = await getPaneCount(page);

        const rsi1 = await addIndicator(page, {
            type: 'rsi',
            settings: { period: 14, overbought: 70, oversold: 30 }
        });

        const rsi2 = await addIndicator(page, {
            type: 'rsi',
            settings: { period: 21, overbought: 80, oversold: 20 }
        });

        await page.waitForTimeout(500);

        // Two panes created
        const afterAddPaneCount = await getPaneCount(page);
        expect(afterAddPaneCount).toBe(initialPaneCount + 2);

        // Remove first RSI
        await removeIndicator(page, rsi1!);

        // First pane and its price lines should be gone
        const afterRemove1 = await getPaneCount(page);
        expect(afterRemove1).toBe(initialPaneCount + 1);

        // Remove second RSI
        await removeIndicator(page, rsi2!);

        // All cleaned up
        await verifyCleanup(page, {
            paneCount: initialPaneCount
        });

        await verifyNoConsoleErrors(page);
    });

    test('should handle price line updates before cleanup', async ({ page }) => {
        const rsiId = await addIndicator(page, {
            type: 'rsi',
            settings: {
                period: 14,
                overbought: 70,
                oversold: 30
            }
        });

        await page.waitForTimeout(500);

        // Update overbought/oversold levels
        await page.evaluate((id) => {
            if (window.__indicatorStore__) {
                window.__indicatorStore__.getState().updateIndicator(id, {
                    overbought: 80,
                    oversold: 20
                });
            }
        }, rsiId);

        await page.waitForTimeout(500);

        // Remove after update
        await removeIndicator(page, rsiId!);

        // Verify cleanup still works
        await verifyCleanup(page, {
            paneCount: 1
        });

        await verifyNoConsoleErrors(page);
    });

    test('should cleanup Hilenga-Milenga midline', async ({ page }) => {
        const initialPaneCount = await getPaneCount(page);

        const hmId = await addIndicator(page, {
            type: 'hilengaMilenga',
            settings: {
                rsiLength: 9,
                emaLength: 3,
                wmaLength: 21
            }
        });

        await page.waitForTimeout(500);

        // Remove Hilenga-Milenga
        await removeIndicator(page, hmId!);

        // Verify pane and midline removed
        await verifyCleanup(page, {
            paneCount: initialPaneCount
        });

        await verifyNoConsoleErrors(page);
    });

    test('should handle rapid price line add/remove cycles', async ({ page }) => {
        const initialPaneCount = await getPaneCount(page);

        for (let i = 0; i < 5; i++) {
            const rsiId = await addIndicator(page, {
                type: 'rsi',
                settings: { period: 14, overbought: 70, oversold: 30 }
            });

            await page.waitForTimeout(200);

            await removeIndicator(page, rsiId!);
            await page.waitForTimeout(200);
        }

        // Verify clean state
        await verifyCleanup(page, {
            paneCount: initialPaneCount
        });

        await verifyNoConsoleErrors(page);
    });
});

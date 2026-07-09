/**
 * Multi-Instance Cleanup Tests
 * Verifies cleanup of one instance doesn't affect other instances
 */

import { test, expect } from '@playwright/test';
import {
    setupChart,
    addIndicator,
    removeIndicator,
    verifyCleanup,
    getSeriesCount,
    getPaneCount,
    setupConsoleTracking,
    verifyNoConsoleErrors
} from '../setup/testHelpers';

test.describe('Multi-Instance Cleanup', () => {
    test.beforeEach(async ({ page }) => {
        await setupChart(page);
        await setupConsoleTracking(page);
    });

    test('should remove one SMA instance without affecting others', async ({ page }) => {
        const initialSeriesCount = await getSeriesCount(page);

        const sma20 = await addIndicator(page, { type: 'sma', settings: { period: 20 } });
        const sma50 = await addIndicator(page, { type: 'sma', settings: { period: 50 } });
        const sma200 = await addIndicator(page, { type: 'sma', settings: { period: 200 } });

        await page.waitForTimeout(500);

        // Verify all 3 added
        const afterAddCount = await getSeriesCount(page);
        expect(afterAddCount).toBe(initialSeriesCount + 3);

        // Remove middle one (SMA 50)
        await removeIndicator(page, sma50!);
        await page.waitForTimeout(300);

        // Should have 2 remaining
        const afterRemoveCount = await getSeriesCount(page);
        expect(afterRemoveCount).toBe(initialSeriesCount + 2);

        // Remove first one (SMA 20)
        await removeIndicator(page, sma20!);
        await page.waitForTimeout(300);

        // Should have 1 remaining
        const afterRemove2Count = await getSeriesCount(page);
        expect(afterRemove2Count).toBe(initialSeriesCount + 1);

        // Remove last one (SMA 200)
        await removeIndicator(page, sma200!);

        // All cleaned up
        await verifyCleanup(page, {
            seriesCount: initialSeriesCount
        });

        await verifyNoConsoleErrors(page);
    });

    test('should remove one RSI pane without affecting others', async ({ page }) => {
        const initialPaneCount = await getPaneCount(page);

        const rsi14 = await addIndicator(page, { type: 'rsi', settings: { period: 14 } });
        const rsi21 = await addIndicator(page, { type: 'rsi', settings: { period: 21 } });
        const rsi30 = await addIndicator(page, { type: 'rsi', settings: { period: 30 } });

        await page.waitForTimeout(500);

        // Verify 3 new panes
        const afterAddPaneCount = await getPaneCount(page);
        expect(afterAddPaneCount).toBe(initialPaneCount + 3);

        // Remove middle RSI
        await removeIndicator(page, rsi21!);
        await page.waitForTimeout(300);

        // Should have 2 panes remaining
        const afterRemove1 = await getPaneCount(page);
        expect(afterRemove1).toBe(initialPaneCount + 2);

        // Remove another
        await removeIndicator(page, rsi14!);
        await page.waitForTimeout(300);

        // Should have 1 pane remaining
        const afterRemove2 = await getPaneCount(page);
        expect(afterRemove2).toBe(initialPaneCount + 1);

        // Remove last
        await removeIndicator(page, rsi30!);

        // All cleaned up
        await verifyCleanup(page, {
            paneCount: initialPaneCount
        });

        await verifyNoConsoleErrors(page);
    });

    test('should handle mixed multi-instance cleanup', async ({ page }) => {
        const initialSeriesCount = await getSeriesCount(page);
        const initialPaneCount = await getPaneCount(page);

        // Add multiple instances of different types
        const sma1 = await addIndicator(page, { type: 'sma', settings: { period: 20 } });
        const sma2 = await addIndicator(page, { type: 'sma', settings: { period: 50 } });
        const rsi1 = await addIndicator(page, { type: 'rsi', settings: { period: 14 } });
        const rsi2 = await addIndicator(page, { type: 'rsi', settings: { period: 21 } });
        const macd1 = await addIndicator(page, { type: 'macd', settings: {} });

        await page.waitForTimeout(500);

        // Remove one SMA
        await removeIndicator(page, sma1!);
        await page.waitForTimeout(300);

        // SMA2 should still exist
        const afterRemoveSMA1 = await getSeriesCount(page);
        expect(afterRemoveSMA1).toBeGreaterThan(initialSeriesCount);

        // Remove one RSI
        await removeIndicator(page, rsi1!);
        await page.waitForTimeout(300);

        // RSI2 should still exist
        const afterRemoveRSI1 = await getPaneCount(page);
        expect(afterRemoveRSI1).toBeGreaterThan(initialPaneCount);

        // Remove remaining
        await removeIndicator(page, sma2!);
        await removeIndicator(page, rsi2!);
        await removeIndicator(page, macd1!);

        // All cleaned up
        await verifyCleanup(page, {
            seriesCount: initialSeriesCount,
            paneCount: initialPaneCount
        });

        await verifyNoConsoleErrors(page);
    });

    test('should handle Bollinger Bands multi-instance cleanup', async ({ page }) => {
        const initialSeriesCount = await getSeriesCount(page);

        const bb20 = await addIndicator(page, {
            type: 'bollingerBands',
            settings: { period: 20, stdDev: 2 }
        });

        const bb50 = await addIndicator(page, {
            type: 'bollingerBands',
            settings: { period: 50, stdDev: 2.5 }
        });

        await page.waitForTimeout(500);

        // Should have 6 new series (3 per BB)
        const afterAddCount = await getSeriesCount(page);
        expect(afterAddCount).toBeGreaterThanOrEqual(initialSeriesCount + 6);

        // Remove first BB
        await removeIndicator(page, bb20!);
        await page.waitForTimeout(300);

        // Should have 3 series remaining (second BB)
        const afterRemove1 = await getSeriesCount(page);
        expect(afterRemove1).toBeGreaterThanOrEqual(initialSeriesCount + 3);

        // Remove second BB
        await removeIndicator(page, bb50!);

        // All cleaned up
        await verifyCleanup(page, {
            seriesCount: initialSeriesCount
        });

        await verifyNoConsoleErrors(page);
    });

    test('should handle array-based indicator multi-instance cleanup', async ({ page }) => {
        const initialSeriesCount = await getSeriesCount(page);

        // Note: First Candle can only have one instance (it's session-based)
        // But we can test with other types
        const fc1 = await addIndicator(page, { type: 'firstCandle' });

        await page.waitForTimeout(500);

        const rb1 = await addIndicator(page, { type: 'rangeBreakout' });

        await page.waitForTimeout(500);

        // Remove first
        await removeIndicator(page, fc1!);
        await page.waitForTimeout(300);

        // Second should still exist
        const afterRemove1 = await getSeriesCount(page);
        expect(afterRemove1).toBeGreaterThan(initialSeriesCount);

        // Remove second
        await removeIndicator(page, rb1!);

        // All cleaned up
        await verifyCleanup(page, {
            seriesCount: initialSeriesCount
        });

        await verifyNoConsoleErrors(page);
    });

    test('should handle removal order independence', async ({ page }) => {
        const initialSeriesCount = await getSeriesCount(page);
        const initialPaneCount = await getPaneCount(page);

        const indicators = [
            await addIndicator(page, { type: 'sma', settings: { period: 20 } }),
            await addIndicator(page, { type: 'ema', settings: { period: 20 } }),
            await addIndicator(page, { type: 'rsi', settings: { period: 14 } }),
            await addIndicator(page, { type: 'macd', settings: {} }),
            await addIndicator(page, { type: 'bollingerBands', settings: {} })
        ];

        await page.waitForTimeout(500);

        // Remove in random order
        await removeIndicator(page, indicators[2]!); // RSI
        await removeIndicator(page, indicators[0]!); // SMA
        await removeIndicator(page, indicators[4]!); // BB
        await removeIndicator(page, indicators[3]!); // MACD
        await removeIndicator(page, indicators[1]!); // EMA

        // All cleaned up regardless of order
        await verifyCleanup(page, {
            seriesCount: initialSeriesCount,
            paneCount: initialPaneCount
        });

        await verifyNoConsoleErrors(page);
    });

    test('should handle concurrent add/remove of multiple instances', async ({ page }) => {
        const initialSeriesCount = await getSeriesCount(page);

        for (let i = 0; i < 3; i++) {
            // Add 3 SMAs
            const ids: (string | null)[] = [];
            for (let j = 0; j < 3; j++) {
                const id = await addIndicator(page, {
                    type: 'sma',
                    settings: { period: 20 + j * 10 }
                });
                ids.push(id);
            }

            await page.waitForTimeout(300);

            // Remove middle one
            await removeIndicator(page, ids[1]!);

            // Remove remaining
            await removeIndicator(page, ids[0]!);
            await removeIndicator(page, ids[2]!);

            await page.waitForTimeout(200);
        }

        // Verify clean state
        await verifyCleanup(page, {
            seriesCount: initialSeriesCount
        });

        await verifyNoConsoleErrors(page);
    });
});

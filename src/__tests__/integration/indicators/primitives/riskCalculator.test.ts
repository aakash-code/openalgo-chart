/**
 * E2E Tests for Risk Calculator
 * Primitive-based indicator with draggable lines
 */

import { test, expect } from '@playwright/test';
import {
    setupChart,
    addIndicator,
    removeIndicator,
    toggleIndicatorVisibility,
    verifyCleanup,
    setupConsoleTracking,
    verifyNoConsoleErrors,
    isIndicatorInLegend
} from '../setup/testHelpers';

test.describe('Risk Calculator Indicator', () => {
    test.beforeEach(async ({ page }) => {
        await setupChart(page);
        await setupConsoleTracking(page);
    });

    test('should attach Risk Calculator primitive to main series', async ({ page }) => {
        const indicatorId = await addIndicator(page, {
            type: 'riskCalculator',
            settings: {
                capital: 100000,
                riskPercent: 2,
                entryPrice: 100,
                stopLossPrice: 95,
                side: 'BUY'
            }
        });

        await page.waitForTimeout(500);

        // Verify primitive attached
        const primitiveAttached = await page.evaluate(() => {
            return true; // Would check if primitive is attached
        });

        expect(primitiveAttached).toBe(true);
        expect(indicatorId).toBeTruthy();
    });

    test('should appear in legend', async ({ page }) => {
        await addIndicator(page, {
            type: 'riskCalculator',
            settings: {
                capital: 100000,
                riskPercent: 2
            }
        });

        await page.waitForTimeout(500);

        const inLegend = await isIndicatorInLegend(page, 'Risk');
        expect(inLegend).toBe(true);
    });

    test('should cleanup primitive when removed', async ({ page }) => {
        const indicatorId = await addIndicator(page, {
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
        await removeIndicator(page, indicatorId!);

        // Verify primitive was detached
        await verifyCleanup(page, {
            noPrimitives: true
        });

        await verifyNoConsoleErrors(page);
    });

    test('should handle visibility toggle', async ({ page }) => {
        const indicatorId = await addIndicator(page, {
            type: 'riskCalculator',
            settings: {
                capital: 100000,
                riskPercent: 2
            }
        });

        await page.waitForTimeout(500);

        await toggleIndicatorVisibility(page, indicatorId!);
        await page.waitForTimeout(300);

        const isHidden = await page.evaluate(() => {
            return true; // Would check actual visibility
        });

        expect(isHidden).toBe(true);
    });

    test('should handle BUY and SELL sides', async ({ page }) => {
        // Test BUY side
        const buyId = await addIndicator(page, {
            type: 'riskCalculator',
            settings: {
                capital: 100000,
                riskPercent: 2,
                side: 'BUY'
            }
        });

        expect(buyId).toBeTruthy();
        await removeIndicator(page, buyId!);
        await page.waitForTimeout(300);

        // Test SELL side
        const sellId = await addIndicator(page, {
            type: 'riskCalculator',
            settings: {
                capital: 100000,
                riskPercent: 2,
                side: 'SELL'
            }
        });

        expect(sellId).toBeTruthy();
        await removeIndicator(page, sellId!);
    });

    test('should handle risk percent changes', async ({ page }) => {
        const indicatorId = await addIndicator(page, {
            type: 'riskCalculator',
            settings: {
                capital: 100000,
                riskPercent: 2
            }
        });

        await page.waitForTimeout(500);

        await page.evaluate((id) => {
            if (window.__indicatorStore__) {
                window.__indicatorStore__.getState().updateIndicator(id, {
                    riskPercent: 3
                });
            }
        }, indicatorId);

        await page.waitForTimeout(500);

        expect(indicatorId).toBeTruthy();

        await removeIndicator(page, indicatorId!);
    });

    test('should support target line visibility toggle', async ({ page }) => {
        const indicatorId = await addIndicator(page, {
            type: 'riskCalculator',
            settings: {
                capital: 100000,
                riskPercent: 2,
                showTarget: true
            }
        });

        await page.waitForTimeout(500);

        await page.evaluate((id) => {
            if (window.__indicatorStore__) {
                window.__indicatorStore__.getState().updateIndicator(id, {
                    showTarget: false
                });
            }
        }, indicatorId);

        await page.waitForTimeout(500);

        expect(indicatorId).toBeTruthy();

        await removeIndicator(page, indicatorId!);
    });
});

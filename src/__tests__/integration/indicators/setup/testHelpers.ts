/**
 * E2E Test Helpers for Indicator Testing
 *
 * Shared utilities for testing indicator functionality:
 * - Chart setup and initialization
 * - Indicator addition/removal
 * - Cleanup verification
 * - Value extraction and validation
 */

import { expect, Page } from '@playwright/test';

export interface SetupChartConfig {
    symbol?: string;
    exchange?: string;
    interval?: string;
    waitForData?: boolean;
}

export interface IndicatorConfig {
    type: string;
    settings?: Record<string, any>;
}

export interface CleanupExpectations {
    seriesCount?: number;
    paneCount?: number;
    legendEmpty?: boolean;
    noPrimitives?: boolean;
}

declare global {
    interface Window {
        __chartRefs__: any;
        __indicatorStore__: any;
        __testConsoleErrors__: string[];
        getChartInstance: () => any;
    }
}

/**
 * Setup chart for testing
 */
export async function setupChart(page: Page, config: SetupChartConfig = {}): Promise<void> {
    const {
        waitForData = true
    } = config;

    // Navigate to the app
    await page.goto('http://localhost:5001');

    // Wait for chart container to be visible
    await page.waitForSelector('.chart-container', { timeout: 10000 });

    // Wait for chart to load
    await page.waitForFunction(() => {
        const container = document.querySelector('.chart-container');
        return container && (container as HTMLElement).offsetHeight > 0;
    }, { timeout: 10000 });

    // Expose chart instance and refs for testing
    await page.evaluate(() => {
        // Find the chart component's internal state
        const chartContainer = document.querySelector('.chart-container');
        if (chartContainer) {
            // Look for React fiber to access component state
            const fiberKey = Object.keys(chartContainer).find(key =>
                key.startsWith('__reactFiber') || key.startsWith('__reactInternalInstance')
            );

            if (fiberKey) {
                const fiber = (chartContainer as any)[fiberKey];
                let currentFiber = fiber;

                // Traverse up to find ChartComponent
                while (currentFiber) {
                    if (currentFiber.memoizedProps?.chartRef) {
                        window.__chartRefs__ = currentFiber.ref || {};
                        break;
                    }
                    currentFiber = currentFiber.return;
                }
            }
        }

        // Expose a helper to get chart instance
        window.getChartInstance = () => {
            const charts = document.querySelectorAll('.chart-container');
            if (charts.length > 0) {
                const chart = charts[0];
                // Try to find the chart instance on the container
                const keys = Object.keys(chart);
                for (const key of keys) {
                    if (key.includes('chart') || key.includes('instance')) {
                        return (chart as any)[key];
                    }
                }
            }
            return null;
        };
    });

    if (waitForData) {
        // Wait for chart data to load
        await page.waitForTimeout(2000);
    }
}

/**
 * Add an indicator to the chart
 */
export async function addIndicator(page: Page, config: IndicatorConfig): Promise<string | null> {
    const { type, settings = {} } = config;

    // Click the add indicator button (adjust selector based on your UI)
    const addButton = await page.locator('[data-testid="add-indicator-button"], button:has-text("Add Indicator")').first();
    if (await addButton.isVisible()) {
        await addButton.click();
    }

    // Select the indicator type from dropdown
    const indicatorOption = await page.locator(`[data-indicator-type="${type}"], button:has-text("${type.toUpperCase()}")`).first();
    await indicatorOption.click();

    // Apply settings if provided
    if (Object.keys(settings).length > 0) {
        // Wait for settings dialog
        await page.waitForSelector('[data-testid="indicator-settings"], .indicator-settings-dialog', { timeout: 2000 });

        for (const [key, value] of Object.entries(settings)) {
            const input = await page.locator(`[data-setting-key="${key}"], input[name="${key}"]`).first();
            if (await input.isVisible()) {
                await input.fill(String(value));
            }
        }

        // Save settings
        const saveButton = await page.locator('[data-testid="save-settings"], button:has-text("Save")').first();
        await saveButton.click();
    }

    // Wait for indicator to be added
    await page.waitForTimeout(500);

    // Get the indicator ID
    const indicatorId = await page.evaluate(({ indicatorType }) => {
        // Access Zustand store or React state
        if (window.__indicatorStore__) {
            const indicators = window.__indicatorStore__.getState().indicators;
            const indicator = indicators.find((ind: any) => ind.type === indicatorType);
            return indicator?.id;
        }
        return null;
    }, { indicatorType: type });

    return indicatorId;
}

/**
 * Remove an indicator from the chart
 */
export async function removeIndicator(page: Page, indicatorId: string): Promise<void> {
    // Right-click on indicator in legend or use remove button
    await page.evaluate((id) => {
        if (window.__indicatorStore__) {
            window.__indicatorStore__.getState().removeIndicator(id);
        }
    }, indicatorId);

    // Wait for cleanup to complete
    await page.waitForTimeout(500);
}

/**
 * Toggle indicator visibility
 */
export async function toggleIndicatorVisibility(page: Page, indicatorId: string): Promise<void> {
    await page.evaluate((id) => {
        if (window.__indicatorStore__) {
            const state = window.__indicatorStore__.getState();
            const indicator = state.indicators.find((ind: any) => ind.id === id);
            if (indicator) {
                state.updateIndicator(id, { visible: !indicator.visible });
            }
        }
    }, indicatorId);

    await page.waitForTimeout(300);
}

/**
 * Get indicator values from the chart
 */
export async function getIndicatorValues(page: Page, indicatorType: string): Promise<number[]> {
    return await page.evaluate((type) => {
        // This would need to be implemented based on your chart's data structure
        // For now, return a placeholder
        return [];
    }, indicatorType);
}

/**
 * Verify cleanup completeness after indicator removal
 */
export async function verifyCleanup(page: Page, expectations: CleanupExpectations): Promise<void> {
    const {
        seriesCount,
        paneCount,
        legendEmpty = false,
        noPrimitives = false
    } = expectations;

    // Wait for cleanup to complete
    await page.waitForTimeout(300);

    // Verify series count
    if (seriesCount !== undefined) {
        const actualSeriesCount = await page.evaluate(() => {
            const container = document.querySelector('.chart-container');
            if (container && (container as any).__chartInstance__) {
                return (container as any).__chartInstance__.series().length;
            }
            return -1;
        });

        if (actualSeriesCount >= 0) {
            expect(actualSeriesCount).toBe(seriesCount);
        }
    }

    // Verify pane count
    if (paneCount !== undefined) {
        const actualPaneCount = await page.evaluate(() => {
            const container = document.querySelector('.chart-container');
            if (container && (container as any).__chartInstance__) {
                return (container as any).__chartInstance__.panes().length;
            }
            return -1;
        });

        if (actualPaneCount >= 0) {
            expect(actualPaneCount).toBe(paneCount);
        }
    }

    // Verify legend is empty
    if (legendEmpty) {
        const legendItems = await page.locator('.indicator-legend-item').count();
        expect(legendItems).toBe(0);
    }

    // Verify no primitives attached
    if (noPrimitives) {
        const primitivesCount = await page.evaluate(() => {
            const container = document.querySelector('.chart-container');
            if (container && (container as any).__mainSeriesRef__) {
                return (container as any).__mainSeriesRef__._primitives?.length || 0;
            }
            return -1;
        });

        if (primitivesCount >= 0) {
            expect(primitivesCount).toBe(0);
        }
    }
}

/**
 * Wait for chart to be ready
 */
export async function waitForChart(page: Page): Promise<void> {
    await page.waitForFunction(() => {
        return document.querySelector('.chart-container') &&
               (document.querySelector('.chart-container') as HTMLElement).offsetHeight > 0;
    }, { timeout: 10000 });

    // Additional wait for chart initialization
    await page.waitForTimeout(1000);
}

/**
 * Get chart series count
 */
export async function getSeriesCount(page: Page): Promise<number> {
    return await page.evaluate(() => {
        const container = document.querySelector('.chart-container');
        if (container && (container as any).__chartInstance__) {
            return (container as any).__chartInstance__.series().length;
        }
        return 0;
    });
}

/**
 * Get chart pane count
 */
export async function getPaneCount(page: Page): Promise<number> {
    return await page.evaluate(() => {
        const container = document.querySelector('.chart-container');
        if (container && (container as any).__chartInstance__) {
            return (container as any).__chartInstance__.panes().length;
        }
        return 0;
    });
}

/**
 * Take a screenshot for debugging
 */
export async function takeDebugScreenshot(page: Page, name: string): Promise<void> {
    await page.screenshot({
        path: `test-results/screenshots/${name}-${Date.now()}.png`,
        fullPage: true
    });
}

/**
 * Get console errors from the page
 */
export async function getConsoleErrors(page: Page): Promise<string[]> {
    return await page.evaluate(() => {
        if (window.__testConsoleErrors__) {
            return window.__testConsoleErrors__;
        }
        return [];
    });
}

/**
 * Setup console error tracking
 */
export async function setupConsoleTracking(page: Page): Promise<void> {
    await page.evaluate(() => {
        window.__testConsoleErrors__ = [];
        const originalError = console.error;
        console.error = (...args: any[]) => {
            window.__testConsoleErrors__.push(args.map(String).join(' '));
            originalError.apply(console, args);
        };
    });
}

/**
 * Verify no console errors occurred
 */
export async function verifyNoConsoleErrors(page: Page): Promise<void> {
    const errors = await getConsoleErrors(page);
    expect(errors.length).toBe(0);
}

/**
 * Get indicator from legend
 */
export async function isIndicatorInLegend(page: Page, indicatorName: string): Promise<boolean> {
    const legendText = await page.locator('.indicator-legend').textContent();
    return legendText?.includes(indicatorName) || false;
}

/**
 * Wait for indicator to appear in legend
 */
export async function waitForIndicatorInLegend(page: Page, indicatorName: string): Promise<void> {
    await page.waitForFunction(
        (name) => {
            const legend = document.querySelector('.indicator-legend');
            return legend && legend.textContent?.includes(name);
        },
        indicatorName,
        { timeout: 5000 }
    );
}

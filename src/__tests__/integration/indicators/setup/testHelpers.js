/**
 * E2E Test Helpers for Indicator Testing
 *
 * Shared utilities for testing indicator functionality:
 * - Chart setup and initialization
 * - Indicator addition/removal
 * - Cleanup verification
 * - Value extraction and validation
 */

import { expect } from '@playwright/test';

/**
 * Setup chart for testing
 * @param {Page} page - Playwright page object
 * @param {Object} config - Configuration options
 * @returns {Promise<void>}
 */
export async function setupChart(page, config = {}) {
    const {
        symbol = 'RELIANCE',
        exchange = 'NSE',
        interval = '5',
        waitForData = true
    } = config;

    // Navigate to the app
    await page.goto('http://localhost:5001');

    // Wait for chart container to be visible
    await page.waitForSelector('.chart-container', { timeout: 10000 });

    // Wait for chart to load
    await page.waitForFunction(() => {
        const container = document.querySelector('.chart-container');
        return container && container.offsetHeight > 0;
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
                const fiber = chartContainer[fiberKey];
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
                        return chart[key];
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
 * @param {Page} page - Playwright page object
 * @param {Object} config - Indicator configuration
 * @returns {Promise<string>} Indicator ID
 */
export async function addIndicator(page, config) {
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
            const indicator = indicators.find(ind => ind.type === indicatorType);
            return indicator?.id;
        }
        return null;
    }, { indicatorType: type });

    return indicatorId;
}

/**
 * Remove an indicator from the chart
 * @param {Page} page - Playwright page object
 * @param {string} indicatorId - ID of indicator to remove
 */
export async function removeIndicator(page, indicatorId) {
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
 * @param {Page} page - Playwright page object
 * @param {string} indicatorId - ID of indicator
 */
export async function toggleIndicatorVisibility(page, indicatorId) {
    await page.evaluate((id) => {
        if (window.__indicatorStore__) {
            const state = window.__indicatorStore__.getState();
            const indicator = state.indicators.find(ind => ind.id === id);
            if (indicator) {
                state.updateIndicator(id, { visible: !indicator.visible });
            }
        }
    }, indicatorId);

    await page.waitForTimeout(300);
}

/**
 * Get indicator values from the chart
 * @param {Page} page - Playwright page object
 * @param {string} indicatorType - Type of indicator
 * @returns {Promise<Array<number>>} Array of indicator values
 */
export async function getIndicatorValues(page, indicatorType) {
    return await page.evaluate((type) => {
        // This would need to be implemented based on your chart's data structure
        // For now, return a placeholder
        return [];
    }, indicatorType);
}

/**
 * Verify cleanup completeness after indicator removal
 * @param {Page} page - Playwright page object
 * @param {Object} expectations - Expected state after cleanup
 */
export async function verifyCleanup(page, expectations) {
    const {
        seriesCount = 1,      // Only main series should remain
        paneCount = 1,        // Only main pane should remain
        legendEmpty = false,
        noPrimitives = false
    } = expectations;

    // Wait for cleanup to complete
    await page.waitForTimeout(300);

    // Verify series count
    if (seriesCount !== undefined) {
        const actualSeriesCount = await page.evaluate(() => {
            const container = document.querySelector('.chart-container');
            if (container && container.__chartInstance__) {
                return container.__chartInstance__.series().length;
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
            if (container && container.__chartInstance__) {
                return container.__chartInstance__.panes().length;
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
            if (container && container.__mainSeriesRef__) {
                return container.__mainSeriesRef__._primitives?.length || 0;
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
 * @param {Page} page - Playwright page object
 */
export async function waitForChart(page) {
    await page.waitForFunction(() => {
        return document.querySelector('.chart-container') &&
               document.querySelector('.chart-container').offsetHeight > 0;
    }, { timeout: 10000 });

    // Additional wait for chart initialization
    await page.waitForTimeout(1000);
}

/**
 * Get chart series count
 * @param {Page} page - Playwright page object
 * @returns {Promise<number>}
 */
export async function getSeriesCount(page) {
    return await page.evaluate(() => {
        const container = document.querySelector('.chart-container');
        if (container && container.__chartInstance__) {
            return container.__chartInstance__.series().length;
        }
        return 0;
    });
}

/**
 * Get chart pane count
 * @param {Page} page - Playwright page object
 * @returns {Promise<number>}
 */
export async function getPaneCount(page) {
    return await page.evaluate(() => {
        const container = document.querySelector('.chart-container');
        if (container && container.__chartInstance__) {
            return container.__chartInstance__.panes().length;
        }
        return 0;
    });
}

/**
 * Take a screenshot for debugging
 * @param {Page} page - Playwright page object
 * @param {string} name - Screenshot name
 */
export async function takeDebugScreenshot(page, name) {
    await page.screenshot({
        path: `test-results/screenshots/${name}-${Date.now()}.png`,
        fullPage: true
    });
}

/**
 * Get console errors from the page
 * @param {Page} page - Playwright page object
 * @returns {Promise<Array<string>>}
 */
export async function getConsoleErrors(page) {
    return await page.evaluate(() => {
        if (window.__testConsoleErrors__) {
            return window.__testConsoleErrors__;
        }
        return [];
    });
}

/**
 * Setup console error tracking
 * @param {Page} page - Playwright page object
 */
export async function setupConsoleTracking(page) {
    await page.evaluate(() => {
        window.__testConsoleErrors__ = [];
        const originalError = console.error;
        console.error = (...args) => {
            window.__testConsoleErrors__.push(args.map(String).join(' '));
            originalError.apply(console, args);
        };
    });
}

/**
 * Verify no console errors occurred
 * @param {Page} page - Playwright page object
 */
export async function verifyNoConsoleErrors(page) {
    const errors = await getConsoleErrors(page);
    expect(errors.length).toBe(0);
}

/**
 * Get indicator from legend
 * @param {Page} page - Playwright page object
 * @param {string} indicatorName - Name or pattern to match
 * @returns {Promise<boolean>}
 */
export async function isIndicatorInLegend(page, indicatorName) {
    const legendText = await page.locator('.indicator-legend').textContent();
    return legendText?.includes(indicatorName) || false;
}

/**
 * Wait for indicator to appear in legend
 * @param {Page} page - Playwright page object
 * @param {string} indicatorName - Name to wait for
 */
export async function waitForIndicatorInLegend(page, indicatorName) {
    await page.waitForFunction(
        (name) => {
            const legend = document.querySelector('.indicator-legend');
            return legend && legend.textContent.includes(name);
        },
        indicatorName,
        { timeout: 5000 }
    );
}

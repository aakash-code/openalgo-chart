# Indicator E2E Test Suite

Comprehensive end-to-end tests for all 20 indicators in the OpenAlgo Chart system.

## Overview

This test suite verifies:
- ✅ Indicator calculations are correct
- ✅ Chart rendering works properly
- ✅ Legend displays accurate information
- ✅ **Complete cleanup** when indicators are removed
- ✅ Multiple instances work correctly
- ✅ Visibility toggle functions properly
- ✅ Settings updates apply correctly

## Test Structure

```
src/__tests__/integration/indicators/
├── setup/
│   └── testHelpers.js           # Shared test utilities
├── overlay/                      # Overlay indicator tests
│   ├── sma.test.js              ✅ Simple Moving Average
│   ├── ema.test.js              ✅ Exponential Moving Average
│   ├── vwap.test.js             ⏳ Volume Weighted Average Price
│   ├── supertrend.test.js       ⏳ Supertrend
│   ├── bollingerBands.test.js   ⏳ Bollinger Bands
│   ├── ichimoku.test.js         ⏳ Ichimoku Cloud
│   └── pivotPoints.test.js      ⏳ Pivot Points
├── oscillators/                  # Oscillator tests (separate panes)
│   ├── rsi.test.js              ✅ Relative Strength Index
│   ├── stochastic.test.js       ⏳ Stochastic Oscillator
│   ├── macd.test.js             ⏳ MACD
│   ├── atr.test.js              ⏳ Average True Range
│   └── adx.test.js              ⏳ Average Directional Index
├── strategies/                   # Strategy indicator tests
│   ├── annStrategy.test.js      ⏳ ANN Strategy
│   ├── hilengaMilenga.test.js   ⏳ Hilenga-Milenga
│   ├── firstCandle.test.js      ⏳ First Red Candle
│   ├── rangeBreakout.test.js    ⏳ Range Breakout
│   └── priceActionRange.test.js ⏳ Price Action Range
├── primitives/                   # Primitive-based indicator tests
│   ├── tpo.test.js              ⏳ Time Price Opportunity
│   └── riskCalculator.test.js   ⏳ Risk Calculator
└── cleanup/                      # Specialized cleanup tests
    ├── cleanup.test.js          ⏳ General cleanup verification
    ├── priceLines.test.js       ⏳ Price line cleanup
    ├── primitives.test.js       ⏳ Primitive cleanup
    └── multiInstance.test.js    ⏳ Multi-instance cleanup

✅ = Complete (3/23)
⏳ = Pending (20/23)
```

## Test Helpers

### Setup Functions

```javascript
// Setup chart for testing
await setupChart(page, {
    symbol: 'RELIANCE',
    exchange: 'NSE',
    interval: '5',
    waitForData: true
});

// Wait for chart to be fully ready
await waitForChart(page);
```

### Indicator Operations

```javascript
// Add an indicator
const indicatorId = await addIndicator(page, {
    type: 'sma',
    settings: {
        period: 20,
        color: '#FF6D00'
    }
});

// Remove an indicator
await removeIndicator(page, indicatorId);

// Toggle visibility
await toggleIndicatorVisibility(page, indicatorId);
```

### Verification Functions

```javascript
// Verify complete cleanup
await verifyCleanup(page, {
    seriesCount: 1,      // Only main series
    paneCount: 1,        // Only main pane
    legendEmpty: false,
    noPrimitives: true
});

// Get chart metrics
const seriesCount = await getSeriesCount(page);
const paneCount = await getPaneCount(page);

// Check legend
const inLegend = await isIndicatorInLegend(page, 'SMA');
await waitForIndicatorInLegend(page, 'SMA');

// Verify no errors
await verifyNoConsoleErrors(page);
```

## Running Tests

### Run All Indicator Tests

```bash
# Run all indicator integration tests
npm run test:e2e -- src/__tests__/integration/indicators

# Run with UI
npm run test:e2e:ui -- src/__tests__/integration/indicators
```

### Run Specific Test Suites

```bash
# Run only overlay indicator tests
npm run test:e2e -- src/__tests__/integration/indicators/overlay

# Run only oscillator tests
npm run test:e2e -- src/__tests__/integration/indicators/oscillators

# Run a single indicator test
npm run test:e2e -- src/__tests__/integration/indicators/overlay/sma.test.js
```

### Debug Mode

```bash
# Run tests with browser visible
npm run test:e2e -- --headed src/__tests__/integration/indicators/overlay/sma.test.js

# Run with debugger
npm run test:e2e -- --debug src/__tests__/integration/indicators/overlay/sma.test.js
```

## Test Pattern

Each indicator test follows this standard pattern:

```javascript
test.describe('SMA Indicator', () => {
    test.beforeEach(async ({ page }) => {
        await setupChart(page);
        await setupConsoleTracking(page);
    });

    test('should calculate SMA correctly', async ({ page }) => {
        // Test calculation accuracy
    });

    test('should render on chart correctly', async ({ page }) => {
        // Test visual rendering
    });

    test('should appear in legend', async ({ page }) => {
        // Test legend display
    });

    test('should cleanup completely when removed', async ({ page }) => {
        // CRITICAL: Test complete cleanup
        const initialSeriesCount = await getSeriesCount(page);
        const indicatorId = await addIndicator(page, { type: 'sma', settings: { period: 20 } });

        await removeIndicator(page, indicatorId);

        await verifyCleanup(page, {
            seriesCount: initialSeriesCount,
            paneCount: 1
        });

        await verifyNoConsoleErrors(page);
    });

    test('should support multiple instances', async ({ page }) => {
        // Test multiple instances
    });

    test('should handle visibility toggle', async ({ page }) => {
        // Test show/hide
    });
});
```

## Cleanup Verification

The most important test for each indicator is **complete cleanup verification**:

### What Gets Verified

1. **Series Cleanup**
   - All indicator series removed from chart
   - Series count returns to initial state
   - No stale series references

2. **Pane Cleanup** (for oscillators)
   - Indicator pane completely removed
   - Pane count returns to 1 (main pane only)
   - No orphaned panes

3. **Price Line Cleanup** (RSI, ADX, etc.)
   - Overbought/oversold lines removed
   - Reference lines removed
   - No ghost lines on chart

4. **Primitive Cleanup** (TPO, Risk Calculator)
   - Primitives detached from main series
   - Primitive refs set to null
   - No attached primitives remain

5. **Array Cleanup** (First Candle, Range Breakout, PAR)
   - All array elements removed
   - Arrays cleared and reset
   - No orphaned series in arrays

6. **No Console Errors**
   - No errors during cleanup
   - No warnings about stale references
   - Clean execution

## Special Test Cases

### Multi-Instance Cleanup

Tests that removing one instance doesn't affect others:

```javascript
test('should cleanup one instance without affecting others', async ({ page }) => {
    const sma20 = await addIndicator(page, { type: 'sma', settings: { period: 20 } });
    const sma50 = await addIndicator(page, { type: 'sma', settings: { period: 50 } });

    await removeIndicator(page, sma20);

    // SMA(50) should still exist
    const count = await getSeriesCount(page);
    expect(count).toBe(initialCount + 1);
});
```

### Visibility Toggle

Tests that hiding/showing doesn't leak resources:

```javascript
test('should not leak resources on visibility toggle', async ({ page }) => {
    const id = await addIndicator(page, { type: 'tpo' });

    // Toggle multiple times
    for (let i = 0; i < 5; i++) {
        await toggleIndicatorVisibility(page, id);
        await page.waitForTimeout(100);
    }

    // Remove and verify clean
    await removeIndicator(page, id);
    await verifyCleanup(page, { noPrimitives: true });
});
```

### Rapid Add/Remove

Stress test for cleanup robustness:

```javascript
test('should handle rapid add/remove cycles', async ({ page }) => {
    for (let i = 0; i < 10; i++) {
        const id = await addIndicator(page, { type: 'rsi', settings: { period: 14 } });
        await removeIndicator(page, id);
    }

    await verifyCleanup(page, { seriesCount: 1, paneCount: 1 });
    await verifyNoConsoleErrors(page);
});
```

## Coverage Goals

- ✅ **100% Indicator Coverage**: All 20 indicators tested
- ✅ **Cleanup Verification**: Every indicator has cleanup test
- ✅ **Multi-Instance**: All indicators support multiple instances
- ✅ **Visibility Toggle**: All indicators can be shown/hidden
- ✅ **Settings Update**: Settings changes apply correctly
- ✅ **Error-Free**: No console errors during any operation

## CI/CD Integration

These tests run automatically on:
- Pull requests to `main` branch
- Commits to feature branches
- Nightly builds

### Required Checks

All indicator tests must pass before merging:
- ✅ All calculations correct
- ✅ All renders successful
- ✅ All cleanups complete
- ✅ Zero console errors

## Writing New Tests

When adding a new indicator:

1. Create test file in appropriate directory
2. Copy test pattern from similar indicator
3. Implement all 6 standard tests
4. Add cleanup verification test
5. Test locally before committing
6. Update this README with status

## Troubleshooting

### Tests Failing

```bash
# Check if dev server is running
npm run dev

# Clear test cache
rm -rf test-results/

# Run single test with verbose logging
npm run test:e2e -- --debug src/__tests__/integration/indicators/overlay/sma.test.js
```

### Cleanup Tests Failing

If cleanup tests fail, check:
1. Indicator metadata is correct in `indicatorMetadata.js`
2. Type tracking is registered in `ChartComponent.jsx`
3. Cleanup function handles indicator type correctly
4. No async timing issues (add waits if needed)

## Next Steps

- [ ] Complete remaining 20 test files
- [ ] Add visual regression tests
- [ ] Add performance benchmarks
- [ ] Setup CI/CD pipeline
- [ ] Add test coverage reporting

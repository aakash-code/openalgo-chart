/**
 * Browser Console Diagnostic Scripts for Indicator Cleanup
 *
 * Usage: Copy and paste these scripts into browser DevTools console
 * while the app is running at http://localhost:5001
 */

declare global {
    interface Window {
        __chartRefs__: any;
        __indicatorStore__: any;
        __testConsoleErrors__: string[];
        getChartInstance: () => any;
    }
}

// ============================================================================
// DIAGNOSTIC 1: Check Cleanup Infrastructure
// ============================================================================
console.log('=== CLEANUP INFRASTRUCTURE DIAGNOSTIC ===');

const container = document.querySelector('.chart-container') as HTMLElement & {
    __chartInstance__?: any;
    __indicatorTypesMap__?: any;
    __indicatorSeriesMap__?: any;
    __mainSeriesRef__?: any;
};
const chart = container?.__chartInstance__;
const store = window.__indicatorStore__;

console.log('1. Chart exists:', !!chart);
console.log('2. Store exists:', !!store);
console.log('3. indicatorTypesMap exists:', !!container?.__indicatorTypesMap__);
console.log('4. indicatorSeriesMap exists:', !!container?.__indicatorSeriesMap__);
console.log('5. mainSeriesRef exists:', !!container?.__mainSeriesRef__);

if (!chart || !store) {
    console.error('CRITICAL: Chart or Store not initialized!');
} else {
    console.log('✅ Infrastructure ready');
}

// ============================================================================
// DIAGNOSTIC 2: Quick SMA Cleanup Test
// ============================================================================
function testSMACleanup(): void {
    console.log('\n=== TESTING SMA CLEANUP ===');

    const container = document.querySelector('.chart-container') as HTMLElement & {
        __chartInstance__?: any;
        __indicatorTypesMap__?: { current?: Map<string, string> };
        __indicatorSeriesMap__?: { current?: Map<string, any> };
    };
    const chart = container?.__chartInstance__;
    const store = window.__indicatorStore__;

    if (!chart || !store) {
        console.error('Chart or Store not available');
        return;
    }

    const initialCount = chart.series().length;
    console.log('Initial series count:', initialCount);

    console.log('\n--- Adding SMA ---');
    store.getState().addIndicator({
        type: 'sma',
        settings: { period: 20 },
        visible: true
    });

    setTimeout(() => {
        const afterAdd = chart.series().length;
        console.log('After add series count:', afterAdd);
        console.log('Expected:', initialCount + 1);

        const indicators = store.getState().indicators;
        const smaId = indicators.find((i: any) => i.type === 'sma')?.id;

        if (!smaId) {
            console.error('SMA indicator not found in store!');
            return;
        }

        console.log('SMA ID:', smaId);

        // Check if tracked
        const typesMap = container.__indicatorTypesMap__;
        const seriesMap = container.__indicatorSeriesMap__;
        console.log('Type tracked:', typesMap?.current?.get(smaId));
        console.log('Series tracked:', !!seriesMap?.current?.get(smaId));

        console.log('\n--- Removing SMA ---');
        store.getState().removeIndicator(smaId);

        setTimeout(() => {
            const afterRemove = chart.series().length;
            console.log('After remove series count:', afterRemove);
            console.log('Expected:', initialCount);

            console.log('\n=== RESULT ===');
            if (afterRemove === initialCount) {
                console.log('✅ CLEANUP SUCCESS');
            } else {
                console.error('❌ CLEANUP FAILED');
                console.error('Series not removed! Remaining:', afterRemove, 'Expected:', initialCount);
            }
        }, 1000);
    }, 1000);
}

// ============================================================================
// DIAGNOSTIC 3: TPO Primitive Cleanup Test
// ============================================================================
function testTPOCleanup(): void {
    console.log('\n=== TESTING TPO PRIMITIVE CLEANUP ===');

    const container = document.querySelector('.chart-container') as HTMLElement & {
        __mainSeriesRef__?: { _primitives?: any[] };
    };
    const store = window.__indicatorStore__;
    const mainSeries = container?.__mainSeriesRef__;

    if (!mainSeries || !store) {
        console.error('Main series or Store not available');
        return;
    }

    console.log('\n--- Adding TPO ---');
    store.getState().addIndicator({
        type: 'tpo',
        settings: { blockSize: '30m' },
        visible: true
    });

    setTimeout(() => {
        const primitives = mainSeries._primitives || [];
        console.log('Primitives attached:', primitives.length);

        if (primitives.length === 0) {
            console.warn('⚠️ No primitives attached - TPO may not have rendered');
        }

        const tpoId = store.getState().indicators.find((i: any) => i.type === 'tpo')?.id;

        if (!tpoId) {
            console.error('TPO indicator not found in store!');
            return;
        }

        console.log('TPO ID:', tpoId);

        console.log('\n--- Removing TPO ---');
        store.getState().removeIndicator(tpoId);

        setTimeout(() => {
            const remainingPrimitives = mainSeries._primitives || [];
            console.log('Primitives after removal:', remainingPrimitives.length);

            console.log('\n=== RESULT ===');
            if (remainingPrimitives.length === 0) {
                console.log('✅ PRIMITIVE CLEANUP SUCCESS');
            } else {
                console.error('❌ PRIMITIVE CLEANUP FAILED');
                console.error('Primitives still attached:', remainingPrimitives.length);
            }
        }, 1000);
    }, 3000); // TPO takes longer to render
}

// ============================================================================
// DIAGNOSTIC 4: RSI Pane Cleanup Test
// ============================================================================
function testRSICleanup(): void {
    console.log('\n=== TESTING RSI PANE CLEANUP ===');

    const container = document.querySelector('.chart-container') as HTMLElement & {
        __chartInstance__?: any;
    };
    const chart = container?.__chartInstance__;
    const store = window.__indicatorStore__;

    if (!chart || !store) {
        console.error('Chart or Store not available');
        return;
    }

    const initialPaneCount = chart.panes().length;
    console.log('Initial pane count:', initialPaneCount);

    console.log('\n--- Adding RSI ---');
    store.getState().addIndicator({
        type: 'rsi',
        settings: { period: 14, overbought: 70, oversold: 30 },
        visible: true
    });

    setTimeout(() => {
        const afterAdd = chart.panes().length;
        console.log('After add pane count:', afterAdd);
        console.log('Expected:', initialPaneCount + 1);

        const rsiId = store.getState().indicators.find((i: any) => i.type === 'rsi')?.id;

        if (!rsiId) {
            console.error('RSI indicator not found in store!');
            return;
        }

        console.log('RSI ID:', rsiId);

        console.log('\n--- Removing RSI ---');
        store.getState().removeIndicator(rsiId);

        setTimeout(() => {
            const afterRemove = chart.panes().length;
            console.log('After remove pane count:', afterRemove);
            console.log('Expected:', initialPaneCount);

            console.log('\n=== RESULT ===');
            if (afterRemove === initialPaneCount) {
                console.log('✅ PANE CLEANUP SUCCESS');
            } else {
                console.error('❌ PANE CLEANUP FAILED');
                console.error('Pane not removed! Remaining:', afterRemove, 'Expected:', initialPaneCount);
            }
        }, 1000);
    }, 2000);
}

// ============================================================================
// DIAGNOSTIC 5: Multi-Indicator Cleanup Test
// ============================================================================
function testMultiIndicatorCleanup(): void {
    console.log('\n=== TESTING MULTI-INDICATOR CLEANUP ===');

    const container = document.querySelector('.chart-container') as HTMLElement & {
        __chartInstance__?: any;
    };
    const chart = container?.__chartInstance__;
    const store = window.__indicatorStore__;

    if (!chart || !store) {
        console.error('Chart or Store not available');
        return;
    }

    const initialSeriesCount = chart.series().length;
    const initialPaneCount = chart.panes().length;
    console.log('Initial state:', initialSeriesCount, 'series |', initialPaneCount, 'panes');

    console.log('\n--- Adding SMA, EMA, RSI ---');
    store.getState().addIndicator({ type: 'sma', settings: { period: 20 }, visible: true });

    setTimeout(() => {
        store.getState().addIndicator({ type: 'ema', settings: { period: 50 }, visible: true });

        setTimeout(() => {
            store.getState().addIndicator({ type: 'rsi', settings: { period: 14 }, visible: true });

            setTimeout(() => {
                const afterAdd = chart.series().length;
                const afterAddPanes = chart.panes().length;
                console.log('After add:', afterAdd, 'series |', afterAddPanes, 'panes');

                const indicators = store.getState().indicators;
                console.log('Indicators in store:', indicators.length);

                console.log('\n--- Removing all indicators ---');
                indicators.forEach((indicator: any) => {
                    store.getState().removeIndicator(indicator.id);
                });

                setTimeout(() => {
                    const finalSeriesCount = chart.series().length;
                    const finalPaneCount = chart.panes().length;
                    console.log('Final state:', finalSeriesCount, 'series |', finalPaneCount, 'panes');
                    console.log('Expected:', initialSeriesCount, 'series |', initialPaneCount, 'panes');

                    console.log('\n=== RESULT ===');
                    if (finalSeriesCount === initialSeriesCount && finalPaneCount === initialPaneCount) {
                        console.log('✅ MULTI-CLEANUP SUCCESS');
                    } else {
                        console.error('❌ MULTI-CLEANUP FAILED');
                        if (finalSeriesCount !== initialSeriesCount) {
                            console.error('Series mismatch:', finalSeriesCount, 'vs', initialSeriesCount);
                        }
                        if (finalPaneCount !== initialPaneCount) {
                            console.error('Pane mismatch:', finalPaneCount, 'vs', initialPaneCount);
                        }
                    }
                }, 1500);
            }, 1000);
        }, 1000);
    }, 1000);
}

// ============================================================================
// DIAGNOSTIC 6: Generic Cleanup Tester
// ============================================================================
function checkCleanup(indicatorType: string, settings: Record<string, any> = {}): void {
    console.log(`\n=== TESTING ${indicatorType.toUpperCase()} CLEANUP ===`);

    const store = window.__indicatorStore__;
    const chart = (document.querySelector('.chart-container') as any)?.__chartInstance__;

    if (!chart || !store) {
        console.error('Chart or Store not available');
        return;
    }

    const initialCount = chart.series().length;

    store.getState().addIndicator({ type: indicatorType, settings, visible: true });

    setTimeout(() => {
        const afterAdd = chart.series().length;
        console.log(`Added ${indicatorType}: ${initialCount} → ${afterAdd}`);

        const id = store.getState().indicators.find((i: any) => i.type === indicatorType)?.id;

        if (!id) {
            console.error(`${indicatorType} not found in store!`);
            return;
        }

        store.getState().removeIndicator(id);

        setTimeout(() => {
            const afterRemove = chart.series().length;
            console.log(`Removed ${indicatorType}: ${afterAdd} → ${afterRemove}`);
            console.log(`Cleanup ${afterRemove === initialCount ? '✅ SUCCESS' : '❌ FAILED'}`);
        }, 1000);
    }, 1000);
}

// ============================================================================
// QUICK TEST COMMANDS
// ============================================================================
console.log('\n=== AVAILABLE TEST COMMANDS ===');
console.log('testSMACleanup()          - Test simple overlay cleanup');
console.log('testTPOCleanup()          - Test primitive cleanup');
console.log('testRSICleanup()          - Test pane cleanup');
console.log('testMultiIndicatorCleanup() - Test multiple indicators');
console.log('checkCleanup(type, settings) - Generic tester');
console.log('\nExamples:');
console.log('  checkCleanup("sma", { period: 20 })');
console.log('  checkCleanup("rsi", { period: 14 })');
console.log('  checkCleanup("tpo", { blockSize: "30m" })');

export {
    testSMACleanup,
    testTPOCleanup,
    testRSICleanup,
    testMultiIndicatorCleanup,
    checkCleanup
};

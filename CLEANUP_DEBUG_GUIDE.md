# Indicator Cleanup - Debug & Verification Guide

## 🎯 Objective
Verify that indicators properly clean up their drawings when deleted from the chart.

**Issue**: User reports that drawings remain visible after deleting indicators.

---

## ✅ Setup Complete

The following debug enhancements have been added:

### 1. Debug Logging Added
- **ChartComponent.jsx** (lines 2899-2926): Logs cleanup detection and execution
- **indicatorCleanup.js** (lines 224-340): Detailed step-by-step cleanup logging

### 2. Debug Test Files Created
- **e2e/manual-cleanup-debug.spec.js**: Automated test suite
- **src/__tests__/integration/indicators/debug/manual-test.spec.js**: Source version
- **src/__tests__/integration/indicators/debug/console-diagnostics.js**: Browser console scripts

---

## 🚀 Quick Start - Browser Console Testing

### Method 1: Infrastructure Check

1. **Start dev server** (if not running):
   ```bash
   npm run dev
   ```

2. **Open browser** to http://localhost:5001

3. **Open DevTools** (F12 or Cmd+Option+I)

4. **Run diagnostic**:
   ```javascript
   // Check if cleanup infrastructure exists
   console.log('=== CLEANUP INFRASTRUCTURE CHECK ===');
   const container = document.querySelector('.chart-container');
   console.log('Chart exists:', !!container?.__chartInstance__);
   console.log('Store exists:', !!window.__indicatorStore__);
   console.log('Types map exists:', !!container?.__indicatorTypesMap__);
   console.log('Series map exists:', !!container?.__indicatorSeriesMap__);
   ```

### Method 2: Quick SMA Test

Paste this into the console to test SMA cleanup:

```javascript
// QUICK SMA CLEANUP TEST
const container = document.querySelector('.chart-container');
const chart = container?.__chartInstance__;
const store = window.__indicatorStore__;

if (!chart || !store) {
    console.error('❌ Chart or Store not initialized');
} else {
    const initialCount = chart.series().length;
    console.log('Initial series count:', initialCount);

    // Add SMA
    console.log('\n🔵 Adding SMA...');
    store.getState().addIndicator({
        type: 'sma',
        settings: { period: 20 },
        visible: true
    });

    setTimeout(() => {
        const afterAdd = chart.series().length;
        console.log('After add:', afterAdd, '(expected:', initialCount + 1, ')');

        const smaId = store.getState().indicators.find(i => i.type === 'sma')?.id;

        if (!smaId) {
            console.error('❌ SMA not found in store');
            return;
        }

        // Remove SMA
        console.log('\n🔴 Removing SMA...');
        console.log('Watch console for [CLEANUP] logs...');
        store.getState().removeIndicator(smaId);

        setTimeout(() => {
            const afterRemove = chart.series().length;
            console.log('\n=== RESULT ===');
            console.log('After remove:', afterRemove, '(expected:', initialCount, ')');

            if (afterRemove === initialCount) {
                console.log('✅ CLEANUP SUCCESS - Series properly removed');
            } else {
                console.error('❌ CLEANUP FAILED - Series still present');
                console.error('Difference:', afterRemove - initialCount, 'series remaining');
            }
        }, 1500);
    }, 1500);
}
```

### Method 3: Load All Diagnostic Functions

You can load all diagnostic functions from the console-diagnostics.js file:

1. **Copy the entire content** of `src/__tests__/integration/indicators/debug/console-diagnostics.js`
2. **Paste into console**
3. **Run any test**:
   ```javascript
   testSMACleanup()      // Test SMA
   testTPOCleanup()      // Test TPO primitives
   testRSICleanup()      // Test RSI pane
   testMultiIndicatorCleanup() // Test multiple indicators

   // Or use generic tester
   checkCleanup('sma', { period: 20 })
   checkCleanup('ema', { period: 50 })
   checkCleanup('rsi', { period: 14 })
   checkCleanup('bollingerBands', { period: 20, stdDev: 2 })
   ```

---

## 🔍 What to Look For

### ✅ Success Indicators

In the console, you should see:

```
[CLEANUP] Detected indicators to remove: ['abc123']
[CLEANUP] Valid IDs: []
[CLEANUP] Series map keys: ['abc123']
[CLEANUP] Types map: [['abc123', 'sma']]
[CLEANUP] Calling cleanupIndicators with 1 indicators
[CLEANUP] Starting cleanup for sma (ID: abc123)
[CLEANUP] Metadata for sma: { cleanupType: 'simple', hasPane: false, ... }
[CLEANUP] Series exists: true, Pane exists: false
[CLEANUP] Removing series with type: simple
[CLEANUP] Single series removed for sma
[CLEANUP] Successfully cleaned up sma (ID: abc123)
[CLEANUP] Cleanup complete
```

### ❌ Failure Indicators

**Issue 1: No cleanup logs at all**
```
// You add and remove indicator, but NO [CLEANUP] logs appear
```
**Problem**: Cleanup not being triggered
**Check**: Effect dependencies, validIds calculation

**Issue 2: Cleanup runs but series remains**
```
[CLEANUP] Successfully cleaned up sma (ID: abc123)
// But series count doesn't decrease
```
**Problem**: Series removal not working
**Check**: Series reference validity, chart.removeSeries() call

**Issue 3: Type not tracked**
```
[CLEANUP] Types map: []  // Empty!
```
**Problem**: Type tracking not working
**Check**: indicatorTypesMap.current.set() calls

**Issue 4: No metadata found**
```
[CLEANUP] No metadata found for indicator type: sma
```
**Problem**: Metadata registry missing entry
**Check**: indicatorMetadata.js

---

## 📊 Test Matrix

Run each test and document results:

| Indicator | Add Works? | Visual Appears? | Delete Works? | Visual Disappears? | Notes |
|-----------|------------|-----------------|---------------|--------------------|-------|
| SMA | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ | |
| EMA | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ | |
| RSI | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ | Check pane closes |
| Bollinger Bands | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ | 3 lines |
| MACD | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ | Pane + 3 series |
| TPO | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ | Primitive |
| Risk Calculator | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ | Primitive |

---

## 🐛 Common Issues & Fixes

### Issue A: `indicatorTypesMap` is empty

**Symptoms**:
```javascript
console.log(container.__indicatorTypesMap__?.current)
// Map(0) {}  <- Empty!
```

**Fix**: Check that types are being tracked when indicators are created.
**Location**: ChartComponent.jsx - search for `indicatorTypesMap.current.set`

### Issue B: Cleanup never called

**Symptoms**: No `[CLEANUP]` logs when removing indicator

**Possible causes**:
1. `validIds` not updating when indicator removed from store
2. Effect not running when `indicators` prop changes
3. `idsToRemove` calculation incorrect

**Fix**: Check effect dependencies and validIds logic (ChartComponent.jsx ~line 2542-2897)

### Issue C: Series doesn't actually remove

**Symptoms**: Cleanup logs show success but series count unchanged

**Possible causes**:
1. Series reference is stale/invalid
2. `chart.removeSeries()` fails silently
3. Wrong series object stored in map

**Fix**: Add error handling around removeSeries call, verify series validity

### Issue D: Primitives don't detach

**Symptoms**: TPO blocks remain after deletion

**Test**:
```javascript
const container = document.querySelector('.chart-container');
const mainSeries = container.__mainSeriesRef__;
const primitives = mainSeries?._primitives || [];
console.log('Primitives count:', primitives.length);
```

**Fix**: Ensure `mainSeries.detachPrimitive()` is called in cleanup

---

## 🧪 Advanced Debugging

### Check Series Validity

```javascript
const container = document.querySelector('.chart-container');
const chart = container?.__chartInstance__;
const seriesMap = container?.__indicatorSeriesMap__;

// After adding an indicator
const smaId = window.__indicatorStore__.getState().indicators[0]?.id;
const series = seriesMap?.current?.get(smaId);

console.log('Series object:', series);
console.log('Series has setData:', typeof series?.setData === 'function');
console.log('Chart has removeSeries:', typeof chart?.removeSeries === 'function');

// Try manual removal
try {
    chart.removeSeries(series);
    console.log('✅ Manual removal succeeded');
} catch (e) {
    console.error('❌ Manual removal failed:', e);
}
```

### Monitor Store Changes

```javascript
const store = window.__indicatorStore__;

// Subscribe to store changes
const unsubscribe = store.subscribe((state) => {
    console.log('[STORE] Indicators count:', state.indicators.length);
    console.log('[STORE] Indicator IDs:', state.indicators.map(i => i.id));
});

// Later: unsubscribe()
```

### Check Effect Triggers

Add temporary logging to ChartComponent.jsx:

```javascript
useEffect(() => {
    console.log('[EFFECT] Indicators changed, count:', indicators?.length);
    console.log('[EFFECT] Indicator IDs:', indicators?.map(i => i.id));

    // ... rest of effect
}, [indicators, data, symbol, /* other deps */]);
```

---

## 📝 Reporting Results

After running tests, document:

1. **Which indicators fail cleanup?**
   - List specific types (e.g., "SMA, EMA work | RSI, MACD fail")

2. **What remains visible?**
   - Series/lines, panes, primitives, price lines?

3. **Console logs**
   - Do [CLEANUP] logs appear?
   - Any errors or warnings?

4. **Type tracking**
   - Is `indicatorTypesMap` populated?
   - Are series stored in `indicatorSeriesMap`?

5. **Pattern**
   - All indicators fail? Specific types only?
   - First deletion works, subsequent fail?

---

## 🎬 Next Steps Based on Results

### If NO [CLEANUP] logs appear
→ Issue is in ChartComponent effect trigger
→ Check validIds calculation and idsToRemove logic
→ Verify effect dependencies include `indicators`

### If [CLEANUP] logs appear but series remain
→ Issue is in cleanup execution
→ Check series references are valid
→ Verify chart.removeSeries() calls succeed
→ Add error logging around removal

### If some types work, others don't
→ Issue is in metadata or type-specific cleanup
→ Check indicatorMetadata.js entries
→ Verify cleanup type matches indicator structure
→ Check pane/primitive handling for specific types

### If cleanup works in tests but not UI
→ Issue is in UI interaction flow
→ Check how UI calls removeIndicator()
→ Verify store integration

---

## 📞 Support Files

- **Debug logs**: ChartComponent.jsx (lines 2899-2926), indicatorCleanup.js (lines 224-340)
- **Console scripts**: `src/__tests__/integration/indicators/debug/console-diagnostics.js`
- **Test suite**: `e2e/manual-cleanup-debug.spec.js`
- **Metadata**: `src/components/Chart/utils/indicatorMetadata.js`
- **Cleanup engine**: `src/components/Chart/utils/indicatorCleanup.js`

---

## 🚨 Critical Questions to Answer

1. **Does cleanup code execute?**
   Run SMA test and check for `[CLEANUP]` logs → YES / NO

2. **Are types tracked?**
   Check `container.__indicatorTypesMap__` → HAS ENTRIES / EMPTY

3. **Are series stored?**
   Check `container.__indicatorSeriesMap__` → HAS ENTRIES / EMPTY

4. **Does removal succeed?**
   Look for "Successfully cleaned up" log → YES / NO

5. **Does chart actually update?**
   Check series count before/after → DECREASES / STAYS SAME

Answer these 5 questions and we'll know exactly where the issue is!

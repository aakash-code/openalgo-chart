# 🚀 Quick Start - Test Indicator Cleanup NOW

## ⚡ 2-Minute Test

Your dev server is running on **http://localhost:5002** (port changed from 5001)

### Step 1: Open Browser Console

1. Open http://localhost:5002 in your browser
2. Press **F12** (or Cmd+Option+I on Mac) to open DevTools
3. Click the **Console** tab

### Step 2: Paste & Run This Test

```javascript
// QUICK SMA CLEANUP TEST
const container = document.querySelector('.chart-container');
const chart = container?.__chartInstance__;
const store = window.__indicatorStore__;

if (!chart || !store) {
    console.error('❌ Chart or Store not initialized - wait for chart to load');
} else {
    console.log('🔍 Testing SMA Cleanup...\n');

    const initialCount = chart.series().length;
    console.log('📊 Initial series count:', initialCount);

    // Add SMA
    console.log('\n➕ Adding SMA indicator...');
    store.getState().addIndicator({
        type: 'sma',
        settings: { period: 20 },
        visible: true
    });

    setTimeout(() => {
        const afterAdd = chart.series().length;
        console.log('📊 After add:', afterAdd);

        const smaId = store.getState().indicators.find(i => i.type === 'sma')?.id;

        if (!smaId) {
            console.error('❌ SMA not found in store');
            return;
        }

        // WATCH FOR [CLEANUP] LOGS BELOW
        console.log('\n➖ Removing SMA indicator...');
        console.log('👀 WATCH FOR [CLEANUP] LOGS:\n');

        store.getState().removeIndicator(smaId);

        setTimeout(() => {
            const afterRemove = chart.series().length;

            console.log('\n' + '='.repeat(50));
            console.log('📊 FINAL RESULT:');
            console.log('='.repeat(50));
            console.log('Initial count:', initialCount);
            console.log('After removal:', afterRemove);
            console.log('Difference:', afterRemove - initialCount);

            if (afterRemove === initialCount) {
                console.log('\n✅ ✅ ✅ CLEANUP SUCCESS! ✅ ✅ ✅');
                console.log('The indicator was properly removed.');
            } else {
                console.log('\n❌ ❌ ❌ CLEANUP FAILED! ❌ ❌ ❌');
                console.log('Series count should return to', initialCount);
                console.log('but is', afterRemove);
                console.log('\nCheck above for [CLEANUP] logs to see what happened.');
            }
        }, 2000);
    }, 2000);
}
```

### Step 3: Watch the Console

Look for these logs:

**✅ If Working:**
```
[CLEANUP] Detected indicators to remove: ['abc123']
[CLEANUP] Calling cleanupIndicators with 1 indicators
[CLEANUP] Starting cleanup for sma (ID: abc123)
[CLEANUP] Metadata for sma: { cleanupType: 'simple', ... }
[CLEANUP] Series exists: true, Pane exists: false
[CLEANUP] Removing series with type: simple
[CLEANUP] Single series removed for sma
[CLEANUP] Successfully cleaned up sma (ID: abc123)
[CLEANUP] Cleanup complete

✅ ✅ ✅ CLEANUP SUCCESS! ✅ ✅ ✅
```

**❌ If Broken:**

Option A - No [CLEANUP] logs at all:
```
// No [CLEANUP] logs appear
❌ ❌ ❌ CLEANUP FAILED! ❌ ❌ ❌
```
→ **Issue**: Cleanup code not being triggered

Option B - [CLEANUP] logs appear but still fails:
```
[CLEANUP] Successfully cleaned up sma (ID: abc123)
❌ ❌ ❌ CLEANUP FAILED! ❌ ❌ ❌
```
→ **Issue**: Series removal not working

---

## 🧪 Test Other Indicators

Once SMA test runs, test other types:

```javascript
// Test RSI (creates pane)
checkCleanup('rsi', { period: 14 })

// Test Bollinger Bands (3 series)
checkCleanup('bollingerBands', { period: 20, stdDev: 2 })

// Test TPO (primitive)
checkCleanup('tpo', { blockSize: '30m' })
```

**First, define the checkCleanup function:**

```javascript
function checkCleanup(type, settings) {
    const container = document.querySelector('.chart-container');
    const chart = container?.__chartInstance__;
    const store = window.__indicatorStore__;

    const initialCount = chart.series().length;

    console.log(`\n🔍 Testing ${type.toUpperCase()} cleanup...`);
    store.getState().addIndicator({ type, settings, visible: true });

    setTimeout(() => {
        const id = store.getState().indicators.find(i => i.type === type)?.id;
        console.log(`➖ Removing ${type}... (watch for [CLEANUP] logs)`);
        store.getState().removeIndicator(id);

        setTimeout(() => {
            const final = chart.series().length;
            console.log(final === initialCount ? `✅ ${type} SUCCESS` : `❌ ${type} FAILED`);
        }, 2000);
    }, 2000);
}
```

---

## 📋 Report Your Findings

After running the test, report:

**1. Did [CLEANUP] logs appear?** YES / NO

**2. What was the result?** SUCCESS / FAILED

**3. If failed, copy/paste the console output**

**4. Which indicators fail?** (test multiple types)

---

## 📁 Full Debugging Guides

- **Complete Guide**: `CLEANUP_DEBUG_GUIDE.md`
- **All Console Functions**: `src/__tests__/integration/indicators/debug/console-diagnostics.js`
- **Implementation Details**: `IMPLEMENTATION_SUMMARY.md`

---

## 🎯 What This Tells Us

| Logs Appear? | Cleanup Success? | Diagnosis |
|--------------|------------------|-----------|
| ❌ NO | ❌ NO | Cleanup not being called (effect issue) |
| ✅ YES | ❌ NO | Cleanup runs but removal fails (series issue) |
| ✅ YES | ✅ YES | 🎉 Everything working! |

---

## ⚡ Alternative: Load All Test Functions

For comprehensive testing, copy ALL content from:
`src/__tests__/integration/indicators/debug/console-diagnostics.js`

Paste into console, then run:
```javascript
testSMACleanup()
testTPOCleanup()
testRSICleanup()
testMultiIndicatorCleanup()
```

---

**Ready to test!** 🚀

Open http://localhost:5002, open console, paste the test script, and see what happens!

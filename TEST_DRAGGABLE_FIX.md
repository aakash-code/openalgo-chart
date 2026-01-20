# Test Guide: Draggable Risk Calculator Fix

## What Was Fixed

**Problem:** Mouse event listeners were not being attached because `chartElement()` returned null.

**Solution:**
1. Removed stored `_chartElement` property
2. Created `_getChartElement()` helper that gets element inline when needed (matches Visual Trading pattern)
3. Added comprehensive debug logging to diagnose issues
4. Added fallback DOM query if `chartElement()` fails

## Test Steps

### Step 1: Open Browser Console
1. Navigate to http://localhost:5001
2. Open DevTools (F12 or right-click → Inspect)
3. Go to Console tab
4. Clear console (to see fresh logs)

### Step 2: Add Risk Calculator
1. Click "Indicators" button
2. Select "Risk Management" → "Risk Calculator"
3. Enter test values:
   - Capital: 500000
   - Risk %: 1
   - Side: BUY
   - Entry Price: 890
   - Stop Loss Price: 880
   - R:R: 2
4. Click "Calculate"

### Step 3: Check Console Logs

You should see logs like this:

```
[RiskCalculator] Constructor called with options: {entryPrice: 890, stopLossPrice: 880, ...}
[RiskCalculator] Constructor complete, handlers bound
[RiskCalculator] attached() called
[RiskCalculator] Chart and series references stored
[RiskCalculator] chartElement: <div class="tv-lightweight-charts">
[RiskCalculator] chartElement is HTMLElement: true
[RiskCalculator] Attaching mouse event listeners...
[RiskCalculator] Mouse event listeners attached successfully
[RiskCalculator] Subscribing to crosshairMove...
[RiskCalculator] crosshairMove subscription complete
[RiskCalculator] attached() complete
```

**If you see:** `chartElement is null! Cannot attach mouse listeners`
- The fallback should kick in and try `document.querySelector('.tv-lightweight-charts')`

### Step 4: Test Hover Detection

1. Move your mouse cursor slowly over the **Entry line (green)**
2. **Expected in console:**
   ```
   [RiskCalculator] Hovering over Entry line
   [RiskCalculator] Cursor changed to ns-resize
   ```
3. **Expected visual:**
   - Cursor changes to **vertical resize arrows (↕️)**
   - Line becomes slightly thicker/brighter

4. Move cursor over **Stop Loss line (red)**
5. **Expected:**
   - Same hover logs for Stop Loss
   - Cursor changes to ns-resize
   - Line highlights

### Step 5: Test Dragging Entry Line

1. **Hover over Entry line** (green) until cursor shows ns-resize
2. **Click and hold** left mouse button
3. **Expected in console:**
   ```
   [RiskCalculator] Mouse down, hoveredLine: entry
   [RiskCalculator] Started dragging: entry
   [RiskCalculator] Chart scroll/scale locked
   ```

4. **Drag upward** (increase price by ~10 points)
5. **Expected during drag:**
   ```
   [RiskCalculator] Dragging to price: 891.5
   [RiskCalculator] Dragging to price: 893.2
   [RiskCalculator] Dragging to price: 895.7
   ... (continuous updates)
   ```

6. **Release mouse button**
7. **Expected in console:**
   ```
   [RiskCalculator] Mouse up, final price: 900
   [RiskCalculator] Calling onPriceChange callback with: entry 900
   [RiskCalculator] Drag state cleaned up
   [RiskCalculator] Chart scroll/scale unlocked
   ```

### Step 6: Verify Calculations Updated

After releasing the mouse, check that:

1. **Panel Updates:**
   - Entry Price: ₹900.00 (was 890)
   - Stop Loss: ₹880.00 (unchanged)
   - SL Points: 20 (was 10)
   - Quantity: 250 shares (was 500)
   - Target: ₹940.00 (was 910)

2. **Chart Updates:**
   - Entry line moved to ₹900
   - Stop Loss line stayed at ₹880
   - Target line moved to ₹940
   - Shaded zones adjusted

### Step 7: Test Stop Loss Dragging

1. **Hover over Stop Loss line** (red)
2. **Click and drag downward** (e.g., from 880 → 875)
3. **Expected:**
   - Same console logging pattern as Entry
   - Line moves smoothly
   - Calculations update on release

4. **After release, verify:**
   - Stop Loss: ₹875.00
   - SL Points: 25 (900 - 875)
   - Quantity: 200 shares (recalculated)
   - Target: ₹950 (900 + 25×2)

### Step 8: Test Validation Constraints (BUY Side)

1. **Try to drag Entry line BELOW Stop Loss**
2. **Expected:**
   - Cursor changes to `not-allowed` (🚫)
   - Console shows: `Invalid price during drag`
   - Line stops at Stop Loss price (cannot go below)

3. **Try to drag Stop Loss ABOVE Entry**
4. **Expected:**
   - Same constraint behavior
   - Line blocked at Entry price

### Step 9: Test SELL Side

1. **Edit indicator** → Change side to SELL
2. **Enter:**
   - Entry: 880
   - Stop Loss: 890 (now SL is ABOVE entry for SELL)
3. **Calculate**

4. **Try to drag Entry ABOVE Stop Loss**
5. **Expected:** Blocked (entry must stay < SL for SELL)

6. **Try to drag Stop Loss BELOW Entry**
7. **Expected:** Blocked (SL must stay > entry for SELL)

### Step 10: Test Target Line (Read-Only)

1. **Hover over Target line** (blue dashed)
2. **Expected:**
   - Cursor stays `default` (no ns-resize)
   - No hover logs
   - Cannot drag

## Success Criteria Checklist

- [ ] Console shows `Mouse event listeners attached successfully`
- [ ] Cursor changes to `ns-resize` when hovering Entry/SL lines
- [ ] Console logs hover detection (`Hovering over Entry line`)
- [ ] Mousedown starts drag (`Started dragging: entry`)
- [ ] Mousemove shows price updates during drag
- [ ] Mouseup completes drag and calls callback
- [ ] Panel updates with new calculations after drag
- [ ] Lines move on chart to new positions
- [ ] Target line auto-calculates and moves
- [ ] Validation prevents invalid drags (cursor: not-allowed)
- [ ] BUY constraints work (entry > SL)
- [ ] SELL constraints work (entry < SL)
- [ ] Target line is not draggable

## Troubleshooting

### Issue: "chartElement is null"
**If you see this error:**
1. Check if fallback logs appear: `Found fallback chart element via DOM query`
2. If fallback also fails: `Fallback failed - no chart element found in DOM`
3. This means chart hasn't fully initialized yet
4. Try:
   - Refresh page
   - Remove and re-add Risk Calculator indicator
   - Check if other primitives (Visual Trading) work

### Issue: Cursor doesn't change
**Possible causes:**
1. `chartElement` is null → check console logs
2. Hover threshold too small → hover closer to line
3. Lines not at correct Y coordinates → check if lines are visible

### Issue: Drag doesn't update calculations
**Check console for:**
1. `Calling onPriceChange callback` - if missing, callback isn't firing
2. Check ChartComponent.jsx handleRiskCalculatorDrag is defined
3. Check if onIndicatorSettings callback is wired correctly

### Issue: Lines don't move after drag
**Possible causes:**
1. Callback fires but ChartComponent doesn't re-render
2. Check if indicator settings actually update
3. Check if calculateRiskPosition is called with new values
4. Check if primitive is recreated with new prices

## Debugging Commands

If things still don't work, run these in console:

```javascript
// Check if chart element exists
document.querySelector('.tv-lightweight-charts')

// Check if Risk Calculator primitive is attached
// (This will be visible in React DevTools)
```

## Expected Performance

- **Hover detection:** Instant, no lag
- **Drag smoothness:** 60 FPS, no jitter
- **Calculation update:** < 100ms after release
- **Line redraw:** Immediate after calculation

## Report Results

After testing, report:
1. ✅ or ❌ for each test step
2. Any console errors
3. Screenshots of successful drag
4. Any unexpected behavior

---

**Testing Date:** 2026-01-20
**Build:** Vite HMR
**Port:** http://localhost:5001

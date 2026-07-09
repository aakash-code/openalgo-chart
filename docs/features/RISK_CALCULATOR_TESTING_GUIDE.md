# Risk Calculator Testing Guide

## Overview
This guide will help you test the new Risk Calculator enhancements:
1. **Manual Target Price Input** - Enter target price directly and see auto-calculated R:R ratio
2. **Draggable Target Line** - Drag all three lines (Entry, Stop Loss, Target) on the chart

---

## Prerequisites

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Open the application:**
   - Navigate to http://localhost:5001
   - Open browser DevTools (F12)
   - Go to Console tab
   - Clear console for fresh logs

---

## Test 1: Manual Target Price Input

### Test Case 1.1: Manual Target with Calculated R:R Ratio

1. **Add Risk Calculator:**
   - Click "Indicators" → "Risk Management" → "Risk Calculator"

2. **Enter values with manual target:**
   - Capital: ₹500,000
   - Risk %: 1
   - Side: BUY
   - Entry: 890
   - Stop Loss: 880
   - **Target Price: 920** (manual entry)
   - Leave R:R ratio field empty (it should disappear when target is entered)

3. **Click "Calculate"**

4. **Expected Results:**
   - ✅ Panel displays:
     - Entry: ₹890.00
     - Stop Loss: ₹880.00
     - Target: ₹920.00
     - **Risk:Reward Ratio: 1:3.00** (calculated: 30 target points / 10 SL points)
     - Quantity: 500 shares
     - Risk: ₹5,000
     - Reward: ₹15,000

   - ✅ Chart shows three lines:
     - Green solid line at ₹890 (Entry)
     - Red solid line at ₹880 (Stop Loss)
     - Blue dashed line at ₹920 (Target)

### Test Case 1.2: Auto-Calculated Target (Backward Compatibility)

1. **Click "Edit" button in Risk Calculator panel**

2. **Clear target price field** (leave it empty or enter 0)

3. **Select R:R ratio:** 1:2

4. **Click "Calculate"**

5. **Expected Results:**
   - ✅ Target auto-calculates to ₹910 (890 + 10×2)
   - ✅ R:R Ratio displays: 1:2.00
   - ✅ Blue target line appears at ₹910

### Test Case 1.3: Validation - Invalid Target Position

1. **Edit again and try entering target BELOW entry for BUY:**
   - Entry: 890
   - Stop Loss: 880
   - Target: 885 (invalid - should be above entry for BUY)
   - Click Calculate

2. **Expected Results:**
   - ❌ Error message: "For BUY: Target must be above Entry"
   - ✅ Lines don't update on chart

3. **Try the reverse for SELL:**
   - Side: SELL
   - Entry: 890
   - Stop Loss: 900
   - Target: 895 (invalid - should be below entry for SELL)
   - Click Calculate

4. **Expected Results:**
   - ❌ Error message: "For SELL: Target must be below Entry"

---

## Test 2: Drag Functionality Verification

### Test Case 2.1: Verify Event Listeners Attach

1. **Open console after adding Risk Calculator**

2. **Expected Console Logs:**
   ```
   [RiskCalculator] Constructor called with options: {...}
   [RiskCalculator] attached() called
   [RiskCalculator] Chart and series references stored
   [RiskCalculator] chartElement: <div class="tv-lightweight-charts">
   [RiskCalculator] chartElement is HTMLElement: true
   [RiskCalculator] Attaching mouse event listeners...
   [RiskCalculator] Mouse event listeners attached successfully
   [RiskCalculator] Subscribing to crosshairMove...
   [RiskCalculator] crosshairMove subscription complete
   ```

3. **If you see error:**
   ```
   [RiskCalculator] chartElement is null! Cannot attach mouse listeners
   ```
   - Check if fallback works: `Found fallback chart element via DOM query`
   - If both fail: Timing issue - chart hasn't initialized yet

### Test Case 2.2: Test Entry Line Hover & Drag

1. **Move cursor slowly over Entry line (green)**

2. **Expected in Console:**
   ```
   [RiskCalculator] Hovering over Entry line
   [RiskCalculator] Cursor changed to ns-resize
   ```

3. **Expected Visual:**
   - Cursor changes to vertical resize arrows (↕️)

4. **Click and drag Entry line upward** (e.g., from 890 to 900)

5. **Expected During Drag:**
   ```
   [RiskCalculator] Mouse down, hoveredLine: entry
   [RiskCalculator] Started dragging: entry
   [RiskCalculator] Chart scroll/scale locked
   [RiskCalculator] Dragging to price: 891.5
   [RiskCalculator] Dragging to price: 893.2
   [RiskCalculator] Dragging to price: 895.8
   ...
   ```

6. **Release mouse at ₹900**

7. **Expected on Mouse Up:**
   ```
   [RiskCalculator] Mouse up, final price: 900
   [RiskCalculator] Calling onPriceChange callback with: entry 900
   [RiskCalculator] Drag state cleaned up
   [RiskCalculator] Chart scroll/scale unlocked
   ```

8. **Expected Panel Updates:**
   - ✅ Entry updates to ₹900.00
   - ✅ SL Points recalculate (now 20 instead of 10)
   - ✅ Quantity recalculates (now 250 instead of 500 shares)
   - ✅ If target is auto-calculated: Target updates to ₹940 (900 + 20×2)
   - ✅ If target is manual (920): R:R ratio recalculates to 1:1.00 (20/20)

### Test Case 2.3: Test Stop Loss Line Drag

1. **Hover over Stop Loss line (red)**

2. **Expected:**
   - Cursor changes to ns-resize
   - Console logs: `Hovering over Stop Loss line`

3. **Drag Stop Loss down** (e.g., from 880 to 870)

4. **Expected:**
   - Line moves smoothly
   - Console shows drag price updates
   - Panel recalculates with new SL Points (30 instead of 20)

### Test Case 2.4: Test Target Line Drag (NEW!)

1. **Hover over Target line (blue dashed)**

2. **Expected:**
   - ✅ Cursor changes to ns-resize
   - ✅ Console logs: `Hovering over Target line`

3. **Drag Target line up** (e.g., from 920 to 930)

4. **Expected During Drag:**
   ```
   [RiskCalculator] Mouse down, hoveredLine: target
   [RiskCalculator] Started dragging: target
   [RiskCalculator] Dragging to price: 922.5
   [RiskCalculator] Dragging to price: 925.0
   [RiskCalculator] Dragging to price: 928.3
   ```

5. **Expected on Mouse Up:**
   ```
   [RiskCalculator] Mouse up, final price: 930
   [RiskCalculator] Calling onPriceChange callback with: target 930
   ```

6. **Expected Panel Updates:**
   - ✅ Target field updates to ₹930.00
   - ✅ R:R Ratio recalculates to 1:4.00 (40 target points / 10 SL points)
   - ✅ Reward Points: 40.00
   - ✅ Reward Amount: ₹20,000 (40 × 500 shares)

### Test Case 2.5: Validation During Drag

**Test: Try dragging Target BELOW Entry for BUY**

1. **Setup:**
   - Side: BUY
   - Entry: 890
   - Target: 920

2. **Try to drag Target down past Entry line (below 890)**

3. **Expected:**
   - ✅ Cursor changes to `not-allowed` (🚫)
   - ✅ Line doesn't move below entry
   - ✅ Console logs: `Invalid price during drag: 885`

**Test: Try dragging Entry ABOVE Target for BUY**

1. **Try to drag Entry up past Target line (above 920)**

2. **Expected:**
   - ✅ Cursor changes to `not-allowed`
   - ✅ Line doesn't move above target
   - ✅ Drag is blocked

---

## Test 3: Edge Cases

### Test Case 3.1: Switch Between Manual and Auto Target

1. **Start with manual target:**
   - Entry: 890, SL: 880, Target: 920
   - Calculate → R:R shows 1:3.00

2. **Edit and clear target field**
   - Leave target empty
   - Notice R:R ratio dropdown appears
   - Select 1:2 from dropdown
   - Calculate

3. **Expected:**
   - Target auto-calculates to ₹910
   - R:R shows 1:2.00

4. **Edit again and re-enter manual target:**
   - Target: 920
   - Notice R:R dropdown disappears
   - Calculate

5. **Expected:**
   - R:R recalculates to 1:3.00

### Test Case 3.2: Drag Target, Then Switch to Auto

1. **Start with manual target: 920**

2. **Drag target to 930**
   - R:R updates to 1:4.00

3. **Edit panel, clear target field**
   - Select R:R: 1:2
   - Calculate

4. **Expected:**
   - Target jumps back to ₹910 (auto-calculated)
   - R:R shows 1:2.00

### Test Case 3.3: Very Small R:R Ratio

1. **Enter values that create small R:R:**
   - Entry: 890
   - SL: 880
   - Target: 892 (very close to entry)

2. **Expected:**
   - ✅ Calculation succeeds
   - ✅ R:R shows: 1:0.20
   - ✅ Warning if desired: "Target very close to entry"

---

## Test 4: Performance & Smoothness

### Test Case 4.1: Smooth Drag Performance

1. **Drag each line multiple times**

2. **Check:**
   - ✅ Lines move smoothly (60 FPS, no stuttering)
   - ✅ No lag between mouse movement and line position
   - ✅ No console errors during drag
   - ✅ Memory usage doesn't increase (check DevTools Performance tab)

### Test Case 4.2: Rapid Drags

1. **Quickly drag Entry up and down 10 times**

2. **Expected:**
   - ✅ All drags register correctly
   - ✅ Panel updates after each drag
   - ✅ No calculation errors
   - ✅ No memory leaks

---

## Test 5: Multi-Line Scenarios

### Test Case 5.1: Drag All Three Lines in Sequence

1. **Start with:** Entry: 890, SL: 880, Target: 920

2. **Drag Entry to 900**
   - ✅ Panel updates: Entry ₹900, R:R changes to 1:1.00

3. **Drag SL to 890**
   - ✅ Panel updates: SL ₹890, SL Points to 10, R:R back to 1:3.00

4. **Drag Target to 930**
   - ✅ Panel updates: Target ₹930, R:R to 1:4.00

5. **Expected Final State:**
   - Entry: ₹900
   - SL: ₹890
   - Target: ₹930
   - SL Points: 10
   - R:R Ratio: 1:4.00

---

## Success Criteria Summary

### Feature: Manual Target Input
- ✅ Target price input field visible in panel
- ✅ Can manually enter target price
- ✅ R:R ratio displays as calculated value (read-only display)
- ✅ R:R dropdown hides when manual target entered
- ✅ Validation prevents invalid target positions
- ✅ Calculations correct with manual target
- ✅ Can switch between manual and auto target

### Feature: Draggable Target Line
- ✅ Console shows event listeners attached
- ✅ Hover over target line changes cursor to ns-resize
- ✅ Target line is draggable (not blocked)
- ✅ Dragging target updates panel's target price field
- ✅ Dragging target recalculates R:R ratio
- ✅ All three lines (Entry, SL, Target) are draggable
- ✅ Validation blocks invalid drag positions
- ✅ Smooth 60 FPS drag performance
- ✅ No console errors during operation

---

## Common Issues & Troubleshooting

### Issue: chartElement is null
**Symptoms:** Console shows "chartElement is null! Cannot attach mouse listeners"

**Fix Options:**
1. Check if fallback works: Look for "Found fallback chart element via DOM query"
2. If fallback also fails: Chart hasn't initialized - add timing delay
3. Verify chart container exists in DOM: Inspect element with class `.tv-lightweight-charts`

### Issue: Hover Detection Not Working
**Symptoms:** Cursor doesn't change to ns-resize when hovering over lines

**Debug:**
1. Check if crosshairMove is firing: Add log at start of `_onCrosshairMove`
2. Verify lines are visible on chart
3. Check if other primitives (Visual Trading) work
4. Inspect threshold distance (currently 8 pixels)

### Issue: Drag Starts But Line Doesn't Move
**Symptoms:** Console shows "Started dragging" but line stays in place

**Debug:**
1. Check if `updateAllViews()` is called during mousemove
2. Verify renderer.draw() method is being called
3. Check if price conversion (coordinateToPrice) returns valid values

### Issue: Drag Works But Panel Doesn't Update
**Symptoms:** Line moves but panel values stay the same

**Debug:**
1. Check if `onPriceChange` callback is called (console log)
2. Verify `handleRiskCalculatorDrag` receives the update
3. Check if `onIndicatorSettings` is called with correct values
4. Inspect if indicator settings trigger re-calculation

### Issue: R:R Ratio Not Calculated Correctly
**Symptoms:** Manual target entered but R:R ratio shows wrong value

**Debug:**
1. Verify calculation logic in `riskCalculator.js` lines 89-103
2. Check if targetPoints and slPoints are calculated correctly
3. Ensure finalRiskRewardRatio is used in return object
4. Test with simple values: Entry 100, SL 90, Target 120 → should be 1:2.00

---

## Testing Checklist

Use this checklist to verify all functionality:

- [ ] Manual target input field appears in panel
- [ ] R:R dropdown hides when manual target entered
- [ ] R:R ratio calculated correctly from manual target
- [ ] Can clear target to use auto-calculation
- [ ] Validation blocks target on wrong side of entry
- [ ] Console shows "Mouse event listeners attached successfully"
- [ ] Hovering Entry line changes cursor to ns-resize
- [ ] Hovering Stop Loss line changes cursor to ns-resize
- [ ] Hovering Target line changes cursor to ns-resize
- [ ] Can drag Entry line smoothly
- [ ] Can drag Stop Loss line smoothly
- [ ] Can drag Target line smoothly
- [ ] Dragging Entry updates panel Entry field
- [ ] Dragging SL updates panel SL field
- [ ] Dragging Target updates panel Target field
- [ ] Dragging Target recalculates R:R ratio
- [ ] Invalid drag positions show not-allowed cursor
- [ ] All calculations correct after drag
- [ ] No console errors during operation
- [ ] Smooth 60 FPS performance
- [ ] Can switch between manual and auto target multiple times

---

## Next Steps After Testing

1. **If all tests pass:** Feature is ready for production
2. **If drag doesn't work:** Review `RiskCalculatorLines.ts` event listeners
3. **If calculations wrong:** Review `riskCalculator.js` calculation logic
4. **If UI issues:** Review `RiskCalculatorPanel.jsx` and `RiskSettings.jsx`
5. **If TypeScript errors:** Review `types.ts` callback signatures

## Reporting Issues

If you find issues, please report with:
1. **Test case number** that failed
2. **Expected behavior** (from this guide)
3. **Actual behavior** you observed
4. **Console logs** (full error messages)
5. **Steps to reproduce** exactly

Good luck with testing! 🚀

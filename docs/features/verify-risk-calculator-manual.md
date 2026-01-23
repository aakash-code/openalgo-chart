# Manual Verification: Risk Calculator Input Mode

## Implementation Complete ✅

The Risk Calculator now has a fully functional input mode that allows users to configure parameters directly in the floating panel.

## What Was Implemented

### 1. Input Mode UI
- ✅ Capital (₹) input field
- ✅ Risk % input field
- ✅ Side dropdown (BUY/SELL)
- ✅ Entry Price input field
- ✅ Stop Loss input field
- ✅ Risk:Reward dropdown (1:1, 1:1.5, 1:2, 1:2.5, 1:3, 1:4, 1:5)
- ✅ "Use LTP" button (automatically populated with current price)
- ✅ Calculate button
- ✅ Error messages display when validation fails

### 2. Edit Button in Results View
- ✅ Edit icon button in header to switch back to input mode
- ✅ Toggle between edit mode and display mode

### 3. Callbacks and Data Flow
- ✅ onUpdateSettings callback wired to ChartComponent
- ✅ Current LTP passed to panel for "Use LTP" button
- ✅ Settings sync between panel and indicator state

## Manual Testing Steps

### Step 1: Add Risk Calculator to Chart
1. Navigate to http://localhost:5001
2. Click "Indicators" button in top toolbar
3. Navigate to "Risk Management" category
4. Click "Risk Calculator"
5. **Expected:** Floating panel appears with input fields (edit mode)

### Step 2: Test "Use LTP" Button
1. In the Risk Calculator panel, locate "Entry Price" field
2. Click the blue "Use LTP (₹xxx.xx)" button below the entry price field
3. **Expected:** Entry price field populates with current market price

### Step 3: Fill in Parameters
Fill in the following values:
- Capital: 500000
- Risk %: 1
- Side: BUY
- Entry Price: (Use LTP button or enter 893)
- Stop Loss: 885
- Risk:Reward: 1:2

### Step 4: Calculate
1. Click the blue "Calculate" button at the bottom
2. **Expected:** Panel switches to display mode showing:
   - Risk Amount: ₹5,000
   - SL Points: 8
   - Quantity: 625 shares
   - Position Value: ₹558,125
   - Target Price: ₹909
   - Reward Points: 16
   - Reward Amount: ₹10,000
   - Risk : Reward: 1 : 2

### Step 5: Verify Price Lines on Chart
1. After calculation, check the chart
2. **Expected:** Three horizontal lines appear:
   - Green line at ₹893 (Entry)
   - Red line at ₹885 (Stop Loss)
   - Blue dashed line at ₹909 (Target)

### Step 6: Test Edit Mode
1. In the results panel, click the Edit icon (pencil icon) in the header
2. **Expected:** Panel switches back to input mode
3. Modify any value (e.g., change Stop Loss to 880)
4. Click Calculate again
5. **Expected:** Results update with new values

### Step 7: Test Settings Dialog (Alternative Method)
1. Hover over "Risk Calculator" in the chart legend (left side)
2. Click the gear icon that appears
3. **Expected:** Settings dialog opens with all parameters
4. Modify values in dialog
5. Click "Ok"
6. **Expected:** Floating panel updates with new values

### Step 8: Verify Validation
1. In edit mode, set Stop Loss to 0 or invalid value
2. Click Calculate
3. **Expected:** Error message appears: "Stop loss price must be greater than 0"
4. For BUY: Entry must be > Stop Loss
5. For SELL: Entry must be < Stop Loss

## Success Criteria

All of the following should work:
- ✅ Users can input values directly in the floating panel
- ✅ "Use LTP" button populates current market price
- ✅ Calculate button triggers calculation and shows results
- ✅ Edit button switches back to input mode
- ✅ Settings sync between panel and settings dialog
- ✅ Price lines appear on chart with correct colors
- ✅ Validation errors display clearly
- ✅ Panel is draggable
- ✅ Panel can be minimized and closed

## Files Modified

1. **RiskCalculatorPanel.jsx** (src/components/RiskCalculatorPanel/)
   - Added edit mode state and form inputs
   - Added handlers for input changes
   - Added "Use LTP" button functionality
   - Added Calculate button to trigger updates
   - Added Edit button to switch back to input mode

2. **ChartComponent.jsx** (src/components/Chart/)
   - Added onUpdateSettings callback
   - Added currentLTP prop for "Use LTP" button

3. **RiskCalculatorPanel.module.css**
   - Added calculateButton styles
   - Added errorMessage styles
   - Existing inputGroup styles for form inputs

## Known Issues / Notes

- The panel shows input mode by default when first added (due to error state)
- Once a valid calculation is performed, it switches to display mode
- Edit button allows switching back to input mode anytime
- The standard settings dialog (gear icon) still works as an alternative

## Next Steps (Optional Enhancements)

If needed, consider:
- Add keyboard shortcuts (Enter to calculate)
- Add preset buttons for common risk percentages (1%, 2%, 3%)
- Remember last used values in localStorage
- Add "Quick Calculate" mode that auto-calculates on input change

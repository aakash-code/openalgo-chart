# Risk Calculator Indicator

## Overview

The Risk Calculator is a visual risk & position sizing indicator for openalgo-chart using TradingView Lightweight Charts. It helps traders calculate the optimal position size based on their trading capital, risk tolerance, entry price, and stop loss.

**Inspired by**: [TradingView Risk Calculator](https://www.tradingview.com/script/LJGj41W8-Risk-Calculator/)

## Features

✅ **Visual Indicator**: Display Entry, Stop Loss, and Target lines on chart
✅ **Risk Calculation**: Calculate quantity based on capital and risk %
✅ **Target Calculation**: Calculate target price based on Risk:Reward ratio
✅ **Floating Panel**: Show live calculations in overlay panel
✅ **Interactive**: Update when user changes inputs or moves lines

## Implementation Status

### Completed Components

1. **Core Calculation Logic** (`src/utils/indicators/riskCalculator.js`)
   - Position sizing calculations
   - Risk/reward calculations
   - Input validation
   - Formatted output for display

2. **React Hook** (`src/hooks/useRiskCalculator.js`)
   - State management for risk calculator
   - Memoized calculations
   - Parameter updates
   - Helper functions

3. **UI Components**
   - `RiskCalculatorPanel.jsx` - Floating info panel
   - `RiskCalculatorPanel.module.css` - Styling
   - `RiskSettings.jsx` - Settings form

4. **Chart Integration**
   - `riskCalculatorChart.js` - Price line management
   - Added to `indicatorConfigs.js`

5. **Tests**
   - Test cases for all calculation scenarios
   - Validation error tests
   - Edge case handling

## Calculation Logic

### Risk Calculation
```javascript
// Step 1: Calculate risk amount
risk_amount = capital × (risk_percent / 100)

// Step 2: Calculate stop loss points
sl_points = Math.abs(entry_price - stop_loss_price)

// Step 3: Calculate quantity (if sl_points > 0)
quantity = Math.floor(risk_amount / sl_points)

// Step 4: Calculate position value
position_value = quantity × entry_price
```

### Target / Risk-Reward Logic
```javascript
// For BUY:
target_price = entry_price + (sl_points × RR)

// For SELL:
target_price = entry_price - (sl_points × RR)

// Reward calculation:
reward_points = Math.abs(target_price - entry_price)
reward_amount = reward_points × quantity
```

## Test Results

All test cases pass successfully:

### Test Case 1: Basic BUY Setup
**Input:**
- Capital: ₹200,000
- Risk %: 1%
- Entry: ₹500
- Stop Loss: ₹490
- Risk:Reward: 2:1
- Side: BUY

**Output:**
- ✅ Risk Amount: ₹2,000
- ✅ SL Points: 10
- ✅ Quantity: 200 shares
- ✅ Position Value: ₹100,000
- ✅ Target: ₹520
- ✅ Reward Points: 20
- ✅ Reward Amount: ₹4,000
- ✅ Risk:Reward: 1:2

### Test Case 2: SELL Setup
**Input:**
- Capital: ₹100,000
- Risk %: 2%
- Entry: ₹1,000
- Stop Loss: ₹1,050
- Risk:Reward: 3:1
- Side: SELL

**Output:**
- ✅ Risk Amount: ₹2,000
- ✅ SL Points: 50
- ✅ Quantity: 40 shares
- ✅ Target: ₹850
- ✅ Reward Amount: ₹6,000

### Test Case 3-5: Validation
- ✅ Entry = SL → Error detected
- ✅ BUY with entry < SL → Error detected
- ✅ SELL with entry > SL → Error detected

## Usage

### Basic Usage

```javascript
import useRiskCalculator from './hooks/useRiskCalculator';
import RiskCalculatorPanel from './components/RiskCalculatorPanel/RiskCalculatorPanel';

function MyComponent() {
  const { params, results, updateParam } = useRiskCalculator({
    capital: 100000,
    riskPercent: 2,
    entryPrice: 500,
    stopLossPrice: 490,
    riskRewardRatio: 2,
    side: 'BUY'
  });

  return (
    <RiskCalculatorPanel
      results={results}
      params={params}
      onClose={() => {}}
    />
  );
}
```

### Chart Integration

```javascript
import { updateRiskCalculatorLines } from './utils/indicators/riskCalculatorChart';

// In your chart component
useEffect(() => {
  if (riskCalculatorActive && mainSeries) {
    updateRiskCalculatorLines({
      series: mainSeries,
      linesRef: riskLinesRef,
      results: calculationResults,
      settings: {
        entryColor: '#26a69a',
        stopLossColor: '#ef5350',
        targetColor: '#42a5f5',
        lineWidth: 2,
      },
      isActive: true
    });
  }
}, [riskCalculatorActive, calculationResults]);
```

## File Structure

```
openalgo-chart/
├── src/
│   ├── utils/
│   │   └── indicators/
│   │       ├── riskCalculator.js          # Core calculation logic
│   │       └── riskCalculatorChart.js     # Chart integration
│   ├── components/
│   │   └── RiskCalculatorPanel/
│   │       ├── RiskCalculatorPanel.jsx    # Info panel component
│   │       ├── RiskCalculatorPanel.module.css
│   │       └── RiskSettings.jsx           # Settings form
│   ├── hooks/
│   │   └── useRiskCalculator.js           # React hook
│   └── __tests__/
│       └── riskCalculator.test.js         # Test cases
├── verify-risk-calculator.js              # Verification script
└── RISK_CALCULATOR_README.md             # This file
```

## Integration Steps

To integrate the Risk Calculator into your chart:

1. **Add to indicator list** - Already added to `indicatorConfigs.js`
2. **Handle in ChartComponent** - Detect when risk calculator indicator is active
3. **Render price lines** - Use `updateRiskCalculatorLines()` helper
4. **Show info panel** - Conditionally render `RiskCalculatorPanel`
5. **Connect settings** - Wire up settings form to update parameters

## Configuration

The risk calculator is configured in `src/components/IndicatorSettings/indicatorConfigs.js`:

```javascript
riskCalculator: {
  name: 'Risk Calculator',
  fullName: 'Risk Calculator (Position Sizing)',
  pane: 'main',
  category: 'risk',
  inputs: [
    { key: 'capital', label: 'Capital (₹)', type: 'number', default: 100000 },
    { key: 'riskPercent', label: 'Risk %', type: 'number', default: 2 },
    { key: 'side', label: 'Side', type: 'select', options: ['BUY', 'SELL'] },
    { key: 'entryPrice', label: 'Entry Price', type: 'number', default: 0 },
    { key: 'stopLossPrice', label: 'Stop Loss', type: 'number', default: 0 },
    { key: 'riskRewardRatio', label: 'Risk:Reward', type: 'select', options: [1, 1.5, 2, 2.5, 3, 4, 5] },
    { key: 'showTarget', label: 'Show Target', type: 'boolean', default: true },
    { key: 'showPanel', label: 'Show Info Panel', type: 'boolean', default: true },
  ],
  style: [
    { key: 'entryColor', label: 'Entry Line', type: 'color', default: '#26a69a' },
    { key: 'stopLossColor', label: 'Stop Loss Line', type: 'color', default: '#ef5350' },
    { key: 'targetColor', label: 'Target Line', type: 'color', default: '#42a5f5' },
    { key: 'lineWidth', label: 'Line Width', type: 'number', default: 2 },
  ],
}
```

## API Reference

### `calculateRiskPosition(params)`

Calculate risk position and target based on parameters.

**Parameters:**
- `capital` (number): Total trading capital
- `riskPercent` (number): Risk percentage (0.5 to 5)
- `entryPrice` (number): Entry price
- `stopLossPrice` (number): Stop loss price
- `riskRewardRatio` (number): Risk:Reward ratio
- `side` (string): 'BUY' or 'SELL'

**Returns:**
```javascript
{
  success: true,
  riskAmount: number,
  slPoints: number,
  quantity: number,
  positionValue: number,
  targetPrice: number,
  rewardPoints: number,
  rewardAmount: number,
  riskRewardRatio: number,
  formatted: {
    capital: string,
    riskPercent: string,
    riskAmount: string,
    entryPrice: string,
    stopLossPrice: string,
    slPoints: string,
    quantity: string,
    positionValue: string,
    targetPrice: string,
    rewardPoints: string,
    rewardAmount: string,
    rrRatio: string
  }
}
```

Or error:
```javascript
{
  error: string
}
```

### `useRiskCalculator(initialParams)`

React hook for managing risk calculator state.

**Returns:**
```javascript
{
  params: object,           // Current parameters
  results: object,          // Calculation results
  validation: object,       // Validation results
  updateParam: function,    // Update single parameter
  updateParams: function,   // Update multiple parameters
  reset: function,          // Reset to initial params
  setEntryFromLTP: function,// Set entry from LTP
  setStopLossFromPercent: function, // Calculate SL from %
  isValid: boolean,         // Is calculation valid
  hasError: boolean         // Has error
}
```

## Validation Rules

1. **Capital**: Must be > 0
2. **Risk %**: Must be between 0 and 100
3. **Entry Price**: Must be > 0
4. **Stop Loss**: Must be > 0 and different from entry
5. **Direction Check**:
   - BUY: Entry must be above Stop Loss
   - SELL: Entry must be below Stop Loss

## Non-Goals

This is a **visual educational tool** only:

❌ No trading execution
❌ No API calls
❌ No broker integration
❌ No margin calculations
❌ No backend dependencies

## Future Enhancements

Potential features for future versions:

- [ ] Draggable price lines (move SL to update calculations)
- [ ] Click on chart to set entry/SL
- [ ] Save/load risk profiles
- [ ] Multiple risk scenarios comparison
- [ ] Export calculations to CSV
- [ ] Preset templates (Conservative, Moderate, Aggressive)
- [ ] Real-time position tracking integration

## Running Tests

To verify the calculations:

```bash
node verify-risk-calculator.js
```

All test cases should pass with output matching expected values.

## Support

For issues or questions:
- Check calculation logic in `src/utils/indicators/riskCalculator.js`
- Verify test cases in `verify-risk-calculator.js`
- Review implementation plan in original specification

## License

Part of openalgo-chart project.

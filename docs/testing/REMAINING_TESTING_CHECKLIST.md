# Remaining Testing Checklist - OpenAlgo-Chart

**Current Progress**: 35% complete (11/33 features tested)
**Remaining**: 65% (22 features)
**Priority**: Continue with Category B (High Priority Features)

---

## ✅ Completed Testing (11 features)

- [x] Chart Display & Navigation
- [x] Watchlist Management
- [x] Symbol Search
- [x] Indicators Panel
- [x] Option Chain
- [x] Account Manager Panel
- [x] WebSocket Connectivity
- [x] Time Service
- [x] Drawing Tools (partial - buttons work, persistence unclear)
- [x] Topbar Features (visual inspection only)
- [x] Option Strategy Chart Button (visual only)

---

## 🔲 Category B: HIGH PRIORITY - Enhanced Trading Features (9 remaining)

### 1. Alerts System 🔴 CRITICAL
**Priority**: HIGHEST
**Why**: Core functionality for trading notifications

**Test Checklist**:
- [ ] Click Alert button in topbar → modal opens
- [ ] Create price alert (above/below current price)
- [ ] Set alert conditions (greater than, less than, crossing)
- [ ] Save alert
- [ ] Verify alert appears in alerts list
- [ ] Trigger alert (if possible with test data)
- [ ] Edit existing alert
- [ ] Delete alert
- [ ] Test alert persistence (refresh page)

**Expected Files**: `src/components/Alerts/`, `src/hooks/useChartAlerts.js`

---

### 2. Bar Replay Mode 🟡 HIGH
**Priority**: HIGH
**Why**: Important for backtesting and analysis

**Test Checklist**:
- [ ] Click Bar Replay button in topbar
- [ ] Bar replay mode activates
- [ ] Historical data loads
- [ ] Play/pause controls work
- [ ] Speed controls functional (1x, 2x, 5x, etc.)
- [ ] Scrubber/timeline navigation works
- [ ] Can exit replay mode
- [ ] Chart returns to live mode correctly

**Expected Files**: `src/components/BarReplay/`, `src/hooks/useBarReplay.js`

---

### 3. Sector Heatmap 🟡 HIGH
**Priority**: HIGH
**Why**: Market overview feature

**Test Checklist**:
- [ ] Click Heatmap button in topbar
- [ ] Heatmap modal/view opens
- [ ] Sectors displayed with color coding
- [ ] Stock tiles show price changes
- [ ] Hover shows detailed info
- [ ] Click on sector/stock navigates to chart
- [ ] Data updates in real-time or on refresh

**Expected Files**: `src/components/Heatmap/`

---

### 4. Technical Indicators (Deep Test) 🟡 HIGH
**Priority**: HIGH
**Why**: Already visible but need to verify calculations

**Test Checklist for Each Indicator**:

**Moving Averages**:
- [ ] SMA (Simple Moving Average) - add to chart, verify display
- [ ] EMA (Exponential Moving Average) - add to chart, verify display

**Oscillators**:
- [ ] RSI (Relative Strength Index) - add to chart, verify 0-100 range
- [ ] Stochastic - add to chart, verify display
- [ ] Hilenga-Milenga - add to chart (custom indicator)

**Momentum**:
- [ ] MACD (Moving Average Convergence Divergence) - add to chart, verify signal/histogram

**Volatility**:
- [ ] Bollinger Bands - add to chart, verify upper/lower bands
- [ ] ATR (Average True Range) - add to chart, verify display

**Trend**:
- [ ] Supertrend - add to chart, verify buy/sell signals

**For Each Indicator**:
- [ ] Can add to chart
- [ ] Settings modal opens
- [ ] Can adjust parameters (period, color, etc.)
- [ ] Indicator displays correctly on chart
- [ ] Real-time updates work
- [ ] Can remove from chart
- [ ] Multiple indicators can coexist

---

### 5. Drawing Tools (Complete Testing) ⚠️ PARTIAL
**Priority**: HIGH
**Status**: Buttons work, drawing creation needs verification

**Test Checklist**:

**Line Tools**:
- [ ] Trend Line - draw, modify, delete
- [ ] Arrow - draw, modify, delete
- [ ] Ray - draw, modify, delete
- [ ] Horizontal Line - draw, modify, delete
- [ ] Vertical Line - draw, modify, delete

**Fibonacci Tools**:
- [ ] Fib Retracement - draw, verify levels (23.6%, 38.2%, 50%, 61.8%)
- [ ] Fib Extension - draw, verify levels

**Shapes**:
- [ ] Rectangle - draw, resize, modify
- [ ] Circle - draw, resize, modify
- [ ] Triangle - draw, resize, modify

**Text Tools**:
- [ ] Text - add text, edit, style
- [ ] Callout - add callout, edit
- [ ] Price Label - add price label

**Pattern Tools**:
- [ ] Elliott Wave (Impulse 12345) - draw, verify
- [ ] Elliott Wave (Correction ABC) - draw, verify

**General Drawing Features**:
- [ ] Drawings persist after page refresh
- [ ] Can modify existing drawings (color, width, style)
- [ ] Can delete individual drawings
- [ ] Can lock/unlock drawings
- [ ] Can hide/show all drawings
- [ ] Can save drawing templates
- [ ] Can export drawings
- [ ] Undo/Redo works with drawings

---

### 6. Settings Panel 🟡 HIGH
**Priority**: HIGH
**Why**: User configuration critical

**Test Checklist**:
- [ ] Click Settings button → modal opens
- [ ] **Appearance Tab**:
  - [ ] Theme selection (dark/light)
  - [ ] Font size adjustments
  - [ ] Chart colors
- [ ] **API Configuration Tab**:
  - [ ] OpenAlgo API endpoint
  - [ ] API key management
  - [ ] Test connection button
- [ ] **Trading Tab**:
  - [ ] Default order type
  - [ ] Default quantity
  - [ ] Risk settings
- [ ] **Chart Tab**:
  - [ ] Default timeframe
  - [ ] Auto-save settings
  - [ ] Scale settings (log/linear)
- [ ] **Keyboard Shortcuts Tab**:
  - [ ] View all shortcuts
  - [ ] Customize shortcuts (if available)
- [ ] Settings persist after page refresh
- [ ] Reset to defaults button works

---

### 7. Template Management 🟢 MEDIUM
**Priority**: MEDIUM

**Test Checklist**:
- [ ] Click Templates button → menu opens
- [ ] View existing templates
- [ ] Save current chart as template (name, description)
- [ ] Load template → chart configuration applies
- [ ] Edit template settings
- [ ] Delete template
- [ ] Template includes: indicators, drawings, timeframe, chart type
- [ ] Templates persist across sessions

---

### 8. Layout Management 🟢 MEDIUM
**Priority**: MEDIUM

**Test Checklist**:
- [ ] **Single Chart Layout** (default):
  - [ ] One chart displays correctly
- [ ] **2-Chart Layout**:
  - [ ] Two charts side by side
  - [ ] Independent symbol selection
  - [ ] Independent timeframes
  - [ ] Independent indicators
- [ ] **3-Chart Layout**:
  - [ ] Three charts arrangement
  - [ ] All independent controls
- [ ] **4-Chart Layout**:
  - [ ] Four charts in grid
  - [ ] All independent controls
- [ ] **Layout Persistence**:
  - [ ] Save current layout
  - [ ] Load saved layout
  - [ ] Layout persists after page refresh
- [ ] **Layout Features**:
  - [ ] Resize individual charts (if possible)
  - [ ] Sync symbols across charts (if option available)
  - [ ] Sync timeframes across charts (if option available)

---

### 9. Compare Symbol / Symbol Overlay 🟢 MEDIUM
**Priority**: MEDIUM

**Test Checklist**:
- [ ] Click Compare/Add Symbol button
- [ ] Search and add second symbol to chart
- [ ] Second symbol overlays on main chart
- [ ] Both symbols visible with different colors
- [ ] Legend shows both symbols
- [ ] Can remove comparison symbol
- [ ] Can add multiple symbols (if supported)
- [ ] Real-time updates for all symbols

---

## 🔲 Category C: MEDIUM PRIORITY Features (8 features)

### 10. Position Tracker / Position Flow 🟡
**Test Checklist**:
- [ ] Position flow panel opens
- [ ] Shows all open positions
- [ ] Displays entry price, current price, P&L
- [ ] Shows position size and direction (long/short)
- [ ] Real-time P&L updates
- [ ] Quick close buttons work
- [ ] Position details expandable

---

### 11. Trade Panel 🟡
**Test Checklist**:
- [ ] Trade panel accessible
- [ ] Order entry form displays
- [ ] Buy/Sell buttons
- [ ] Quantity input
- [ ] Order type selection (Market, Limit, Stop)
- [ ] Price input for limit/stop orders
- [ ] Place order button (test with paper trading if available)
- [ ] Order confirmation
- [ ] Order appears in order book

---

### 12. Market Screener 🟢
**Test Checklist**:
- [ ] Screener panel opens
- [ ] Filter options available (volume, price, change%, etc.)
- [ ] Apply filters
- [ ] Results display in table
- [ ] Click result → loads symbol in chart
- [ ] Save screener settings
- [ ] Load saved screeners

---

### 13. Object Tree 🟢
**Test Checklist**:
- [ ] Object tree panel visible
- [ ] Lists all chart objects (indicators, drawings)
- [ ] Can select object from tree
- [ ] Can toggle object visibility
- [ ] Can delete object from tree
- [ ] Tree updates when objects added/removed

---

### 14. ANN Scanner 🟢
**Test Checklist**:
- [ ] ANN Scanner accessible
- [ ] Scanner runs and shows results
- [ ] Results filterable
- [ ] Click result → loads in chart

---

### 15. Depth of Market (DOM) 🟢
**Test Checklist**:
- [ ] DOM panel opens
- [ ] Shows bid/ask levels
- [ ] Real-time price updates
- [ ] Order book depth visible
- [ ] Click price → fills order entry

---

### 16. Command Palette (Ctrl+K) 🟢
**Test Checklist**:
- [ ] Press Ctrl+K (or Cmd+K on Mac)
- [ ] Command palette opens
- [ ] Search for commands (e.g., "add indicator")
- [ ] Execute command from palette
- [ ] Recent commands appear
- [ ] ESC closes palette

---

### 17. Chart Snapshot / Export 🟢
**Test Checklist**:
- [ ] Click Snapshot button
- [ ] Snapshot captured
- [ ] Options: Download or Copy to clipboard
- [ ] Download saves PNG/JPG file
- [ ] Copy to clipboard works
- [ ] Can share snapshot (if feature exists)

---

## 🔲 Category D: LOW PRIORITY Features (5 features)

### 18. CSV Import/Export 🟢
**Test Checklist**:
- [ ] Export watchlist to CSV
- [ ] Import watchlist from CSV
- [ ] CSV format correct (symbol, exchange, etc.)
- [ ] Export chart data to CSV (if available)

---

### 19. Drawing Export/Import 🟢
**Test Checklist**:
- [ ] Export drawings to file
- [ ] Import drawings from file
- [ ] Drawings restored correctly
- [ ] Can share drawing files

---

### 20. Keyboard Shortcuts 🟢
**Test Checklist**:
- [ ] ESC → Deselect tool
- [ ] Ctrl/Cmd+Z → Undo
- [ ] Ctrl/Cmd+Y → Redo
- [ ] Ctrl/Cmd+K → Command Palette
- [ ] Arrow Keys → Navigate chart
- [ ] +/- → Zoom in/out
- [ ] F → Fullscreen
- [ ] Test all documented shortcuts

---

### 21. Theme Switching 🟢
**Test Checklist**:
- [ ] Click Theme button
- [ ] Switch to Light mode
- [ ] Chart updates to light theme
- [ ] All UI elements update correctly
- [ ] Switch back to Dark mode
- [ ] Theme persists after page refresh

---

### 22. Fullscreen Mode 🟢
**Test Checklist**:
- [ ] Click Fullscreen button
- [ ] Chart goes fullscreen
- [ ] All controls accessible in fullscreen
- [ ] Exit fullscreen (ESC or button)
- [ ] Chart returns to normal view

---

## Testing Tips

### For Each Feature:
1. **Navigate**: Click the button/access the feature
2. **Interact**: Use all controls and options
3. **Observe**: Check console for errors
4. **Verify**: Confirm expected behavior matches actual
5. **Test Edge Cases**: Empty states, max values, invalid inputs
6. **Check Persistence**: Refresh page, verify data persists
7. **Document**: Note any bugs or unexpected behavior

### Console Monitoring:
- Open DevTools (F12)
- Watch Console tab for errors/warnings
- Check Network tab for failed API calls
- Monitor WebSocket messages

### What to Document for Each Bug:
- Feature name and location
- Expected behavior
- Actual behavior
- Steps to reproduce
- Console error messages (if any)
- Screenshots (if helpful)
- Severity: Critical/High/Medium/Low

---

## Quick Testing Commands

### Browser Testing:
```bash
# Navigate to app
open http://localhost:5001

# Take screenshot (browser DevTools)
Cmd+Shift+5 (Mac) or Win+Shift+S (Windows)
```

### Console Commands (in browser):
```javascript
// Check for errors
console.clear();

// Monitor WebSocket
// Watch Network → WS tab

// Get chart state (if available)
window.__CHART_STATE__

// Get active indicators (if available)
window.__INDICATORS__
```

---

## Progress Tracking

Update this as you test:

**Category B (High Priority)**: 2/11 completed (18%)
- [x] Indicators Panel (visual)
- [x] Drawing Tools (partial)
- [ ] Alerts
- [ ] Bar Replay
- [ ] Heatmap
- [ ] Indicators (deep test)
- [ ] Drawing Tools (complete)
- [ ] Settings
- [ ] Templates
- [ ] Layouts
- [ ] Compare Symbol

**Category C (Medium Priority)**: 0/8 completed (0%)

**Category D (Low Priority)**: 0/5 completed (0%)

**Overall Progress**: 11/33 (35%) → Target: 33/33 (100%)

---

## Next Session Plan

### Session 2 Goals (Target: 60% coverage)
1. ✅ Alerts (30 min)
2. ✅ Bar Replay (20 min)
3. ✅ Heatmap (15 min)
4. ✅ Settings Panel (20 min)
5. ✅ Indicators Deep Test (30 min)

### Session 3 Goals (Target: 85% coverage)
1. Templates & Layouts
2. Position Flow & Trade Panel
3. Market Screener
4. Object Tree & ANN Scanner

### Session 4 Goals (Target: 100% coverage)
1. Category D features
2. Regression testing
3. Final documentation

---

**Last Updated**: 2026-01-21 10:20 IST
**Next Testing Priority**: Alerts System (Category B, Critical)

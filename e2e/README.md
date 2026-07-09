# Risk Calculator E2E Tests

Comprehensive Playwright E2E tests for the Risk Calculator feature.

## Test Coverage

### 1. Activation Tests (`activation.spec.js`)
- Panel enable/disable functionality
- Minimize/maximize panel
- Switch between edit mode and results view
- Panel header and controls

### 2. Panel Inputs Tests (`panel-inputs.spec.js`)
- All input fields (capital, risk %, entry, stop loss, target)
- Side selector (BUY/SELL)
- Risk:Reward ratio dropdown
- Calculate button enable/disable logic
- Input validation checkmarks

### 3. Auto-Detect Side Tests (`auto-detect-side.spec.js`) ⭐ **Bug Fix #2**
- BUY auto-detected when Stop Loss < Entry
- SELL auto-detected when Stop Loss > Entry
- Dynamic side changes when prices change
- Handles decimal values correctly
- Manual override capability

### 4. Draggable Lines Tests (`draggable-lines.spec.js`) ⭐ **Bug Fix #1**
- Target line stays fixed when entry is modified
- Target line stays fixed when stop loss is modified
- Target line can be explicitly changed by user
- Works correctly in both BUY and SELL scenarios

### 5. Validation Tests (`validation.spec.js`)
- Capital validation (minimum, zero, negative)
- Entry/Stop Loss relationship validation
- BUY/SELL specific validation rules
- Error messages and styling
- Suggestion buttons
- Field-level validation

### 6. Templates Tests (`templates.spec.js`)
- Predefined templates loading
- Save custom templates
- Load saved templates
- Template persistence across sessions
- Template auto-selection when values match

### 7. Integration Tests (`integration.spec.js`)
- Complete BUY trade workflow
- Complete SELL trade workflow
- Dynamic side switching
- Template usage in workflows
- Error recovery
- Edge cases (large numbers, decimals)
- Stress testing

## Running Tests

### Prerequisites
```bash
# Install dependencies
npm install

# Ensure Chromium is installed
npx playwright install chromium
```

### Run All Tests
```bash
npm run test:e2e
```

### Run Tests in UI Mode (Interactive)
```bash
npm run test:e2e:ui
```

### Run Tests in Debug Mode
```bash
npm run test:e2e:debug
```

### Run Specific Test File
```bash
npx playwright test e2e/risk-calculator/auto-detect-side.spec.js
```

### Run Tests for Specific Bug Fix
```bash
# Bug Fix #1 - Target line stays fixed
npx playwright test e2e/risk-calculator/draggable-lines.spec.js

# Bug Fix #2 - Auto-detect side
npx playwright test e2e/risk-calculator/auto-detect-side.spec.js
```

### View Test Report
```bash
npm run test:e2e:report
```

## Test Execution Order

**Priority 1 - Bug Fix Verification** (Must Pass):
1. `auto-detect-side.spec.js` - Bug Fix #2
2. `draggable-lines.spec.js` - Bug Fix #1

**Priority 2 - Core Functionality**:
3. `activation.spec.js`
4. `panel-inputs.spec.js`
5. `validation.spec.js`

**Priority 3 - Advanced Features**:
6. `templates.spec.js`
7. `integration.spec.js`

## Test Statistics

- **Total Test Suites**: 7
- **Estimated Total Tests**: ~120+ test cases
- **Estimated Execution Time**: 3-5 minutes (full suite)
- **Browser**: Chromium (Desktop Chrome)

## Success Criteria

All tests must pass with:
- ✅ 0 failures
- ✅ 0 flaky tests
- ✅ No console errors
- ✅ No visual regressions

## Fixtures

The `fixtures/risk-calculator.fixture.js` file provides reusable helper functions:
- `navigateToApp()` - Navigate and wait for app to load
- `enable()` - Enable Risk Calculator from indicator dropdown
- `openEditMode()` - Switch to edit mode
- `fillForm(data)` - Fill form with values
- `calculate()` - Click calculate button
- `getCurrentSide()` - Get selected side (BUY/SELL)
- `getInputValue(name)` - Get input field value
- `saveTemplate(name)` - Save custom template
- And many more...

## Console Error Tracking

Each test suite includes console error tracking to ensure no JavaScript errors occur during test execution:

```javascript
const errors = riskCalc.setupConsoleErrorTracking();
// ... perform actions
expect(errors).toHaveLength(0);
```

## Configuration

Tests are configured in `playwright.config.js`:
- Base URL: `http://localhost:5001`
- Timeout: 30 seconds per test
- Workers: 1 (sequential execution)
- Auto-start dev server before tests
- Screenshots on failure
- Video on failure
- HTML report generation

## Debugging Tips

1. **Use UI Mode**: `npm run test:e2e:ui` - Interactive test explorer
2. **Use Debug Mode**: `npm run test:e2e:debug` - Step-by-step debugging
3. **View Screenshots**: Check `test-results/` folder for failure screenshots
4. **View Videos**: Check `test-results/` folder for failure videos
5. **View HTML Report**: `npm run test:e2e:report` - Detailed test report

## CI/CD Integration

Tests can be integrated into CI/CD pipelines:
- Set `CI=true` environment variable
- Tests will run in headless mode
- Retry logic will be enabled (2 retries)
- HTML report will be generated as artifact

## Notes

- Tests run on port 5001 (Vite dev server)
- Tests clear localStorage/sessionStorage for template tests
- Tests use stable selectors (aria-labels, text content) when possible
- Canvas interaction is tested via UI input changes for reliability
- All tests include console error monitoring

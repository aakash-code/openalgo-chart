/**
 * Automated verification script for draggable Risk Calculator implementation
 * Checks that all files are created and basic structure is correct
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`)
};

console.log('\n' + '='.repeat(60));
console.log('  Draggable Risk Calculator - Verification Script');
console.log('='.repeat(60) + '\n');

let totalChecks = 0;
let passedChecks = 0;

function check(description, testFn) {
  totalChecks++;
  try {
    const result = testFn();
    if (result) {
      passedChecks++;
      log.success(description);
      return true;
    } else {
      log.error(description);
      return false;
    }
  } catch (error) {
    log.error(`${description} - ${error.message}`);
    return false;
  }
}

// File existence checks
log.info('Checking file existence...\n');

const filesToCheck = [
  'src/plugins/risk-calculator/types.ts',
  'src/plugins/risk-calculator/renderer.ts',
  'src/plugins/risk-calculator/pane-view.ts',
  'src/plugins/risk-calculator/RiskCalculatorLines.ts',
  'src/utils/indicators/riskCalculatorChart.js',
  'src/components/Chart/ChartComponent.jsx'
];

filesToCheck.forEach(filePath => {
  check(`File exists: ${filePath}`, () => existsSync(filePath));
});

// Content verification checks
log.info('\nChecking file contents...\n');

// Check types.ts has required interfaces
check('types.ts exports RiskCalculatorOptions', () => {
  const content = readFileSync('src/plugins/risk-calculator/types.ts', 'utf8');
  return content.includes('export interface RiskCalculatorOptions') &&
         content.includes('onPriceChange');
});

check('types.ts exports RendererData', () => {
  const content = readFileSync('src/plugins/risk-calculator/types.ts', 'utf8');
  return content.includes('export interface RendererData');
});

// Check renderer.ts implements drawing
check('renderer.ts exports RiskCalculatorRenderer', () => {
  const content = readFileSync('src/plugins/risk-calculator/renderer.ts', 'utf8');
  return content.includes('export class RiskCalculatorRenderer') &&
         content.includes('draw(');
});

check('renderer.ts draws three lines (entry, stopLoss, target)', () => {
  const content = readFileSync('src/plugins/risk-calculator/renderer.ts', 'utf8');
  return content.includes('entryY') &&
         content.includes('stopLossY') &&
         content.includes('targetY');
});

// Check pane-view.ts
check('pane-view.ts exports RiskCalculatorPaneView', () => {
  const content = readFileSync('src/plugins/risk-calculator/pane-view.ts', 'utf8');
  return content.includes('export class RiskCalculatorPaneView') &&
         content.includes('ISeriesPrimitivePaneView');
});

// Check RiskCalculatorLines.ts
check('RiskCalculatorLines.ts exports main primitive class', () => {
  const content = readFileSync('src/plugins/risk-calculator/RiskCalculatorLines.ts', 'utf8');
  return content.includes('export class RiskCalculatorLines') &&
         content.includes('ISeriesPrimitive');
});

check('RiskCalculatorLines has mouse event handlers', () => {
  const content = readFileSync('src/plugins/risk-calculator/RiskCalculatorLines.ts', 'utf8');
  return content.includes('_mouseDownHandler') &&
         content.includes('_mouseMoveHandler') &&
         content.includes('_mouseUpHandler');
});

check('RiskCalculatorLines has validation logic', () => {
  const content = readFileSync('src/plugins/risk-calculator/RiskCalculatorLines.ts', 'utf8');
  return content.includes('_isValidPrice') &&
         content.includes('BUY') &&
         content.includes('SELL');
});

check('RiskCalculatorLines attaches/detaches properly', () => {
  const content = readFileSync('src/plugins/risk-calculator/RiskCalculatorLines.ts', 'utf8');
  return content.includes('attached(') &&
         content.includes('detached()') &&
         content.includes('addEventListener') &&
         content.includes('removeEventListener');
});

// Check riskCalculatorChart.js
check('riskCalculatorChart.js exports createRiskCalculatorPrimitive', () => {
  const content = readFileSync('src/utils/indicators/riskCalculatorChart.js', 'utf8');
  return content.includes('export function createRiskCalculatorPrimitive') &&
         content.includes('attachPrimitive');
});

check('riskCalculatorChart.js exports removeRiskCalculatorPrimitive', () => {
  const content = readFileSync('src/utils/indicators/riskCalculatorChart.js', 'utf8');
  return content.includes('export function removeRiskCalculatorPrimitive') &&
         content.includes('detachPrimitive');
});

check('riskCalculatorChart.js imports RiskCalculatorLines', () => {
  const content = readFileSync('src/utils/indicators/riskCalculatorChart.js', 'utf8');
  return content.includes("import { RiskCalculatorLines }") &&
         content.includes("'../../plugins/risk-calculator/RiskCalculatorLines'");
});

// Check ChartComponent.jsx integration
check('ChartComponent.jsx imports primitive functions', () => {
  const content = readFileSync('src/components/Chart/ChartComponent.jsx', 'utf8');
  return content.includes('createRiskCalculatorPrimitive') &&
         content.includes('removeRiskCalculatorPrimitive');
});

check('ChartComponent.jsx has riskCalculatorPrimitiveRef', () => {
  const content = readFileSync('src/components/Chart/ChartComponent.jsx', 'utf8');
  return content.includes('riskCalculatorPrimitiveRef');
});

check('ChartComponent.jsx has handleRiskCalculatorDrag callback', () => {
  const content = readFileSync('src/components/Chart/ChartComponent.jsx', 'utf8');
  return content.includes('handleRiskCalculatorDrag') &&
         content.includes('useCallback');
});

check('ChartComponent.jsx creates primitive with onPriceChange', () => {
  const content = readFileSync('src/components/Chart/ChartComponent.jsx', 'utf8');
  return content.includes('createRiskCalculatorPrimitive({') &&
         content.includes('onPriceChange: handleRiskCalculatorDrag');
});

// Integration checks
log.info('\nChecking integration patterns...\n');

check('Primitive uses coordinate conversion methods', () => {
  const content = readFileSync('src/plugins/risk-calculator/RiskCalculatorLines.ts', 'utf8');
  return content.includes('priceToCoordinate') &&
         content.includes('coordinateToPrice');
});

check('Primitive locks chart during drag', () => {
  const content = readFileSync('src/plugins/risk-calculator/RiskCalculatorLines.ts', 'utf8');
  return content.includes('handleScroll: false') &&
         content.includes('handleScale: false');
});

check('Primitive has hover detection with threshold', () => {
  const content = readFileSync('src/plugins/risk-calculator/RiskCalculatorLines.ts', 'utf8');
  return content.includes('threshold') &&
         content.includes('_hoveredLine');
});

check('Renderer draws dashed line for target', () => {
  const content = readFileSync('src/plugins/risk-calculator/renderer.ts', 'utf8');
  return content.includes('setLineDash');
});

check('Validation enforces BUY/SELL constraints', () => {
  const content = readFileSync('src/plugins/risk-calculator/RiskCalculatorLines.ts', 'utf8');
  return content.includes('newPrice > this._stopLossPrice') &&
         content.includes('newPrice < this._stopLossPrice');
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('  Verification Summary');
console.log('='.repeat(60));
console.log(`\nTotal checks: ${totalChecks}`);
console.log(`${colors.green}Passed: ${passedChecks}${colors.reset}`);
console.log(`${colors.red}Failed: ${totalChecks - passedChecks}${colors.reset}`);

if (passedChecks === totalChecks) {
  console.log(`\n${colors.green}✓ All checks passed!${colors.reset}`);
  console.log(`\n${colors.blue}Implementation is ready for testing.${colors.reset}`);
  console.log(`\n${colors.blue}Start the dev server and test at: http://localhost:5002${colors.reset}\n`);
  process.exit(0);
} else {
  console.log(`\n${colors.red}✗ Some checks failed.${colors.reset}`);
  console.log(`\n${colors.yellow}Please review the failed checks above.${colors.reset}\n`);
  process.exit(1);
}

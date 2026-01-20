/**
 * Risk Calculator Chart Integration
 * Manages draggable price lines for risk calculator using primitives
 */

import { RiskCalculatorLines } from '../../plugins/risk-calculator/RiskCalculatorLines';

/**
 * Create draggable risk calculator primitive
 *
 * @param {Object} params
 * @param {Object} params.series - Main series to attach primitive to
 * @param {Object} params.results - Calculation results from calculateRiskPosition
 * @param {Object} params.settings - Risk calculator settings (colors, lineWidth, showTarget)
 * @param {string} params.side - Trade side ('BUY' or 'SELL')
 * @param {Function} params.onPriceChange - Callback when user drags a line
 * @returns {RiskCalculatorLines} Primitive instance
 */
export function createRiskCalculatorPrimitive({ series, results, settings, side, onPriceChange }) {
  if (!series || !results || !results.success) {
    return null;
  }

  const entryPrice = results.formatted ? parseFloat(results.formatted.entryPrice.replace('₹', '')) : 0;
  const stopLossPrice = results.formatted ? parseFloat(results.formatted.stopLossPrice.replace('₹', '')) : 0;
  const targetPrice = results.targetPrice || null;

  const primitive = new RiskCalculatorLines({
    entryPrice,
    stopLossPrice,
    targetPrice,
    side: side || 'BUY',
    showTarget: results.showTarget !== false,
    colors: {
      entry: settings.entryColor || '#26a69a',
      stopLoss: settings.stopLossColor || '#ef5350',
      target: settings.targetColor || '#42a5f5',
    },
    lineWidth: settings.lineWidth || 2,
    onPriceChange: onPriceChange || (() => {}),
  });

  series.attachPrimitive(primitive);
  return primitive;
}

/**
 * Remove risk calculator primitive from chart
 *
 * @param {Object} params
 * @param {Object} params.series - Main series to detach primitive from
 * @param {Object} params.primitiveRef - Ref object storing primitive reference
 */
export function removeRiskCalculatorPrimitive({ series, primitiveRef }) {
  if (!primitiveRef.current || !series) return;

  try {
    series.detachPrimitive(primitiveRef.current);
  } catch (e) {
    console.error('Failed to detach risk calculator primitive:', e);
  }

  primitiveRef.current = null;
}

/**
 * Initialize risk calculator primitive ref
 *
 * @returns {Object} Initialized ref object with null current
 */
export function initRiskCalculatorPrimitiveRef() {
  return { current: null };
}

/**
 * Legacy function - kept for backward compatibility
 * Use createRiskCalculatorPrimitive instead
 */
export function updateRiskCalculatorLines({ series, linesRef, results, settings, isActive }) {
  console.warn('updateRiskCalculatorLines is deprecated. Use createRiskCalculatorPrimitive instead.');

  if (!isActive || !results || !results.success || !series) {
    removeRiskCalculatorLines({ series, linesRef });
    return;
  }

  // This function is deprecated but kept for compatibility
}

/**
 * Legacy function - kept for backward compatibility
 * Use removeRiskCalculatorPrimitive instead
 */
export function removeRiskCalculatorLines({ series, linesRef }) {
  console.warn('removeRiskCalculatorLines is deprecated. Use removeRiskCalculatorPrimitive instead.');

  if (!linesRef.current) return;

  const lineKeys = ['entry', 'stopLoss', 'target'];

  lineKeys.forEach((key) => {
    if (linesRef.current[key]) {
      try {
        if (series) {
          series.removePriceLine(linesRef.current[key]);
        }
      } catch (e) {
        // Ignore errors
      }
      linesRef.current[key] = null;
    }
  });
}

/**
 * Legacy function - kept for backward compatibility
 * Use initRiskCalculatorPrimitiveRef instead
 */
export function initRiskCalculatorLinesRef() {
  return {
    entry: null,
    stopLoss: null,
    target: null,
  };
}

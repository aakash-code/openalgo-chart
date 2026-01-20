/**
 * Indicator Metadata Registry
 *
 * Central registry defining cleanup requirements and characteristics for all indicators.
 * This metadata is used by the unified cleanup engine to properly remove indicators
 * and their associated resources (series, panes, price lines, primitives).
 */

/**
 * Cleanup type constants defining how each indicator should be cleaned up
 */
export const INDICATOR_CLEANUP_TYPES = {
  SIMPLE_SERIES: 'simple_series',       // Single series (SMA, EMA, VWAP, ATR, etc.)
  MULTI_SERIES: 'multi_series',         // Multiple series in one object (MACD, Bollinger, etc.)
  SERIES_ARRAY: 'series_array',         // Array of series (First Candle, Range Breakout, PAR)
  PRIMITIVE: 'primitive',               // Attached primitives (TPO, Risk Calculator)
  COMPLEX: 'complex'                    // Complex with multiple cleanup steps
};

/**
 * Main indicator metadata registry
 * Each indicator type defines its cleanup requirements and characteristics
 */
export const INDICATOR_REGISTRY = {
  // ==================== SIMPLE OVERLAYS ====================
  sma: {
    cleanupType: INDICATOR_CLEANUP_TYPES.SIMPLE_SERIES,
    pane: 'main',
    hasPane: false,
    hasPriceLines: false,
    description: 'Simple Moving Average'
  },

  ema: {
    cleanupType: INDICATOR_CLEANUP_TYPES.SIMPLE_SERIES,
    pane: 'main',
    hasPane: false,
    hasPriceLines: false,
    description: 'Exponential Moving Average'
  },

  vwap: {
    cleanupType: INDICATOR_CLEANUP_TYPES.SIMPLE_SERIES,
    pane: 'main',
    hasPane: false,
    hasPriceLines: false,
    description: 'Volume Weighted Average Price'
  },

  supertrend: {
    cleanupType: INDICATOR_CLEANUP_TYPES.SIMPLE_SERIES,
    pane: 'main',
    hasPane: false,
    hasPriceLines: false,
    description: 'Supertrend Indicator'
  },

  volume: {
    cleanupType: INDICATOR_CLEANUP_TYPES.SIMPLE_SERIES,
    pane: 'main',
    hasPane: false,
    hasPriceLines: false,
    description: 'Volume Bars'
  },

  // ==================== MULTI-SERIES OVERLAYS ====================
  bollingerBands: {
    cleanupType: INDICATOR_CLEANUP_TYPES.MULTI_SERIES,
    pane: 'main',
    hasPane: false,
    hasPriceLines: false,
    seriesKeys: ['basis', 'upper', 'lower'],
    description: 'Bollinger Bands'
  },

  ichimoku: {
    cleanupType: INDICATOR_CLEANUP_TYPES.MULTI_SERIES,
    pane: 'main',
    hasPane: false,
    hasPriceLines: false,
    seriesKeys: ['tenkan', 'kijun', 'senkouA', 'senkouB', 'chikou'],
    description: 'Ichimoku Cloud'
  },

  pivotPoints: {
    cleanupType: INDICATOR_CLEANUP_TYPES.MULTI_SERIES,
    pane: 'main',
    hasPane: false,
    hasPriceLines: false,
    seriesKeys: ['pivot', 'r1', 'r2', 'r3', 's1', 's2', 's3'],
    description: 'Pivot Points'
  },

  // ==================== OSCILLATORS WITH PANES ====================
  rsi: {
    cleanupType: INDICATOR_CLEANUP_TYPES.SIMPLE_SERIES,
    pane: 'rsi',
    hasPane: true,
    hasPriceLines: true,
    priceLineKeys: ['_obLine', '_osLine'],
    description: 'Relative Strength Index'
  },

  stochastic: {
    cleanupType: INDICATOR_CLEANUP_TYPES.MULTI_SERIES,
    pane: 'stochastic',
    hasPane: true,
    hasPriceLines: false,
    seriesKeys: ['kLine', 'dLine'],
    description: 'Stochastic Oscillator'
  },

  macd: {
    cleanupType: INDICATOR_CLEANUP_TYPES.MULTI_SERIES,
    pane: 'macd',
    hasPane: true,
    hasPriceLines: false,
    seriesKeys: ['macdLine', 'signalLine', 'histogram'],
    description: 'Moving Average Convergence Divergence'
  },

  atr: {
    cleanupType: INDICATOR_CLEANUP_TYPES.SIMPLE_SERIES,
    pane: 'atr',
    hasPane: true,
    hasPriceLines: false,
    description: 'Average True Range'
  },

  adx: {
    cleanupType: INDICATOR_CLEANUP_TYPES.MULTI_SERIES,
    pane: 'adx',
    hasPane: true,
    hasPriceLines: true,
    priceLineKeys: ['_strongTrendLine', '_weakTrendLine'],
    seriesKeys: ['adxLine', 'plusDILine', 'minusDILine'],
    description: 'Average Directional Index'
  },

  // ==================== COMPLEX STRATEGIES ====================
  annStrategy: {
    cleanupType: INDICATOR_CLEANUP_TYPES.MULTI_SERIES,
    pane: 'ann',
    hasPane: true,
    hasPriceLines: true,
    priceLineKeys: ['_thresholdLine', '_zeroLine'],
    seriesKeys: ['predictionLine', 'areaFill'],
    hasMarkers: true,
    description: 'Artificial Neural Network Strategy'
  },

  hilengaMilenga: {
    cleanupType: INDICATOR_CLEANUP_TYPES.MULTI_SERIES,
    pane: 'hilengaMilenga',
    hasPane: true,
    hasPriceLines: true,
    priceLineKeys: ['_midLine'],
    seriesKeys: ['rsiLine', 'emaLine', 'wmaLine', 'bullFill', 'bearFill'],
    description: 'Hilenga-Milenga Oscillator'
  },

  // ==================== PRIMITIVES ====================
  tpo: {
    cleanupType: INDICATOR_CLEANUP_TYPES.PRIMITIVE,
    pane: 'main',
    hasPane: false,
    hasPrimitive: true,
    primitiveRef: 'tpoProfileRef',
    attachedTo: 'main',
    description: 'Time Price Opportunity (TPO) Profile'
  },

  riskCalculator: {
    cleanupType: INDICATOR_CLEANUP_TYPES.PRIMITIVE,
    pane: 'main',
    hasPane: false,
    hasPrimitive: true,
    primitiveRef: 'riskCalculatorPrimitiveRef',
    attachedTo: 'main',
    hasPriceLines: false,
    description: 'Risk Calculator with Position Sizing'
  },

  // ==================== ARRAY-BASED STRATEGIES ====================
  firstCandle: {
    cleanupType: INDICATOR_CLEANUP_TYPES.SERIES_ARRAY,
    pane: 'main',
    hasPane: false,
    arrayRef: 'firstCandleSeriesRef',
    hasMarkers: true,
    description: 'First Red Candle Strategy'
  },

  rangeBreakout: {
    cleanupType: INDICATOR_CLEANUP_TYPES.SERIES_ARRAY,
    pane: 'main',
    hasPane: false,
    arrayRef: 'rangeBreakoutSeriesRef',
    hasMarkers: true,
    description: 'Opening Range Breakout Strategy'
  },

  priceActionRange: {
    cleanupType: INDICATOR_CLEANUP_TYPES.SERIES_ARRAY,
    pane: 'main',
    hasPane: false,
    arrayRef: 'priceActionRangeSeriesRef',
    hasMarkers: true,
    description: 'Price Action Range Strategy'
  }
};

/**
 * Get metadata for a specific indicator type
 * @param {string} indicatorType - The type of indicator (e.g., 'sma', 'rsi')
 * @returns {Object|null} Metadata object or null if not found
 */
export function getIndicatorMetadata(indicatorType) {
  return INDICATOR_REGISTRY[indicatorType] || null;
}

/**
 * Check if an indicator type exists in the registry
 * @param {string} indicatorType - The type of indicator
 * @returns {boolean} True if the indicator type exists
 */
export function isValidIndicatorType(indicatorType) {
  return indicatorType in INDICATOR_REGISTRY;
}

/**
 * Get all indicators of a specific cleanup type
 * @param {string} cleanupType - The cleanup type constant
 * @returns {Array<string>} Array of indicator type keys
 */
export function getIndicatorsByCleanupType(cleanupType) {
  return Object.keys(INDICATOR_REGISTRY).filter(
    key => INDICATOR_REGISTRY[key].cleanupType === cleanupType
  );
}

/**
 * Get all indicators that have a separate pane
 * @returns {Array<string>} Array of indicator type keys
 */
export function getIndicatorsWithPane() {
  return Object.keys(INDICATOR_REGISTRY).filter(
    key => INDICATOR_REGISTRY[key].hasPane === true
  );
}

/**
 * Get all indicators that have price lines
 * @returns {Array<string>} Array of indicator type keys
 */
export function getIndicatorsWithPriceLines() {
  return Object.keys(INDICATOR_REGISTRY).filter(
    key => INDICATOR_REGISTRY[key].hasPriceLines === true
  );
}

/**
 * Get all indicators that use primitives
 * @returns {Array<string>} Array of indicator type keys
 */
export function getIndicatorsWithPrimitives() {
  return Object.keys(INDICATOR_REGISTRY).filter(
    key => INDICATOR_REGISTRY[key].hasPrimitive === true
  );
}

/**
 * Get all indicators that use array-based series
 * @returns {Array<string>} Array of indicator type keys
 */
export function getArrayBasedIndicators() {
  return Object.keys(INDICATOR_REGISTRY).filter(
    key => INDICATOR_REGISTRY[key].cleanupType === INDICATOR_CLEANUP_TYPES.SERIES_ARRAY
  );
}

/**
 * Validate that all required metadata fields are present
 * Useful for development/testing
 * @returns {Object} Validation results with any errors
 */
export function validateMetadataRegistry() {
  const errors = [];

  Object.keys(INDICATOR_REGISTRY).forEach(type => {
    const metadata = INDICATOR_REGISTRY[type];

    // Required fields
    if (!metadata.cleanupType) {
      errors.push(`${type}: Missing cleanupType`);
    }
    if (!metadata.pane) {
      errors.push(`${type}: Missing pane`);
    }
    if (metadata.hasPane === undefined) {
      errors.push(`${type}: Missing hasPane`);
    }

    // Conditional fields based on cleanup type
    if (metadata.cleanupType === INDICATOR_CLEANUP_TYPES.MULTI_SERIES && !metadata.seriesKeys) {
      errors.push(`${type}: Multi-series indicator missing seriesKeys`);
    }
    if (metadata.cleanupType === INDICATOR_CLEANUP_TYPES.SERIES_ARRAY && !metadata.arrayRef) {
      errors.push(`${type}: Array-based indicator missing arrayRef`);
    }
    if (metadata.cleanupType === INDICATOR_CLEANUP_TYPES.PRIMITIVE && !metadata.primitiveRef) {
      errors.push(`${type}: Primitive indicator missing primitiveRef`);
    }
    if (metadata.hasPriceLines && !metadata.priceLineKeys) {
      errors.push(`${type}: Has price lines but missing priceLineKeys`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    totalIndicators: Object.keys(INDICATOR_REGISTRY).length
  };
}

// Auto-validate in development
if (process.env.NODE_ENV === 'development') {
  const validation = validateMetadataRegistry();
  if (!validation.valid) {
    console.warn('Indicator Metadata Registry Validation Errors:', validation.errors);
  }
}

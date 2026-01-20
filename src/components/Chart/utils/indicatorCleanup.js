/**
 * Unified Indicator Cleanup Engine
 *
 * Centralized cleanup system for all indicator types.
 * Handles series removal, pane cleanup, price lines, primitives, and array-based indicators.
 *
 * This replaces the fragile, scattered cleanup logic with a robust,
 * metadata-driven approach that ensures complete resource cleanup.
 */

import { getIndicatorMetadata, INDICATOR_CLEANUP_TYPES } from './indicatorMetadata';

/**
 * Validate if an object is a valid LightweightCharts series
 * @param {*} obj - Object to validate
 * @returns {boolean} True if valid series
 */
export function isValidSeries(obj) {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  // Check for series-specific methods
  const hasSeriesMethods =
    typeof obj.setData === 'function' ||
    typeof obj.update === 'function' ||
    typeof obj.applyOptions === 'function';

  return hasSeriesMethods;
}

/**
 * Validate if an object is a valid chart pane
 * @param {*} pane - Pane object to validate
 * @returns {boolean} True if valid pane
 */
export function isValidPane(pane) {
  if (!pane || typeof pane !== 'object') {
    return false;
  }

  // Check for pane-specific methods
  return typeof pane.series === 'function' || Array.isArray(pane._series);
}

/**
 * Safely remove price lines from a series
 * @param {Object} series - The series object
 * @param {Array<string>} priceLineKeys - Array of property keys containing price lines
 */
export function cleanupPriceLines(series, priceLineKeys) {
  if (!series || !Array.isArray(priceLineKeys)) {
    return;
  }

  priceLineKeys.forEach(key => {
    const priceLine = series[key];
    if (priceLine) {
      try {
        // Price lines are removed via the series
        if (typeof series.removePriceLine === 'function') {
          series.removePriceLine(priceLine);
        }
        // Clean up the reference
        delete series[key];
      } catch (error) {
        console.warn(`Failed to remove price line ${key}:`, error);
      }
    }
  });
}

/**
 * Safely remove a single series from the chart
 * @param {Object} series - The series to remove
 * @param {Object} chart - The chart instance
 * @param {Object} pane - The pane containing the series (optional)
 */
export function removeSingleSeries(series, chart, pane) {
  console.log('[CLEANUP EXEC] removeSingleSeries called', { series, hasChart: !!chart, hasPane: !!pane });

  if (!isValidSeries(series)) {
    console.warn('[CLEANUP EXEC] Attempted to remove invalid series:', series);
    return;
  }

  try {
    if (chart && typeof chart.removeSeries === 'function') {
      console.log('[CLEANUP EXEC] Calling chart.removeSeries');
      chart.removeSeries(series);
      console.log('[CLEANUP EXEC] Successfully called chart.removeSeries');
    } else if (pane && typeof pane.removeSeries === 'function') {
      console.log('[CLEANUP EXEC] Calling pane.removeSeries');
      pane.removeSeries(series);
      console.log('[CLEANUP EXEC] Successfully called pane.removeSeries');
    } else {
      console.warn('[CLEANUP EXEC] No valid remove method found', { hasChart: !!chart, hasPane: !!pane });
    }
  } catch (error) {
    console.error('[CLEANUP EXEC] Error removing series:', error);
  }
}

/**
 * Remove multiple series from a multi-series object
 * @param {Object} seriesObj - Object containing multiple series (e.g., { macdLine, signalLine, histogram })
 * @param {Object} chart - The chart instance
 * @param {Object} pane - The pane containing the series
 * @param {Object} metadata - Indicator metadata with seriesKeys
 */
export function removeMultiSeries(seriesObj, chart, pane, metadata) {
  console.log('[CLEANUP EXEC] removeMultiSeries called', {
    hasSeriesObj: !!seriesObj,
    seriesObjType: typeof seriesObj,
    seriesKeys: metadata.seriesKeys
  });

  if (!seriesObj || typeof seriesObj !== 'object') {
    console.warn('[CLEANUP EXEC] Invalid seriesObj in removeMultiSeries');
    return;
  }

  const seriesKeys = metadata.seriesKeys || [];
  console.log('[CLEANUP EXEC] Processing', seriesKeys.length, 'series keys:', seriesKeys);

  seriesKeys.forEach(key => {
    const series = seriesObj[key];
    console.log(`[CLEANUP EXEC] Processing key "${key}":`, { hasSeries: !!series, isValid: isValidSeries(series) });
    if (series && isValidSeries(series)) {
      removeSingleSeries(series, chart, pane);
    }
  });

  // Also try to remove any series not in the keys (fallback)
  console.log('[CLEANUP EXEC] Processing fallback series from Object.values');
  Object.values(seriesObj).forEach(series => {
    if (isValidSeries(series)) {
      try {
        removeSingleSeries(series, chart, pane);
      } catch (error) {
        // Ignore errors for already-removed series
      }
    }
  });
}

/**
 * Remove an array of series
 * @param {Array|Object} arrayOrRef - Array of series or ref object containing array
 * @param {Object} chart - The chart instance
 */
export function removeSeriesArray(arrayOrRef, chart) {
  console.log('[CLEANUP EXEC] removeSeriesArray called', {
    hasArrayOrRef: !!arrayOrRef,
    hasCurrent: !!arrayOrRef?.current,
    type: typeof arrayOrRef
  });

  // Handle ref object
  const array = arrayOrRef?.current || arrayOrRef;

  console.log('[CLEANUP EXEC] Array extracted:', { isArray: Array.isArray(array), length: array?.length });

  if (!Array.isArray(array)) {
    console.warn('[CLEANUP EXEC] Not an array in removeSeriesArray');
    return;
  }

  console.log('[CLEANUP EXEC] Processing', array.length, 'series in array');
  array.forEach((series, index) => {
    console.log(`[CLEANUP EXEC] Array item ${index}:`, { hasSeries: !!series, isValid: isValidSeries(series) });
    if (isValidSeries(series)) {
      removeSingleSeries(series, chart, null);
    }
  });

  // Clear the array
  console.log('[CLEANUP EXEC] Clearing array');
  if (arrayOrRef?.current) {
    console.log('[CLEANUP EXEC] Clearing array via .current (ref)');
    arrayOrRef.current = [];
  } else if (Array.isArray(arrayOrRef)) {
    console.log('[CLEANUP EXEC] Clearing array via .length = 0');
    arrayOrRef.length = 0;
  }
  console.log('[CLEANUP EXEC] Array cleared');
}

/**
 * Detach and remove a primitive from the main series
 * @param {Object} primitiveRef - Ref containing the primitive
 * @param {Object} mainSeries - The main series to detach from
 */
export function removePrimitive(primitiveRef, mainSeries) {
  const primitive = primitiveRef?.current || primitiveRef;

  if (!primitive) {
    return;
  }

  try {
    if (mainSeries && typeof mainSeries.detachPrimitive === 'function') {
      mainSeries.detachPrimitive(primitive);
    }
  } catch (error) {
    console.warn('Error detaching primitive:', error);
  } finally {
    // Clear the ref
    if (primitiveRef && 'current' in primitiveRef) {
      primitiveRef.current = null;
    }
  }
}

/**
 * Safely remove a pane from the chart
 * Uses pane object reference instead of fragile index-based removal
 * @param {Object} chart - The chart instance
 * @param {Object} pane - The pane object to remove
 */
export function removePane(chart, pane) {
  console.log('[CLEANUP EXEC] removePane called', { hasChart: !!chart, hasPane: !!pane });

  if (!chart || !pane) {
    console.warn('[CLEANUP EXEC] Missing chart or pane in removePane');
    return;
  }

  if (!isValidPane(pane)) {
    console.warn('[CLEANUP EXEC] Attempted to remove invalid pane:', pane);
    return;
  }

  try {
    // Modern API: remove pane by reference
    if (typeof chart.removePane === 'function') {
      console.log('[CLEANUP EXEC] Calling chart.removePane');
      chart.removePane(pane);
      console.log('[CLEANUP EXEC] Successfully called chart.removePane');
    }
    // Fallback: remove pane by finding its index
    else if (typeof chart.panes === 'function') {
      const panes = chart.panes();
      const index = panes.indexOf(pane);
      if (index > 0) {
        // Never remove index 0 (main pane)
        chart.removePaneByIndex?.(index);
      }
    }
  } catch (error) {
    console.warn('Error removing pane:', error);
  }
}

/**
 * Main cleanup function for a single indicator
 * @param {string} indicatorId - Unique identifier of the indicator
 * @param {string} indicatorType - Type of indicator (e.g., 'sma', 'rsi')
 * @param {Object} context - Cleanup context containing chart, refs, and maps
 * @returns {boolean} True if cleanup was successful
 */
export function cleanupIndicator(indicatorId, indicatorType, context) {
  console.log(`[CLEANUP] Starting cleanup for ${indicatorType} (ID: ${indicatorId})`);

  if (!indicatorType) {
    console.warn(`Cannot cleanup indicator ${indicatorId}: type is undefined`);
    return false;
  }

  const metadata = getIndicatorMetadata(indicatorType);

  if (!metadata) {
    console.error(`[CLEANUP] CRITICAL: No metadata found for indicator type: ${indicatorType}`);
    console.error(`[CLEANUP] Available types:`, Object.keys(indicatorMetadata));
    return false;
  }

  console.log(`[CLEANUP] Metadata for ${indicatorType}:`, {
    cleanupType: metadata.cleanupType,
    hasPane: metadata.hasPane,
    hasPrimitive: metadata.hasPrimitive,
    hasPriceLines: metadata.hasPriceLines
  });

  const {
    chart,
    mainSeries,
    indicatorSeriesMap,
    indicatorPanesMap,
    refs
  } = context;

  try {
    // STEP 1: Handle primitives first (TPO, Risk Calculator)
    if (metadata.hasPrimitive && metadata.primitiveRef) {
      console.log(`[CLEANUP] Removing primitive for ${indicatorType}`);
      const primitiveRef = refs[metadata.primitiveRef];
      if (primitiveRef) {
        removePrimitive(primitiveRef, mainSeries);
        console.log(`[CLEANUP] Primitive removed for ${indicatorType}`);
      } else {
        console.warn(`[CLEANUP] Primitive ref not found for ${indicatorType}`);
      }
    }

    // STEP 2: Handle array-based indicators (First Candle, Range Breakout, PAR)
    if (metadata.cleanupType === INDICATOR_CLEANUP_TYPES.SERIES_ARRAY) {
      console.log(`[CLEANUP] Removing series array for ${indicatorType}`);
      if (metadata.arrayRef && refs[metadata.arrayRef]) {
        removeSeriesArray(refs[metadata.arrayRef], chart);
      }
      // Clean up maps
      indicatorSeriesMap.delete(indicatorId);
      indicatorPanesMap.delete(indicatorId);
      console.log(`[CLEANUP] Series array cleanup complete for ${indicatorType}`);
      return true;
    }

    // STEP 3: Get series and pane from maps
    const series = indicatorSeriesMap.get(indicatorId);
    const pane = indicatorPanesMap.get(indicatorId);

    console.log(`[CLEANUP] Series exists: ${!!series}, Pane exists: ${!!pane}`);

    // STEP 4: Remove price lines if present
    if (metadata.hasPriceLines && series) {
      console.log(`[CLEANUP] Removing price lines for ${indicatorType}`);
      cleanupPriceLines(series, metadata.priceLineKeys || []);
    }

    // STEP 5: Remove series based on cleanup type
    console.log(`[CLEANUP] Removing series with type: ${metadata.cleanupType}`);
    switch (metadata.cleanupType) {
      case INDICATOR_CLEANUP_TYPES.SIMPLE_SERIES:
        removeSingleSeries(series, chart, pane);
        console.log(`[CLEANUP] Single series removed for ${indicatorType}`);
        break;

      case INDICATOR_CLEANUP_TYPES.MULTI_SERIES:
        removeMultiSeries(series, chart, pane, metadata);
        console.log(`[CLEANUP] Multi-series removed for ${indicatorType}`);
        break;

      case INDICATOR_CLEANUP_TYPES.PRIMITIVE:
        // Already handled in STEP 1
        console.log(`[CLEANUP] Primitive-only cleanup (already handled) for ${indicatorType}`);
        break;

      case INDICATOR_CLEANUP_TYPES.COMPLEX:
        // Complex indicators may need custom cleanup
        // For now, treat as multi-series
        removeMultiSeries(series, chart, pane, metadata);
        console.log(`[CLEANUP] Complex series removed for ${indicatorType}`);
        break;

      default:
        console.warn(`Unknown cleanup type: ${metadata.cleanupType}`);
        // Fallback: try to remove as single series
        removeSingleSeries(series, chart, pane);
    }

    // STEP 6: Remove pane if it exists
    if (metadata.hasPane && pane) {
      console.log(`[CLEANUP] Removing pane for ${indicatorType}`);
      removePane(chart, pane);
      console.log(`[CLEANUP] Pane removed for ${indicatorType}`);
    }

    // STEP 7: Clean up maps
    indicatorSeriesMap.delete(indicatorId);
    indicatorPanesMap.delete(indicatorId);

    console.log(`[CLEANUP] Successfully cleaned up ${indicatorType} (ID: ${indicatorId})`);
    return true;
  } catch (error) {
    console.error(`Error cleaning up indicator ${indicatorId} (${indicatorType}):`, error);
    return false;
  }
}

/**
 * Cleanup multiple indicators
 * @param {Array<string>} indicatorIds - Array of indicator IDs to remove
 * @param {Map<string, string>} indicatorTypesMap - Map of indicator ID to type
 * @param {Object} context - Cleanup context
 * @returns {Object} Summary of cleanup results
 */
export function cleanupIndicators(indicatorIds, indicatorTypesMap, context) {
  const results = {
    total: indicatorIds.length,
    successful: 0,
    failed: 0,
    errors: []
  };

  indicatorIds.forEach(id => {
    const type = indicatorTypesMap.get(id);
    const success = cleanupIndicator(id, type, context);

    if (success) {
      results.successful++;
      // Also remove from types map
      indicatorTypesMap.delete(id);
    } else {
      results.failed++;
      results.errors.push({ id, type });
    }
  });

  if (results.failed > 0) {
    console.warn('Indicator cleanup summary:', results);
  }

  return results;
}

/**
 * Emergency cleanup - removes all indicators
 * Use with caution, primarily for testing or recovery scenarios
 * @param {Object} context - Cleanup context
 */
export function cleanupAllIndicators(context) {
  const { indicatorSeriesMap, indicatorTypesMap } = context;

  const allIds = Array.from(indicatorSeriesMap.keys());
  return cleanupIndicators(allIds, indicatorTypesMap, context);
}

/**
 * Verify cleanup completeness
 * Useful for testing and debugging
 * @param {Object} context - Cleanup context
 * @returns {Object} Verification results
 */
export function verifyCleanup(context) {
  const { chart, indicatorSeriesMap, indicatorPanesMap } = context;

  let chartSeries = [];
  let chartPanes = [];

  try {
    chartSeries = chart.series?.() || [];
    chartPanes = chart.panes?.() || [];
  } catch (error) {
    console.warn('Error getting chart info:', error);
  }

  return {
    remainingSeriesInMap: indicatorSeriesMap.size,
    remainingPanesInMap: indicatorPanesMap.size,
    chartSeriesCount: chartSeries.length,
    chartPaneCount: chartPanes.length,
    expectedSeriesCount: 1, // Should only have main series
    expectedPaneCount: 1,   // Should only have main pane
    isClean:
      indicatorSeriesMap.size === 0 &&
      indicatorPanesMap.size === 0 &&
      chartSeriesCount === 1 &&
      chartPaneCount === 1
  };
}

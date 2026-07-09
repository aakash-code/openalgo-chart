/**
 * Unified Indicator Cleanup Engine
 *
 * Centralized cleanup system for all indicator types.
 * Handles series removal, pane cleanup, price lines, primitives, and array-based indicators.
 *
 * This replaces the fragile, scattered cleanup logic with a robust,
 * metadata-driven approach that ensures complete resource cleanup.
 */

import { getIndicatorMetadata, INDICATOR_CLEANUP_TYPES, IndicatorMetadata } from './indicatorMetadata';
import logger from '../../../utils/logger';

export interface CleanupContext {
  chart: any;
  mainSeries: any;
  indicatorSeriesMap: Map<string, any>;
  indicatorPanesMap: Map<string, any>;
  refs: Record<string, any>;
}

export interface CleanupResults {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{ id: string; type: string | undefined }>;
}

export interface VerificationResult {
  remainingSeriesInMap: number;
  remainingPanesInMap: number;
  chartSeriesCount: number;
  chartPaneCount: number;
  expectedSeriesCount: number;
  expectedPaneCount: number;
  isClean: boolean;
}

/**
 * Validate if an object is a valid LightweightCharts series
 */
export function isValidSeries(obj: any): boolean {
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
 */
export function isValidPane(pane: any): boolean {
  if (!pane || typeof pane !== 'object') {
    return false;
  }

  // Check for pane-specific methods
  return typeof pane.series === 'function' || Array.isArray(pane._series);
}

/**
 * Safely remove price lines from a series
 */
export function cleanupPriceLines(series: any, priceLineKeys: string[]): void {
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
        logger.warn(`Failed to remove price line ${key}:`, error);
      }
    }
  });
}

/**
 * Safely remove a single series from the chart
 */
export function removeSingleSeries(series: any, chart: any, pane: any): void {
  logger.debug('[CLEANUP EXEC] removeSingleSeries called', { series, hasChart: !!chart, hasPane: !!pane });

  if (!isValidSeries(series)) {
    logger.warn('[CLEANUP EXEC] Attempted to remove invalid series:', series);
    return;
  }

  try {
    if (chart && typeof chart.removeSeries === 'function') {
      logger.debug('[CLEANUP EXEC] Calling chart.removeSeries');
      chart.removeSeries(series);
      logger.debug('[CLEANUP EXEC] Successfully called chart.removeSeries');
    } else if (pane && typeof pane.removeSeries === 'function') {
      logger.debug('[CLEANUP EXEC] Calling pane.removeSeries');
      pane.removeSeries(series);
      logger.debug('[CLEANUP EXEC] Successfully called pane.removeSeries');
    } else {
      logger.warn('[CLEANUP EXEC] No valid remove method found', { hasChart: !!chart, hasPane: !!pane });
    }
  } catch (error) {
    logger.error('[CLEANUP EXEC] Error removing series:', error);
  }
}

/**
 * Remove multiple series from a multi-series object
 */
export function removeMultiSeries(seriesObj: any, chart: any, pane: any, metadata: IndicatorMetadata): void {
  logger.debug('[CLEANUP EXEC] removeMultiSeries called', {
    hasSeriesObj: !!seriesObj,
    seriesObjType: typeof seriesObj,
    seriesKeys: metadata.seriesKeys
  });

  if (!seriesObj || typeof seriesObj !== 'object') {
    logger.warn('[CLEANUP EXEC] Invalid seriesObj in removeMultiSeries');
    return;
  }

  const seriesKeys = metadata.seriesKeys || [];
  logger.debug('[CLEANUP EXEC] Processing', seriesKeys.length, 'series keys:', seriesKeys);

  seriesKeys.forEach(key => {
    const series = seriesObj[key];
    logger.debug(`[CLEANUP EXEC] Processing key "${key}":`, { hasSeries: !!series, isValid: isValidSeries(series) });
    if (series && isValidSeries(series)) {
      removeSingleSeries(series, chart, pane);
    }
  });

  // Also try to remove any series not in the keys (fallback)
  logger.debug('[CLEANUP EXEC] Processing fallback series from Object.values');
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
 */
export function removeSeriesArray(arrayOrRef: any, chart: any): void {
  logger.debug('[CLEANUP EXEC] removeSeriesArray called', {
    hasArrayOrRef: !!arrayOrRef,
    hasCurrent: !!arrayOrRef?.current,
    type: typeof arrayOrRef
  });

  // Handle ref object
  const array = arrayOrRef?.current || arrayOrRef;

  logger.debug('[CLEANUP EXEC] Array extracted:', { isArray: Array.isArray(array), length: array?.length });

  if (!Array.isArray(array)) {
    logger.warn('[CLEANUP EXEC] Not an array in removeSeriesArray');
    return;
  }

  logger.debug('[CLEANUP EXEC] Processing', array.length, 'series in array');
  array.forEach((series: any, index: number) => {
    logger.debug(`[CLEANUP EXEC] Array item ${index}:`, { hasSeries: !!series, isValid: isValidSeries(series) });
    if (isValidSeries(series)) {
      removeSingleSeries(series, chart, null);
    }
  });

  // Clear the array
  logger.debug('[CLEANUP EXEC] Clearing array');
  if (arrayOrRef?.current) {
    logger.debug('[CLEANUP EXEC] Clearing array via .current (ref)');
    arrayOrRef.current = [];
  } else if (Array.isArray(arrayOrRef)) {
    logger.debug('[CLEANUP EXEC] Clearing array via .length = 0');
    arrayOrRef.length = 0;
  }
  logger.debug('[CLEANUP EXEC] Array cleared');
}

/**
 * Detach and remove a primitive from the main series
 */
export function removePrimitive(primitiveRef: any, mainSeries: any): void {
  const primitive = primitiveRef?.current || primitiveRef;

  if (!primitive) {
    return;
  }

  try {
    if (mainSeries && typeof mainSeries.detachPrimitive === 'function') {
      mainSeries.detachPrimitive(primitive);
    }
  } catch (error) {
    logger.warn('Error detaching primitive:', error);
  } finally {
    // Clear the ref
    if (primitiveRef && 'current' in primitiveRef) {
      primitiveRef.current = null;
    }
  }
}

/**
 * Safely remove a pane from the chart
 * Uses pane index since lightweight-charts removePane expects an index
 */
export function removePane(chart: any, pane: any): void {
  logger.debug('[CLEANUP EXEC] removePane called', { hasChart: !!chart, hasPane: !!pane });

  if (!chart || !pane) {
    logger.warn('[CLEANUP EXEC] Missing chart or pane in removePane');
    return;
  }

  try {
    // Get all panes and find the index of this pane
    if (typeof chart.panes === 'function') {
      const panes = chart.panes();
      const index = panes.indexOf(pane);

      logger.debug('[CLEANUP EXEC] Found pane at index:', index, 'total panes:', panes.length);

      if (index > 0) {
        // Never remove index 0 (main pane)
        if (typeof chart.removePane === 'function') {
          logger.debug('[CLEANUP EXEC] Calling chart.removePane with index:', index);
          chart.removePane(index);
          logger.debug('[CLEANUP EXEC] Successfully removed pane at index:', index);
        }
      } else if (index === 0) {
        logger.warn('[CLEANUP EXEC] Attempted to remove main pane (index 0), skipping');
      } else {
        logger.warn('[CLEANUP EXEC] Pane not found in chart.panes()');
      }
    } else {
      logger.warn('[CLEANUP EXEC] chart.panes() not available');
    }
  } catch (error) {
    logger.warn('Error removing pane:', error);
  }
}

/**
 * Main cleanup function for a single indicator
 */
export function cleanupIndicator(indicatorId: string, indicatorType: string, context: CleanupContext): boolean {
  logger.debug(`[CLEANUP] Starting cleanup for ${indicatorType} (ID: ${indicatorId})`);

  if (!indicatorType) {
    logger.warn(`Cannot cleanup indicator ${indicatorId}: type is undefined`);
    return false;
  }

  const metadata = getIndicatorMetadata(indicatorType);

  if (!metadata) {
    logger.error(`[CLEANUP] CRITICAL: No metadata found for indicator type: ${indicatorType}`);
    return false;
  }

  logger.debug(`[CLEANUP] Metadata for ${indicatorType}:`, {
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
      logger.debug(`[CLEANUP] Removing primitive for ${indicatorType}`);
      const primitiveRef = refs[metadata.primitiveRef];
      if (primitiveRef) {
        removePrimitive(primitiveRef, mainSeries);
        logger.debug(`[CLEANUP] Primitive removed for ${indicatorType}`);
      } else {
        logger.warn(`[CLEANUP] Primitive ref not found for ${indicatorType}`);
      }
    }

    // STEP 2: Handle array-based indicators (First Candle, Range Breakout, PAR)
    if (metadata.cleanupType === INDICATOR_CLEANUP_TYPES.SERIES_ARRAY) {
      logger.debug(`[CLEANUP] Removing series array for ${indicatorType}`);
      if (metadata.arrayRef && refs[metadata.arrayRef]) {
        removeSeriesArray(refs[metadata.arrayRef], chart);
      }
      // Clean up maps
      indicatorSeriesMap.delete(indicatorId);
      indicatorPanesMap.delete(indicatorId);
      logger.debug(`[CLEANUP] Series array cleanup complete for ${indicatorType}`);
      return true;
    }

    // STEP 3: Get series and pane from maps
    const series = indicatorSeriesMap.get(indicatorId);
    const pane = indicatorPanesMap.get(indicatorId);

    logger.debug(`[CLEANUP] Series exists: ${!!series}, Pane exists: ${!!pane}`);

    // STEP 4: Remove price lines if present
    if (metadata.hasPriceLines && series) {
      logger.debug(`[CLEANUP] Removing price lines for ${indicatorType}`);
      cleanupPriceLines(series, metadata.priceLineKeys || []);
    }

    // STEP 5: Remove series based on cleanup type
    logger.debug(`[CLEANUP] Removing series with type: ${metadata.cleanupType}`);
    switch (metadata.cleanupType) {
      case INDICATOR_CLEANUP_TYPES.SIMPLE_SERIES:
        removeSingleSeries(series, chart, pane);
        logger.debug(`[CLEANUP] Single series removed for ${indicatorType}`);
        break;

      case INDICATOR_CLEANUP_TYPES.MULTI_SERIES:
        removeMultiSeries(series, chart, pane, metadata);
        logger.debug(`[CLEANUP] Multi-series removed for ${indicatorType}`);
        break;

      case INDICATOR_CLEANUP_TYPES.PRIMITIVE:
        // Already handled in STEP 1
        logger.debug(`[CLEANUP] Primitive-only cleanup (already handled) for ${indicatorType}`);
        break;

      case INDICATOR_CLEANUP_TYPES.COMPLEX:
        // Complex indicators may need custom cleanup
        // For now, treat as multi-series
        removeMultiSeries(series, chart, pane, metadata);
        logger.debug(`[CLEANUP] Complex series removed for ${indicatorType}`);
        break;

      default:
        logger.warn(`Unknown cleanup type: ${metadata.cleanupType}`);
        // Fallback: try to remove as single series
        removeSingleSeries(series, chart, pane);
    }

    // STEP 6: Remove pane if it exists
    if (metadata.hasPane && pane) {
      logger.debug(`[CLEANUP] Removing pane for ${indicatorType}`);
      removePane(chart, pane);
      logger.debug(`[CLEANUP] Pane removed for ${indicatorType}`);
    }

    // STEP 7: Clean up maps
    indicatorSeriesMap.delete(indicatorId);
    indicatorPanesMap.delete(indicatorId);

    logger.debug(`[CLEANUP] Successfully cleaned up ${indicatorType} (ID: ${indicatorId})`);
    return true;
  } catch (error) {
    logger.error(`Error cleaning up indicator ${indicatorId} (${indicatorType}):`, error);
    return false;
  }
}

/**
 * Cleanup multiple indicators
 */
export function cleanupIndicators(
  indicatorIds: string[],
  indicatorTypesMap: Map<string, string>,
  context: CleanupContext
): CleanupResults {
  const results: CleanupResults = {
    total: indicatorIds.length,
    successful: 0,
    failed: 0,
    errors: []
  };

  indicatorIds.forEach(id => {
    const type = indicatorTypesMap.get(id);
    const success = cleanupIndicator(id, type || '', context);

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
    logger.warn('Indicator cleanup summary:', results);
  }

  return results;
}

/**
 * Emergency cleanup - removes all indicators
 * Use with caution, primarily for testing or recovery scenarios
 */
export function cleanupAllIndicators(context: CleanupContext & { indicatorTypesMap: Map<string, string> }): CleanupResults {
  const { indicatorSeriesMap, indicatorTypesMap } = context;

  const allIds = Array.from(indicatorSeriesMap.keys());
  return cleanupIndicators(allIds, indicatorTypesMap, context);
}

/**
 * Verify cleanup completeness
 * Useful for testing and debugging
 */
export function verifyCleanup(context: CleanupContext): VerificationResult {
  const { chart, indicatorSeriesMap, indicatorPanesMap } = context;

  let chartSeries: any[] = [];
  let chartPanes: any[] = [];
  let chartSeriesCount = 0;
  let chartPaneCount = 0;

  try {
    chartSeries = chart.series?.() || [];
    chartPanes = chart.panes?.() || [];
    chartSeriesCount = chartSeries.length;
    chartPaneCount = chartPanes.length;
  } catch (error) {
    logger.warn('Error getting chart info:', error);
  }

  return {
    remainingSeriesInMap: indicatorSeriesMap.size,
    remainingPanesInMap: indicatorPanesMap.size,
    chartSeriesCount,
    chartPaneCount,
    expectedSeriesCount: 1, // Should only have main series
    expectedPaneCount: 1,   // Should only have main pane
    isClean:
      indicatorSeriesMap.size === 0 &&
      indicatorPanesMap.size === 0 &&
      chartSeriesCount === 1 &&
      chartPaneCount === 1
  };
}

/**
 * VCP (Volume Centric Pair) Scanner Service
 * Scans multiple stocks on the 3-minute timeframe to detect zone formation,
 * long breakouts, and short breakdowns from the VCP indicator.
 */

import { getKlines } from './openalgo';
import {
  calculateVolumetricCandlePair,
  type VolumetricCandlePairOptions,
} from '../utils/indicators/volumetricCandlePair';
import { calculateATR, calculateEMA } from '../utils/indicators';
import logger from '../utils/logger';

// ==================== TYPES ====================

/** OHLC candle data */
interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number | undefined;
}

/** VCP signal direction */
export type VCPDirection = 'long' | 'short' | null;

/** VCP status for a single stock */
export type VCPStatus =
  | 'no_zone'        // Not enough data / no C1 yet
  | 'c1_found'       // First volume spike candle found, waiting for C2
  | 'zone_formed'    // C2 found, zone established, no breakout yet
  | 'long_breakout'  // Price broke above zone high (with filters passing)
  | 'short_breakdown'; // Price broke below zone low (with filters passing)

/** Stock input for scanning */
export interface VCPStockInput {
  symbol: string;
  exchange: string;
  name?: string | undefined;
}

/** Scan options */
export interface VCPScanOptions {
  interval?: string | undefined;        // Default '3m'
  daysToFetch?: number | undefined;     // Default 1 (today's data only)
  delayMs?: number | undefined;         // Default 100ms between symbols
  vcpOptions?: VolumetricCandlePairOptions | undefined;
}

/** Scan result for a single stock */
export interface VCPScanResult {
  symbol: string;
  exchange: string;
  name?: string | undefined;
  status: VCPStatus;
  direction: VCPDirection;
  zoneHigh: number | null;
  zoneLow: number | null;
  c1Time: number | null;
  c1High: number | null;
  c1Low: number | null;
  c2Time: number | null;
  c2High: number | null;
  c2Low: number | null;
  signalTime: number | null;   // Time of latest breakout/breakdown marker, if any
  signalText: string | null;   // e.g., "Long Breakout (Delta)"
  /** Close price of the breakout candle — used as planned entry by the trade engine */
  entryPrice: number | null;
  /** ATR(14) on the scan timeframe (3m by default) — used by SL/trail strategies */
  atr: number | null;
  /** EMA(20) on the scan timeframe — used by EMA-based trail strategies */
  ema20: number | null;
  lastCandleTime: number | null;
  scannedAt: number;            // ms since epoch
  error: string | null;
}

/** Progress callback type */
type ProgressCallback = (current: number, total: number, result: VCPScanResult) => void;

// ==================== HELPERS ====================

/**
 * Get IST date string (YYYY-MM-DD) for a unix-seconds timestamp.
 * Candles from the API already have IST offset applied, so use UTC accessors.
 */
const getISTDateStr = (timestampSec: number): string => {
  const date = new Date(timestampSec * 1000);
  return date.toISOString().split('T')[0] as string;
};

/**
 * Build an empty result skeleton for error/no-data cases.
 */
const emptyResult = (
  stock: VCPStockInput,
  error: string | null = null
): VCPScanResult => ({
  symbol: stock.symbol,
  exchange: stock.exchange,
  name: stock.name,
  status: 'no_zone',
  direction: null,
  zoneHigh: null,
  zoneLow: null,
  c1Time: null,
  c1High: null,
  c1Low: null,
  c2Time: null,
  c2High: null,
  c2Low: null,
  signalTime: null,
  signalText: null,
  entryPrice: null,
  atr: null,
  ema20: null,
  lastCandleTime: null,
  scannedAt: Date.now(),
  error,
});

// ==================== CORE SCAN ====================

/**
 * Scan a single stock for VCP signals on the configured interval.
 */
export const scanStock = async (
  stock: VCPStockInput,
  options: VCPScanOptions = {},
  signal?: AbortSignal
): Promise<VCPScanResult> => {
  const { interval = '3m', daysToFetch = 1, vcpOptions = {} } = options;

  try {
    // 3m intraday: ~125 bars/day. Fetch enough for the requested days plus a buffer
    // so EMAs (period 100) have warmup history.
    const limit = Math.max(500, daysToFetch * 200);

    const data = (await getKlines(
      stock.symbol,
      stock.exchange,
      interval,
      limit,
      signal
    )) as Candle[] | null;

    if (!data || data.length === 0) {
      return emptyResult(stock, 'No data available');
    }

    const result = calculateVolumetricCandlePair(data, vcpOptions);
    const lastCandle = data[data.length - 1];
    const todayStr = lastCandle ? getISTDateStr(lastCandle.time) : null;

    // ATR(14) on the same timeframe — used by hybrid/atr SL strategies and ATR trail
    let atrValue: number | null = null;
    try {
      const atrSeries = calculateATR(data, 14) as Array<{ time: number; value: number }> | null;
      if (atrSeries && atrSeries.length > 0) {
        atrValue = atrSeries[atrSeries.length - 1]?.value ?? null;
      }
    } catch {
      atrValue = null;
    }

    // EMA(20) — used by be_ema trail strategy
    let ema20Value: number | null = null;
    try {
      const emaSeries = calculateEMA(data, 20) as Array<{ time: number; value: number }> | null;
      if (emaSeries && emaSeries.length > 0) {
        ema20Value = emaSeries[emaSeries.length - 1]?.value ?? null;
      }
    } catch {
      ema20Value = null;
    }

    // Map C1/C2 markers back to their full candles to expose H/L to the engine
    const findCandle = (time: number | undefined) =>
      time ? data.find((c) => c.time === time) : undefined;

    // Find today's zone (the indicator returns one zone per day)
    const todayZone = todayStr
      ? result.allZones.find((z) => z.date === todayStr)
      : undefined;

    // Find today's markers (C1, C2, breakout/breakdown)
    const todayMarkers = todayStr
      ? result.markers.filter((m) => getISTDateStr(m.time) === todayStr)
      : [];

    const c1Marker = todayMarkers.find((m) => m.text === 'C1');
    const c2Marker = todayMarkers.find((m) => m.text === 'C2');
    const breakoutMarker = todayMarkers.find((m) => m.text.startsWith('Long'));
    const breakdownMarker = todayMarkers.find((m) => m.text.startsWith('Short'));

    const c1Candle = findCandle(c1Marker?.time);
    const c2Candle = findCandle(c2Marker?.time);
    const breakoutCandle = findCandle(breakoutMarker?.time ?? breakdownMarker?.time);

    // Determine status — most-progressed state wins
    let status: VCPStatus = 'no_zone';
    let direction: VCPDirection = null;
    let signalTime: number | null = null;
    let signalText: string | null = null;

    if (breakoutMarker) {
      status = 'long_breakout';
      direction = 'long';
      signalTime = breakoutMarker.time;
      signalText = breakoutMarker.text;
    } else if (breakdownMarker) {
      status = 'short_breakdown';
      direction = 'short';
      signalTime = breakdownMarker.time;
      signalText = breakdownMarker.text;
    } else if (c2Marker && todayZone) {
      status = 'zone_formed';
      signalTime = c2Marker.time;
      signalText = 'Zone Formed';
    } else if (c1Marker) {
      status = 'c1_found';
      signalTime = c1Marker.time;
      signalText = 'C1 Detected';
    }

    return {
      symbol: stock.symbol,
      exchange: stock.exchange,
      name: stock.name,
      status,
      direction,
      zoneHigh: todayZone?.high ?? null,
      zoneLow: todayZone?.low ?? null,
      c1Time: c1Marker?.time ?? null,
      c1High: c1Candle?.high ?? null,
      c1Low: c1Candle?.low ?? null,
      c2Time: c2Marker?.time ?? null,
      c2High: c2Candle?.high ?? null,
      c2Low: c2Candle?.low ?? null,
      signalTime,
      signalText,
      entryPrice: breakoutCandle?.close ?? lastCandle?.close ?? null,
      atr: atrValue,
      ema20: ema20Value,
      lastCandleTime: lastCandle?.time ?? null,
      scannedAt: Date.now(),
      error: null,
    };
  } catch (err) {
    const error = err as Error & { name?: string };
    if (error.name === 'AbortError') throw err;
    logger.error(`[VCP Scanner] Error scanning ${stock.symbol}:`, err);
    return emptyResult(stock, error.message || 'Scan failed');
  }
};

/**
 * Scan multiple stocks sequentially with rate-limit delay and progress callback.
 */
export const scanStocks = async (
  stocks: VCPStockInput[],
  options: VCPScanOptions = {},
  onProgress?: ProgressCallback | null,
  signal?: AbortSignal
): Promise<VCPScanResult[]> => {
  const { delayMs = 100, ...scanOptions } = options;
  const results: VCPScanResult[] = [];

  for (let i = 0; i < stocks.length; i++) {
    if (signal?.aborted) {
      throw new DOMException('Scan cancelled', 'AbortError');
    }

    const stock = stocks[i];
    if (!stock) continue;

    const result = await scanStock(stock, scanOptions, signal);
    results.push(result);

    if (onProgress) {
      onProgress(i + 1, stocks.length, result);
    }

    if (i < stocks.length - 1 && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
};

/**
 * Build a stable dedup key for a fired breakout/breakdown signal.
 * One key per symbol-day-direction so we never re-notify the same signal twice.
 */
export const getSignalDedupKey = (result: VCPScanResult): string | null => {
  if (!result.direction || !result.signalTime) return null;
  const dateStr = getISTDateStr(result.signalTime);
  return `${result.symbol}:${result.exchange}:${dateStr}:${result.direction}`;
};

export default {
  scanStock,
  scanStocks,
  getSignalDedupKey,
};

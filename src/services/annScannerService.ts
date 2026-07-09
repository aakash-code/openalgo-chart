/**
 * ANN Scanner Service
 * Scans multiple stocks using ANN Strategy to detect LONG/SHORT signals
 * and calculates consecutive day streaks
 */

import { getKlines } from './openalgo';
import { calculateANNStrategy } from '../utils/indicators/annStrategy';
import logger from '../utils/logger';

// ==================== TYPES ====================

/** Signal direction */
export type SignalDirection = 'LONG' | 'SHORT' | null;

/** Sort field options */
export type SortField = 'streak' | 'symbol' | 'nnOutput' | 'direction';

/** Sort direction */
export type SortDirection = 'asc' | 'desc';

/** Filter options */
export type FilterType = 'all' | 'long' | 'short';

/** Raw signal from ANN Strategy */
interface ANNSignal {
  time: number;
  buying: boolean | null;
  nnOutput: number | null;
}

/** Daily signal grouped by day */
interface DailySignal {
  date: string;
  time: number;
  buying: boolean | null;
  nnOutput: number | null;
}

/** Stock input for scanning */
export interface StockInput {
  symbol: string;
  exchange: string;
  name?: string | undefined;
}

/** Scan options */
export interface ScanOptions {
  threshold?: number | undefined;
  daysToFetch?: number | undefined;
  delayMs?: number | undefined;
}

/** Streak calculation result */
interface StreakInfo {
  streak: number;
  direction: SignalDirection;
  lastChangeDate: string | null;
  nnOutput: number | null;
}

/** Scan result for a single stock */
export interface ScanResult {
  symbol: string;
  exchange: string;
  name?: string | undefined;
  direction: SignalDirection;
  streak: number;
  nnOutput: number | null;
  lastChangeDate: string | null;
  totalDays?: number | undefined;
  error: string | null;
}

/** Progress callback type */
type ProgressCallback = (current: number, total: number, result: ScanResult) => void;

/** OHLC candle data */
interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number | undefined;
}

/** ANN Strategy result */
interface ANNStrategyResult {
  signals: ANNSignal[];
}

/**
 * Convert timestamp to date string (YYYY-MM-DD)
 */
const getDateStr = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  return date.toISOString().split('T')[0] as string;
};

/**
 * Group signals by day and get end-of-day signal state
 * @param signals - Array of signal objects { time, buying, nnOutput }
 * @returns Array of daily signals sorted chronologically
 */
const groupSignalsByDay = (signals: ANNSignal[]): DailySignal[] => {
  if (!signals || signals.length === 0) return [];

  const dayMap = new Map<string, DailySignal>();

  // Group signals by day, keeping the last signal of each day
  for (const signal of signals) {
    const dateStr = getDateStr(signal.time);
    const existing = dayMap.get(dateStr);
    // Always keep the latest signal for each day
    if (!existing || signal.time > existing.time) {
      dayMap.set(dateStr, {
        date: dateStr,
        time: signal.time,
        buying: signal.buying,
        nnOutput: signal.nnOutput,
      });
    }
  }

  // Sort by date chronologically
  return Array.from(dayMap.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
};

/**
 * Calculate streak of consecutive days with same signal direction
 * @param dailySignals - Array of daily signal objects
 * @returns Streak info object
 */
const calculateStreak = (dailySignals: DailySignal[]): StreakInfo => {
  if (!dailySignals || dailySignals.length === 0) {
    return { streak: 0, direction: null, lastChangeDate: null, nnOutput: null };
  }

  // Get the latest signal
  const latestSignal = dailySignals[dailySignals.length - 1];
  if (!latestSignal) {
    return { streak: 0, direction: null, lastChangeDate: null, nnOutput: null };
  }

  // If latest signal has no direction (buying is null), no streak
  if (latestSignal.buying === null) {
    return {
      streak: 0,
      direction: null,
      lastChangeDate: latestSignal.date,
      nnOutput: latestSignal.nnOutput,
    };
  }

  let streak = 1;
  let lastChangeDate = latestSignal.date;

  // Count backwards from second-to-last day
  for (let i = dailySignals.length - 2; i >= 0; i--) {
    const currentSignal = dailySignals[i];
    if (!currentSignal) continue;

    // If signal direction matches, increment streak
    if (currentSignal.buying === latestSignal.buying) {
      streak++;
    } else {
      // Direction changed - record the date when current streak started
      const nextSignal = dailySignals[i + 1];
      if (nextSignal) {
        lastChangeDate = nextSignal.date;
      }
      break;
    }
  }

  // If we went through all signals and they all match, streak started from first signal
  if (streak === dailySignals.length) {
    const firstSignal = dailySignals[0];
    if (firstSignal) {
      lastChangeDate = firstSignal.date;
    }
  }

  return {
    streak,
    direction: latestSignal.buying ? 'LONG' : 'SHORT',
    lastChangeDate,
    nnOutput: latestSignal.nnOutput,
  };
};

/**
 * Scan a single stock for ANN signals
 * @param stock - Stock object with symbol, exchange, name
 * @param options - Scan options
 * @param signal - Abort signal for cancellation
 * @returns Scan result
 */
export const scanStock = async (
  stock: StockInput,
  options: ScanOptions = {},
  signal?: AbortSignal | undefined
): Promise<ScanResult> => {
  const { threshold = 0.0014, daysToFetch = 60 } = options;

  try {
    // Fetch daily OHLC data
    const data = (await getKlines(
      stock.symbol,
      stock.exchange,
      '1d',
      daysToFetch,
      signal
    )) as Candle[] | null;

    if (!data || data.length === 0) {
      return {
        symbol: stock.symbol,
        exchange: stock.exchange,
        name: stock.name,
        error: 'No data available',
        direction: null,
        streak: 0,
        nnOutput: null,
        lastChangeDate: null,
      };
    }

    // Run ANN Strategy
    const { signals } = calculateANNStrategy(data, {
      threshold,
      showSignals: false,
      showBackground: false,
    }) as ANNStrategyResult;

    // Group by day and calculate streak
    const dailySignals = groupSignalsByDay(signals);
    const streakInfo = calculateStreak(dailySignals);

    return {
      symbol: stock.symbol,
      exchange: stock.exchange,
      name: stock.name,
      direction: streakInfo.direction,
      streak: streakInfo.streak,
      nnOutput: streakInfo.nnOutput,
      lastChangeDate: streakInfo.lastChangeDate,
      totalDays: dailySignals.length,
      error: null,
    };
  } catch (err) {
    const error = err as Error & { name?: string };
    if (error.name === 'AbortError') {
      throw err; // Re-throw abort errors
    }
    logger.error(`[ANN Scanner] Error scanning ${stock.symbol}:`, err);
    return {
      symbol: stock.symbol,
      exchange: stock.exchange,
      name: stock.name,
      error: error.message || 'Scan failed',
      direction: null,
      streak: 0,
      nnOutput: null,
      lastChangeDate: null,
    };
  }
};

/**
 * Scan multiple stocks with progress callback
 * @param stocks - Array of stock objects
 * @param options - Scan options including delayMs
 * @param onProgress - Progress callback
 * @param signal - Abort signal for cancellation
 * @returns Array of scan results
 */
export const scanStocks = async (
  stocks: StockInput[],
  options: ScanOptions = {},
  onProgress?: ProgressCallback | null,
  signal?: AbortSignal | undefined
): Promise<ScanResult[]> => {
  const { delayMs = 100, ...scanOptions } = options;
  const results: ScanResult[] = [];

  for (let i = 0; i < stocks.length; i++) {
    // Check if aborted
    if (signal?.aborted) {
      throw new DOMException('Scan cancelled', 'AbortError');
    }

    const stock = stocks[i];
    if (!stock) continue;

    const result = await scanStock(stock, scanOptions, signal);
    results.push(result);

    // Call progress callback
    if (onProgress) {
      onProgress(i + 1, stocks.length, result);
    }

    // Small delay between requests to avoid rate limiting
    if (i < stocks.length - 1 && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
};

/**
 * Sort scan results by various criteria
 * @param results - Array of scan results
 * @param sortBy - Sort field
 * @param sortDir - Sort direction
 * @returns Sorted results
 */
export const sortResults = (
  results: ScanResult[],
  sortBy: SortField = 'streak',
  sortDir: SortDirection = 'desc'
): ScanResult[] => {
  const sorted = [...results];

  sorted.sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'streak':
        comparison = (a.streak || 0) - (b.streak || 0);
        break;
      case 'symbol':
        comparison = a.symbol.localeCompare(b.symbol);
        break;
      case 'nnOutput':
        comparison = (a.nnOutput || 0) - (b.nnOutput || 0);
        break;
      case 'direction': {
        // LONG first, then SHORT, then null
        const dirOrder: Record<string, number> = { LONG: 0, SHORT: 1 };
        comparison = (dirOrder[a.direction ?? ''] ?? 2) - (dirOrder[b.direction ?? ''] ?? 2);
        break;
      }
      default:
        comparison = 0;
    }

    return sortDir === 'desc' ? -comparison : comparison;
  });

  return sorted;
};

/**
 * Filter scan results by direction
 * @param results - Array of scan results
 * @param filter - Filter type
 * @returns Filtered results
 */
export const filterResults = (results: ScanResult[], filter: FilterType = 'all'): ScanResult[] => {
  if (filter === 'all') return results;
  if (filter === 'long') return results.filter((r) => r.direction === 'LONG');
  if (filter === 'short') return results.filter((r) => r.direction === 'SHORT');
  return results;
};

/**
 * Calculate signal strength from NN output (0-100)
 * Based on typical nnOutput range of -0.01 to +0.01
 * @param nnOutput - The neural network output value
 * @returns Signal strength as percentage (0-100)
 */
export const calculateSignalStrength = (nnOutput: number | null | undefined): number => {
  if (nnOutput === null || nnOutput === undefined) return 0;
  const absValue = Math.abs(nnOutput);
  // Map 0-0.01 range to 0-100 scale, capping at 0.01
  return Math.round(Math.min(100, (absValue / 0.01) * 100));
};

/**
 * Get color for signal strength
 * @param strength - Signal strength (0-100)
 * @returns Hex color code
 */
export const getStrengthColor = (strength: number): string => {
  if (strength >= 70) return '#26A69A'; // Strong - green
  if (strength >= 40) return '#FFB74D'; // Medium - orange
  return '#787b86'; // Weak - gray
};

export default {
  scanStock,
  scanStocks,
  sortResults,
  filterResults,
  calculateSignalStrength,
  getStrengthColor,
};

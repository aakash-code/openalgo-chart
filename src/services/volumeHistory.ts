/**
 * Volume History Service
 * Fetches and caches 20-day average volume for stocks
 */

import { getHistoricalKlines } from './openalgo';
import logger from '../utils/logger';

/** Volume data result */
export interface VolumeData {
  avgVolume: number;
  days: number;
  volumes: number[];
}

/** Cache entry structure */
interface VolumeCacheEntry {
  timestamp: number;
  data: VolumeData;
}

/** Symbol request for batch operations */
export interface SymbolRequest {
  symbol: string;
  exchange: string;
}

/** Boost level description */
export interface BoostLevel {
  level: 'Extreme' | 'High' | 'Moderate' | 'Normal' | 'Low';
  bars: number;
  color: string;
}

/** Momentum signal result */
export interface MomentumSignal {
  signal: 'long_buildup' | 'short_buildup' | 'short_covering' | 'long_unwinding' | 'neutral';
  strength: 'strong' | 'weak' | 'none';
  description: string;
  shortDesc: string;
  color: string;
}

// Cache for 20-day average volumes
const volumeCache = new Map<string, VolumeCacheEntry>();
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_SIZE = 500; // Maximum symbols to cache

/**
 * Evict oldest entries if cache exceeds max size
 */
const evictIfNeeded = (): void => {
  if (volumeCache.size <= MAX_CACHE_SIZE) return;

  // Find oldest entries by timestamp
  const entries = Array.from(volumeCache.entries());
  entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

  // Remove oldest entries to get under limit
  const toRemove = volumeCache.size - MAX_CACHE_SIZE;
  for (let i = 0; i < toRemove; i++) {
    const entry = entries[i];
    if (entry) {
      volumeCache.delete(entry[0]);
    }
  }
  logger.debug(`[VolumeHistory] Evicted ${toRemove} cache entries`);
};

/**
 * Format date to YYYY-MM-DD
 */
const formatDate = (d: Date): string => d.toISOString().split('T')[0] as string;

/** Kline data structure */
interface KlineData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

/**
 * Get 20-day historical volume for a symbol
 * @param symbol - Trading symbol
 * @param exchange - Exchange code (default: NSE)
 * @returns Volume data with average and history
 */
export const get20DayVolume = async (
  symbol: string,
  exchange: string = 'NSE'
): Promise<VolumeData> => {
  const cacheKey = `${symbol}-${exchange}`;
  const cached = volumeCache.get(cacheKey);

  // Return cached if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    return cached.data;
  }

  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Fetch 30 days to ensure 20 trading days

    // Use getHistoricalKlines which is already exported
    const result = (await getHistoricalKlines(
      symbol,
      exchange,
      '1d',
      formatDate(startDate),
      formatDate(endDate)
    )) as KlineData[] | null;

    if (result && Array.isArray(result) && result.length > 0) {
      // Get last 20 trading days
      const last20Days = result.slice(-20);

      // Calculate average volume
      const totalVolume = last20Days.reduce((sum, d) => sum + (d.volume || 0), 0);
      const avgVolume = last20Days.length > 0 ? totalVolume / last20Days.length : 0;

      const data: VolumeData = {
        avgVolume,
        days: last20Days.length,
        volumes: last20Days.map((d) => d.volume || 0),
      };

      // Cache the result
      volumeCache.set(cacheKey, {
        timestamp: Date.now(),
        data,
      });
      evictIfNeeded(); // Enforce max cache size

      return data;
    }

    return { avgVolume: 0, days: 0, volumes: [] };
  } catch (error) {
    logger.error(`[VolumeHistory] Error fetching ${symbol}:`, error);
    return { avgVolume: 0, days: 0, volumes: [] };
  }
};

/**
 * Batch fetch 20-day volumes for multiple symbols
 * @param symbols - Array of symbol requests
 * @returns Map of cache keys to volume data
 */
export const batchGet20DayVolumes = async (
  symbols: SymbolRequest[]
): Promise<Map<string, VolumeData>> => {
  const results = new Map<string, VolumeData>();

  if (!symbols || symbols.length === 0) {
    return results;
  }

  // Filter out already cached symbols
  const uncached = symbols.filter((s) => {
    const cacheKey = `${s.symbol}-${s.exchange}`;
    const cached = volumeCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
      results.set(cacheKey, cached.data);
      return false;
    }
    return true;
  });

  logger.info(
    `[VolumeHistory] Fetching ${uncached.length} symbols (${symbols.length - uncached.length} cached)`
  );

  // Batch fetch with rate limiting (5 at a time to avoid 429)
  const batchSize = 5;
  for (let i = 0; i < uncached.length; i += batchSize) {
    const batch = uncached.slice(i, i + batchSize);
    const promises = batch.map((s) =>
      get20DayVolume(s.symbol, s.exchange).then((data) => ({
        key: `${s.symbol}-${s.exchange}`,
        data,
      }))
    );

    const batchResults = await Promise.all(promises);
    batchResults.forEach(({ key, data }) => {
      results.set(key, data);
    });

    // Delay between batches to avoid rate limiting
    if (i + batchSize < uncached.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return results;
};

/**
 * Calculate boost ratio
 * @param currentVolume - Today's volume
 * @param avgVolume - 20-day average volume
 * @returns Boost ratio (e.g., 2.5 = 2.5x average)
 */
export const calculateBoostRatio = (currentVolume: number, avgVolume: number): number => {
  if (!avgVolume || avgVolume <= 0) return 0;
  return currentVolume / avgVolume;
};

/**
 * Get boost level description
 * @param ratio - Boost ratio
 * @returns Boost level info with color
 */
export const getBoostLevel = (ratio: number): BoostLevel => {
  if (ratio >= 4) {
    return { level: 'Extreme', bars: 4, color: '#00ff00' };
  } else if (ratio >= 2.5) {
    return { level: 'High', bars: 3, color: '#26a69a' };
  } else if (ratio >= 1.5) {
    return { level: 'Moderate', bars: 2, color: '#4db6ac' };
  } else if (ratio >= 1) {
    return { level: 'Normal', bars: 1, color: '#80cbc4' };
  }
  return { level: 'Low', bars: 0, color: '#787b86' };
};

/**
 * Clear the volume cache
 */
export const clearVolumeCache = (): void => {
  volumeCache.clear();
  logger.info('[VolumeHistory] Cache cleared');
};

/**
 * Calculate momentum signal based on OI methodology
 * Uses volume boost as a proxy for OI activity:
 * - High volume = money flowing in (like OI increase)
 * - Low volume = money flowing out (like OI decrease)
 *
 * @param priceChange - Percentage price change
 * @param boostRatio - Volume boost ratio (current/avg)
 * @returns Momentum signal with strength and description
 */
export const getMomentumSignal = (priceChange: number, boostRatio: number): MomentumSignal => {
  const isPriceUp = priceChange > 0.1; // Up more than 0.1%
  const isPriceDown = priceChange < -0.1; // Down more than 0.1%
  const isHighVolume = boostRatio >= 1.5; // 1.5x+ average volume = significant activity

  // Neutral case - no significant price movement
  if (!isPriceUp && !isPriceDown) {
    return {
      signal: 'neutral',
      strength: 'none',
      description: 'Consolidation',
      shortDesc: 'Range',
      color: '#787b86',
    };
  }

  // OI Methodology mapping:
  // Price + Volume = Long Buildup (Strong Bullish)
  // Price - Volume + = Short Buildup (Strong Bearish)
  // Price + Volume - = Short Covering (Weak Bullish)
  // Price - Volume - = Long Unwinding (Weak Bearish)

  if (isPriceUp && isHighVolume) {
    return {
      signal: 'long_buildup',
      strength: 'strong',
      description: 'Long Buildup',
      shortDesc: 'LB',
      color: '#00c853', // Bright green
    };
  }

  if (isPriceDown && isHighVolume) {
    return {
      signal: 'short_buildup',
      strength: 'strong',
      description: 'Short Buildup',
      shortDesc: 'SB',
      color: '#ff1744', // Bright red
    };
  }

  if (isPriceUp && !isHighVolume) {
    return {
      signal: 'short_covering',
      strength: 'weak',
      description: 'Short Covering',
      shortDesc: 'SC',
      color: '#69f0ae', // Light green
    };
  }

  if (isPriceDown && !isHighVolume) {
    return {
      signal: 'long_unwinding',
      strength: 'weak',
      description: 'Long Unwinding',
      shortDesc: 'LU',
      color: '#ff8a80', // Light red
    };
  }

  // Fallback
  return {
    signal: 'neutral',
    strength: 'none',
    description: 'Neutral',
    shortDesc: '-',
    color: '#787b86',
  };
};

export default {
  get20DayVolume,
  batchGet20DayVolumes,
  calculateBoostRatio,
  getBoostLevel,
  clearVolumeCache,
  getMomentumSignal,
};

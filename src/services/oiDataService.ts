/**
 * OI Data Service
 * Fetches and caches Open Interest data from Option Chain API
 * Stores historical OI for day-over-day comparison
 */

import { getOptionChain } from './optionChain';
import logger from '../utils/logger';
import { getJSON, setJSON, STORAGE_KEYS } from './storageService';
import { formatCompactNumber } from '../utils/shared/formatters';

// ==================== TYPES ====================

/** OI data for a stock */
export interface StockOIData {
  symbol: string;
  totalCallOI: number;
  totalPutOI: number;
  totalOI: number;
  pcr: number;
  totalCallVolume: number;
  totalPutVolume: number;
  atmStrike: number;
  underlyingLTP: number;
  timestamp: number;
}

/** Stored OI data (simplified) */
export interface StoredOIData {
  totalCallOI: number;
  totalPutOI: number;
  pcr: number;
  timestamp: number;
}

/** OI momentum signal */
export interface OIMomentumSignal {
  signal: 'long_buildup' | 'short_buildup' | 'short_covering' | 'long_unwinding' | 'neutral';
  strength: 'strong' | 'weak' | 'none';
  description: string;
  shortDesc: string;
  color: string;
}

/** Progress callback type */
type ProgressCallback = (current: number, total: number) => void;

/** Symbol input for batch fetch */
export interface SymbolInput {
  symbol: string;
}

/** Cache entry */
interface OICacheEntry {
  data: StockOIData;
  timestamp: number;
}

/** Option chain response */
interface OptionChainResponse {
  chain?: Array<{
    ce?: { oi?: number; volume?: number };
    pe?: { oi?: number; volume?: number };
  }>;
  atmStrike?: number;
  underlyingLTP?: number;
}

// Cache for current session OI data
const oiCache = new Map<string, OICacheEntry>();
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
// MEDIUM FIX ML-12: Add max size to prevent unbounded growth
const MAX_OI_CACHE_SIZE = 150; // Limit to 150 symbols

// localStorage keys
const OI_HISTORY_KEY = STORAGE_KEYS.OI_HISTORY;
const OI_CURRENT_KEY = STORAGE_KEYS.OI_CURRENT;

/**
 * Format OI for display (Indian notation: K, L, Cr)
 */
export const formatOI = (oi: number | undefined | null): string => {
  if (!oi || oi === 0) return '-';
  // Use shared formatter which handles K/L/Cr
  return formatCompactNumber(oi, 1);
};

/**
 * Get today's date string (YYYY-MM-DD)
 */
const getTodayKey = (): string => new Date().toISOString().split('T')[0] as string;

/**
 * Fetch OI data for a single stock from Option Chain API
 * @param symbol - Stock symbol (e.g., 'RELIANCE')
 * @returns OI data or null
 */
export const fetchStockOI = async (symbol: string): Promise<StockOIData | null> => {
  try {
    // Check cache first
    const cacheKey = symbol;
    const cached = oiCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
      return cached.data;
    }

    // Fetch from Option Chain API
    const chain = (await getOptionChain(symbol, 'NFO', null, 10)) as OptionChainResponse | null;

    if (!chain?.chain || chain.chain.length === 0) {
      logger.debug(`[OI] No option chain data for ${symbol}`);
      return null;
    }

    // Calculate totals
    let totalCallOI = 0;
    let totalPutOI = 0;
    let totalCallVolume = 0;
    let totalPutVolume = 0;

    chain.chain.forEach((row) => {
      if (row.ce) {
        totalCallOI += row.ce.oi || 0;
        totalCallVolume += row.ce.volume || 0;
      }
      if (row.pe) {
        totalPutOI += row.pe.oi || 0;
        totalPutVolume += row.pe.volume || 0;
      }
    });

    // Calculate PCR (Put/Call Ratio)
    const pcr = totalCallOI > 0 ? totalPutOI / totalCallOI : 0;

    const oiData: StockOIData = {
      symbol,
      totalCallOI,
      totalPutOI,
      totalOI: totalCallOI + totalPutOI,
      pcr,
      totalCallVolume,
      totalPutVolume,
      atmStrike: chain.atmStrike || 0,
      underlyingLTP: chain.underlyingLTP || 0,
      timestamp: Date.now(),
    };

    // MEDIUM FIX ML-12: Evict oldest entry before caching new one
    if (oiCache.size >= MAX_OI_CACHE_SIZE) {
      const entries = Array.from(oiCache.entries()).sort(
        (a, b) => a[1].timestamp - b[1].timestamp
      );
      const toRemove = entries[0];
      if (toRemove) {
        oiCache.delete(toRemove[0]);
        logger.debug('[OI] Evicted oldest cache entry:', toRemove[0]);
      }
    }

    // Store in cache
    oiCache.set(cacheKey, { data: oiData, timestamp: Date.now() });

    return oiData;
  } catch (error) {
    logger.error(`[OI] Error fetching OI for ${symbol}:`, error);
    return null;
  }
};

/**
 * Batch fetch OI for multiple symbols with rate limiting
 * @param symbols - Array of symbol objects
 * @param onProgress - Progress callback (current, total)
 * @returns Map of symbol -> OI data
 */
export const batchFetchOI = async (
  symbols: SymbolInput[],
  onProgress: ProgressCallback | null = null
): Promise<Map<string, StockOIData>> => {
  const results = new Map<string, StockOIData>();

  if (!symbols || symbols.length === 0) {
    return results;
  }

  const batchSize = 5; // Fetch 5 at a time
  const delayMs = 2000; // 2 second delay between batches (to stay under 30/min)

  logger.info(`[OI] Starting batch fetch for ${symbols.length} symbols`);

  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);

    // Fetch batch in parallel
    const promises = batch.map((s) =>
      fetchStockOI(s.symbol)
        .then((data) => ({ symbol: s.symbol, data }))
        .catch(() => ({ symbol: s.symbol, data: null }))
    );

    const batchResults = await Promise.all(promises);

    batchResults.forEach(({ symbol, data }) => {
      if (data) {
        results.set(symbol, data);
      }
    });

    // Progress callback
    if (onProgress) {
      onProgress(Math.min(i + batchSize, symbols.length), symbols.length);
    }

    // Delay before next batch (except for last batch)
    if (i + batchSize < symbols.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  logger.info(`[OI] Batch fetch complete: ${results.size}/${symbols.length} successful`);

  // Store current OI snapshot
  storeCurrentOI(results);

  return results;
};

/**
 * Store current OI data to localStorage
 * @param oiData - Map of symbol -> OI data
 */
export const storeCurrentOI = (oiData: Map<string, StockOIData>): void => {
  try {
    const today = getTodayKey();

    // Convert Map to plain object
    const dataObj: Record<string, StoredOIData> = {};
    oiData.forEach((value, key) => {
      dataObj[key] = {
        totalCallOI: value.totalCallOI,
        totalPutOI: value.totalPutOI,
        pcr: value.pcr,
        timestamp: value.timestamp,
      };
    });

    // Store current day's data
    setJSON(OI_CURRENT_KEY, {
      date: today,
      data: dataObj,
    });

    // Also update history (keep last 5 days)
    const history = getJSON<Record<string, Record<string, StoredOIData>>>(OI_HISTORY_KEY, {});
    history[today] = dataObj;

    // Keep only last 5 days
    const dates = Object.keys(history).sort();
    if (dates.length > 5) {
      dates.slice(0, dates.length - 5).forEach((d) => delete history[d]);
    }

    setJSON(OI_HISTORY_KEY, history);
    logger.debug(`[OI] Stored OI snapshot for ${today}: ${oiData.size} symbols`);
  } catch (error) {
    logger.error('[OI] Error storing OI:', error);
  }
};

/**
 * Get previous day's OI data for a symbol
 * @param symbol - Stock symbol
 * @returns Previous OI data or null
 */
export const getPreviousOI = (symbol: string): StoredOIData | null => {
  try {
    const history = getJSON<Record<string, Record<string, StoredOIData>> | null>(
      OI_HISTORY_KEY,
      null
    );
    if (!history) return null;

    // Try previous day first, then any earlier date
    const dates = Object.keys(history).sort().reverse();
    const today = getTodayKey();

    for (const date of dates) {
      if (date < today && history[date] && history[date][symbol]) {
        return history[date][symbol];
      }
    }

    return null;
  } catch (error) {
    logger.error('[OI] Error getting previous OI:', error);
    return null;
  }
};

/**
 * Calculate PCR change percentage
 * @param currentPcr - Current PCR
 * @param previousPcr - Previous day's PCR
 * @returns PCR change percentage
 */
export const calculatePcrChange = (currentPcr: number, previousPcr: number): number => {
  if (!previousPcr || previousPcr === 0) return 0;
  return ((currentPcr - previousPcr) / previousPcr) * 100;
};

/**
 * Get OI momentum signal based on price change and PCR
 * @param priceChange - Price change percentage
 * @param pcr - Current Put/Call Ratio
 * @param previousPcr - Previous day's PCR (optional)
 * @returns Momentum signal
 */
export const getOIMomentumSignal = (
  priceChange: number,
  pcr: number,
  previousPcr: number | null = null
): OIMomentumSignal => {
  const isPriceUp = priceChange > 0.1;
  const isPriceDown = priceChange < -0.1;

  // If we have previous PCR, use PCR change for signal
  // If not, use absolute PCR level (>1 = bearish, <1 = bullish)
  let isBullishOI: boolean, isBearishOI: boolean;

  if (previousPcr !== null && previousPcr > 0) {
    const pcrChange = calculatePcrChange(pcr, previousPcr);
    // PCR decreasing = more calls = bullish sentiment
    // PCR increasing = more puts = bearish sentiment
    isBullishOI = pcrChange < -5; // PCR dropped by 5%+
    isBearishOI = pcrChange > 5; // PCR increased by 5%+
  } else {
    // Use absolute PCR level
    isBullishOI = pcr < 0.8; // More calls than puts
    isBearishOI = pcr > 1.2; // More puts than calls
  }

  // Neutral case
  if (!isPriceUp && !isPriceDown) {
    return {
      signal: 'neutral',
      strength: 'none',
      description: 'Consolidation',
      shortDesc: 'Range',
      color: '#787b86',
    };
  }

  // OI Methodology:
  // Price up + Bullish OI (calls increasing) = Long Buildup
  // Price down + Bearish OI (puts increasing) = Short Buildup
  // Price up + Bearish OI = Short Covering
  // Price down + Bullish OI = Long Unwinding

  if (isPriceUp && isBullishOI) {
    return {
      signal: 'long_buildup',
      strength: 'strong',
      description: 'Long Buildup',
      shortDesc: 'LB',
      color: '#00c853',
    };
  }

  if (isPriceDown && isBearishOI) {
    return {
      signal: 'short_buildup',
      strength: 'strong',
      description: 'Short Buildup',
      shortDesc: 'SB',
      color: '#ff1744',
    };
  }

  if (isPriceUp && !isBullishOI) {
    return {
      signal: 'short_covering',
      strength: 'weak',
      description: 'Short Covering',
      shortDesc: 'SC',
      color: '#69f0ae',
    };
  }

  if (isPriceDown && !isBearishOI) {
    return {
      signal: 'long_unwinding',
      strength: 'weak',
      description: 'Long Unwinding',
      shortDesc: 'LU',
      color: '#ff8a80',
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

/**
 * Clear OI cache
 */
export const clearOICache = (): void => {
  oiCache.clear();
  logger.info('[OI] Cache cleared');
};

/**
 * Get all cached OI data
 * @returns Map of valid cached data
 */
export const getCachedOI = (): Map<string, StockOIData> => {
  const validCache = new Map<string, StockOIData>();
  const now = Date.now();

  oiCache.forEach((entry, key) => {
    if (now - entry.timestamp < CACHE_DURATION_MS) {
      validCache.set(key, entry.data);
    }
  });

  return validCache;
};

export default {
  fetchStockOI,
  batchFetchOI,
  storeCurrentOI,
  getPreviousOI,
  calculatePcrChange,
  getOIMomentumSignal,
  formatOI,
  clearOICache,
  getCachedOI,
};

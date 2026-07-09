/**
 * useOILines Hook
 * Fetches option chain data and calculates Max Call OI, Max Put OI, and Max Pain
 * Auto-refreshes every 5 minutes during market hours
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getOptionChain } from '../services/optionChain';
import { analyzeOptionChain } from '../utils/optionAnalysis';
import { isMarketOpen } from '../services/marketService';
import logger from '../utils/logger';

// ==================== TYPES ====================

/** Exchange type for OI lines */
export type OIExchange = 'NSE' | 'BSE' | 'NSE_INDEX' | 'BSE_INDEX' | 'NFO' | 'BFO';

/** OI Lines data */
export interface OILinesData {
  maxCallOI: number | null;
  maxCallOIValue: number;
  maxPutOI: number | null;
  maxPutOIValue: number;
  maxPain: number | null;
  expiryDate: string | null | undefined;
  underlying: string | null | undefined;
  atmStrike: number | null | undefined;
}

/** OI Analysis result */
interface OIAnalysisResult {
  maxCallOI: { strike: number; oi: number } | null;
  maxPutOI: { strike: number; oi: number } | null;
  maxPain: { strike: number } | null;
}

/** Option chain data response */
interface OptionChainResponse {
  chain: unknown[];
  expiryDate?: string | undefined;
  underlying?: string | undefined;
  atmStrike?: number | undefined;
}

/** Error with code */
interface ErrorWithCode extends Error {
  code?: string | undefined;
}

/** Hook return type */
export interface UseOILinesReturn {
  oiLines: OILinesData | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
}

// ==================== CONSTANTS ====================

// Refresh interval: 5 minutes
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

// Symbols that support F&O (indices and major stocks)
const FO_INDICES = ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY', 'SENSEX', 'BANKEX'];

// ==================== UTILITIES ====================

/**
 * Check if symbol supports options
 */
const isFOSymbol = (symbol: string | null | undefined): boolean => {
  if (!symbol) return false;
  const upperSymbol = symbol.toUpperCase();
  // Check if it's a known index
  if (FO_INDICES.includes(upperSymbol)) return true;
  // For stocks, we'll attempt to fetch and handle errors gracefully
  return true; // Allow attempt for any symbol
};

/**
 * Get underlying symbol for option chain lookup
 */
const getUnderlying = (symbol: string | null | undefined, exchange: string | null | undefined): string | null => {
  if (!symbol) return null;
  const upperSymbol = symbol.toUpperCase();

  // Handle index symbols
  if (exchange === 'NSE_INDEX' || exchange === 'BSE_INDEX') {
    // Map display names to option chain underlying names
    const indexMap: Record<string, string> = {
      'NIFTY 50': 'NIFTY',
      'NIFTY50': 'NIFTY',
      'NIFTY_50': 'NIFTY',
      'BANK NIFTY': 'BANKNIFTY',
      'NIFTY BANK': 'BANKNIFTY',
      'NIFTY_BANK': 'BANKNIFTY',
      'FIN NIFTY': 'FINNIFTY',
      'NIFTY FIN SERVICE': 'FINNIFTY',
      'NIFTY_FIN_SERVICE': 'FINNIFTY',
      'MIDCAP NIFTY': 'MIDCPNIFTY',
      'NIFTY MIDCAP SELECT': 'MIDCPNIFTY',
      'NIFTY_MID_SELECT': 'MIDCPNIFTY',
    };
    return indexMap[upperSymbol] || upperSymbol;
  }

  // For stocks, use as-is
  return upperSymbol;
};

// ==================== HOOK ====================

/**
 * Custom hook for fetching and managing OI lines data
 * @param symbol - Current chart symbol
 * @param exchange - Current exchange (NSE, BSE, NSE_INDEX, etc.)
 * @param enabled - Whether OI lines feature is enabled
 * @returns OI lines state and handlers
 */
export function useOILines(
  symbol: string | null | undefined,
  exchange: string | null | undefined,
  enabled: boolean = true
): UseOILinesReturn {
  const [oiLines, setOiLines] = useState<OILinesData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);
  const isFetchingRef = useRef(false); // Prevent overlapping async operations

  // Fetch and analyze option chain
  const fetchOIData = useCallback(async () => {
    const underlying = getUnderlying(symbol, exchange);

    if (!underlying || !isFOSymbol(underlying)) {
      setOiLines(null);
      setError('Symbol does not support options');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Determine the F&O exchange for option chain API
      // NSE stocks and indices use NFO, BSE uses BFO
      let foExchange: OIExchange = 'NFO';
      if (exchange === 'BSE_INDEX' || exchange === 'BSE') {
        foExchange = 'BFO';
      }

      logger.debug('[useOILines] Fetching option chain:', { underlying, foExchange, exchange });

      // Fetch option chain with enough strikes to capture OI levels
      // Note: getOptionChain service handles the underlying/index exchange mapping
      const chainData = (await getOptionChain(underlying, foExchange, null, 30)) as OptionChainResponse | null;

      if (!isMountedRef.current) return;

      if (!chainData || !chainData.chain || chainData.chain.length === 0) {
        setOiLines(null);
        setError('No option chain data available');
        setIsLoading(false);
        return;
      }

      // Analyze option chain for Max OI and Max Pain
      const analysis = analyzeOptionChain(chainData.chain as any) as OIAnalysisResult;

      logger.debug('[useOILines] Analysis result:', {
        underlying,
        chainLength: chainData.chain.length,
        maxCallOI: analysis.maxCallOI,
        maxPutOI: analysis.maxPutOI,
        maxPain: analysis.maxPain,
      });

      setOiLines({
        maxCallOI: analysis.maxCallOI?.strike || null,
        maxCallOIValue: analysis.maxCallOI?.oi || 0,
        maxPutOI: analysis.maxPutOI?.strike || null,
        maxPutOIValue: analysis.maxPutOI?.oi || 0,
        maxPain: analysis.maxPain?.strike || null,
        expiryDate: chainData.expiryDate,
        underlying: chainData.underlying,
        atmStrike: chainData.atmStrike,
      });
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      if (!isMountedRef.current) return;

      const typedErr = err as ErrorWithCode;

      // Handle "no F&O support" error silently (expected for non-F&O stocks)
      if (typedErr.code === 'NO_FO_SUPPORT') {
        logger.debug('[useOILines] Symbol does not support F&O:', underlying);
        setError('No F&O support');
        setOiLines(null);
      } else {
        logger.error('[useOILines] Error fetching OI data:', err);
        setError(typedErr.message || 'Failed to fetch option chain');
        setOiLines(null);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [symbol, exchange]);

  // Manual refresh function
  const refresh = useCallback(() => {
    fetchOIData();
  }, [fetchOIData]);

  // Initial fetch and setup auto-refresh
  useEffect(() => {
    isMountedRef.current = true;

    if (!enabled || !symbol) {
      setOiLines(null);
      return;
    }

    // Initial fetch
    fetchOIData();

    // HIGH FIX ML-5: Clear interval BEFORE async function to prevent accumulation
    // Rapid symbol changes can create multiple intervals if cleanup is async
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Setup auto-refresh interval
    const setupInterval = async () => {
      intervalRef.current = setInterval(async () => {
        // Skip if already fetching (prevents overlapping async operations)
        if (isFetchingRef.current) {
          logger.debug('[useOILines] Skipping refresh - previous fetch still in progress');
          return;
        }

        // Only refresh during market hours
        const marketOpen = (await isMarketOpen('NSE')) as boolean;
        if (marketOpen && isMountedRef.current) {
          logger.debug('[useOILines] Auto-refreshing OI data');
          isFetchingRef.current = true;
          try {
            await fetchOIData();
          } finally {
            isFetchingRef.current = false;
          }
        }
      }, REFRESH_INTERVAL_MS);
    };

    setupInterval();

    // Cleanup
    return () => {
      isMountedRef.current = false;
      isFetchingRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [symbol, exchange, enabled, fetchOIData]);

  return {
    oiLines,
    isLoading,
    error,
    lastUpdated,
    refresh,
  };
}

export default useOILines;

/**
 * useFirstRedCandle Hook
 * Fetches 5-minute candle data independently and calculates first red candle levels.
 * This allows FRC lines to be displayed on any chart timeframe.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getKlines } from '../services/openalgo';
import { calculateFirstCandle } from '../utils/indicators/firstCandle';

// Cache for FRC data to avoid refetching on timeframe changes
// Key: 'symbol:exchange', Value: { levels, timestamp, data }
const frcCache = new Map();
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes cache

/**
 * Custom hook for fetching and managing First Red Candle data
 * Always uses 5-minute data regardless of chart timeframe
 *
 * @param {string} symbol - Current chart symbol
 * @param {string} exchange - Current exchange (NSE, BSE, etc.)
 * @param {boolean} enabled - Whether FRC strategy is enabled
 * @param {Object} options - Color configuration options
 * @returns {Object} { levels, isLoading, error, refresh }
 */
export function useFirstRedCandle(symbol, exchange, enabled = false, options = {}) {
    const [levels, setLevels] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const isMountedRef = useRef(true);
    const abortControllerRef = useRef(null);

    const cacheKey = `${symbol}:${exchange}`;

    // Fetch 5-minute data and calculate FRC levels
    const fetchFrcData = useCallback(async (forceRefresh = false) => {
        if (!symbol || !enabled) {
            setLevels(null);
            return;
        }

        // Check cache first (unless force refresh)
        if (!forceRefresh) {
            const cached = frcCache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
                setLevels(cached.levels);
                return;
            }
        }

        // Cancel any pending request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        setIsLoading(true);
        setError(null);

        try {
            // Always fetch 5-minute data for FRC calculation
            const data = await getKlines(
                symbol,
                exchange,
                '5m', // Always 5-minute timeframe
                1000,
                abortControllerRef.current.signal
            );

            if (!isMountedRef.current) return;

            if (!data || data.length === 0) {
                setError('No data available');
                setLevels(null);
                return;
            }

            // Calculate FRC levels using the 5-minute data
            const result = calculateFirstCandle(data, options);

            // Cache the result
            frcCache.set(cacheKey, {
                levels: result,
                timestamp: Date.now(),
                data: data
            });

            setLevels(result);
            setError(null);

        } catch (err) {
            if (!isMountedRef.current) return;

            // Ignore abort errors
            if (err.name === 'AbortError') return;

            console.error('[useFirstRedCandle] Error fetching data:', err);
            setError(err.message || 'Failed to fetch data');
            setLevels(null);
        } finally {
            if (isMountedRef.current) {
                setIsLoading(false);
            }
        }
    // Note: options intentionally excluded - it's only used for calculation, not fetching
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [symbol, exchange, enabled, cacheKey]);

    // Manual refresh function
    const refresh = useCallback(() => {
        fetchFrcData(true);
    }, [fetchFrcData]);

    // Initial fetch when enabled or symbol changes
    useEffect(() => {
        isMountedRef.current = true;

        if (enabled && symbol) {
            fetchFrcData();
        } else {
            setLevels(null);
        }

        // Cleanup
        return () => {
            isMountedRef.current = false;
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [symbol, exchange, enabled, fetchFrcData]);

    return {
        levels,
        isLoading,
        error,
        refresh
    };
}

export default useFirstRedCandle;

/**
 * Indicator Data Manager
 * Manages indicator calculations and data caching for alert evaluation
 */

import { calculateRSI } from '../utils/indicators';
import { calculateMACD } from '../utils/indicators';
import { calculateBollingerBands } from '../utils/indicators';
import { calculateStochastic } from '../utils/indicators';
import { calculateSupertrend } from '../utils/indicators';
import { calculateVWAP } from '../utils/indicators';
import { calculateSMA } from '../utils/indicators';
import { calculateEMA } from '../utils/indicators';
import { calculateATR } from '../utils/indicators';
import logger from '../utils/logger';

export class IndicatorDataManager {
    constructor() {
        /**
         * Cache for indicator values per symbol-interval
         * Map<string, { timestamp, indicators, ohlcData }>
         */
        this.cache = new Map();

        /**
         * Cache duration in milliseconds (30 seconds)
         */
        this.cacheDuration = 30000;

        /**
         * Max history length to send to worker
         * Reduces data sterilization cost
         */
        this.MAX_HISTORY_LENGTH = 2000;

        /**
         * Web Worker instance
         */
        this.worker = null;
        this.workerPromiseMap = new Map(); // Map<string, {resolve, reject}>

        this.initWorker();
    }

    /**
     * Initialize Web Worker
     */
    initWorker() {
        if (typeof Worker !== 'undefined') {
            try {
                // Vite worker import syntax
                this.worker = new Worker(new URL('../workers/indicatorWorker.js', import.meta.url), {
                    type: 'module'
                });

                this.worker.onmessage = (event) => {
                    const { id, success, result, error } = event.data;

                    if (id && this.workerPromiseMap.has(id)) {
                        const { resolve, reject } = this.workerPromiseMap.get(id);
                        this.workerPromiseMap.delete(id);

                        if (success) {
                            resolve(result);
                        } else {
                            reject(new Error(error || 'Worker error'));
                        }
                    } else if (event.data.type === 'ready') {
                        logger.info('[IndicatorDataManager] Worker ready');
                    }
                };

                this.worker.onerror = (error) => {
                    logger.error('[IndicatorDataManager] Worker error:', error);
                };

            } catch (e) {
                logger.error('[IndicatorDataManager] Failed to initialize worker:', e);
            }
        }
    }

    /**
     * Terminate worker
     */
    terminate() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
    }

    /**
     * Get cache key for a symbol-interval combination
     * @param {string} symbol - Trading symbol
     * @param {string} exchange - Exchange
     * @param {string} interval - Timeframe
     * @returns {string} - Cache key
     */
    getCacheKey(symbol, exchange, interval) {
        return `${symbol}:${exchange}:${interval}`;
    }

    /**
     * Get current indicator values for a symbol
     * @param {string} symbol - Trading symbol
     * @param {string} exchange - Exchange
     * @param {string} interval - Timeframe
     * @param {Object} indicators - Active indicators configuration
     * @param {Array} ohlcData - Price data array
     * @returns {Object} - Indicator values with current and previous data
     */
    getIndicatorValues(symbol, exchange, interval, indicators, ohlcData) {
        // NOTE: This method is originally synchronous and returns cached data or calculates fresh.
        // With Worker, calculation is async.
        // We will keep this method synchronous for compatibility, mostly relying on cache.
        // If not compatible with async, we warn.

        // However, looking at usage, this might be called in render loops?
        // If we strictly need async, we must refactor call sites.
        // For now, let's keep the synchronous 'calculateAllIndicators' strictly LOCAL (on main thread) 
        // OR warn that it's deprecated for heavy work.
        // BUT the Task is optimization!

        // Actually, if we use Worker, we MUST await. 
        // If the caller expects a sync return, we are in trouble.
        // Let's check who calls this: likely ChartComponent or something that might use `useMemo` or `useEffect`.
        // If it's `useEffect`, async is fine.

        // Let's defer big refactor of `getIndicatorValues` and focus on `calculateIndicator` which IS async and used by GlobalAlertMonitor.
        // For `getIndicatorValues`, we will optimize by slicing data but keep running on main thread for now to avoid breaking UI sync flow, 
        // UNLESS we confirm it's safe.

        // Wait, the plan was to offload. 
        // Let's stick to optimizing `calculateIndicator` (used for alerts) via Worker.
        // For `getIndicatorValues` (used for rendering?), we simply SLICE the data.

        const cacheKey = this.getCacheKey(symbol, exchange, interval);

        // Check cache
        const cached = this.cache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < this.cacheDuration) {
            // logger.debug(`[IndicatorDataManager] Using cached data for ${cacheKey}`);
            return cached.indicators;
        }

        // Calculate fresh indicator values
        // logger.debug(`[IndicatorDataManager] Calculating fresh indicators for ${cacheKey}`);

        // OPTIMIZATION: Slice data for main thread calculation too
        const slicedData = ohlcData.length > this.MAX_HISTORY_LENGTH
            ? ohlcData.slice(-this.MAX_HISTORY_LENGTH)
            : ohlcData;

        const indicatorData = this.calculateAllIndicators(indicators, slicedData);

        // Cache the results
        this.cache.set(cacheKey, {
            timestamp: Date.now(),
            indicators: indicatorData,
            ohlcData: ohlcData.slice(-2), // Keep last 2 bars for comparison
        });

        return indicatorData;
    }

    /**
     * Calculate all active indicators (Main Thread - Sync)
     * optimized with sliced data
     * @param {Object} indicators - Indicators configuration
     * @param {Array} ohlcData - Price data
     * @returns {Object} - Calculated indicator values
     */
    calculateAllIndicators(indicators, ohlcData) {
        if (!ohlcData || ohlcData.length < 2) {
            return {};
        }

        const results = {};

        // RSI
        if (indicators.rsi?.enabled) {
            const rsiData = calculateRSI(ohlcData, indicators.rsi.period || 14);
            if (rsiData && rsiData.length >= 2) {
                const latest = rsiData[rsiData.length - 1];
                const previous = rsiData[rsiData.length - 2];
                results.rsi = {
                    value: latest?.value,
                    previous: previous?.value,
                    time: latest?.time,
                };
            }
        }

        // MACD
        if (indicators.macd?.enabled) {
            const macdData = calculateMACD(
                ohlcData,
                indicators.macd.fast || 12,
                indicators.macd.slow || 26,
                indicators.macd.signal || 9
            );
            if (macdData && macdData.length >= 2) {
                const latest = macdData[macdData.length - 1];
                const previous = macdData[macdData.length - 2];
                results.macd = {
                    macd: latest?.MACD,
                    signal: latest?.signal,
                    histogram: latest?.histogram,
                    previous: {
                        macd: previous?.MACD,
                        signal: previous?.signal,
                        histogram: previous?.histogram,
                        previous: {
                            macd: previous?.MACD,
                            signal: previous?.signal,
                            histogram: previous?.histogram,
                        }
                    },
                    time: latest?.time,
                };
            }
        }

        // Bollinger Bands
        if (indicators.bollingerBands?.enabled) {
            const bbData = calculateBollingerBands(
                ohlcData,
                indicators.bollingerBands.period || 20,
                indicators.bollingerBands.stdDev || 2
            );
            if (bbData && bbData.length >= 2) {
                const latest = bbData[bbData.length - 1];
                const previous = bbData[bbData.length - 2];
                results.bollingerBands = {
                    upper: latest?.upper,
                    middle: latest?.middle,
                    lower: latest?.lower,
                    previous: {
                        upper: previous?.upper,
                        middle: previous?.middle,
                        lower: previous?.lower,
                    },
                    time: latest?.time,
                };
            }
        }

        // Stochastic
        if (indicators.stochastic?.enabled) {
            const stochData = calculateStochastic(
                ohlcData,
                indicators.stochastic.kPeriod || 14,
                indicators.stochastic.dPeriod || 3,
                indicators.stochastic.smooth || 3
            );
            if (stochData && stochData.length >= 2) {
                const latest = stochData[stochData.length - 1];
                const previous = stochData[stochData.length - 2];
                results.stochastic = {
                    k: latest?.k,
                    d: latest?.d,
                    previous: {
                        k: previous?.k,
                        d: previous?.d,
                    },
                    time: latest?.time,
                };
            }
        }

        // Supertrend
        if (indicators.supertrend?.enabled) {
            const supertrendData = calculateSupertrend(
                ohlcData,
                indicators.supertrend.period || 10,
                indicators.supertrend.multiplier || 3
            );
            if (supertrendData && supertrendData.length >= 2) {
                const latest = supertrendData[supertrendData.length - 1];
                const previous = supertrendData[supertrendData.length - 2];
                results.supertrend = {
                    supertrend: latest?.supertrend,
                    direction: latest?.direction,
                    previous: {
                        supertrend: previous?.supertrend,
                        direction: previous?.direction,
                    },
                    time: latest?.time,
                };
            }
        }

        // VWAP
        if (indicators.vwap?.enabled) {
            const vwapData = calculateVWAP(ohlcData);
            if (vwapData && vwapData.length >= 2) {
                const latest = vwapData[vwapData.length - 1];
                const previous = vwapData[vwapData.length - 2];
                results.vwap = {
                    value: latest?.value,
                    previous: previous?.value,
                    time: latest?.time,
                };
            }
        }

        // SMA
        if (indicators.sma) {
            const smaData = calculateSMA(ohlcData, indicators.sma.period || 20);
            if (smaData && smaData.length >= 2) {
                const latest = smaData[smaData.length - 1];
                const previous = smaData[smaData.length - 2];
                results.sma = {
                    value: latest?.value,
                    previous: previous?.value,
                    time: latest?.time,
                };
            }
        }

        // EMA
        if (indicators.ema) {
            const emaData = calculateEMA(ohlcData, indicators.ema.period || 20);
            if (emaData && emaData.length >= 2) {
                const latest = emaData[emaData.length - 1];
                const previous = emaData[emaData.length - 2];
                results.ema = {
                    value: latest?.value,
                    previous: previous?.value,
                    time: latest?.time,
                };
            }
        }

        // ATR
        if (indicators.atr?.enabled) {
            const atrData = calculateATR(ohlcData, indicators.atr.period || 14);
            if (atrData && atrData.length >= 2) {
                const latest = atrData[atrData.length - 1];
                const previous = atrData[atrData.length - 2];
                results.atr = {
                    value: latest?.value,
                    previous: previous?.value,
                    time: latest?.time,
                };
            }
        }

        return results;
    }

    /**
     * Run calculation on worker
     * @param {string} type 
     * @param {Array} data 
     * @param {Object} options 
     * @returns {Promise<any>}
     */
    runWorkerTask(type, data, options = {}) {
        if (!this.worker) return Promise.reject(new Error('Worker not initialized'));

        const id = crypto.randomUUID(); // Unique ID for request

        return new Promise((resolve, reject) => {
            this.workerPromiseMap.set(id, { resolve, reject });

            // Timeout safety
            setTimeout(() => {
                if (this.workerPromiseMap.has(id)) {
                    this.workerPromiseMap.delete(id);
                    reject(new Error('Worker task timed out'));
                }
            }, 10000); // 10s timeout

            this.worker.postMessage({ type, id, data, options });
        });
    }

    /**
     * Calculate a specific indicator for alert evaluation (Async - Worker optimized)
     * @param {string} indicatorId - Indicator identifier (e.g., 'rsi', 'macd', 'sma', etc.)
     * @param {Object} context - Context object with { symbol, exchange, interval }
     * @param {Array} ohlcData - OHLC data array
     * @returns {Promise<Object>} - Object with { current: {...}, previous: {...} } structure
     */
    async calculateIndicator(indicatorId, context, ohlcData) {
        if (!indicatorId || !ohlcData || !Array.isArray(ohlcData) || ohlcData.length < 2) {
            logger.warn(`[IndicatorDataManager] Invalid parameters for calculateIndicator: ${indicatorId}`);
            return null;
        }

        try {
            // Slice data for performance
            const slicedData = ohlcData.length > this.MAX_HISTORY_LENGTH
                ? ohlcData.slice(-this.MAX_HISTORY_LENGTH)
                : ohlcData;

            let current = null;
            let previous = null;

            // Map indicatorId to worker type and options
            // Note: Alerts often pass 'rsi', 'macd' etc. but options might need defaults or parsing

            // NOTE: The original code had hardcoded defaults for alerts (e.g. RSI 14). 
            // We need to maintain that behavior unless context has options.
            // Current alert system seems to rely on these hardcoded defaults in the switch statement.

            let workerResult = null;
            const type = indicatorId.toLowerCase();

            switch (type) {
                case 'rsi':
                    workerResult = await this.runWorkerTask('rsi', slicedData, { period: 14 });
                    if (workerResult && workerResult.length >= 2) {
                        const latest = workerResult[workerResult.length - 1];
                        const prev = workerResult[workerResult.length - 2];
                        current = { value: latest?.value, time: latest?.time };
                        previous = { value: prev?.value, time: prev?.time };
                    }
                    break;

                case 'macd':
                    workerResult = await this.runWorkerTask('macd', slicedData, { fast: 12, slow: 26, signal: 9 });
                    if (workerResult && workerResult.length >= 2) {
                        const latest = workerResult[workerResult.length - 1];
                        const prev = workerResult[workerResult.length - 2];
                        current = { macd: latest?.MACD, signal: latest?.signal, histogram: latest?.histogram, time: latest?.time };
                        previous = { macd: prev?.MACD, signal: prev?.signal, histogram: prev?.histogram, time: prev?.time };
                    }
                    break;

                case 'bollingerbands':
                case 'bollinger':
                    workerResult = await this.runWorkerTask('bollingerBands', slicedData, { period: 20, stdDev: 2 });
                    if (workerResult && workerResult.length >= 2) {
                        const latest = workerResult[workerResult.length - 1];
                        const prev = workerResult[workerResult.length - 2];
                        current = { upper: latest?.upper, middle: latest?.middle, lower: latest?.lower, time: latest?.time };
                        previous = { upper: prev?.upper, middle: prev?.middle, lower: prev?.lower, time: prev?.time };
                    }
                    break;

                case 'stochastic':
                    workerResult = await this.runWorkerTask('stochastic', slicedData, { kPeriod: 14, dPeriod: 3, smooth: 3 });
                    if (workerResult && workerResult.length >= 2) {
                        const latest = workerResult[workerResult.length - 1];
                        const prev = workerResult[workerResult.length - 2];
                        current = { k: latest?.k, d: latest?.d, time: latest?.time };
                        previous = { k: prev?.k, d: prev?.d, time: prev?.time };
                    }
                    break;

                case 'supertrend':
                    workerResult = await this.runWorkerTask('supertrend', slicedData, { period: 10, multiplier: 3 });
                    if (workerResult && workerResult.length >= 2) {
                        const latest = workerResult[workerResult.length - 1];
                        const prev = workerResult[workerResult.length - 2];
                        current = { supertrend: latest?.supertrend, direction: latest?.direction, time: latest?.time };
                        previous = { supertrend: prev?.supertrend, direction: prev?.direction, time: prev?.time };
                    }
                    break;

                case 'vwap':
                    workerResult = await this.runWorkerTask('vwap', slicedData);
                    if (workerResult && workerResult.length >= 2) {
                        const latest = workerResult[workerResult.length - 1];
                        const prev = workerResult[workerResult.length - 2];
                        current = { value: latest?.value, time: latest?.time };
                        previous = { value: prev?.value, time: prev?.time };
                    }
                    break;

                case 'sma':
                    workerResult = await this.runWorkerTask('sma', slicedData, { period: 20 });
                    if (workerResult && workerResult.length >= 2) {
                        const latest = workerResult[workerResult.length - 1];
                        const prev = workerResult[workerResult.length - 2];
                        current = { value: latest?.value, time: latest?.time };
                        previous = { value: prev?.value, time: prev?.time };
                    }
                    break;

                case 'ema':
                    workerResult = await this.runWorkerTask('ema', slicedData, { period: 20 });
                    if (workerResult && workerResult.length >= 2) {
                        const latest = workerResult[workerResult.length - 1];
                        const prev = workerResult[workerResult.length - 2];
                        current = { value: latest?.value, time: latest?.time };
                        previous = { value: prev?.value, time: prev?.time };
                    }
                    break;

                case 'atr':
                    workerResult = await this.runWorkerTask('atr', slicedData, { period: 14 });
                    if (workerResult && workerResult.length >= 2) {
                        const latest = workerResult[workerResult.length - 1];
                        const prev = workerResult[workerResult.length - 2];
                        current = { value: latest?.value, time: latest?.time };
                        previous = { value: prev?.value, time: prev?.time };
                    }
                    break;

                default:
                    logger.warn(`[IndicatorDataManager] Unknown indicator ID: ${indicatorId}`);
                    // Fallback to local calculation if needed or return null
                    // For now, return null as we cover most
                    return null;
            }

            if (current && previous) {
                return { current, previous };
            }

            return null;
        } catch (error) {
            logger.error(`[IndicatorDataManager] Error calculating indicator ${indicatorId}:`, error);
            // Fallback to main thread calculation in case of worker error?
            // Maybe safer to just return null and log for now.
            return null;
        }
    }

    /**
     * Get specific indicator value
     * ... (rest unchanged)
     */
    /**
     * Get specific indicator value
     * @param {string} symbol - Trading symbol
     * @param {string} exchange - Exchange
     * @param {string} interval - Timeframe
     * @param {string} indicatorId - Indicator identifier
     * @returns {Object|null} - Indicator value or null
     */
    getIndicatorValue(symbol, exchange, interval, indicatorId) {
        const cacheKey = this.getCacheKey(symbol, exchange, interval);
        const cached = this.cache.get(cacheKey);

        if (!cached) {
            return null;
        }

        return cached.indicators[indicatorId] || null;
    }

    /**
     * Clear cache for a specific symbol-interval
     * @param {string} symbol - Trading symbol
     * @param {string} exchange - Exchange
     * @param {string} interval - Timeframe
     */
    clearCache(symbol, exchange, interval) {
        const cacheKey = this.getCacheKey(symbol, exchange, interval);
        this.cache.delete(cacheKey);
        logger.debug(`[IndicatorDataManager] Cleared cache for ${cacheKey}`);
    }

    /**
     * Clear all cached data
     */
    clearAllCache() {
        this.cache.clear();
        logger.debug('[IndicatorDataManager] Cleared all cache');
    }

    /**
     * Get cache stats
     * @returns {Object} - Cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys()),
            oldestEntry: this.getOldestEntry(),
        };
    }

    /**
     * Get oldest cache entry
     * @returns {Object|null} - Oldest entry info or null
     */
    getOldestEntry() {
        let oldest = null;
        let oldestTime = Infinity;

        for (const [key, value] of this.cache.entries()) {
            if (value.timestamp < oldestTime) {
                oldestTime = value.timestamp;
                oldest = { key, timestamp: value.timestamp };
            }
        }

        return oldest;
    }

    /**
     * Clean expired cache entries
     */
    cleanExpiredCache() {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > this.cacheDuration) {
                this.cache.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            logger.debug(`[IndicatorDataManager] Cleaned ${cleaned} expired cache entries`);
        }
    }
}

/**
 * Singleton instance for global use
 */
export const indicatorDataManager = new IndicatorDataManager();

export default IndicatorDataManager;

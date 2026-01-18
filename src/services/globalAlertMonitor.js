/**
 * Global Alert Monitor Service
 * 
 * Monitors prices for all symbols with active alerts in the background.
 * Uses WebSocket subscription to get real-time price updates.
 * Triggers callbacks when price crosses alert thresholds.
 */

import { subscribeToMultiTicker } from './openalgo';
import logger from '../utils/logger';
import { IndicatorDataManager } from './indicatorDataManager';
import { AlertEvaluator } from '../utils/alerts/alertEvaluator';

// Must match ChartComponent.jsx storage key
const ALERT_STORAGE_KEY = 'tv_chart_alerts';
const APP_ALERT_STORAGE_KEY = 'tv_alerts'; // App.jsx indicator alerts
const ALERT_RETENTION_MS = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_REFRESH_INTERVAL_MS = 5000; // Refresh alert cache every 5 seconds

/**
 * @typedef {Object} StoredAlert
 * @property {string} id - Unique alert ID
 * @property {string} symbol - Trading symbol
 * @property {string} exchange - Exchange code
 * @property {number} price - Alert price level
 * @property {string} condition - 'crossing' | 'crossing_up' | 'crossing_down'
 * @property {number} createdAt - Timestamp when alert was created
 * @property {string} [status] - 'active' | 'triggered'
 */

/**
 * @typedef {Object} AlertTriggerEvent
 * @property {string} alertId
 * @property {string} symbol
 * @property {string} exchange
 * @property {number} alertPrice
 * @property {number} currentPrice
 * @property {string} direction - 'up' | 'down'
 * @property {string} condition
 * @property {number} timestamp
 */

class GlobalAlertMonitor {
    constructor() {
        /** @type {Map<string, number>} symbol-exchange -> last price */
        this._lastPrices = new Map();

        /** @type {Map<string, 'above'|'below'|'unknown'>} alertId -> position */
        this._alertPositions = new Map();

        /** @type {any} WebSocket connection */
        this._ws = null;

        /** @type {function|null} Callback for trigger events */
        this._onTrigger = null;

        /** @type {boolean} */
        this._isRunning = false;

        /** @type {IndicatorDataManager} Indicator calculations */
        this._indicatorDataManager = new IndicatorDataManager();

        /** @type {AlertEvaluator} Alert condition evaluator */
        this._alertEvaluator = new AlertEvaluator();

        /** @type {Map<string, Array>} OHLC data cache per symbol-interval */
        this._ohlcCache = new Map();

        /** @type {Map<string, Object>} Previous bar indicator values */
        this._previousIndicatorValues = new Map();

        /** @type {StoredAlert[]} Cached alerts - refreshed periodically */
        this._cachedAlerts = [];

        /** @type {number} Last time alerts were loaded from localStorage */
        this._lastCacheRefresh = 0;

        /** @type {number|null} Cache refresh interval ID */
        this._cacheRefreshIntervalId = null;

        // Listen for storage changes from other tabs
        this._handleStorageChange = this._handleStorageChange.bind(this);
        if (typeof window !== 'undefined') {
            window.addEventListener('storage', this._handleStorageChange);
        }
    }

    /**
     * Handle storage changes from other tabs
     * @param {StorageEvent} event
     */
    _handleStorageChange(event) {
        if (event.key === ALERT_STORAGE_KEY || event.key === APP_ALERT_STORAGE_KEY) {
            logger.debug('[GlobalAlertMonitor] Storage changed in another tab, refreshing cache');
            this._refreshAlertCache();
        }
    }

    /**
     * Get unique symbol key for tracking
     * @param {string} symbol 
     * @param {string} exchange 
     */
    _getSymbolKey(symbol, exchange) {
        return `${symbol}:${exchange}`;
    }

    /**
     * Load all alerts from localStorage (both price and indicator alerts)
     * @returns {StoredAlert[]}
     */
    _loadAlertsFromStorage() {
        try {
            const allAlerts = [];
            const cutoff = Date.now() - ALERT_RETENTION_MS;

            // Load price alerts from chart storage
            const chartStored = localStorage.getItem(ALERT_STORAGE_KEY);
            if (chartStored) {
                const data = JSON.parse(chartStored);
                if (data && typeof data === 'object') {
                    // Data format: { [symbol-exchange]: [alerts], ... }
                    for (const [key, alerts] of Object.entries(data)) {
                        if (!Array.isArray(alerts)) continue;

                        for (const alert of alerts) {
                            // Filter expired and already triggered
                            if (alert.createdAt && alert.createdAt < cutoff) continue;
                            if (alert.status === 'triggered') continue;

                            const [symbol, exchange] = key.split(':');
                            allAlerts.push({
                                ...alert,
                                type: 'price', // Mark as price alert
                                symbol: symbol || alert.symbol,
                                exchange: exchange || alert.exchange || 'NSE',
                            });
                        }
                    }
                }
            }

            // Load indicator alerts from App.jsx storage
            const appStored = localStorage.getItem(APP_ALERT_STORAGE_KEY);
            if (appStored) {
                const alerts = JSON.parse(appStored);
                if (Array.isArray(alerts)) {
                    for (const alert of alerts) {
                        // Filter expired, triggered, and paused
                        if (alert.created_at && alert.created_at < cutoff) continue;
                        if (alert.status === 'Triggered' || alert.status === 'Paused') continue;
                        if (alert.type !== 'indicator') continue; // Only indicator alerts

                        allAlerts.push({
                            ...alert,
                            createdAt: alert.created_at, // Normalize field names
                        });
                    }
                }
            }

            logger.debug(`[GlobalAlertMonitor] Loaded ${allAlerts.length} active alerts from storage`);
            return allAlerts;
        } catch (error) {
            logger.error('[GlobalAlertMonitor] Error loading alerts:', error);
            return [];
        }
    }

    /**
     * Refresh the in-memory alert cache
     */
    _refreshAlertCache() {
        this._cachedAlerts = this._loadAlertsFromStorage();
        this._lastCacheRefresh = Date.now();
    }

    /**
     * Get cached alerts (refreshes if cache is stale)
     * @param {boolean} forceRefresh - Force reload from localStorage
     * @returns {StoredAlert[]}
     */
    _getAlerts(forceRefresh = false) {
        const now = Date.now();
        if (forceRefresh || now - this._lastCacheRefresh > CACHE_REFRESH_INTERVAL_MS) {
            this._refreshAlertCache();
        }
        return this._cachedAlerts;
    }

    /**
     * Save updated alerts to localStorage
     * @param {StoredAlert[]} alerts 
     */
    _saveAlerts(alerts) {
        try {
            // Group alerts by symbol-exchange
            const grouped = {};
            for (const alert of alerts) {
                if (alert.type === 'indicator') continue; // Don't save indicator alerts here
                const key = this._getSymbolKey(alert.symbol, alert.exchange);
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(alert);
            }

            localStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify(grouped));
            // Refresh cache after save
            this._refreshAlertCache();
        } catch (error) {
            logger.error('[GlobalAlertMonitor] Error saving alerts:', error);
        }
    }

    /**
     * Remove a triggered alert from storage
     * @param {string} alertId 
     */
    _removeAlert(alertId) {
        const alerts = this._getAlerts(true).filter(a => a.id !== alertId);
        this._saveAlerts(alerts);
        this._alertPositions.delete(alertId);
    }

    /**
     * Check if price crosses alert threshold
     * @param {StoredAlert} alert 
     * @param {number} currentPrice 
     * @returns {AlertTriggerEvent|null}
     */
    _checkCrossing(alert, currentPrice) {
        if (!alert || !alert.symbol || currentPrice === undefined) return null;

        const key = this._getSymbolKey(alert.symbol, alert.exchange || 'NSE');
        const lastPrice = this._lastPrices.get(key);

        // Need previous price to detect crossing
        if (lastPrice === undefined) return null;

        // Get or set initial position
        let position = this._alertPositions.get(alert.id);
        if (!position) {
            position = lastPrice > alert.price ? 'above' : (lastPrice < alert.price ? 'below' : 'unknown');
            this._alertPositions.set(alert.id, position);
            return null; // Don't trigger on first check
        }

        const condition = alert.condition || 'crossing';
        const alertPrice = alert.price;
        let triggered = false;
        let direction = 'up';

        // Check crossing based on condition
        const hasCrossedUp = position === 'below' && currentPrice >= alertPrice;
        const hasCrossedDown = position === 'above' && currentPrice <= alertPrice;

        if (condition === 'crossing') {
            triggered = hasCrossedUp || hasCrossedDown;
            direction = hasCrossedUp ? 'up' : 'down';
        } else if (condition === 'crossing_up') {
            triggered = hasCrossedUp;
            direction = 'up';
        } else if (condition === 'crossing_down') {
            triggered = hasCrossedDown;
            direction = 'down';
        }

        // Update position for future checks
        if (currentPrice > alertPrice) {
            this._alertPositions.set(alert.id, 'above');
        } else if (currentPrice < alertPrice) {
            this._alertPositions.set(alert.id, 'below');
        }

        if (triggered) {
            return {
                alertId: alert.id,
                symbol: alert.symbol,
                exchange: alert.exchange,
                alertPrice: alert.price,
                currentPrice,
                direction,
                condition,
                timestamp: Date.now(),
            };
        }

        return null;
    }

    /**
     * Check if indicator alert condition is met
     * @param {Object} alert - Indicator alert object
     * @param {Object} indicatorData - Current indicator values
     * @param {Object} previousData - Previous bar indicator values
     * @returns {AlertTriggerEvent|null}
     */
    _checkIndicatorAlert(alert, indicatorData, previousData) {
        try {
            const condition = alert.condition;
            if (!condition || !condition.type) {
                logger.warn('[GlobalAlertMonitor] Invalid indicator alert condition:', alert.id);
                return null;
            }

            // Build proper data structure for evaluator
            const currentData = { [alert.indicator]: indicatorData };
            const prevData = previousData ? { [alert.indicator]: previousData } : {};

            // Use AlertEvaluator to check condition - pass full condition object
            const isTriggered = this._alertEvaluator.evaluate(
                { ...condition, indicator: alert.indicator },
                currentData,
                prevData,
                null,  // currentPrice
                null   // previousPrice
            );

            if (isTriggered) {
                logger.info('[GlobalAlertMonitor] Indicator alert triggered:', {
                    id: alert.id,
                    indicator: alert.indicator,
                    condition: condition.label
                });

                return {
                    alertId: alert.id,
                    symbol: alert.symbol,
                    exchange: alert.exchange,
                    alertType: 'indicator',
                    indicator: alert.indicator,
                    condition: condition.label,
                    conditionType: condition.type,
                    timestamp: Date.now(),
                    message: alert.message || `${alert.indicator} ${condition.label}`,
                };
            }

            return null;
        } catch (error) {
            logger.error('[GlobalAlertMonitor] Error checking indicator alert:', error);
            return null;
        }
    }

    /**
     * Handle incoming price update
     * @param {Object} data - { symbol, exchange, last, open, high, low, close, volume, timestamp }
     */
    async _onPriceUpdate(data) {
        if (!data || !data.symbol || data.last === undefined || data.last === null) return;

        const symbol = data.symbol;
        const exchange = data.exchange || 'NSE';
        const currentPrice = data.last;
        const key = this._getSymbolKey(symbol, exchange);

        // Get cached alerts for this symbol (no localStorage parsing on every tick)
        const alerts = this._getAlerts().filter(
            a => a.symbol === symbol && (a.exchange || 'NSE') === exchange
        );

        if (alerts.length > 0) {
            console.log('[GlobalAlertMonitor] Price update', symbol, currentPrice, '- checking', alerts.length, 'alerts');
        }

        // Separate price and indicator alerts
        const priceAlerts = alerts.filter(a => a.type === 'price' || !a.type);
        const indicatorAlerts = alerts.filter(a => a.type === 'indicator');

        // Check price alerts
        for (const alert of priceAlerts) {
            const triggerEvent = this._checkCrossing(alert, currentPrice);

            if (triggerEvent) {
                console.log('[GlobalAlertMonitor] Price alert triggered:', triggerEvent);

                // Remove the alert (one-shot)
                this._removeAlert(alert.id);

                // Fire callback
                if (this._onTrigger) {
                    this._onTrigger(triggerEvent);
                }
            }
        }

        // Check indicator alerts (if any)
        if (indicatorAlerts.length > 0) {
            for (const alert of indicatorAlerts) {
                try {
                    const interval = alert.interval || '1m';
                    const cacheKey = `${key}:${interval}:${alert.indicator}`;

                    // Get OHLC data from cache (provided by charts)
                    const ohlcData = this._getOHLCData(symbol, exchange, interval);

                    if (!ohlcData || ohlcData.length === 0) {
                        // No OHLC data available yet - skip this alert
                        logger.debug(`[GlobalAlertMonitor] No OHLC data for ${symbol}:${exchange}:${interval}, skipping indicator alert`);
                        continue;
                    }

                    logger.debug(`[GlobalAlertMonitor] Calculating ${alert.indicator} for ${symbol} with ${ohlcData.length} bars`);

                    // Calculate indicator values using actual OHLC data
                    const indicatorData = await this._indicatorDataManager.calculateIndicator(
                        alert.indicator,
                        { symbol, exchange, interval },
                        ohlcData
                    );

                    // Get previous values
                    const previousData = this._previousIndicatorValues.get(cacheKey);

                    // Check alert condition
                    if (indicatorData && indicatorData.current) {
                        const triggerEvent = this._checkIndicatorAlert(alert, indicatorData.current, previousData);

                        if (triggerEvent) {
                            console.log('[GlobalAlertMonitor] Indicator alert triggered:', triggerEvent);

                            // Mark alert as triggered in App storage
                            this._markIndicatorAlertTriggered(alert.id);

                            // Fire callback
                            if (this._onTrigger) {
                                this._onTrigger(triggerEvent);
                            }
                        }

                        // Store current values as previous for next check
                        this._previousIndicatorValues.set(cacheKey, indicatorData.current);
                    }
                } catch (error) {
                    logger.error(`[GlobalAlertMonitor] Error checking indicator alert ${alert.id}:`, error);
                }
            }
        }

        // Update last price
        this._lastPrices.set(key, currentPrice);
    }

    /**
     * Mark an indicator alert as triggered in localStorage
     * @param {string} alertId 
     */
    _markIndicatorAlertTriggered(alertId) {
        try {
            const stored = localStorage.getItem(APP_ALERT_STORAGE_KEY);
            if (!stored) return;

            const alerts = JSON.parse(stored);
            if (!Array.isArray(alerts)) return;

            const updated = alerts.map(a =>
                a.id === alertId ? { ...a, status: 'Triggered' } : a
            );

            localStorage.setItem(APP_ALERT_STORAGE_KEY, JSON.stringify(updated));
            // Refresh cache after updating
            this._refreshAlertCache();
        } catch (error) {
            logger.error('[GlobalAlertMonitor] Error marking indicator alert as triggered:', error);
        }
    }

    /**
     * Update OHLC data cache for a symbol-interval combination
     * Called by charts to provide historical data for indicator calculations
     * @param {string} symbol 
     * @param {string} exchange 
     * @param {string} interval 
     * @param {Array} ohlcData - Array of OHLC bars
     */
    updateOHLCData(symbol, exchange, interval, ohlcData) {
        if (!symbol || !ohlcData || !Array.isArray(ohlcData)) {
            logger.warn('[GlobalAlertMonitor] Invalid OHLC data provided');
            return;
        }

        const cacheKey = `${symbol}:${exchange}:${interval}`;
        this._ohlcCache.set(cacheKey, {
            data: ohlcData,
            timestamp: Date.now()
        });

        logger.debug(`[GlobalAlertMonitor] Updated OHLC cache for ${cacheKey}, bars: ${ohlcData.length}`);
    }

    /**
     * Get cached OHLC data for a symbol-interval
     * @param {string} symbol 
     * @param {string} exchange 
     * @param {string} interval 
     * @returns {Array|null}
     */
    _getOHLCData(symbol, exchange, interval) {
        const cacheKey = `${symbol}:${exchange}:${interval}`;
        const cached = this._ohlcCache.get(cacheKey);

        if (!cached) return null;

        // Cache is valid for 5 minutes
        const age = Date.now() - cached.timestamp;
        if (age > 5 * 60 * 1000) {
            this._ohlcCache.delete(cacheKey);
            return null;
        }

        return cached.data;
    }

    /**
     * Start monitoring all symbols with active alerts
     * @param {function} onTrigger - Callback when alert triggers
     */
    start(onTrigger) {
        console.log('[GlobalAlertMonitor] start() called, isRunning:', this._isRunning);
        if (this._isRunning) {
            console.log('[GlobalAlertMonitor] Already running, skipping');
            return;
        }

        this._onTrigger = onTrigger;
        this._restart();

        // Start periodic cache refresh
        this._cacheRefreshIntervalId = setInterval(() => {
            this._refreshAlertCache();
        }, CACHE_REFRESH_INTERVAL_MS);
    }

    /**
     * Restart WebSocket with current alerts
     */
    _restart() {
        // Close existing connection
        this.stop();

        // Force refresh alert cache
        this._refreshAlertCache();

        const alerts = this._cachedAlerts;
        console.log('[GlobalAlertMonitor] Loaded alerts for monitoring:', alerts);
        if (alerts.length === 0) {
            console.log('[GlobalAlertMonitor] No alerts to monitor');
            return;
        }

        // Get unique symbols to subscribe
        const symbolsMap = new Map();
        for (const alert of alerts) {
            const key = this._getSymbolKey(alert.symbol, alert.exchange || 'NSE');
            if (!symbolsMap.has(key)) {
                symbolsMap.set(key, { symbol: alert.symbol, exchange: alert.exchange || 'NSE' });
            }
        }

        const symbols = Array.from(symbolsMap.values());

        if (symbols.length === 0) return;

        console.log('[GlobalAlertMonitor] Starting monitor for', symbols.length, 'symbols:', symbols);

        this._isRunning = true;

        // Wrap async callback properly
        this._ws = subscribeToMultiTicker(symbols, (data) => {
            this._onPriceUpdate(data).catch(err => {
                logger.error('[GlobalAlertMonitor] Error in price update handler:', err);
            });
        });
    }

    /**
     * Stop monitoring and clean up resources
     */
    stop() {
        // Clear cache refresh interval
        if (this._cacheRefreshIntervalId) {
            clearInterval(this._cacheRefreshIntervalId);
            this._cacheRefreshIntervalId = null;
        }

        // Close WebSocket
        if (this._ws) {
            try {
                if (typeof this._ws.close === 'function') {
                    this._ws.close();
                }
            } catch (error) {
                logger.debug('[GlobalAlertMonitor] Error closing WebSocket:', error);
            }
            this._ws = null;
        }

        // Clear memory caches to prevent unbounded growth
        this._lastPrices.clear();
        this._alertPositions.clear();
        this._previousIndicatorValues.clear();
        this._ohlcCache.clear();
        this._cachedAlerts = [];

        this._isRunning = false;
    }

    /**
     * Refresh the monitor (call when alerts change)
     */
    refresh() {
        // Force refresh cache
        this._refreshAlertCache();

        if (this._onTrigger) {
            this._restart();
        }
    }

    /**
     * Check if monitor is running
     */
    isRunning() {
        return this._isRunning;
    }

    /**
     * Cleanup when instance is destroyed
     */
    destroy() {
        this.stop();
        if (typeof window !== 'undefined') {
            window.removeEventListener('storage', this._handleStorageChange);
        }
    }
}

// Singleton instance
export const globalAlertMonitor = new GlobalAlertMonitor();

export default globalAlertMonitor;

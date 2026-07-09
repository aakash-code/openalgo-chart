/**
 * Global Alert Monitor Service
 *
 * Monitors prices for all symbols with active alerts in the background.
 * Uses WebSocket subscription to get real-time price updates.
 * Triggers callbacks when price crosses alert thresholds.
 */

import { getJSON, setJSON, STORAGE_KEYS } from './storageService';
import { subscribeToMultiTicker } from './openalgo';
import logger from '../utils/logger';
import { IndicatorDataManager } from './indicatorDataManager';
import { AlertEvaluator } from '../utils/alerts/alertEvaluator';

// Must match ChartComponent.jsx storage key
const ALERT_STORAGE_KEY = STORAGE_KEYS.CHART_ALERTS;
const APP_ALERT_STORAGE_KEY = STORAGE_KEYS.ALERTS; // App.jsx indicator alerts
const ALERT_RETENTION_MS = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes (matches ChartComponent's refresh rate)
const CACHE_REFRESH_INTERVAL_MS = 5000; // Refresh alert cache every 5 seconds
const CHECK_STALE_INTERVAL_MS = 60 * 1000; // Check for stale code every 1 minute

/** Stored alert object */
export interface StoredAlert {
  id: string;
  symbol: string;
  exchange: string;
  price: number;
  condition: 'crossing' | 'crossing_up' | 'crossing_down';
  createdAt?: number | undefined;
  created_at?: number | undefined;
  status?: string | undefined;
  type?: 'price' | 'indicator' | undefined;
  indicator?: string | undefined;
  interval?: string | undefined;
  alertType?: string | undefined;
  value?: number | undefined;
  frequency?: 'once_per_bar' | 'every_time' | undefined;
  message?: string | undefined;
  alert_type?: string | undefined;
}

/** Alert trigger event */
export interface AlertTriggerEvent {
  alertId: string;
  symbol: string;
  exchange: string;
  alertPrice?: number | undefined;
  currentPrice?: number | undefined;
  direction?: 'up' | 'down' | undefined;
  condition?: string | undefined;
  timestamp: number;
  alertType?: string | undefined;
  indicator?: string | undefined;
  conditionType?: string | undefined;
  message?: string | undefined;
}

/** Price update data */
interface PriceUpdateData {
  symbol: string;
  exchange?: string;
  last: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  timestamp?: number;
}

/** OHLC data bar */
interface OHLCBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

/** OHLC cache entry */
interface OHLCCacheEntry {
  data: OHLCBar[];
  timestamp: number;
  lastAccessed: number;
}

/** Alert callback type */
type AlertCallback = (event: AlertTriggerEvent) => void;

/** Position type */
type AlertPosition = 'above' | 'below' | 'unknown';

/** WebSocket connection type */
interface WebSocketConnection {
  close: () => void;
}

/** Indicator condition */
interface IndicatorCondition {
  type: string;
  label?: string;
  indicator?: string;
}

class GlobalAlertMonitor {
  /** symbol-exchange -> last price */
  private _lastPrices: Map<string, number>;

  /** alertId -> position */
  private _alertPositions: Map<string, AlertPosition>;

  /** WebSocket connection */
  private _ws: WebSocketConnection | null;

  /** Callback for trigger events */
  private _onTrigger: AlertCallback | null;

  /** Is monitor running */
  private _isRunning: boolean;

  /** Indicator calculations */
  private _indicatorDataManager: InstanceType<typeof IndicatorDataManager>;

  /** Alert condition evaluator */
  private _alertEvaluator: InstanceType<typeof AlertEvaluator>;

  /** OHLC data cache per symbol-interval */
  private _ohlcCache: Map<string, OHLCCacheEntry>;

  /** Previous bar indicator values */
  private _previousIndicatorValues: Map<string, unknown>;

  /** Cached alerts - refreshed periodically */
  private _cachedAlerts: StoredAlert[];

  /** Last time alerts were loaded from localStorage */
  private _lastCacheRefresh: number;

  /** Cache refresh interval ID */
  private _cacheRefreshIntervalId: ReturnType<typeof setInterval> | null;

  /** Stale cache cleanup interval ID */
  private _cleanupIntervalId: ReturnType<typeof setInterval> | null;

  /** Bound storage change handler */
  private _handleStorageChange: (event: StorageEvent) => void;

  /** Debounce timer for storage change events */
  private _storageChangeDebounceTimer: ReturnType<typeof setTimeout> | null;

  constructor() {
    this._lastPrices = new Map();
    this._alertPositions = new Map();
    this._ws = null;
    this._onTrigger = null;
    this._isRunning = false;
    this._indicatorDataManager = new IndicatorDataManager();
    this._alertEvaluator = new AlertEvaluator();
    this._ohlcCache = new Map();
    this._previousIndicatorValues = new Map();
    this._cachedAlerts = [];
    this._lastCacheRefresh = 0;
    this._cacheRefreshIntervalId = null;
    this._cleanupIntervalId = null;
    this._storageChangeDebounceTimer = null;

    // Listen for storage changes from other tabs
    this._handleStorageChange = this._onStorageChange.bind(this);
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this._handleStorageChange);
    }
  }

  /**
   * Handle storage changes from other tabs with debounce to prevent rapid multiple calls
   */
  private _onStorageChange(event: StorageEvent): void {
    if (event.key === ALERT_STORAGE_KEY || event.key === APP_ALERT_STORAGE_KEY) {
      // Debounce rapid storage changes (e.g., from multiple tabs syncing)
      if (this._storageChangeDebounceTimer) {
        clearTimeout(this._storageChangeDebounceTimer);
      }
      this._storageChangeDebounceTimer = setTimeout(() => {
        logger.debug('[GlobalAlertMonitor] Storage changed in another tab, refreshing cache');
        this._refreshAlertCache();
        this._storageChangeDebounceTimer = null;
      }, 100); // 100ms debounce
    }
  }

  /**
   * Get unique symbol key for tracking
   */
  private _getSymbolKey(symbol: string, exchange: string): string {
    return `${symbol}:${exchange}`;
  }

  /**
   * Load all alerts from localStorage (both price and indicator alerts)
   */
  private _loadAlertsFromStorage(): StoredAlert[] {
    try {
      const allAlerts: StoredAlert[] = [];
      const cutoff = Date.now() - ALERT_RETENTION_MS;

      // Load price alerts from chart storage
      const data = getJSON<Record<string, StoredAlert[]>>(ALERT_STORAGE_KEY, {});
      if (data && typeof data === 'object') {
        for (const [key, alerts] of Object.entries(data)) {
          if (!Array.isArray(alerts)) continue;

          for (const alert of alerts) {
            if (alert.createdAt && alert.createdAt < cutoff) continue;
            if (alert.status === 'triggered') continue;

            const [symbol, exchange] = key.split(':');
            allAlerts.push({
              ...alert,
              type: 'price',
              symbol: symbol || alert.symbol,
              exchange: exchange || alert.exchange || 'NSE',
            });
          }
        }
      }

      // Load indicator alerts from App.jsx storage
      const alerts = getJSON<StoredAlert[]>(APP_ALERT_STORAGE_KEY, []);
      if (Array.isArray(alerts)) {
        for (const alert of alerts) {
          if (alert.created_at && alert.created_at < cutoff) continue;
          if (alert.status === 'Triggered' || alert.status === 'Paused') continue;
          if (alert.type !== 'indicator') continue;

          allAlerts.push({
            ...alert,
            createdAt: alert.created_at,
            type: 'indicator',
            symbol: alert.symbol,
            exchange: alert.exchange || 'NSE',
            alertType: alert.alert_type,
            price: alert.value || 0,
          });
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
  private _refreshAlertCache(): void {
    this._cachedAlerts = this._loadAlertsFromStorage();
    this._lastCacheRefresh = Date.now();
  }

  /**
   * Get cached alerts (refreshes if cache is stale)
   */
  private _getAlerts(forceRefresh: boolean = false): StoredAlert[] {
    const now = Date.now();
    if (forceRefresh || now - this._lastCacheRefresh > CACHE_REFRESH_INTERVAL_MS) {
      this._refreshAlertCache();
    }
    return this._cachedAlerts;
  }

  /**
   * Save updated alerts to localStorage
   */
  private _saveAlerts(alerts: StoredAlert[]): void {
    try {
      const grouped: Record<string, StoredAlert[]> = {};
      for (const alert of alerts) {
        if (alert.type === 'indicator') continue;
        const key = this._getSymbolKey(alert.symbol, alert.exchange);
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(alert);
      }

      setJSON(ALERT_STORAGE_KEY, grouped);
      this._refreshAlertCache();
    } catch (error) {
      logger.error('[GlobalAlertMonitor] Error saving alerts:', error);
    }
  }

  /**
   * Remove a triggered alert from storage
   */
  private _removeAlert(alertId: string): void {
    const alerts = this._getAlerts(true).filter((a) => a.id !== alertId);
    this._saveAlerts(alerts);
    this._alertPositions.delete(alertId);
  }

  /**
   * Check if price crosses alert threshold
   */
  private _checkCrossing(alert: StoredAlert, currentPrice: number): AlertTriggerEvent | null {
    if (!alert || !alert.symbol || currentPrice === undefined) return null;

    const key = this._getSymbolKey(alert.symbol, alert.exchange || 'NSE');
    const lastPrice = this._lastPrices.get(key);

    if (lastPrice === undefined) return null;

    let position = this._alertPositions.get(alert.id);
    if (!position) {
      position = lastPrice > alert.price ? 'above' : lastPrice < alert.price ? 'below' : 'unknown';
      this._alertPositions.set(alert.id, position);
      return null;
    }

    const condition = alert.condition || 'crossing';
    const alertPrice = alert.price;
    let triggered = false;
    let direction: 'up' | 'down' = 'up';

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
   */
  private _checkIndicatorAlert(
    alert: StoredAlert & { condition?: IndicatorCondition },
    indicatorData: unknown,
    previousData: unknown,
    currentPrice: number | null = null,
    previousPrice: number | null = null
  ): AlertTriggerEvent | null {
    try {
      const condition = alert.condition as IndicatorCondition | undefined;
      if (!condition || !condition.type) {
        logger.warn('[GlobalAlertMonitor] Invalid indicator alert condition:', alert.id);
        return null;
      }

      const currentData = { [alert.indicator || '']: indicatorData };
      const prevData = previousData ? { [alert.indicator || '']: previousData } : {};

      const isTriggered = this._alertEvaluator.evaluate(
        { ...condition, indicator: alert.indicator } as any,
        currentData as any,
        prevData as any,
        currentPrice,
        previousPrice
      );

      if (isTriggered) {
        logger.info('[GlobalAlertMonitor] Indicator alert triggered:', {
          id: alert.id,
          indicator: alert.indicator,
          condition: condition.label,
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
   */
  private async _onPriceUpdate(data: PriceUpdateData): Promise<void> {
    if (!data || !data.symbol || data.last === undefined || data.last === null) return;

    const symbol = data.symbol;
    const exchange = data.exchange || 'NSE';
    const currentPrice = data.last;
    const key = this._getSymbolKey(symbol, exchange);

    const alerts = this._getAlerts().filter(
      (a) => a.symbol === symbol && (a.exchange || 'NSE') === exchange
    );

    if (alerts.length > 0) {
      logger.debug(
        '[GlobalAlertMonitor] Price update',
        symbol,
        currentPrice,
        '- checking',
        alerts.length,
        'alerts'
      );
    }

    const priceAlerts = alerts.filter((a) => a.type === 'price' || !a.type);
    const indicatorAlerts = alerts.filter((a) => a.type === 'indicator');

    // Check price alerts
    for (const alert of priceAlerts) {
      const triggerEvent = this._checkCrossing(alert, currentPrice);

      if (triggerEvent) {
        logger.debug('[GlobalAlertMonitor] Price alert triggered:', triggerEvent);
        this._removeAlert(alert.id);

        if (this._onTrigger) {
          this._onTrigger(triggerEvent);
        }
      }
    }

    // Check indicator alerts
    if (indicatorAlerts.length > 0) {
      for (const alert of indicatorAlerts) {
        try {
          // Skip alerts without indicator defined
          if (!alert.indicator) {
            continue;
          }
          const indicatorId = alert.indicator;
          const interval = alert.interval || '1m';
          const cacheKey = `${key}:${interval}:${indicatorId}`;

          const ohlcData = this._getOHLCData(symbol, exchange, interval);

          if (!ohlcData || ohlcData.length === 0) {
            logger.debug(
              `[GlobalAlertMonitor] No OHLC data for ${symbol}:${exchange}:${interval}, skipping indicator alert`
            );
            continue;
          }

          logger.debug(
            `[GlobalAlertMonitor] Calculating ${indicatorId} for ${symbol} with ${ohlcData.length} bars`
          );

          const indicatorData = await this._indicatorDataManager.calculateIndicator(
            indicatorId,
            { symbol, exchange, interval },
            ohlcData
          );

          const previousData = this._previousIndicatorValues.get(cacheKey);

          if (indicatorData && indicatorData.current) {
            const previousPrice = this._lastPrices.get(key);
            const triggerEvent = this._checkIndicatorAlert(
              alert as StoredAlert & { condition?: IndicatorCondition },
              indicatorData.current,
              previousData,
              currentPrice,
              previousPrice ?? null
            );

            if (triggerEvent) {
              logger.debug('[GlobalAlertMonitor] Indicator alert triggered:', triggerEvent);

              const frequency = alert.frequency || 'once_per_bar';
              if (frequency === 'once_per_bar') {
                this._markIndicatorAlertTriggered(alert.id);
              }

              if (this._onTrigger) {
                this._onTrigger(triggerEvent);
              }
            }

            this._previousIndicatorValues.set(cacheKey, indicatorData.current);
          }
        } catch (error) {
          logger.error(`[GlobalAlertMonitor] Error checking indicator alert ${alert.id}:`, error);
        }
      }
    }

    this._lastPrices.set(key, currentPrice);
  }

  /**
   * Mark an indicator alert as triggered in localStorage
   */
  private _markIndicatorAlertTriggered(alertId: string): void {
    try {
      const alerts = getJSON<StoredAlert[]>(APP_ALERT_STORAGE_KEY, []);
      if (!Array.isArray(alerts)) return;

      const updated = alerts.map((a) => (a.id === alertId ? { ...a, status: 'Triggered' } : a));

      setJSON(APP_ALERT_STORAGE_KEY, updated);
      this._refreshAlertCache();
    } catch (error) {
      logger.error('[GlobalAlertMonitor] Error marking indicator alert as triggered:', error);
    }
  }

  /**
   * Update OHLC data cache for a symbol-interval combination
   * Called by charts to provide historical data for indicator calculations
   */
  updateOHLCData(symbol: string, exchange: string, interval: string, ohlcData: OHLCBar[]): void {
    if (!symbol || !ohlcData || !Array.isArray(ohlcData)) {
      logger.warn('[GlobalAlertMonitor] Invalid OHLC data provided');
      return;
    }

    const normalizedInterval = this._normalizeInterval(interval);
    const cacheKey = `${symbol}:${exchange}:${normalizedInterval}`;
    const now = Date.now();

    this._ohlcCache.set(cacheKey, {
      data: ohlcData,
      timestamp: now,
      lastAccessed: now,
    });

    if (normalizedInterval !== interval) {
      const originalKey = `${symbol}:${exchange}:${interval}`;
      this._ohlcCache.set(originalKey, {
        data: ohlcData,
        timestamp: now,
        lastAccessed: now,
      });
    }

    logger.debug(`[GlobalAlertMonitor] Updated OHLC cache for ${cacheKey}, bars: ${ohlcData.length}`);
  }

  /**
   * Normalize interval format (e.g., '1' -> '1m', '3' -> '3m')
   */
  private _normalizeInterval(interval: string): string {
    if (!interval) return interval;
    if (/^\d+$/.test(interval)) {
      return `${interval}m`;
    }
    return interval;
  }

  /**
   * Get cached OHLC data for a symbol-interval
   */
  private _getOHLCData(symbol: string, exchange: string, interval: string): OHLCBar[] | null {
    const normalizedInterval = this._normalizeInterval(interval);
    const cacheKey = `${symbol}:${exchange}:${normalizedInterval}`;
    const cached = this._ohlcCache.get(cacheKey);

    if (!cached) {
      const alternatives = [
        interval,
        interval.replace(/m$/, ''),
        `${interval.replace(/m$/, '')}m`,
      ].filter((alt) => alt !== normalizedInterval);

      for (const alt of alternatives) {
        const altKey = `${symbol}:${exchange}:${alt}`;
        const altCached = this._ohlcCache.get(altKey);
        if (altCached) {
          logger.debug(
            `[GlobalAlertMonitor] Found OHLC data with alternative interval format: ${alt} (requested: ${interval})`
          );
          altCached.lastAccessed = Date.now();
          return altCached.data;
        }
      }
      return null;
    }

    cached.lastAccessed = Date.now();
    return cached.data;
  }

  /**
   * Remove stale entries from OHLC cache
   */
  private _cleanStaleCache(): void {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of this._ohlcCache.entries()) {
      if (now - entry.lastAccessed > CACHE_EXPIRY_MS) {
        this._ohlcCache.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      logger.debug(`[GlobalAlertMonitor] Cleaned ${removedCount} stale entries from OHLC cache`);
    }
  }

  /**
   * Start monitoring all symbols with active alerts
   */
  start(onTrigger: AlertCallback): void {
    logger.debug('[GlobalAlertMonitor] start() called, isRunning:', this._isRunning);
    if (this._isRunning) {
      logger.debug('[GlobalAlertMonitor] Already running, skipping');
      return;
    }

    this._onTrigger = onTrigger;
    this._restart();

    this._cacheRefreshIntervalId = setInterval(() => {
      this._refreshAlertCache();
    }, CACHE_REFRESH_INTERVAL_MS);

    this._cleanupIntervalId = setInterval(() => {
      this._cleanStaleCache();
    }, CHECK_STALE_INTERVAL_MS);
  }

  /**
   * Restart WebSocket with current alerts
   */
  private _restart(): void {
    this.stop();
    this._refreshAlertCache();

    const alerts = this._cachedAlerts;
    logger.debug('[GlobalAlertMonitor] Loaded alerts for monitoring:', alerts);
    if (alerts.length === 0) {
      logger.debug('[GlobalAlertMonitor] No alerts to monitor');
      return;
    }

    const symbolsMap = new Map<string, { symbol: string; exchange: string }>();
    for (const alert of alerts) {
      const key = this._getSymbolKey(alert.symbol, alert.exchange || 'NSE');
      if (!symbolsMap.has(key)) {
        symbolsMap.set(key, { symbol: alert.symbol, exchange: alert.exchange || 'NSE' });
      }
    }

    const symbols = Array.from(symbolsMap.values());

    if (symbols.length === 0) return;

    logger.debug('[GlobalAlertMonitor] Starting monitor for', symbols.length, 'symbols:', symbols);

    this._isRunning = true;

    this._ws = subscribeToMultiTicker(symbols, (data: PriceUpdateData) => {
      this._onPriceUpdate(data).catch((err: Error) => {
        logger.error('[GlobalAlertMonitor] Error in price update handler:', err);
      });
    });
  }

  /**
   * Stop monitoring and clean up resources
   */
  stop(): void {
    if (this._cacheRefreshIntervalId) {
      clearInterval(this._cacheRefreshIntervalId);
      this._cacheRefreshIntervalId = null;
    }

    if (this._cleanupIntervalId) {
      clearInterval(this._cleanupIntervalId);
      this._cleanupIntervalId = null;
    }

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
  refresh(): void {
    this._refreshAlertCache();

    if (this._onTrigger) {
      this._restart();
    }
  }

  /**
   * Check if monitor is running
   */
  isRunning(): boolean {
    return this._isRunning;
  }

  /**
   * Cleanup when instance is destroyed
   */
  destroy(): void {
    this.stop();
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this._handleStorageChange);
    }
  }
}

// Singleton instance
export const globalAlertMonitor = new GlobalAlertMonitor();

// HIGH FIX ML-6: Add beforeunload handler to close WebSocket on page exit
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    globalAlertMonitor.stop();
  });
}

export default globalAlertMonitor;

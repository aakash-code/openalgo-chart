/**
 * Alert Persistence Service
 * Handles loading and saving of alerts to localStorage
 *
 * Supports two storage formats:
 * 1. Per-symbol keys: tv_alerts_SYMBOL_EXCHANGE (legacy)
 * 2. Consolidated: tv_chart_alerts with nested {symbol:exchange: alerts} (preferred)
 */

import { getJSON, setJSON, STORAGE_KEYS } from './storageService';
import logger from '../utils/logger';

/** Alert object structure */
export interface Alert {
  id: string;
  price: number;
  condition: 'above' | 'below' | 'cross';
  message?: string;
  triggered?: boolean;
  createdAt?: number;
}

/** Storage structure for all alerts */
export type AlertsStorage = Record<string, Alert[]>;

// Storage key for consolidated chart alerts
const CHART_ALERTS_KEY = STORAGE_KEYS.CHART_ALERTS;

/**
 * Get storage key for a symbol
 * @param symbol - Symbol name
 * @param exchange - Exchange name
 * @returns Combined key
 */
const getSymbolKey = (symbol: string, exchange?: string): string => {
  return `${symbol}:${exchange || 'NSE'}`;
};

/**
 * Load alerts for a symbol from localStorage
 * Checks consolidated storage first, then falls back to per-symbol storage
 * @param symbol - Symbol name
 * @param exchange - Exchange name
 * @returns Array of alerts
 */
export const loadAlertsForSymbol = (symbol: string, exchange?: string): Alert[] => {
  if (!symbol) return [];

  try {
    // Try consolidated storage first
    const allAlerts = getJSON<AlertsStorage>(CHART_ALERTS_KEY, {});
    const key = getSymbolKey(symbol, exchange);
    const alerts = allAlerts[key] ?? [];
    if (alerts.length > 0) {
      logger.debug('[Alerts] Loaded', alerts.length, 'alerts for', key);
      return alerts;
    }
  } catch (error) {
    logger.warn('[Alerts] Failed to load alerts for', symbol, error);
  }

  return [];
};

/**
 * Save alerts for a symbol to localStorage
 * Uses consolidated storage format
 * @param symbol - Symbol name
 * @param exchange - Exchange name
 * @param alerts - Array of alerts to save
 */
export const saveAlertsForSymbol = (
  symbol: string,
  exchange: string | undefined,
  alerts: Alert[]
): void => {
  if (!symbol || !alerts) return;

  try {
    const key = getSymbolKey(symbol, exchange);
    const stored = getJSON<AlertsStorage>(CHART_ALERTS_KEY, {});
    stored[key] = alerts;
    setJSON(CHART_ALERTS_KEY, stored);
    logger.debug('[Alerts] Saved', alerts.length, 'alerts for', key);
  } catch (error) {
    logger.warn('[Alerts] Failed to save alerts for', symbol, error);
  }
};

/**
 * Get all alerts from storage
 * @returns Object with symbol keys and alert arrays
 */
export const getAllAlerts = (): AlertsStorage => {
  try {
    return getJSON<AlertsStorage>(CHART_ALERTS_KEY, {});
  } catch (error) {
    logger.warn('[Alerts] Failed to load all alerts:', error);
    return {};
  }
};

/**
 * Clear alerts for a symbol
 * @param symbol - Symbol name
 * @param exchange - Exchange name
 */
export const clearAlertsForSymbol = (symbol: string, exchange?: string): void => {
  if (!symbol) return;

  try {
    const key = getSymbolKey(symbol, exchange);
    const stored = getJSON<AlertsStorage>(CHART_ALERTS_KEY, {});
    delete stored[key];
    setJSON(CHART_ALERTS_KEY, stored);
    logger.debug('[Alerts] Cleared alerts for', key);
  } catch (error) {
    logger.warn('[Alerts] Failed to clear alerts for', symbol, error);
  }
};

export default {
  loadAlertsForSymbol,
  saveAlertsForSymbol,
  getAllAlerts,
  clearAlertsForSymbol,
};

/**
 * Chart Cache Service (IndexedDB)
 * Stores historical candle data locally to enable instant chart loading
 * and reduce redundant API calls.
 */

import { OHLCData } from '../../utils/indicators/types';
import logger from '../../utils/logger';

const DB_NAME = 'OpenAlgoChartCache';
const DB_VERSION = 1;
const STORE_NAME = 'candles';

/**
 * Unique key for a symbol/exchange/interval combination
 */
const getCacheKey = (symbol: string, exchange: string, interval: string) => 
    `${exchange}:${symbol}:${interval}`;

/**
 * Open (and initialize if needed) the IndexedDB
 */
const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                // Key is the composite string, we store an array of candles as the value
                db.createObjectStore(STORE_NAME);
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

/**
 * Save candles to local cache
 */
export const saveCandlesToCache = async (
    symbol: string, 
    exchange: string, 
    interval: string, 
    candles: OHLCData[]
): Promise<void> => {
    if (!candles || candles.length === 0) return;
    
    try {
        const db = await openDB();
        const key = getCacheKey(symbol, exchange, interval);
        
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        
        // Strategy: Get existing, merge, dedupe, and save
        // This handles incremental updates effectively
        const existingRequest = store.get(key);
        
        existingRequest.onsuccess = () => {
            const existing = existingRequest.result || [];
            
            // Merge and dedupe by time
            const candleMap = new Map();
            existing.forEach((c: OHLCData) => candleMap.set(c.time, c));
            candles.forEach((c: OHLCData) => candleMap.set(c.time, c));
            
            const merged = Array.from(candleMap.values()).sort((a, b) => a.time - b.time);
            
            // Keep only last 5000 candles to prevent DB bloating
            const trimmed = merged.slice(-5000);
            
            store.put(trimmed, key);
        };
        
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch (error) {
        logger.error('[Cache] Failed to save candles:', error);
    }
};

/**
 * Load candles from local cache
 */
export const loadCandlesFromCache = async (
    symbol: string, 
    exchange: string, 
    interval: string
): Promise<OHLCData[]> => {
    try {
        const db = await openDB();
        const key = getCacheKey(symbol, exchange, interval);
        
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(key);
        
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        logger.error('[Cache] Failed to load candles from cache:', error);
        return [];
    }
};

/**
 * Clear cache for a specific symbol or everything
 */
export const clearChartCache = async (key?: string): Promise<void> => {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        
        if (key) {
            store.delete(key);
        } else {
            store.clear();
        }
    } catch (error) {
        logger.error('[Cache] Failed to clear cache:', error);
    }
};

export default {
    saveCandlesToCache,
    loadCandlesFromCache,
    clearChartCache
};

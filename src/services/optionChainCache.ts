/**
 * Option Chain Cache Module
 * Handles caching to reduce API calls and avoid rate limits
 */

import logger from '../utils/logger';
import { getJSON, setJSON, remove } from './storageService';

// ==================== TYPES ====================

/** Cache entry with timestamp */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/** Cache configuration */
export interface CacheConfig {
  CACHE_TTL_MS: number;
  MAX_OPTION_CHAIN_CACHE_SIZE: number;
  MIN_API_INTERVAL_MS: number;
  EXPIRY_CACHE_TTL_MS: number;
  MAX_EXPIRY_CACHE_SIZE: number;
}

// ==================== OPTION CHAIN CACHE ====================
const optionChainCache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL_MS = 300000; // 5 minutes cache
const MAX_OPTION_CHAIN_CACHE_SIZE = 50; // Max entries to prevent memory leaks
const STORAGE_KEY = 'optionChainCache';

// Negative cache for symbols that don't support F&O
const noFOSymbolsCache = new Set<string>();
const NO_FO_STORAGE_KEY = 'noFOSymbolsCache';
const NO_FO_CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
// MEDIUM FIX ML-10: Add max size to prevent unbounded growth
const MAX_NO_FO_CACHE_SIZE = 500; // Reasonable limit for non-F&O symbols

// Rate limit protection
let lastApiCallTime = 0;
const MIN_API_INTERVAL_MS = 5000; // 5 seconds between API calls

// ==================== EXPIRY CACHE ====================
const expiryCache = new Map<string, CacheEntry<unknown>>();
const EXPIRY_CACHE_TTL_MS = 300000; // 5 minutes cache
const MAX_EXPIRY_CACHE_SIZE = 30;
const EXPIRY_STORAGE_KEY = 'expiryCache';

/**
 * Generate cache key from underlying and expiry
 */
export const getCacheKey = (underlying: string, expiry?: string | null): string =>
  `${underlying}_${expiry || 'default'}`;

/**
 * Generate expiry cache key
 */
export const getExpiryCacheKey = (
  underlying: string,
  exchange: string,
  instrumenttype: string
): string => `${underlying}_${exchange}_${instrumenttype}`;

/**
 * Check if cache entry is still valid
 */
export const isCacheValid = (
  cacheEntry: CacheEntry<unknown> | undefined,
  ttl: number = CACHE_TTL_MS
): boolean => {
  if (!cacheEntry) return false;
  return Date.now() - cacheEntry.timestamp < ttl;
};

/**
 * Evict oldest entries from cache using LRU-like eviction
 */
export const evictOldestEntries = <T>(cache: Map<string, CacheEntry<T>>, maxSize: number): void => {
  if (cache.size <= maxSize) return;

  const entries = Array.from(cache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp);

  const toRemove = entries.slice(0, cache.size - maxSize);
  toRemove.forEach(([key]) => cache.delete(key));
  logger.debug('[OptionChainCache] Evicted', toRemove.length, 'old cache entries');
};

// ==================== NO F&O CACHE ====================

/**
 * Load negative cache from localStorage
 */
export const loadNoFOCacheFromStorage = (): void => {
  try {
    const parsed = getJSON<Record<string, number> | null>(NO_FO_STORAGE_KEY, null);
    if (parsed) {
      const now = Date.now();
      Object.entries(parsed).forEach(([symbol, timestamp]) => {
        if (now - timestamp < NO_FO_CACHE_DURATION_MS) {
          noFOSymbolsCache.add(symbol);
        }
      });
      logger.debug('[OptionChainCache] Loaded', noFOSymbolsCache.size, 'non-F&O symbols from cache');
    }
  } catch (e) {
    // Phase 4.3: Enhanced error recovery - clear corrupted cache and reset
    logger.warn('[OptionChainCache] Failed to load no-F&O cache:', (e as Error).message);
    logger.debug('[OptionChainCache] Clearing corrupted no-F&O cache from localStorage');
    remove(NO_FO_STORAGE_KEY);
    noFOSymbolsCache.clear();
  }
};

/**
 * Save negative cache to localStorage
 */
export const saveNoFOCacheToStorage = (): void => {
  try {
    const now = Date.now();
    const obj: Record<string, number> = {};
    noFOSymbolsCache.forEach((symbol) => {
      obj[symbol] = now;
    });
    setJSON(NO_FO_STORAGE_KEY, obj);
  } catch (e) {
    logger.warn('[OptionChainCache] Failed to save no-F&O cache:', (e as Error).message);
  }
};

/**
 * Check if symbol is known to not support F&O
 */
export const isNonFOSymbol = (symbol: string | undefined | null): boolean =>
  noFOSymbolsCache.has(symbol?.toUpperCase() ?? '');

/**
 * Mark a symbol as not supporting F&O
 */
export const markAsNonFOSymbol = (symbol: string | undefined | null): void => {
  const upperSymbol = symbol?.toUpperCase();
  if (upperSymbol) {
    // MEDIUM FIX ML-10: Evict oldest entry if cache is at capacity
    if (noFOSymbolsCache.size >= MAX_NO_FO_CACHE_SIZE) {
      // Convert Set to Array and remove first (oldest) entry
      const entries = Array.from(noFOSymbolsCache);
      const toRemove = entries[0];
      if (toRemove) {
        noFOSymbolsCache.delete(toRemove);
        logger.debug('[OptionChainCache] Evicted oldest non-F&O symbol:', toRemove);
      }
    }
    noFOSymbolsCache.add(upperSymbol);
    saveNoFOCacheToStorage();
    logger.debug('[OptionChainCache] Marked as non-F&O symbol:', upperSymbol);
  }
};

// ==================== OPTION CHAIN CACHE ====================

/**
 * Load option chain cache from localStorage
 */
export const loadCacheFromStorage = (): void => {
  try {
    const parsed = getJSON<Record<string, CacheEntry<unknown>> | null>(STORAGE_KEY, null);
    if (parsed) {
      Object.entries(parsed).forEach(([key, value]) => {
        optionChainCache.set(key, value);
      });
      logger.debug('[OptionChainCache] Loaded', optionChainCache.size, 'cache entries from storage');
    }
  } catch (e) {
    // Phase 4.3: Enhanced error recovery - clear corrupted cache and reset
    logger.warn('[OptionChainCache] Failed to load cache from storage:', (e as Error).message);
    logger.debug('[OptionChainCache] Clearing corrupted option chain cache from localStorage');
    remove(STORAGE_KEY);
    optionChainCache.clear();
  }
};

/**
 * Save option chain cache to localStorage
 */
export const saveCacheToStorage = (): void => {
  try {
    const obj = Object.fromEntries(optionChainCache);
    setJSON(STORAGE_KEY, obj);
  } catch (e) {
    logger.warn('[OptionChainCache] Failed to save cache to storage:', (e as Error).message);
  }
};

/**
 * Get cached option chain data
 */
export const getOptionChainFromCache = (cacheKey: string): CacheEntry<unknown> | undefined => {
  return optionChainCache.get(cacheKey);
};

/**
 * Set option chain data in cache
 */
export const setOptionChainInCache = <T>(cacheKey: string, data: T): void => {
  evictOldestEntries(optionChainCache, MAX_OPTION_CHAIN_CACHE_SIZE - 1);
  optionChainCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
  });
  saveCacheToStorage();
  logger.debug('[OptionChainCache] Cached data for:', cacheKey);
};

/**
 * Clear option chain cache
 */
export const clearOptionChainCache = (
  underlying: string | null = null,
  expiry: string | null = null
): void => {
  if (underlying && expiry) {
    const key = getCacheKey(underlying, expiry);
    optionChainCache.delete(key);
    logger.debug('[OptionChainCache] Cache cleared for:', key);
  } else if (underlying) {
    for (const key of optionChainCache.keys()) {
      if (key.startsWith(underlying + '_')) {
        optionChainCache.delete(key);
      }
    }
    logger.debug('[OptionChainCache] Cache cleared for underlying:', underlying);
  } else {
    optionChainCache.clear();
    logger.debug('[OptionChainCache] Full cache cleared');
  }
  saveCacheToStorage();
};

// ==================== EXPIRY CACHE ====================

/**
 * Load expiry cache from localStorage
 */
export const loadExpiryCacheFromStorage = (): void => {
  try {
    const parsed = getJSON<Record<string, CacheEntry<unknown>> | null>(EXPIRY_STORAGE_KEY, null);
    if (parsed) {
      Object.entries(parsed).forEach(([key, value]) => {
        expiryCache.set(key, value);
      });
      logger.debug('[OptionChainCache] Loaded', expiryCache.size, 'expiry cache entries');
    }
  } catch (e) {
    // Phase 4.3: Enhanced error recovery - clear corrupted cache and reset
    logger.warn('[OptionChainCache] Failed to load expiry cache:', (e as Error).message);
    logger.debug('[OptionChainCache] Clearing corrupted expiry cache from localStorage');
    remove(EXPIRY_STORAGE_KEY);
    expiryCache.clear();
  }
};

/**
 * Save expiry cache to localStorage
 */
export const saveExpiryCacheToStorage = (): void => {
  try {
    const obj = Object.fromEntries(expiryCache);
    setJSON(EXPIRY_STORAGE_KEY, obj);
  } catch (e) {
    logger.warn('[OptionChainCache] Failed to save expiry cache:', (e as Error).message);
  }
};

/**
 * Get cached expiry data
 */
export const getExpiryFromCache = (cacheKey: string): CacheEntry<unknown> | undefined => {
  return expiryCache.get(cacheKey);
};

/**
 * Set expiry data in cache
 */
export const setExpiryInCache = <T>(cacheKey: string, data: T): void => {
  evictOldestEntries(expiryCache, MAX_EXPIRY_CACHE_SIZE - 1);
  expiryCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
  });
  saveExpiryCacheToStorage();
  logger.debug('[OptionChainCache] Cached expiries for:', cacheKey);
};

// ==================== RATE LIMITING ====================

/**
 * Get time since last API call
 */
export const getTimeSinceLastApiCall = (): number => Date.now() - lastApiCallTime;

/**
 * Update last API call time
 */
export const updateLastApiCallTime = (): void => {
  lastApiCallTime = Date.now();
};

/**
 * Check if rate limit should be applied
 */
export const shouldApplyRateLimit = (): boolean => {
  return getTimeSinceLastApiCall() < MIN_API_INTERVAL_MS;
};

/**
 * Get rate limit wait time
 */
export const getRateLimitWaitTime = (): number => {
  return MIN_API_INTERVAL_MS - getTimeSinceLastApiCall();
};

// Export constants for use in other modules
export const CACHE_CONFIG: CacheConfig = {
  CACHE_TTL_MS,
  MAX_OPTION_CHAIN_CACHE_SIZE,
  MIN_API_INTERVAL_MS,
  EXPIRY_CACHE_TTL_MS,
  MAX_EXPIRY_CACHE_SIZE,
};

// Initialize caches on module load
loadNoFOCacheFromStorage();
loadCacheFromStorage();
loadExpiryCacheFromStorage();

export default {
  getCacheKey,
  getExpiryCacheKey,
  isCacheValid,
  evictOldestEntries,
  isNonFOSymbol,
  markAsNonFOSymbol,
  getOptionChainFromCache,
  setOptionChainInCache,
  clearOptionChainCache,
  getExpiryFromCache,
  setExpiryInCache,
  shouldApplyRateLimit,
  getRateLimitWaitTime,
  updateLastApiCallTime,
  CACHE_CONFIG,
};

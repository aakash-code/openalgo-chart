/**
 * Liquidity Cache
 *
 * Computes 20-day average daily turnover (close × volume) per symbol from
 * daily klines and caches the result for 24 hours so we don't re-fetch on
 * every signal.
 *
 * The trade engine uses this to reject signals on illiquid stocks where
 * slippage would erode any edge.
 */

import { getKlines } from './openalgo';
import logger from '../utils/logger';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const STORAGE_KEY = 'oa_liquidity_cache';
const LOOKBACK_DAYS = 20;

interface CacheEntry {
  /** 20-day avg daily turnover in INR */
  turnover: number;
  /** Epoch ms when computed */
  computedAt: number;
}

interface Candle {
  time: number;
  close: number;
  volume?: number;
}

// ==================== STORAGE ====================

const loadCache = (): Map<string, CacheEntry> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Map();
    const parsed = JSON.parse(raw) as Record<string, CacheEntry>;
    return new Map(Object.entries(parsed));
  } catch {
    return new Map();
  }
};

const saveCache = (cache: Map<string, CacheEntry>): void => {
  try {
    const obj: Record<string, CacheEntry> = {};
    for (const [key, value] of cache.entries()) obj[key] = value;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch (err) {
    logger.warn('[liquidityCache] persist failed:', err);
  }
};

const cache = loadCache();
/** In-flight fetches keyed by symbol — dedup concurrent requests */
const pending = new Map<string, Promise<number | null>>();

// ==================== API ====================

const cacheKey = (symbol: string, exchange: string): string => `${symbol}:${exchange}`;

/**
 * Compute 20-day average daily turnover for a symbol. Returns the cached
 * value if fresh (< 24h old) or fetches/computes on miss. Returns null on
 * fetch error — caller should fail-open (allow trade) so a single broker
 * hiccup doesn't block everything.
 */
export const getLiquidity = async (
  symbol: string,
  exchange: string
): Promise<number | null> => {
  const key = cacheKey(symbol, exchange);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.computedAt < CACHE_TTL_MS) {
    return cached.turnover;
  }

  // Dedup concurrent requests for the same symbol
  if (pending.has(key)) return pending.get(key)!;

  const promise = (async () => {
    try {
      // Fetch slightly more than LOOKBACK_DAYS in case some bars are missing (holidays, etc.)
      const data = (await getKlines(symbol, exchange, '1d', LOOKBACK_DAYS + 5)) as Candle[] | null;
      if (!data || data.length === 0) {
        logger.debug(`[liquidityCache] No data for ${key}`);
        return null;
      }

      const recent = data.slice(-LOOKBACK_DAYS);
      let sum = 0;
      let count = 0;
      for (const bar of recent) {
        const close = Number(bar.close);
        const volume = Number(bar.volume ?? 0);
        if (Number.isFinite(close) && Number.isFinite(volume) && close > 0 && volume > 0) {
          sum += close * volume;
          count++;
        }
      }
      if (count === 0) return null;

      const avgTurnover = sum / count;
      cache.set(key, { turnover: avgTurnover, computedAt: Date.now() });
      saveCache(cache);
      return avgTurnover;
    } catch (err) {
      logger.warn(`[liquidityCache] fetch failed for ${key}:`, err);
      return null;
    } finally {
      pending.delete(key);
    }
  })();

  pending.set(key, promise);
  return promise;
};

/** Synchronous read from cache only — useful when we want to fail-open without awaiting */
export const peekLiquidity = (symbol: string, exchange: string): number | null => {
  const key = cacheKey(symbol, exchange);
  const cached = cache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.computedAt > CACHE_TTL_MS) return null;
  return cached.turnover;
};

/** Clear the cache (for testing or after a corporate action) */
export const clearLiquidityCache = (): void => {
  cache.clear();
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
};

/** Test-only: seed a value into the in-memory cache so getLiquidity returns it deterministically */
export const __testSeedLiquidity = (
  symbol: string,
  exchange: string,
  turnover: number
): void => {
  cache.set(cacheKey(symbol, exchange), { turnover, computedAt: Date.now() });
  saveCache(cache);
};

export default { getLiquidity, peekLiquidity, clearLiquidityCache };

/**
 * Market Service - Holidays & Timings API Integration
 * Provides accurate market timing information for indicators and session boundaries
 *
 * API Endpoints:
 * - POST /api/v1/market/holidays - Get market holidays for a year
 * - POST /api/v1/market/timings - Get market timings for a date
 */

import logger from '../utils/logger';
import { getApiBase, getApiKey } from './openalgo';

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour cache

/** Holiday object structure */
export interface Holiday {
  date: string;
  description: string;
  holiday_type: 'TRADING_HOLIDAY' | 'SETTLEMENT_HOLIDAY' | 'SPECIAL_SESSION';
  closed_exchanges: string[];
  open_exchanges: Array<{
    exchange: string;
    start_time: number;
    end_time: number;
  }>;
}

/** Exchange timing object */
export interface ExchangeTiming {
  exchange: string;
  start_time: number; // epoch milliseconds
  end_time: number; // epoch milliseconds
}

/** Holiday check result */
export interface HolidayCheckResult {
  isHoliday: boolean;
  description?: string;
  type?: string;
  specialSession?: {
    start_time: number;
    end_time: number;
  };
}

/** Session boundaries */
export interface SessionBoundaries {
  start_time: number;
  end_time: number;
}

/** Default market timings */
export interface DefaultTimings {
  open: string;
  close: string;
}

/** API response structure */
interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}

/** Cache entry structure */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/** Holidays cache */
interface HolidaysCache {
  data: Holiday[] | null;
  year: number | null;
  timestamp: number;
}

// Cache storage
const cache: {
  holidays: HolidaysCache;
  timings: Map<string, CacheEntry<ExchangeTiming[]>>;
} = {
  holidays: { data: null, year: null, timestamp: 0 },
  timings: new Map(),
};

/**
 * Check if cached data is still valid
 */
const isCacheValid = (timestamp: number): boolean => {
  return Date.now() - timestamp < CACHE_TTL_MS;
};

/**
 * Get market holidays for a specific year
 * @param year - Year to get holidays for (2020-2050)
 * @returns Array of holiday objects
 */
export const getMarketHolidays = async (
  year: number = new Date().getFullYear()
): Promise<Holiday[]> => {
  // Check cache
  if (cache.holidays.year === year && isCacheValid(cache.holidays.timestamp)) {
    logger.debug('[MarketService] Using cached holidays for', year);
    return cache.holidays.data || [];
  }

  try {
    const response = await fetch(`${getApiBase()}/market/holidays`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        apikey: getApiKey(),
        year,
      }),
    });

    if (!response.ok) {
      throw new Error(`Market holidays error: ${response.status}`);
    }

    const result = (await response.json()) as ApiResponse<Holiday[]>;
    logger.debug('[MarketService] Holidays response:', result);

    if (result.status === 'success' && result.data) {
      // Update cache
      cache.holidays = {
        data: result.data,
        year,
        timestamp: Date.now(),
      };
      return result.data;
    }

    return [];
  } catch (error) {
    logger.error('[MarketService] Error fetching holidays:', error);
    return [];
  }
};

/**
 * Get market timings for a specific date
 * @param date - Date in YYYY-MM-DD format
 * @returns Array of exchange timing objects
 */
export const getMarketTimings = async (dateInput?: string): Promise<ExchangeTiming[]> => {
  const date = dateInput ?? (new Date().toISOString().split('T')[0] as string);

  // Check cache
  const cached = cache.timings.get(date);
  if (cached && isCacheValid(cached.timestamp)) {
    logger.debug('[MarketService] Using cached timings for', date);
    return cached.data;
  }

  try {
    const response = await fetch(`${getApiBase()}/market/timings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        apikey: getApiKey(),
        date,
      }),
    });

    if (!response.ok) {
      throw new Error(`Market timings error: ${response.status}`);
    }

    const result = (await response.json()) as ApiResponse<ExchangeTiming[]>;
    logger.debug('[MarketService] Timings response:', result);

    if (result.status === 'success' && result.data) {
      // Update cache
      cache.timings.set(date, {
        data: result.data,
        timestamp: Date.now(),
      });

      // Limit cache size (keep last 7 days)
      if (cache.timings.size > 7) {
        const oldestKey = cache.timings.keys().next().value;
        if (oldestKey) cache.timings.delete(oldestKey);
      }

      return result.data;
    }

    return [];
  } catch (error) {
    logger.error('[MarketService] Error fetching timings:', error);
    return [];
  }
};

/**
 * Check if market is currently open for a specific exchange
 * @param exchange - Exchange code (NSE, BSE, NFO, MCX, etc.)
 * @returns True if market is open
 */
export const isMarketOpen = async (exchange: string = 'NSE'): Promise<boolean> => {
  const today = new Date().toISOString().split('T')[0];
  const timings = await getMarketTimings(today);

  if (!timings || timings.length === 0) {
    return false; // Holiday or weekend
  }

  const exchangeTiming = timings.find((t) => t.exchange === exchange);
  if (!exchangeTiming) {
    return false; // Exchange not trading today
  }

  const now = Date.now();
  return now >= exchangeTiming.start_time && now <= exchangeTiming.end_time;
};

/**
 * Check if a date is a trading holiday for a specific exchange
 * @param date - Date in YYYY-MM-DD format
 * @param exchange - Exchange code
 * @returns Holiday check result
 */
export const isTradingHoliday = async (
  dateInput?: string,
  exchange: string = 'NSE'
): Promise<HolidayCheckResult> => {
  const date = dateInput ?? (new Date().toISOString().split('T')[0] as string);

  // LOW FIX P3-4: Add defensive type safety for date parsing
  const dateParts = date.split('-');
  const yearStr = dateParts[0] ?? '';
  const year = parseInt(yearStr, 10);
  if (!Number.isFinite(year) || year < 1900 || year > 2100) {
    logger.warn('[MarketService] Invalid year extracted from date:', date);
    return { isHoliday: false };
  }
  const holidays = await getMarketHolidays(year);

  const holiday = holidays.find((h) => h.date === date);

  if (!holiday) {
    return { isHoliday: false };
  }

  // Check if this exchange is closed
  if (holiday.closed_exchanges.includes(exchange)) {
    return {
      isHoliday: true,
      description: holiday.description,
      type: holiday.holiday_type,
    };
  }

  // Exchange might have special session timings
  const specialSession = holiday.open_exchanges.find((e) => e.exchange === exchange);
  if (specialSession) {
    return {
      isHoliday: false,
      description: holiday.description,
      type: holiday.holiday_type,
      specialSession: {
        start_time: specialSession.start_time,
        end_time: specialSession.end_time,
      },
    };
  }

  return { isHoliday: false };
};

/**
 * Get session boundaries for a specific date and exchange
 * Useful for indicators like VWAP, TPO that need session start/end times
 *
 * @param date - Date in YYYY-MM-DD format
 * @param exchange - Exchange code
 * @returns Times in epoch milliseconds
 */
export const getSessionBoundaries = async (
  dateInput?: string,
  exchange: string = 'NSE'
): Promise<SessionBoundaries | null> => {
  const date = dateInput ?? (new Date().toISOString().split('T')[0] as string);

  const timings = await getMarketTimings(date);
  const exchangeTiming = timings.find((t) => t.exchange === exchange);

  if (!exchangeTiming) {
    return null; // Market closed
  }

  return {
    start_time: exchangeTiming.start_time,
    end_time: exchangeTiming.end_time,
  };
};

/**
 * Get session boundaries with IST offset for chart display
 * Chart uses IST-offset timestamps for display consistency
 *
 * @param date - Date in YYYY-MM-DD format
 * @param exchange - Exchange code
 * @returns Times in epoch seconds with IST offset
 */
export const getSessionBoundariesIST = async (
  date?: string,
  exchange: string = 'NSE'
): Promise<SessionBoundaries | null> => {
  const boundaries = await getSessionBoundaries(date, exchange);

  if (!boundaries) {
    return null;
  }

  // Convert from milliseconds to seconds and add IST offset
  const IST_OFFSET_SECONDS = 19800; // 5h 30m
  return {
    start_time: Math.floor(boundaries.start_time / 1000) + IST_OFFSET_SECONDS,
    end_time: Math.floor(boundaries.end_time / 1000) + IST_OFFSET_SECONDS,
  };
};

/** Default timings by exchange */
const DEFAULT_TIMINGS: Record<string, DefaultTimings> = {
  NSE: { open: '09:15', close: '15:30' },
  BSE: { open: '09:15', close: '15:30' },
  NFO: { open: '09:15', close: '15:30' },
  BFO: { open: '09:15', close: '15:30' },
  CDS: { open: '09:00', close: '17:00' },
  BCD: { open: '09:00', close: '17:00' },
  MCX: { open: '09:00', close: '23:55' },
};

/**
 * Get default market timings (fallback when API is unavailable)
 * @param exchange - Exchange code
 * @returns Times in HH:MM IST format
 */
export const getDefaultTimings = (exchange: string = 'NSE'): DefaultTimings => {
  return DEFAULT_TIMINGS[exchange] ?? DEFAULT_TIMINGS['NSE']!;
};

/**
 * Clear all cached data
 * Useful when user changes API settings
 */
export const clearCache = (): void => {
  cache.holidays = { data: null, year: null, timestamp: 0 };
  cache.timings.clear();
  logger.debug('[MarketService] Cache cleared');
};

export default {
  getMarketHolidays,
  getMarketTimings,
  isMarketOpen,
  isTradingHoliday,
  getSessionBoundaries,
  getSessionBoundariesIST,
  getDefaultTimings,
  clearCache,
};

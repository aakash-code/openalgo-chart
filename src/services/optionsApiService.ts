/**
 * Options API Service
 * Handles option chain, greeks, and expiry data fetching
 */

import { getApiKey, getApiBase, getLoginUrl } from './api/config';
import logger from '../utils/logger';

// ==================== TYPES ====================

/** Option chain row from API */
export interface OptionChainRow {
  strike: number;
  ce?: {
    symbol?: string;
    ltp?: number;
    oi?: number;
    volume?: number;
    iv?: number;
  };
  pe?: {
    symbol?: string;
    ltp?: number;
    oi?: number;
    volume?: number;
    iv?: number;
  };
}

/** Option chain response */
export interface OptionChainResponse {
  underlying: string;
  underlyingLTP: number;
  underlyingPrevClose: number;
  expiryDate: string;
  atmStrike: number;
  chain: OptionChainRow[];
}

/** Option greeks response */
export interface OptionGreeksResponse {
  symbol: string;
  underlying: string;
  strike: number;
  optionType: string;
  expiryDate: string;
  daysToExpiry: number;
  spotPrice: number;
  optionPrice: number;
  iv: number;
  greeks: Record<string, number>;
}

/** Multi greeks response */
export interface MultiGreeksResponse {
  status: 'success' | 'partial' | 'error';
  data: OptionGreeksResponse[];
  summary: {
    total: number;
    success: number;
    failed: number;
  };
}

/** Symbol request for multi greeks */
export interface SymbolRequest {
  symbol: string;
  exchange?: string | undefined;
}

/** API error with code */
interface ApiError extends Error {
  code?: string;
  status?: number;
}

/** API response structure */
interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  underlying?: string;
  underlying_ltp?: string | number;
  underlying_prev_close?: string | number;
  expiry_date?: string;
  atm_strike?: string | number;
  chain?: OptionChainRow[];
  symbol?: string;
  strike?: string | number;
  option_type?: string;
  days_to_expiry?: number;
  spot_price?: string | number;
  option_price?: string | number;
  implied_volatility?: string | number;
  greeks?: Record<string, number>;
  summary?: { total: number; success: number; failed: number };
}

/**
 * Get Expiry Dates for Futures or Options
 * @param symbol - Underlying symbol (e.g., NIFTY, BANKNIFTY, RELIANCE)
 * @param exchange - Exchange code (NFO, BFO, MCX, CDS)
 * @param instrumentType - Type of instrument: 'futures' or 'options'
 * @returns Array of expiry dates in DD-MMM-YY format, or null on error
 */
export const getExpiry = async (
  symbol: string,
  exchange: string = 'NFO',
  instrumentType: string = 'options'
): Promise<string[] | null> => {
  try {
    const requestBody = {
      apikey: getApiKey(),
      symbol,
      exchange,
      instrumenttype: instrumentType,
    };

    logger.debug('[OptionsAPI] Expiry request:', requestBody);

    const response = await fetch(`${getApiBase()}/expiry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = getLoginUrl();
        return null;
      }
      if (response.status === 400) {
        const errorData = (await response.json().catch(() => ({}))) as { message?: string };
        logger.warn('[OptionsAPI] Expiry error:', errorData.message || response.statusText);
        return null;
      }
      throw new Error(`OpenAlgo expiry error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as ApiResponse<string[]>;
    logger.debug('[OptionsAPI] Expiry response:', data);

    if (data && data.status === 'success' && Array.isArray(data.data)) {
      return data.data;
    }

    return null;
  } catch (error) {
    logger.error('[OptionsAPI] Error fetching expiry dates:', error);
    return null;
  }
};

/**
 * Get Option Chain for an underlying
 * @param underlying - Underlying symbol (e.g., NIFTY, BANKNIFTY, RELIANCE)
 * @param exchange - Exchange code (NSE_INDEX, NSE, NFO, BSE_INDEX, BSE, BFO)
 * @param expiryDate - Optional expiry date in DDMMMYY format (e.g., 30DEC25)
 * @param strikeCount - Number of strikes above and below ATM (1-100)
 */
export const getOptionChain = async (
  underlying: string,
  exchange: string = 'NFO',
  expiryDate: string | null = null,
  strikeCount: number = 10
): Promise<OptionChainResponse | null> => {
  try {
    const requestBody: Record<string, unknown> = {
      apikey: getApiKey(),
      underlying,
      exchange,
      strike_count: strikeCount,
    };

    if (expiryDate) {
      requestBody['expiry_date'] = expiryDate;
    }

    logger.debug('[OptionsAPI] Option Chain request:', requestBody);

    const response = await fetch(`${getApiBase()}/optionchain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = getLoginUrl();
        return null;
      }
      if (response.status === 400) {
        const error: ApiError = new Error(`Symbol does not support F&O trading`);
        error.code = 'NO_FO_SUPPORT';
        error.status = 400;
        throw error;
      }
      throw new Error(`OpenAlgo optionchain error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as ApiResponse<unknown>;
    logger.debug('[OptionsAPI] Option Chain response:', data);

    if (data && data.status === 'success') {
      return {
        underlying: data.underlying || underlying,
        underlyingLTP: parseFloat(String(data.underlying_ltp || 0)),
        underlyingPrevClose: parseFloat(String(data.underlying_prev_close || 0)),
        expiryDate: data.expiry_date || '',
        atmStrike: parseFloat(String(data.atm_strike || 0)),
        chain: data.chain || [],
      };
    }

    return null;
  } catch (error) {
    logger.error('[OptionsAPI] Error fetching option chain:', error);
    return null;
  }
};

/**
 * Get Option Greeks for a specific option symbol
 * @param symbol - Option symbol (e.g., NIFTY02DEC2526000CE)
 * @param exchange - Exchange code (NFO, BFO, CDS, MCX)
 * @param options - Optional parameters (interest_rate, forward_price, etc.)
 */
export const getOptionGreeks = async (
  symbol: string,
  exchange: string = 'NFO',
  options: Record<string, unknown> = {}
): Promise<OptionGreeksResponse | null> => {
  try {
    const requestBody = {
      apikey: getApiKey(),
      symbol,
      exchange,
      ...options,
    };

    logger.debug('[OptionsAPI] Option Greeks request:', requestBody);

    const response = await fetch(`${getApiBase()}/optiongreeks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = getLoginUrl();
        return null;
      }
      throw new Error(`OpenAlgo optiongreeks error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as ApiResponse<unknown>;
    logger.debug('[OptionsAPI] Option Greeks response:', data);

    if (data && data.status === 'success') {
      return {
        symbol: data.symbol || symbol,
        underlying: data.underlying || '',
        strike: parseFloat(String(data.strike || 0)),
        optionType: data.option_type || '',
        expiryDate: data.expiry_date || '',
        daysToExpiry: data.days_to_expiry || 0,
        spotPrice: parseFloat(String(data.spot_price || 0)),
        optionPrice: parseFloat(String(data.option_price || 0)),
        iv: parseFloat(String(data.implied_volatility || 0)),
        greeks: data.greeks || {},
      };
    }

    return null;
  } catch (error) {
    logger.error('[OptionsAPI] Error fetching option greeks:', error);
    return null;
  }
};

// Internal helper for single batch request
const fetchMultiGreeksBatch = async (
  symbols: SymbolRequest[],
  options: Record<string, unknown> = {}
): Promise<MultiGreeksResponse | null> => {
  try {
    const requestBody = {
      apikey: getApiKey(),
      symbols: symbols.map((s) => ({
        symbol: s.symbol,
        exchange: s.exchange || 'NFO',
      })),
      ...options,
    };

    logger.debug('[OptionsAPI] Multi Option Greeks batch request:', { count: symbols.length });

    const response = await fetch(`${getApiBase()}/multioptiongreeks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = getLoginUrl();
        return null;
      }
      throw new Error(`OpenAlgo multioptiongreeks error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as ApiResponse<OptionGreeksResponse[]>;
    logger.debug('[OptionsAPI] Multi Option Greeks batch response:', data.summary);

    if (data && data.data) {
      return {
        status: (data.status as 'success' | 'partial' | 'error') || 'error',
        data: data.data || [],
        summary: data.summary || { total: symbols.length, success: 0, failed: symbols.length },
      };
    }

    return null;
  } catch (error) {
    logger.error('[OptionsAPI] Error fetching multi option greeks batch:', error);
    return null;
  }
};

/**
 * Get Option Greeks for multiple symbols in a single batch request
 * Much faster than individual calls - processes up to 50 symbols at once
 * @param symbols - Array of option symbols
 * @param options - Optional parameters (interest_rate, expiry_time)
 * @returns Response with data array and summary
 */
export const getMultiOptionGreeks = async (
  symbols: SymbolRequest[],
  options: Record<string, unknown> = {}
): Promise<MultiGreeksResponse> => {
  if (!symbols || symbols.length === 0) {
    logger.debug('[OptionsAPI] Multi Option Greeks: No symbols to fetch');
    return { status: 'success', data: [], summary: { total: 0, success: 0, failed: 0 } };
  }

  const MAX_BATCH_SIZE = 50;

  if (symbols.length <= MAX_BATCH_SIZE) {
    const result = await fetchMultiGreeksBatch(symbols, options);
    return result || { status: 'error', data: [], summary: { total: symbols.length, success: 0, failed: symbols.length } };
  }

  logger.debug(
    '[OptionsAPI] Multi Option Greeks: Batching',
    symbols.length,
    'symbols into chunks of',
    MAX_BATCH_SIZE
  );

  const allData: OptionGreeksResponse[] = [];
  let totalSuccess = 0;
  let totalFailed = 0;

  for (let i = 0; i < symbols.length; i += MAX_BATCH_SIZE) {
    const batch = symbols.slice(i, i + MAX_BATCH_SIZE);
    const result = await fetchMultiGreeksBatch(batch, options);

    if (result && Array.isArray(result.data)) {
      allData.push(...result.data);
      totalSuccess += result.summary?.success || 0;
      totalFailed += result.summary?.failed || 0;
    } else if (result) {
      logger.warn('[OptionsAPI] Invalid response data format:', result);
      totalFailed += batch.length;
    }
  }

  return {
    status: totalFailed === 0 ? 'success' : totalSuccess > 0 ? 'partial' : 'error',
    data: allData,
    summary: { total: symbols.length, success: totalSuccess, failed: totalFailed },
  };
};

/**
 * Fetch expiry dates for F&O instruments using the dedicated Expiry API
 * @param symbol - Underlying symbol (e.g., NIFTY, BANKNIFTY, RELIANCE, GOLD)
 * @param exchange - Exchange code (NFO, BFO, MCX, CDS)
 * @param instrumenttype - Type of instrument: 'futures' or 'options'
 * @returns Array of expiry dates in DD-MMM-YY format or null on error
 */
export const fetchExpiryDates = async (
  symbol: string,
  exchange: string = 'NFO',
  instrumenttype: string = 'options'
): Promise<string[] | null> => {
  try {
    const requestBody = {
      apikey: getApiKey(),
      symbol,
      exchange,
      instrumenttype,
    };

    logger.debug('[OptionsAPI] Expiry API request:', requestBody);

    const response = await fetch(`${getApiBase()}/expiry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = getLoginUrl();
        return null;
      }
      if (response.status === 400) {
        const error: ApiError = new Error(`No expiry dates found for ${symbol} in ${exchange}`);
        error.code = 'NO_EXPIRY_FOUND';
        error.status = 400;
        throw error;
      }
      throw new Error(`OpenAlgo expiry error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as ApiResponse<string[]>;
    logger.debug('[OptionsAPI] Expiry API response:', data);

    if (data && data.status === 'success' && Array.isArray(data.data)) {
      return data.data;
    }

    return null;
  } catch (error) {
    logger.error('[OptionsAPI] Error fetching expiry dates:', error);
    return null;
  }
};

export default {
  getExpiry,
  getOptionChain,
  getOptionGreeks,
  getMultiOptionGreeks,
  fetchExpiryDates,
};

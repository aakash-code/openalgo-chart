/**
 * OI Profile Service
 * Fetches and processes option chain data for OI Profile visualization
 */

import { getOptionChain } from './optionChain';
import logger from '../utils/logger';

/** Option leg data */
interface OptionLeg {
  oi?: number;
  volume?: number;
  ltp?: number;
  iv?: number;
}

/** Option chain row */
export interface OptionChainRow {
  strike: number;
  ce?: OptionLeg;
  pe?: OptionLeg;
  totalOI?: number;
}

/** Option chain response */
interface OptionChainData {
  underlying: string;
  atmStrike: number;
  underlyingLTP: number;
  underlyingPrevClose: number;
  expiryDate: string;
  chain: OptionChainRow[];
}

/** OI Profile result */
export interface OIProfileResult {
  underlying: string;
  atmStrike: number;
  underlyingLTP: number;
  underlyingPrevClose: number;
  expiryDate: string;
  chain: OptionChainRow[];
  totalCallOI: number;
  totalPutOI: number;
  totalOI: number;
  pcr: number;
  totalCallVolume: number;
  totalPutVolume: number;
  pcrVolume: number;
  timestamp: number;
}

/** Top strike info */
export interface TopStrike extends OptionChainRow {
  totalOI: number;
}

/** Max pain result */
export interface MaxPainResult {
  strike: number;
  totalPain: number;
}

/** OI Level */
export interface OILevel {
  strike: number;
  oi: number;
  type: 'support' | 'resistance';
}

/** OI Levels result */
export interface OILevelsResult {
  support: OILevel[];
  resistance: OILevel[];
}

/**
 * Fetch and process OI data for chart display
 * @param symbol - Underlying symbol (NIFTY, BANKNIFTY, RELIANCE, etc.)
 * @param exchange - Exchange (NFO for F&O, default)
 * @param expiry - Optional expiry date in DDMMMYY format
 * @param strikeCount - Number of strikes above/below ATM (default 20)
 * @returns Processed OI profile data or null on error
 */
export const fetchOIProfile = async (
  symbol: string,
  exchange: string = 'NFO',
  expiry: string | null = null,
  strikeCount: number = 20
): Promise<OIProfileResult | null> => {
  try {
    logger.debug('[OIProfileService] Fetching OI profile for:', { symbol, exchange, expiry, strikeCount });

    // Use the existing option chain service (with caching)
    const chain = (await getOptionChain(symbol, exchange, expiry, strikeCount)) as OptionChainData | null;

    if (!chain?.chain?.length) {
      logger.warn('[OIProfileService] No chain data for:', symbol);
      return null;
    }

    // Calculate totals and PCR
    let totalCallOI = 0;
    let totalPutOI = 0;
    let totalCallVolume = 0;
    let totalPutVolume = 0;

    chain.chain.forEach((row) => {
      totalCallOI += row.ce?.oi || 0;
      totalPutOI += row.pe?.oi || 0;
      totalCallVolume += row.ce?.volume || 0;
      totalPutVolume += row.pe?.volume || 0;
    });

    const pcr = totalCallOI > 0 ? totalPutOI / totalCallOI : 0;
    const pcrVolume = totalCallVolume > 0 ? totalPutVolume / totalCallVolume : 0;

    const result: OIProfileResult = {
      underlying: chain.underlying,
      atmStrike: chain.atmStrike,
      underlyingLTP: chain.underlyingLTP,
      underlyingPrevClose: chain.underlyingPrevClose,
      expiryDate: chain.expiryDate,
      chain: chain.chain,
      totalCallOI,
      totalPutOI,
      totalOI: totalCallOI + totalPutOI,
      pcr,
      totalCallVolume,
      totalPutVolume,
      pcrVolume,
      timestamp: Date.now(),
    };

    logger.debug('[OIProfileService] OI Profile data:', {
      symbol,
      strikes: result.chain.length,
      totalCallOI,
      totalPutOI,
      pcr: pcr.toFixed(2),
    });

    return result;
  } catch (error) {
    logger.error('[OIProfileService] Error fetching OI profile:', error);
    return null;
  }
};

/**
 * Get top N strikes by total OI (Call + Put)
 * @param chain - Option chain data
 * @param n - Number of top strikes (default 5)
 * @returns Top N strikes sorted by total OI
 */
export const getTopNStrikes = (chain: OptionChainRow[] | undefined, n: number = 5): TopStrike[] => {
  if (!chain?.length) return [];

  return [...chain]
    .map((row) => ({
      ...row,
      totalOI: (row.ce?.oi || 0) + (row.pe?.oi || 0),
    }))
    .sort((a, b) => b.totalOI - a.totalOI)
    .slice(0, n);
};

/**
 * Get strikes with highest Call OI
 * @param chain - Option chain data
 * @param n - Number of top strikes
 * @returns Top N strikes by Call OI
 */
export const getTopCallOIStrikes = (
  chain: OptionChainRow[] | undefined,
  n: number = 5
): OptionChainRow[] => {
  if (!chain?.length) return [];

  return [...chain]
    .sort((a, b) => (b.ce?.oi || 0) - (a.ce?.oi || 0))
    .slice(0, n);
};

/**
 * Get strikes with highest Put OI
 * @param chain - Option chain data
 * @param n - Number of top strikes
 * @returns Top N strikes by Put OI
 */
export const getTopPutOIStrikes = (
  chain: OptionChainRow[] | undefined,
  n: number = 5
): OptionChainRow[] => {
  if (!chain?.length) return [];

  return [...chain]
    .sort((a, b) => (b.pe?.oi || 0) - (a.pe?.oi || 0))
    .slice(0, n);
};

/**
 * Calculate Max Pain strike (strike with minimum net seller liability)
 * @param chain - Option chain data
 * @param lotSize - Lot size for the underlying
 * @returns Max pain strike info
 */
export const calculateMaxPain = (
  chain: OptionChainRow[] | undefined,
  lotSize: number = 1
): MaxPainResult | null => {
  if (!chain?.length) return null;

  let minPain = Infinity;
  let maxPainStrike: number | null = null;

  chain.forEach((row) => {
    const strike = row.strike;
    let pain = 0;

    // For each strike, calculate total loss to option sellers
    chain.forEach((r) => {
      // Call sellers' loss: sum of all calls with strike < current price
      if (r.ce && r.strike < strike) {
        pain += (strike - r.strike) * (r.ce.oi || 0) * lotSize;
      }
      // Put sellers' loss: sum of all puts with strike > current price
      if (r.pe && r.strike > strike) {
        pain += (r.strike - strike) * (r.pe.oi || 0) * lotSize;
      }
    });

    if (pain < minPain) {
      minPain = pain;
      maxPainStrike = strike;
    }
  });

  if (maxPainStrike === null) return null;

  return {
    strike: maxPainStrike,
    totalPain: minPain,
  };
};

/**
 * Get support and resistance levels based on OI
 * @param chain - Option chain data
 * @param atmStrike - ATM strike price
 * @returns Support and resistance levels
 */
export const getOILevels = (
  chain: OptionChainRow[] | undefined,
  atmStrike: number | undefined
): OILevelsResult => {
  if (!chain?.length || !atmStrike) return { support: [], resistance: [] };

  // Resistance: High Call OI above ATM
  const resistance: OILevel[] = chain
    .filter((r) => r.strike > atmStrike && r.ce?.oi && r.ce.oi > 0)
    .sort((a, b) => (b.ce?.oi || 0) - (a.ce?.oi || 0))
    .slice(0, 3)
    .map((r) => ({
      strike: r.strike,
      oi: r.ce!.oi!,
      type: 'resistance' as const,
    }));

  // Support: High Put OI below ATM
  const support: OILevel[] = chain
    .filter((r) => r.strike < atmStrike && r.pe?.oi && r.pe.oi > 0)
    .sort((a, b) => (b.pe?.oi || 0) - (a.pe?.oi || 0))
    .slice(0, 3)
    .map((r) => ({
      strike: r.strike,
      oi: r.pe!.oi!,
      type: 'support' as const,
    }));

  return { support, resistance };
};

export default {
  fetchOIProfile,
  getTopNStrikes,
  getTopCallOIStrikes,
  getTopPutOIStrikes,
  calculateMaxPain,
  getOILevels,
};

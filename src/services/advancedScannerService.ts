/**
 * Advanced Scanner Service
 * Handles batch data fetching and indicator calculation for the full-width screener.
 */

import { getKlines } from './openalgo';
import { 
  calculateSMA, 
  calculateEMA, 
  calculateRSI, 
  calculateMACD, 
  calculateBollingerBands,
  calculateVolumetricCandlePair,
  OHLCData
} from '../utils/indicators';
import logger from '../utils/logger';

// ==================== TYPES ====================

export interface ScreenerRow {
  symbol: string;
  exchange: string;
  name: string;
  
  // Price Data
  lastPrice: number;
  change: number;
  changePercent: number;
  volume: number;
  
  // Technical Indicators (computed)
  rsi?: number;
  sma50?: number;
  sma200?: number;
  ema20?: number;
  macd?: { macd: number; signal: number; histogram: number };
  bb?: { upper: number; lower: number; middle: number };
  volumetric?: string;
  
  // Status
  status: 'loading' | 'success' | 'error';
  error?: string;
  lastUpdated: number;
}

export interface ScannerProgress {
  total: number;
  completed: number;
  currentSymbol?: string;
}

export interface ScannerOptions {
  interval: string;
  indicators: ('rsi' | 'sma50' | 'sma200' | 'ema20' | 'macd' | 'bb' | 'volumetric')[];
}

// ==================== SERVICE ====================

/**
 * Scans a single symbol and returns technical metrics
 */
export async function scanSymbol(
  symbol: string,
  exchange: string,
  name: string,
  options: ScannerOptions
): Promise<ScreenerRow> {
  try {
    // 1. Fetch enough klines for indicators (at least 250 for 200 SMA)
    const klines = await getKlines(symbol, exchange, options.interval, 250);
    
    if (!klines || klines.length === 0) {
      throw new Error('No data returned');
    }

    const latest = klines[klines.length - 1];
    const prev = klines[klines.length - 2] || latest;
    
    const lastPrice = latest.close;
    const change = lastPrice - prev.close;
    const changePercent = (change / prev.close) * 100;
    
    const row: ScreenerRow = {
      symbol,
      exchange,
      name,
      lastPrice,
      change,
      changePercent,
      volume: latest.volume,
      status: 'success',
      lastUpdated: Date.now()
    };

    // 2. Map data for indicators
    const ohlcData: OHLCData[] = klines.map(k => ({
      time: k.time,
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close,
      volume: k.volume
    }));

    // 3. Compute indicators
    if (options.indicators.includes('rsi')) {
      const rsi = calculateRSI(ohlcData, 14);
      if (rsi.length > 0) row.rsi = rsi[rsi.length - 1].value;
    }

    if (options.indicators.includes('sma50')) {
      const sma = calculateSMA(ohlcData, 50);
      if (sma.length > 0) row.sma50 = sma[sma.length - 1].value;
    }

    if (options.indicators.includes('sma200')) {
      const sma = calculateSMA(ohlcData, 200);
      if (sma.length > 0) row.sma200 = sma[sma.length - 1].value;
    }

    if (options.indicators.includes('ema20')) {
      const ema = calculateEMA(ohlcData, 20);
      if (ema.length > 0) row.ema20 = ema[ema.length - 1].value;
    }

    if (options.indicators.includes('macd')) {
      const macd = calculateMACD(ohlcData);
      if (macd && macd.macdLine && macd.macdLine.length > 0) {
        row.macd = {
          macd: macd.macdLine[macd.macdLine.length - 1].value,
          signal: macd.signalLine[macd.signalLine.length - 1].value,
          histogram: macd.histogram[macd.histogram.length - 1].value
        };
      }
    }

    if (options.indicators.includes('bb')) {
      const bb = calculateBollingerBands(ohlcData);
      if (bb && bb.middle && bb.middle.length > 0) {
        row.bb = {
          middle: bb.middle[bb.middle.length - 1].value,
          upper: bb.upper[bb.upper.length - 1].value,
          lower: bb.lower[bb.lower.length - 1].value
        };
      }
    }

    if (options.indicators.includes('volumetric')) {
      const volPair = calculateVolumetricCandlePair(ohlcData, { 
        showBreakouts: true,
        useTrendFilter: true, // Use standard trend alignment for screener
        useDeltaFilter: true  // Use standard delta alignment
      });
      if (volPair && volPair.markers && volPair.markers.length > 0) {
        const lastMarker = volPair.markers[volPair.markers.length - 1];
        // Check if marker is very recent (last 3 bars)
        const markerTime = lastMarker.time;
        const lastTime = ohlcData[ohlcData.length - 1].time;
        
        // Find how many bars ago this marker was
        const markerIndex = ohlcData.findIndex(d => d.time === markerTime);
        if (markerIndex !== -1 && ohlcData.length - markerIndex <= 3) {
          row.volumetric = lastMarker.text;
        }
      }
    }

    return row;

  } catch (error) {
    logger.error(`Screener failed for ${symbol}:`, error);
    return {
      symbol,
      exchange,
      name,
      lastPrice: 0,
      change: 0,
      changePercent: 0,
      volume: 0,
      status: 'error',
      error: (error as Error).message,
      lastUpdated: Date.now()
    };
  }
}

/**
 * Scans a list of symbols in batches to avoid overwhelming the server
 */
export async function batchScan(
  stocks: { symbol: string; exchange: string; name: string }[],
  options: ScannerOptions,
  onProgress?: (progress: ScannerProgress) => void
): Promise<ScreenerRow[]> {
  const BATCH_SIZE = 5;
  const results: ScreenerRow[] = [];
  
  for (let i = 0; i < stocks.length; i += BATCH_SIZE) {
    const batch = stocks.slice(i, i + BATCH_SIZE);
    
    const batchResults = await Promise.all(
      batch.map(s => {
        if (onProgress) {
          onProgress({ 
            total: stocks.length, 
            completed: i, 
            currentSymbol: s.symbol 
          });
        }
        return scanSymbol(s.symbol, s.exchange, s.name, options);
      })
    );
    
    results.push(...batchResults);
    
    // Tiny delay between batches
    if (i + BATCH_SIZE < stocks.length) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  if (onProgress) {
    onProgress({ total: stocks.length, completed: stocks.length });
  }

  return results;
}

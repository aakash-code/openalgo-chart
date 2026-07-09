/**
 * Tradefinder Service - Market Radar & Regime Awareness
 * Calculates Pulse Score, Market Mode, and Sector Breadth
 */

import { getKlines } from './openalgo';
import { calculateSMA } from '../utils/indicators/sma';
import { calculateRSI } from '../utils/indicators/rsi';
import logger from '../utils/logger';
import { SECTOR_MAP, SECTORS } from '../components/PositionTracker/sectorMapping';

// ==================== TYPES ====================

/** Market Regime Mode */
export type MarketMode = 'TRENDING UP' | 'CHOPPY' | 'TRENDING DOWN' | 'NEUTRAL';

/** Sector Strength Info */
export interface SectorStrength {
  name: string;
  rsi: number;
  label: 'Leader' | 'Neutral' | 'Laggard';
  stockCount: number;
}

/** Market Radar (Regime Awareness) Data */
export interface MarketRadarData {
  pulseScore: number;
  marketMode: MarketMode;
  bullishStackPercent: number;
  stocksAbove20SMA: number;
  stocksAbove50SMA: number;
  sectorData: SectorStrength[];
  timestamp: number;
  totalScanned: number;
}

/** Scan options */
export interface ScanOptions {
  interval?: string;
}

/** Stock input for scanning */
export interface StockInput {
  symbol: string;
  exchange: string;
}

// ==================== SERVICE ====================

/**
 * Calculates Market Radar Data from a list of stocks
 */
export async function calculateMarketRadar(
  stocks: StockInput[],
  options: ScanOptions = {},
  onProgress?: (current: number, total: number) => void
): Promise<MarketRadarData> {
  const { interval = '1d' } = options;
  const total = stocks.length;
  
  let stocksAbove20Count = 0;
  let stocksAbove50Count = 0;
  let bullishStackCount = 0;
  
  const sectorAggregates: Record<string, { totalRsi: number; count: number }> = {};
  
  // Initialize sectors
  SECTORS.filter(s => s !== 'All').forEach(sector => {
    sectorAggregates[sector] = { totalRsi: 0, count: 0 };
  });

  for (let i = 0; i < stocks.length; i++) {
    if (onProgress) onProgress(i + 1, total);
    
    const stock = stocks[i];
    try {
      // Need at least 60 candles for 50 SMA and RSI(14)
      const klines = await getKlines(stock.symbol, stock.exchange, interval, 60);
      
      if (!klines || klines.length < 50) continue;

      const currentPrice = klines[klines.length - 1].close;
      
      // Calculate SMAs
      const sma10 = calculateSMA(klines, 10);
      const sma20 = calculateSMA(klines, 20);
      const sma50 = calculateSMA(klines, 50);
      
      const v10 = sma10.length > 0 ? sma10[sma10.length - 1].value : 0;
      const v20 = sma20.length > 0 ? sma20[sma20.length - 1].value : 0;
      const v50 = sma50.length > 0 ? sma50[sma50.length - 1].value : 0;
      
      // Breadth Metrics
      if (currentPrice > v20 && v20 > 0) stocksAbove20Count++;
      if (currentPrice > v50 && v50 > 0) stocksAbove50Count++;
      
      // Bullish Stack: Close > 10 SMA > 20 SMA > 50 SMA
      if (currentPrice > v10 && v10 > v20 && v20 > v50 && v50 > 0) {
        bullishStackCount++;
      }
      
      // RSI and Sector Aggregation
      const rsiValues = calculateRSI(klines, 14);
      const currentRsi = rsiValues.length > 0 ? rsiValues[rsiValues.length - 1].value : 50;
      
      const sector = SECTOR_MAP[stock.symbol] || 'Other';
      if (sectorAggregates[sector]) {
        sectorAggregates[sector].totalRsi += currentRsi;
        sectorAggregates[sector].count += 1;
      }

    } catch (err) {
      logger.error(`[Tradefinder] Failed to scan ${stock.symbol}`, err);
    }

    // Rate limiting delay
    if (i % 5 === 0) await new Promise(res => setTimeout(res, 50));
  }

  // Finalize Sector Data
  const sectorData: SectorStrength[] = Object.entries(sectorAggregates)
    .filter(([_, data]) => data.count > 0)
    .map(([name, data]) => {
      const avgRsi = data.totalRsi / data.count;
      let label: SectorStrength['label'] = 'Neutral';
      if (avgRsi > 60) label = 'Leader';
      else if (avgRsi < 40) label = 'Laggard';
      
      return {
        name,
        rsi: Math.round(avgRsi),
        label,
        stockCount: data.count
      };
    })
    .sort((a, b) => b.rsi - a.rsi);

  // Pulse Score Calculation: Average of % above 20 and % above 50
  const p20 = (stocksAbove20Count / total) * 100;
  const p50 = (stocksAbove50Count / total) * 100;
  const pulseScore = Math.round((p20 + p50) / 2);

  // Market Mode Detection
  let marketMode: MarketMode = 'CHOPPY';
  if (pulseScore > 70) marketMode = 'TRENDING UP';
  else if (pulseScore < 30) marketMode = 'TRENDING DOWN';
  else if (pulseScore > 50) marketMode = 'NEUTRAL';

  return {
    pulseScore,
    marketMode,
    bullishStackPercent: Math.round((bullishStackCount / total) * 100),
    stocksAbove20SMA: stocksAbove20Count,
    stocksAbove50SMA: stocksAbove50Count,
    sectorData,
    timestamp: Date.now(),
    totalScanned: total
  };
}

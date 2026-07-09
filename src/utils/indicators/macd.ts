/**
 * Moving Average Convergence Divergence (MACD) Indicator
 * Shows the relationship between two EMAs of closing prices
 */

import { OHLCData, MACDResult, TimeValuePoint, TimeValueColorPoint } from './types';

/**
 * Calculate MACD indicator
 * @param data - Array of OHLC data points with {time, open, high, low, close}
 * @param fastPeriod - Fast EMA period (default: 12)
 * @param slowPeriod - Slow EMA period (default: 26)
 * @param signalPeriod - Signal line period (default: 9)
 * @returns Object containing macdLine, signalLine, and histogram arrays
 */
export const calculateMACD = (
  data: OHLCData[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDResult => {
  if (!Array.isArray(data) || data.length < slowPeriod + signalPeriod || slowPeriod <= fastPeriod) {
    return { macdLine: [], signalLine: [], histogram: [] };
  }

  // Helper to calculate EMA
  const calcEMA = (values: number[], period: number): number[] => {
    const k = 2 / (period + 1);
    const ema: number[] = [];

    // First EMA is SMA
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += values[i];
    }
    let prevEma = sum / period;
    ema.push(prevEma);

    for (let i = period; i < values.length; i++) {
      prevEma = (values[i] - prevEma) * k + prevEma;
      ema.push(prevEma);
    }
    return ema;
  };

  // Extract close prices
  const closes = data.map(d => d.close);

  // Calculate fast and slow EMAs
  const fastEMA = calcEMA(closes, fastPeriod);
  const slowEMA = calcEMA(closes, slowPeriod);

  // Calculate MACD line (fast EMA - slow EMA)
  const macdValues: number[] = [];
  const startIndex = slowPeriod - fastPeriod;

  // HIGH FIX BUG-4: Add bounds check to prevent accessing fastEMA beyond its length
  for (let i = 0; i < slowEMA.length; i++) {
    const fastIndex = i + startIndex;
    if (fastIndex >= 0 && fastIndex < fastEMA.length) {
      macdValues.push(fastEMA[fastIndex] - slowEMA[i]);
    }
  }

  // Calculate signal line (EMA of MACD)
  const signalValues = calcEMA(macdValues, signalPeriod);

  // Build output arrays with time
  const macdLine: TimeValuePoint[] = [];
  const signalLine: TimeValuePoint[] = [];
  const histogram: TimeValueColorPoint[] = [];

  const dataOffset = slowPeriod - 1;
  const signalOffset = signalPeriod - 1;

  // MACD line starts at slowPeriod - 1
  for (let i = 0; i < macdValues.length; i++) {
    macdLine.push({
      time: data[dataOffset + i].time,
      value: macdValues[i]
    });
  }

  // Signal line starts signalPeriod after MACD starts
  for (let i = 0; i < signalValues.length; i++) {
    const idx = dataOffset + signalOffset + i;
    signalLine.push({
      time: data[idx].time,
      value: signalValues[i]
    });

    // Histogram is MACD - Signal
    const histogramValue = macdValues[signalOffset + i] - signalValues[i];
    histogram.push({
      time: data[idx].time,
      value: histogramValue,
      color: histogramValue >= 0 ? '#089981' : '#F23645'
    });
  }

  return { macdLine, signalLine, histogram };
};

/**
 * Relative Strength Index (RSI) Indicator
 * Measures the speed and magnitude of price changes using Wilder's smoothing method
 */

import { OHLCData, TimeValuePoint } from './types';

/**
 * Calculate Relative Strength Index
 * @param data - Array of OHLC data points with {time, open, high, low, close}
 * @param period - Number of periods (default: 14)
 * @returns Array of {time, value} objects where value is 0-100
 */
export const calculateRSI = (data: OHLCData[], period: number = 14): TimeValuePoint[] => {
  if (!Array.isArray(data) || data.length < period + 1 || period <= 0) {
    return [];
  }

  const rsiData: TimeValuePoint[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  // Calculate price changes
  for (let i = 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  // Calculate first average gain and loss (SMA)
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i++) {
    avgGain += gains[i];
    avgLoss += losses[i];
  }
  avgGain /= period;
  avgLoss /= period;

  // First RSI value
  const firstRS = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const firstRSI = 100 - (100 / (1 + firstRS));
  rsiData.push({ time: data[period].time, value: firstRSI });

  // Calculate subsequent RSI values using Wilder's smoothing
  // CRITICAL FIX BUG-3: Add bounds check to prevent accessing data[i+1] beyond array length
  for (let i = period; i < gains.length && (i + 1) < data.length; i++) {
    avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
    avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    rsiData.push({ time: data[i + 1].time, value: rsi });
  }

  return rsiData;
};

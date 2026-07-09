/**
 * Bollinger Bands Indicator
 * Shows price volatility using a middle SMA and upper/lower bands at standard deviations
 *
 * PERFORMANCE: Uses sliding window algorithm for O(n) complexity instead of O(n²)
 */

import { OHLCData, BollingerBandsResult, TimeValuePoint } from './types';

/**
 * Calculate Bollinger Bands using sliding window for O(n) performance
 * @param data - Array of OHLC data points with {time, open, high, low, close}
 * @param period - SMA period (default: 20)
 * @param stdDev - Number of standard deviations (default: 2)
 * @returns Object containing upper, middle, and lower band arrays
 */
export const calculateBollingerBands = (
  data: OHLCData[],
  period: number = 20,
  stdDev: number = 2
): BollingerBandsResult => {
  if (!Array.isArray(data) || data.length < period || period <= 0) {
    return { upper: [], middle: [], lower: [] };
  }

  // Defensive check to prevent division by zero
  const safePeriod = Math.max(1, period);

  const upper: TimeValuePoint[] = [];
  const middle: TimeValuePoint[] = [];
  const lower: TimeValuePoint[] = [];

  // Initialize sliding window sums for O(n) performance
  let windowSum = 0;
  let windowSumSquares = 0;

  // Build initial window
  for (let i = 0; i < safePeriod; i++) {
    const close = data[i].close;
    windowSum += close;
    windowSumSquares += close * close;
  }

  // Process first point
  let sma = windowSum / safePeriod;
  // Variance = E[X²] - E[X]² (using computational formula)
  let variance = (windowSumSquares / safePeriod) - (sma * sma);
  // Handle floating point errors that might make variance slightly negative
  let sd = Math.sqrt(Math.max(0, variance));

  middle.push({ time: data[safePeriod - 1].time, value: sma });
  upper.push({ time: data[safePeriod - 1].time, value: sma + (stdDev * sd) });
  lower.push({ time: data[safePeriod - 1].time, value: sma - (stdDev * sd) });

  // Slide window through remaining data
  for (let i = safePeriod; i < data.length; i++) {
    const newClose = data[i].close;
    const oldClose = data[i - safePeriod].close;

    // Update sums by removing old value and adding new value
    windowSum = windowSum - oldClose + newClose;
    windowSumSquares = windowSumSquares - (oldClose * oldClose) + (newClose * newClose);

    // Calculate new SMA and standard deviation
    sma = windowSum / safePeriod;
    variance = (windowSumSquares / safePeriod) - (sma * sma);
    sd = Math.sqrt(Math.max(0, variance));

    const time = data[i].time;
    middle.push({ time, value: sma });
    upper.push({ time, value: sma + (stdDev * sd) });
    lower.push({ time, value: sma - (stdDev * sd) });
  }

  return { upper, middle, lower };
};

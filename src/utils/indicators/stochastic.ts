/**
 * Stochastic Oscillator Indicator
 * Compares closing price to its price range over a period
 */

import { OHLCData, StochasticResult, TimeValuePoint } from './types';

/**
 * Calculate Stochastic Oscillator
 * @param data - Array of OHLC data points with {time, open, high, low, close}
 * @param kPeriod - %K lookback period (default: 14)
 * @param dPeriod - %D smoothing period (default: 3)
 * @param smooth - %K smoothing period (default: 3)
 * @returns Object containing kLine and dLine arrays
 */
export const calculateStochastic = (
  data: OHLCData[],
  kPeriod: number = 14,
  dPeriod: number = 3,
  smooth: number = 3
): StochasticResult => {
  if (!Array.isArray(data) || data.length < kPeriod + dPeriod + smooth - 2 || kPeriod <= 0) {
    return { kLine: [], dLine: [] };
  }

  const rawK: TimeValuePoint[] = [];
  const kLine: TimeValuePoint[] = [];
  const dLine: TimeValuePoint[] = [];

  // Calculate raw %K (Fast Stochastic)
  for (let i = kPeriod - 1; i < data.length; i++) {
    let highestHigh = -Infinity;
    let lowestLow = Infinity;

    for (let j = 0; j < kPeriod; j++) {
      highestHigh = Math.max(highestHigh, data[i - j].high);
      lowestLow = Math.min(lowestLow, data[i - j].low);
    }

    const range = highestHigh - lowestLow;
    const k = range === 0 ? 50 : ((data[i].close - lowestLow) / range) * 100;
    rawK.push({ time: data[i].time, value: k });
  }

  // Smooth %K to get Slow Stochastic %K
  for (let i = smooth - 1; i < rawK.length; i++) {
    let sum = 0;
    for (let j = 0; j < smooth; j++) {
      sum += rawK[i - j].value;
    }
    kLine.push({ time: rawK[i].time, value: sum / smooth });
  }

  // Calculate %D (SMA of %K)
  for (let i = dPeriod - 1; i < kLine.length; i++) {
    let sum = 0;
    for (let j = 0; j < dPeriod; j++) {
      sum += kLine[i - j].value;
    }
    dLine.push({ time: kLine[i].time, value: sum / dPeriod });
  }

  // Align %K output with %D (trim early values)
  const alignedK = kLine.slice(dPeriod - 1);

  return { kLine: alignedK, dLine };
};

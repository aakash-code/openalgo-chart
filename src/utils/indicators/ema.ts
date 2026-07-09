/**
 * Exponential Moving Average (EMA) Indicator
 * Calculates the exponentially weighted average price over a specified period
 */

import { OHLCData, TimeValuePoint } from './types';

/**
 * Calculate Exponential Moving Average
 * @param data - Array of OHLC data points with {time, open, high, low, close}
 * @param period - Number of periods to calculate the average
 * @returns Array of {time, value} objects representing EMA values
 */
export const calculateEMA = (data: OHLCData[], period: number): TimeValuePoint[] => {
  if (!Array.isArray(data) || data.length < period || period <= 0) {
    return [];
  }

  const emaData: TimeValuePoint[] = [];
  const k = 2 / (period + 1);

  // Start with SMA for the first EMA value
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i].close;
  }
  let prevEma = sum / period;
  emaData.push({ time: data[period - 1].time, value: prevEma });

  for (let i = period; i < data.length; i++) {
    const close = data[i].close;
    const ema = (close - prevEma) * k + prevEma;
    emaData.push({ time: data[i].time, value: ema });
    prevEma = ema;
  }
  return emaData;
};

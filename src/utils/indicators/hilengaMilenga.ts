/**
 * Hilenga-Milenga Indicator by NK Sir
 * A momentum oscillator combining RSI with EMA and WMA smoothing
 *
 * Components:
 * - RSI: Relative Strength Index
 * - EMA of RSI: Fast signal line (Price/EMA)
 * - WMA of RSI: Slow signal line (Strength/WMA)
 * - Midline at 50
 */

import { OHLCData, TimeValuePoint } from './types';

/**
 * Hilenga-Milenga calculation result
 */
export interface HilengaMilengaResult {
    rsiLine: TimeValuePoint[];
    emaLine: TimeValuePoint[];
    wmaLine: TimeValuePoint[];
}

/**
 * Latest Hilenga-Milenga values
 */
export interface LatestHilengaMilengaResult {
    rsi: number | null;
    ema: number | null;
    wma: number | null;
    signal: 'bullish' | 'bearish' | null;
}

/**
 * RSI value with time
 */
interface RSIValue {
    time: number;
    value: number;
}

/**
 * Calculate Hilenga-Milenga indicator
 *
 * @param data - Array of OHLC data points with {time, open, high, low, close}
 * @param rsiLength - RSI period (default: 9)
 * @param emaLength - EMA period for smoothing RSI (default: 3)
 * @param wmaLength - WMA period for smoothing RSI (default: 21)
 * @returns HilengaMilengaResult with rsiLine, emaLine, wmaLine
 */
export const calculateHilengaMilenga = (
    data: OHLCData[],
    rsiLength: number = 9,
    emaLength: number = 3,
    wmaLength: number = 21
): HilengaMilengaResult => {
    // Ensure parameters are integers
    const rsiLen = parseInt(String(rsiLength), 10) || 9;
    const emaLen = parseInt(String(emaLength), 10) || 3;
    const wmaLen = parseInt(String(wmaLength), 10) || 21;

    if (!Array.isArray(data) || data.length < Math.max(rsiLen, wmaLen) + 1) {
        return { rsiLine: [], emaLine: [], wmaLine: [] };
    }

    // Step 1: Calculate RSI
    const rsiValues = calculateRSIValues(data, rsiLen);

    if (rsiValues.length === 0) {
        return { rsiLine: [], emaLine: [], wmaLine: [] };
    }

    // Step 2: Calculate EMA of RSI
    const emaValues = calculateEMAOfValues(rsiValues.map(r => r.value), emaLen);

    // Step 3: Calculate WMA of RSI
    const wmaValues = calculateWMAOfValues(rsiValues.map(r => r.value), wmaLen);

    // Build output arrays with time alignment
    const rsiLine = rsiValues.map(r => ({ time: r.time, value: r.value }));

    // EMA line starts after emaLength - 1 RSI values
    const emaLine: TimeValuePoint[] = [];
    const emaStartIndex = emaLen - 1;
    for (let i = 0; i < emaValues.length; i++) {
        if (emaStartIndex + i < rsiValues.length) {
            emaLine.push({
                time: rsiValues[emaStartIndex + i].time,
                value: emaValues[i]
            });
        }
    }

    // WMA line starts after wmaLength - 1 RSI values
    const wmaLine: TimeValuePoint[] = [];
    const wmaStartIndex = wmaLen - 1;
    for (let i = 0; i < wmaValues.length; i++) {
        if (wmaStartIndex + i < rsiValues.length) {
            wmaLine.push({
                time: rsiValues[wmaStartIndex + i].time,
                value: wmaValues[i]
            });
        }
    }

    return { rsiLine, emaLine, wmaLine };
};

/**
 * Calculate RSI values from OHLC data
 */
const calculateRSIValues = (data: OHLCData[], period: number): RSIValue[] => {
    // Ensure period is integer
    const p = parseInt(String(period), 10);
    if (isNaN(p) || p <= 0 || data.length < p + 1) {
        return [];
    }

    const rsiData: RSIValue[] = [];
    const gains: number[] = [];
    const losses: number[] = [];

    // Calculate price changes
    // Check constraints to avoid loop errors
    if (data.length < 2) return [];

    for (let i = 1; i < data.length; i++) {
        // Safety check for data integrity
        if (!data[i] || !data[i - 1]) continue;

        const change = data[i].close - data[i - 1].close;
        gains.push(change > 0 ? change : 0);
        losses.push(change < 0 ? Math.abs(change) : 0);
    }

    if (gains.length < p) return [];

    // Calculate first average gain and loss (SMA)
    let avgGain = 0;
    let avgLoss = 0;
    for (let i = 0; i < p; i++) {
        avgGain += gains[i];
        avgLoss += losses[i];
    }
    avgGain /= p;
    avgLoss /= p;

    // First RSI value
    const firstRS = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const firstRSI = 100 - (100 / (1 + firstRS));

    // Safety check for data[p]
    if (data[p]) {
        rsiData.push({ time: data[p].time, value: firstRSI });
    }

    // Calculate subsequent RSI values using Wilder's smoothing
    for (let i = p; i < gains.length; i++) {
        avgGain = ((avgGain * (p - 1)) + gains[i]) / p;
        avgLoss = ((avgLoss * (p - 1)) + losses[i]) / p;

        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));

        if (data[i + 1]) {
            rsiData.push({ time: data[i + 1].time, value: rsi });
        }
    }

    return rsiData;
};

/**
 * Calculate EMA of a value array
 */
const calculateEMAOfValues = (values: number[], period: number): number[] => {
    if (!values || values.length < period) {
        return [];
    }

    const emaData: number[] = [];
    const k = 2 / (period + 1);

    // Start with SMA for the first EMA value
    let sum = 0;
    for (let i = 0; i < period; i++) {
        sum += values[i];
    }
    let prevEma = sum / period;
    emaData.push(prevEma);

    for (let i = period; i < values.length; i++) {
        const ema = (values[i] - prevEma) * k + prevEma;
        emaData.push(ema);
        prevEma = ema;
    }

    return emaData;
};

/**
 * Calculate WMA (Weighted Moving Average) of a value array
 * WMA gives more weight to recent prices
 */
const calculateWMAOfValues = (values: number[], period: number): number[] => {
    if (!values || values.length < period) {
        return [];
    }

    const wmaData: number[] = [];
    const weightSum = (period * (period + 1)) / 2; // Sum of weights 1+2+3+...+period

    for (let i = period - 1; i < values.length; i++) {
        let weightedSum = 0;
        for (let j = 0; j < period; j++) {
            // Weight increases from 1 to period (most recent has highest weight)
            weightedSum += values[i - period + 1 + j] * (j + 1);
        }
        wmaData.push(weightedSum / weightSum);
    }

    return wmaData;
};

/**
 * Get the latest Hilenga-Milenga values for display
 */
export const getLatestHilengaMilenga = (
    data: OHLCData[],
    rsiLength: number = 9,
    emaLength: number = 3,
    wmaLength: number = 21
): LatestHilengaMilengaResult => {
    const result = calculateHilengaMilenga(data, rsiLength, emaLength, wmaLength);

    const latestRSI = result.rsiLine.length > 0 ? result.rsiLine[result.rsiLine.length - 1].value : null;
    const latestEMA = result.emaLine.length > 0 ? result.emaLine[result.emaLine.length - 1].value : null;
    const latestWMA = result.wmaLine.length > 0 ? result.wmaLine[result.wmaLine.length - 1].value : null;

    return {
        rsi: latestRSI,
        ema: latestEMA,
        wma: latestWMA,
        // Signal interpretation
        signal: latestRSI !== null ? (latestRSI > 50 ? 'bullish' : 'bearish') : null
    };
};

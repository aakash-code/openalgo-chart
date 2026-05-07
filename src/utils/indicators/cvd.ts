/**
 * Cumulative Volume Delta (CVD) Indicator
 * 
 * CVD is a technical indicator that sums the volume delta over a period of time.
 * Volume delta is the difference between buy volume and sell volume for a given price bar.
 * 
 * Since we don't have true tick data (buy vs sell volume), we approximate delta using 
 * candle direction and body/wick ratios.
 */

import { OHLCData, CVDResult, CVDOptions } from './types';
import { getISTComponents } from './timeUtils';

/**
 * Calculate Cumulative Volume Delta
 * 
 * @param data - OHLCV data
 * @param options - CVD calculation options
 * @returns Array of CVD points as candles
 */
export const calculateCVD = (data: OHLCData[], options: CVDOptions = {}): CVDResult[] => {
    if (!data || data.length === 0) return [];

    const { anchor = 'session' } = options;
    const results: CVDResult[] = [];
    let cumulativeDelta = 0;
    let lastDateStr = '';

    for (let i = 0; i < data.length; i++) {
        const bar = data[i];
        
        // Session Reset Logic
        if (anchor === 'session') {
            const { dateStr } = getISTComponents(bar.time);
            if (lastDateStr && dateStr !== lastDateStr) {
                cumulativeDelta = 0;
            }
            lastDateStr = dateStr;
        }

        const volume = bar.volume || 0;
        
        // PRO Wick-Based Volume Partitioning (Institutional Grade)
        // Buying Pressure = Vol * (Close - Low) / (High - Low)
        // Selling Pressure = Vol * (High - Close) / (High - Low)
        
        let delta = 0;
        const range = bar.high - bar.low;
        
        if (range > 0) {
            const buyingPressure = volume * (bar.close - bar.low) / range;
            const sellingPressure = volume * (bar.high - bar.close) / range;
            delta = buyingPressure - sellingPressure;
        } else {
            // Doji or no range - use minimal logic
            delta = 0;
        }

        const open = cumulativeDelta;
        cumulativeDelta += delta;
        const close = cumulativeDelta;
        
        // High/Low for the CVD candle
        const high = Math.max(open, close);
        const low = Math.min(open, close);

        results.push({
            time: bar.time,
            open,
            high,
            low,
            close,
            delta
        });
    }

    return results;
};

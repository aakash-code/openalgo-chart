/**
 * First Red Candle Indicator
 * Identifies the first RED candle after market open (9:15 AM IST) on 5-minute charts,
 * tracks its high/low for stop loss levels.
 */

import { getISTComponents, isMarketHours, groupCandlesByDay } from './timeUtils';
import { OHLCData } from './types';

/**
 * Chart marker for first candle indicator
 */
export interface FirstCandleMarker {
    time: number;
    position: 'aboveBar' | 'belowBar';
    color: string;
    shape: 'arrowUp' | 'arrowDown';
    text: string;
}

/**
 * Price levels from first red candle
 */
export interface FirstCandleLevels {
    high: number;
    low: number;
    date: string;
    startTime: number;
    endTime: number;
}

/**
 * Day data for first candle indicator
 */
export interface FirstCandleDayData {
    date: string;
    firstRedCandle: OHLCData;
    levels: FirstCandleLevels;
    markers: FirstCandleMarker[];
}

/**
 * First candle calculation result
 */
export interface FirstCandleResult {
    days: FirstCandleDayData[];
    allMarkers: FirstCandleMarker[];
    allLevels: FirstCandleLevels[];
    currentDayLevels: FirstCandleLevels | null;
}

/**
 * First candle options
 */
export interface FirstCandleOptions {
    highlightColor?: string;
    signalColor?: string;
    highLineColor?: string;
    lowLineColor?: string;
}

/**
 * Check if a candle is a red candle (bearish - close < open)
 * @param candle - Candle with open/close
 * @returns True if red candle
 */
const isRedCandle = (candle: OHLCData): boolean => {
    return candle.close < candle.open;
};

/**
 * Calculate First Red Candle indicator data
 * @param data - Array of OHLC candles
 * @param options - Configuration options
 * @returns First candle result with days, markers, levels
 */
export const calculateFirstCandle = (
    data: OHLCData[],
    options: FirstCandleOptions = {}
): FirstCandleResult => {
    const {
        highlightColor = '#FFD700',    // Gold for first red candle marker
        signalColor = '#ef5350',       // Red for signal marker
        highLineColor = '#ef5350',     // Red for high line
        lowLineColor = '#26a69a'       // Green for low line
    } = options;

    if (!Array.isArray(data) || data.length === 0) {
        return { days: [], allMarkers: [], allLevels: [], currentDayLevels: null };
    }

    // Group candles by trading day
    const dayMap = groupCandlesByDay(data);

    const days: FirstCandleDayData[] = [];
    const allMarkers: FirstCandleMarker[] = [];
    const allLevels: FirstCandleLevels[] = [];

    // Process each trading day
    for (const [dateStr, dayCandles] of dayMap) {
        // Sort by time to ensure order
        dayCandles.sort((a, b) => a.time - b.time);

        // Filter candles to market hours only
        const marketCandles = dayCandles.filter(c => isMarketHours(c.time));

        if (marketCandles.length === 0) continue;

        // Find the FIRST RED CANDLE of the day (after market open)
        const firstRedCandle = marketCandles.find(c => isRedCandle(c));

        if (!firstRedCandle) continue; // Skip days without any red candle

        // Get last candle of the day for line end time
        const lastCandle = marketCandles[marketCandles.length - 1];

        // Skip if start and end times are the same (first red candle is also the last candle)
        // This prevents duplicate timestamp errors in lightweight-charts
        if (firstRedCandle.time === lastCandle.time) continue;

        // Create levels from FIRST RED CANDLE (not 9:15 candle)
        const levels: FirstCandleLevels = {
            high: firstRedCandle.high,
            low: firstRedCandle.low,
            date: dateStr,
            startTime: firstRedCandle.time,
            endTime: lastCandle.time
        };

        // Create markers
        const dayMarkers: FirstCandleMarker[] = [];

        // Marker for first red candle
        dayMarkers.push({
            time: firstRedCandle.time,
            position: 'aboveBar',
            color: highlightColor,
            shape: 'arrowDown',
            text: 'FRC: 1st Red'
        });

        days.push({
            date: dateStr,
            firstRedCandle,
            levels,
            markers: dayMarkers
        });

        allMarkers.push(...dayMarkers);
        allLevels.push(levels);
    }

    // Get current/latest day's levels for price lines
    const currentDayLevels = days.length > 0 ? days[days.length - 1].levels : null;

    return {
        days,
        allMarkers,
        allLevels,
        currentDayLevels
    };
};

/**
 * Get only the latest trading day's first red candle data
 * @param data - Array of OHLC candles
 * @returns Latest day's first red candle info or null
 */
export const getLatestFirstCandle = (data: OHLCData[]): FirstCandleDayData | null => {
    const result = calculateFirstCandle(data);

    if (result.days.length === 0) {
        return null;
    }

    return result.days[result.days.length - 1];
};

export default calculateFirstCandle;

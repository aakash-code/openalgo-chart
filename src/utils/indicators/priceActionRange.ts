/**
 * Price Action Range (PAR) Indicator
 *
 * Identifies buyer/seller strength from the first candle after market open,
 * creates dynamic support/resistance levels, and signals breakout/breakdown trades.
 * Works on ALL timeframes dynamically.
 *
 * Strategy:
 * 1. First GREEN candle: LOW = Support (buyers' level)
 * 2. First RED candle: HIGH = Resistance (sellers' level)
 * 3. Wait for opposite candle to complete the range
 * 4. Signal breakout (close above resistance) or breakdown (close below support)
 */

import { getISTComponents, isMarketHours } from './timeUtils';
import { OHLCData } from './types';

/**
 * Signal from price action range
 */
export interface PARSignal {
    time: number;
    type: 'breakout' | 'breakdown';
    price: number;
    stopLoss: number;
    entryLevel: number;
}

/**
 * First candle info
 */
export interface PARFirstCandle extends OHLCData {
    isGreen: boolean;
    level: number;
}

/**
 * Opposite candle info
 */
export interface PAROppositeCandle extends OHLCData {
    level: number;
}

/**
 * Range information
 */
export interface PARRange {
    support?: number;
    resistance?: number;
    isComplete: boolean;
    startTime: number;
    endTime: number;
}

/**
 * Day data for PAR indicator
 */
export interface PARDayData {
    date: string;
    firstCandle: PARFirstCandle;
    oppositeCandle: PAROppositeCandle | null;
    range: PARRange;
    signals: PARSignal[];
}

/**
 * Level line data
 */
export interface PARLevelLine {
    type: 'support' | 'resistance';
    value: number;
    startTime: number;
    endTime: number;
    date: string;
    color: string;
}

/**
 * Price action range calculation result
 */
export interface PARResult {
    days: PARDayData[];
    allLevels: PARLevelLine[];
}

/**
 * Price action range options
 */
export interface PAROptions {
    supportColor?: string;
    resistanceColor?: string;
}

/**
 * Check if a candle is green (bullish - close >= open)
 * @param candle - Candle with open/close
 * @returns True if green candle
 */
const isGreenCandle = (candle: OHLCData): boolean => {
    return candle.close >= candle.open;
};

/**
 * Check if a candle is red (bearish - close < open)
 * @param candle - Candle with open/close
 * @returns True if red candle
 */
const isRedCandle = (candle: OHLCData): boolean => {
    return candle.close < candle.open;
};

/**
 * Detect if data is intraday based on candle timestamps
 * @param data - Array of OHLC candles
 * @returns True if intraday data
 */
const isIntradayData = (data: OHLCData[]): boolean => {
    if (data.length < 2) return false;

    // Check if multiple candles exist on the same day
    const firstDate = getISTComponents(data[0].time).dateStr;
    for (let i = 1; i < Math.min(data.length, 10); i++) {
        const candleDate = getISTComponents(data[i].time).dateStr;
        if (candleDate === firstDate) {
            return true; // Multiple candles on same day = intraday
        }
    }
    return false;
};

/**
 * Calculate Price Action Range indicator data
 * Works on all timeframes dynamically
 * @param data - Array of OHLC candles
 * @param options - Configuration options
 * @returns PAR result with days and levels
 */
export const calculatePriceActionRange = (
    data: OHLCData[],
    options: PAROptions = {}
): PARResult => {
    const {
        supportColor = '#26a69a',      // Green
        resistanceColor = '#ef5350',   // Red
    } = options;

    if (!Array.isArray(data) || data.length === 0) {
        return { days: [], allLevels: [] };
    }

    const isIntraday = isIntradayData(data);

    // Get the latest candle timestamp - lines will extend to this point
    const latestCandleTime = data[data.length - 1].time;

    // Group candles by trading day
    const dayMap = new Map<string, OHLCData[]>();

    for (const candle of data) {
        const { dateStr } = getISTComponents(candle.time);
        if (!dayMap.has(dateStr)) {
            dayMap.set(dateStr, []);
        }
        dayMap.get(dateStr)!.push(candle);
    }

    const days: PARDayData[] = [];
    const allLevels: PARLevelLine[] = [];

    // Process each trading day
    for (const [dateStr, dayCandles] of dayMap) {
        // Sort by time to ensure order
        dayCandles.sort((a, b) => a.time - b.time);

        let workingCandles: OHLCData[];

        if (isIntraday) {
            // For intraday: filter to market hours only
            workingCandles = dayCandles.filter(c => isMarketHours(c.time));
        } else {
            // For daily/weekly/monthly: use all candles (each is a complete period)
            workingCandles = dayCandles;
        }

        if (workingCandles.length === 0) continue;

        // Get the first candle of the day/period
        const firstCandleOfDay = workingCandles[0];

        const firstCandleIsGreen = isGreenCandle(firstCandleOfDay);
        const firstCandleIndex = 0;

        // Get candles after first candle
        const remainingCandles = workingCandles.slice(firstCandleIndex + 1);

        // Find the opposite candle to complete the range
        let oppositeCandle: OHLCData | null = null;

        if (firstCandleIsGreen) {
            // First candle is GREEN: LOW = Support, wait for RED candle for Resistance
            oppositeCandle = remainingCandles.find(c => isRedCandle(c)) || null;
        } else {
            // First candle is RED: HIGH = Resistance, wait for GREEN candle for Support
            oppositeCandle = remainingCandles.find(c => isGreenCandle(c)) || null;
        }

        // Calculate range levels
        let support: number | undefined;
        let resistance: number | undefined;
        let rangeComplete = false;
        let supportTime: number | undefined;
        let resistanceTime: number | undefined;

        if (firstCandleIsGreen) {
            // GREEN first: LOW = Support
            support = firstCandleOfDay.low;
            supportTime = firstCandleOfDay.time;

            if (oppositeCandle) {
                // RED candle found: HIGH = Resistance
                resistance = oppositeCandle.high;
                resistanceTime = oppositeCandle.time;
                rangeComplete = true;
            }
        } else {
            // RED first: HIGH = Resistance
            resistance = firstCandleOfDay.high;
            resistanceTime = firstCandleOfDay.time;

            if (oppositeCandle) {
                // GREEN candle found: LOW = Support
                support = oppositeCandle.low;
                supportTime = oppositeCandle.time;
                rangeComplete = true;
            }
        }

        // Get the start time for drawing lines (when range is formed)
        const rangeStartTime = rangeComplete
            ? Math.max(firstCandleOfDay.time, oppositeCandle?.time || firstCandleOfDay.time)
            : firstCandleOfDay.time;

        // Get last candle of the day for line end time
        const lastCandle = workingCandles[workingCandles.length - 1];

        // Find breakout/breakdown signals
        const signals: PARSignal[] = [];

        if (rangeComplete && support !== undefined && resistance !== undefined) {
            const candlesAfterRange = workingCandles.filter(c => c.time > rangeStartTime);

            let breakoutFound = false;
            let breakdownFound = false;

            for (const candle of candlesAfterRange) {
                // Breakout: Close above resistance
                if (!breakoutFound && candle.close > resistance) {
                    // Find the swing low before breakout for stop loss
                    const candlesBeforeSignal = workingCandles.filter(c => c.time < candle.time && c.time >= rangeStartTime);
                    const swingLow = candlesBeforeSignal.length > 0
                        ? Math.min(...candlesBeforeSignal.map(c => c.low))
                        : support;

                    signals.push({
                        time: candle.time,
                        type: 'breakout',
                        price: candle.close,
                        stopLoss: swingLow,
                        entryLevel: resistance
                    });
                    breakoutFound = true;
                }

                // Breakdown: Close below support
                if (!breakdownFound && candle.close < support) {
                    // Find the swing high before breakdown for stop loss
                    const candlesBeforeSignal = workingCandles.filter(c => c.time < candle.time && c.time >= rangeStartTime);
                    const swingHigh = candlesBeforeSignal.length > 0
                        ? Math.max(...candlesBeforeSignal.map(c => c.high))
                        : resistance;

                    signals.push({
                        time: candle.time,
                        type: 'breakdown',
                        price: candle.close,
                        stopLoss: swingHigh,
                        entryLevel: support
                    });
                    breakdownFound = true;
                }

                // Only take first signal of each type per day
                if (breakoutFound && breakdownFound) break;
            }
        }

        // Create day data
        const dayData: PARDayData = {
            date: dateStr,
            firstCandle: {
                ...firstCandleOfDay,
                isGreen: firstCandleIsGreen,
                level: firstCandleIsGreen ? (support || 0) : (resistance || 0)
            },
            oppositeCandle: oppositeCandle ? {
                ...oppositeCandle,
                level: firstCandleIsGreen ? (resistance || 0) : (support || 0)
            } : null,
            range: {
                support,
                resistance,
                isComplete: rangeComplete,
                startTime: rangeStartTime,
                endTime: lastCandle.time
            },
            signals
        };

        days.push(dayData);

        // Add levels for drawing - extend lines to the latest candle (current time)
        if (support !== undefined) {
            allLevels.push({
                type: 'support',
                value: support,
                startTime: supportTime || rangeStartTime,
                endTime: latestCandleTime,
                date: dateStr,
                color: supportColor
            });
        }

        if (resistance !== undefined) {
            allLevels.push({
                type: 'resistance',
                value: resistance,
                startTime: resistanceTime || rangeStartTime,
                endTime: latestCandleTime,
                date: dateStr,
                color: resistanceColor
            });
        }
    }

    return {
        days,
        allLevels
    };
};

/**
 * Get only the latest trading day's price action range data
 * @param data - Array of OHLC candles
 * @returns Latest day's data or null
 */
export const getLatestPriceActionRange = (data: OHLCData[]): PARDayData | null => {
    const result = calculatePriceActionRange(data);

    if (result.days.length === 0) {
        return null;
    }

    return result.days[result.days.length - 1];
};

export default calculatePriceActionRange;

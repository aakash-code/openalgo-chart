/**
 * Time Utilities for Indian Stock Market Indicators
 * Shared utilities for IST time conversions and market hours checks.
 */

import { OHLCData } from './types';

/**
 * IST time components
 */
export interface ISTComponents {
    hours: number;
    minutes: number;
    dateStr: string;
}

/**
 * Market time configuration
 */
export interface MarketTime {
    hours: number;
    minutes: number;
}

/**
 * Convert timestamp to IST date components
 * Note: The candle data already has IST offset applied from the API
 * @param timestamp - Unix timestamp in seconds (already in IST)
 * @returns IST components with hours, minutes, and dateStr
 */
export const getISTComponents = (timestamp: number): ISTComponents => {
    const date = new Date(timestamp * 1000);
    return {
        hours: date.getUTCHours(),
        minutes: date.getUTCMinutes(),
        dateStr: date.toISOString().split('T')[0] // YYYY-MM-DD
    };
};

/**
 * Check if a candle is within market hours (9:15 AM - 3:30 PM IST)
 * @param timestamp - Unix timestamp in seconds
 * @returns True if within market hours
 */
export const isMarketHours = (timestamp: number): boolean => {
    const { hours, minutes } = getISTComponents(timestamp);
    const timeInMinutes = hours * 60 + minutes;
    const marketOpen = 9 * 60 + 15;  // 9:15 AM
    const marketClose = 15 * 60 + 30; // 3:30 PM
    return timeInMinutes >= marketOpen && timeInMinutes <= marketClose;
};

/**
 * Check if a candle is within a specific time window
 * @param timestamp - Unix timestamp in seconds
 * @param startHour - Window start hour
 * @param startMinute - Window start minute
 * @param endHour - Window end hour
 * @param endMinute - Window end minute
 * @returns True if within the time window
 */
export const isInTimeWindow = (
    timestamp: number,
    startHour: number,
    startMinute: number,
    endHour: number,
    endMinute: number
): boolean => {
    const { hours, minutes } = getISTComponents(timestamp);
    const timeInMinutes = hours * 60 + minutes;
    const windowStart = startHour * 60 + startMinute;
    const windowEnd = endHour * 60 + endMinute;
    return timeInMinutes >= windowStart && timeInMinutes < windowEnd;
};

/**
 * Check if a candle is after a specific time
 * @param timestamp - Unix timestamp in seconds
 * @param hour - Hour to check against
 * @param minute - Minute to check against
 * @returns True if after the specified time
 */
export const isAfterTime = (timestamp: number, hour: number, minute: number): boolean => {
    const { hours, minutes } = getISTComponents(timestamp);
    const timeInMinutes = hours * 60 + minutes;
    const targetTime = hour * 60 + minute;
    return timeInMinutes >= targetTime;
};

/**
 * Get market open time for IST (9:15 AM)
 * @returns Market open time configuration
 */
export const getMarketOpenTime = (): MarketTime => ({
    hours: 9,
    minutes: 15
});

/**
 * Get market close time for IST (3:30 PM)
 * @returns Market close time configuration
 */
export const getMarketCloseTime = (): MarketTime => ({
    hours: 15,
    minutes: 30
});

/**
 * Convert hours and minutes to total minutes since midnight
 * @param hours - Hours component
 * @param minutes - Minutes component
 * @returns Total minutes since midnight
 */
export const toMinutesSinceMidnight = (hours: number, minutes: number): number => {
    return hours * 60 + minutes;
};

/**
 * Group candles by trading day
 * @param data - Array of candles with time property
 * @returns Map of dateStr to candles array
 */
export const groupCandlesByDay = (data: OHLCData[]): Map<string, OHLCData[]> => {
    const dayMap = new Map<string, OHLCData[]>();

    for (const candle of data) {
        const { dateStr } = getISTComponents(candle.time);
        if (!dayMap.has(dateStr)) {
            dayMap.set(dateStr, []);
        }
        dayMap.get(dateStr)!.push(candle);
    }

    return dayMap;
};

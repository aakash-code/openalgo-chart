/**
 * TPO (Time Price Opportunity) Profile Indicator
 * Also known as Market Profile - shows price distribution over time
 *
 * TPO measures where price spent the most TIME, not volume.
 * Each 30-minute period is assigned a letter (A, B, C...) and marks
 * all price levels touched during that period.
 *
 * Key concepts:
 * - POC (Point of Control): Price level with most TPOs (fair value)
 * - Value Area: Price range containing 70% of TPOs (VAH/VAL)
 * - Initial Balance: First hour range (A+B periods)
 * - Rotation Factor: Measures price extension (+1 up, -1 down per period)
 * - Single Prints: Price levels with only 1 TPO (fast price movement)
 * - Poor High/Low: Session extremes with few TPOs (weak support/resistance)
 */

import { BLOCK_SIZE_MAP, DEFAULT_BLOCK_SIZE, BlockSizeKey } from '../../plugins/tpo-profile/TPOConstants';
import { OHLCData } from './types';
import {
    calculateAutoTickSize,
    getPriceLevels,
    getTPOLetter,
    parseTimeToMinutes,
    getDateString,
    getMinutesFromMidnight,
    calculateValueArea,
    calculateRotationFactor,
    detectPoorHighLow,
    detectSinglePrints,
    TPOPriceLevelData,
    TPOPeriodInfo,
} from './tpoCalculations';

/**
 * TPO calculation options
 */
export interface TPOOptions {
    tickSize?: number | 'auto';
    blockSize?: string;
    periodMinutes?: number;
    sessionType?: 'daily' | 'weekly' | 'custom';
    sessionStart?: string;
    sessionEnd?: string;
    valueAreaPercent?: number;
    allHours?: boolean;
    poorThreshold?: number;
    interval?: string;
    timezone?: string;
}

/**
 * TPO profile session data
 */
export interface TPOSessionData {
    sessionKey: string;
    sessionStart: number;
    sessionEnd: number;
    tickSize: number;
    blockSize: string;
    periods: TPOPeriodInfo[];
    priceLevels: Map<number, TPOPriceLevelData>;
    poc: number;
    vah: number;
    val: number;
    ibHigh: number;
    ibLow: number;
    rangeHigh: number;
    rangeLow: number;
    totalTPOs: number;
    openPrice: number;
    closePrice: number;
    rotationFactor: number;
    poorHigh: number | null;
    poorLow: number | null;
    singlePrints: number[];
    midpoint: number;
}

/**
 * TPO render data point
 */
export interface TPORenderDataPoint {
    price: number;
    tpoCount: number;
    letters: string[];
    isInitialBalance: boolean;
    isPOC: boolean;
    isValueArea: boolean;
    isVAH: boolean;
    isVAL: boolean;
}

/**
 * TPO render options
 */
export interface TPORenderOptions {
    showLetters?: boolean;
    maxLettersPerRow?: number;
}

/**
 * Convert block size string to minutes
 * @param blockSize - Block size ('30m', '1h', etc.) or number
 * @returns Period in minutes
 */
const parseBlockSize = (blockSize: string | number): number => {
    if (typeof blockSize === 'number') {
        return blockSize;
    }
    return BLOCK_SIZE_MAP[blockSize as BlockSizeKey] || BLOCK_SIZE_MAP[DEFAULT_BLOCK_SIZE];
};

/**
 * Calculate TPO for higher timeframes (daily/weekly candles)
 * Each candle becomes a separate period/letter
 * All candles are combined into a single profile
 */
const calculateHigherTimeframeTPO = (
    data: OHLCData[],
    tickSize: number,
    valueAreaPercent: number,
    poorThreshold: number,
    blockSize: string
): TPOSessionData[] => {
    if (!data || data.length === 0) return [];

    const sessionData: TPOSessionData = {
        sessionKey: 'composite',
        sessionStart: data[0].time,
        sessionEnd: data[data.length - 1].time,
        tickSize,
        blockSize,
        periods: [],
        priceLevels: new Map(),
        poc: 0,
        vah: 0,
        val: 0,
        ibHigh: 0,
        ibLow: Infinity,
        rangeHigh: 0,
        rangeLow: Infinity,
        totalTPOs: 0,
        openPrice: data[0].open,
        closePrice: data[data.length - 1].close,
        rotationFactor: 0,
        poorHigh: null,
        poorLow: null,
        singlePrints: [],
        midpoint: 0,
    };

    // Process each candle as a separate period
    data.forEach((candle, index) => {
        const letter = getTPOLetter(index);

        // Track period info
        sessionData.periods.push({
            letter,
            startTime: candle.time,
            endTime: candle.time,
        });

        // Get all price levels touched by this candle
        const levels = getPriceLevels(candle.low, candle.high, tickSize);

        for (const price of levels) {
            if (!sessionData.priceLevels.has(price)) {
                sessionData.priceLevels.set(price, {
                    tpoCount: 0,
                    letters: new Set(),
                    isInitialBalance: false,
                });
            }

            const levelData = sessionData.priceLevels.get(price)!;

            // Only count each letter once per price level
            if (!levelData.letters.has(letter)) {
                levelData.letters.add(letter);
                levelData.tpoCount++;
                sessionData.totalTPOs++;
            }

            // Track session range
            sessionData.rangeHigh = Math.max(sessionData.rangeHigh, price);
            sessionData.rangeLow = Math.min(sessionData.rangeLow, price);
        }
    });

    // Calculate POC (Point of Control)
    let maxTPOCount = 0;
    for (const [price, levelData] of sessionData.priceLevels) {
        if (levelData.tpoCount > maxTPOCount) {
            maxTPOCount = levelData.tpoCount;
            sessionData.poc = price;
        }
    }

    // Calculate Value Area
    const { vah, val } = calculateValueArea(
        sessionData.priceLevels,
        sessionData.poc,
        tickSize,
        valueAreaPercent
    );
    sessionData.vah = vah;
    sessionData.val = val;

    // Set IB to first candle range
    if (data.length > 0) {
        sessionData.ibHigh = data[0].high;
        sessionData.ibLow = data[0].low;
    }

    // Calculate Rotation Factor
    sessionData.rotationFactor = calculateRotationFactor(
        sessionData.periods,
        sessionData.priceLevels
    );

    // Detect Poor High/Low
    const { poorHigh, poorLow } = detectPoorHighLow(
        sessionData.priceLevels,
        sessionData.rangeHigh,
        sessionData.rangeLow,
        poorThreshold
    );
    sessionData.poorHigh = poorHigh;
    sessionData.poorLow = poorLow;

    // Detect Single Prints
    sessionData.singlePrints = detectSinglePrints(sessionData.priceLevels, tickSize);

    // Calculate Midpoint
    sessionData.midpoint = (sessionData.rangeHigh + sessionData.rangeLow) / 2;

    return [sessionData];
};

/**
 * Main TPO calculation function
 */
export const calculateTPO = (data: OHLCData[], options: TPOOptions = {}): TPOSessionData[] => {
    const {
        tickSize: tickSizeOption = 'auto',
        blockSize = '30m',
        periodMinutes: periodMinutesOption,
        sessionType = 'daily',
        sessionStart = '09:15',
        sessionEnd = '15:30',
        valueAreaPercent = 70,
        allHours = true,
        poorThreshold = 2,
        interval,
        timezone = 'Asia/Kolkata',
    } = options;

    // Parse block size - support both string ('30m') and number (30)
    const periodMinutes = periodMinutesOption || parseBlockSize(blockSize);

    if (!Array.isArray(data) || data.length === 0) {
        return [];
    }

    // Detect if this is daily/weekly data
    let isHigherTimeframe = false;

    if (interval) {
        isHigherTimeframe = /^[0-9]*[DWM]$/.test(interval) || interval === '1D' || interval === '1W' || interval === '1M';
    } else if (data.length >= 2) {
        const gap = data[1].time - data[0].time;
        isHigherTimeframe = gap >= 86400;
    }

    // Auto-calculate tick size if not specified or set to 'auto'
    const tickSize = (tickSizeOption === 'auto' || (typeof tickSizeOption === 'number' && tickSizeOption <= 0))
        ? calculateAutoTickSize(data)
        : tickSizeOption as number;

    const sessionStartMinutes = parseTimeToMinutes(sessionStart);
    const sessionEndMinutes = parseTimeToMinutes(sessionEnd);

    // For higher timeframes (daily/weekly), combine all data into single profile
    if (isHigherTimeframe) {
        return calculateHigherTimeframeTPO(data, tickSize, valueAreaPercent, poorThreshold, blockSize);
    }

    // Group candles by session (day/week)
    const sessions = new Map<string, OHLCData[]>();

    for (const candle of data) {
        let sessionKey: string;

        if (sessionType === 'weekly') {
            const date = new Date(candle.time * 1000);
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            sessionKey = weekStart.toDateString();
        } else {
            sessionKey = getDateString(candle.time);
        }

        if (!sessions.has(sessionKey)) {
            sessions.set(sessionKey, []);
        }
        sessions.get(sessionKey)!.push(candle);
    }

    // Calculate TPO profile for each session
    const profiles: TPOSessionData[] = [];

    for (const [sessionKey, candles] of sessions) {
        if (candles.length === 0) continue;

        // Sort candles by time
        candles.sort((a, b) => a.time - b.time);

        const sessionData: TPOSessionData = {
            sessionKey,
            sessionStart: candles[0].time,
            sessionEnd: candles[candles.length - 1].time,
            tickSize,
            blockSize,
            periods: [],
            priceLevels: new Map(),
            poc: 0,
            vah: 0,
            val: 0,
            ibHigh: 0,
            ibLow: Infinity,
            rangeHigh: 0,
            rangeLow: Infinity,
            totalTPOs: 0,
            openPrice: candles[0].open,
            closePrice: candles[candles.length - 1].close,
            rotationFactor: 0,
            poorHigh: null,
            poorLow: null,
            singlePrints: [],
            midpoint: 0,
        };

        // Process each candle
        for (const candle of candles) {
            const minutesFromMidnight = getMinutesFromMidnight(candle.time, timezone);

            // Skip candles outside session hours (unless allHours is true)
            if (!allHours && (minutesFromMidnight < sessionStartMinutes || minutesFromMidnight >= sessionEndMinutes)) {
                continue;
            }

            // Calculate which period (letter) this candle belongs to
            const minutesIntoSession = minutesFromMidnight - sessionStartMinutes;
            const periodIndex = Math.floor(minutesIntoSession / periodMinutes);

            const letter = getTPOLetter(periodIndex);

            // Track period info
            const existingPeriod = sessionData.periods.find(p => p.letter === letter);
            if (!existingPeriod) {
                sessionData.periods.push({
                    letter,
                    startTime: candle.time,
                    endTime: candle.time,
                });
            } else {
                existingPeriod.endTime = candle.time;
            }

            // Get all price levels touched by this candle
            const levels = getPriceLevels(candle.low, candle.high, tickSize);

            for (const price of levels) {
                if (!sessionData.priceLevels.has(price)) {
                    sessionData.priceLevels.set(price, {
                        tpoCount: 0,
                        letters: new Set(),
                        isInitialBalance: false,
                    });
                }

                const levelData = sessionData.priceLevels.get(price)!;

                // Only count each letter once per price level
                if (!levelData.letters.has(letter)) {
                    levelData.letters.add(letter);
                    levelData.tpoCount++;
                    sessionData.totalTPOs++;
                }

                // Mark as Initial Balance (first 2 periods: A and B)
                if (periodIndex < 2) {
                    levelData.isInitialBalance = true;
                    sessionData.ibHigh = Math.max(sessionData.ibHigh, price);
                    sessionData.ibLow = Math.min(sessionData.ibLow, price);
                }

                // Track session range
                sessionData.rangeHigh = Math.max(sessionData.rangeHigh, price);
                sessionData.rangeLow = Math.min(sessionData.rangeLow, price);
            }
        }

        // Calculate POC (Point of Control) - price with highest TPO count
        let maxTPOCount = 0;
        for (const [price, levelData] of sessionData.priceLevels) {
            if (levelData.tpoCount > maxTPOCount) {
                maxTPOCount = levelData.tpoCount;
                sessionData.poc = price;
            }
        }

        // Calculate Value Area (70% of TPOs)
        const { vah, val } = calculateValueArea(
            sessionData.priceLevels,
            sessionData.poc,
            tickSize,
            valueAreaPercent
        );
        sessionData.vah = vah;
        sessionData.val = val;

        // Fix IB values if no IB candles found
        if (sessionData.ibLow === Infinity) {
            sessionData.ibLow = sessionData.rangeLow;
            sessionData.ibHigh = sessionData.rangeHigh;
        }

        // Calculate Rotation Factor
        sessionData.rotationFactor = calculateRotationFactor(
            sessionData.periods,
            sessionData.priceLevels
        );

        // Detect Poor High/Low
        const { poorHigh, poorLow } = detectPoorHighLow(
            sessionData.priceLevels,
            sessionData.rangeHigh,
            sessionData.rangeLow,
            poorThreshold
        );
        sessionData.poorHigh = poorHigh;
        sessionData.poorLow = poorLow;

        // Detect Single Prints
        sessionData.singlePrints = detectSinglePrints(sessionData.priceLevels, tickSize);

        // Calculate TPO Midpoint
        sessionData.midpoint = (sessionData.rangeHigh + sessionData.rangeLow) / 2;

        profiles.push(sessionData);
    }

    // Sort profiles by session start time (most recent last)
    profiles.sort((a, b) => a.sessionStart - b.sessionStart);

    return profiles;
};

/**
 * Convert TPO profile to renderable format for lightweight-charts
 * Returns array of price levels with their TPO data
 */
export const tpoToRenderData = (
    profile: TPOSessionData | null,
    options: TPORenderOptions = {}
): TPORenderDataPoint[] => {
    const {
        showLetters = true,
        maxLettersPerRow = 20,
    } = options;

    if (!profile || !profile.priceLevels) {
        return [];
    }

    const renderData: TPORenderDataPoint[] = [];

    for (const [price, levelData] of profile.priceLevels) {
        const letters = [...levelData.letters];

        renderData.push({
            price,
            tpoCount: levelData.tpoCount,
            letters: showLetters ? letters.slice(0, maxLettersPerRow) : [],
            isInitialBalance: levelData.isInitialBalance,
            isPOC: price === profile.poc,
            isValueArea: price >= profile.val && price <= profile.vah,
            isVAH: price === profile.vah,
            isVAL: price === profile.val,
        });
    }

    // Sort by price (high to low for display)
    renderData.sort((a, b) => b.price - a.price);

    return renderData;
};

/**
 * Count TPOs above or below POC
 */
const countTPOsRelativeToPOC = (
    priceLevels: Map<number, TPOPriceLevelData>,
    poc: number
): { above: number; below: number } => {
    let above = 0;
    let below = 0;

    for (const [price, data] of priceLevels) {
        if (price > poc) {
            above += data.tpoCount;
        } else if (price < poc) {
            below += data.tpoCount;
        }
    }

    return { above, below };
};

/**
 * TPO statistics
 */
export interface TPOStats {
    poc: number;
    vah: number;
    val: number;
    ibHigh: number;
    ibLow: number;
    rangeHigh: number;
    rangeLow: number;
    hlRange: number;
    vaRange: number;
    ibRange: number;
    totalTPOs: number;
    tpoAbovePOC: number;
    tpoBelowPOC: number;
    periodCount: number;
    rotationFactor: number;
    midpoint: number;
    openPrice: number;
    closePrice: number;
    poorHigh: number | null;
    poorLow: number | null;
    singlePrintCount: number;
    sessionKey: string;
    blockSize: string;
    tickSize: number;
}

/**
 * Get summary statistics for a TPO profile
 * Extended with all TradingView-compatible stats
 */
export const getTPOStats = (profile: TPOSessionData | null): TPOStats | null => {
    if (!profile) return null;

    const { above: tpoAbovePOC, below: tpoBelowPOC } = countTPOsRelativeToPOC(
        profile.priceLevels,
        profile.poc
    );

    return {
        // Core stats
        poc: profile.poc,
        vah: profile.vah,
        val: profile.val,
        ibHigh: profile.ibHigh,
        ibLow: profile.ibLow,
        rangeHigh: profile.rangeHigh,
        rangeLow: profile.rangeLow,

        // Calculated ranges
        hlRange: profile.rangeHigh - profile.rangeLow,
        vaRange: profile.vah - profile.val,
        ibRange: profile.ibHigh - profile.ibLow,

        // TPO counts
        totalTPOs: profile.totalTPOs,
        tpoAbovePOC,
        tpoBelowPOC,
        periodCount: profile.periods.length,

        // New stats
        rotationFactor: profile.rotationFactor,
        midpoint: profile.midpoint,
        openPrice: profile.openPrice,
        closePrice: profile.closePrice,
        poorHigh: profile.poorHigh,
        poorLow: profile.poorLow,
        singlePrintCount: profile.singlePrints?.length || 0,

        // Session info
        sessionKey: profile.sessionKey,
        blockSize: profile.blockSize,
        tickSize: profile.tickSize,
    };
};

export default calculateTPO;

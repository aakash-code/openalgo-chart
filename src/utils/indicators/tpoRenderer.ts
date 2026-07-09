/**
 * TPO Renderer Utilities
 * Functions for converting TPO profiles to renderable formats
 */

import { TPOPriceLevelData, TPOPeriodInfo } from './tpoCalculations';

/**
 * TPO Profile data structure
 */
export interface TPOProfile {
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
 * Render data for a single price level
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
 * TPO statistics
 */
export interface TPOStats {
    // Core stats
    poc: number;
    vah: number;
    val: number;
    ibHigh: number;
    ibLow: number;
    rangeHigh: number;
    rangeLow: number;

    // Calculated ranges
    hlRange: number;
    vaRange: number;
    ibRange: number;

    // TPO counts
    totalTPOs: number;
    tpoAbovePOC: number;
    tpoBelowPOC: number;
    periodCount: number;

    // New stats
    rotationFactor: number;
    midpoint: number;
    openPrice: number;
    closePrice: number;
    poorHigh: number | null;
    poorLow: number | null;
    singlePrintCount: number;

    // Session info
    sessionKey: string;
    blockSize: string;
    tickSize: number;
}

/**
 * TPO render options
 */
export interface TPORenderOptions {
    showLetters?: boolean;
    maxLettersPerRow?: number;
}

/**
 * TPO count result
 */
export interface TPOCountResult {
    above: number;
    below: number;
}

/**
 * Convert TPO profile to renderable format for lightweight-charts
 * Returns array of price levels with their TPO data
 * @param profile - TPO profile object
 * @param options - Render options
 * @returns Array of render data points
 */
export const tpoToRenderData = (
    profile: TPOProfile | null,
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
 * @param priceLevels - Map of price levels
 * @param poc - Point of Control price
 * @returns Count above and below
 */
export const countTPOsRelativeToPOC = (
    priceLevels: Map<number, TPOPriceLevelData>,
    poc: number
): TPOCountResult => {
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
 * Get summary statistics for a TPO profile
 * Extended with all TradingView-compatible stats
 * @param profile - TPO profile
 * @returns TPO statistics or null
 */
export const getTPOStats = (profile: TPOProfile | null): TPOStats | null => {
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

export default {
    tpoToRenderData,
    countTPOsRelativeToPOC,
    getTPOStats,
};

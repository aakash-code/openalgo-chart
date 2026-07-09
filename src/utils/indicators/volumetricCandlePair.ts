/**
 * First Volumetric Candle Pair Zone Indicator
 * Identifies two specific candles per day based on volume and color.
 * C1: First green or red candle with volume higher than previous bar.
 * C2: Next candle with opposite color and volume higher than its own previous bar.
 * Combined Zone: High/Low range of C1 and C2 extended to end of day.
 */

import { isMarketHours, groupCandlesByDay } from './timeUtils';
import { OHLCData, OHLCWithOrderFlow, TimeValuePoint } from './types';
import { calculateEMA } from './ema';

/**
 * Chart marker for volumetric candle pair
 */
export interface VolumetricMarker {
    time: number;
    position: 'aboveBar' | 'belowBar';
    color: string;
    shape: 'arrowUp' | 'arrowDown' | 'circle';
    text: string;
}

/**
 * Zone levels
 */
export interface VolumetricZoneLevels {
    high: number;
    low: number;
    date: string;
    startTime: number;
    endTime: number;
}

/**
 * Volumetric Candle Pair calculation result
 */
export interface VolumetricCandlePairResult {
    zHighLines: TimeValuePoint[];
    zLowLines: TimeValuePoint[];
    markers: VolumetricMarker[];
    allZones: VolumetricZoneLevels[];
    c1HL?: { high: number, low: number, time: number }[];
    c2HL?: { high: number, low: number, time: number }[];
}

/**
 * Volumetric Candle Pair options
 */
export interface VolumetricCandlePairOptions {
    zoneFillColor?: string;
    zoneBorderColor?: string;
    c1Color?: string;
    c2Color?: string;
    showHL?: boolean;
    showBreakouts?: boolean;
    useTrendFilter?: boolean;
    useDeltaFilter?: boolean;
    emaPeriod1?: number; // Default 8
    emaPeriod2?: number; // Default 21
    emaPeriod3?: number; // Default 50
    emaPeriod4?: number; // Default 100
}

/**
 * Calculate Volumetric Candle Pair indicator data
 */
export const calculateVolumetricCandlePair = (
    data: OHLCData[],
    options: VolumetricCandlePairOptions = {}
): VolumetricCandlePairResult => {
    const {
        c1Color = '#FFA500',      // Orange
        c2Color = '#800080',      // Purple
        showHL = true,
        showBreakouts = true,
        useTrendFilter = true,
        useDeltaFilter = true,
        emaPeriod1 = 8,
        emaPeriod2 = 21,
        emaPeriod3 = 50,
        emaPeriod4 = 100
    } = options;

    if (!Array.isArray(data) || data.length < 2) {
        return { zHighLines: [], zLowLines: [], markers: [], allZones: [] };
    }

    // Calculate 4 EMAs for multi-trend filtering
    let ema1Map = new Map<number, number>();
    let ema2Map = new Map<number, number>();
    let ema3Map = new Map<number, number>();
    let ema4Map = new Map<number, number>();

    if (useTrendFilter) {
        ema1Map = new Map(calculateEMA(data, emaPeriod1).map(p => [p.time, p.value]));
        ema2Map = new Map(calculateEMA(data, emaPeriod2).map(p => [p.time, p.value]));
        ema3Map = new Map(calculateEMA(data, emaPeriod3).map(p => [p.time, p.value]));
        ema4Map = new Map(calculateEMA(data, emaPeriod4).map(p => [p.time, p.value]));
    }

    // Group candles by trading day
    const dayMap = groupCandlesByDay(data);

    const zHighLines: TimeValuePoint[] = [];
    const zLowLines: TimeValuePoint[] = [];
    const markers: VolumetricMarker[] = [];
    const allZones: VolumetricZoneLevels[] = [];
    const c1HLs: { high: number, low: number, time: number }[] = [];
    const c2HLs: { high: number, low: number, time: number }[] = [];

    // Process each trading day
    for (const [dateStr, dayCandles] of dayMap) {
        dayCandles.sort((a, b) => a.time - b.time);
        const marketCandles = dayCandles.filter(c => isMarketHours(c.time));
        if (marketCandles.length < 2) continue;

        let c1Found = false;
        let c2Found = false;
        let c1Data: OHLCData | null = null;
        let c2Data: OHLCData | null = null;
        let zHigh = 0;
        let zLow = 0;

        let dayBuyVol = 0;
        let daySellVol = 0;

        // Find C1 and C2
        for (let i = 1; i < marketCandles.length; i++) {
            const current = marketCandles[i] as OHLCWithOrderFlow;
            const prev = marketCandles[i-1];
            
            if (current.volume === undefined || prev.volume === undefined) continue;
            
            // PRO Wick-Based Volume Partitioning (Institutional Grade)
            let bVol = 0;
            let sVol = 0;
            const range = current.high - current.low;
            if (current.buyVolume !== undefined && current.sellVolume !== undefined) {
                bVol = current.buyVolume;
                sVol = current.sellVolume;
            } else if (range > 0) {
                bVol = current.volume * (current.close - current.low) / range;
                sVol = current.volume * (current.high - current.close) / range;
            } else {
                bVol = current.volume * 0.5;
                sVol = current.volume * 0.5;
            }
            dayBuyVol += bVol;
            daySellVol += sVol;

            const volSpike = current.volume > prev.volume;
            const isGreen = current.close > current.open;
            const isRed = current.close < current.open;

            if (!c1Found) {
                if (volSpike && (isGreen || isRed)) {
                    c1Found = true;
                    c1Data = current;
                    
                    markers.push({
                        time: current.time,
                        position: 'belowBar',
                        color: c1Color,
                        shape: 'arrowUp',
                        text: 'C1'
                    });
                    
                    if (showHL) {
                        c1HLs.push({ high: current.high, low: current.low, time: current.time });
                    }
                }
            } else if (!c2Found) {
                const c1IsGreen = c1Data!.close > c1Data!.open;
                const isOpposite = (c1IsGreen && isRed) || (!c1IsGreen && isGreen);
                
                if (volSpike && isOpposite) {
                    c2Found = true;
                    c2Data = current;
                    
                    markers.push({
                        time: current.time,
                        position: 'belowBar',
                        color: c2Color,
                        shape: 'arrowUp',
                        text: 'C2'
                    });
                    
                    if (showHL) {
                        c2HLs.push({ high: current.high, low: current.low, time: current.time });
                    }
                    
                    // Create Zone
                    zHigh = Math.max(c1Data!.high, c2Data!.high);
                    zLow = Math.min(c1Data!.low, c2Data!.low);
                    const lastCandle = marketCandles[marketCandles.length - 1];
                    
                    allZones.push({
                        high: zHigh,
                        low: zLow,
                        date: dateStr,
                        startTime: c1Data!.time,
                        endTime: lastCandle.time
                    });
                    
                    zHighLines.push({ time: c1Data!.time, value: zHigh });
                    zHighLines.push({ time: lastCandle.time, value: zHigh });
                    
                    zLowLines.push({ time: c1Data!.time, value: zLow });
                    zLowLines.push({ time: lastCandle.time, value: zLow });
                    
                    // After finding C2, detect breakouts in the remaining candles of the day
                    if (showBreakouts) {
                        let breakoutDetected = false;
                        let breakdownDetected = false;

                        for (let j = i + 1; j < marketCandles.length; j++) {
                            const breakCandle = marketCandles[j] as OHLCWithOrderFlow;
                            
                            // PRO Wick-Based Volume Partitioning
                            let bVolB = 0;
                            let sVolB = 0;
                            const bRange = breakCandle.high - breakCandle.low;
                            if (breakCandle.buyVolume !== undefined && breakCandle.sellVolume !== undefined) {
                                bVolB = breakCandle.buyVolume;
                                sVolB = breakCandle.sellVolume;
                            } else if (bRange > 0) {
                                bVolB = breakCandle.volume! * (breakCandle.close - breakCandle.low) / bRange;
                                sVolB = breakCandle.volume! * (breakCandle.high - breakCandle.close) / bRange;
                            } else {
                                bVolB = breakCandle.volume! * 0.5;
                                sVolB = breakCandle.volume! * 0.5;
                            }
                            
                            dayBuyVol += bVolB;
                            daySellVol += sVolB;

                            const e1 = ema1Map.get(breakCandle.time);
                            const e2 = ema2Map.get(breakCandle.time);
                            const e3 = ema3Map.get(breakCandle.time);
                            const e4 = ema4Map.get(breakCandle.time);

                            // Breakout Long
                            if (!breakoutDetected && breakCandle.close > zHigh) {
                                // Trend filter: 8 > 21 > 50 > 100 (Full Bullish Stack)
                                const trendAligned = !useTrendFilter || (
                                    e1 !== undefined && e2 !== undefined && e3 !== undefined && e4 !== undefined &&
                                    e1 > e2 && e2 > e3 && e3 > e4 && breakCandle.close > e1
                                );
                                
                                // Delta Filter: Bullish breakout requires Buy Volume > Sell Volume
                                const deltaAligned = !useDeltaFilter || (dayBuyVol > daySellVol);
                                
                                if (trendAligned && deltaAligned) {
                                    markers.push({
                                        time: breakCandle.time,
                                        position: 'belowBar',
                                        color: '#089981',
                                        shape: 'arrowUp',
                                        text: useDeltaFilter ? 'Long Breakout (Delta)' : 'Long Breakout (4-EMA)'
                                    });
                                    breakoutDetected = true;
                                } else {
                                    // Debug why it was rejected
                                    if (!trendAligned || !deltaAligned) {
                                        // Use console.debug to avoid polluting production unless needed
                                        // In our case, we want to know why it's not working
                                        // console.debug(`[VCP] Breakout REJECTED at ${breakCandle.time}: trend=${trendAligned}, delta=${deltaAligned}`);
                                    }
                                }
                            }

                            // Breakdown Short
                            if (!breakdownDetected && breakCandle.close < zLow) {
                                // Trend filter: 8 < 21 < 50 < 100 (Full Bearish Stack)
                                const trendAligned = !useTrendFilter || (
                                    e1 !== undefined && e2 !== undefined && e3 !== undefined && e4 !== undefined &&
                                    e1 < e2 && e2 < e3 && e3 < e4 && breakCandle.close < e1
                                );
                                
                                // Delta Filter: Bearish breakdown requires Sell Volume > Buy Volume
                                const deltaAligned = !useDeltaFilter || (daySellVol > dayBuyVol);

                                if (trendAligned && deltaAligned) {
                                    markers.push({
                                        time: breakCandle.time,
                                        position: 'aboveBar',
                                        color: '#F23645',
                                        shape: 'arrowDown',
                                        text: useDeltaFilter ? 'Short Breakdown (Delta)' : 'Short Breakdown (4-EMA)'
                                    });
                                    breakdownDetected = true;
                                } else {
                                    // Debug why it was rejected
                                    if (!trendAligned || !deltaAligned) {
                                        // console.debug(`[VCP] Breakdown REJECTED at ${breakCandle.time}: trend=${trendAligned}, delta=${deltaAligned}`);
                                    }
                                }
                            }


                            if (breakoutDetected && breakdownDetected) break;
                        }
                    }

                    break; // Move to next day
                }
            }
        }
    }

    return {
        zHighLines,
        zLowLines,
        markers,
        allZones,
        c1HL: c1HLs,
        c2HL: c2HLs
    };
};


export default calculateVolumetricCandlePair;

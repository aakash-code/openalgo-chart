/**
 * Institutional Volumetric Pair Indicator
 * 
 * An advanced version of the Volumetric Candle Pair that uses 
 * Historical Volume Context (RVOL) to filter for high-conviction signals.
 * 
 * Features:
 * 1. RVOL Spike: C1 must be > X% of previous day's average candle volume.
 * 2. Pace Analysis: Compares cumulative today volume vs same-time yesterday.
 * 3. 4-EMA Trend Filtering (8, 21, 50, 100).
 */

import { isMarketHours, groupCandlesByDay, getISTComponents, isInTimeWindow } from './timeUtils';
import { OHLCData, OHLCWithOrderFlow, TimeValuePoint } from './types';
import { calculateEMA } from './ema';
import { calculateVWAP } from './vwap';

export interface InstitutionalVolumetricResult {
    zHighLines: TimeValuePoint[];
    zLowLines: TimeValuePoint[];
    markers: {
        time: number;
        position: 'aboveBar' | 'belowBar';
        color: string;
        shape: 'arrowUp' | 'arrowDown' | 'circle';
        text: string;
    }[];
    allZones: {
        high: number;
        low: number;
        date: string;
        startTime: number;
        endTime: number;
        isTier1?: boolean; // Signal forms near POC
    }[];
    dashboard?: {
        currentPace: number;
        yesterdayPace: number;
        paceRatio: number;
        isHighPace: boolean;
        vwapStatus: 'Above' | 'Below' | 'Neutral';
        deltaStatus: 'Strong Buy' | 'Strong Sell' | 'Neutral';
    };
}

export interface InstitutionalVolumetricOptions {
    // Original Logic Toggles
    useInstitutionalVolume?: boolean; // Rule 3: Toggle for the new logic
    
    // Rule 1: Volume Spike vs Prev Day Avg
    minVolumeMultiplier?: number; // e.g., 1.5 for 150%
    
    // Rule 2: Cumulative Pace
    usePaceAnalysis?: boolean;
    paceMultiplier?: number; // e.g., 2.0 for 200% of yesterday's pace
    
    // VSA Filter (Rule 4)
    useVSAFilter?: boolean;
    minSpreadMultiplier?: number; // Spread must be > X * Avg Spread
    
    // VWAP Confluence (Rule 5)
    useVWAPConfluence?: boolean;

    // Elite Rule 1: Delta Order Flow
    useDeltaFilter?: boolean;
    
    // Elite Rule 2: Climax Exhaustion
    useClimaxDetection?: boolean;
    climaxMultiplier?: number; // e.g., 4.0 (400% of avg is exhaustion)
    
    // Elite Rule 3: Kill Zones
    useKillZones?: boolean;
    killZoneStartH?: number;
    killZoneStartM?: number;
    killZoneEndH?: number;
    killZoneEndM?: number;
    
    // Elite Rule 4: POC Alignment
    usePOCAlignment?: boolean;
    pocThresholdPercent?: number; // Zone must be within X% of POC
    
    // Trend
    useTrendFilter?: boolean;
    emaPeriod1?: number;
    emaPeriod2?: number;
    emaPeriod3?: number;
    emaPeriod4?: number;
    
    // Style
    c1Color?: string;
    c2Color?: string;
}

/**
 * Calculate cumulative volume up to a specific time of day
 */
const getCumulativeVolumeUpToTime = (dayCandles: OHLCData[], targetTime: number): number => {
    const { hours: targetH, minutes: targetM } = getISTComponents(targetTime);
    const targetTotalM = targetH * 60 + targetM;
    
    let totalVol = 0;
    for (const candle of dayCandles) {
        const { hours: h, minutes: m } = getISTComponents(candle.time);
        const totalM = h * 60 + m;
        if (totalM <= targetTotalM) {
            totalVol += (candle.volume || 0);
        } else {
            break;
        }
    }
    return totalVol;
};

/**
 * Calculate POC (Point of Control) for a day
 * Simplistic version: Find the price (rounded) with the highest volume
 */
const calculatePOC = (candles: OHLCData[]): number => {
    if (candles.length === 0) return 0;
    const priceMap = new Map<number, number>();
    for (const c of candles) {
        const avgPrice = Math.round((c.high + c.low + c.close) / 3);
        const currentVol = priceMap.get(avgPrice) || 0;
        priceMap.set(avgPrice, currentVol + (c.volume || 0));
    }
    let maxVol = 0;
    let poc = 0;
    for (const [price, vol] of priceMap.entries()) {
        if (vol > maxVol) {
            maxVol = vol;
            poc = price;
        }
    }
    return poc;
};

export const calculateInstitutionalVolumetric = (
    data: OHLCData[],
    options: InstitutionalVolumetricOptions = {}
): InstitutionalVolumetricResult => {
    const {
        useInstitutionalVolume = true,
        minVolumeMultiplier = 1.5,
        usePaceAnalysis = true,
        paceMultiplier = 2.0,
        useVSAFilter = true,
        minSpreadMultiplier = 1.2,
        useVWAPConfluence = true,
        useDeltaFilter = true,
        useClimaxDetection = true,
        climaxMultiplier = 4.0,
        useKillZones = false,
        killZoneStartH = 9,
        killZoneStartM = 15,
        killZoneEndH = 11,
        killZoneEndM = 0,
        usePOCAlignment = true,
        pocThresholdPercent = 0.5,
        useTrendFilter = true,
        emaPeriod1 = 8,
        emaPeriod2 = 21,
        emaPeriod3 = 50,
        emaPeriod4 = 100,
        c1Color = '#FFA500',
        c2Color = '#800080'
    } = options;

    if (!Array.isArray(data) || data.length < 2) {
        return { zHighLines: [], zLowLines: [], markers: [], allZones: [] };
    }

    // 1. Calculate EMAs and VWAP
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
    
    const vwapMap = new Map(calculateVWAP(data, { resetDaily: true }).map(p => [p.time, p.value]));

    // 2. Group by Day for historical analysis
    const dayMap = groupCandlesByDay(data);
    const sortedDates = Array.from(dayMap.keys()).sort();
    
    const result: InstitutionalVolumetricResult = { zHighLines: [], zLowLines: [], markers: [], allZones: [] };

    // Calculate Average Spread (Rule 4: VSA)
    const calculateAvgSpread = (candles: OHLCData[]) => {
        if (candles.length === 0) return 0;
        return candles.reduce((sum, c) => sum + Math.abs(c.close - c.open), 0) / candles.length;
    };

    // 3. Process Days
    for (let d = 1; d < sortedDates.length; d++) {
        const prevDate = sortedDates[d-1];
        const currDate = sortedDates[d];
        const prevDayCandles = dayMap.get(prevDate)!.sort((a, b) => a.time - b.time);
        const currDayCandles = dayMap.get(currDate)!.sort((a, b) => a.time - b.time);
        
        // Calculate Prev Day Stats
        const prevDayMarket = prevDayCandles.filter(c => isMarketHours(c.time));
        const avgPrevVol = prevDayMarket.length > 0 
            ? prevDayMarket.reduce((sum, c) => sum + (c.volume || 0), 0) / prevDayMarket.length 
            : 0;
        
        const avgPrevSpread = calculateAvgSpread(prevDayMarket);
        const prevPOC = calculatePOC(prevDayMarket);

        let c1Found = false;
        let c2Found = false;
        let c1Data: OHLCData | null = null;
        let zHigh = 0;
        let zLow = 0;

        let currentDayCumulativeVol = 0;
        let currentDayBuyVol = 0;
        let currentDaySellVol = 0;

        for (let i = 1; i < currDayCandles.length; i++) {
            const curr = currDayCandles[i] as OHLCWithOrderFlow;
            const prev = currDayCandles[i-1];
            if (!isMarketHours(curr.time)) continue;

            const vol = curr.volume || 0;
            currentDayCumulativeVol += vol;
            
            // PRO Wick-Based Volume Partitioning (Institutional Grade)
            let bVol = 0;
            let sVol = 0;
            const range = curr.high - curr.low;
            if (curr.buyVolume !== undefined && curr.sellVolume !== undefined) {
                bVol = curr.buyVolume;
                sVol = curr.sellVolume;
            } else if (range > 0) {
                bVol = vol * (curr.close - curr.low) / range;
                sVol = vol * (curr.high - curr.close) / range;
            } else {
                bVol = vol * 0.5;
                sVol = vol * 0.5;
            }
            
            currentDayBuyVol += bVol;
            currentDaySellVol += sVol;

            const volSpike = vol > prev.volume!;
            const isGreen = curr.close > curr.open;
            const isRed = curr.close < curr.open;

            // Elite Rule 2: Climax detection
            const isClimax = useClimaxDetection && (vol > avgPrevVol * climaxMultiplier);
            if (isClimax) {
                result.markers.push({
                    time: curr.time,
                    position: isGreen ? 'belowBar' : 'aboveBar',
                    color: '#FFD700',
                    shape: 'circle',
                    text: 'CLIMAX'
                });
            }

            // Elite Rule 3: Kill Zones
            const inKillZone = !useKillZones || isInTimeWindow(curr.time, killZoneStartH, killZoneStartM, killZoneEndH, killZoneEndM);

            // Rule 1: Institutional Volume Threshold
            const isInstitutional = !useInstitutionalVolume || (vol > avgPrevVol * minVolumeMultiplier);
            
            // Rule 4: VSA Spread Filter (Effort vs Result)
            const currentSpread = Math.abs(curr.close - curr.open);
            const spreadIsHealthy = !useVSAFilter || (currentSpread > avgPrevSpread * minSpreadMultiplier);

            if (!c1Found && inKillZone && !isClimax) {
                if (volSpike && isInstitutional && spreadIsHealthy && (isGreen || isRed)) {
                    c1Found = true;
                    c1Data = curr;
                    result.markers.push({
                        time: curr.time,
                        position: 'belowBar',
                        color: c1Color,
                        shape: 'arrowUp',
                        text: 'Elite C1'
                    });
                }
            } else if (!c2Found && !isClimax) {
                const isOpposite = (c1Data!.close > c1Data!.open && isRed) || (c1Data!.close < c1Data!.open && isGreen);
                if (volSpike && isOpposite && spreadIsHealthy) {
                    c2Found = true;
                    zHigh = Math.max(c1Data!.high, curr.high);
                    zLow = Math.min(c1Data!.low, curr.low);
                    
                    // Elite Rule 4: POC Alignment
                    const zoneAvg = (zHigh + zLow) / 2;
                    const isTier1 = usePOCAlignment && prevPOC > 0 && (Math.abs(zoneAvg - prevPOC) / prevPOC * 100 <= pocThresholdPercent);

                    const lastCandle = currDayCandles[currDayCandles.length - 1];
                    result.allZones.push({ 
                        high: zHigh, low: zLow, date: currDate, 
                        startTime: c1Data!.time, endTime: lastCandle.time,
                        isTier1
                    });
                    
                    result.zHighLines.push({ time: c1Data!.time, value: zHigh });
                    result.zHighLines.push({ time: lastCandle.time, value: zHigh });
                    
                    result.zLowLines.push({ time: c1Data!.time, value: zLow });
                    result.zLowLines.push({ time: lastCandle.time, value: zLow });
                    
                    result.markers.push({
                        time: curr.time,
                        position: 'belowBar',
                        color: isTier1 ? '#FFD700' : c2Color,
                        shape: 'arrowUp',
                        text: isTier1 ? 'TIER-1 C2' : 'Elite C2'
                    });

                    // Detect Breakouts with Pace Analysis (Rule 2)
                    for (let j = i + 1; j < currDayCandles.length; j++) {
                        const breakCandle = currDayCandles[j] as OHLCWithOrderFlow;
                        currentDayCumulativeVol += (breakCandle.volume || 0);
                        
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
                        
                        currentDayBuyVol += bVolB;
                        currentDaySellVol += sVolB;

                        const e1 = ema1Map.get(breakCandle.time);
                        const e2 = ema2Map.get(breakCandle.time);
                        const e3 = ema3Map.get(breakCandle.time);
                        const e4 = ema4Map.get(breakCandle.time);
                        const vwap = vwapMap.get(breakCandle.time);

                        const bullishStack = !useTrendFilter || (e1! > e2! && e2! > e3! && e3! > e4! && breakCandle.close > e1!);
                        const bearishStack = !useTrendFilter || (e1! < e2! && e2! < e3! && e3! < e4! && breakCandle.close < e1!);
                        
                        // Rule 5: VWAP Confluence
                        const vwapBullish = !useVWAPConfluence || (vwap !== undefined && breakCandle.close > vwap);
                        const vwapBearish = !useVWAPConfluence || (vwap !== undefined && breakCandle.close < vwap);
                        
                        // Elite Rule 1: Delta Filter
                        const deltaBullish = !useDeltaFilter || (currentDayBuyVol > currentDaySellVol);
                        const deltaBearish = !useDeltaFilter || (currentDaySellVol > currentDayBuyVol);

                        if ((breakCandle.close > zHigh && bullishStack && vwapBullish && deltaBullish) || 
                            (breakCandle.close < zLow && bearishStack && vwapBearish && deltaBearish)) {
                            
                            // Rule 2: Pace Analysis
                            let paceIsHigh = true;
                            if (usePaceAnalysis) {
                                const prevDayCumVolAtSameTime = getCumulativeVolumeUpToTime(prevDayCandles, breakCandle.time);
                                paceIsHigh = prevDayCumVolAtSameTime > 0 && (currentDayCumulativeVol > prevDayCumVolAtSameTime * paceMultiplier);
                            }

                            if (paceIsHigh) {
                                if (breakCandle.close > zHigh) {
                                    result.markers.push({
                                        time: breakCandle.time,
                                        position: 'belowBar',
                                        color: isTier1 ? '#FFD700' : '#089981',
                                        shape: 'arrowUp',
                                        text: isTier1 ? 'ELITE LONG ★' : 'ELITE LONG'
                                    });
                                } else {
                                    result.markers.push({
                                        time: breakCandle.time,
                                        position: 'aboveBar',
                                        color: isTier1 ? '#FFD700' : '#f23645',
                                        shape: 'arrowDown',
                                        text: isTier1 ? 'ELITE SHORT ★' : 'ELITE SHORT'
                                    });
                                }
                                break; // Only first breakout
                            }
                        }
                    }
                    break;
                }
            }
        }
        
        // Dashboard Info (for the latest processed day)
        if (d === sortedDates.length - 1) {
            const lastCandle = currDayCandles[currDayCandles.length - 1];
            const prevDayPace = getCumulativeVolumeUpToTime(prevDayCandles, lastCandle.time);
            const ratio = prevDayPace > 0 ? currentDayCumulativeVol / prevDayPace : 1;
            const vwap = vwapMap.get(lastCandle.time);
            
            result.dashboard = {
                currentPace: currentDayCumulativeVol,
                yesterdayPace: prevDayPace,
                paceRatio: ratio,
                isHighPace: ratio > paceMultiplier,
                vwapStatus: vwap === undefined ? 'Neutral' : (lastCandle.close > vwap ? 'Above' : 'Below'),
                deltaStatus: currentDayBuyVol > currentDaySellVol * 1.2 ? 'Strong Buy' : (currentDaySellVol > currentDayBuyVol * 1.2 ? 'Strong Sell' : 'Neutral')
            };
        }
    }

    return result;
};




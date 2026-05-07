/**
 * Pattern Recognition Utility
 * Detects Candlestick Patterns and Market Structure (HH/LL)
 */

import { OHLCData } from './types';

export interface PatternMarker {
    time: number;
    position: 'aboveBar' | 'belowBar';
    color: string;
    shape: 'arrowUp' | 'arrowDown' | 'circle';
    text: string;
    type: string;
}

export interface PatternRecognitionResult {
    markers: PatternMarker[];
    marketStructure: {
        time: number;
        value: number;
        label: 'HH' | 'HL' | 'LH' | 'LL';
        color: string;
    }[];
}

export interface PatternRecognitionOptions {
    showCandlestickPatterns?: boolean;
    showMarketStructure?: boolean;
    lookback?: number;
    hammerColor?: string;
    engulfingColor?: string;
    structureColor?: string;
}

/**
 * Detect Candlestick Patterns and Market Structure
 */
export const calculatePatternRecognition = (
    data: OHLCData[],
    options: PatternRecognitionOptions = {}
): PatternRecognitionResult => {
    const {
        showCandlestickPatterns = true,
        showMarketStructure = true,
        lookback = 5,
        hammerColor = '#26A69A',
        engulfingColor = '#2196F3',
        structureColor = '#FF9800'
    } = options;

    const markers: PatternMarker[] = [];
    const marketStructure: PatternRecognitionResult['marketStructure'] = [];

    if (data.length < 3) return { markers, marketStructure };

    for (let i = 2; i < data.length; i++) {
        const curr = data[i];
        const prev = data[i - 1];
        
        const bodySize = Math.abs(curr.close - curr.open);
        const candleRange = curr.high - curr.low;
        const upperShadow = curr.high - Math.max(curr.open, curr.close);
        const lowerShadow = Math.min(curr.open, curr.close) - curr.low;
        const isBullish = curr.close > curr.open;
        const isBearish = curr.close < curr.open;

        if (showCandlestickPatterns) {
            // 1. Hammer Detection
            // Body is small, lower shadow is at least 2x body, upper shadow is tiny
            if (lowerShadow > bodySize * 2 && upperShadow < bodySize * 0.5 && bodySize > 0) {
                markers.push({
                    time: curr.time,
                    position: 'belowBar',
                    color: hammerColor,
                    shape: 'arrowUp',
                    text: 'Hammer',
                    type: 'candlestick'
                });
            }

            // 2. Shooting Star Detection
            if (upperShadow > bodySize * 2 && lowerShadow < bodySize * 0.5 && bodySize > 0) {
                markers.push({
                    time: curr.time,
                    position: 'aboveBar',
                    color: '#EF5350',
                    shape: 'arrowDown',
                    text: 'Shooting Star',
                    type: 'candlestick'
                });
            }

            // 3. Bullish Engulfing
            if (isBullish && prev.close < prev.open && curr.close > prev.open && curr.open < prev.close) {
                markers.push({
                    time: curr.time,
                    position: 'belowBar',
                    color: engulfingColor,
                    shape: 'circle',
                    text: 'Bullish Engulfing',
                    type: 'candlestick'
                });
            }

            // 4. Bearish Engulfing
            if (isBearish && prev.close > prev.open && curr.close < prev.open && curr.open > prev.close) {
                markers.push({
                    time: curr.time,
                    position: 'aboveBar',
                    color: '#EF5350',
                    shape: 'circle',
                    text: 'Bearish Engulfing',
                    type: 'candlestick'
                });
            }
        }

        if (showMarketStructure && i > lookback) {
            // Market Structure Detection (HH, HL, LH, LL)
            // A peak is a high higher than 'lookback' candles before and after (approx)
            const isHigh = curr.high === Math.max(...data.slice(i - lookback, i + 1).map(d => d.high));
            const isLow = curr.low === Math.min(...data.slice(i - lookback, i + 1).map(d => d.low));

            if (isHigh) {
                // Find previous high
                let prevHigh = -1;
                for (let j = marketStructure.length - 1; j >= 0; j--) {
                    if (marketStructure[j].label === 'HH' || marketStructure[j].label === 'LH') {
                        prevHigh = marketStructure[j].value;
                        break;
                    }
                }

                if (prevHigh !== -1) {
                    const label = curr.high > prevHigh ? 'HH' : 'LH';
                    marketStructure.push({
                        time: curr.time,
                        value: curr.high,
                        label,
                        color: structureColor
                    });
                } else {
                    marketStructure.push({
                        time: curr.time,
                        value: curr.high,
                        label: 'HH',
                        color: structureColor
                    });
                }
            }

            if (isLow) {
                // Find previous low
                let prevLow = -1;
                for (let j = marketStructure.length - 1; j >= 0; j--) {
                    if (marketStructure[j].label === 'HL' || marketStructure[j].label === 'LL') {
                        prevLow = marketStructure[j].value;
                        break;
                    }
                }

                if (prevLow !== -1) {
                    const label = curr.low > prevLow ? 'HL' : 'LL';
                    marketStructure.push({
                        time: curr.time,
                        value: curr.low,
                        label,
                        color: structureColor
                    });
                } else {
                    marketStructure.push({
                        time: curr.time,
                        value: curr.low,
                        label: 'LL',
                        color: structureColor
                    });
                }
            }
        }
    }

    return { markers, marketStructure };
};

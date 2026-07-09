/**
 * OHLC Candle data interface
 */
export interface OHLCData {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
}

/**
 * Heikin-Ashi candle data interface (same structure as OHLC)
 */
export interface HeikinAshiData extends OHLCData {}

/**
 * Calculate Heikin-Ashi candles from regular OHLC data
 * @param data - Array of OHLC candle data
 * @returns Array of Heikin-Ashi candle data
 */
export const calculateHeikinAshi = (data: OHLCData[]): HeikinAshiData[] => {
    if (!data || data.length === 0) return [];

    const haData: HeikinAshiData[] = [];

    // First HA candle
    let prevHA: HeikinAshiData = {
        open: (data[0].open + data[0].close) / 2,
        close: (data[0].open + data[0].high + data[0].low + data[0].close) / 4,
        high: data[0].high,
        low: data[0].low,
        time: data[0].time
    };
    haData.push(prevHA);

    for (let i = 1; i < data.length; i++) {
        const curr = data[i];

        const haClose = (curr.open + curr.high + curr.low + curr.close) / 4;
        const haOpen = (prevHA.open + prevHA.close) / 2;
        const haHigh = Math.max(curr.high, haOpen, haClose);
        const haLow = Math.min(curr.low, haOpen, haClose);

        const haCandle: HeikinAshiData = {
            time: curr.time,
            open: haOpen,
            high: haHigh,
            low: haLow,
            close: haClose
        };

        haData.push(haCandle);
        prevHA = haCandle;
    }

    return haData;
};

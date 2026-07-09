/**
 * Cumulative Volume Delta (CVD) Indicator
 *
 * When 1-min lower-timeframe data is available, delta for each bar is computed
 * by summing 1-min bar deltas within that bar's time window — exactly how
 * PineScript's ta.requestVolumeDelta(lowerTimeframe) works internally.
 * Wicks also come from the running 1-min CVD peak/trough within each bar.
 *
 * Without LTF data, falls back to current-TF bar direction (close vs open).
 */

import { OHLCData, CVDResult, CVDOptions } from './types';
import { getISTComponents } from './timeUtils';

export const calculateCVD = (data: OHLCData[], options: CVDOptions = {}, lowerTFData?: OHLCData[]): CVDResult[] => {
    if (!data || data.length === 0) return [];

    const { anchor = 'session', intervalSeconds = 180 } = options;
    const results: CVDResult[] = [];
    let cumulativeDelta = 0;
    let lastDateStr = '';
    let ltfIndex = 0; // pointer into sorted lowerTFData for O(n) scan

    const ltf = lowerTFData && lowerTFData.length > 0 ? lowerTFData : null;

    for (let i = 0; i < data.length; i++) {
        const bar = data[i];

        // Reset CVD at session boundary
        if (anchor === 'session') {
            const { dateStr } = getISTComponents(bar.time);
            if (lastDateStr && dateStr !== lastDateStr) {
                cumulativeDelta = 0;
            }
            lastDateStr = dateStr;
        }

        const open = cumulativeDelta;
        let delta = 0;
        let high: number;
        let low: number;

        if (ltf) {
            // Use 1-min bars for both DELTA and WICKS (matches ta.requestVolumeDelta)
            const barEnd = i + 1 < data.length ? data[i + 1].time : bar.time + intervalSeconds;

            // Advance pointer past bars before this 3-min bar
            while (ltfIndex < ltf.length && ltf[ltfIndex].time < bar.time) ltfIndex++;

            let intraCVD = open;
            let wickHigh = open;
            let wickLow = open;
            let found = false;

            for (let j = ltfIndex; j < ltf.length; j++) {
                const ltfBar = ltf[j];
                if (ltfBar.time >= barEnd) break;
                const ltfVol = ltfBar.volume || 0;
                const ltfDelta = ltfBar.close > ltfBar.open ? ltfVol :
                                 ltfBar.close < ltfBar.open ? -ltfVol : 0;
                delta += ltfDelta;
                intraCVD += ltfDelta;
                if (intraCVD > wickHigh) wickHigh = intraCVD;
                if (intraCVD < wickLow) wickLow = intraCVD;
                found = true;
            }

            cumulativeDelta = open + delta;
            const close = cumulativeDelta;

            high = found ? Math.max(wickHigh, close) : Math.max(open, close);
            low  = found ? Math.min(wickLow,  close) : Math.min(open, close);

            results.push({ time: bar.time, open, high, low, close, delta });
        } else {
            // Fallback: classify by current-TF bar direction
            const volume = bar.volume || 0;
            if (bar.close > bar.open) delta = volume;
            else if (bar.close < bar.open) delta = -volume;

            cumulativeDelta += delta;
            const close = cumulativeDelta;

            high = Math.max(open, close);
            low  = Math.min(open, close);

            results.push({ time: bar.time, open, high, low, close, delta });
        }
    }

    return results;
};

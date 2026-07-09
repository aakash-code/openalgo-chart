import { Time, CandlestickData, LineData } from 'lightweight-charts';

export function generateCandleData(count: number = 500): CandlestickData[] {
    const result: CandlestickData[] = [];
    let time = Math.floor(Date.now() / 1000) - count * 24 * 60 * 60;
    let lastClose = 100;

    for (let i = 0; i < count; i++) {
        const open = lastClose + (Math.random() - 0.5) * 2;
        const high = open + Math.random() * 2;
        const low = open - Math.random() * 2;
        const close = low + Math.random() * (high - low);
        
        result.push({
            time: time as Time,
            open,
            high,
            low,
            close,
        });

        time += 24 * 60 * 60;
        lastClose = close;
    }

    return result;
}

export function generateLineData(count: number = 500): LineData[] {
    const result: LineData[] = [];
    let time = Math.floor(Date.now() / 1000) - count * 24 * 60 * 60;
    let lastValue = 100;

    for (let i = 0; i < count; i++) {
        const value = lastValue + (Math.random() - 0.5) * 2;
        result.push({
            time: time as Time,
            value,
        });
        time += 24 * 60 * 60;
        lastValue = value;
    }

    return result;
}

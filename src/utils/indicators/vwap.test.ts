import { describe, expect, it } from 'vitest';
import { calculateVWAP } from './vwap';

describe('calculateVWAP', () => {
  it('preserves the prior VWAP on zero-volume candles when ignoreVolume is false', () => {
    const data = [
      { time: 1, open: 100, high: 102, low: 98, close: 100, volume: 10 },
      { time: 2, open: 120, high: 122, low: 118, close: 120, volume: 0 },
    ];

    const result = calculateVWAP(data, { ignoreVolume: false, resetDaily: false });

    expect(result).toHaveLength(2);
    expect(result[0].value).toBe(100);
    expect(result[1].value).toBe(100);
  });

  it('falls back to equal weighting when ignoreVolume is true', () => {
    const data = [
      { time: 1, open: 100, high: 102, low: 98, close: 100, volume: 10 },
      { time: 2, open: 120, high: 122, low: 118, close: 120, volume: 0 },
    ];

    const result = calculateVWAP(data, { ignoreVolume: true, resetDaily: false });

    expect(result).toHaveLength(2);
    expect(result[0].value).toBe(100);
    expect(result[1].value).toBe(110);
  });
});

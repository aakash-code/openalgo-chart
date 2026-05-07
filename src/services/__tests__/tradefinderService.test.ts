import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateMarketRadar } from '../tradefinderService';
import * as openalgo from '../openalgo';

vi.mock('../openalgo', () => ({
  getKlines: vi.fn(),
}));

// Mock sector mapping
vi.mock('../../components/PositionTracker/sectorMapping', () => ({
  SECTOR_MAP: { 'RELIANCE': 'Oil&Gas', 'TCS': 'IT' },
  SECTORS: ['All', 'Oil&Gas', 'IT'],
  getSector: (s: string) => s === 'RELIANCE' ? 'Oil&Gas' : 'IT'
}));

describe('tradefinderService (Market Radar)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should calculate pulse score and market mode correctly', async () => {
    // Mock data for 2 stocks
    // RELIANCE: Bullish (Above 20 & 50 SMA)
    // TCS: Neutral (Above 20 but below 50 SMA)
    const mockRelianceKlines = [
      ...Array(50).fill({ close: 100, volume: 100, time: 0 }),
      { close: 200, volume: 100, time: 100 } // Well above SMA
    ];
    const mockTcsKlines = [
      ...Array(50).fill({ close: 100, volume: 100, time: 0 }),
      { close: 105, volume: 100, time: 100 } // slightly above SMA
    ];
    
    vi.mocked(openalgo.getKlines)
      .mockResolvedValueOnce(mockRelianceKlines as any)
      .mockResolvedValueOnce(mockTcsKlines as any);

    const stocks = [
      { symbol: 'RELIANCE', exchange: 'NSE' },
      { symbol: 'TCS', exchange: 'NSE' }
    ];

    const result = await calculateMarketRadar(stocks, { interval: '1d' });

    expect(result.pulseScore).toBeGreaterThan(0);
    expect(result.totalScanned).toBe(2);
    expect(result.sectorData.length).toBeGreaterThan(0);
  });
});

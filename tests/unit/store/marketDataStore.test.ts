/**
 * Market Data Store Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useMarketDataStore } from '@/store/marketDataStore';

describe('Market Data Store', () => {
  beforeEach(() => {
    // Reset store before each test
    useMarketDataStore.setState({ tickerData: {} });
  });

  describe('updateTicker', () => {
    it('should add new ticker data', () => {
      const { updateTicker, getTicker } = useMarketDataStore.getState();

      updateTicker('RELIANCE', 'NSE', { ltp: 2500, volume: 1000000 });

      const ticker = getTicker('RELIANCE', 'NSE');
      expect(ticker).toBeDefined();
      expect(ticker?.ltp).toBe(2500);
      expect(ticker?.volume).toBe(1000000);
    });

    it('should update existing ticker data', () => {
      const { updateTicker, getTicker } = useMarketDataStore.getState();

      updateTicker('RELIANCE', 'NSE', { ltp: 2500 });
      updateTicker('RELIANCE', 'NSE', { ltp: 2550 });

      const ticker = getTicker('RELIANCE', 'NSE');
      expect(ticker?.ltp).toBe(2550);
    });

    it('should not update if data unchanged', () => {
      const { updateTicker } = useMarketDataStore.getState();

      updateTicker('RELIANCE', 'NSE', { ltp: 2500, volume: 1000 });
      const stateBefore = useMarketDataStore.getState().tickerData;

      updateTicker('RELIANCE', 'NSE', { ltp: 2500, volume: 1000 });
      const stateAfter = useMarketDataStore.getState().tickerData;

      // Should be same reference if no change
      expect(stateBefore).toBe(stateAfter);
    });
  });

  describe('updateTickers', () => {
    it('should batch update multiple tickers', () => {
      const { updateTickers, getTicker } = useMarketDataStore.getState();

      updateTickers([
        { symbol: 'RELIANCE', exchange: 'NSE', data: { ltp: 2500 } },
        { symbol: 'TCS', exchange: 'NSE', data: { ltp: 3500 } },
        { symbol: 'INFY', exchange: 'NSE', data: { ltp: 1500 } },
      ]);

      expect(getTicker('RELIANCE', 'NSE')?.ltp).toBe(2500);
      expect(getTicker('TCS', 'NSE')?.ltp).toBe(3500);
      expect(getTicker('INFY', 'NSE')?.ltp).toBe(1500);
    });
  });

  describe('clearTicker', () => {
    it('should remove ticker data', () => {
      const { updateTicker, clearTicker, getTicker } = useMarketDataStore.getState();

      updateTicker('RELIANCE', 'NSE', { ltp: 2500 });
      expect(getTicker('RELIANCE', 'NSE')).toBeDefined();

      clearTicker('RELIANCE', 'NSE');
      expect(getTicker('RELIANCE', 'NSE')).toBeUndefined();
    });
  });

  describe('clearAllTickers', () => {
    it('should clear all ticker data', () => {
      const { updateTicker, clearAllTickers } = useMarketDataStore.getState();

      updateTicker('RELIANCE', 'NSE', { ltp: 2500 });
      updateTicker('TCS', 'NSE', { ltp: 3500 });

      clearAllTickers();

      const { tickerData } = useMarketDataStore.getState();
      expect(Object.keys(tickerData).length).toBe(0);
    });
  });
});

/**
 * Market Data Store
 * Stores real-time data for symbols using Zustand
 * This allows any component to subscribe to price updates without prop drilling
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

/** Ticker data for a single symbol */
export interface TickerData {
  ltp: number;
  chg?: number;
  chgP?: number;
  volume?: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  prevClose?: number;
  bidPrice?: number;
  askPrice?: number;
  bidQuantity?: number;
  askQuantity?: number;
  lastUpdated: number;
}

/** Update payload for a single ticker */
export interface TickerUpdate {
  symbol: string;
  exchange: string;
  data: Partial<TickerData>;
}

/** Market data store state */
interface MarketDataState {
  tickerData: Record<string, TickerData>;
  subscriptions: Set<string>;
}

/** Market data store actions */
interface MarketDataActions {
  updateTicker: (symbol: string, exchange: string, data: Partial<TickerData>) => void;
  updateTickers: (updates: TickerUpdate[]) => void;
  getTicker: (symbol: string, exchange: string) => TickerData | undefined;
  clearTicker: (symbol: string, exchange: string) => void;
  clearAllTickers: () => void;
}

/** Combined store type */
type MarketDataStore = MarketDataState & MarketDataActions;

/**
 * Create the market data store
 */
export const useMarketDataStore = create<MarketDataStore>()(
  subscribeWithSelector((set, get) => ({
    tickerData: {},
    subscriptions: new Set(),

    updateTicker: (symbol, exchange, data) =>
      set((state) => {
        const key = `${symbol}:${exchange || 'NSE'}`;
        const oldData = state.tickerData[key];

        // Only update if changed (optimization)
        if (oldData?.ltp === data.ltp && oldData?.volume === data.volume) {
          return state;
        }

        return {
          tickerData: {
            ...state.tickerData,
            [key]: {
              ...oldData,
              ...data,
              lastUpdated: Date.now(),
            } as TickerData,
          },
        };
      }),

    updateTickers: (updates) =>
      set((state) => {
        const newTickerData = { ...state.tickerData };
        let hasChanges = false;

        updates.forEach(({ symbol, exchange, data }) => {
          const key = `${symbol}:${exchange || 'NSE'}`;
          const existingData = newTickerData[key];

          if (existingData?.ltp !== data.ltp) {
            newTickerData[key] = {
              ...existingData,
              ...data,
              lastUpdated: Date.now(),
            } as TickerData;
            hasChanges = true;
          }
        });

        if (!hasChanges) return state;
        return { tickerData: newTickerData };
      }),

    getTicker: (symbol, exchange) => {
      const key = `${symbol}:${exchange || 'NSE'}`;
      return get().tickerData[key];
    },

    clearTicker: (symbol, exchange) =>
      set((state) => {
        const key = `${symbol}:${exchange || 'NSE'}`;
        const { [key]: _, ...rest } = state.tickerData;
        return { tickerData: rest };
      }),

    clearAllTickers: () => set({ tickerData: {} }),
  }))
);

/**
 * Selector for getting ticker data for a specific symbol
 */
export const selectTicker = (symbol: string, exchange: string) => (state: MarketDataStore) => {
  const key = `${symbol}:${exchange || 'NSE'}`;
  return state.tickerData[key];
};

/**
 * Selector for getting LTP only
 */
export const selectLTP = (symbol: string, exchange: string) => (state: MarketDataStore) => {
  const key = `${symbol}:${exchange || 'NSE'}`;
  return state.tickerData[key]?.ltp;
};

export default useMarketDataStore;

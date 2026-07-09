/**
 * Tick Store Module
 * Manages tick data storage and listeners
 */

import logger from '../utils/logger';

/** Tick data structure */
export interface Tick {
  time: number;
  price: number;
  volume?: number;
  buyVolume?: number;
  sellVolume?: number;
  side?: 'buy' | 'sell';
}

/** Tick listener callback type */
export type TickListener = (tick: Tick) => void;

/** Store for a single symbol */
interface SymbolTickStore {
  ticks: Tick[];
  footprints: Map<number, unknown>;
  listeners: Set<TickListener>;
}

// Maximum ticks to keep in memory per symbol (circular buffer)
export const MAX_TICKS_IN_MEMORY = 10000;

// Tick data storage per symbol
const tickStore = new Map<string, SymbolTickStore>();

/**
 * Initialize tick store for a symbol
 * @param symbol - Symbol name
 * @param exchange - Exchange name
 * @returns Store object
 */
export const initTickStore = (symbol: string, exchange: string): SymbolTickStore => {
  const key = `${symbol}:${exchange}`;
  if (!tickStore.has(key)) {
    tickStore.set(key, {
      ticks: [],
      footprints: new Map(),
      listeners: new Set(),
    });
  }
  return tickStore.get(key)!;
};

/**
 * Add a tick to the store (circular buffer)
 * @param symbol - Symbol name
 * @param exchange - Exchange name
 * @param tick - Tick data
 */
export const addTick = (symbol: string, exchange: string, tick: Tick): void => {
  const store = initTickStore(symbol, exchange);

  // Add to circular buffer
  store.ticks.push(tick);
  if (store.ticks.length > MAX_TICKS_IN_MEMORY) {
    store.ticks.shift();
  }

  // Notify listeners
  store.listeners.forEach((listener) => {
    try {
      listener(tick);
    } catch (error) {
      logger.debug('[TickStore] Error in tick listener:', error);
    }
  });
};

/**
 * Get ticks for a symbol within a time range
 * @param symbol - Symbol name
 * @param exchange - Exchange name
 * @param fromTime - Start time in milliseconds
 * @param toTime - End time in milliseconds
 * @returns Ticks in range
 */
export const getTicksInRange = (
  symbol: string,
  exchange: string,
  fromTime: number,
  toTime: number
): Tick[] => {
  const key = `${symbol}:${exchange}`;
  const store = tickStore.get(key);
  if (!store) return [];

  return store.ticks.filter((tick) => tick.time >= fromTime && tick.time <= toTime);
};

/**
 * Get all stored ticks for a symbol
 * @param symbol - Symbol name
 * @param exchange - Exchange name
 * @returns All ticks
 */
export const getAllTicks = (symbol: string, exchange: string): Tick[] => {
  const key = `${symbol}:${exchange}`;
  const store = tickStore.get(key);
  return store ? [...store.ticks] : [];
};

/**
 * Add a tick listener for real-time updates
 * @param symbol - Symbol name
 * @param exchange - Exchange name
 * @param listener - Callback function
 * @returns Unsubscribe function
 */
export const addTickListener = (
  symbol: string,
  exchange: string,
  listener: TickListener
): (() => void) => {
  const store = initTickStore(symbol, exchange);
  store.listeners.add(listener);

  return () => {
    store.listeners.delete(listener);
  };
};

/**
 * Clear tick data for a symbol
 * @param symbol - Symbol name
 * @param exchange - Exchange name
 */
export const clearTickData = (symbol: string, exchange: string): void => {
  const key = `${symbol}:${exchange}`;
  tickStore.delete(key);
};

/**
 * Get the raw tick store (for internal use)
 * @returns The tick store Map
 */
export const getTickStore = (): Map<string, SymbolTickStore> => tickStore;

export default {
  initTickStore,
  addTick,
  getTicksInRange,
  getAllTicks,
  addTickListener,
  clearTickData,
  getTickStore,
  MAX_TICKS_IN_MEMORY,
};

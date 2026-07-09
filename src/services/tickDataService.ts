/**
 * Tick Data Service for Order Flow Analysis
 * Handles tick-level data subscription, aggregation, and footprint calculation
 */

import logger from '../utils/logger';

// Import constants from dedicated module
import { WS_MODES } from './tickConstants';

// Re-export WS_MODES for backward compatibility
export { WS_MODES };

// Maximum ticks to keep in memory per symbol (circular buffer)
const MAX_TICKS_IN_MEMORY = 10000;

/** Tick data structure */
export interface Tick {
  time: number;
  price: number;
  volume: number;
  side: 'buy' | 'sell';
  bid?: number;
  ask?: number;
}

/** Footprint level data structure */
export interface FootprintLevel {
  price: number;
  buyVolume: number;
  sellVolume: number;
  delta: number;
  trades: number;
  buyTrades: number;
  sellTrades: number;
  imbalance: 'buy' | 'sell' | null;
}

/** Tick listener callback */
type TickListener = (tick: Tick) => void;

/**
 * O(1) Circular Buffer for tick storage
 * Uses head pointer arithmetic instead of Array.shift() (which is O(n))
 */
class CircularBuffer<T> {
  private buffer: (T | undefined)[];
  private head = 0;
  private _size = 0;
  private capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
  }

  push(item: T): void {
    const idx = (this.head + this._size) % this.capacity;
    this.buffer[idx] = item;
    if (this._size < this.capacity) {
      this._size++;
    } else {
      // Buffer is full — overwrite oldest and advance head
      this.head = (this.head + 1) % this.capacity;
    }
  }

  /** Convert to ordered array (oldest first) */
  toArray(): T[] {
    const result: T[] = new Array(this._size);
    for (let i = 0; i < this._size; i++) {
      result[i] = this.buffer[(this.head + i) % this.capacity]!;
    }
    return result;
  }

  /** Filter items matching a predicate (returns new array) */
  filter(predicate: (item: T) => boolean): T[] {
    const result: T[] = [];
    for (let i = 0; i < this._size; i++) {
      const item = this.buffer[(this.head + i) % this.capacity]!;
      if (predicate(item)) {
        result.push(item);
      }
    }
    return result;
  }

  get length(): number { return this._size; }

  /** Iterate over all items in order (oldest first) without allocating */
  forEach(callback: (item: T, index: number) => void): void {
    for (let i = 0; i < this._size; i++) {
      callback(this.buffer[(this.head + i) % this.capacity]!, i);
    }
  }

  clear(): void {
    this.head = 0;
    this._size = 0;
  }
}

/** Symbol tick store */
interface SymbolTickStore {
  ticks: CircularBuffer<Tick>;
  footprints: Map<number, FootprintLevel>;
  listeners: Set<TickListener>;
}

/** Tick subscription handle */
interface TickSubscription {
  close: () => void;
  subscription?: {
    close: () => void;
    readyState: number;
  };
}

/** WebSocket message data */
interface WSMessageData {
  ltp?: number | string;
  last_price?: number | string;
  price?: number | string;
  volume?: number | string;
  last_traded_qty?: number | string;
  qty?: number | string;
  bid?: number | string;
  ask?: number | string;
  side?: 'buy' | 'sell';
  buyer_initiated?: boolean;
  timestamp?: number;
}

/** WebSocket message */
interface WSMessage {
  type: string;
  symbol?: string;
  data?: WSMessageData;
  tick?: WSMessageData;
}

// Active tick subscriptions
const tickSubscriptions = new Map<string, TickSubscription>();

// Tick data storage per symbol
const tickStore = new Map<string, SymbolTickStore>();

/**
 * Initialize tick store for a symbol
 */
const initTickStore = (symbol: string, exchange: string): SymbolTickStore => {
  const key = `${symbol}:${exchange}`;
  if (!tickStore.has(key)) {
    tickStore.set(key, {
      ticks: new CircularBuffer<Tick>(MAX_TICKS_IN_MEMORY),
      footprints: new Map(),
      listeners: new Set(),
    });
  }
  return tickStore.get(key)!;
};

/**
 * Add a tick to the store (O(1) circular buffer - no Array.shift())
 */
const addTick = (symbol: string, exchange: string, tick: Tick): void => {
  const store = initTickStore(symbol, exchange);

  // O(1) push into circular buffer (automatically evicts oldest when full)
  store.ticks.push(tick);

  // Notify listeners
  store.listeners.forEach((listener) => {
    try {
      listener(tick);
    } catch (error) {
      logger.debug('[TickService] Error in tick listener:', error);
    }
  });
};

/**
 * Get ticks for a symbol within a time range
 * @param symbol - Symbol name
 * @param exchange - Exchange code
 * @param fromTime - Start time in milliseconds
 * @param toTime - End time in milliseconds
 * @returns Array of ticks in range
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
 */
export const getAllTicks = (symbol: string, exchange: string): Tick[] => {
  const key = `${symbol}:${exchange}`;
  const store = tickStore.get(key);
  return store ? store.ticks.toArray() : [];
};

/**
 * Add a tick listener for real-time updates
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
 */
export const clearTickData = (symbol: string, exchange: string): void => {
  const key = `${symbol}:${exchange}`;
  tickStore.delete(key);
};

/**
 * Calculate price step (tick size) based on price
 */
export const calculatePriceStep = (price: number): number => {
  if (price < 50) return 0.05;
  if (price < 250) return 0.05;
  if (price < 500) return 0.1;
  if (price < 1000) return 0.25;
  if (price < 5000) return 0.5;
  if (price < 10000) return 1.0;
  return 5.0;
};

/**
 * Round price to nearest price step
 */
export const roundToStep = (price: number, step: number): number => {
  return Math.round(price / step) * step;
};

/**
 * Aggregate ticks into footprint data for a candle
 * @param ticks - Array of ticks within the candle period
 * @param priceStep - Price level step size
 * @returns Map of price level to footprint data
 */
export const aggregateTicksToFootprint = (
  ticks: Tick[],
  priceStep: number
): Map<number, FootprintLevel> => {
  const footprint = new Map<number, FootprintLevel>();

  ticks.forEach((tick) => {
    const level = roundToStep(tick.price, priceStep);

    if (!footprint.has(level)) {
      footprint.set(level, {
        price: level,
        buyVolume: 0,
        sellVolume: 0,
        delta: 0,
        trades: 0,
        buyTrades: 0,
        sellTrades: 0,
        imbalance: null,
      });
    }

    const fp = footprint.get(level)!;
    fp.trades += 1;

    if (tick.side === 'buy') {
      fp.buyVolume += tick.volume;
      fp.buyTrades += 1;
    } else {
      fp.sellVolume += tick.volume;
      fp.sellTrades += 1;
    }

    fp.delta = fp.buyVolume - fp.sellVolume;
  });

  return footprint;
};

/**
 * Calculate footprint for a specific candle time range
 * @param symbol - Symbol name
 * @param exchange - Exchange code
 * @param candleStartTime - Candle start time in seconds (UTC)
 * @param candleEndTime - Candle end time in seconds (UTC)
 * @param priceStep - Price level step size
 * @returns Footprint data map
 */
export const calculateFootprintForCandle = (
  symbol: string,
  exchange: string,
  candleStartTime: number,
  candleEndTime: number,
  priceStep: number
): Map<number, FootprintLevel> => {
  // Convert to milliseconds for tick comparison
  const fromTime = candleStartTime * 1000;
  const toTime = candleEndTime * 1000;

  const ticks = getTicksInRange(symbol, exchange, fromTime, toTime);
  return aggregateTicksToFootprint(ticks, priceStep);
};

/** Subscription handle */
interface SubscriptionHandle {
  close: () => void;
  forceClose: () => void;
  readonly readyState: number;
}

/**
 * Subscribe to real-time tick data via SHARED WebSocket (Mode 3)
 * REFACTORED: Now uses sharedWebSocket from openalgo.js instead of creating a separate connection.
 *
 * @param symbol - Trading symbol
 * @param exchange - Exchange code
 * @param callback - Callback for each tick
 * @returns Subscription handle with close() method
 */
export const subscribeToTicks = (
  symbol: string,
  exchange: string = 'NSE',
  callback?: TickListener
): SubscriptionHandle => {
  const key = `${symbol}:${exchange}`;

  // Initialize store
  initTickStore(symbol, exchange);

  // Import sharedWebSocket dynamically to avoid circular dependency
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { sharedWebSocket } = require('./openalgo.js') as {
    sharedWebSocket: {
      subscribe: (
        symbols: Array<{ symbol: string; exchange: string }>,
        callback: (message: WSMessage) => void,
        mode: number
      ) => { close: () => void; readyState: number };
    };
  };

  // Subscribe using the shared WebSocket manager
  const subscription = sharedWebSocket.subscribe(
    [{ symbol, exchange }],
    (message: WSMessage) => {
      // Only process messages for our symbol
      if (message.type !== 'market_data' && message.type !== 'tick_data') return;
      if (message.symbol !== symbol) return;

      const data = message.data || message.tick || {};
      const ltp = parseFloat(String(data.ltp || data.last_price || data.price || 0));
      const volume = parseFloat(String(data.volume || data.last_traded_qty || data.qty || 1));

      // Infer trade direction from LTP vs bid/ask if available
      let side: 'buy' | 'sell' = 'buy';
      if (data.bid && data.ask) {
        const mid = (parseFloat(String(data.bid)) + parseFloat(String(data.ask))) / 2;
        side = ltp >= mid ? 'buy' : 'sell';
      } else if (data.side) {
        side = data.side;
      } else if (data.buyer_initiated !== undefined) {
        side = data.buyer_initiated ? 'buy' : 'sell';
      }

      if (ltp > 0) {
        const tick: Tick = {
          time: data.timestamp || Date.now(),
          price: ltp,
          volume: volume,
          side: side,
          bid: parseFloat(String(data.bid || 0)),
          ask: parseFloat(String(data.ask || 0)),
        };

        // Store the tick
        addTick(symbol, exchange, tick);

        // Call the callback
        if (callback) {
          callback(tick);
        }
      }
    },
    WS_MODES.TICK // Mode 3 for tick data
  );

  // Store subscription reference
  tickSubscriptions.set(key, {
    subscription,
    close: () => subscription.close(),
  });

  // Return managed interface compatible with existing code
  return {
    close: () => {
      tickSubscriptions.delete(key);
      subscription.close();
    },
    forceClose: () => {
      tickSubscriptions.delete(key);
      subscription.close();
    },
    get readyState() {
      return subscription.readyState;
    },
  };
};

/**
 * Close all tick subscriptions
 */
export const closeAllTickSubscriptions = (): void => {
  tickSubscriptions.forEach((sub, key) => {
    try {
      if (sub.close) sub.close();
    } catch (error) {
      logger.debug('[TickService] Error closing subscription:', key, error);
    }
  });
  tickSubscriptions.clear();
};

/** Tick statistics */
export interface TickStats {
  tickCount: number;
  buyVolume: number;
  sellVolume: number;
  delta: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
}

/**
 * Get tick statistics for a symbol
 */
export const getTickStats = (symbol: string, exchange: string): TickStats => {
  const key = `${symbol}:${exchange}`;
  const store = tickStore.get(key);

  if (!store || store.ticks.length === 0) {
    return {
      tickCount: 0,
      buyVolume: 0,
      sellVolume: 0,
      delta: 0,
      avgPrice: 0,
      minPrice: 0,
      maxPrice: 0,
    };
  }

  let buyVolume = 0;
  let sellVolume = 0;
  let totalPrice = 0;
  let minPrice = Infinity;
  let maxPrice = -Infinity;

  store.ticks.forEach((tick) => {
    if (tick.side === 'buy') {
      buyVolume += tick.volume;
    } else {
      sellVolume += tick.volume;
    }
    totalPrice += tick.price * tick.volume;
    minPrice = Math.min(minPrice, tick.price);
    maxPrice = Math.max(maxPrice, tick.price);
  });

  const totalVolume = buyVolume + sellVolume;

  return {
    tickCount: store.ticks.length,
    buyVolume,
    sellVolume,
    delta: buyVolume - sellVolume,
    avgPrice: totalVolume > 0 ? totalPrice / totalVolume : 0,
    minPrice: minPrice === Infinity ? 0 : minPrice,
    maxPrice: maxPrice === -Infinity ? 0 : maxPrice,
  };
};

export default {
  subscribeToTicks,
  getTicksInRange,
  getAllTicks,
  addTickListener,
  clearTickData,
  aggregateTicksToFootprint,
  calculateFootprintForCandle,
  calculatePriceStep,
  roundToStep,
  getTickStats,
  closeAllTickSubscriptions,
  WS_MODES,
};

/**
 * Account Service
 * Trading account operations - funds, positions, orders, holdings
 */

import { makeApiRequest } from '../api/client';
import { ACCOUNT_ENDPOINTS } from '../api/endpoints';
import type {
  Funds,
  Position,
  Order,
  Holding,
  Trade,
  OrderBookResponse,
  HoldingsResponse,
  PingResponse,
} from '@/types/api';

/**
 * Ping API - Check connectivity and validate API key
 */
export async function ping(): Promise<PingResponse | null> {
  return makeApiRequest<PingResponse>(ACCOUNT_ENDPOINTS.PING, {}, {
    context: 'Ping',
    defaultValue: null,
    rawResponse: true,
  });
}

/**
 * Get Funds - Fetch account balance and margin details
 */
export async function getFunds(): Promise<Funds | null> {
  return makeApiRequest<Funds>(ACCOUNT_ENDPOINTS.FUNDS, {}, {
    context: 'Funds',
    defaultValue: null,
  });
}

/**
 * Get Position Book - Fetch current open positions
 */
export async function getPositionBook(): Promise<Position[]> {
  const result = await makeApiRequest<any>(
    ACCOUNT_ENDPOINTS.POSITION_BOOK,
    {},
    {
      context: 'PositionBook',
      defaultValue: [],
      rawResponse: true,
    }
  );

  // Handle different response formats from OpenAlgo API
  if (result) {
    // Direct array response
    if (Array.isArray(result)) return result;
    // Nested in data field
    if (Array.isArray(result.data)) return result.data;
    // Nested in positionbook field
    if (Array.isArray(result.positionbook)) return result.positionbook;
    // Nested in positions field
    if (Array.isArray(result.positions)) return result.positions;
  }
  return [];
}

/**
 * Get Order Book - Fetch all orders with statistics
 */
export async function getOrderBook(): Promise<OrderBookResponse> {
  const defaultStats = { total: 0, open: 0, completed: 0, rejected: 0 };

  const result = await makeApiRequest<any>(
    ACCOUNT_ENDPOINTS.ORDER_BOOK,
    {},
    {
      context: 'OrderBook',
      defaultValue: { orders: [], statistics: defaultStats },
      rawResponse: true,
    }
  );

  // Handle different response formats from OpenAlgo API
  if (result) {
    // Already has orders field
    if (Array.isArray(result.orders)) {
      return { orders: result.orders, statistics: result.statistics || defaultStats };
    }
    // Nested in data.orders
    if (result.data && Array.isArray(result.data.orders)) {
      return { orders: result.data.orders, statistics: result.data.statistics || defaultStats };
    }
    // Nested in data field directly as array
    if (Array.isArray(result.data)) {
      return { orders: result.data, statistics: defaultStats };
    }
    // Nested in orderbook field
    if (Array.isArray(result.orderbook)) {
      return { orders: result.orderbook, statistics: defaultStats };
    }
    // Direct array response
    if (Array.isArray(result)) {
      return { orders: result, statistics: defaultStats };
    }
  }

  return { orders: [], statistics: defaultStats };
}

/**
 * Get Trade Book - Fetch executed trades
 */
export async function getTradeBook(): Promise<Trade[]> {
  const result = await makeApiRequest<any>(
    ACCOUNT_ENDPOINTS.TRADE_BOOK,
    {},
    {
      context: 'TradeBook',
      defaultValue: [],
      rawResponse: true,
    }
  );

  // Handle different response formats from OpenAlgo API
  if (result) {
    // Direct array response
    if (Array.isArray(result)) return result;
    // Nested in data field
    if (Array.isArray(result.data)) return result.data;
    // Nested in tradebook field
    if (Array.isArray(result.tradebook)) return result.tradebook;
    // Nested in trades field
    if (Array.isArray(result.trades)) return result.trades;
  }
  return [];
}

/**
 * Get Holdings - Fetch long-term stock holdings with P&L
 */
export async function getHoldings(): Promise<HoldingsResponse> {
  const defaultStats = {
    total_investment: 0,
    total_current_value: 0,
    total_pnl: 0,
    total_pnl_percent: 0,
    day_pnl: 0,
    day_pnl_percent: 0,
  };

  const result = await makeApiRequest<any>(
    ACCOUNT_ENDPOINTS.HOLDINGS,
    {},
    {
      context: 'Holdings',
      defaultValue: { holdings: [], statistics: defaultStats },
      rawResponse: true,
    }
  );

  // Handle different response formats from OpenAlgo API
  if (result) {
    // Already has holdings field
    if (Array.isArray(result.holdings)) {
      return { holdings: result.holdings, statistics: result.statistics || defaultStats };
    }
    // Nested in data.holdings
    if (result.data && Array.isArray(result.data.holdings)) {
      return { holdings: result.data.holdings, statistics: result.data.statistics || defaultStats };
    }
    // Nested in data field directly as array
    if (Array.isArray(result.data)) {
      return { holdings: result.data, statistics: defaultStats };
    }
    // Direct array response
    if (Array.isArray(result)) {
      return { holdings: result, statistics: defaultStats };
    }
  }

  return { holdings: [], statistics: defaultStats };
}

/**
 * Fetch all account data in parallel
 */
export async function fetchAllAccountData(): Promise<{
  funds: Funds | null;
  positions: Position[];
  orders: Order[];
  trades: Trade[];
  holdings: Holding[];
}> {
  const [funds, positions, orderBook, trades, holdingsResponse] = await Promise.all([
    getFunds(),
    getPositionBook(),
    getOrderBook(),
    getTradeBook(),
    getHoldings(),
  ]);

  return {
    funds,
    positions,
    orders: orderBook.orders,
    trades,
    holdings: holdingsResponse.holdings,
  };
}

export default {
  ping,
  getFunds,
  getPositionBook,
  getOrderBook,
  getTradeBook,
  getHoldings,
  fetchAllAccountData,
};

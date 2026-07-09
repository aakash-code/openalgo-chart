/**
 * Trading Data Hook
 * EVENT-DRIVEN Trading Data Management
 *
 * Strategy:
 * 1. Fetch data immediately when authenticated
 * 2. Subscribe to price WebSocket for positions (existing)
 * 3. Use event-driven updates for orders (fetch after operations)
 * 4. Backup polling at 10 seconds (safety net for missed updates)
 *
 * This avoids aggressive polling while ensuring real-time updates.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getPositionBook,
  getOrderBook,
  getFunds,
  getHoldings,
  getTradeBook,
} from '../services/openalgo';
import { subscribeToNetworkRecovery } from '../services/connectionStatus';
import logger from '../utils/logger';

// ==================== TYPES ====================

/** Position data from broker */
export interface Position {
  symbol: string;
  exchange: string;
  product: string;
  quantity: string | number;
  average_price?: string | number | undefined;
  ltp?: string | number | undefined;
  pnl?: string | number | undefined;
  [key: string]: unknown;
}

/** Order data from broker */
export interface Order {
  orderid: string;
  order_id?: string | undefined;
  symbol: string;
  exchange: string;
  action: string;
  product: string;
  pricetype: string;
  quantity: string | number;
  price?: string | number | undefined;
  trigger_price?: string | number | undefined;
  disclosed_quantity?: string | number | undefined;
  status?: string | undefined;
  order_status?: string | undefined;
  filledqty?: string | number | undefined;
  average_price?: string | number | undefined;
  [key: string]: unknown;
}

/** Funds data from broker */
export interface Funds {
  availablecash?: string | number | undefined;
  collateral?: string | number | undefined;
  m2munrealized?: string | number | undefined;
  m2mrealized?: string | number | undefined;
  utiliseddebits?: string | number | undefined;
  [key: string]: unknown;
}

/** Holding data from broker */
export interface Holding {
  symbol: string;
  exchange: string;
  quantity: string | number;
  average_price?: string | number | undefined;
  ltp?: string | number | undefined;
  pnl?: string | number | undefined;
  [key: string]: unknown;
}

/** Trade data from broker */
export interface Trade {
  tradeid?: string | undefined;
  orderid?: string | undefined;
  symbol: string;
  exchange: string;
  action: string;
  quantity: string | number;
  price: string | number;
  timestamp?: string | undefined;
  [key: string]: unknown;
}

/** Order book response */
interface OrderBookResponse {
  orders?: Order[] | undefined;
  [key: string]: unknown;
}

/** Holdings response */
interface HoldingsResponse {
  holdings?: Holding[] | undefined;
  [key: string]: unknown;
}

/** Hook return type */
export interface UseTradingDataReturn {
  positions: Position[];
  orders: Order[];
  funds: Funds;
  holdings: Holding[];
  trades: Trade[];
  activeOrders: Order[];
  activePositions: Position[];
  refreshTradingData: () => Promise<void>;
}

// ==================== HOOK ====================

/**
 * Custom hook for trading data management
 * @param isAuthenticated - Whether user is authenticated
 * @returns Trading data and refresh function
 */
export const useTradingData = (isAuthenticated: boolean): UseTradingDataReturn => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [funds, setFunds] = useState<Funds>({});
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [activePositions, setActivePositions] = useState<Position[]>([]);

  // Use refs to track if component is mounted to prevent state updates after unmount
  const isMounted = useRef(true);
  const fetchInProgress = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Shared fetch logic
  const fetchData = useCallback(
    async (source: string = 'auto') => {
      if (!isAuthenticated) return;

      // MEDIUM FIX RC-9: Atomic check-and-set to prevent concurrent fetches
      if (fetchInProgress.current) return;
      fetchInProgress.current = true;
      try {
        logger.debug(`[useTradingData] Fetching data (source: ${source})`);

        // HIGH FIX RC-4: Use Promise.allSettled to prevent one failure from canceling all fetches
        const results = await Promise.allSettled([
          getPositionBook(),
          getOrderBook(),
          getFunds(),
          getHoldings(),
          getTradeBook(),
        ]);

        if (!isMounted.current) return;

        // Extract successful results, use fallback for failures
        const posData = results[0].status === 'fulfilled' ? (results[0].value as unknown as Position[]) : [];
        const orderData =
          results[1].status === 'fulfilled'
            ? (results[1].value as unknown as OrderBookResponse)
            : { orders: [] };
        const fundsData =
          results[2].status === 'fulfilled' ? (results[2].value as unknown as Funds | null) : null;
        const holdingsData =
          results[3].status === 'fulfilled' ? (results[3].value as unknown as HoldingsResponse) : {};
        const tradeData = results[4].status === 'fulfilled' ? (results[4].value as unknown as Trade[]) : [];

        // Log any failures for debugging
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            const apiNames = ['positions', 'orders', 'funds', 'holdings', 'trades'];
            logger.warn(`[useTradingData] Failed to fetch ${apiNames[index]}:`, result.reason);
          }
        });

        // Positions
        const positionsList = Array.isArray(posData) ? posData : [];
        setPositions(positionsList);

        // Orders
        const orderList = Array.isArray(orderData.orders) ? orderData.orders : [];

        // Log order updates for debugging
        if (orderList.length > 0) {
          logger.debug(
            '[useTradingData] Orders updated:',
            orderList.length,
            'orders',
            `(source: ${source})`
          );
          const openOrders = orderList.filter((o) => {
            const status = (o.status || o.order_status || '').toUpperCase().replace(/\s+/g, '_');
            return ['OPEN', 'PENDING', 'TRIGGER_PENDING', 'VALIDATION_PENDING'].includes(status);
          });
          if (openOrders.length > 0) {
            logger.debug(
              '[useTradingData] Open orders:',
              openOrders.map((o) => ({
                id: o.orderid,
                symbol: o.symbol,
                price: o.price,
                status: o.order_status || o.status,
              }))
            );
          }
        }

        setOrders(orderList);

        // Funds
        setFunds(fundsData || {});

        // Holdings
        const holdingsList =
          holdingsData && Array.isArray(holdingsData.holdings) ? holdingsData.holdings : [];
        setHoldings(holdingsList);

        // Trades
        const tradeList = Array.isArray(tradeData) ? tradeData : [];
        setTrades(tradeList);

        // Filter Active Orders for Chart
        const active = orderList.filter((o) => {
          const status = (o.status || o.order_status || '').toUpperCase().replace(/\s+/g, '_');
          return ['OPEN', 'PENDING', 'TRIGGER_PENDING', 'VALIDATION_PENDING'].includes(status);
        });
        setActiveOrders(active);

        // Active Positions for Chart
        const activePos = positionsList.filter((p) => parseFloat(String(p.quantity || 0)) !== 0);
        setActivePositions(activePos);
      } catch (error) {
        logger.error('[useTradingData] Error fetching trading data:', error);
      } finally {
        fetchInProgress.current = false;
      }
    },
    [isAuthenticated]
  );

  // Event-driven: Initial fetch + refresh on visibility change and network recovery
  // Relies on WebSocket events for real-time updates
  useEffect(() => {
    if (!isAuthenticated) return;

    // Initial fetch
    logger.debug('[useTradingData] Initial fetch (event-driven mode)');
    fetchData('initial');

    // Refresh when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        logger.debug('[useTradingData] Visibility change refresh');
        fetchData('visibility-resume');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Subscribe to network recovery for auto-refresh after reconnection
    const unsubscribeNetworkRecovery = subscribeToNetworkRecovery(() => {
      logger.debug('[useTradingData] Network recovery refresh');
      fetchData('network-recovery');
    });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      unsubscribeNetworkRecovery();
    };
  }, [isAuthenticated, fetchData]);

  // EVENT-DRIVEN: Manual refresh after order operations (modify/cancel/place)
  // This is called immediately after order operations for instant UI updates
  const refreshTradingData = useCallback(async () => {
    logger.debug('[useTradingData] EVENT-DRIVEN refresh triggered (order operation)');
    await fetchData('event-driven');
  }, [fetchData]);

  return {
    positions,
    orders,
    funds,
    holdings,
    trades,
    activeOrders,
    activePositions,
    refreshTradingData,
  };
};

export default useTradingData;

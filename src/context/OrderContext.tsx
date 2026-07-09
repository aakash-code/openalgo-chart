/**
 * OrderContext - Centralized state management for orders and positions
 *
 * Eliminates prop drilling through App → ChartGrid → ChartComponent → VisualTrading
 * Provides single source of truth for trading data across the application
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useTradingData } from '../hooks/useTradingData';
import { useOrderHandlers } from '../hooks/useOrderHandlers';
import { useUser } from './UserContext';

// ==================== TYPES ====================

/** Order data */
export interface Order {
  id?: string;
  orderId?: string;
  symbol?: string;
  exchange?: string;
  orderType?: string;
  side?: 'BUY' | 'SELL';
  quantity?: number;
  price?: number;
  triggerPrice?: number;
  status?: string;
  filledQuantity?: number;
  averagePrice?: number;
  timestamp?: number;
  [key: string]: unknown;
}

/** Position data */
export interface Position {
  id?: string;
  symbol?: string;
  exchange?: string;
  quantity?: number;
  averagePrice?: number;
  ltp?: number;
  pnl?: number;
  pnlPercent?: number;
  side?: 'LONG' | 'SHORT';
  [key: string]: unknown;
}

/** Funds data */
export interface Funds {
  availableMargin?: number;
  usedMargin?: number;
  totalBalance?: number;
  [key: string]: unknown;
}

/** Holding data */
export interface Holding {
  symbol?: string;
  exchange?: string;
  quantity?: number;
  averagePrice?: number;
  ltp?: number;
  pnl?: number;
  [key: string]: unknown;
}

/** Trade data */
export interface Trade {
  tradeId?: string;
  orderId?: string;
  symbol?: string;
  exchange?: string;
  side?: 'BUY' | 'SELL';
  quantity?: number;
  price?: number;
  timestamp?: number;
  [key: string]: unknown;
}

/** Toast function type */
export type ShowToastFn = (message: string, type?: 'success' | 'error' | 'info') => void;

/** Order context value */
export interface OrderContextValue {
  // Raw data
  orders: Order[];
  positions: Position[];
  funds: Funds | null;
  holdings: Holding[];
  trades: Trade[];

  // Filtered data for chart visualization
  activeOrders: Order[];
  activePositions: Position[];

  // Operations
  onModifyOrder: (orderId: string, updates: Partial<Order>) => Promise<boolean>;
  onCancelOrder: (orderId: string) => Promise<boolean>;
  refresh: () => void;
}

// ==================== CONTEXT ====================

const OrderContext = createContext<OrderContextValue | null>(null);

export interface OrderProviderProps {
  children: ReactNode;
  showToast?: ShowToastFn;
}

export function OrderProvider({ children, showToast }: OrderProviderProps) {
  const { isAuthenticated } = useUser();

  // Fetch trading data with event-driven updates
  const { positions, orders, funds, holdings, trades, activeOrders, activePositions, refreshTradingData } =
    useTradingData(isAuthenticated);

  // Order operation handlers
  const { handleModifyOrder, handleCancelOrder } = useOrderHandlers({
    activeOrders,
    showToast,
    refreshTradingData,
  });

  // Memoize context value to prevent unnecessary re-renders of consumers
  const value: OrderContextValue = useMemo(() => ({
    // Raw data
    orders: orders as any,
    positions: positions as any,
    funds,
    holdings: holdings as any,
    trades: trades as any,

    // Filtered data for chart visualization
    activeOrders: activeOrders as any,
    activePositions: activePositions as any,

    // Operations
    onModifyOrder: handleModifyOrder as any,
    onCancelOrder: handleCancelOrder as any,
    refresh: refreshTradingData,
  }), [orders, positions, funds, holdings, trades, activeOrders, activePositions, handleModifyOrder, handleCancelOrder, refreshTradingData]);

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

/**
 * Hook to consume order context
 */
export function useOrders(): OrderContextValue {
  const context = useContext(OrderContext);

  if (!context) {
    throw new Error('useOrders must be used within OrderProvider');
  }

  return context;
}

export default OrderContext;

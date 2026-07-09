/**
 * Position API Types
 * Types for position-related API requests and responses
 */

import type { Product } from './orders';

/** Position from position book */
export interface Position {
  symbol: string;
  exchange: string;
  product: Product;
  quantity: number;
  average_price: number;
  ltp: number;
  pnl: number;
  pnlpercent: number;
  buy_quantity: number;
  sell_quantity: number;
  buy_price: number;
  sell_price: number;
  unrealized_pnl?: number;
  realized_pnl?: number;
}

/** Position book response */
export interface PositionBookResponse {
  status: 'success' | 'error';
  data?: Position[];
  message?: string;
}

/** Holding from holdings API */
export interface Holding {
  symbol: string;
  exchange: string;
  quantity: number;
  average_price: number;
  ltp: number;
  pnl: number;
  pnlpercent: number;
  isin?: string;
  collateral_quantity?: number;
  t1_quantity?: number;
}

/** Holdings statistics */
export interface HoldingsStatistics {
  total_investment: number;
  total_current_value: number;
  total_pnl: number;
  total_pnl_percent: number;
  day_pnl: number;
  day_pnl_percent: number;
}

/** Holdings response from API */
export interface HoldingsResponse {
  holdings: Holding[];
  statistics: HoldingsStatistics;
}

/** Trade from trade book */
export interface Trade {
  tradeid: string;
  orderid: string;
  symbol: string;
  exchange: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  product: Product;
  timestamp: string;
}

/** Trade book response */
export interface TradeBookResponse {
  status: 'success' | 'error';
  data?: Trade[];
  message?: string;
}

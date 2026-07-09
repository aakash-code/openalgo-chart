/**
 * Trading Domain Types
 * Core business domain types for trading
 */

/** Supported exchanges */
export type Exchange =
  | 'NSE'
  | 'NSE_INDEX'
  | 'BSE'
  | 'NFO'
  | 'MCX'
  | 'CDS'
  | 'BFO'
  | 'BCD';

/** Exchange list as const for iteration */
export const EXCHANGES = [
  'NSE',
  'NSE_INDEX',
  'BSE',
  'NFO',
  'MCX',
  'CDS',
  'BFO',
  'BCD',
] as const;

/** F&O exchanges that require lot size multiples */
export const FNO_EXCHANGES = ['NFO', 'MCX', 'BFO', 'CDS', 'BCD'] as const;
export type FnOExchange = (typeof FNO_EXCHANGES)[number];

/** Indian exchanges */
export const INDIAN_EXCHANGES = [
  'NSE',
  'NSE_INDEX',
  'BSE',
  'NFO',
  'MCX',
  'CDS',
  'BFO',
] as const;

/** Order types as const object */
export const ORDER_TYPES = {
  MARKET: 'MARKET',
  LIMIT: 'LIMIT',
  SL: 'SL',
  SL_M: 'SL-M',
} as const;

/** Products as const object */
export const PRODUCTS = {
  MIS: 'MIS',
  CNC: 'CNC',
  NRML: 'NRML',
} as const;

/** Order actions as const object */
export const ORDER_ACTIONS = {
  BUY: 'BUY',
  SELL: 'SELL',
} as const;

/** Market hours configuration */
export interface MarketHours {
  open: { hour: number; minute: number };
  close: { hour: number; minute: number };
}

/** Market status */
export interface MarketStatus {
  isOpen: boolean;
  status: 'Market Open' | 'Market Closed' | 'Pre-Market' | 'Weekend';
}

/** Time until market events */
export interface TimeUntilMarket {
  untilOpen: number;
  untilClose: number;
}

/** Symbol with exchange */
export interface SymbolExchange {
  symbol: string;
  exchange: Exchange;
}

/** Trading symbol info */
export interface TradingSymbol extends SymbolExchange {
  name?: string;
  lotSize?: number;
  tickSize?: number;
  instrumentType?: string;
}

/** Watchlist item */
export interface WatchlistItem extends TradingSymbol {
  ltp?: number;
  change?: number;
  changePercent?: number;
  volume?: number;
  prevClose?: number;
}

/** Watchlist group */
export interface WatchlistGroup {
  id: string;
  name: string;
  items: WatchlistItem[];
  isDefault?: boolean;
}

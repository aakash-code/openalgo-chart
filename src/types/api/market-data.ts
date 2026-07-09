/**
 * Market Data API Types
 * Types for market data API requests and responses
 */

/** OHLC Candle data */
export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

/** Ticker/Quote data */
export interface Ticker {
  symbol: string;
  exchange: string;
  ltp: number;
  chg: number;
  chgP: number;
  volume: number;
  bidPrice: number;
  askPrice: number;
  bidQuantity: number;
  askQuantity: number;
  timestamp: number;
  prevClose: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
}

/** Market depth level */
export interface DepthLevel {
  price: number;
  quantity: number;
  orders: number;
}

/** Full market depth */
export interface MarketDepth {
  buy: DepthLevel[];
  sell: DepthLevel[];
  totalbuyqty?: number;
  totalsellqty?: number;
}

/** Quote with depth */
export interface Quote extends Ticker {
  depth?: MarketDepth;
}

/** Klines (OHLC) request parameters */
export interface KlinesParams {
  symbol: string;
  exchange: string;
  interval: string;
  start?: string;
  end?: string;
  limit?: number;
}

/** Klines response */
export interface KlinesResponse {
  status: 'success' | 'error';
  data?: Candle[];
  message?: string;
}

/** Quote response */
export interface QuoteResponse {
  status: 'success' | 'error';
  data?: Quote;
  message?: string;
}

/** WebSocket tick data (mode 2 - LTP only) */
export interface WebSocketTick {
  symbol: string;
  exchange: string;
  ltp: number;
  timestamp?: number;
}

/** WebSocket full tick data (mode 3 - full quote) */
export interface WebSocketFullTick extends WebSocketTick {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  change: number;
  changePercent: number;
  bidPrice?: number;
  askPrice?: number;
  bidQty?: number;
  askQty?: number;
}

/** Instrument info */
export interface Instrument {
  symbol: string;
  exchange: string;
  token: string;
  name: string;
  lotSize: number;
  tickSize: number;
  instrumentType: string;
  expiry?: string;
  strike?: number;
  optionType?: 'CE' | 'PE';
}

/** Instrument search result */
export interface InstrumentSearchResult {
  symbol: string;
  exchange: string;
  name: string;
  instrumentType: string;
  lotSize?: number;
}

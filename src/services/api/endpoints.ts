/**
 * API Endpoints
 * Centralized endpoint constants for the OpenAlgo API
 */

/** Account endpoints */
export const ACCOUNT_ENDPOINTS = {
  PING: '/ping',
  FUNDS: '/funds',
  POSITION_BOOK: '/positionbook',
  ORDER_BOOK: '/orderbook',
  TRADE_BOOK: '/tradebook',
  HOLDINGS: '/holdings',
} as const;

/** Order endpoints */
export const ORDER_ENDPOINTS = {
  PLACE_ORDER: '/placeorder',
  MODIFY_ORDER: '/modifyorder',
  CANCEL_ORDER: '/cancelorder',
  CANCEL_ALL: '/cancelallorder',
  CLOSE_POSITION: '/closeposition',
} as const;

/** Market data endpoints */
export const MARKET_ENDPOINTS = {
  KLINES: '/history',
  QUOTE: '/quotes',
  DEPTH: '/depth',
  INTERVAL_KLINES: '/intervalhistory',
} as const;

/** Instrument endpoints */
export const INSTRUMENT_ENDPOINTS = {
  SEARCH: '/search',
  LOT_SIZE: '/lotsize',
  MASTER: '/master',
} as const;

/** Options endpoints */
export const OPTIONS_ENDPOINTS = {
  OPTION_CHAIN: '/optionchain',
  EXPIRY_DATES: '/expirydates',
  OPTION_SYMBOLS: '/optionsymbols',
} as const;

/** Analyzer (sandbox) endpoints */
export const ANALYZER_ENDPOINTS = {
  TOGGLE: '/analyzertoggle',
  STATUS: '/analyzerstatus',
} as const;

/** All endpoints combined */
export const API_ENDPOINTS = {
  ...ACCOUNT_ENDPOINTS,
  ...ORDER_ENDPOINTS,
  ...MARKET_ENDPOINTS,
  ...INSTRUMENT_ENDPOINTS,
  ...OPTIONS_ENDPOINTS,
  ...ANALYZER_ENDPOINTS,
} as const;

/** Endpoint type */
export type ApiEndpoint = (typeof API_ENDPOINTS)[keyof typeof API_ENDPOINTS];

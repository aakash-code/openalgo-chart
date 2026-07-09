/**
 * Order Constants
 * Centralized trading order constants to ensure consistency across all order-related components
 */

/** Order types supported by the trading API */
export const ORDER_TYPES = {
  MARKET: 'MARKET',
  LIMIT: 'LIMIT',
  SL: 'SL',
  SL_M: 'SL-M',
} as const;

export type OrderType = (typeof ORDER_TYPES)[keyof typeof ORDER_TYPES];

/** Product types (position types) */
export const PRODUCTS = {
  MIS: 'MIS',
  CNC: 'CNC',
  NRML: 'NRML',
} as const;

export type Product = (typeof PRODUCTS)[keyof typeof PRODUCTS];

/** Order actions */
export const ORDER_ACTIONS = {
  BUY: 'BUY',
  SELL: 'SELL',
} as const;

export type OrderAction = (typeof ORDER_ACTIONS)[keyof typeof ORDER_ACTIONS];

/** Exchanges that require lot size multiples (F&O exchanges) */
export const FNO_EXCHANGES = ['NFO', 'MCX', 'BFO', 'CDS', 'BCD'] as const;

export type FnOExchange = (typeof FNO_EXCHANGES)[number];

/** Order type descriptive labels (for UI) */
export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  [ORDER_TYPES.MARKET]: 'Market',
  [ORDER_TYPES.LIMIT]: 'Limit',
  [ORDER_TYPES.SL]: 'Stop Loss',
  [ORDER_TYPES.SL_M]: 'SL-Market',
};

/** Product type descriptive labels (for UI) */
export const PRODUCT_LABELS: Record<Product, string> = {
  [PRODUCTS.MIS]: 'Intraday (MIS)',
  [PRODUCTS.CNC]: 'Longterm (CNC)',
  [PRODUCTS.NRML]: 'Overnight (NRML)',
};

/** Order types that require a limit price */
export const PRICE_REQUIRED_ORDER_TYPES: OrderType[] = [
  ORDER_TYPES.LIMIT,
  ORDER_TYPES.SL,
];

/** Order types that require a trigger price */
export const TRIGGER_REQUIRED_ORDER_TYPES: OrderType[] = [
  ORDER_TYPES.SL,
  ORDER_TYPES.SL_M,
];

/** Check if order type requires price */
export function requiresPrice(orderType: OrderType): boolean {
  return PRICE_REQUIRED_ORDER_TYPES.includes(orderType);
}

/** Check if order type requires trigger price */
export function requiresTriggerPrice(orderType: OrderType): boolean {
  return TRIGGER_REQUIRED_ORDER_TYPES.includes(orderType);
}

/** Check if exchange is F&O */
export function isFnOExchange(exchange: string): exchange is FnOExchange {
  return FNO_EXCHANGES.includes(exchange as FnOExchange);
}

export default {
  ORDER_TYPES,
  PRODUCTS,
  ORDER_ACTIONS,
  FNO_EXCHANGES,
  ORDER_TYPE_LABELS,
  PRODUCT_LABELS,
  PRICE_REQUIRED_ORDER_TYPES,
  TRIGGER_REQUIRED_ORDER_TYPES,
  requiresPrice,
  requiresTriggerPrice,
  isFnOExchange,
};

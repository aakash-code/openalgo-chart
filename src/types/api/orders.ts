/**
 * Order API Types
 * Types for order-related API requests and responses
 */

/** Order action - buy or sell */
export type OrderAction = 'BUY' | 'SELL';

/** Order type - market, limit, or stop-loss variants */
export type OrderType = 'MARKET' | 'LIMIT' | 'SL' | 'SL-M';

/** Product type - position duration */
export type Product = 'MIS' | 'CNC' | 'NRML';

/** Order status from broker */
export type OrderStatus =
  | 'PENDING'
  | 'OPEN'
  | 'COMPLETE'
  | 'REJECTED'
  | 'CANCELLED'
  | 'TRIGGER_PENDING'
  | 'MODIFIED';

/** Order object from order book */
export interface Order {
  orderid: string;
  symbol: string;
  exchange: string;
  action: OrderAction;
  quantity: number;
  pricetype: OrderType;
  price: number;
  trigger_price: number;
  product: Product;
  order_status: OrderStatus;
  filledqty: number;
  average_price: number;
  timestamp: string;
  strategy?: string;
  disclosed_quantity?: number;
}

/** Payload for placing a new order */
export interface OrderPayload {
  apikey: string;
  symbol: string;
  exchange: string;
  action: OrderAction;
  quantity: number;
  pricetype: OrderType;
  product: Product;
  price: number;
  trigger_price: number;
  strategy?: string;
  disclosed_quantity?: number;
}

/** Order details for placing an order (without apikey) */
export interface OrderDetails {
  symbol: string;
  exchange: string;
  action: OrderAction;
  quantity: number | string;
  pricetype?: OrderType;
  product?: Product;
  price?: number | string;
  trigger_price?: number | string;
  strategy?: string;
}

/** Modify order details */
export interface ModifyOrderDetails {
  orderid: string;
  symbol?: string;
  exchange?: string;
  quantity?: number;
  pricetype?: OrderType;
  price?: number;
  trigger_price?: number;
}

/** Cancel order details - can be string (orderid) or object */
export interface CancelOrderDetails {
  orderid?: string;
  order?: Order | string;
  strategy?: string;
}

/** Order book statistics */
export interface OrderBookStatistics {
  total: number;
  open: number;
  completed: number;
  rejected: number;
}

/** Order book response from API */
export interface OrderBookResponse {
  orders: Order[];
  statistics: OrderBookStatistics;
}

/** Order operation result */
export interface OrderResult {
  orderid?: string;
  status: 'success' | 'error';
  message: string;
  brokerResponse?: unknown;
  errorType?: 'network' | 'validation' | 'broker';
}

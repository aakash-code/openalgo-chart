/**
 * Account API Types
 * Types for account-related API requests and responses
 */

/** Funds/margin information */
export interface Funds {
  availablecash: number;
  collateral: number;
  m2mrealized: number;
  m2munrealized: number;
  utiliseddebits: number;
  usedmargin?: number;
  payin?: number;
  payout?: number;
}

/** Ping response */
export interface PingResponse {
  status: 'success' | 'error';
  broker?: string;
  message?: string;
}

/** Funds response */
export interface FundsResponse {
  status: 'success' | 'error';
  data?: Funds;
  message?: string;
}

/** API request options */
export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: Record<string, unknown>;
  context?: string;
  defaultValue?: unknown;
}

/** Generic API response */
export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}

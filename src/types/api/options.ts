/**
 * Options API Types
 * Types for options chain and Greeks
 */

/** Option type */
export type OptionType = 'CE' | 'PE';

/** Option strike data */
export interface OptionStrike {
  strikePrice: number;
  callLTP: number;
  callOI: number;
  callOIChange: number;
  callVolume: number;
  callIV: number;
  callDelta?: number;
  callGamma?: number;
  callTheta?: number;
  callVega?: number;
  putLTP: number;
  putOI: number;
  putOIChange: number;
  putVolume: number;
  putIV: number;
  putDelta?: number;
  putGamma?: number;
  putTheta?: number;
  putVega?: number;
}

/** Option chain data */
export interface OptionChain {
  symbol: string;
  exchange: string;
  expiry: string;
  spotPrice: number;
  atmStrike: number;
  strikes: OptionStrike[];
  pcr?: number;
  maxPainStrike?: number;
  timestamp: number;
}

/** Option Greeks */
export interface Greeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho?: number;
  iv: number;
}

/** Option leg for strategies */
export interface OptionLeg {
  id: string;
  symbol: string;
  exchange: string;
  expiry: string;
  strikePrice: number;
  optionType: OptionType;
  action: 'BUY' | 'SELL';
  quantity: number;
  lotSize: number;
  ltp?: number;
}

/** Option strategy */
export interface OptionStrategy {
  id: string;
  name: string;
  legs: OptionLeg[];
  totalPremium: number;
  maxProfit: number | 'unlimited';
  maxLoss: number | 'unlimited';
  breakeven: number[];
}

/** Expiry date info */
export interface ExpiryInfo {
  date: string;
  label: string;
  daysToExpiry: number;
  isMonthly: boolean;
  isWeekly: boolean;
}

/** Option chain request params */
export interface OptionChainParams {
  symbol: string;
  exchange: string;
  expiry: string;
  strikeCount?: number;
}

/** Option chain response */
export interface OptionChainResponse {
  status: 'success' | 'error';
  data?: OptionChain;
  message?: string;
}

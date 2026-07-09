/**
 * Alert Domain Types
 * Types for price alerts and indicator alerts
 */

import type { Exchange } from './trading';
import type { IndicatorType } from './chart';

/** Alert condition operator */
export type AlertOperator =
  | 'crosses_above'
  | 'crosses_below'
  | 'greater_than'
  | 'less_than'
  | 'equals';

/** Alert status */
export type AlertStatus = 'active' | 'triggered' | 'expired' | 'disabled';

/** Alert trigger type */
export type AlertTriggerType = 'once' | 'every_time' | 'once_per_bar';

/** Base alert configuration */
export interface BaseAlert {
  id: string;
  symbol: string;
  exchange: Exchange;
  status: AlertStatus;
  message?: string;
  sound?: boolean;
  notification?: boolean;
  webhook?: string;
  createdAt: number;
  triggeredAt?: number;
  expiresAt?: number;
}

/** Price alert */
export interface PriceAlert extends BaseAlert {
  type: 'price';
  condition: AlertOperator;
  targetPrice: number;
  currentPrice?: number;
}

/** Indicator alert condition */
export interface IndicatorAlertCondition {
  indicator: IndicatorType;
  parameter?: string;
  operator: AlertOperator;
  value: number;
}

/** Indicator alert */
export interface IndicatorAlert extends BaseAlert {
  type: 'indicator';
  condition: IndicatorAlertCondition;
  triggerType: AlertTriggerType;
}

/** Union of all alert types */
export type Alert = PriceAlert | IndicatorAlert;

/** Alert create payload */
export interface CreateAlertPayload {
  symbol: string;
  exchange: Exchange;
  type: 'price' | 'indicator';
  condition: AlertOperator | IndicatorAlertCondition;
  targetPrice?: number;
  message?: string;
  sound?: boolean;
  notification?: boolean;
  expiresAt?: number;
}

/** Alert triggered event */
export interface AlertTriggeredEvent {
  alert: Alert;
  triggeredAt: number;
  triggerPrice: number;
}

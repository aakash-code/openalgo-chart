/**
 * Common Utility Types
 * Reusable utility types for the application
 */

/** Make all properties nullable */
export type Nullable<T> = T | null;

/** Make all properties optional and nullable */
export type NullablePartial<T> = {
  [P in keyof T]?: T[P] | null;
};

/** Make specific properties required */
export type RequireKeys<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/** Make specific properties optional */
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/** Deep partial - makes all nested properties optional */
export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

/** Deep readonly - makes all nested properties readonly */
export type DeepReadonly<T> = T extends object
  ? {
      readonly [P in keyof T]: DeepReadonly<T[P]>;
    }
  : T;

/** Extract keys of type */
export type KeysOfType<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];

/** Omit by value type */
export type OmitByType<T, V> = {
  [K in keyof T as T[K] extends V ? never : K]: T[K];
};

/** Pick by value type */
export type PickByType<T, V> = {
  [K in keyof T as T[K] extends V ? K : never]: T[K];
};

/** Async function type */
export type AsyncFunction<T = void, A extends unknown[] = []> = (
  ...args: A
) => Promise<T>;

/** Callback function type */
export type Callback<T = void> = () => T;

/** Event handler type */
export type EventHandler<E = Event> = (event: E) => void;

/** Async state for data fetching */
export interface AsyncState<T, E = Error> {
  data: T | null;
  loading: boolean;
  error: E | null;
}

/** Paginated response */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/** Sort direction */
export type SortDirection = 'asc' | 'desc';

/** Sort config */
export interface SortConfig<T> {
  key: keyof T;
  direction: SortDirection;
}

/** Filter operator */
export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'in'
  | 'notIn';

/** Filter config */
export interface FilterConfig<T> {
  key: keyof T;
  operator: FilterOperator;
  value: unknown;
}

/** Value or function that returns value */
export type ValueOrFunction<T, A extends unknown[] = []> = T | ((...args: A) => T);

/** Resolve value or function */
export function resolveValue<T, A extends unknown[]>(
  valueOrFn: ValueOrFunction<T, A>,
  ...args: A
): T {
  return typeof valueOrFn === 'function'
    ? (valueOrFn as (...args: A) => T)(...args)
    : valueOrFn;
}

/** Brand type for nominal typing */
export type Brand<T, B> = T & { __brand: B };

/** Branded string types */
export type OrderId = Brand<string, 'OrderId'>;
export type TradeId = Brand<string, 'TradeId'>;
export type AlertId = Brand<string, 'AlertId'>;
export type ChartId = Brand<number, 'ChartId'>;
export type IndicatorId = Brand<string, 'IndicatorId'>;
export type DrawingId = Brand<string, 'DrawingId'>;

/** Unix timestamp in seconds */
export type UnixTimestamp = Brand<number, 'UnixTimestamp'>;

/** Unix timestamp in milliseconds */
export type UnixTimestampMs = Brand<number, 'UnixTimestampMs'>;

/** Price value */
export type Price = Brand<number, 'Price'>;

/** Quantity value */
export type Quantity = Brand<number, 'Quantity'>;

/** Percentage value (0-100) */
export type Percentage = Brand<number, 'Percentage'>;

/** Result type for operations that can fail */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/** Create success result */
export function success<T>(data: T): Result<T, never> {
  return { success: true, data };
}

/** Create error result */
export function failure<E>(error: E): Result<never, E> {
  return { success: false, error };
}

/** Check if result is success */
export function isSuccess<T, E>(result: Result<T, E>): result is { success: true; data: T } {
  return result.success;
}

/** Check if result is failure */
export function isFailure<T, E>(result: Result<T, E>): result is { success: false; error: E } {
  return !result.success;
}

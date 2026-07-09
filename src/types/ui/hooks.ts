/**
 * UI Hook Types
 * Types for custom hook return values
 */

import type { RefObject } from 'react';
import type { IChartApi, ISeriesApi, SeriesType } from 'lightweight-charts';
import type { Candle } from '../api/market-data';
import type { Order, Position, Holding, Trade, Funds } from '../api';
import type { Indicator, Drawing } from '../domain/chart';

/** Async state */
export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/** Use async return type */
export interface UseAsyncReturn<T> extends AsyncState<T> {
  execute: () => Promise<T | null>;
  reset: () => void;
}

/** Debounced value hook return */
export interface UseDebouncedReturn<T> {
  debouncedValue: T;
  isPending: boolean;
}

/** Local storage hook return */
export interface UseLocalStorageReturn<T> {
  value: T;
  setValue: (value: T | ((prev: T) => T)) => void;
  removeValue: () => void;
}

/** Media query hook return */
export interface UseMediaQueryReturn {
  matches: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

/** Click outside hook options */
export interface UseClickOutsideOptions {
  enabled?: boolean;
  eventType?: 'mousedown' | 'mouseup' | 'click';
}

/** Focus trap hook options */
export interface UseFocusTrapOptions {
  enabled?: boolean;
  initialFocus?: RefObject<HTMLElement>;
  returnFocus?: boolean;
}

/** Keyboard navigation hook return */
export interface UseKeyboardNavReturn {
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  isNavigating: boolean;
}

/** Chart hook return */
export interface UseChartReturn {
  chartRef: RefObject<HTMLDivElement>;
  chart: IChartApi | null;
  mainSeries: ISeriesApi<SeriesType> | null;
  isLoading: boolean;
  error: Error | null;
  data: Candle[];
  updateSymbol: (symbol: string, exchange: string) => void;
  updateInterval: (interval: string) => void;
  fitContent: () => void;
  takeSnapshot: () => Promise<string | null>;
}

/** Indicator handlers hook return */
export interface UseIndicatorHandlersReturn {
  addIndicator: (type: Indicator['type'], settings?: Partial<Indicator>) => void;
  removeIndicator: (indicatorId: string) => void;
  updateIndicator: (indicatorId: string, settings: Partial<Indicator>) => void;
  toggleIndicatorVisibility: (indicatorId: string) => void;
  getIndicatorById: (indicatorId: string) => Indicator | undefined;
}

/** Drawing handlers hook return */
export interface UseDrawingHandlersReturn {
  drawings: Drawing[];
  addDrawing: (drawing: Omit<Drawing, 'id'>) => Drawing;
  removeDrawing: (drawingId: string) => void;
  updateDrawing: (drawingId: string, updates: Partial<Drawing>) => void;
  selectDrawing: (drawingId: string | null) => void;
  selectedDrawing: Drawing | null;
  clearAllDrawings: () => void;
}

/** Trading data hook return */
export interface UseTradingDataReturn {
  orders: Order[];
  positions: Position[];
  holdings: Holding[];
  trades: Trade[];
  funds: Funds | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  lastUpdated: Date | null;
}

/** Order form state */
export interface OrderFormState {
  symbol: string;
  exchange: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  product: 'MIS' | 'CNC' | 'NRML';
  orderType: 'MARKET' | 'LIMIT' | 'SL' | 'SL-M';
  price: number;
  triggerPrice: number;
  isValid: boolean;
  errors: Record<string, string>;
}

/** Order form handlers */
export interface UseOrderFormReturn {
  formState: OrderFormState;
  setSymbol: (symbol: string) => void;
  setExchange: (exchange: string) => void;
  setAction: (action: 'BUY' | 'SELL') => void;
  setQuantity: (quantity: number) => void;
  setProduct: (product: 'MIS' | 'CNC' | 'NRML') => void;
  setOrderType: (orderType: 'MARKET' | 'LIMIT' | 'SL' | 'SL-M') => void;
  setPrice: (price: number) => void;
  setTriggerPrice: (triggerPrice: number) => void;
  validate: () => boolean;
  reset: () => void;
  submitOrder: () => Promise<{ success: boolean; message: string; orderid?: string }>;
}

/** Virtual scroll hook return */
export interface UseVirtualScrollReturn<T> {
  virtualItems: Array<{
    index: number;
    item: T;
    style: React.CSSProperties;
  }>;
  totalHeight: number;
  containerRef: RefObject<HTMLDivElement>;
  scrollToIndex: (index: number) => void;
}

/** Toast manager hook return */
export interface UseToastManagerReturn {
  toasts: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    title?: string;
  }>;
  addToast: (toast: {
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    title?: string;
    duration?: number;
  }) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

/** Symbol search hook return */
export interface UseSymbolSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  results: Array<{
    symbol: string;
    exchange: string;
    name: string;
    type: string;
  }>;
  isSearching: boolean;
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  selectSymbol: (symbol: string, exchange: string) => void;
}

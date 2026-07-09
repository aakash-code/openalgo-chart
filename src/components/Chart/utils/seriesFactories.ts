/**
 * Series Factory Functions
 * Creates chart series based on chart type
 */

import {
  CandlestickSeries,
  BarSeries,
  LineSeries,
  AreaSeries,
  BaselineSeries,
} from 'lightweight-charts';
import { hexToRgba } from './chartHelpers';
import { calculateHeikinAshi } from '../../../utils/chartUtils';
import { calculateRenko } from '../../../utils/renkoUtils';
import { CHART_COLORS } from '../../../utils/colorUtils';

export interface OHLCData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface SingleValueData {
  time: number;
  value: number;
}

export interface ChartAppearance {
  candleUpColor?: string;
  candleDownColor?: string;
  wickUpColor?: string;
  wickDownColor?: string;
}

export interface ChartColors {
  upColor: string;
  downColor: string;
  wickUpColor: string;
  wickDownColor: string;
}

/**
 * Transform OHLC data based on chart type
 */
export const transformData = (data: OHLCData[], type: string): any[] => {
  if (!data || data.length === 0) return [];

  switch (type) {
    case 'line':
    case 'area':
    case 'baseline':
      return data.map(d => ({ time: d.time, value: d.close }));
    case 'heikin-ashi':
      return calculateHeikinAshi(data);
    case 'renko':
      return calculateRenko(data);
    default:
      return data;
  }
};

/**
 * Get default chart appearance colors
 */
export const getChartColors = (appearance: ChartAppearance = {}): ChartColors => {
  return {
    upColor: appearance.candleUpColor || CHART_COLORS.UP.primary,
    downColor: appearance.candleDownColor || CHART_COLORS.DOWN.primary,
    wickUpColor: appearance.wickUpColor || appearance.candleUpColor || CHART_COLORS.UP.primary,
    wickDownColor: appearance.wickDownColor || appearance.candleDownColor || CHART_COLORS.DOWN.primary,
  };
};

/**
 * Create appropriate series based on chart type
 */
export const createSeries = (chart: any, type: string, appearance: ChartAppearance = {}): any => {
  const commonOptions = {
    lastValueVisible: true,
    priceScaleId: 'right',
    title: ''
  };

  const { upColor, downColor, wickUpColor, wickDownColor } = getChartColors(appearance);

  switch (type) {
    case 'candlestick':
      return chart.addSeries(CandlestickSeries, {
        ...commonOptions,
        upColor,
        downColor,
        borderVisible: false,
        wickUpColor,
        wickDownColor,
      });

    case 'bar':
      return chart.addSeries(BarSeries, {
        ...commonOptions,
        upColor,
        downColor,
        thinBars: false,
      });

    case 'hollow-candlestick':
      return chart.addSeries(CandlestickSeries, {
        ...commonOptions,
        upColor: 'transparent',
        downColor,
        borderUpColor: upColor,
        borderDownColor: downColor,
        wickUpColor,
        wickDownColor,
      });

    case 'line':
      return chart.addSeries(LineSeries, {
        ...commonOptions,
        color: '#2962FF',
        lineWidth: 2,
      });

    case 'area':
      return chart.addSeries(AreaSeries, {
        ...commonOptions,
        topColor: 'rgba(41, 98, 255, 0.4)',
        bottomColor: 'rgba(41, 98, 255, 0.0)',
        lineColor: '#2962FF',
        lineWidth: 2,
      });

    case 'baseline':
      return chart.addSeries(BaselineSeries, {
        ...commonOptions,
        topLineColor: upColor,
        topFillColor1: hexToRgba(upColor, 0.28),
        topFillColor2: hexToRgba(upColor, 0.05),
        bottomLineColor: downColor,
        bottomFillColor1: hexToRgba(downColor, 0.05),
        bottomFillColor2: hexToRgba(downColor, 0.28),
      });

    case 'heikin-ashi':
      return chart.addSeries(CandlestickSeries, {
        ...commonOptions,
        upColor,
        downColor,
        borderVisible: false,
        wickUpColor,
        wickDownColor,
      });

    case 'renko':
      return chart.addSeries(CandlestickSeries, {
        ...commonOptions,
        upColor,
        downColor,
        borderVisible: false,
        wickUpColor: upColor,
        wickDownColor: downColor,
      });

    default:
      // Default to candlestick
      return chart.addSeries(CandlestickSeries, {
        ...commonOptions,
        upColor,
        downColor,
        borderVisible: false,
        wickUpColor,
        wickDownColor,
      });
  }
};

/**
 * Chart types that use single-value data (line format)
 */
export const SINGLE_VALUE_CHART_TYPES = ['line', 'area', 'baseline'];

/**
 * Check if chart type uses single value data
 */
export const isSingleValueChartType = (type: string): boolean => {
  return SINGLE_VALUE_CHART_TYPES.includes(type);
};

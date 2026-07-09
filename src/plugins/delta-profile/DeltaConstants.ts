/**
 * Delta Profile Constants
 * Colors and settings for Delta and Cumulative Delta visualization
 */

// ==================== TYPES ====================

export interface DeltaColors {
  DELTA_POSITIVE: string;
  DELTA_NEGATIVE: string;
  DELTA_NEUTRAL: string;
  CD_LINE_UP: string;
  CD_LINE_DOWN: string;
  CD_LINE_NEUTRAL: string;
  BULLISH_DIVERGENCE: string;
  BEARISH_DIVERGENCE: string;
  ZERO_LINE: string;
  TEXT_PRIMARY: string;
  TEXT_SECONDARY: string;
  HISTOGRAM_BACKGROUND: string;
}

export interface DeltaSettings {
  showDeltaBars: boolean;
  showCumulativeDelta: boolean;
  showDivergences: boolean;
  showZeroLine: boolean;
  showLabels: boolean;
  barWidth: number;
  cdLineWidth: number;
  fontSize: number;
  opacity: number;
  positiveColor: string;
  negativeColor: string;
  cdLineColor: string;
  divergenceThreshold: number;
  neutralThreshold: number;
  paneHeight: number;
  separatePaneForCD: boolean;
}

// ==================== CONSTANTS ====================

export const COLORS: DeltaColors = {
  DELTA_POSITIVE: '#26A69A',
  DELTA_NEGATIVE: '#EF5350',
  DELTA_NEUTRAL: '#9E9E9E',
  CD_LINE_UP: '#4CAF50',
  CD_LINE_DOWN: '#F44336',
  CD_LINE_NEUTRAL: '#2196F3',
  BULLISH_DIVERGENCE: '#00E676',
  BEARISH_DIVERGENCE: '#FF5252',
  ZERO_LINE: '#787B86',
  TEXT_PRIMARY: '#D1D4DC',
  TEXT_SECONDARY: '#787B86',
  HISTOGRAM_BACKGROUND: 'rgba(42, 46, 57, 0.5)',
};

export const DEFAULT_DELTA_SETTINGS: DeltaSettings = {
  showDeltaBars: true,
  showCumulativeDelta: true,
  showDivergences: true,
  showZeroLine: true,
  showLabels: true,
  barWidth: 0.8,
  cdLineWidth: 2,
  fontSize: 10,
  opacity: 0.9,
  positiveColor: COLORS.DELTA_POSITIVE,
  negativeColor: COLORS.DELTA_NEGATIVE,
  cdLineColor: COLORS.CD_LINE_UP,
  divergenceThreshold: 0.5,
  neutralThreshold: 0.1,
  paneHeight: 100,
  separatePaneForCD: false,
};

/**
 * Get delta bar color based on value
 */
export const getDeltaBarColor = (delta: number, neutralThreshold: number = 0.1): string => {
  if (Math.abs(delta) < neutralThreshold) return COLORS.DELTA_NEUTRAL;
  return delta > 0 ? COLORS.DELTA_POSITIVE : COLORS.DELTA_NEGATIVE;
};

/**
 * Get cumulative delta line color based on trend
 */
export const getCDLineColor = (currentCD: number, previousCD: number): string => {
  if (currentCD > previousCD) return COLORS.CD_LINE_UP;
  if (currentCD < previousCD) return COLORS.CD_LINE_DOWN;
  return COLORS.CD_LINE_NEUTRAL;
};

/**
 * Format delta value for display
 */
export const formatDeltaValue = (delta: number): string => {
  const prefix = delta > 0 ? '+' : '';
  if (Math.abs(delta) >= 10000000) return `${prefix}${(delta / 10000000).toFixed(1)}Cr`;
  if (Math.abs(delta) >= 100000) return `${prefix}${(delta / 100000).toFixed(1)}L`;
  if (Math.abs(delta) >= 1000) return `${prefix}${(delta / 1000).toFixed(1)}K`;
  return `${prefix}${Math.round(delta)}`;
};

export default {
  COLORS,
  DEFAULT_DELTA_SETTINGS,
  getDeltaBarColor,
  getCDLineColor,
  formatDeltaValue,
};

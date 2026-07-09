/**
 * Position Tracker Constants
 * Market timing, columns, and filter options
 */

// Re-export market timing from centralized module
import { MARKET_OPEN, MARKET_CLOSE } from '../../../constants/marketConstants';
export { MARKET_OPEN, MARKET_CLOSE };

// Top N options for gainers/losers filter
export const TOP_N_OPTIONS: number[] = [5, 10, 15, 20];

export interface ColumnWidths {
    rank: number;
    move: number;
    symbol: number;
    ltp: number;
    change: number;
    volume: number;
    [key: string]: number;
}

// Default column widths
export const DEFAULT_COLUMN_WIDTHS: ColumnWidths = {
    rank: 32,
    move: 40,
    symbol: 80,
    ltp: 70,
    change: 60,
    volume: 55,
};

export const MIN_COLUMN_WIDTH = 35;

// Filter mode options
export const FILTER_MODES = {
    ALL: 'all',
    GAINERS: 'gainers',
    LOSERS: 'losers',
} as const;

export type FilterMode = typeof FILTER_MODES[keyof typeof FILTER_MODES];

export default {
    MARKET_OPEN,
    MARKET_CLOSE,
    TOP_N_OPTIONS,
    DEFAULT_COLUMN_WIDTHS,
    MIN_COLUMN_WIDTH,
    FILTER_MODES,
};

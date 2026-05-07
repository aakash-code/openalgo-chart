/**
 * Symbol Handlers Hook
 * Manages symbol operations: change, compare, add to watchlist, remove from watchlist
 */

import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type {
  WatchlistSymbol,
  WatchlistsState,
  SearchMode,
} from '../types/watchlist';

// ==================== TYPES ====================

/** Scale mode for comparison symbols */
export type CompareScaleMode = 'samePercent' | 'newPriceScale' | 'newPane';

/** Scale mode constants for comparison symbols */
export const COMPARE_SCALE_MODES = {
  SAME_PERCENT: 'samePercent',
  NEW_PRICE_SCALE: 'newPriceScale',
  NEW_PANE: 'newPane',
} as const;

/** Comparison symbol colors */
const COMPARISON_COLORS = ['#f57f17', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5'];

/** Symbol data (can be string for legacy or object) */
export interface SymbolData {
  symbol: string;
  exchange?: string | undefined;
  scaleMode?: CompareScaleMode | undefined;
}

/** Comparison symbol with color */
export interface ComparisonSymbol {
  symbol: string;
  exchange: string;
  color: string;
  scaleMode: CompareScaleMode;
}

/** Chart configuration */
export interface ChartConfig {
  id: number;
  symbol: string;
  exchange: string;
  comparisonSymbols?: ComparisonSymbol[] | undefined;
  strategyConfig?: unknown | null | undefined;
  [key: string]: unknown;
}

/** Hook parameters */
export interface UseSymbolHandlersParams {
  searchMode: SearchMode;
  setCharts: Dispatch<SetStateAction<ChartConfig[]>>;
  activeChartId: number;
  watchlistSymbols: (WatchlistSymbol | string)[];
  setWatchlistsState: Dispatch<SetStateAction<WatchlistsState>>;
  setIsSearchOpen: Dispatch<SetStateAction<boolean>>;
  setSearchMode: Dispatch<SetStateAction<SearchMode>>;
  // Sync state
  isSyncEnabled?: boolean;
  syncOptions?: {
    symbol: boolean;
    interval: boolean;
    crosshair: boolean;
    time: boolean;
  };
}

/** Hook return type */
export interface UseSymbolHandlersReturn {
  handleSymbolChange: (symbolData: string | SymbolData) => void;
  handleRemoveFromWatchlist: (symbolData: string | SymbolData) => void;
  handleAddClick: () => void;
  handleSymbolClick: () => void;
  handleCompareClick: () => void;
}

// ==================== HOOK ====================

/**
 * Custom hook for symbol operations
 * @param params - Hook parameters
 * @returns Symbol handler functions
 */
export const useSymbolHandlers = ({
  searchMode,
  setCharts,
  activeChartId,
  watchlistSymbols,
  setWatchlistsState,
  setIsSearchOpen,
  setSearchMode,
  isSyncEnabled = false,
  syncOptions = { symbol: false, interval: false, crosshair: false, time: false },
}: UseSymbolHandlersParams): UseSymbolHandlersReturn => {
  // Handle symbol selection based on search mode
  const handleSymbolChange = useCallback(
    (symbolData: string | SymbolData) => {
      // Handle both string (legacy) and object format { symbol, exchange, scaleMode }
      const symbol = typeof symbolData === 'string' ? symbolData : symbolData.symbol;
      const exchange = typeof symbolData === 'string' ? 'NSE' : symbolData.exchange || 'NSE';
      const scaleMode =
        typeof symbolData === 'object' && symbolData.scaleMode
          ? symbolData.scaleMode
          : COMPARE_SCALE_MODES.SAME_PERCENT;

      if (searchMode === 'switch') {
        console.log('[useSymbolHandlers] Switching symbol for activeChartId:', activeChartId, 'Sync:', isSyncEnabled);
        setCharts((prev) =>
          prev.map((chart) => {
            const shouldUpdate = 
                chart.id === activeChartId || // Active chart always updates
                (isSyncEnabled && syncOptions.symbol); // Other charts update only if sync is on

            if (shouldUpdate) {
                console.log('[useSymbolHandlers] Updating chart:', chart.id, 'with symbol:', symbol);
            }
            
            return shouldUpdate
              ? { ...chart, symbol: symbol, exchange: exchange, strategyConfig: null }
              : chart;
          })
        );
      } else if (searchMode === 'compare') {
        setCharts((prev) =>
          prev.map((chart) => {
            if (chart.id === activeChartId) {
              const currentComparisons = chart.comparisonSymbols || [];
              // Check both symbol AND exchange to allow same symbol from different exchanges
              const exists = currentComparisons.find(
                (c) => c.symbol === symbol && c.exchange === exchange
              );

              if (exists) {
                // Remove (match both symbol and exchange)
                return {
                  ...chart,
                  comparisonSymbols: currentComparisons.filter(
                    (c) => !(c.symbol === symbol && c.exchange === exchange)
                  ),
                };
              } else {
                // Add with scale mode
                const colorIndex = currentComparisons.length % COMPARISON_COLORS.length;
                const nextColor = COMPARISON_COLORS[colorIndex] ?? '#f57f17';
                return {
                  ...chart,
                  comparisonSymbols: [
                    ...currentComparisons,
                    { symbol: symbol, exchange: exchange, color: nextColor, scaleMode: scaleMode },
                  ],
                };
              }
            }
            return chart;
          })
        );
        // Do not close search in compare mode to allow multiple selections
      } else {
        // Add to watchlist mode
        // Check both symbol AND exchange to allow same symbol from different exchanges
        const existsInWatchlist = watchlistSymbols.some((s) => {
          if (typeof s === 'string') return s === symbol;
          return s.symbol === symbol && s.exchange === exchange;
        });
        if (!existsInWatchlist) {
          setWatchlistsState((prev) => ({
            ...prev,
            lists: prev.lists.map((wl) =>
              wl.id === prev.activeListId
                ? { ...wl, symbols: [...wl.symbols, { symbol, exchange }] }
                : wl
            ),
          }));
        }
        setIsSearchOpen(false);
      }
    },
    [searchMode, setCharts, activeChartId, watchlistSymbols, setWatchlistsState, setIsSearchOpen, isSyncEnabled, syncOptions]
  );

  // Remove symbol from watchlist
  const handleRemoveFromWatchlist = useCallback(
    (symbolData: string | SymbolData) => {
      const symbolToRemove = typeof symbolData === 'string' ? symbolData : symbolData.symbol;
      const exchangeToRemove = typeof symbolData === 'string' ? null : symbolData.exchange || null;
      setWatchlistsState((prev) => ({
        ...prev,
        lists: prev.lists.map((wl) =>
          wl.id === prev.activeListId
            ? {
                ...wl,
                symbols: wl.symbols.filter((s) => {
                  // If s is a string, compare by symbol name only
                  if (typeof s === 'string') return s !== symbolToRemove;
                  // If we have exchange info, match both symbol and exchange
                  if (exchangeToRemove) {
                    return !(s.symbol === symbolToRemove && s.exchange === exchangeToRemove);
                  }
                  // Fallback: match by symbol only (backward compatibility)
                  return s.symbol !== symbolToRemove;
                }),
              }
            : wl
        ),
      }));
    },
    [setWatchlistsState]
  );

  // Open search in 'add to watchlist' mode
  const handleAddClick = useCallback(() => {
    setSearchMode('add');
    setIsSearchOpen(true);
  }, [setSearchMode, setIsSearchOpen]);

  // Open search in 'switch symbol' mode
  const handleSymbolClick = useCallback(() => {
    setSearchMode('switch');
    setIsSearchOpen(true);
  }, [setSearchMode, setIsSearchOpen]);

  // Open search in 'compare' mode
  const handleCompareClick = useCallback(() => {
    setSearchMode('compare');
    setIsSearchOpen(true);
  }, [setSearchMode, setIsSearchOpen]);

  return {
    handleSymbolChange,
    handleRemoveFromWatchlist,
    handleAddClick,
    handleSymbolClick,
    handleCompareClick,
  };
};

export default useSymbolHandlers;

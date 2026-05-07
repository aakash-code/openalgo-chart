/**
 * Interval Handlers Hook
 * Manages chart interval operations: change, toggle favorite, add/remove custom
 */

import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { VALID_INTERVAL_UNITS, DEFAULT_FAVORITE_INTERVALS, isValidIntervalValue } from '../utils/appUtils';

// ==================== TYPES ====================

/** Chart configuration */
export interface ChartConfig {
  id: number;
  interval: string;
  [key: string]: unknown;
}

/** Custom interval definition */
export interface CustomInterval {
  value: string;
  label: string;
  isCustom: boolean;
}

/** Interval unit type */
export type IntervalUnit = 'm' | 'h' | 'd' | 'w' | 'M';

/** Toast function type */
export type ShowToastFn = (
  message: string,
  type: 'success' | 'error' | 'warning' | 'info'
) => void;

/** Hook parameters */
export interface UseIntervalHandlersParams {
  setCharts: Dispatch<SetStateAction<ChartConfig[]>>;
  activeChartId: number;
  favoriteIntervals: string[];
  setFavoriteIntervals: Dispatch<SetStateAction<string[]>>;
  setLastNonFavoriteInterval: Dispatch<SetStateAction<string | null>>;
  customIntervals: CustomInterval[];
  setCustomIntervals: Dispatch<SetStateAction<CustomInterval[]>>;
  currentInterval: string;
  showToast: ShowToastFn;
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
export interface UseIntervalHandlersReturn {
  handleIntervalChange: (newInterval: string) => void;
  handleToggleFavorite: (interval: string) => void;
  handleAddCustomInterval: (value: string, unit: IntervalUnit) => void;
  handleRemoveCustomInterval: (intervalValue: string) => void;
}

// ==================== HOOK ====================

/**
 * Custom hook for interval operations
 * @param params - Hook parameters
 * @returns Interval handler functions
 */
export const useIntervalHandlers = ({
  setCharts,
  activeChartId,
  favoriteIntervals,
  setFavoriteIntervals,
  setLastNonFavoriteInterval,
  customIntervals,
  setCustomIntervals,
  currentInterval,
  showToast,
  isSyncEnabled = false,
  syncOptions = { symbol: false, interval: false, crosshair: false, time: false },
}: UseIntervalHandlersParams): UseIntervalHandlersReturn => {
  // Handle interval change - track non-favorite selections
  const handleIntervalChange = useCallback(
    (newInterval: string) => {
      setCharts((prev) =>
        prev.map((chart) => {
          const shouldUpdate = 
              chart.id === activeChartId || 
              (isSyncEnabled && syncOptions.interval);

          return shouldUpdate ? { ...chart, interval: newInterval } : chart;
        })
      );

      // If the new interval is not a favorite, save it as the last non-favorite
      if (!favoriteIntervals.includes(newInterval)) {
        setLastNonFavoriteInterval(newInterval);
      }
    },
    [setCharts, activeChartId, favoriteIntervals, setLastNonFavoriteInterval, isSyncEnabled, syncOptions.interval]
  );

  // Toggle favorite status for an interval
  const handleToggleFavorite = useCallback(
    (interval: string) => {
      if (!isValidIntervalValue(interval)) {
        showToast('Invalid interval provided', 'error');
        return;
      }
      setFavoriteIntervals((prev) =>
        prev.includes(interval) ? prev.filter((i) => i !== interval) : [...prev, interval]
      );
    },
    [setFavoriteIntervals, showToast]
  );

  // Add a new custom interval
  const handleAddCustomInterval = useCallback(
    (value: string, unit: IntervalUnit) => {
      const numericValue = parseInt(value, 10);
      if (!Number.isFinite(numericValue) || numericValue <= 0) {
        showToast('Enter a valid number greater than 0', 'error');
        return;
      }
      const unitNormalized = (VALID_INTERVAL_UNITS as Set<string>).has(unit) ? unit : null;
      if (!unitNormalized) {
        showToast('Invalid interval unit', 'error');
        return;
      }
      const newValue = `${numericValue}${unitNormalized}`;

      if (!isValidIntervalValue(newValue)) {
        showToast('Invalid interval format', 'error');
        return;
      }

      // Check if already exists in default or custom
      if (
        (DEFAULT_FAVORITE_INTERVALS as string[]).includes(newValue) ||
        customIntervals.some((i) => i.value === newValue)
      ) {
        showToast('Interval already available!', 'info');
        return;
      }

      const newInterval: CustomInterval = { value: newValue, label: newValue, isCustom: true };
      setCustomIntervals((prev) => [...prev, newInterval]);
      showToast('Custom interval added successfully!', 'success');
    },
    [customIntervals, setCustomIntervals, showToast]
  );

  // Remove a custom interval
  const handleRemoveCustomInterval = useCallback(
    (intervalValue: string) => {
      setCustomIntervals((prev) => prev.filter((i) => i.value !== intervalValue));
      // Also remove from favorites if present
      setFavoriteIntervals((prev) => prev.filter((i) => i !== intervalValue));
      // If current interval is removed, switch to default
      if (currentInterval === intervalValue) {
        handleIntervalChange('1d');
      }
    },
    [setCustomIntervals, setFavoriteIntervals, currentInterval, handleIntervalChange]
  );

  return {
    handleIntervalChange,
    handleToggleFavorite,
    handleAddCustomInterval,
    handleRemoveCustomInterval,
  };
};

export default useIntervalHandlers;

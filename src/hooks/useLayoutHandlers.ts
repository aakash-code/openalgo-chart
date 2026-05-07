/**
 * Layout Handlers Hook
 * Manages chart layout operations: change layout, maximize/restore, save layout
 */

import { useCallback, type Dispatch, type SetStateAction, type MutableRefObject } from 'react';
import { setJSON, get, STORAGE_KEYS } from '../services/storageService';
import { saveUserPreferences } from '../services/openalgo';
import logger from '../utils/logger';
import { LAYOUTS, type LayoutType } from '../types/domain/workspace';

// ==================== TYPES ====================

/** Chart configuration */
export interface ChartConfig {
  id: number;
  symbol: string;
  exchange: string;
  interval: string;
  indicators: unknown[];
  comparisonSymbols: unknown[];
  strategyConfig: unknown | null;
}

/** Layout data for storage */
export interface LayoutData {
  layout: string;
  charts: ChartConfig[];
}

/** Toast function type */
export type ShowToastFn = (
  message: string,
  type: 'success' | 'error' | 'warning' | 'info'
) => void;

/** Snapshot toast function type */
export type ShowSnapshotToastFn = (message: string) => void;

/** Hook parameters */
export interface UseLayoutHandlersParams {
  layout: string;
  setLayout: Dispatch<SetStateAction<string>>;
  charts: ChartConfig[];
  setCharts: Dispatch<SetStateAction<ChartConfig[]>>;
  activeChart: ChartConfig;
  activeChartId: number;
  setActiveChartId: Dispatch<SetStateAction<number>>;
  isMaximized: boolean;
  setIsMaximized: Dispatch<SetStateAction<boolean>>;
  prevLayoutRef: MutableRefObject<string | null>;
  showSnapshotToast: ShowSnapshotToastFn;
  showToast: ShowToastFn;
}

/** Hook return type */
export interface UseLayoutHandlersReturn {
  handleLayoutChange: (newLayout: string) => void;
  handleMaximizeChart: (chartId: number) => void;
  handleSaveLayout: () => Promise<void>;
}

// ==================== CONSTANTS ====================

// Keys to sync with cloud when saving layout
const SYNC_KEYS = [
  'tv_saved_layout',
  'tv_watchlists',
  'tv_theme',
  'tv_interval',
  'tv_fav_intervals_v2',
  'tv_custom_intervals',
  'tv_last_nonfav_interval',
  'tv_chart_appearance',
  'tv_drawing_defaults',
  'tv_drawing_templates',
  'tv_favorite_drawing_tools',
  'tv_floating_toolbar_pos',
  'tv_alerts',
  'tv_alert_logs',
  'tv_chart_alerts',
  'tv_template_favorites',
  'tv_layout_templates',
  'tv_chart_templates',
  'tv_symbol_favorites',
  'tv_recent_symbols',
  'tv_recent_commands',
  'tv_account_panel_open',
  'tv_watchlist_width',
  'tv_account_panel_height',
  'tv_show_oi_lines',
  'tv_position_tracker_settings',
  'oa_session_break_visible',
  'oa_timer_visible',
  'oa_sound_settings',
  'oa_custom_shortcuts',
  'optionChainStrikeCount',
];

// ==================== HOOK ====================

/**
 * Custom hook for layout operations
 * @param params - Hook parameters
 * @returns Layout handler functions
 */
export const useLayoutHandlers = ({
  layout,
  setLayout,
  charts,
  setCharts,
  activeChart,
  activeChartId,
  setActiveChartId,
  isMaximized,
  setIsMaximized,
  prevLayoutRef,
  showSnapshotToast,
  showToast,
}: UseLayoutHandlersParams): UseLayoutHandlersReturn => {
  // Handle layout change (1, 2, 3, 4, 6, 8, 10 charts)
  const handleLayoutChange = useCallback(
    (newLayout: string) => {
      setLayout(newLayout as LayoutType);
      
      const config = LAYOUTS[newLayout as LayoutType];
      if (!config) return;

      const count = config.rows * config.cols;
      
      setCharts((prev) => {
        const newCharts = [...prev];
        if (newCharts.length < count) {
          // Add new charts with empty indicators array
          for (let i = newCharts.length; i < count; i++) {
            newCharts.push({
              id: i + 1,
              symbol: activeChart.symbol,
              exchange: activeChart.exchange || 'NSE',
              interval: activeChart.interval,
              indicators: [],
              comparisonSymbols: [],
              strategyConfig: null,
            });
          }
        } else if (newCharts.length > count) {
          // Remove charts
          newCharts.splice(count);
        }
        return newCharts;
      });
      // Ensure active chart is valid
      if (activeChartId > count) {
        setActiveChartId(1);
      }
    },
    [setLayout, setCharts, activeChart, activeChartId, setActiveChartId]
  );

  // Handle Alt+click maximize/restore for split charts
  const handleMaximizeChart = useCallback(
    (chartId: number) => {
      if (!isMaximized) {
        // Maximize: save current layout and switch to single chart
        prevLayoutRef.current = layout;
        setIsMaximized(true);
        setLayout('1');
        setActiveChartId(chartId);
      } else {
        // Restore: go back to previous layout
        setIsMaximized(false);
        if (prevLayoutRef.current && prevLayoutRef.current !== '1') {
          setLayout(prevLayoutRef.current);
        }
        prevLayoutRef.current = null;
      }
    },
    [isMaximized, layout, setIsMaximized, setLayout, setActiveChartId, prevLayoutRef]
  );

  // Save layout to localStorage and cloud
  const handleSaveLayout = useCallback(async () => {
    const layoutData: LayoutData = {
      layout,
      charts,
    };
    try {
      // Save to localStorage
      setJSON(STORAGE_KEYS.SAVED_LAYOUT, layoutData);

      // Immediately sync to cloud
      const prefsToSave: Record<string, string | null> = {};
      SYNC_KEYS.forEach((key) => {
        const value = get(key);
        if (value !== null) {
          prefsToSave[key] = value;
        }
      });

      const success = await saveUserPreferences(prefsToSave);
      if (success) {
        showSnapshotToast('Layout saved to cloud');
      } else {
        showSnapshotToast('Layout saved locally');
      }
    } catch (error) {
      logger.error('Failed to save layout:', error);
      showToast('Failed to save layout', 'error');
    }
  }, [layout, charts, showSnapshotToast, showToast]);

  return {
    handleLayoutChange,
    handleMaximizeChart,
    handleSaveLayout,
  };
};

export default useLayoutHandlers;

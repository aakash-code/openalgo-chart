/**
 * Indicator Handlers Hook
 * Manages indicator operations: add, remove, toggle visibility, update settings
 */

import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { indicatorConfigs } from '../components/IndicatorSettings/indicatorConfigs';

// ==================== TYPES ====================

/** Indicator settings */
export interface IndicatorSettings {
  id: string;
  type: string;
  visible: boolean;
  period?: number | undefined;
  color?: string | undefined;
  [key: string]: unknown;
}

/** Chart configuration */
export interface ChartConfig {
  id: number;
  indicators: IndicatorSettings[];
  [key: string]: unknown;
}

/** Indicator config input definition */
interface IndicatorConfigInput {
  key: string;
  default?: unknown;
}

/** Indicator config style definition */
interface IndicatorConfigStyle {
  key: string;
  default?: unknown;
}

/** Indicator configuration from indicatorConfigs */
interface IndicatorConfig {
  inputs?: IndicatorConfigInput[] | undefined;
  style?: IndicatorConfigStyle[] | undefined;
}

/** Hook parameters */
export interface UseIndicatorHandlersParams {
  setCharts: Dispatch<SetStateAction<ChartConfig[]>>;
  activeChartId: number;
}

/** Hook return type */
export interface UseIndicatorHandlersReturn {
  updateIndicatorSettings: (newIndicators: IndicatorSettings[]) => void;
  handleAddIndicator: (type: string) => void;
  handleIndicatorRemove: (id: string) => void;
  handleIndicatorVisibilityToggle: (id: string) => void;
  handleIndicatorSettings: (id: string, newSettings: Partial<IndicatorSettings>) => void;
}

// ==================== HOOK ====================

/**
 * Custom hook for indicator operations
 * @param params - Hook parameters
 * @returns Indicator handler functions
 */
export const useIndicatorHandlers = ({
  setCharts,
  activeChartId,
}: UseIndicatorHandlersParams): UseIndicatorHandlersReturn => {
  // Update indicator settings (period, color, etc.)
  const updateIndicatorSettings = useCallback(
    (newIndicators: IndicatorSettings[]) => {
      setCharts((prev) =>
        prev.map((chart) => {
          if (chart.id !== activeChartId) return chart;
          return { ...chart, indicators: newIndicators };
        })
      );
    },
    [activeChartId, setCharts]
  );

  // Handler for adding a new indicator instance
  const handleAddIndicator = useCallback(
    (type: string) => {
      setCharts((prev) =>
        prev.map((chart) => {
          if (chart.id !== activeChartId) return chart;

          const config = (indicatorConfigs as Record<string, IndicatorConfig>)[type];
          const defaultSettings: Record<string, unknown> = {};

          // Merge defaults from config inputs
          if (config && config.inputs) {
            config.inputs.forEach((input) => {
              if (input.default !== undefined) {
                defaultSettings[input.key] = input.default;
              }
            });
          }

          // Merge defaults from config styles
          if (config && config.style) {
            config.style.forEach((style) => {
              if (style.default !== undefined) {
                defaultSettings[style.key] = style.default;
              }
            });
          }

          // Fallback defaults for legacy/hardcoded types if config missing
          if (!config) {
            if (type === 'sma') Object.assign(defaultSettings, { period: 20, color: '#2196F3' });
            if (type === 'ema') Object.assign(defaultSettings, { period: 20, color: '#FF9800' });
            if (type === 'tpo')
              Object.assign(defaultSettings, { blockSize: '30m', tickSize: 'auto' });
          }

          const newIndicator: IndicatorSettings = {
            ...defaultSettings,
            id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: type,
            visible: true,
          };

          return {
            ...chart,
            indicators: [...(chart.indicators || []), newIndicator],
          };
        })
      );
    },
    [activeChartId, setCharts]
  );

  // Handler for removing indicator from pane
  const handleIndicatorRemove = useCallback(
    (id: string) => {
      setCharts((prev) =>
        prev.map((chart) => {
          if (chart.id !== activeChartId) return chart;
          return {
            ...chart,
            indicators: (chart.indicators || []).filter((ind) => ind.id !== id),
          };
        })
      );
    },
    [activeChartId, setCharts]
  );

  // Handler for toggling indicator visibility (hide/show without removing)
  const handleIndicatorVisibilityToggle = useCallback(
    (id: string) => {
      setCharts((prev) =>
        prev.map((chart) => {
          if (chart.id !== activeChartId) return chart;
          return {
            ...chart,
            indicators: (chart.indicators || []).map((ind) => {
              if (ind.id === id) {
                return { ...ind, visible: !ind.visible };
              }
              return ind;
            }),
          };
        })
      );
    },
    [activeChartId, setCharts]
  );

  // Handler for updating indicator settings from TradingView-style dialog
  const handleIndicatorSettings = useCallback(
    (id: string, newSettings: Partial<IndicatorSettings>) => {
      setCharts((prev) => {
        return prev.map((chart) => {
          if (chart.id !== activeChartId) return chart;
          const newIndicators = (chart.indicators || []).map((ind) => {
            if (ind.id === id) {
              return { ...ind, ...newSettings };
            }
            return ind;
          });
          return {
            ...chart,
            indicators: newIndicators,
          };
        });
      });
    },
    [activeChartId, setCharts]
  );

  return {
    updateIndicatorSettings,
    handleAddIndicator,
    handleIndicatorRemove,
    handleIndicatorVisibilityToggle,
    handleIndicatorSettings,
  };
};

export default useIndicatorHandlers;

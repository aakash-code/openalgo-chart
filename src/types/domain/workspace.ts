/**
 * Workspace Domain Types
 * Types for workspace layout and state management
 */

import type { ChartConfig } from './chart';
import type { IChartApi } from 'lightweight-charts';

/** Layout type - number of charts */
export type LayoutType = '1' | '2' | '2v' | '3' | '4' | '5' | '6' | '8' | '10';

/** Layout configuration */
export interface LayoutConfig {
  type: LayoutType;
  label: string;
  rows: number;
  cols: number;
  icon?: string;
}

/** Available layouts */
export const LAYOUTS: Record<LayoutType, LayoutConfig> = {
  '1': { type: '1', label: 'Single', rows: 1, cols: 1 },
  '2': { type: '2', label: '2 Horizontal', rows: 1, cols: 2 },
  '2v': { type: '2v', label: '2 Vertical', rows: 2, cols: 1 },
  '3': { type: '3', label: '3 Charts', rows: 1, cols: 3 },
  '4': { type: '4', label: '4 Charts', rows: 2, cols: 2 },
  '5': { type: '5', label: '5 Charts', rows: 2, cols: 3 },
  '6': { type: '6', label: '6 Charts', rows: 2, cols: 3 },
  '8': { type: '8', label: '8 Charts', rows: 2, cols: 4 },
  '10': { type: '10', label: '10 Charts', rows: 2, cols: 5 },
};

/** Workspace state */
export interface WorkspaceState {
  layout: LayoutType;
  activeChartId: number;
  charts: ChartConfig[];
}

/** Workspace actions */
export interface WorkspaceActions {
  setLayout: (layout: LayoutType) => void;
  setActiveChartId: (id: number | ((prev: number) => number)) => void;
  setCharts: (charts: ChartConfig[] | ((prev: ChartConfig[]) => ChartConfig[])) => void;
  addChart: (chart: ChartConfig) => void;
  removeChart: (id: number) => void;
  updateChart: (id: number, updates: Partial<ChartConfig>) => void;
  updateIndicator: (
    chartId: number,
    indicatorId: string,
    settings: Record<string, unknown>
  ) => void;
  addIndicator: (chartId: number, indicator: ChartConfig['indicators'][number]) => void;
  removeIndicator: (chartId: number, indicatorId: string) => void;
  setChartRef: (id: number, ref: IChartApi | null) => void;
  getChartRef: (id: number) => IChartApi | null | undefined;
  setFromCloud: (data: WorkspaceState) => void;
}

/** Full workspace store type */
export type WorkspaceStore = WorkspaceState & WorkspaceActions & {
  chartRefs: Record<number, IChartApi | null>;
};

/** Panel visibility state */
export interface PanelVisibility {
  watchlist: boolean;
  orderEntry: boolean;
  positionTracker: boolean;
  optionChain: boolean;
  alerts: boolean;
  riskCalculator: boolean;
  objectTree: boolean;
  sectorHeatmap: boolean;
}

/** UI state */
export interface UIState {
  sidebarCollapsed: boolean;
  bottomPanelHeight: number;
  rightPanelWidth: number;
  panelVisibility: PanelVisibility;
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
}

/** Keyboard shortcut */
export interface KeyboardShortcut {
  id: string;
  key: string;
  modifiers: ('ctrl' | 'alt' | 'shift' | 'meta')[];
  action: string;
  description: string;
  category: 'trading' | 'chart' | 'navigation' | 'general';
}

/** User preferences */
export interface UserPreferences {
  defaultProduct: 'MIS' | 'CNC' | 'NRML';
  defaultOrderType: 'MARKET' | 'LIMIT';
  confirmOrders: boolean;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  autoSaveInterval: number;
  shortcuts: KeyboardShortcut[];
}

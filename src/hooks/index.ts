/**
 * Hooks Index
 * Central export for all custom hooks
 */

// Utility hooks
export { useDebounce, useDebounceWithPending } from './useDebounce';
export {
  useLocalStorage,
  useLocalStorageBoolean,
  useLocalStorageNumber,
} from './useLocalStorage';
export { useClickOutside, useClickOutsideMultiple } from './useClickOutside';
export {
  useMediaQuery,
  useResponsive,
  usePrefersReducedMotion,
  usePrefersDarkMode,
  BREAKPOINTS,
} from './useMediaQuery';

// useIsMobile - convenience wrapper around useResponsive
import { useResponsive } from './useMediaQuery';
export function useIsMobile(): boolean {
  const { isMobile } = useResponsive();
  return isMobile;
}

// Command palette and shortcuts
export {
  useCommandPalette,
  COMMAND_CATEGORIES,
  CATEGORY_CONFIG,
  type Command,
  type CommandGroup,
  type CommandCategory,
  type CommandPaletteHandlers,
  type UseCommandPaletteReturn,
} from './useCommandPalette';
export {
  useGlobalShortcuts,
  type ShortcutHandlers,
  type GlobalShortcutsOptions,
} from './useGlobalShortcuts';
export {
  useToastManager,
  type Toast,
  type ToastType,
  type ToastAction,
  type UseToastManagerReturn,
} from './useToastManager';
export {
  useSmartTooltip,
  type TooltipPosition,
  type UseSmartTooltipReturn,
} from './useSmartTooltip';
export { useFocusTrap, type FocusTrapOptions } from './useFocusTrap';
export {
  useKeyboardNav,
  useListNavigation,
  type KeyboardNavOptions,
  type ListNavigationOptions,
  type ListNavigationReturn,
} from './useKeyboardNav';
export {
  useAlertHandlers,
  type Alert,
  type AlertStatus,
  type AlertLogEntry,
  type UseAlertHandlersParams,
  type UseAlertHandlersReturn,
} from './useAlertHandlers';
export {
  useANNScanner,
  type ANNScannerState,
  type ANNScanProgress,
  type UseANNScannerReturn,
} from './useANNScanner';

// Chart hooks
export { useChartResize, type ChartInstance } from './useChartResize';
export {
  useChartAlerts,
  type AlertData,
  type UserPriceAlerts,
  type LineToolManager,
} from './useChartAlerts';
export {
  useIntervalHandlers,
  type CustomInterval,
  type IntervalUnit,
  type UseIntervalHandlersParams,
  type UseIntervalHandlersReturn,
} from './useIntervalHandlers';

// Trading hooks
export {
  useRiskCalculator,
  type TradeSide,
  type RiskParams,
  type InitialRiskParams,
  type RiskResults,
  type ValidationResult,
  type UseRiskCalculatorReturn,
} from './useRiskCalculator';
export {
  useIndicatorAlertHandlers,
  type IndicatorAlertConfig,
  type UseIndicatorAlertHandlersParams,
  type UseIndicatorAlertHandlersReturn,
} from './useIndicatorAlertHandlers';
export {
  default as useOrderFormState,
  type ValidationErrors,
  type InitialOrderData,
  type OrderPayload,
  type UseOrderFormStateOptions,
  type UseOrderFormStateReturn,
} from './useOrderFormState';
export {
  useOrderHandlers,
  type Order,
  type UseOrderHandlersParams,
  type UseOrderHandlersReturn,
} from './useOrderHandlers';
export {
  useTradingData,
  type Position,
  type Funds,
  type Holding,
  type Trade,
  type UseTradingDataReturn,
} from './useTradingData';

// Symbol hooks
export {
  useSymbolHistory,
  type SymbolData as SymbolHistoryData,
  type SymbolInput,
  type UseSymbolHistoryReturn,
} from './useSymbolHistory';
export {
  useSymbolHandlers,
  COMPARE_SCALE_MODES,
  type CompareScaleMode,
  type SymbolData,
  type ComparisonSymbol,
  type UseSymbolHandlersParams,
  type UseSymbolHandlersReturn,
} from './useSymbolHandlers';

// Layout & UI hooks
export {
  useLayoutHandlers,
  type ChartConfig as LayoutChartConfig,
  type LayoutData,
  type UseLayoutHandlersParams,
  type UseLayoutHandlersReturn,
} from './useLayoutHandlers';
export {
  useDrawingProperties,
  DEFAULT_DRAWING_OPTIONS,
  LINE_STYLES,
  PRESET_COLORS,
  type LineStyleOption,
  type DrawingOptions,
  type UseDrawingPropertiesReturn,
} from './useDrawingProperties';
export {
  useIndicatorHandlers,
  type IndicatorSettings,
  type UseIndicatorHandlersParams,
  type UseIndicatorHandlersReturn,
} from './useIndicatorHandlers';
export {
  useToolHandlers,
  type ChartRef,
  type ChartRefs,
  type ConfirmOptions,
  type ToolName,
  type UseToolHandlersParams,
  type UseToolHandlersReturn,
} from './useToolHandlers';

// Table hooks
export {
  useTableFiltering,
  sortData,
  type SortDirection,
  type SortConfig,
  type FilterConfig,
  type DataItem,
  type FiltersState,
  type UniqueFilterValues,
  type UseTableFilteringOptions,
  type UseTableFilteringReturn,
} from './useTableFiltering';

// UI handlers hook
export {
  useUIHandlers,
  type ChartAppearance,
  type UseUIHandlersParams,
  type UseUIHandlersReturn,
} from './useUIHandlers';

// Watchlist hooks
export {
  useWatchlistHandlers,
  type ShowToastFn,
  type UseWatchlistHandlersParams,
  type UseWatchlistHandlersReturn,
} from './useWatchlistHandlers';

// Chart context hook
export {
  useChart,
  type ExtendedChartConfig,
  type ComparisonSymbol as ChartComparisonSymbol,
  type StrategyConfig,
  type ChartRef as ChartRefType,
  type ChartRefs as ChartRefsType,
  type UseChartReturn,
} from './useChart';

// Chart drawings hook
export {
  useChartDrawings,
  type Drawing,
  type LineToolManager as DrawingLineToolManager,
  type OnDrawingsSyncFn,
} from './useChartDrawings';

// Indicator worker hook
export {
  useIndicatorWorker,
  type TPOOptions,
  type VolumeProfileOptions,
  type TPOSession,
  type TPOResult,
  type VolumeProfileRow,
  type VolumeProfileResult,
  type CandleData,
  type UseIndicatorWorkerReturn,
} from './useIndicatorWorker';

// Virtual scroll hook
export {
  useVirtualScroll,
  VirtualList,
  type VirtualItem,
  type GetItemHeightFn,
  type UseVirtualScrollOptions,
  type ContainerProps,
  type InnerProps,
  type ItemStyle,
  type UseVirtualScrollReturn,
  type VirtualListProps,
} from './useVirtualScroll';

// OI Lines hook
export {
  useOILines,
  type OIExchange,
  type OILinesData,
  type UseOILinesReturn,
} from './useOILines';

// Option chain data hook
export {
  useOptionChainData,
  type UnderlyingSymbol,
  type OptionChainStrike,
  type OptionChainData,
  type UseOptionChainDataOptions,
  type UseOptionChainDataReturn,
} from './useOptionChainData';

// Cloud workspace sync hook
export {
  useCloudWorkspaceSync,
  type AuthState,
  type UseCloudWorkspaceSyncReturn,
} from './useCloudWorkspaceSync';

/**
 * Context Index
 * Central export for all context providers
 */

// User Context
export {
  UserProvider,
  useUser,
  type UserContextValue,
  type User,
  type UserProviderProps,
} from './UserContext';

// Theme Context
export {
  ThemeProvider,
  useTheme,
  type ThemeContextValue,
  type Theme,
  type ThemeProviderProps,
} from './ThemeContext';

// Alert Context
export {
  AlertProvider,
  useAlert,
  type AlertContextValue,
  type Alert,
  type AlertLog,
  type GlobalAlertPopup,
  type AlertProviderProps,
} from './AlertContext';

// Order Context
export {
  OrderProvider,
  useOrders,
  type OrderContextValue,
  type Order,
  type Position,
  type Funds,
  type Holding,
  type Trade,
  type ShowToastFn,
  type OrderProviderProps,
} from './OrderContext';

// Tool Context
export {
  ToolProvider,
  useTool,
  DRAWING_TOOLS,
  type ToolContextValue,
  type DrawingTool,
  type ToolProviderProps,
} from './ToolContext';

// UI Context
export {
  UIProvider,
  useUI,
  type UIContextValue,
  type SearchMode,
  type RightPanelType,
  type UIProviderProps,
} from './UIContext';

// Watchlist Context
export {
  WatchlistProvider,
  useWatchlist,
  type WatchlistContextValue,
  type WatchlistProviderProps,
} from './WatchlistContext';
export type {
  Watchlist,
  WatchlistsState,
  WatchlistSymbol,
  WatchlistItemData,
} from '../types/watchlist';

// Watchlist Monitor Context
export {
  WatchlistMonitorProvider,
  useWatchlistMonitor,
} from './WatchlistMonitorContext';

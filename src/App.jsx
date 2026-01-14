import React, { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react';
import { DashboardLayout } from './components/DashboardLayout/DashboardLayout';
import ApiKeyDialog from './components/ApiKeyDialog/ApiKeyDialog';

// Lazy load heavy modal components for better initial load performance

import { initTimeService, destroyTimeService } from './services/timeService';
import { getTickerPrice, closeAllWebSockets, subscribeToMultiTicker } from './services/openalgo';
import logger from './utils/logger';
import { useIsMobile, useCommandPalette, useGlobalShortcuts } from './hooks';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useCloudWorkspaceSync } from './hooks/useCloudWorkspaceSync';
import { useOILines } from './hooks/useOILines';
import { useTradingData } from './hooks/useTradingData';
import { useWatchlistHandlers } from './hooks/useWatchlistHandlers';
import { useIndicatorHandlers } from './hooks/useIndicatorHandlers';
import { useIntervalHandlers } from './hooks/useIntervalHandlers';
import { useOrderHandlers } from './hooks/useOrderHandlers';
import { useSymbolHandlers } from './hooks/useSymbolHandlers';
import { useLayoutHandlers } from './hooks/useLayoutHandlers';
import { useAlertHandlers } from './hooks/useAlertHandlers';
import { useToolHandlers } from './hooks/useToolHandlers';
import { useUIHandlers } from './hooks/useUIHandlers';
import { useANNScanner } from './hooks/useANNScanner';
import { useTheme } from './context/ThemeContext';
import { useUser } from './context/UserContext';
import { indicatorConfigs } from './components/IndicatorSettings/indicatorConfigs';



// Lazy load additional heavy components
const ANNScanner = lazy(() => import('./components/ANNScanner'));
import {
  VALID_INTERVAL_UNITS,
  DEFAULT_FAVORITE_INTERVALS,
  isValidIntervalValue,
  sanitizeFavoriteIntervals,
  sanitizeCustomIntervals,
  safeParseJSON,
  ALERT_RETENTION_MS,
  DEFAULT_WATCHLIST,
  migrateWatchlistData,
  DEFAULT_CHART_APPEARANCE,
  DEFAULT_DRAWING_OPTIONS,
  DRAWING_TOOLS,
  formatPrice
} from './utils/appUtils';

// Simple Loader Component - uses CSS variables to match user's theme
const WorkspaceLoader = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    background: 'var(--tv-color-platform-background)',
    color: 'var(--tv-color-text-primary)',
    fontFamily: 'system-ui'
  }}>
    <div style={{ textAlign: 'center' }}>
      <h2>Synching Workspace...</h2>
      <p style={{ color: 'var(--tv-color-text-secondary)' }}>Loading your cloud settings</p>
    </div>
  </div>
);

// AppContent - only mounts AFTER cloud sync is complete
// This ensures all useState initializers read from already-updated localStorage
function AppContent({ isAuthenticated, setIsAuthenticated }) {
  const { apiKey, setApiKey, websocketUrl, setWebsocketUrl, hostUrl, setHostUrl, openalgoUsername, setOpenalgoUsername } = useUser();

  // Multi-Chart State
  const [layout, setLayout] = useState(() => {
    const saved = safeParseJSON(localStorage.getItem('tv_saved_layout'), null);
    return saved && saved.layout ? saved.layout : '1';
  });
  const [isMaximized, setIsMaximized] = useState(false);
  const prevLayoutRef = useRef(null);
  const [activeChartId, setActiveChartId] = useState(1);
  const [charts, setCharts] = useState(() => {
    const saved = safeParseJSON(localStorage.getItem('tv_saved_layout'), null);
    const defaultIndicators = []; // Start with empty array for new charts

    // Migration function: converts old object format to new array format
    const migrateIndicators = (indicators) => {
      // If already an array, return as is
      if (Array.isArray(indicators)) return indicators;

      // Migrate object format to array
      const migrated = [];
      const timestamp = Date.now();
      let counter = 0;

      Object.entries(indicators).forEach(([type, config]) => {
        // Skip hidden/disabled indicators if they were just booleans
        if (config === false) return;

        // Create base object
        const base = {
          id: `${type}_${timestamp}_${counter++}`,
          type: type,
          visible: true
        };

        // Handle boolean configs (old simple indicators)
        if (config === true) {
          // Add default props based on type if needed, or rely on chart component defaults
          // For now, we just push the type. Chart component will handle defaults if missing.
          // BUT better to have defaults here.
          // Let's assume defaults are applied when adding. For migration, we keep it minimum.
          if (type === 'sma') Object.assign(base, { period: 20, color: '#2196F3' });
          if (type === 'ema') Object.assign(base, { period: 20, color: '#FF9800' });
          migrated.push(base);
          return;
        }

        // Handle object configs
        if (typeof config === 'object' && config !== null) {
          if (config.enabled === false) return; // Skip disabled

          // Flatten config into the indicator object
          // Old: { sma: { enabled: true, period: 20 } }
          // New: { id: '...', type: 'sma', period: 20 }
          const { enabled, ...settings } = config;
          Object.assign(base, settings);
          // Map 'hidden' to !visible
          if (settings.hidden) {
            base.visible = false;
            delete base.hidden;
          }
          migrated.push(base);
        }
      });
      return migrated;
    };

    if (saved && Array.isArray(saved.charts)) {
      // Merge saved indicators with defaults to ensure new indicators are present
      // Also ensure strategyConfig exists (for migration from older versions)
      return saved.charts.map(chart => ({
        ...chart,
        indicators: migrateIndicators(chart.indicators || []).map(ind => {
          // Auto-repair Pivot Points showing as 'classic' due to previous bug
          if (ind.type === 'classic') {
            return { ...ind, type: 'pivotPoints', pivotType: 'classic' };
          }
          return ind;
        }),
        strategyConfig: chart.strategyConfig ?? null
      }));
    }
    return [
      { id: 1, symbol: 'RELIANCE', exchange: 'NSE', interval: localStorage.getItem('tv_interval') || '1d', indicators: defaultIndicators, comparisonSymbols: [], strategyConfig: null }
    ];
  });

  // Derived state for active chart (memoized to prevent recalculation on every render)
  const activeChart = React.useMemo(
    () => charts.find(c => c.id === activeChartId) || charts[0],
    [charts, activeChartId]
  );
  const currentSymbol = activeChart.symbol;
  const currentExchange = activeChart.exchange || 'NSE';
  const currentInterval = activeChart.interval;

  // Refs for multiple charts
  const chartRefs = React.useRef({});

  // Flag to skip next sync (used during resume to prevent duplicate)
  const skipNextSyncRef = React.useRef(false);

  useEffect(() => {
    localStorage.setItem('tv_interval', currentInterval);
  }, [currentInterval]);

  // Auto-save layout (includes indicators, symbol, interval per chart)
  useEffect(() => {
    // Skip first render - layout is already loaded from localStorage
    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false;
      return;
    }
    try {
      const layoutData = { layout, charts };
      localStorage.setItem('tv_saved_layout', JSON.stringify(layoutData));
      logger.debug('[App] Auto-saved layout:', { layout, chartsCount: charts.length });
    } catch (error) {
      console.error('Failed to auto-save layout:', error);
    }
  }, [layout, charts]);
  const [chartType, setChartType] = useState('candlestick');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchMode, setSearchMode] = useState('switch'); // 'switch' or 'add'
  const [initialSearchValue, setInitialSearchValue] = useState('');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isShortcutsDialogOpen, setIsShortcutsDialogOpen] = useState(false);
  const [isChartTemplatesOpen, setIsChartTemplatesOpen] = useState(false);
  // Multi-leg strategy chart state

  const [isStraddlePickerOpen, setIsStraddlePickerOpen] = useState(false);
  // strategyConfig is now per-chart, stored in charts[].strategyConfig
  const [isOptionChainOpen, setIsOptionChainOpen] = useState(false);
  const [optionChainInitialSymbol, setOptionChainInitialSymbol] = useState(null);

  // const [indicators, setIndicators] = useState({ sma: false, ema: false }); // Moved to charts state
  const [toasts, setToasts] = useState([]);
  const toastIdCounter = React.useRef(0);
  const MAX_TOASTS = 3;

  const [snapshotToast, setSnapshotToast] = useState(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertPrice, setAlertPrice] = useState(null);

  // Alert State (persisted with 24h retention)
  const [alerts, setAlerts] = useState(() => {
    const saved = safeParseJSON(localStorage.getItem('tv_alerts'), []);
    if (!Array.isArray(saved)) return [];
    const cutoff = Date.now() - ALERT_RETENTION_MS;
    return saved.filter(a => {
      const ts = a && a.created_at ? new Date(a.created_at).getTime() : NaN;
      return Number.isFinite(ts) && ts >= cutoff;
    });
  });
  const alertsRef = React.useRef(alerts); // Ref to avoid race condition in WebSocket callback
  React.useEffect(() => { alertsRef.current = alerts; }, [alerts]);

  const [alertLogs, setAlertLogs] = useState(() => {
    const saved = safeParseJSON(localStorage.getItem('tv_alert_logs'), []);
    if (!Array.isArray(saved)) return [];
    const cutoff = Date.now() - ALERT_RETENTION_MS;
    return saved.filter(l => {
      const ts = l && l.time ? new Date(l.time).getTime() : NaN;
      return Number.isFinite(ts) && ts >= cutoff;
    });
  });
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);

  // Global alert popup state (for background alert notifications)
  const [globalAlertPopups, setGlobalAlertPopups] = useState([]);

  // Mobile State
  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState('chart');
  const [isWatchlistVisible, setIsWatchlistVisible] = useState(false);

  // Tool State
  const [activeTool, setActiveTool] = useState('Cursor');
  const [isMagnetMode, setIsMagnetMode] = useState(false);
  const [isDrawingsHidden, setIsDrawingsHidden] = useState(false);
  const [isDrawingsLocked, setIsDrawingsLocked] = useState(false);
  const [isTimerVisible, setIsTimerVisible] = useState(false);
  const [isSessionBreakVisible, setIsSessionBreakVisible] = useState(false);
  const [showDrawingToolbar, setShowDrawingToolbar] = useState(true);
  const [isReplayMode, setIsReplayMode] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isIndicatorSettingsOpen, setIsIndicatorSettingsOpen] = useState(false);

  // Drawings State
  const [liveDrawings, setLiveDrawings] = useState([]);
  const handleDrawingsSync = useCallback((drawings) => {
    setLiveDrawings(drawings);
  }, []);

  // Trading Data (Orders/Positions) for visual trading
  // Trading Data (Orders/Positions) for visual trading and Account Panel
  // We fetch ALL data here to avoid duplicate API calls in child components
  const {
    activeOrders,
    activePositions,
    positions: allPositions,
    orders: allOrders,
    funds,
    holdings,
    trades,
    refreshTradingData
  } = useTradingData(isAuthenticated);

  // Show toast helper with queue management (MOVED HERE)
  const showToast = useCallback((message, type = 'error', action = null) => {
    const id = ++toastIdCounter.current;
    const newToast = { id, message, type, action };

    setToasts(prev => {
      // Add new toast, limit to MAX_TOASTS (oldest removed first)
      const updated = [...prev, newToast];
      if (updated.length > MAX_TOASTS) {
        return updated.slice(-MAX_TOASTS);
      }
      return updated;
    });

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []); // Empty dependency array as it uses functional state update and refs

  // Remove a specific toast
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Order handlers extracted to hook
  const {
    handleModifyOrder,
    handleCancelOrder
  } = useOrderHandlers({
    activeOrders,
    showToast,
    refreshTradingData
  });

  // Handle mobile tab changes
  const handleMobileTabChange = useCallback((tab) => {
    setMobileTab(tab);
    // Show/hide watchlist based on tab
    if (tab === 'watchlist') {
      setActiveRightPanel('watchlist');
      setIsWatchlistVisible(true);
    } else {
      setIsWatchlistVisible(false);
    }
    // Handle settings tab
    if (tab === 'settings') {
      setIsSettingsOpen(true);
      setMobileTab('chart'); // Reset to chart after opening settings
    }
    // Handle alerts tab
    if (tab === 'alerts') {
      setActiveRightPanel('alerts');
      setIsWatchlistVisible(true);
      setMobileTab('alerts');
    }
    // Handle tools tab
    if (tab === 'tools') {
      setShowDrawingToolbar(true);
      setMobileTab('chart');
    }
  }, []);

  // Bottom Bar State
  const [currentTimeRange, setCurrentTimeRange] = useState('All');
  const [isLogScale, setIsLogScale] = useState(false);
  const [isAutoScale, setIsAutoScale] = useState(true);
  const [showOILines, setShowOILines] = useState(() => {
    return localStorage.getItem('tv_show_oi_lines') === 'true';
  });

  // OI Lines Hook - fetch Max Call OI, Max Put OI, Max Pain
  const { oiLines, isLoading: oiLinesLoading } = useOILines(currentSymbol, currentExchange, showOILines);

  // Right Panel State
  const [activeRightPanel, setActiveRightPanel] = useState('watchlist');

  // Position Tracker State
  const [positionTrackerSettings, setPositionTrackerSettings] = useState(() => {
    const saved = safeParseJSON(localStorage.getItem('tv_position_tracker_settings'), null);
    return saved || { sourceMode: 'watchlist', customSymbols: [] };
  });

  // ANN Scanner persisted state (survives tab switches)
  const [annScannerState, setAnnScannerState] = useState({
    results: [],
    previousResults: [],
    lastScanTime: null,
    source: 'watchlist',
    filter: 'all',
    refreshInterval: 'off',
    alertsEnabled: true,
    sectorFilter: 'All',
    // Background scan state
    isScanning: false,
    progress: { current: 0, total: 0 },
    scanError: null,
  });

  // ANN Scanner background scan handlers
  const { startAnnScan, cancelAnnScan } = useANNScanner(annScannerState, setAnnScannerState);

  // Sector Heatmap Modal State
  const [isSectorHeatmapOpen, setIsSectorHeatmapOpen] = useState(false);

  // Account Panel State - defaults to visible (true) on new browsers
  const [isAccountPanelOpen, setIsAccountPanelOpen] = useState(() => {
    const saved = localStorage.getItem('tv_account_panel_open');
    return saved === null ? true : saved === 'true';
  });
  const [isAccountPanelMinimized, setIsAccountPanelMinimized] = useState(false);
  const [isAccountPanelMaximized, setIsAccountPanelMaximized] = useState(false);

  // Persist account panel state
  useEffect(() => {
    localStorage.setItem('tv_account_panel_open', isAccountPanelOpen.toString());
  }, [isAccountPanelOpen]);

  // Account panel minimize/maximize handlers
  const handleAccountPanelMinimize = useCallback(() => {
    setIsAccountPanelMinimized(prev => !prev);
    if (isAccountPanelMaximized) setIsAccountPanelMaximized(false);
  }, [isAccountPanelMaximized]);

  const handleAccountPanelMaximize = useCallback(() => {
    setIsAccountPanelMaximized(prev => !prev);
    if (isAccountPanelMinimized) setIsAccountPanelMinimized(false);
  }, [isAccountPanelMinimized]);

  // Persist position tracker settings
  useEffect(() => {
    try {
      localStorage.setItem('tv_position_tracker_settings', JSON.stringify(positionTrackerSettings));
    } catch (error) {
      console.error('Failed to persist position tracker settings:', error);
    }
  }, [positionTrackerSettings]);

  // Persist OI Lines toggle
  useEffect(() => {
    localStorage.setItem('tv_show_oi_lines', showOILines.toString());
  }, [showOILines]);

  // Toggle OI Lines handler
  const handleToggleOILines = useCallback(() => {
    setShowOILines(prev => !prev);
  }, []);

  // Theme State
  // Theme State (Refactored to Context)
  const { theme, toggleTheme, setTheme } = useTheme();


  // Legacy effect removed - handled by ThemeContext

  // Chart Appearance State
  const [chartAppearance, setChartAppearance] = useState(() => {
    const saved = safeParseJSON(localStorage.getItem('tv_chart_appearance'), null);
    return saved ? { ...DEFAULT_CHART_APPEARANCE, ...saved } : DEFAULT_CHART_APPEARANCE;
  });

  // Persist chart appearance settings
  useEffect(() => {
    try {
      localStorage.setItem('tv_chart_appearance', JSON.stringify(chartAppearance));
    } catch (error) {
      console.error('Failed to persist chart appearance:', error);
    }
  }, [chartAppearance]);

  // Drawing Tool Defaults State
  const [drawingDefaults, setDrawingDefaults] = useState(() => {
    const saved = safeParseJSON(localStorage.getItem('tv_drawing_defaults'), null);
    return saved ? { ...DEFAULT_DRAWING_OPTIONS, ...saved } : DEFAULT_DRAWING_OPTIONS;
  });

  // Persist drawing defaults
  useEffect(() => {
    try {
      localStorage.setItem('tv_drawing_defaults', JSON.stringify(drawingDefaults));
    } catch (error) {
      console.error('Failed to persist drawing defaults:', error);
    }
  }, [drawingDefaults]);

  // Toast timeout refs for cleanup
  const snapshotToastTimeoutRef = React.useRef(null);

  const showSnapshotToast = (message) => {
    if (snapshotToastTimeoutRef.current) {
      clearTimeout(snapshotToastTimeoutRef.current);
    }
    setSnapshotToast(message);
    snapshotToastTimeoutRef.current = setTimeout(() => setSnapshotToast(null), 3000);
  };

  // Order handlers are now provided by useOrderHandlers hook

  // Cleanup toast timeouts on unmount
  useEffect(() => {
    return () => {
      if (snapshotToastTimeoutRef.current) clearTimeout(snapshotToastTimeoutRef.current);
    };
  }, []);

  // Cleanup all WebSocket connections on app exit (beforeunload)
  // This ensures proper unsubscription like the Python API: client.unsubscribe_ltp() + client.disconnect()
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Use forceClose for immediate cleanup on page unload (no time for unsubscribe delay)
      forceCloseAllWebSockets();
    };

    const handleUnload = () => {
      // Fallback for unload event
      forceCloseAllWebSockets();
    };

    // Handler for external toast events (from line tools etc)
    const handleExternalToast = (e) => {
      if (e.detail && e.detail.message) {
        showToast(e.detail.message, e.detail.type || 'info');
      }
    };

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);
    window.addEventListener('oa-show-toast', handleExternalToast);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
      window.removeEventListener('oa-show-toast', handleExternalToast);
      // Also close all WebSockets when App component unmounts
      closeAllWebSockets();
    };
  }, []);

  // Timeframe Management
  const [favoriteIntervals, setFavoriteIntervals] = useState(() => {
    const saved = safeParseJSON(localStorage.getItem('tv_fav_intervals_v2'), null);
    return sanitizeFavoriteIntervals(saved);
  });

  const [customIntervals, setCustomIntervals] = useState(() => {
    const saved = safeParseJSON(localStorage.getItem('tv_custom_intervals'), []);
    return sanitizeCustomIntervals(saved);
  });

  // Track last selected non-favorite interval (persisted)
  const [lastNonFavoriteInterval, setLastNonFavoriteInterval] = useState(() => {
    const saved = localStorage.getItem('tv_last_nonfav_interval');
    return isValidIntervalValue(saved) ? saved : null;
  });

  useEffect(() => {
    try {
      localStorage.setItem('tv_fav_intervals_v2', JSON.stringify(favoriteIntervals));
    } catch (error) {
      console.error('Failed to persist favorite intervals:', error);
    }
  }, [favoriteIntervals]);

  useEffect(() => {
    try {
      localStorage.setItem('tv_custom_intervals', JSON.stringify(customIntervals));
    } catch (error) {
      console.error('Failed to persist custom intervals:', error);
    }
  }, [customIntervals]);

  useEffect(() => {
    if (lastNonFavoriteInterval && !isValidIntervalValue(lastNonFavoriteInterval)) {
      return;
    }
    if (lastNonFavoriteInterval) {
      try {
        localStorage.setItem('tv_last_nonfav_interval', lastNonFavoriteInterval);
      } catch (error) {
        console.error('Failed to persist last non-favorite interval:', error);
      }
    } else {
      localStorage.removeItem('tv_last_nonfav_interval');
    }
  }, [lastNonFavoriteInterval]);

  // Interval handlers extracted to hook
  const {
    handleIntervalChange,
    handleToggleFavorite,
    handleAddCustomInterval,
    handleRemoveCustomInterval
  } = useIntervalHandlers({
    setCharts,
    activeChartId,
    favoriteIntervals,
    setFavoriteIntervals,
    setLastNonFavoriteInterval,
    customIntervals,
    setCustomIntervals,
    currentInterval,
    showToast
  });

  // Multiple Watchlists State
  const [watchlistsState, setWatchlistsState] = useState(migrateWatchlistData);

  // Derive active watchlist and symbols from state (memoized)
  const activeWatchlist = React.useMemo(
    () => watchlistsState.lists.find(wl => wl.id === watchlistsState.activeListId) || watchlistsState.lists[0],
    [watchlistsState.lists, watchlistsState.activeListId]
  );
  const watchlistSymbols = React.useMemo(
    () => activeWatchlist?.symbols || [],
    [activeWatchlist]
  );

  // Derive favorite watchlists for quick-access bar (memoized)
  const favoriteWatchlists = React.useMemo(
    () => watchlistsState.lists.filter(wl => wl.isFavorite),
    [watchlistsState.lists]
  );

  // Create a stable key for symbol SET (ignores order and section markers, only changes on add/remove symbols)
  // This prevents full reload when just reordering or adding sections
  const watchlistSymbolsKey = React.useMemo(() => {
    const symbolSet = watchlistSymbols
      // Filter out section markers
      .filter(s => !(typeof s === 'string' && s.startsWith('###')))
      // Use composite key (symbol-exchange) to properly detect new symbols from different exchanges
      .map(s => typeof s === 'string' ? `${s}-NSE` : `${s.symbol}-${s.exchange || 'NSE'}`)
      .sort()
      .join(',');
    return `${watchlistsState.activeListId}:${symbolSet}`;
  }, [watchlistSymbols, watchlistsState.activeListId]);

  const [watchlistData, setWatchlistData] = useState([]);
  const [watchlistLoading, setWatchlistLoading] = useState(true);

  // Watchlist handlers from custom hook
  const {
    handleWatchlistReorder,
    handleCreateWatchlist,
    handleRenameWatchlist,
    handleDeleteWatchlist,
    handleSwitchWatchlist,
    handleToggleWatchlistFavorite,
    handleClearWatchlist,
    handleCopyWatchlist,
    handleExportWatchlist,
    handleImportWatchlist,
    handleAddSection,
    handleToggleSection,
    handleRenameSection,
    handleDeleteSection
  } = useWatchlistHandlers({
    setWatchlistsState,
    setWatchlistData,
    watchlistsState,
    showToast
  });

  // Indicator handlers extracted to hook
  const {
    updateIndicatorSettings,
    handleAddIndicator,
    handleIndicatorRemove,
    handleIndicatorVisibilityToggle,
    handleIndicatorSettings
  } = useIndicatorHandlers({
    setCharts,
    activeChartId
  });

  // Symbol handlers extracted to hook
  const {
    handleSymbolChange,
    handleRemoveFromWatchlist,
    handleAddClick,
    handleSymbolClick,
    handleCompareClick
  } = useSymbolHandlers({
    searchMode,
    setCharts,
    activeChartId,
    watchlistSymbols,
    setWatchlistsState,
    setIsSearchOpen,
    setSearchMode
  });

  // Layout handlers extracted to hook
  const {
    handleLayoutChange,
    handleMaximizeChart,
    handleSaveLayout
  } = useLayoutHandlers({
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
    showToast
  });

  // Alert handlers extracted to hook
  const {
    handleAlertClick,
    handleSaveAlert,
    handleRemoveAlert,
    handleRestartAlert,
    handlePauseAlert,
    handleChartAlertsSync,
    handleChartAlertTriggered
  } = useAlertHandlers({
    chartRefs,
    activeChartId,
    setAlertPrice,
    setIsAlertOpen,
    showToast,
    currentSymbol,
    currentExchange,
    alerts,
    setAlerts,
    skipNextSyncRef,
    setAlertLogs,
    setUnreadAlertCount
  });

  // Tool handlers extracted to hook
  const {
    toggleDrawingToolbar,
    handleToolChange,
    handleToolUsed,
    handleUndo,
    handleRedo,
    handleDownloadImage,
    handleCopyImage,
    handleFullScreen,
    handleReplayClick,
    handleReplayModeChange
  } = useToolHandlers({
    chartRefs,
    activeChartId,
    setActiveTool,
    setIsMagnetMode,
    setIsDrawingsHidden,
    setIsDrawingsLocked,
    setIsTimerVisible,
    setShowDrawingToolbar,
    setIsReplayMode,
    currentSymbol,
    showToast,
    showSnapshotToast
  });

  // UI handlers extracted to hook
  const {
    handleRightPanelToggle,
    handleSettingsClick,
    handleTemplatesClick,
    handleChartTemplatesClick,
    handleLoadChartTemplate,
    getCurrentChartConfig,
    handleOptionChainClick,
    handleOptionSelect,
    handleOpenOptionChainForSymbol,
    handleLoadTemplate,
    handleTimerToggle,
    handleSessionBreakToggle,
    handleChartAppearanceChange,
    handleResetChartAppearance,
    handleDrawingPropertyChange,
    handleResetDrawingDefaults,
    handleResetChart,
    handleApiKeySaveFromSettings,
    handleWebsocketUrlSave,
    handleHostUrlSave,
    handleUsernameSave
  } = useUIHandlers({
    setActiveRightPanel,
    setUnreadAlertCount,
    setIsSettingsOpen,
    setIsTemplateDialogOpen,
    setIsChartTemplatesOpen,
    setIsOptionChainOpen,
    setOptionChainInitialSymbol,
    setChartType,
    setCharts,
    activeChartId,
    activeChart,
    chartType,
    chartAppearance,
    setChartAppearance,
    setLayout,
    setActiveChartId,
    setTheme,
    setIsTimerVisible,
    setIsSessionBreakVisible,
    setDrawingDefaults,
    setApiKey,
    setWebsocketUrl,
    setHostUrl,
    setOpenalgoUsername,
    showToast
  });

  // Ref to store current watchlist symbols - fixes stale closure in WebSocket callback
  const watchlistSymbolsRef = useRef([]);

  // Ref to track active chart symbol/exchange for background alert popup logic
  const activeChartRef = useRef({ symbol: '', exchange: 'NSE' });

  // Keep refs updated
  useEffect(() => {
    watchlistSymbolsRef.current = watchlistSymbols;
  }, [watchlistSymbols]);

  useEffect(() => {
    activeChartRef.current = { symbol: currentSymbol, exchange: currentExchange };
  }, [currentSymbol, currentExchange]);

  // Initialize TimeService on app mount - syncs time with WorldTimeAPI
  // Cleanup on unmount to prevent memory leak from orphaned interval
  useEffect(() => {
    initTimeService();
    return () => destroyTimeService();
  }, []);

  // Persist multiple watchlists
  useEffect(() => {
    try {
      localStorage.setItem('tv_watchlists', JSON.stringify(watchlistsState));
    } catch (error) {
      console.error('Failed to persist watchlists:', error);
    }
  }, [watchlistsState]);

  // Track previous symbols for incremental updates
  const prevSymbolsRef = React.useRef(null);
  const lastActiveListIdRef = React.useRef(null);
  // Track fetch state to prevent race condition where second effect run aborts first run's requests
  const watchlistFetchingRef = React.useRef(false);

  // Track previous prices for alert crossing detection (key: "SYMBOL:EXCHANGE", value: last price)
  const alertPricesRef = React.useRef(new Map());

  // Helper to play alert alarm sound
  const playAlertSound = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = 'square';
      oscillator.frequency.value = 2048; // ~2kHz sharp alarm pitch

      const now = ctx.currentTime;

      // 3 seconds: beep ON 150ms → OFF 150ms repeating = 10 pulses
      for (let i = 0; i < 10; i++) {
        const t = now + i * 0.30;
        gainNode.gain.setValueAtTime(1.0, t);       // beep
        gainNode.gain.setValueAtTime(0.0, t + 0.15); // off pause
      }

      oscillator.start(now);
      oscillator.stop(now + 3.1);

      oscillator.onended = () => ctx.close();
    } catch (error) {
      console.error('Alert sound failed:', error);
    }
  }, []);

  // Helper to get all symbols with active alerts from localStorage
  const getAlertSymbols = useCallback(() => {
    try {
      const chartAlertsStr = localStorage.getItem('tv_chart_alerts');
      if (!chartAlertsStr) return [];

      const chartAlertsData = JSON.parse(chartAlertsStr);
      const alertSymbols = [];

      for (const [key, alerts] of Object.entries(chartAlertsData)) {
        // Key is in format "SYMBOL:EXCHANGE"
        if (!Array.isArray(alerts)) continue;
        const hasActiveAlert = alerts.some(a => a && a.price && !a.triggered);
        if (hasActiveAlert) {
          const [symbol, exchange] = key.split(':');
          alertSymbols.push({ symbol, exchange: exchange || 'NSE' });
        }
      }

      return alertSymbols;
    } catch (err) {
      console.warn('[Alerts] Failed to get alert symbols:', err);
      return [];
    }
  }, []);

  // Fetch watchlist data - only when authenticated (with incremental updates)
  useEffect(() => {
    // DIAGNOSTIC - force console output (logger.debug may be suppressed)
    console.log('=== WATCHLIST EFFECT ===');
    console.log('isAuthenticated:', isAuthenticated);
    console.log('watchlistSymbols count:', watchlistSymbols.length);
    console.log('watchlistSymbolsKey:', watchlistSymbolsKey);

    logger.debug('[Watchlist Effect] Running, isAuthenticated:', isAuthenticated);

    // Don't fetch if not authenticated yet
    if (isAuthenticated !== true) {
      console.log('=== SKIPPING - NOT AUTHENTICATED ===');
      logger.debug('[Watchlist Effect] Skipping - not authenticated');
      setWatchlistLoading(false);
      return;
    }

    // Skip if a fetch is already in progress (prevents race condition)
    if (watchlistFetchingRef.current) {
      logger.debug('[Watchlist Effect] Skipping - fetch already in progress');
      return;
    }

    let ws = null;
    let mounted = true;
    let initialDataLoaded = false;
    const abortController = new AbortController();

    // Extract actual symbols (not section markers) as composite keys for proper tracking
    // Use symbol-exchange composite key to handle same symbol from different exchanges
    const currentSymbolKeys = watchlistSymbols
      .filter(s => !(typeof s === 'string' && s.startsWith('###')))
      .map(s => {
        if (typeof s === 'string') return `${s}-NSE`; // Legacy string format defaults to NSE
        return `${s.symbol}-${s.exchange || 'NSE'}`;
      });

    logger.debug('[Watchlist Effect] currentSymbolKeys:', currentSymbolKeys);

    const currentSymbolsSet = new Set(currentSymbolKeys);
    const prevSymbolsSet = new Set(prevSymbolsRef.current || []);

    // Check if this is a watchlist switch (different list ID)
    const isListSwitch = lastActiveListIdRef.current !== watchlistsState.activeListId;
    const isInitialLoad = prevSymbolsRef.current === null;

    logger.debug('[Watchlist Effect] isInitialLoad:', isInitialLoad, 'isListSwitch:', isListSwitch);

    // Detect added and removed symbol keys (composite: symbol-exchange)
    const addedSymbolKeys = currentSymbolKeys.filter(s => !prevSymbolsSet.has(s));
    const removedSymbolKeys = (prevSymbolsRef.current || []).filter(s => !currentSymbolsSet.has(s));

    // Update refs for next time
    prevSymbolsRef.current = currentSymbolKeys;
    lastActiveListIdRef.current = watchlistsState.activeListId;

    // Helper to fetch a symbol's data
    const fetchSymbol = async (symObj) => {
      // If symObj is a string, look up the full object from watchlistSymbols to get exchange
      let symbol, exchange;
      if (typeof symObj === 'string') {
        const fullSymbolObj = watchlistSymbols.find(s =>
          (typeof s === 'string' ? s : s.symbol) === symObj
        );
        symbol = symObj;
        exchange = (fullSymbolObj && typeof fullSymbolObj === 'object')
          ? (fullSymbolObj.exchange || 'NSE')
          : 'NSE';
      } else {
        symbol = symObj.symbol;
        exchange = symObj.exchange || 'NSE';
      }

      const data = await getTickerPrice(symbol, exchange, abortController.signal);
      if (data && mounted) {
        return {
          symbol, exchange,
          last: parseFloat(data.lastPrice).toFixed(2),
          open: data.open || 0,
          chg: parseFloat(data.priceChange).toFixed(2),
          chgP: parseFloat(data.priceChangePercent).toFixed(2) + '%',
          volume: data.volume || 0,
          up: parseFloat(data.priceChange) >= 0
        };
      }
      return null;
    };

    // Full reload function (for initial load or watchlist switch)
    const hydrateWatchlist = async () => {
      console.log('=== HYDRATE WATCHLIST CALLED ===');
      logger.debug('[Watchlist] hydrateWatchlist called');
      watchlistFetchingRef.current = true; // Mark fetch in progress
      setWatchlistLoading(true);
      try {
        const symbolObjs = watchlistSymbols.filter(s => !(typeof s === 'string' && s.startsWith('###')));
        console.log('symbolObjs to fetch:', symbolObjs.map(s => typeof s === 'string' ? s : s.symbol));
        logger.debug('[Watchlist] Processing symbols:', symbolObjs);

        // Show cached data immediately for instant UX
        const symbolsWithCachedData = symbolObjs
          .filter(s => typeof s === 'object' && s.last !== undefined && s.last !== '--')
          .map(s => ({
            symbol: s.symbol,
            exchange: s.exchange || 'NSE',
            last: s.last,
            chg: s.chg,
            chgP: s.chgP,
            up: s.up
          }));

        logger.debug('[Watchlist] Symbols with cached data:', symbolsWithCachedData.length);

        // Show cached data immediately (user sees something instantly)
        if (symbolsWithCachedData.length > 0 && mounted) {
          setWatchlistData(symbolsWithCachedData);
          setWatchlistLoading(false);
          initialDataLoaded = true;
          logger.debug('[Watchlist] Displayed cached data, now fetching fresh prices...');
        }

        // ALWAYS fetch fresh prices from API for ALL symbols
        console.log('Fetching fresh quotes for', symbolObjs.length, 'symbols');
        logger.debug('[Watchlist] Fetching fresh quotes for all', symbolObjs.length, 'symbols');
        const fetchPromises = symbolObjs.map(fetchSymbol);
        const results = await Promise.all(fetchPromises);
        const validResults = results.filter(r => r !== null);

        console.log('=== API RESULTS ===');
        console.log('Total results:', results.length, 'Valid results:', validResults.length);
        console.log('Sample result:', validResults[0]);
        logger.debug('[Watchlist] Fresh quotes received:', validResults.length);

        if (mounted && validResults.length > 0) {
          // Replace cached data with fresh data
          console.log('=== SETTING WATCHLIST DATA ===', validResults.length, 'items');
          setWatchlistData(validResults);
        }

        // Always set up WebSocket for real-time updates (even if REST API failed)
        // WebSocket can populate data when REST API is rate-limited
        if (mounted) {
          setWatchlistLoading(false);
          initialDataLoaded = true;

          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.close();
          }

          // === MERGE alert symbols with watchlist symbols ===
          // Get symbols with active alerts that aren't already in watchlist
          const alertSymbols = getAlertSymbols();
          const watchlistKeys = new Set(symbolObjs.map(s =>
            typeof s === 'string' ? `${s}:NSE` : `${s.symbol}:${s.exchange || 'NSE'}`
          ));

          const additionalAlertSymbols = alertSymbols.filter(as =>
            !watchlistKeys.has(`${as.symbol}:${as.exchange}`)
          );

          const allSymbolsToSubscribe = [...symbolObjs, ...additionalAlertSymbols];
          console.log('=== SETTING UP WEBSOCKET ===');
          console.log('Watchlist symbols:', symbolObjs.length);
          console.log('Additional alert symbols:', additionalAlertSymbols.length);
          console.log('Total subscribed:', allSymbolsToSubscribe.length);

          ws = subscribeToMultiTicker(allSymbolsToSubscribe, (ticker) => {
            if (!mounted || !initialDataLoaded) return;

            // === ALERT MONITORING: Check chart alerts with proper crossing detection ===
            try {
              const chartAlertsStr = localStorage.getItem('tv_chart_alerts');
              if (chartAlertsStr) {
                const chartAlertsData = JSON.parse(chartAlertsStr);
                const alertKey = `${ticker.symbol}:${ticker.exchange || 'NSE'}`;
                const symbolAlerts = chartAlertsData[alertKey] || [];

                const currentPrice = parseFloat(ticker.last);
                if (!Number.isFinite(currentPrice)) return;

                // Get previous price for this symbol (for crossing detection)
                const prevPrice = alertPricesRef.current.get(alertKey);
                alertPricesRef.current.set(alertKey, currentPrice);

                // Skip first tick (no previous price to compare)
                if (prevPrice === undefined) return;

                for (const alert of symbolAlerts) {
                  if (!alert.price || alert.triggered) continue;

                  const alertPrice = parseFloat(alert.price);
                  if (!Number.isFinite(alertPrice)) continue;

                  const condition = alert.condition || 'crossing';
                  let triggered = false;
                  let direction = '';

                  // Proper crossing detection
                  const crossedUp = prevPrice < alertPrice && currentPrice >= alertPrice;
                  const crossedDown = prevPrice > alertPrice && currentPrice <= alertPrice;

                  if (condition === 'crossing') {
                    triggered = crossedUp || crossedDown;
                    direction = crossedUp ? 'up' : 'down';
                  } else if (condition === 'crossing_up') {
                    triggered = crossedUp;
                    direction = 'up';
                  } else if (condition === 'crossing_down') {
                    triggered = crossedDown;
                    direction = 'down';
                  }

                  if (triggered) {
                    console.log('[Alerts] TRIGGERED:', ticker.symbol, 'crossed', direction, 'at', currentPrice, 'target:', alertPrice);

                    // Mark as triggered in localStorage
                    alert.triggered = true;
                    chartAlertsData[alertKey] = symbolAlerts;
                    localStorage.setItem('tv_chart_alerts', JSON.stringify(chartAlertsData));

                    // Play alarm sound
                    playAlertSound();

                    // Only show GlobalAlertPopup if NOT on the same chart
                    // (Chart's own AlertNotification handles same-chart alerts)
                    const isOnCurrentChart =
                      ticker.symbol === activeChartRef.current.symbol &&
                      (ticker.exchange || 'NSE') === activeChartRef.current.exchange;

                    if (!isOnCurrentChart) {
                      // Add to global alert popup (for background alerts)
                      setGlobalAlertPopups(prev => [{
                        id: `popup-${Date.now()}-${alert.id}`,
                        alertId: alert.id,
                        symbol: ticker.symbol,
                        exchange: ticker.exchange || 'NSE',
                        price: alertPrice.toFixed(2),
                        direction: direction,
                        timestamp: Date.now()
                      }, ...prev].slice(0, 5)); // Max 5 popups
                    }

                    // Log entry
                    setAlertLogs(prev => [{
                      id: Date.now(),
                      alertId: alert.id,
                      symbol: ticker.symbol,
                      exchange: ticker.exchange || 'NSE',
                      message: `Alert: ${ticker.symbol} crossed ${direction} ${alertPrice.toFixed(2)}`,
                      time: new Date().toISOString()
                    }, ...prev]);
                    setUnreadAlertCount(prev => prev + 1);
                  }
                }
              }
            } catch (err) {
              // Silent fail for alert check
            }

            // === Original watchlist update logic ===
            setWatchlistData(prev => {
              // Match by both symbol AND exchange for correct updates
              const tickerExchange = ticker.exchange || 'NSE';
              const index = prev.findIndex(item =>
                item.symbol === ticker.symbol && item.exchange === tickerExchange
              );
              if (index !== -1) {
                const newData = [...prev];
                newData[index] = {
                  ...newData[index],
                  last: ticker.last.toFixed(2),
                  open: ticker.open,
                  volume: ticker.volume,
                  chg: ticker.chg.toFixed(2),
                  chgP: ticker.chgP.toFixed(2) + '%',
                  up: ticker.chg >= 0
                };
                return newData;
              }
              // Fallback: Create item from WebSocket data if quotes API failed
              // Use ref to avoid stale closure - watchlistSymbols changes but callback stays same
              // Match by both symbol AND exchange
              const symbolData = watchlistSymbolsRef.current.find(s => {
                if (typeof s === 'string') return s === ticker.symbol;
                return s.symbol === ticker.symbol && s.exchange === tickerExchange;
              });
              if (symbolData) {
                console.log('=== WEBSOCKET FALLBACK: Adding', ticker.symbol, '===');
                return [...prev, {
                  symbol: ticker.symbol,
                  exchange: tickerExchange,
                  last: ticker.last.toFixed(2),
                  open: ticker.open,
                  volume: ticker.volume,
                  chg: ticker.chg.toFixed(2),
                  chgP: ticker.chgP.toFixed(2) + '%',
                  up: ticker.chg >= 0
                }];
              }
              return prev;
            });
          });
        }
      } catch (error) {
        // Ignore abort errors - they're expected when effect re-runs
        if (error.name === 'AbortError') {
          logger.debug('[Watchlist] Fetch aborted (expected during navigation)');
        } else {
          console.error('Error fetching watchlist data:', error);
          if (mounted) {
            showToast('Failed to load watchlist data', 'error');
            setWatchlistLoading(false);
            initialDataLoaded = true;
          }
        }
      } finally {
        watchlistFetchingRef.current = false; // Clear fetch in progress flag
      }
    };

    // Incremental update for adding symbols (no full reload)
    const hydrateAddedSymbols = async () => {
      // Match watchlist symbols against addedSymbolKeys (which are in format "SYMBOL-EXCHANGE")
      const addedSymbolObjs = watchlistSymbols.filter(symObj => {
        if (typeof symObj === 'string' && symObj.startsWith('###')) return false;
        // Create composite key for this symbol object
        const key = typeof symObj === 'string'
          ? `${symObj}-NSE`
          : `${symObj.symbol}-${symObj.exchange || 'NSE'}`;
        return addedSymbolKeys.includes(key);
      });

      const promises = addedSymbolObjs.map(fetchSymbol);
      const results = await Promise.all(promises);
      const validResults = results.filter(r => r !== null);

      if (mounted && validResults.length > 0) {
        setWatchlistData(prev => [...prev, ...validResults]);
      }
    };

    // Decide update strategy
    // Note: watchlistData.length === 0 check handles React strict mode double-invocation
    // where first effect's cleanup aborts requests before they complete
    const needsFullReload = isInitialLoad || isListSwitch || (currentSymbolKeys.length > 0 && watchlistData.length === 0);

    console.log('=== UPDATE STRATEGY ===');
    console.log('isInitialLoad:', isInitialLoad, 'isListSwitch:', isListSwitch);
    console.log('watchlistData.length:', watchlistData.length, 'currentSymbolKeys.length:', currentSymbolKeys.length);
    console.log('needsFullReload:', needsFullReload);
    console.log('addedSymbolKeys:', addedSymbolKeys.length, 'removedSymbolKeys:', removedSymbolKeys.length);

    if (needsFullReload) {
      // Full reload for initial load, watchlist switch, or empty data
      console.log('>>> Calling hydrateWatchlist()');
      hydrateWatchlist();
    } else if (removedSymbolKeys.length > 0 || addedSymbolKeys.length > 0) {
      // Incremental update
      if (removedSymbolKeys.length > 0) {
        // Parse composite keys to filter out removed items
        setWatchlistData(prev => prev.filter(item => {
          const itemKey = `${item.symbol}-${item.exchange || 'NSE'}`;
          return !removedSymbolKeys.includes(itemKey);
        }));
      }
      if (addedSymbolKeys.length > 0) {
        hydrateAddedSymbols();
      }
    }
    // If no changes (just reorder or sections), do nothing

    return () => {
      // Always cleanup previous effect - new effect will start fresh
      // Each effect has its own mounted/abortController, so this is safe
      mounted = false;
      abortController.abort();
      watchlistFetchingRef.current = false;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchlistSymbolsKey, watchlistsState.activeListId, isAuthenticated]);

  // Persist alerts/logs to localStorage with 24h retention
  useEffect(() => {
    const cutoff = Date.now() - ALERT_RETENTION_MS;
    const filtered = alerts.filter(a => {
      const ts = a && a.created_at ? new Date(a.created_at).getTime() : NaN;
      return Number.isFinite(ts) && ts >= cutoff;
    });

    if (filtered.length !== alerts.length) {
      setAlerts(filtered);
      return; // avoid persisting stale data in this pass
    }

    try {
      localStorage.setItem('tv_alerts', JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to persist alerts:', error);
    }
  }, [alerts]);

  useEffect(() => {
    const cutoff = Date.now() - ALERT_RETENTION_MS;
    const filtered = alertLogs.filter(l => {
      const ts = l && l.time ? new Date(l.time).getTime() : NaN;
      return Number.isFinite(ts) && ts >= cutoff;
    });

    if (filtered.length !== alertLogs.length) {
      setAlertLogs(filtered);
      return;
    }

    try {
      localStorage.setItem('tv_alert_logs', JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to persist alert logs:', error);
    }
  }, [alertLogs]);

  // Check Alerts Logic (only for non line-tools alerts to avoid conflicting with plugin)
  // Uses alertsRef to check current alerts without triggering reconnections
  const alertSymbolsRef = React.useRef([]);

  // Update symbol list when alerts change, but only if symbols actually changed
  useEffect(() => {
    const activeNonLineToolAlerts = alerts.filter(a => a.status === 'Active' && a._source !== 'lineTools');
    const newSymbols = [...new Set(activeNonLineToolAlerts.map(a => a.symbol))].sort();
    const currentSymbols = alertSymbolsRef.current;

    // Only update ref if symbol list actually changed
    if (JSON.stringify(newSymbols) !== JSON.stringify(currentSymbols)) {
      alertSymbolsRef.current = newSymbols;
    }
  }, [alerts]);

  // Separate effect for WebSocket - only reconnects when symbols actually change
  // === ALERT WEBSOCKET DISABLED ===
  // Alert monitoring is now handled by the watchlist WebSocket (above)
  // to avoid creating a second connection which conflicts with OpenAlgo.
  // The watchlist callback checks tv_chart_alerts localStorage on each price update.
  //
  // const [alertWsSymbols, setAlertWsSymbols] = useState([]);
  // useEffect(() => { ... interval for alertWsSymbols ... });
  // useEffect(() => { subscribeToMultiTicker(alertWsSymbols, ...) });

  // Watchlist handlers are now provided by useWatchlistHandlers hook
  // Symbol handlers are now provided by useSymbolHandlers hook

  const toggleIndicator = (name) => {
    setCharts(prev => prev.map(chart => {
      if (chart.id !== activeChartId) return chart;

      const currentIndicator = chart.indicators[name];

      // All indicators are now objects with 'enabled' property
      if (typeof currentIndicator === 'object' && currentIndicator !== null) {
        return {
          ...chart,
          indicators: {
            ...chart.indicators,
            [name]: { ...currentIndicator, enabled: !currentIndicator.enabled }
          }
        };
      }

      return chart;
    }));
  };

  // Indicator handlers are now provided by useIndicatorHandlers hook

  // Check if properties panel should be visible
  const isDrawingPanelVisible = activeTool && DRAWING_TOOLS.includes(activeTool);


  // Command Palette (Cmd+K / Ctrl+K)
  const commandPaletteHandlers = React.useMemo(() => ({
    onChartTypeChange: setChartType,
    toggleIndicator,
    onToolChange: handleToolChange,
    openSymbolSearch: (mode) => {
      setSearchMode(mode);
      setIsSearchOpen(true);
    },
    openSettings: () => setIsSettingsOpen(true),
    openShortcutsDialog: () => setIsShortcutsDialogOpen(true),
    onUndo: handleUndo,
    onRedo: handleRedo,
    toggleTheme,
    setTheme,
    toggleFullscreen: handleFullScreen,
    takeScreenshot: handleDownloadImage,
    copyImage: handleCopyImage,
    createAlert: handleAlertClick,
    clearDrawings: () => handleToolChange('clear_all'),
    resetChart: handleResetChart,
  }), [toggleIndicator, handleToolChange, handleUndo, handleRedo, toggleTheme, setTheme, handleFullScreen, handleDownloadImage, handleCopyImage, handleAlertClick, handleResetChart, setChartType, setSearchMode, setIsSearchOpen, setIsSettingsOpen, setIsShortcutsDialogOpen]);

  const {
    commands,
    recentCommands,
    groupedCommands,
    searchCommands,
    executeCommand,
  } = useCommandPalette(commandPaletteHandlers);

  // Chart type map for keyboard shortcuts (1-7)
  const CHART_TYPE_MAP = {
    'Candlestick': 'candlestick',
    'Bar': 'bar',
    'Hollow candles': 'hollow',
    'Line': 'line',
    'Area': 'area',
    'Baseline': 'baseline',
    'Heikin Ashi': 'heikinashi',
  };

  // Global keyboard shortcut handlers
  const shortcutHandlers = React.useMemo(() => ({
    openCommandPalette: () => setIsCommandPaletteOpen(prev => !prev),
    openShortcutsHelp: () => setIsShortcutsDialogOpen(prev => !prev),
    openSymbolSearch: () => {
      setSearchMode('switch');
      setIsSearchOpen(true);
    },
    openSymbolSearchWithKey: (key) => {
      setInitialSearchValue(key.toUpperCase());
      setSearchMode('switch');
      setIsSearchOpen(true);
    },
    closeDialog: () => {
      // Close any open dialog in priority order
      if (isShortcutsDialogOpen) setIsShortcutsDialogOpen(false);
      else if (isCommandPaletteOpen) setIsCommandPaletteOpen(false);
      else if (isSearchOpen) setIsSearchOpen(false);
      else if (isAlertOpen) setIsAlertOpen(false);
      else if (isSettingsOpen) setIsSettingsOpen(false);
      else if (isTemplateDialogOpen) setIsTemplateDialogOpen(false);
    },
    setChartType: (chartTypeName) => {
      const mappedType = CHART_TYPE_MAP[chartTypeName];
      if (mappedType) setChartType(mappedType);
    },
    activateDrawMode: () => {
      // Activate the first drawing tool (TrendLine)
      handleToolChange('TrendLine');
    },
    activateCursorMode: () => {
      setActiveTool(null);
    },
    zoomIn: () => {
      const activeRef = chartRefs.current[activeChartId];
      if (activeRef && typeof activeRef.zoomIn === 'function') {
        activeRef.zoomIn();
      }
    },
    zoomOut: () => {
      const activeRef = chartRefs.current[activeChartId];
      if (activeRef && typeof activeRef.zoomOut === 'function') {
        activeRef.zoomOut();
      }
    },
    undo: handleUndo,
    redo: handleRedo,
    createAlert: handleAlertClick,
    toggleFullscreen: handleFullScreen,
  }), [
    isShortcutsDialogOpen, isCommandPaletteOpen, isSearchOpen, isAlertOpen, isSettingsOpen, isTemplateDialogOpen,
    handleToolChange, handleUndo, handleRedo, handleAlertClick, handleFullScreen, activeChartId
  ]);

  // Determine if any dialog is open (to disable single-key shortcuts)
  const anyDialogOpen = isCommandPaletteOpen || isSearchOpen || isAlertOpen || isSettingsOpen || isTemplateDialogOpen || isShortcutsDialogOpen;

  // Apply global keyboard shortcuts
  useGlobalShortcuts(shortcutHandlers, {
    enabled: isAuthenticated === true,
    dialogOpen: anyDialogOpen,
  });

  // Note: isWorkspaceLoaded check is no longer needed here
  // AppContent only mounts after App wrapper confirms cloud sync is complete

  // Show loading state while checking auth
  if (isAuthenticated === null) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: 'var(--tv-color-platform-background)',
        color: 'var(--tv-color-text-primary)'
      }}>
        <div style={{ fontSize: '18px', marginBottom: '10px' }}>Connecting to OpenAlgo...</div>
        <div style={{ fontSize: '14px', color: 'var(--tv-color-text-secondary)' }}>Checking authentication</div>
      </div>
    );
  }

  // If not authenticated, show API key dialog
  if (isAuthenticated === false) {
    const handleApiKeySave = (newApiKey) => {
      localStorage.setItem('oa_apikey', newApiKey);
      // Also update the apiKey state so Settings dialog reflects the entered key
      setApiKey(newApiKey);
      // Update hostUrl state from localStorage (set by ApiKeyDialog.handleSubmit)
      const savedHostUrl = localStorage.getItem('oa_host_url');
      if (savedHostUrl) {
        setHostUrl(savedHostUrl);
      }
      setIsAuthenticated(true);
    };

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: 'var(--tv-color-platform-background)',
        color: 'var(--tv-color-text-primary)'
      }}>
        <ApiKeyDialog
          onSave={handleApiKeySave}
          onClose={() => { }}
        />
      </div>
    );
  }

  return (
    <>
      <DashboardLayout
        {...{
          showDrawingToolbar,
          isMobile,
          isWatchlistVisible,
          setIsWatchlistVisible,
          isAccountPanelOpen,
          setIsAccountPanelOpen,
          isAccountPanelMinimized,
          isAccountPanelMaximized,
          handleAccountPanelMinimize,
          handleAccountPanelMaximize,

          theme,
          toggleTheme,

          onToggleLogScale: () => setIsLogScale(!isLogScale),
          onToggleAutoScale: () => setIsAutoScale(!isAutoScale),
          onResetZoom: () => {
            const activeRef = chartRefs.current[activeChartId];
            if (activeRef) activeRef.resetZoom();
          },
          onTimeRangeChange: (range, interval) => {
            setCurrentTimeRange(range);
            if (interval) handleIntervalChange(interval);
          },
          timezone: 'UTC+5:30',

          charts,
          setCharts,
          activeChartId,
          setActiveChartId,
          layout,
          chartType,
          setChartType,
          activeChart,
          chartRefs,
          currentSymbol,
          currentInterval,

          favoriteIntervals,
          customIntervals,
          lastNonFavoriteInterval,
          handleIntervalChange,
          handleToggleFavorite,
          handleAddCustomInterval,
          handleRemoveCustomInterval,

          activeTool,
          isMagnetMode,
          handleToolChange,
          handleToolUsed,
          isDrawingsLocked,
          isDrawingsHidden,
          isDrawingPanelVisible,
          toggleDrawingToolbar,
          handleUndo,
          handleRedo,
          drawingDefaults,
          handleDrawingPropertyChange,
          handleResetDrawingDefaults,

          isTimerVisible,
          isSessionBreakVisible,

          isLogScale,
          isAutoScale,
          chartAppearance,
          handleChartAppearanceChange,
          handleResetChartAppearance,
          currentTimeRange,

          oiLines,
          showOILines,

          activeOrders,
          activePositions,
          allPositions,
          allOrders,
          holdings,
          trades,
          funds,
          handleModifyOrder,
          handleCancelOrder,

          handleAddIndicator,
          handleIndicatorRemove,
          handleIndicatorVisibilityToggle,
          handleIndicatorSettings,

          alerts,
          alertLogs,
          unreadAlertCount,
          globalAlertPopups,
          isAlertOpen,
          setIsAlertOpen,
          alertPrice,
          setAlertPrice,
          handleAlertClick,
          handleSaveAlert,
          handleRemoveAlert,
          handleRestartAlert,
          handlePauseAlert,
          handleChartAlertsSync,
          handleChartAlertTriggered,
          liveDrawings,
          onDrawingsSync: handleDrawingsSync,
          dismissGlobalAlertPopup: (alertId) => setGlobalAlertPopups(prev => prev.filter(a => a.id !== alertId)),
          clearUnreadAlertCount: () => setUnreadAlertCount(0),

          watchlistsState,
          activeWatchlist,
          watchlistSymbols,
          watchlistData,
          watchlistLoading,
          handleCreateWatchlist,
          handleRenameWatchlist,
          handleDeleteWatchlist,
          handleSwitchWatchlist,
          handleToggleWatchlistFavorite,
          handleClearWatchlist,
          handleCopyWatchlist,
          handleImportWatchlist,
          handleExportWatchlist,
          handleAddSection,
          handleToggleSection,
          handleRenameSection,
          handleDeleteSection,
          handleWatchlistReorder,
          handleRemoveFromWatchlist,
          favoriteWatchlists,

          isSearchOpen,
          setIsSearchOpen,
          searchMode,
          setSearchMode,
          initialSearchValue,
          setInitialSearchValue,
          handleSymbolChange,
          handleSymbolClick,
          handleCompareClick,

          handleDownloadImage,
          handleCopyImage,
          handleFullScreen,

          handleReplayClick,
          isReplayMode,
          handleReplayModeChange,

          handleLayoutChange,
          handleSaveLayout,
          handleMaximizeChart,

          activeRightPanel,
          handleRightPanelToggle,

          mobileTab,
          handleMobileTabChange,

          isSettingsOpen,
          setIsSettingsOpen,
          handleSettingsClick,
          websocketUrl,
          handleWebsocketUrlSave,
          apiKey,
          handleApiKeySave: handleApiKeySaveFromSettings,
          hostUrl,
          handleHostUrlSave,
          openalgoUsername,
          handleUsernameSave,
          handleTimerToggle,
          handleSessionBreakToggle,

          isTemplateDialogOpen,
          setIsTemplateDialogOpen,
          handleTemplatesClick,
          handleLoadTemplate,

          isChartTemplatesOpen,
          setIsChartTemplatesOpen,
          handleChartTemplatesClick,
          getCurrentChartConfig,
          handleLoadChartTemplate,

          isShortcutsDialogOpen,
          setIsShortcutsDialogOpen,

          isCommandPaletteOpen,
          setIsCommandPaletteOpen,
          commands,
          recentCommands,
          groupedCommands,
          searchCommands,
          executeCommand,

          isOptionChainOpen,
          setIsOptionChainOpen,
          optionChainInitialSymbol,
          setOptionChainInitialSymbol,
          handleOpenOptionChainForSymbol,
          handleOptionSelect,

          isStraddlePickerOpen,
          setIsStraddlePickerOpen,

          isSectorHeatmapOpen,
          setIsSectorHeatmapOpen,
          positionTrackerSettings,
          setPositionTrackerSettings,

          isIndicatorSettingsOpen,
          setIsIndicatorSettingsOpen,

          toasts,
          removeToast,
          showToast,
          snapshotToast,
          setSnapshotToast,

          isAuthenticated,

          annScannerState,
          setAnnScannerState,
          onStartAnnScan: startAnnScan,
          onCancelAnnScan: cancelAnnScan,
          onAddToWatchlist: (symbolData) => {
            const { symbol, exchange } = symbolData;
            const existsInWatchlist = watchlistSymbols.some(s => {
              if (typeof s === 'string') return s === symbol;
              return s.symbol === symbol && s.exchange === exchange;
            });
            if (!existsInWatchlist) {
              setWatchlistsState(prev => ({
                ...prev,
                lists: prev.lists.map(wl =>
                  wl.id === prev.activeListId
                    ? { ...wl, symbols: [...wl.symbols, { symbol, exchange: exchange || 'NSE' }] }
                    : wl
                ),
              }));
            }
          }
        }}
      />
    </>
  );
}

// AppWrapper - handles auth and cloud sync BEFORE mounting AppContent
// This ensures React state initializers see the cloud data in localStorage
function App() {
  const { isAuthenticated, setIsAuthenticated } = useUser();

  // Cloud Workspace Sync - blocks until cloud data is fetched or 5s timeout
  // syncKey changes when cloud data is applied, forcing AppContent remount
  const { isLoaded: isWorkspaceLoaded, syncKey } = useCloudWorkspaceSync(isAuthenticated);

  // Show loader while checking auth or loading cloud data
  if (!isWorkspaceLoaded) {
    return <WorkspaceLoader />;
  }

  // Now mount AppContent - localStorage is already updated with cloud data
  // Using syncKey as React key forces remount when cloud data is applied after login
  return <AppContent key={syncKey} isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} />;
}

export default App;

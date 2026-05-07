import React, { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react';
import Layout from './components/Layout/Layout';
import Topbar from './components/Topbar/Topbar';
import DrawingToolbar from './components/Toolbar/DrawingToolbar';
import DrawingPropertiesPanel from './components/Toolbar/DrawingPropertiesPanel';
import Watchlist from './components/Watchlist/Watchlist';
import ChartComponent from './components/Chart/ChartComponent';
import SymbolSearch from './components/SymbolSearch/SymbolSearch';
import Toast from './components/Toast/Toast';
import SnapshotToast from './components/Toast/SnapshotToast';
// html2canvas is lazy loaded in useToolHandlers.ts when screenshot is taken
import { getTickerPrice, subscribeToMultiTicker, checkAuth, closeAllWebSockets, forceCloseAllWebSockets, saveUserPreferences, modifyOrder, cancelOrder, getKlines } from './services/openalgo';
import { globalAlertMonitor } from './services/globalAlertMonitor';

import BottomBar from './components/BottomBar/BottomBar';
import ChartGrid from './components/Chart/ChartGrid';
import AlertDialog from './components/Alert/AlertDialog';
import IndicatorAlertDialog from './components/IndicatorAlert/IndicatorAlertDialog';
import RightToolbar from './components/Toolbar/RightToolbar';
import AlertsPanel from './components/Alerts/AlertsPanel';
import ApiKeyDialog from './components/ApiKeyDialog/ApiKeyDialog';
import MobileNav from './components/MobileNav/MobileNav';
import LayoutTemplateDialog from './components/LayoutTemplates/LayoutTemplateDialog';
import { ConfirmDialog } from './components/shared';

// Lazy load heavy modal components for better initial load performance
const SettingsPopup = lazy(() => import('./components/Settings/SettingsPopup'));
const CommandPalette = lazy(() => import('./components/CommandPalette/CommandPalette'));
const ShortcutsDialog = lazy(() => import('./components/ShortcutsDialog/ShortcutsDialog'));
const OptionChainPicker = lazy(() => import('./components/OptionChainPicker/OptionChainPicker'));
const OptionChainModal = lazy(() => import('./components/OptionChainModal/OptionChainModal'));
import { initTimeService, destroyTimeService } from './services/timeService';
import { getJSON, setJSON, STORAGE_KEYS } from './services/storageService';
import logger from './utils/logger';
import { useWorkspaceStore } from './store/workspaceStore';
import { useIsMobile, useCommandPalette, useGlobalShortcuts } from './hooks';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useCloudWorkspaceSync } from './hooks/useCloudWorkspaceSync';
import { useOILines } from './hooks/useOILines';
import { useIndicatorHandlers } from './hooks/useIndicatorHandlers';
import { useIntervalHandlers } from './hooks/useIntervalHandlers';
import { useSymbolHandlers } from './hooks/useSymbolHandlers';
import { useLayoutHandlers } from './hooks/useLayoutHandlers';
import { useAlertHandlers } from './hooks/useAlertHandlers';
import { useToolHandlers } from './hooks/useToolHandlers';
import { useUIHandlers } from './hooks/useUIHandlers';
import { useIndicatorAlertHandlers } from './hooks/useIndicatorAlertHandlers';
import { useANNScanner } from './hooks/useANNScanner';
import { useToastManager } from './hooks/useToastManager';
import { useTheme } from './context/ThemeContext';
import { useUI } from './context/UIContext';
import { useAlert } from './context/AlertContext';
import { useUser } from './context/UserContext';
import { useWatchlist } from './context/WatchlistContext';
import { useWatchlistMonitor } from './context/WatchlistMonitorContext';
import { OrderProvider } from './context/OrderContext';
import { indicatorConfigs } from './components/IndicatorSettings/indicatorConfigs';
import { useChart } from './hooks/useChart';

import GlobalAlertPopup from './components/GlobalAlertPopup/GlobalAlertPopup';
import CompareOptionsDialog from './components/Chart/CompareOptionsDialog';

// Lazy load heavy components that are not needed on initial render
const PositionTracker = lazy(() => import('./components/PositionTracker/PositionTracker'));
const AccountPanel = lazy(() => import('./components/AccountPanel/AccountPanel'));
const TradingPanel = lazy(() => import('./components/TradingPanel/TradingPanel'));
const OrderEntryModal = lazy(() => import('./components/OrderEntryModal/OrderEntryModal'));
const ObjectTreePanel = lazy(() => import('./components/ObjectTree/ObjectTreePanel'));
const MarketScreenerPanel = lazy(() => import('./components/MarketScreener/MarketScreenerPanel'));

// Lazy load additional heavy components
const SectorHeatmapModal = lazy(() => import('./components/SectorHeatmap/SectorHeatmapModal'));
const DepthOfMarket = lazy(() => import('./components/DepthOfMarket/DepthOfMarket'));
const ANNScanner = lazy(() => import('./components/ANNScanner/ANNScanner'));
const TradefinderScanner = lazy(() => import('./components/TradefinderScanner/TradefinderScanner'));
const ChartTemplatesDialog = lazy(() => import('./components/ChartTemplates/ChartTemplatesDialog'));
const ShortcutsSettings = lazy(() => import('./components/ShortcutsSettings/ShortcutsSettings'));
const IndicatorSettingsDialog = lazy(() => import('./components/IndicatorSettings/IndicatorSettingsDialog'));
const PineScriptEditor = lazy(() => import('./components/PineEditor/PineScriptEditor'));
const FullScreener = lazy(() => import('./components/FullScreener/FullScreener'));
import {
  VALID_INTERVAL_UNITS,
  DEFAULT_FAVORITE_INTERVALS,
  isValidIntervalValue,
  sanitizeFavoriteIntervals,
  sanitizeCustomIntervals,
  safeParseJSON,
  ALERT_RETENTION_MS,
  DEFAULT_WATCHLIST,
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

  // Get state from workspace store with selectors for better reactivity
  const activeChartId = useWorkspaceStore(state => state.activeChartId);
  const charts = useWorkspaceStore(state => state.charts);
  const layout = useWorkspaceStore(state => state.layout);
  const setCharts = useWorkspaceStore(state => state.setCharts);
  const setActiveChartId = useWorkspaceStore(state => state.setActiveChartId);
  const setLayout = useWorkspaceStore(state => state.setLayout);
  const isSyncEnabled = useWorkspaceStore(state => state.isSyncEnabled);
  const syncOptions = useWorkspaceStore(state => state.syncOptions);

  // Multi-Chart State (Managed by useChart hook - ported from Context/Zustand)
  const {
    activeChart,
    // Derived properties
    currentSymbol,
    currentExchange,
    currentInterval,
    // Handlers
    updateSymbol,
    updateInterval,
    addIndicator,
    removeIndicator,
    toggleIndicatorVisibility,
    updateIndicatorSettings,
    chartRefs, // Access to the global chart refs map
    getChartRef,
    // Sync
    setIsSyncEnabled,
    setSyncOptions
  } = useChart();

  // UI Context - Modal visibility states (centralized in UIContext)
  const {
    isSearchOpen,
    setIsSearchOpen,
    searchMode,
    setSearchMode,
    initialSearchValue,
    setInitialSearchValue,
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    isTemplateDialogOpen,
    setIsTemplateDialogOpen,
    isShortcutsDialogOpen,
    setIsShortcutsDialogOpen,
    isChartTemplatesOpen,
    setIsChartTemplatesOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    isStraddlePickerOpen,
    setIsStraddlePickerOpen,
    isOptionChainOpen,
    setIsOptionChainOpen,
    optionChainInitialSymbol,
    setOptionChainInitialSymbol,
    isAlertOpen,
    setIsAlertOpen,
    isSectorHeatmapOpen,
    setIsSectorHeatmapOpen,
    isIndicatorSettingsOpen,
    setIsIndicatorSettingsOpen,
    activeRightPanel,
    setActiveRightPanel,
    closeAllModals,
    closeTopmostModal,
    hasOpenModal,
  } = useUI();

  const [isMaximized, setIsMaximized] = useState(false);
  const prevLayoutRef = useRef(null); // Keep this for layout restore logic

  // Active chart check
  // Note: activeChart is already derived in useChart, no need to memoize here again unless we need safe access

  // Refs
  // chartRefs is now provided by useChart. It is an object like { 1: ref, 2: ref }.
  // Existing code expects chartRefs.current[id]. 
  // IMPORTANT: useChart returns { chartRefs: { current: map } } to mimic ref object?
  // Let's check useChart implementation.
  // I implemented: chartRefs: { current: chartRefsMap }
  // So consuming code `chartRefs.current[id]` works.

  // Ref to track active chart symbol/exchange for background alert popup logic
  const activeChartRef = React.useRef({ symbol: currentSymbol, exchange: currentExchange });

  useEffect(() => {
    activeChartRef.current = { symbol: currentSymbol, exchange: currentExchange };
  }, [currentSymbol, currentExchange]);

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
      // Zustand handles persistence, but double check doesn't hurt, 
      // although Zustand persist middleware writes to localStorage automatically.
      // We can technically remove this useEffect if workspaceStore handles it.
      // workspaceStore DOES handle 'tv_saved_layout' via persist name 'openalgo-workspace-storage'.
      // Wait, 'openalgo-workspace-storage' is a NEW key.
      // The old key was 'tv_saved_layout'.
      // If I want to maintain compatibility or migrate, I left migration logic in workspaceStore.
      // So I should disable this manual save or update it to save to the new key?
      // Better to rely on the store's persistence.
      // I will Keep it for now to ensure 'tv_saved_layout' is updated for other tools? 
      // No, let's rely on store. I'll comment it out or remove it to avoid fighting.
    } catch (error) {
      console.error('Failed to auto-save layout:', error);
    }
  }, [layout, charts]);

  const [chartType, setChartType] = useState('candlestick');
  // Modal states (isSearchOpen, searchMode, etc.) are now from UIContext above

  // Compare options dialog state (unique to App.jsx)
  const [compareOptionsVisible, setCompareOptionsVisible] = useState(false);
  const [pendingComparisonSymbol, setPendingComparisonSymbol] = useState(null);

  // Multi-leg strategy chart state
  // strategyConfig is now per-chart, stored in charts[].strategyConfig

  // Toast management (extracted to hook for cleaner code)
  const { toasts, snapshotToast, showToast, removeToast, showSnapshotToast, clearSnapshotToast } = useToastManager(3);

  // Alert dialog state (isAlertOpen is now from UIContext)
  const [alertPrice, setAlertPrice] = useState(null);
  const [isIndicatorAlertOpen, setIsIndicatorAlertOpen] = useState(false);
  const [indicatorAlertToEdit, setIndicatorAlertToEdit] = useState(null);
  const [indicatorAlertInitialIndicator, setIndicatorAlertInitialIndicator] = useState(null);

  // Alert State - now from AlertContext (centralized with persistence)
  const {
    alerts,
    setAlerts,
    alertsRef,
    alertLogs,
    setAlertLogs,
    unreadAlertCount,
    setUnreadAlertCount,
    globalAlertPopups,
    setGlobalAlertPopups,
    alertPricesRef,
  } = useAlert();

  const { handleSaveIndicatorAlert } = useIndicatorAlertHandlers({
    setAlerts: setAlerts as any,
    showToast,
    setIsIndicatorAlertOpen,
    setIndicatorAlertToEdit: setIndicatorAlertToEdit as any,
    indicatorAlertToEdit: indicatorAlertToEdit as any
  });

  // === GlobalAlertMonitor ===
  // Background price monitoring using SharedWebSocket
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleBackgroundAlertTrigger = (evt) => {
      const msg = evt.message || `${evt.symbol} alert triggered`;
      showToast(msg, 'info');

      // Update logs
      setAlertLogs(prev => {
        const newLog = {
          id: evt.alertId || crypto.randomUUID(),
          time: new Date().toISOString(),
          message: msg,
          symbol: evt.symbol,
          price: evt.currentPrice,
          type: evt.alertType || 'price'
        };
        const updated = [newLog, ...prev].slice(0, 100); // Keep last 100
        localStorage.setItem('tv_alert_logs', JSON.stringify(updated));
        return updated;
      });

      setUnreadAlertCount(c => c + 1);

      // Add to popup queue for visual notification
      setGlobalAlertPopups(prev => [...prev, { ...evt, id: evt.alertId || crypto.randomUUID() }]);

      // Update alert status in React state (for indicator alerts)
      if (evt.alertType === 'indicator' && evt.alertId) {
        setAlerts(prev => prev.map(a =>
          a.id === evt.alertId ? { ...a, status: 'Triggered' } : a
        ));
      }
    };

    // Load alerts and start monitoring
    // Small delay to ensure other services are ready
    const timer = setTimeout(() => {
      globalAlertMonitor.start(handleBackgroundAlertTrigger);
    }, 1000);

    return () => {
      clearTimeout(timer);
      globalAlertMonitor.stop();
    };
  }, [isAuthenticated, showToast]);

  // Handler to share OHLC data with GlobalAlertMonitor for indicator alerts
  const handleOHLCDataUpdate = useCallback((symbol, exchange, interval, ohlcData) => {
    if (symbol && exchange && interval && ohlcData && Array.isArray(ohlcData) && ohlcData.length > 0) {
      globalAlertMonitor.updateOHLCData(symbol, exchange, interval, ohlcData);
    }
  }, []);

  // Mobile State
  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState<'chart' | 'watchlist' | 'alerts' | 'tools' | 'settings'>('chart');
  const [isWatchlistVisible, setIsWatchlistVisible] = useState(false);

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

  // Right Panel State (activeRightPanel now from UIContext)

  // Trading Panel initial values (from context menu)
  const [tradingPanelConfig, setTradingPanelConfig] = useState({
    action: 'BUY',
    price: '',
    orderType: 'MARKET',
    isOpen: false,
    isModal: false
  });

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

  // Confirm Dialog State
  const [confirmDialogState, setConfirmDialogState] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    danger: false
  });

  const requestConfirm = useCallback(({ title, message, onConfirm, onCancel, confirmText, cancelText, danger }) => {
    setConfirmDialogState({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        if (onConfirm) onConfirm();
        setConfirmDialogState(prev => ({ ...prev, isOpen: false }));
      },
      onCancel: () => {
        if (onCancel) onCancel();
        setConfirmDialogState(prev => ({ ...prev, isOpen: false }));
      },
      confirmText,
      cancelText,
      danger
    });
  }, []);

  // Sector Heatmap Modal State (isSectorHeatmapOpen now from UIContext)

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

  // Pine Script Editor State
  const [showPineEditor, setShowPineEditor] = useState(false);
  const [pineIndicatorCounter, setPineIndicatorCounter] = useState(1);

  // Handler for adding Pine Script indicator to chart
  const handleAddPineIndicator = useCallback((code: string, inputs: any[]) => {
    const indicatorName = (() => {
      // Extract indicator name from code
      const match = code.match(/indicator\s*\(\s*["']([^"']+)["']/);
      return match ? match[1] : `Pine Script ${pineIndicatorCounter}`;
    })();

    // Create default settings from inputs
    const defaultSettings: Record<string, unknown> = {};
    inputs.forEach((input: any) => {
      defaultSettings[input.name] = input.default;
    });

    // Check if it's an overlay indicator
    const isOverlay = /overlay\s*=\s*true/.test(code);

    setCharts((prev: any[]) =>
      prev.map((chart: any) => {
        if (chart.id !== activeChartId) return chart;

        const newIndicator = {
          id: `pine_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'pine',
          name: indicatorName,
          visible: true,
          pineCode: code,
          pineInputs: inputs,
          pane: isOverlay ? 'main' : 'pine_indicator',
          ...defaultSettings,
        };

        return {
          ...chart,
          indicators: [...(chart.indicators || []), newIndicator],
        };
      })
    );

    setPineIndicatorCounter((c: number) => c + 1);
    showToast(`Added "${indicatorName}" to chart`, 'success');
  }, [activeChartId, pineIndicatorCounter, setCharts, showToast]);

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

  // Order handlers are now provided by useOrderHandlers hook

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
    setCharts: setCharts as any,
    activeChartId,
    favoriteIntervals,
    setFavoriteIntervals,
    setLastNonFavoriteInterval,
    customIntervals,
    setCustomIntervals,
    currentInterval,
    showToast,
    isSyncEnabled,
    syncOptions
  });

  // Watchlist state from context
  const {
    watchlistsState,
    setWatchlistsState,
    watchlistData,
    setWatchlistData,
    watchlistLoading,
    setWatchlistLoading,
    activeWatchlist,
    watchlistSymbols,
    favoriteWatchlists,
    watchlistSymbolsKey,
    // Handlers
    reorderSymbols: handleWatchlistReorder,
    createWatchlist: handleCreateWatchlist,
    renameWatchlist: handleRenameWatchlist,
    deleteWatchlist: handleDeleteWatchlist,
    switchWatchlist: handleSwitchWatchlist,
    toggleWatchlistFavorite: handleToggleWatchlistFavorite,
    clearWatchlist: handleClearWatchlist,
    copyWatchlist: handleCopyWatchlist,
    exportWatchlist: handleExportWatchlist,
    importSymbols: handleImportWatchlist,
    addSection: handleAddSection,
    toggleSection: handleToggleSection,
    renameSection: handleRenameSection,
    deleteSection: handleDeleteSection,
    setSymbolFlag: handleSetSymbolFlag
  } = useWatchlist();

  const { scanningSymbols } = useWatchlistMonitor();

  // Indicator handlers extracted to hook
  const {
    // updateIndicatorSettings, // Conflict with useChart
    handleAddIndicator,
    handleIndicatorRemove,
    handleIndicatorVisibilityToggle,
    handleIndicatorSettings
  } = useIndicatorHandlers({
    setCharts: setCharts as any,
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
    setCharts: setCharts as any,
    activeChartId,
    watchlistSymbols,
    setWatchlistsState,
    setIsSearchOpen,
    setSearchMode,
    isSyncEnabled,
    syncOptions
  });

  // Comparison symbol selection - intercept to show options dialog
  const handleCompareSymbolSelect = useCallback((symbolData) => {
    if (searchMode === 'compare') {
      // Check if symbol already exists (toggle off)
      const exists = (activeChart?.comparisonSymbols || []).find(c =>
        c.symbol === symbolData.symbol && c.exchange === symbolData.exchange
      );

      if (exists) {
        // Remove existing comparison symbol directly
        handleSymbolChange(symbolData);
      } else {
        // Show options dialog for new comparison symbol
        setPendingComparisonSymbol(symbolData);
        setCompareOptionsVisible(true);
      }
    } else {
      // Normal symbol change (not compare mode)
      handleSymbolChange(symbolData);
    }
  }, [searchMode, activeChart, handleSymbolChange]);

  // Handle compare options confirmation
  const handleCompareOptionsConfirm = useCallback((scaleMode) => {
    if (pendingComparisonSymbol) {
      handleSymbolChange({
        ...pendingComparisonSymbol,
        scaleMode
      });
    }
    setCompareOptionsVisible(false);
    setPendingComparisonSymbol(null);
  }, [pendingComparisonSymbol, handleSymbolChange]);

  // Handle compare options cancel
  const handleCompareOptionsCancel = useCallback(() => {
    setCompareOptionsVisible(false);
    setPendingComparisonSymbol(null);
  }, []);

  // Layout handlers extracted to hook
  const {
    handleLayoutChange,
    handleMaximizeChart,
    handleSaveLayout
  } = useLayoutHandlers({
    layout,
    setLayout,
    charts: charts as any,
    setCharts: setCharts as any,
    activeChart: activeChart as any,
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
    chartRefs: chartRefs as any,
    activeChartId,
    setAlertPrice,
    setIsAlertOpen,
    showToast,
    currentSymbol,
    currentExchange,
    alerts: alerts as any,
    setAlerts: setAlerts as any,
    skipNextSyncRef: skipNextSyncRef as any,
    setAlertLogs: setAlertLogs as any,
    setUnreadAlertCount
  });

  // Tool-related state - moved early for use in useToolHandlers
  const [activeTool, setActiveTool] = useState(null);
  const [isMagnetMode, setIsMagnetMode] = useState(false);
  const [showDrawingToolbar, setShowDrawingToolbar] = useState(true);
  const [isReplayMode, setIsReplayMode] = useState(false);
  const [isDrawingsLocked, setIsDrawingsLocked] = useState(false);
  const [isDrawingsHidden, setIsDrawingsHidden] = useState(false);
  const [isSequentialMode, setIsSequentialMode] = useState(false); // Sequential drawing mode - keeps tool active after use
  const [isTimerVisible, setIsTimerVisible] = useLocalStorage('oa_timer_visible', false);
  const [isSessionBreakVisible, setIsSessionBreakVisible] = useLocalStorage('oa_session_break_visible', false);
  // Settings Modal State (isSettingsOpen, isIndicatorSettingsOpen now from UIContext)
  const [editingIndicator, setEditingIndicator] = useState(null);
  const [websocketUrl, setWebsocketUrl] = useState(() => {
    try {
      return localStorage.getItem('oa_ws_url') || '127.0.0.1:8765';
    } catch {
      return '127.0.0.1:8765';
    }
  });
  const [apiKey, setApiKey] = useState(() => {
    try {
      return localStorage.getItem('oa_apikey') || '';
    } catch {
      return '';
    }
  });
  const [hostUrl, setHostUrl] = useState(() => {
    try {
      return localStorage.getItem('oa_host_url') || 'http://127.0.0.1:5000';
    } catch {
      return 'http://127.0.0.1:5000';
    }
  });
  const [openalgoUsername, setOpenalgoUsername] = useState(() => {
    try {
      return localStorage.getItem('oa_username') || '';
    } catch {
      return '';
    }
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
    chartRefs: chartRefs as any,
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
    showSnapshotToast,
    requestConfirm,
    isSequentialMode,
    setIsSequentialMode
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
    setOptionChainInitialSymbol: setOptionChainInitialSymbol as any,
    setChartType,
    setCharts: setCharts as any,
    activeChartId,
    activeChart: activeChart as any,
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

  // PERF FIX: Keep watchlistSymbolsRef in sync with watchlistSymbols
  useEffect(() => {
    watchlistSymbolsRef.current = watchlistSymbols;
  }, [watchlistSymbols]);

  // PERF: Batched watchlist update refs - accumulates WS ticks and flushes at 60fps
  const pendingWatchlistUpdatesRef = useRef<Map<string, any>>(new Map());
  const watchlistRafRef = useRef<number>(0);



  // Initialize TimeService on app mount - syncs time with WorldTimeAPI
  // Cleanup on unmount to prevent memory leak from orphaned interval
  useEffect(() => {
    initTimeService();

    // Add beforeunload handler for page refresh/close scenarios (CRITICAL FIX ML-1)
    const handleBeforeUnload = () => {
      destroyTimeService();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      destroyTimeService();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Track previous symbols for incremental updates
  const prevSymbolsRef = React.useRef(null);
  const lastActiveListIdRef = React.useRef(null);
  // Track fetch state to prevent race condition where second effect run aborts first run's requests
  const watchlistFetchingRef = React.useRef(false);

  // Track previous prices for alert crossing detection (key: "SYMBOL:EXCHANGE", value: last price)
  // alertPricesRef is now from useAlert context

  // Cache AudioContext to reuse for performance
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Helper to play alert alarm sound
  const playAlertSound = useCallback(() => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      
      // Resume if suspended (browser auto-play policy)
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

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
      
      // We no longer close the context so we can reuse it
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
    logger.debug('[Watchlist Effect] Running, isAuthenticated:', isAuthenticated,
      'symbols:', watchlistSymbols.length, 'key:', watchlistSymbolsKey);

    // Don't fetch if not authenticated yet
    if (isAuthenticated !== true) {
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
    const currentSymbolKeys = (watchlistSymbols as any[])
      .filter((s: any) => !(typeof s === 'string' && s.startsWith('###')))
      .map((s: any) => {
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

      const MAX_RETRIES = 2;
      let attempt = 0;

      while (attempt <= MAX_RETRIES) {
        try {
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
          // If data is null but no error thrown (auth redirect?), break
          break;
        } catch (error) {
          if (error.name === 'AbortError') return null;

          // Handle "Symbol not found" errors by automatically removing them - NO RETRY
          if (error.message && ((error.message.includes('Symbol') && error.message.includes('not found')) || error.message.includes('400') || error.message.includes('404'))) {
            console.warn(`Removing invalid symbol ${symbol}:${exchange} from watchlist due to error: ${error.message}`);
            setTimeout(() => {
              if (mounted) {
                handleRemoveFromWatchlist({ symbol, exchange });
                showToast(`Removed invalid symbol: ${symbol}`, 'warning');
              }
            }, 0);
            return null;
          }

          // For other errors (network, 500s), retry
          attempt++;
          if (attempt > MAX_RETRIES) {
            console.error(`Error fetching ${symbol} after ${MAX_RETRIES + 1} attempts:`, error);
            return null;
          }

          const delay = 1000 * attempt; // Linear backoff: 1s, 2s
          console.warn(`Fetch failed for ${symbol}. Retrying in ${delay}ms... (Attempt ${attempt}/${MAX_RETRIES})`);
          if (mounted) await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      return null;
    };

    // Full reload function (for initial load or watchlist switch)
    const hydrateWatchlist = async () => {
      logger.debug('[Watchlist] hydrateWatchlist called');
      watchlistFetchingRef.current = true; // Mark fetch in progress
      setWatchlistLoading(true);
      try {
        const symbolObjs = (watchlistSymbols as any[]).filter((s: any) => !(typeof s === 'string' && s.startsWith('###')));
        logger.debug('[Watchlist] Processing', symbolObjs.length, 'symbols');

        // Show cached data immediately for instant UX
        const symbolsWithCachedData = symbolObjs
          .filter((s: any) => typeof s === 'object' && s.last !== undefined && s.last !== '--')
          .map((s: any) => ({
            symbol: s.symbol,
            exchange: s.exchange || 'NSE',
            last: s.last,
            chg: s.chg,
            chgP: s.chgP,
            up: s.up
          }));

        // Show cached data immediately (user sees something instantly)
        if (symbolsWithCachedData.length > 0 && mounted) {
          setWatchlistData(symbolsWithCachedData);
          setWatchlistLoading(false);
          initialDataLoaded = true;
          logger.debug('[Watchlist] Displayed', symbolsWithCachedData.length, 'cached items, fetching fresh...');
        }

        // ALWAYS fetch fresh prices from API for ALL symbols
        // INTELLIGENT BATCHING: Prioritize the first 30 symbols, then load the rest in small batches
        const PRIORITY_COUNT = 30;
        const BATCH_SIZE = 20;

        const priorityObjs = symbolObjs.slice(0, PRIORITY_COUNT);
        const remainingObjs = symbolObjs.slice(PRIORITY_COUNT);

        logger.debug('[Watchlist] Fetching priority quotes for', priorityObjs.length, 'symbols');
        const priorityResults = await Promise.allSettled(priorityObjs.map(fetchSymbol));
        const validPriority = priorityResults
          .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value !== null)
          .map(r => r.value);

        if (mounted && validPriority.length > 0) {
          setWatchlistData(prev => {
            const dataMap = new Map((prev as any[]).map(d => [`${d.symbol}-${d.exchange}`, d]));
            validPriority.forEach(d => dataMap.set(`${d.symbol}-${d.exchange}`, d));
            return Array.from(dataMap.values()) as any;
          });
          setWatchlistLoading(false);
          initialDataLoaded = true;
        }

        // Fetch remaining in throttled batches
        if (remainingObjs.length > 0) {
          (async () => {
            for (let i = 0; i < remainingObjs.length; i += BATCH_SIZE) {
              if (!mounted) break;
              const batch = remainingObjs.slice(i, i + BATCH_SIZE);
              const batchResults = await Promise.allSettled(batch.map(fetchSymbol));
              const validBatch = batchResults
                .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value !== null)
                .map(r => r.value);

              if (mounted && validBatch.length > 0) {
                setWatchlistData(prev => {
                  const dataMap = new Map((prev as any[]).map(d => [`${d.symbol}-${d.exchange}`, d]));
                  validBatch.forEach(d => dataMap.set(`${d.symbol}-${d.exchange}`, d));
                  return Array.from(dataMap.values()) as any;
                });
              }
              if (i + BATCH_SIZE < remainingObjs.length) await new Promise(r => setTimeout(r, 500));
            }
          })();
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
          logger.debug('[Watchlist] WS subscribing to', allSymbolsToSubscribe.length,
            'symbols (', symbolObjs.length, 'watchlist +', additionalAlertSymbols.length, 'alerts)');

          ws = subscribeToMultiTicker(allSymbolsToSubscribe, (ticker) => {
            if (!mounted || !initialDataLoaded) return;

            // NOTE: Alert monitoring is handled by globalAlertMonitor service (services/globalAlertMonitor.ts)
            // which runs on its own WebSocket subscription. No need to duplicate here.

            // === PERF OPTIMIZED: Batch watchlist updates via requestAnimationFrame ===
            // Instead of calling setWatchlistData on every tick (250+ setState/sec),
            // accumulate updates and flush once per animation frame (~60/sec)
            const tickerExchange = ticker.exchange || 'NSE';
            const updateKey = `${ticker.symbol}:${tickerExchange}`;
            pendingWatchlistUpdatesRef.current.set(updateKey, {
              symbol: ticker.symbol,
              exchange: tickerExchange,
              last: ticker.last.toFixed(2),
              open: ticker.open,
              volume: ticker.volume,
              chg: ticker.chg.toFixed(2),
              chgP: ticker.chgP.toFixed(2) + '%',
              up: ticker.chg >= 0
            });

            // Schedule a single flush per animation frame
            if (!watchlistRafRef.current) {
              watchlistRafRef.current = requestAnimationFrame(() => {
                const updates = pendingWatchlistUpdatesRef.current;
                if (updates.size === 0) {
                  watchlistRafRef.current = 0;
                  return;
                }

                setWatchlistData(prev => {
                  // Build an index map for O(1) lookups instead of O(n) findIndex per update
                  const next = [...prev];
                  const indexMap = new Map<string, number>();
                  for (let i = 0; i < next.length; i++) {
                    indexMap.set(`${next[i].symbol}:${next[i].exchange}`, i);
                  }

                  for (const [key, update] of updates) {
                    const idx = indexMap.get(key);
                    if (idx !== undefined) {
                      next[idx] = { ...next[idx], ...update };
                    } else {
                      // Fallback: Create item from WebSocket data if quotes API failed
                      const symbolData = watchlistSymbolsRef.current.find(s => {
                        if (typeof s === 'string') return s === update.symbol;
                        return s.symbol === update.symbol && s.exchange === update.exchange;
                      });
                      if (symbolData) {
                        next.push(update);
                      }
                    }
                  }
                  return next;
                });

                updates.clear();
                watchlistRafRef.current = 0;
              });
            }
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
      const addedSymbolObjs = (watchlistSymbols as any[]).filter((symObj: any) => {
        if (typeof symObj === 'string' && symObj.startsWith('###')) return false;
        // Create composite key for this symbol object
        const key = typeof symObj === 'string'
          ? `${symObj}-NSE`
          : `${symObj.symbol}-${symObj.exchange || 'NSE'}`;
        return addedSymbolKeys.includes(key);
      });

      const promises = addedSymbolObjs.map(fetchSymbol);
      const results = await Promise.allSettled(promises);
      const validResults = results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value !== null)
        .map(r => r.value);

      if (mounted && validResults.length > 0) {
        setWatchlistData(prev => [...prev, ...validResults]);
      }
    };

    // Decide update strategy
    // Note: watchlistData.length === 0 check handles React strict mode double-invocation
    // where first effect's cleanup aborts requests before they complete
    // FIX: Also trigger full reload when symbols are ADDED, because incremental add
    // does not update WebSocket subscription (hydrateAddedSymbols only fetches REST data).
    // Without full reload, adding a symbol causes all watchlist updates to stop.
    const needsFullReload = isInitialLoad || isListSwitch ||
      (currentSymbolKeys.length > 0 && watchlistData.length === 0) ||
      addedSymbolKeys.length > 0;

    logger.debug('[Watchlist] Strategy: initial=', isInitialLoad, 'switch=', isListSwitch,
      'fullReload=', needsFullReload, 'added=', addedSymbolKeys.length, 'removed=', removedSymbolKeys.length);

    if (needsFullReload) {
      // Full reload for initial load, watchlist switch, empty data, or symbol additions
      // Symbol additions need full reload because WebSocket subscription must be refreshed
      hydrateWatchlist();
    } else if (removedSymbolKeys.length > 0) {
      // Only removals can be handled incrementally (no WebSocket change needed)
      // Parse composite keys to filter out removed items
      setWatchlistData(prev => prev.filter(item => {
        const itemKey = `${item.symbol}-${item.exchange || 'NSE'}`;
        return !removedSymbolKeys.includes(itemKey);
      }));
    }
    // If no changes (just reorder or sections), do nothing

    return () => {
      // Always cleanup previous effect - new effect will start fresh
      mounted = false;
      abortController.abort();
      watchlistFetchingRef.current = false;
      // Cancel any pending RAF to prevent setState on unmounted component
      if (watchlistRafRef.current) {
        cancelAnimationFrame(watchlistRafRef.current);
        watchlistRafRef.current = 0;
        pendingWatchlistUpdatesRef.current.clear();
      }
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchlistSymbolsKey, watchlistsState.activeListId, isAuthenticated, handleRemoveFromWatchlist]);

  // Persist alerts/logs to localStorage with 24h retention
  useEffect(() => {
    const cutoff = Date.now() - ALERT_RETENTION_MS;
    const filtered = alerts.filter((a: any) => {
      const ts = a && a.created_at ? new Date(a.created_at as string | number).getTime() : NaN;
      return Number.isFinite(ts) && ts >= cutoff;
    });

    if (filtered.length !== alerts.length) {
      setAlerts(filtered as any);
      return; // avoid persisting stale data in this pass
    }

    try {
      localStorage.setItem('tv_alerts', JSON.stringify(filtered));
      // Refresh global alert monitor when alerts change (after localStorage is updated)
      if (isAuthenticated) {
        globalAlertMonitor.refresh();
      }
    } catch (error) {
      console.error('Failed to persist alerts:', error);
    }
  }, [alerts, isAuthenticated]);

  useEffect(() => {
    const cutoff = Date.now() - ALERT_RETENTION_MS;
    const filtered = alertLogs.filter((l: any) => {
      const ts = l && l.time ? new Date(l.time as string | number).getTime() : NaN;
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

  // Handler to open indicator alert dialog (create new)
  const handleOpenIndicatorAlert = useCallback((indicatorType) => {
    setIndicatorAlertToEdit(null);
    setIndicatorAlertInitialIndicator(indicatorType);
    setIsIndicatorAlertOpen(true);
  }, []);

  // Handle moving indicator up in the list (visually up in panes)
  const handleIndicatorMoveUp = React.useCallback((indicatorId: any) => {
    setCharts((prevCharts: any[]) => prevCharts.map((chart: any) => {
      if (chart.id !== activeChartId) return chart;

      const indicators = chart.indicators || [];
      const index = indicators.findIndex((i: any) => i.id === indicatorId);

      // Can't move up if it's the first indicator (index 0) or not found
      if (index <= 0) return chart;

      const newIndicators = [...indicators];
      // Swap with previous
      const temp = newIndicators[index - 1];
      newIndicators[index - 1] = newIndicators[index];
      newIndicators[index] = temp;

      return { ...chart, indicators: newIndicators };
    }));
  }, [activeChartId]);

  const toggleIndicator = (name: any) => {
    setCharts((prev: any[]) => prev.map((chart: any) => {
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

  // Handler to OPEN the settings dialog (called from Object Tree)
  const handleOpenIndicatorSettings = (indicatorId: any) => {
    // Find the indicator to edit
    const indicator = (activeChart as any)?.indicators?.find((ind: any) => ind.id === indicatorId || ind.type === indicatorId);
    if (indicator) {
      setEditingIndicator(indicator);
      setIsIndicatorSettingsOpen(true);
    }
  };

  // Check if properties panel should be visible
  const isDrawingPanelVisible = activeTool && DRAWING_TOOLS.includes(activeTool);

  // Drawings State matching lat
  const [liveDrawings, setLiveDrawings] = useState([]);
  const handleDrawingsSync = useCallback((drawings) => {
    setLiveDrawings(drawings);
  }, []);

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

    // Context Menu Shortcuts
    resetChartView: () => {
      const activeRef = chartRefs.current[activeChartId];
      if (activeRef && typeof activeRef.resetZoom === 'function') {
        activeRef.resetZoom();
      }
    },
    addAlertAtPrice: () => {
      // Add alert at current crosshair price
      const activeRef = chartRefs.current[activeChartId];
      if (activeRef && typeof activeRef.addAlertAtCrosshair === 'function') {
        activeRef.addAlertAtCrosshair();
      } else {
        // Fallback: open alert dialog
        handleAlertClick();
      }
    },
    sellLimitOrder: () => {
      // Open trading panel with SELL pre-filled at crosshair price
      const activeRef = (chartRefs as any).current[activeChartId];
      const crosshairPrice = activeRef?.getCrosshairPrice?.();
      if (crosshairPrice) {
        setTradingPanelConfig({
          action: 'SELL',
          price: crosshairPrice,
          orderType: 'LIMIT',
          isOpen: true,
          isModal: false
        });
      }
    },
    buyLimitOrder: () => {
      // Open trading panel with BUY pre-filled at crosshair price
      const activeRef = (chartRefs as any).current[activeChartId];
      const crosshairPrice = activeRef?.getCrosshairPrice?.();
      if (crosshairPrice) {
        setTradingPanelConfig({
          action: 'BUY',
          price: crosshairPrice,
          orderType: 'LIMIT',
          isOpen: true,
          isModal: false
        });
      }
    },
    addOrder: () => {
      // Open trading panel at crosshair price
      const activeRef = (chartRefs as any).current[activeChartId];
      const crosshairPrice = activeRef?.getCrosshairPrice?.();
      if (crosshairPrice) {
        setTradingPanelConfig({
          action: 'BUY',
          price: crosshairPrice,
          orderType: 'LIMIT',
          isOpen: true,
          isModal: false
        });
      }
    },
    drawHorizontalLine: () => {
      // Draw horizontal line at crosshair price
      const activeRef = chartRefs.current[activeChartId];
      if (activeRef && typeof activeRef.drawHorizontalLineAtCrosshair === 'function') {
        activeRef.drawHorizontalLineAtCrosshair();
      }
    },
    takeScreenshot: handleDownloadImage,
  }), [
    isShortcutsDialogOpen, isCommandPaletteOpen, isSearchOpen, isAlertOpen, isSettingsOpen, isTemplateDialogOpen,
    handleToolChange, handleUndo, handleRedo, handleAlertClick, handleFullScreen, activeChartId, chartRefs, setTradingPanelConfig
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

  // === PERF: Stable callbacks to prevent inline arrow functions breaking React.memo ===

  // Shared handler for navigating the active chart to a symbol — used by 7+ components
  const handleSymbolNavigation = useCallback((symData: any) => {
    const symbol = typeof symData === 'string' ? symData : symData.symbol;
    const exchange = typeof symData === 'string' ? 'NSE' : (symData.exchange || 'NSE');
    setCharts((prev: any[]) => prev.map((chart: any) =>
      chart.id === activeChartId ? { ...chart, symbol, exchange, strategyConfig: null } : chart
    ));
  }, [activeChartId, setCharts]);

  // Stable BottomBar callbacks
  const handleTimeRangeChange = useCallback((range: string, interval: string) => {
    setCurrentTimeRange(range);
    if (interval) {
      handleIntervalChange(interval);
    }
  }, [handleIntervalChange]);

  const handleToggleLogScale = useCallback(() => setIsLogScale((prev: boolean) => !prev), []);
  const handleToggleAutoScale = useCallback(() => setIsAutoScale((prev: boolean) => !prev), []);
  const handleResetZoom = useCallback(() => {
    const activeRef = (chartRefs as any).current[activeChartId];
    if (activeRef) {
      activeRef.resetZoom();
    }
  }, [activeChartId, chartRefs]);
  const handleToggleAccountPanel = useCallback(() => setIsAccountPanelOpen((prev: boolean) => !prev), []);

  // Stable Topbar inline callbacks
  const handleStraddleClick = useCallback(() => setIsStraddlePickerOpen(true), [setIsStraddlePickerOpen]);
  const handleIndicatorAlertClick = useCallback(() => {
    setIndicatorAlertToEdit(null);
    setIsIndicatorAlertOpen(true);
  }, []);
  const handleOptionsClick = useCallback(() => setIsOptionChainOpen(true), [setIsOptionChainOpen]);
  const handleHeatmapClick = useCallback(() => setIsSectorHeatmapOpen(true), [setIsSectorHeatmapOpen]);
  const handleTogglePineEditor = useCallback(() => setShowPineEditor((prev: boolean) => !prev), []);

  // Memoize watchlist items — this was an IIFE in JSX that ran on every render
  const memoizedWatchlistItems = React.useMemo(() => {
    const symbols = (activeWatchlist?.symbols || []) as any[];
    const dataMap = new Map(watchlistData.map((item: any) => [`${item.symbol}-${item.exchange}`, item]));

    return symbols.map((item: any) => {
      if (typeof item === 'string' && item.startsWith('###')) {
        return item;
      }
      const symbolName = typeof item === 'string' ? item : item.symbol;
      const exchange = typeof item === 'string' ? 'NSE' : (item.exchange || 'NSE');
      const compositeKey = `${symbolName}-${exchange}`;
      const liveData = dataMap.get(compositeKey);
      if (liveData) {
        return {
          ...(typeof item === 'object' ? item : { symbol: item }),
          ...liveData,
          exchange
        };
      }
      return item;
    });
  }, [activeWatchlist?.symbols, watchlistData]);

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
    <OrderProvider showToast={showToast}>
      <Layout
        isLeftToolbarVisible={showDrawingToolbar}
        isMobile={isMobile}
        isWatchlistVisible={isWatchlistVisible}
        onWatchlistOverlayClick={() => setIsWatchlistVisible(false)}
        isAccountPanelOpen={isAccountPanelOpen}
        accountPanel={
          <Suspense fallback={null}>
          <AccountPanel
            isOpen={isAccountPanelOpen}
            onClose={() => setIsAccountPanelOpen(false)}
            isAuthenticated={isAuthenticated}
            onSymbolSelect={handleSymbolNavigation}
            isMinimized={isAccountPanelMinimized}
            onMinimize={handleAccountPanelMinimize}
            isMaximized={isAccountPanelMaximized}
            onMaximize={handleAccountPanelMaximize}
            isToolbarVisible={showDrawingToolbar}
            showToast={showToast}
          />
          </Suspense>
        }
        isAccountPanelMinimized={isAccountPanelMinimized}
        isAccountPanelMaximized={isAccountPanelMaximized}
        mobileNav={
          <MobileNav
            activeTab={mobileTab}
            onTabChange={handleMobileTabChange}
            alertCount={unreadAlertCount}
            theme={theme}
          />
        }
        topbar={
          <Topbar
            symbol={currentSymbol}
            interval={currentInterval}
            chartType={chartType}
            indicators={activeChart.indicators}
            favoriteIntervals={favoriteIntervals}
            customIntervals={customIntervals}
            lastNonFavoriteInterval={lastNonFavoriteInterval}
            onSymbolClick={handleSymbolClick}
            onIntervalChange={handleIntervalChange}
            onChartTypeChange={setChartType}
            onAddIndicator={handleAddIndicator}
            onToggleFavorite={handleToggleFavorite}
            onAddCustomInterval={handleAddCustomInterval}
            onRemoveCustomInterval={handleRemoveCustomInterval}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onMenuClick={toggleDrawingToolbar}
            theme={theme}
            onToggleTheme={toggleTheme}
            onDownloadImage={handleDownloadImage}
            onCopyImage={handleCopyImage}
            onFullScreen={handleFullScreen}
            onReplayClick={handleReplayClick}
            isReplayMode={isReplayMode}
            onAlertClick={handleAlertClick}
            onCompareClick={handleCompareClick}
            layout={layout}
            onLayoutChange={handleLayoutChange}
            onSaveLayout={handleSaveLayout}
            onSettingsClick={handleSettingsClick}
            isSyncEnabled={isSyncEnabled}
            syncOptions={syncOptions}
            onSetSyncEnabled={setIsSyncEnabled}
            onSetSyncOptions={setSyncOptions}
            onTemplatesClick={handleTemplatesClick}
            onChartTemplatesClick={handleChartTemplatesClick}
            onStraddleClick={handleStraddleClick}

            strategyConfig={(activeChart as any)?.strategyConfig}
            onIndicatorAlertClick={handleIndicatorAlertClick}
            onOptionsClick={handleOptionsClick}
            onHeatmapClick={handleHeatmapClick}
            onPineEditorClick={handleTogglePineEditor}
            isPineEditorOpen={showPineEditor}
          />
        }
        leftToolbar={
          <DrawingToolbar
            activeTool={activeTool}
            onToolChange={handleToolChange}
            isDrawingsLocked={isDrawingsLocked}
            isDrawingsHidden={isDrawingsHidden}
            isTimerVisible={isTimerVisible}
            isSequentialMode={isSequentialMode}
          />
        }
        drawingPropertiesPanel={
          <DrawingPropertiesPanel
            defaults={drawingDefaults}
            onPropertyChange={handleDrawingPropertyChange}
            onReset={handleResetDrawingDefaults}
            isVisible={isDrawingPanelVisible}
            activeTool={activeTool}
          />
        }
        bottomBar={
          <BottomBar
            currentTimeRange={currentTimeRange}
            onTimeRangeChange={handleTimeRangeChange}
            isLogScale={isLogScale}
            isAutoScale={isAutoScale}
            onToggleLogScale={handleToggleLogScale}
            onToggleAutoScale={handleToggleAutoScale}
            onResetZoom={handleResetZoom}
            isToolbarVisible={showDrawingToolbar}
            isAccountPanelOpen={isAccountPanelOpen}
            onToggleAccountPanel={handleToggleAccountPanel}
          />
        }
        watchlist={
          activeRightPanel === 'watchlist' ? (
            <Watchlist
              currentSymbol={currentSymbol}
              currentExchange={currentExchange}
              items={memoizedWatchlistItems as any}
              isLoading={watchlistLoading}
              onSymbolSelect={handleSymbolNavigation}
              onAddClick={handleAddClick}
              onRemoveClick={handleRemoveFromWatchlist}
              onReorder={handleWatchlistReorder}
              // Multiple watchlists props
              watchlists={watchlistsState.lists as any}
              activeWatchlistId={watchlistsState.activeListId}
              onSwitchWatchlist={handleSwitchWatchlist}
              onCreateWatchlist={handleCreateWatchlist}
              onRenameWatchlist={handleRenameWatchlist}
              onDeleteWatchlist={handleDeleteWatchlist}
              onClearWatchlist={handleClearWatchlist}
              onCopyWatchlist={handleCopyWatchlist}
              // Favorites for quick-access
              favoriteWatchlists={favoriteWatchlists as any}
              onToggleFavorite={handleToggleWatchlistFavorite}
              // Section management (TradingView flat array model)
              onAddSection={handleAddSection}
              onRenameSection={handleRenameSection}
              onDeleteSection={handleDeleteSection}
              collapsedSections={(activeWatchlist as any)?.collapsedSections || []}
              onToggleSection={handleToggleSection}
              // Flagging
              onSetFlag={handleSetSymbolFlag}
              // Import/Export props
              onExport={handleExportWatchlist}
              onImport={handleImportWatchlist}
            />
          ) : activeRightPanel === 'objectTree' ? (
            <Suspense fallback={null}>
            <ObjectTreePanel
              indicators={(activeChart as any)?.indicators || [] as any}
              drawings={liveDrawings}
              onIndicatorVisibilityToggle={handleIndicatorVisibilityToggle}
              onIndicatorRemove={handleIndicatorRemove}
              onIndicatorSettings={handleOpenIndicatorSettings}
              onDrawingVisibilityToggle={(idx) => {
                const activeRef = chartRefs.current[activeChartId];
                if (activeRef && typeof activeRef.toggleDrawingVisibility === 'function') {
                  activeRef.toggleDrawingVisibility(idx);
                }
              }}
              onDrawingLockToggle={(idx) => {
                const activeRef = chartRefs.current[activeChartId];
                if (activeRef && typeof activeRef.toggleDrawingLock === 'function') {
                  activeRef.toggleDrawingLock(idx);
                }
              }}
              onDrawingRemove={(idx) => {
                const activeRef = chartRefs.current[activeChartId];
                if (activeRef && typeof activeRef.removeDrawingByIndex === 'function') {
                  activeRef.removeDrawingByIndex(idx);
                }
              }}
              symbol={currentSymbol}
              interval={currentInterval}
            />
            </Suspense>
          ) : activeRightPanel === 'screener' ? (
            <Suspense fallback={null}>
            <MarketScreenerPanel
              items={watchlistData}
              currentSymbol={currentSymbol}
              currentExchange={currentExchange}
              onSymbolSelect={handleSymbolNavigation}
            />
            </Suspense>
          ) : activeRightPanel === 'alerts' ? (
            <AlertsPanel
              alerts={alerts as any}
              logs={alertLogs as any}
              scanningSymbols={scanningSymbols}
              onRemoveAlert={handleRemoveAlert}
              onRestartAlert={handleRestartAlert}
              onPauseAlert={handlePauseAlert}
              onNavigate={(symbolData: any) => {
                // Switch active chart to the alert's symbol
                setCharts((prev: any[]) => prev.map((chart: any) =>
                  chart.id === activeChartId ? { ...chart, symbol: symbolData.symbol, exchange: symbolData.exchange, strategyConfig: null } : chart
                ));
              }}
              onEditAlert={(alert: any) => {
                if (alert.type === 'indicator') {
                  setIndicatorAlertToEdit(alert);
                  setIsIndicatorAlertOpen(true);
                  // Ensure we are on the correct symbol if needed
                  setCharts((prev: any[]) => prev.map((chart: any) =>
                    chart.id === activeChartId ? { ...chart, symbol: alert.symbol, exchange: alert.exchange || 'NSE', strategyConfig: null } : chart
                  ));
                  return;
                }

                // Navigate to the symbol first
                setCharts((prev: any[]) => prev.map((chart: any) =>
                  chart.id === activeChartId ? { ...chart, symbol: alert.symbol, exchange: alert.exchange || 'NSE', strategyConfig: null } : chart
                ));
                // Call editAlertById on the chart after a short delay to allow chart to update
                setTimeout(() => {
                  const activeRef = (chartRefs as any).current[activeChartId];
                  if (activeRef && typeof activeRef.editAlertById === 'function' && alert.externalId) {
                    activeRef.editAlertById(alert.externalId);
                  }
                }, 500);
              }}
            />
          ) : activeRightPanel === 'position_tracker' ? (
            <Suspense fallback={null}>
            <PositionTracker
              sourceMode={positionTrackerSettings.sourceMode}
              customSymbols={positionTrackerSettings.customSymbols}
              watchlistData={watchlistData}
              isLoading={watchlistLoading}
              onSourceModeChange={(mode) => setPositionTrackerSettings(prev => ({ ...prev, sourceMode: mode }))}
              onCustomSymbolsChange={(symbols) => setPositionTrackerSettings(prev => ({ ...prev, customSymbols: symbols }))}
              onSymbolSelect={handleSymbolNavigation}
              isAuthenticated={isAuthenticated}
            />
            </Suspense>
          ) : activeRightPanel === 'ann_scanner' ? (
            <Suspense fallback={<div style={{ padding: 20 }}>Loading Scanner...</div>}>
              <ANNScanner
                watchlistSymbols={(watchlistSymbols as any[])
                  .filter((s: any) => !(typeof s === 'string' && s.startsWith('###')))
                  .map((s: any) => typeof s === 'string'
                    ? { symbol: s, exchange: 'NSE' }
                    : { symbol: s.symbol, exchange: s.exchange || 'NSE' }
                  )}
                onSymbolSelect={handleSymbolNavigation}
                isAuthenticated={isAuthenticated}
                onAddToWatchlist={(symbolData: any) => {
                  const { symbol, exchange } = symbolData;
                  const existsInWatchlist = (watchlistSymbols as any[]).some((s: any) => {
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
                }}
                showToast={showToast}
                persistedState={annScannerState as any}
                onStateChange={setAnnScannerState as any}
                onStartScan={startAnnScan}
                onCancelScan={cancelAnnScan}
              />
            </Suspense>
          ) : activeRightPanel === 'tradefinder' ? (
            <Suspense fallback={<div style={{ padding: 20 }}>Loading Tradefinder...</div>}>
              <TradefinderScanner
                isAuthenticated={isAuthenticated}
              />
            </Suspense>
          ) : activeRightPanel === 'dom' ? (
            <Suspense fallback={<div style={{ padding: 20 }}>Loading DOM...</div>}>
              <DepthOfMarket
                symbol={currentSymbol}
                exchange={currentExchange}
                isOpen={true}
                onClose={() => setActiveRightPanel('watchlist')}
              />
            </Suspense>
          ) : activeRightPanel === 'trade' ? (
            <Suspense fallback={null}>
            <TradingPanel
              symbol={currentSymbol}
              exchange={currentExchange}
              isOpen={true}
              onClose={() => setActiveRightPanel('watchlist')}
              showToast={showToast}
              initialAction={tradingPanelConfig.action as any}
              initialPrice={tradingPanelConfig.price}
              initialOrderType={tradingPanelConfig.orderType as any}
            />
            </Suspense>
          ) : null
        }
        rightToolbar={
          <RightToolbar
            activePanel={activeRightPanel}
            onPanelChange={handleRightPanelToggle}
            badges={{ alerts: unreadAlertCount }}
          />
        }
        chart={
          <ChartGrid
            charts={charts as any}
            layout={layout as any}
            activeChartId={activeChartId}
            onActiveChartChange={setActiveChartId as any}
            onMaximizeChart={handleMaximizeChart as any}
            chartRefs={chartRefs as any}
            onAlertsSync={handleChartAlertsSync}
            onDrawingsSync={handleDrawingsSync}
            onAlertTriggered={handleChartAlertTriggered}
            onReplayModeChange={handleReplayModeChange as any}
            onOHLCDataUpdate={handleOHLCDataUpdate}
            // Common props
            chartType={chartType}
            // indicators={indicators} // Handled per chart now
            activeTool={activeTool}
            onToolUsed={handleToolUsed}
            isLogScale={isLogScale}
            isAutoScale={isAutoScale}
            magnetMode={isMagnetMode}
            timeRange={currentTimeRange}
            isToolbarVisible={showDrawingToolbar}
            theme={theme}
            isDrawingsLocked={isDrawingsLocked}
            isDrawingsHidden={isDrawingsHidden}
            isTimerVisible={isTimerVisible}
            isSessionBreakVisible={isSessionBreakVisible}
            onIndicatorRemove={handleIndicatorRemove}
            onIndicatorVisibilityToggle={handleIndicatorVisibilityToggle}
            onIndicatorSettings={handleIndicatorSettings}
            onOpenIndicatorAlert={handleOpenIndicatorAlert}
            onIndicatorMoveUp={handleIndicatorMoveUp}
            chartAppearance={chartAppearance}
            onOpenOptionChain={handleOpenOptionChainForSymbol}
            oiLines={oiLines}
            showOILines={showOILines}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenObjectTree={() => setActiveRightPanel('objectTree')}
            onOpenTradingPanel={(action: any, price: any, orderType: any, isModal = false) => {
              setTradingPanelConfig({
                action: action || 'BUY',
                price: price ? price.toFixed(2) : '',
                orderType: orderType || 'LIMIT',
                isOpen: true,
                isModal: isModal
              });
              if (!isModal) {
                setActiveRightPanel('trade');
              }
            }}
          />
        }
      />
      {/* Order Entry Modal (Popup) */}
      <Suspense fallback={null}>
      <OrderEntryModal
        isOpen={tradingPanelConfig.isOpen && tradingPanelConfig.isModal}
        onClose={() => setTradingPanelConfig(prev => ({ ...prev, isOpen: false, isModal: false }))}
        symbol={(activeChart as any)?.symbol}
        exchange={(activeChart as any)?.exchange}
        showToast={showToast}
        initialAction={tradingPanelConfig.action as any}
        initialPrice={tradingPanelConfig.price}
        initialOrderType={tradingPanelConfig.orderType as any}
      />
      </Suspense>

      <SymbolSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelect={handleCompareSymbolSelect}
        addedSymbols={searchMode === 'compare' ? (activeChart.comparisonSymbols || []) : []}
        isCompareMode={searchMode === 'compare'}
        initialValue={initialSearchValue}
        onInitialValueUsed={() => setInitialSearchValue('')}
      />
      <CompareOptionsDialog
        visible={compareOptionsVisible}
        symbol={pendingComparisonSymbol?.symbol}
        exchange={pendingComparisonSymbol?.exchange}
        symbolColor={(() => {
          // Get the next color for the comparison symbol
          const colors = ['#f57f17', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5'];
          const count = (activeChart?.comparisonSymbols || []).length;
          return colors[count % colors.length];
        })()}
        onConfirm={handleCompareOptionsConfirm}
        onCancel={handleCompareOptionsCancel}
      />
      <Suspense fallback={null}>
        {isCommandPaletteOpen && (
          <CommandPalette
            isOpen={isCommandPaletteOpen}
            onClose={() => setIsCommandPaletteOpen(false)}
            commands={commands}
            recentCommands={recentCommands}
            groupedCommands={groupedCommands}
            searchCommands={searchCommands}
            executeCommand={executeCommand}
          />
        )}
      </Suspense>
      {/* Toast Queue */}
      <div style={{ position: 'fixed', top: 70, right: 20, zIndex: 10000, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map((toast, index) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            action={toast.action}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
      {
        snapshotToast && (
          <SnapshotToast
            message={snapshotToast}
            onClose={() => clearSnapshotToast()}
          />
        )
      }
      {/* Global Alert Popup Restored */}
      <GlobalAlertPopup
        alerts={globalAlertPopups as any}
        onDismiss={(alertId: any) => setGlobalAlertPopups((prev: any[]) => prev.filter((a: any) => a.id !== alertId))}
        onClick={handleSymbolNavigation}
      />
      <AlertDialog
        isOpen={isAlertOpen}
        onClose={() => setIsAlertOpen(false)}
        onSave={handleSaveAlert as any}
        initialPrice={alertPrice as any}
        theme={theme}
      />
      <IndicatorAlertDialog
        isOpen={isIndicatorAlertOpen}
        onClose={() => {
          setIsIndicatorAlertOpen(false);
          setIndicatorAlertToEdit(null);
          setIndicatorAlertInitialIndicator(null);
        }}
        onSave={handleSaveIndicatorAlert as any}
        activeIndicators={(activeChart?.indicators || []) as any}
        symbol={indicatorAlertToEdit ? indicatorAlertToEdit.symbol : currentSymbol}
        exchange={indicatorAlertToEdit ? indicatorAlertToEdit.exchange : currentExchange}
        theme={theme}
        alertToEdit={indicatorAlertToEdit}
        initialIndicator={indicatorAlertInitialIndicator}
        currentInterval={currentInterval} // Pass current chart interval
      />
      <Suspense fallback={null}>
        {isSettingsOpen && (
          <SettingsPopup
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            theme={theme}
            isTimerVisible={isTimerVisible}
            onTimerToggle={handleTimerToggle}
            isSessionBreakVisible={isSessionBreakVisible}
            onSessionBreakToggle={handleSessionBreakToggle}
            hostUrl={hostUrl}
            onHostUrlSave={handleHostUrlSave}
            apiKey={apiKey}
            onApiKeySave={handleApiKeySaveFromSettings}
            websocketUrl={websocketUrl}
            onWebsocketUrlSave={handleWebsocketUrlSave}
            openalgoUsername={openalgoUsername}
            onUsernameSave={handleUsernameSave}
            chartAppearance={chartAppearance}
            onChartAppearanceChange={handleChartAppearanceChange}
            onResetChartAppearance={handleResetChartAppearance}
          />
        )}
      </Suspense>
      <Suspense fallback={null}>
        {isIndicatorSettingsOpen && editingIndicator && (
          <IndicatorSettingsDialog
            isOpen={isIndicatorSettingsOpen}
            onClose={() => {
              setIsIndicatorSettingsOpen(false);
              setEditingIndicator(null);
            }}
            indicatorType={editingIndicator.type}
            settings={editingIndicator}
            onSave={(newSettings) => {
              handleIndicatorSettings(editingIndicator.id, newSettings);
              setIsIndicatorSettingsOpen(false);
              setEditingIndicator(null);
            }}
            theme={theme}
            // For Pine indicators, generate dynamic config from pineInputs
            dynamicConfig={editingIndicator.type === 'pine' && editingIndicator.pineInputs ? {
              name: editingIndicator.name || 'Pine Script',
              fullName: editingIndicator.name || 'Pine Script Indicator',
              pane: editingIndicator.pane || 'pine_indicator',
              inputs: (editingIndicator.pineInputs || []).map((input: any) => ({
                key: input.name,
                label: input.title || input.name,
                type: input.type === 'int' || input.type === 'float' ? 'number' :
                      input.type === 'bool' ? 'boolean' :
                      input.type === 'color' ? 'color' :
                      input.type === 'string' || input.type === 'source' ? 'select' : 'text',
                default: input.default,
                min: input.minval,
                max: input.maxval,
                step: input.step || (input.type === 'float' ? 0.1 : 1),
                options: input.options || (input.type === 'source' ? ['close', 'open', 'high', 'low', 'hl2', 'hlc3', 'ohlc4'] : undefined),
              })),
              style: [
                { key: 'pineColor', label: 'Line Color', type: 'color', default: '#2962FF' },
                { key: 'pineLineWidth', label: 'Line Width', type: 'number', min: 1, max: 5, default: 2 },
              ],
            } : undefined}
          />
        )}
      </Suspense>

      <LayoutTemplateDialog
        isOpen={isTemplateDialogOpen}
        onClose={() => setIsTemplateDialogOpen(false)}
        currentState={{
          layout,
          charts: charts as any,
          chartType,
          chartAppearance,
          theme,
        }}
        onLoadTemplate={handleLoadTemplate as any}
        showToast={showToast}
      />
      <Suspense fallback={null}>
        {isShortcutsDialogOpen && (
          <ShortcutsDialog
            isOpen={isShortcutsDialogOpen}
            onClose={() => setIsShortcutsDialogOpen(false)}
          />
        )}
      </Suspense>
      <Suspense fallback={null}>
        {isChartTemplatesOpen && (
          <ChartTemplatesDialog
            isOpen={isChartTemplatesOpen}
            onClose={() => setIsChartTemplatesOpen(false)}
            currentConfig={getCurrentChartConfig() as any}
            onLoadTemplate={handleLoadChartTemplate as any}
          />
        )}
      </Suspense>
      <Suspense fallback={null}>
        {isStraddlePickerOpen && (
          <OptionChainPicker
            isOpen={isStraddlePickerOpen}
            onClose={() => setIsStraddlePickerOpen(false)}
            onSelect={(config: any) => {
              setCharts((prev: any) => prev.map((chart: any) =>
                chart.id === activeChartId ? { ...chart, strategyConfig: config } : chart
              ));
              setIsStraddlePickerOpen(false);
            }}
          />
        )}
      </Suspense>
      <Suspense fallback={null}>
        {isOptionChainOpen && (
          <OptionChainModal
            isOpen={isOptionChainOpen}
            onClose={() => {
              setIsOptionChainOpen(false);
              setOptionChainInitialSymbol(null);
            }}
            onSelectOption={handleOptionSelect}
            initialSymbol={optionChainInitialSymbol as any}
          />
        )}
      </Suspense>
      <Suspense fallback={null}>
        {isSectorHeatmapOpen && (
          <SectorHeatmapModal
            isOpen={isSectorHeatmapOpen}
            onClose={() => setIsSectorHeatmapOpen(false)}
            watchlistData={watchlistData}
            onSectorSelect={(sector) => {
              setPositionTrackerSettings(prev => ({ ...prev, sectorFilter: sector }));
              setIsSectorHeatmapOpen(false);
            }}
            onSymbolSelect={(symData: any) => {
              handleSymbolNavigation(symData);
              setIsSectorHeatmapOpen(false);
            }}
          />
        )}
      </Suspense>

      <ConfirmDialog
        isOpen={confirmDialogState.isOpen}
        title={confirmDialogState.title}
        message={confirmDialogState.message}
        onConfirm={confirmDialogState.onConfirm}
        onCancel={confirmDialogState.onCancel}
        confirmText={confirmDialogState.confirmText}
        cancelText={confirmDialogState.cancelText}
        danger={confirmDialogState.danger}
      />

      {/* Pine Script Editor - Bottom Panel */}
      <Suspense fallback={null}>
        {showPineEditor && (
          <PineScriptEditor
            isOpen={showPineEditor}
            onClose={() => setShowPineEditor(false)}
            onAddToChart={handleAddPineIndicator}
          />
        )}
      </Suspense>
    </OrderProvider >
  );
}

// AppWrapper - handles auth and cloud sync BEFORE mounting AppContent
// This ensures React state initializers see the cloud data in localStorage
function App() {
  const { isAuthenticated, setIsAuthenticated } = useUser();

  // Cloud Workspace Sync - blocks until cloud data is fetched or 5s timeout
  // Store is hydrated directly via setFromCloud, no remount needed
  const { isLoaded: isWorkspaceLoaded } = useCloudWorkspaceSync(isAuthenticated);

  // Show loader while checking auth or loading cloud data
  if (!isWorkspaceLoaded) {
    return <WorkspaceLoader />;
  }

  // Now mount AppContent - store is already hydrated with cloud data
  return <AppContent isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} />;
}

export default App;

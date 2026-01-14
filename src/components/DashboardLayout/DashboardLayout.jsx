import React, { Suspense, lazy } from 'react';
import Layout from '../Layout/Layout';
import Topbar from '../Topbar/Topbar';
import DrawingToolbar from '../Toolbar/DrawingToolbar';
import DrawingPropertiesPanel from '../Toolbar/DrawingPropertiesPanel';
import Watchlist from '../Watchlist/Watchlist';
import SymbolSearch from '../SymbolSearch/SymbolSearch';
import Toast from '../Toast/Toast';
import SnapshotToast from '../Toast/SnapshotToast';
import BottomBar from '../BottomBar/BottomBar';
import ChartGrid from '../Chart/ChartGrid';
import AlertDialog from '../Alert/AlertDialog';
import RightToolbar from '../Toolbar/RightToolbar';
import AlertsPanel from '../Alerts/AlertsPanel';
import MobileNav from '../MobileNav';
import CommandPalette from '../CommandPalette/CommandPalette';
import { OptionChainPicker } from '../OptionChainPicker';
import GlobalAlertPopup from '../GlobalAlertPopup/GlobalAlertPopup';
const DepthOfMarket = lazy(() => import('../DepthOfMarket'));
import AccountPanel from '../AccountPanel';
import TradingPanel from '../TradingPanel/TradingPanel';
import PositionTracker from '../PositionTracker/PositionTracker';
import ObjectTreePanel from '../ObjectTree/ObjectTreePanel';
import MarketScreenerPanel from '../MarketScreener/MarketScreenerPanel';

// Lazy-loaded modals and dialogs (loaded on demand)
const OptionChainModal = lazy(() => import('../OptionChainModal'));
const SettingsPopup = lazy(() => import('../Settings/SettingsPopup'));
const ShortcutsDialog = lazy(() => import('../ShortcutsDialog/ShortcutsDialog'));
const ChartTemplatesDialog = lazy(() => import('../ChartTemplates/ChartTemplatesDialog'));
const LayoutTemplateDialog = lazy(() => import('../LayoutTemplates/LayoutTemplateDialog'));
const SectorHeatmapModal = lazy(() => import('../SectorHeatmap/SectorHeatmapModal'));
const ANNScanner = lazy(() => import('../ANNScanner'));


/**
 * DashboardLayout - Main dashboard layout component
 * Renders the entire application layout including topbar, sidebars, chart grid, and modals
 */
export const DashboardLayout = ({
    // Layout state
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

    // Theme
    theme,
    toggleTheme,

    // Chart Controls (passed to BottomBar)
    onToggleLogScale,
    onToggleAutoScale,
    onResetZoom,
    onTimeRangeChange,
    timezone = 'UTC+5:30',

    // Chart state
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

    // Interval management
    favoriteIntervals,
    customIntervals,
    lastNonFavoriteInterval,
    handleIntervalChange,
    handleToggleFavorite,
    handleAddCustomInterval,
    handleRemoveCustomInterval,

    // Drawing tools
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

    // Timer and session breaks
    isTimerVisible,
    isSessionBreakVisible,

    // Chart appearance
    isLogScale,
    isAutoScale,
    chartAppearance,
    handleChartAppearanceChange,
    handleResetChartAppearance,
    currentTimeRange,

    // OI Lines
    oiLines,
    showOILines,

    // Trading data
    activeOrders,
    activePositions,
    allPositions,
    allOrders,
    holdings,
    trades,
    funds,
    handleModifyOrder,
    handleCancelOrder,

    // Indicators
    handleAddIndicator,
    handleIndicatorRemove,
    handleIndicatorVisibilityToggle,
    handleIndicatorSettings,

    // Alerts
    alerts,
    alertLogs,
    unreadAlertCount,
    globalAlertPopups,
    isAlertOpen,
    setIsAlertOpen,
    alertPrice,
    handleAlertClick,
    handleSaveAlert,
    handleRemoveAlert,
    handleRestartAlert,
    handlePauseAlert,
    handleChartAlertsSync,
    handleChartAlertTriggered,
    onDrawingsSync,
    dismissGlobalAlertPopup,
    clearUnreadAlertCount,

    // Watchlist
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
    handleAddSymbolToWatchlist,
    handleRemoveFromWatchlist,
    favoriteWatchlists,

    // Symbol search
    isSearchOpen,
    setIsSearchOpen,
    searchMode,
    setSearchMode,
    initialSearchValue,
    setInitialSearchValue,
    handleSymbolChange,
    handleSymbolClick,
    handleCompareClick,

    // Screenshots
    handleDownloadImage,
    handleCopyImage,
    handleFullScreen,

    // Replay
    handleReplayClick,
    isReplayMode,
    handleReplayModeChange,
    handleReplaySliderChange,

    // Layout
    handleLayoutChange,
    handleSaveLayout,
    handleMaximizeChart,

    // Right panel
    activeRightPanel,
    handleRightPanelToggle,

    // Mobile
    mobileTab,
    handleMobileTabChange,

    // Settings
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

    // Templates
    isTemplateDialogOpen,
    setIsTemplateDialogOpen,
    handleTemplatesClick,
    handleLoadTemplate,

    // Chart templates
    isChartTemplatesOpen,
    setIsChartTemplatesOpen,
    handleChartTemplatesClick,
    getCurrentChartConfig,
    handleLoadChartTemplate,

    // Shortcuts
    isShortcutsDialogOpen,
    setIsShortcutsDialogOpen,

    // Command palette
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    commands,
    recentCommands,
    groupedCommands,
    searchCommands,
    executeCommand,

    // Option chain
    isOptionChainOpen,
    setIsOptionChainOpen,
    optionChainInitialSymbol,
    setOptionChainInitialSymbol,
    handleOpenOptionChainForSymbol,
    handleOptionSelect,

    // Straddle picker
    isStraddlePickerOpen,
    setIsStraddlePickerOpen,

    // Sector heatmap
    isSectorHeatmapOpen,
    setIsSectorHeatmapOpen,
    positionTrackerSettings,
    setPositionTrackerSettings,

    // Indicator settings
    isIndicatorSettingsOpen,
    setIsIndicatorSettingsOpen,

    // Toasts
    toasts,
    removeToast,
    showToast,
    snapshotToast,
    setSnapshotToast,

    // Auth
    isAuthenticated,
    liveDrawings, // Use prop from App.jsx
    ...props
}) => {
    const watchlistItems = React.useMemo(() => {
        const symbols = activeWatchlist?.symbols || [];
        const dataMap = new Map(watchlistData.map(item => [`${item.symbol}-${item.exchange}`, item]));

        return symbols.map(item => {
            if (typeof item === 'string' && item.startsWith('###')) {
                return item;
            }
            const symbolName = typeof item === 'string' ? item : item.symbol;
            const exchange = typeof item === 'string' ? 'NSE' : (item.exchange || 'NSE');
            const compositeKey = `${symbolName}-${exchange}`;
            const liveData = dataMap.get(compositeKey);

            if (liveData) {
                return { ...liveData, exchange };
            }
            // Sanitize fallback: only return symbol/exchange, ignoring stale price data from localStorage
            if (typeof item === 'string') {
                return { symbol: item, exchange: 'NSE' };
            }
            return { symbol: item.symbol, exchange: item.exchange || 'NSE' };
        });
    }, [activeWatchlist, watchlistData]);

    const handleAddClick = () => {
        setSearchMode?.('add');
        setIsSearchOpen(true);
    };

    // Get active chart ref for Object Tree panel
    const activeChartRef = chartRefs?.current?.[activeChartId];

    // Position Tracker State
    const [positionTrackerSourceMode, setPositionTrackerSourceMode] = React.useState('watchlist');
    const [positionTrackerCustomSymbols, setPositionTrackerCustomSymbols] = React.useState([]);

    // Handle edit alert from AlertsPanel
    const handleEditAlert = React.useCallback((alert) => {
        console.log('[DashboardLayout] handleEditAlert called for:', alert ? alert.id : 'undefined');
        if (!alert) return;

        // Use externalId if available (for synced alerts), otherwise alert.id
        const targetAlertId = alert.externalId || alert.id;
        // Determine correct chart ID
        const targetChartId = alert.chartId || activeChartId;

        // Open the dialog manually
        // We pass the alert object as "price" which the dialog uses to init values
        // Important: we pass targetAlertId as the ID so save handler knows it's an edit
        setAlertPrice({
            id: targetAlertId,
            value: alert.price,
            condition: alert.condition,
            chartId: targetChartId // Pass chartId so save handler knows which chart to update
        });
        setIsAlertOpen(true);
    }, [activeChartId]);

    // Convert indicators object to array format for ObjectTreePanel
    // Indicators can be stored as {sma: {...}, rsi: {...}} or as an array [{type: 'sma', ...}]
    const indicatorsArray = React.useMemo(() => {
        const rawIndicators = activeChart?.indicators;
        if (!rawIndicators) return [];
        if (Array.isArray(rawIndicators)) return rawIndicators;
        // Convert object format to array
        return Object.entries(rawIndicators).map(([key, value]) => ({
            type: key,
            id: key,
            ...value
        }));
    }, [activeChart?.indicators]);

    const rightPanelContent = React.useMemo(() => {
        switch (activeRightPanel) {
            case 'watchlist':
                return (
                    <Watchlist
                        currentSymbol={currentSymbol}
                        currentExchange={activeChart?.exchange || 'NSE'}
                        items={watchlistItems}
                        onSymbolSelect={handleSymbolChange}
                        onAddClick={handleAddClick}
                        onRemoveClick={handleRemoveFromWatchlist}
                        onReorder={handleWatchlistReorder}
                        isLoading={watchlistLoading}
                        watchlists={watchlistsState.lists}
                        activeWatchlistId={activeWatchlist?.id}
                        onSwitchWatchlist={handleSwitchWatchlist}
                        onCreateWatchlist={handleCreateWatchlist}
                        onRenameWatchlist={handleRenameWatchlist}
                        onDeleteWatchlist={handleDeleteWatchlist}
                        onClearWatchlist={handleClearWatchlist}
                        onCopyWatchlist={handleCopyWatchlist}
                        onAddSection={handleAddSection}
                        onRenameSection={handleRenameSection}
                        onDeleteSection={handleDeleteSection}
                        collapsedSections={activeWatchlist?.collapsedSections || []}
                        onToggleSection={handleToggleSection}
                        onExport={handleExportWatchlist}
                        onImport={handleImportWatchlist}
                        favoriteWatchlists={favoriteWatchlists}
                        onToggleFavorite={handleToggleWatchlistFavorite}
                    />
                );
            case 'alerts':
                return (
                    <AlertsPanel
                        alerts={alerts}
                        logs={alertLogs}
                        onRemoveAlert={handleRemoveAlert}
                        onRestartAlert={handleRestartAlert}
                        onPauseAlert={handlePauseAlert}
                        onEditAlert={handleEditAlert}
                        onClearLogs={() => { }}
                    />
                );
            case 'dom':
                return (
                    <DepthOfMarket
                        symbol={currentSymbol}
                        exchange={activeChart?.exchange || 'NSE'}
                        isOpen={true}
                        onClose={() => handleRightPanelToggle(null)}
                    />
                );
            case 'position_tracker':
                return (
                    <PositionTracker
                        sourceMode={positionTrackerSourceMode}
                        customSymbols={positionTrackerCustomSymbols}
                        watchlistData={watchlistData}
                        isLoading={watchlistLoading}
                        onSourceModeChange={setPositionTrackerSourceMode}
                        onCustomSymbolsChange={setPositionTrackerCustomSymbols}
                        onSymbolSelect={handleSymbolChange}
                        isAuthenticated={isAuthenticated}
                    />
                );
            case 'trading':
                return (
                    <TradingPanel
                        symbol={currentSymbol}
                        exchange={activeChart?.exchange || 'NSE'}
                        ltp={watchlistData?.find(w => w.symbol === currentSymbol)?.last || 0}
                        showToast={showToast}
                        isOpen={true}
                        onClose={() => handleRightPanelToggle(null)}
                    />
                );
            case 'screener':
                return (
                    <MarketScreenerPanel
                        items={watchlistItems}
                        onSymbolSelect={handleSymbolChange}
                        currentSymbol={currentSymbol}
                        currentExchange={activeChart?.exchange || 'NSE'}
                    />
                );
            case 'ann_scanner':
                return (
                    <Suspense fallback={<div style={{ padding: 20 }}>Loading Scanner...</div>}>
                        <ANNScanner
                            watchlistSymbols={watchlistItems.map(item => ({
                                symbol: item.symbol,
                                exchange: item.exchange
                            }))}
                            onSymbolSelect={handleSymbolChange}
                            isAuthenticated={isAuthenticated}
                            onAddToWatchlist={props.onAddToWatchlist}
                            showToast={showToast}
                            persistedState={props.annScannerState}
                            onStateChange={props.setAnnScannerState}
                            onStartScan={props.onStartAnnScan}
                            onCancelScan={props.onCancelAnnScan}
                        />
                    </Suspense>
                );
            case 'objectTree':
                return (
                    <ObjectTreePanel
                        indicators={indicatorsArray}
                        drawings={liveDrawings}
                        onIndicatorVisibilityToggle={handleIndicatorVisibilityToggle}
                        onIndicatorRemove={handleIndicatorRemove}
                        onIndicatorSettings={(id) => {
                            activeChartRef?.openIndicatorSettings?.(id);
                        }}
                        onDrawingVisibilityToggle={(idx) => {
                            activeChartRef?.toggleDrawingVisibility?.(idx);
                        }}
                        onDrawingLockToggle={(idx) => {
                            activeChartRef?.toggleDrawingLock?.(idx);
                        }}
                        onDrawingRemove={(idx) => {
                            activeChartRef?.removeDrawingByIndex?.(idx);
                        }}
                        symbol={currentSymbol}
                        interval={currentInterval}
                    />
                );
            default:
                return null;
        }
    }, [activeRightPanel, watchlistItems, currentSymbol, currentInterval, activeChart, activeChartId, chartRefs, watchlistLoading, watchlistsState, activeWatchlist, favoriteWatchlists, alerts, alertLogs, watchlistData, handleIndicatorVisibilityToggle, handleIndicatorRemove, handleIndicatorSettings]);

    return (
        <>
            <Layout
                isLeftToolbarVisible={showDrawingToolbar}
                isMobile={isMobile}
                isWatchlistVisible={isWatchlistVisible}
                onWatchlistOverlayClick={() => setIsWatchlistVisible(false)}
                isAccountPanelOpen={isAccountPanelOpen}
                accountPanel={
                    <AccountPanel
                        isOpen={isAccountPanelOpen}
                        onClose={() => setIsAccountPanelOpen(false)}
                        isAuthenticated={isAuthenticated}
                        onSymbolSelect={(symData) => {
                            const symbol = typeof symData === 'string' ? symData : symData.symbol;
                            const exchange = typeof symData === 'string' ? 'NSE' : (symData.exchange || 'NSE');
                            setCharts(prev => prev.map(chart =>
                                chart.id === activeChartId ? { ...chart, symbol, exchange, strategyConfig: null } : chart
                            ));
                        }}
                        isMinimized={isAccountPanelMinimized}
                        onMinimize={handleAccountPanelMinimize}
                        isMaximized={isAccountPanelMaximized}
                        onMaximize={handleAccountPanelMaximize}
                        isToolbarVisible={showDrawingToolbar}
                        positions={allPositions}
                        orders={allOrders}
                        holdings={holdings}
                        trades={trades}
                        funds={funds}
                    />
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
                        indicators={activeChart?.indicators || []}
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
                        onAlertsSync={handleChartAlertsSync}
                        onAlertTriggered={handleChartAlertTriggered}
                        onDrawingsSync={onDrawingsSync}
                        onReplayModeChange={handleReplayModeChange}
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
                        onTemplatesClick={handleTemplatesClick}
                        onChartTemplatesClick={handleChartTemplatesClick}
                        onStraddleClick={() => setIsStraddlePickerOpen(true)}
                        strategyConfig={activeChart?.strategyConfig}
                        onIndicatorSettingsClick={() => setIsIndicatorSettingsOpen(true)}
                        onOptionsClick={() => setIsOptionChainOpen(true)}
                        onHeatmapClick={() => setIsSectorHeatmapOpen(true)}
                    />
                }
                leftToolbar={
                    <DrawingToolbar
                        activeTool={activeTool}
                        isMagnetMode={isMagnetMode}
                        onToolChange={handleToolChange}
                        isDrawingsLocked={isDrawingsLocked}
                        isDrawingsHidden={isDrawingsHidden}
                        isTimerVisible={isTimerVisible}
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
                        currentWatchlistId={activeWatchlist?.id}
                        watchlists={watchlistsState.lists}
                        onWatchlistChange={handleSwitchWatchlist}
                        favoriteWatchlists={favoriteWatchlists}
                        onToggleAccountPanel={() => setIsAccountPanelOpen(!isAccountPanelOpen)}
                        onOpenDOMPanel={() => handleRightPanelToggle('dom')}
                        onOpenTradingPanel={() => handleRightPanelToggle('trading')}
                        isAccountPanelOpen={isAccountPanelOpen}
                        isDOMPanelOpen={activeRightPanel === 'dom'}
                        isTradingPanelOpen={activeRightPanel === 'trading'}
                        isLogScale={isLogScale}
                        onToggleLogScale={onToggleLogScale}
                        isAutoScale={isAutoScale}
                        onToggleAutoScale={onToggleAutoScale}
                        onResetZoom={onResetZoom}
                        onTimeRangeChange={onTimeRangeChange}
                        currentTimeRange={currentTimeRange}
                        timezone={timezone || 'UTC+5:30'}
                    />
                }
                rightToolbar={
                    <RightToolbar
                        activePanel={activeRightPanel}
                        onPanelChange={handleRightPanelToggle}
                        alertCount={unreadAlertCount}
                    />
                }
                watchlist={rightPanelContent}
                chart={
                    <ChartGrid
                        layout={layout}
                        charts={charts}
                        alerts={alerts}
                        activeChartId={activeChartId}
                        chartRefs={chartRefs}
                        onActiveChartChange={setActiveChartId}
                        onMaximizeChart={handleMaximizeChart}
                        chartType={chartType}
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
                        chartAppearance={chartAppearance}
                        onOpenOptionChain={handleOpenOptionChainForSymbol}
                        oiLines={oiLines}
                        showOILines={showOILines}
                        orders={activeOrders}
                        positions={activePositions}
                        onModifyOrder={handleModifyOrder}
                        onCancelOrder={handleCancelOrder}
                        onAlertsSync={handleChartAlertsSync}
                        onAlertTriggered={handleChartAlertTriggered}
                        onDrawingsSync={onDrawingsSync}
                    />
                }
            />
            <SymbolSearch
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
                onSelect={handleSymbolChange}
                addedSymbols={searchMode === 'compare' ? (activeChart?.comparisonSymbols || []) : []}
                isCompareMode={searchMode === 'compare'}
                initialValue={initialSearchValue}
                onInitialValueUsed={() => setInitialSearchValue('')}
            />
            <CommandPalette
                isOpen={isCommandPaletteOpen}
                onClose={() => setIsCommandPaletteOpen(false)}
                commands={commands}
                recentCommands={recentCommands}
                groupedCommands={groupedCommands}
                searchCommands={searchCommands}
                executeCommand={executeCommand}
            />
            {/* Toast Queue */}
            <div style={{ position: 'fixed', top: 70, right: 20, zIndex: 10000, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {toasts.map((toast) => (
                    <Toast
                        key={toast.id}
                        message={toast.message}
                        type={toast.type}
                        action={toast.action}
                        onClose={() => removeToast(toast.id)}
                    />
                ))}
            </div>
            {snapshotToast && (
                <SnapshotToast
                    message={snapshotToast}
                    onClose={() => setSnapshotToast(null)}
                />
            )}
            <GlobalAlertPopup
                alerts={globalAlertPopups}
                onDismiss={dismissGlobalAlertPopup}
                onClick={(symbolData) => {
                    setCharts(prev => prev.map(chart =>
                        chart.id === activeChartId ? { ...chart, symbol: symbolData.symbol, exchange: symbolData.exchange, strategyConfig: null } : chart
                    ));
                }}
            />
            <AlertDialog
                isOpen={isAlertOpen}
                onClose={() => setIsAlertOpen(false)}
                onSave={handleSaveAlert}
                initialPrice={alertPrice}
                theme={theme}
            />
            {/* Lazy-loaded modals wrapped in Suspense */}
            <Suspense fallback={null}>
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
                <LayoutTemplateDialog
                    isOpen={isTemplateDialogOpen}
                    onClose={() => setIsTemplateDialogOpen(false)}
                    currentState={{
                        layout,
                        charts,
                        chartType,
                        chartAppearance,
                        theme,
                    }}
                    onLoadTemplate={handleLoadTemplate}
                    showToast={showToast}
                />
                <ShortcutsDialog
                    isOpen={isShortcutsDialogOpen}
                    onClose={() => setIsShortcutsDialogOpen(false)}
                />
                <ChartTemplatesDialog
                    isOpen={isChartTemplatesOpen}
                    onClose={() => setIsChartTemplatesOpen(false)}
                    currentConfig={getCurrentChartConfig?.()}
                    onLoadTemplate={handleLoadChartTemplate}
                />
                <OptionChainPicker
                    isOpen={isStraddlePickerOpen}
                    onClose={() => setIsStraddlePickerOpen(false)}
                    onSelect={(config) => {
                        setCharts(prev => prev.map(chart =>
                            chart.id === activeChartId ? { ...chart, strategyConfig: config } : chart
                        ));
                        setIsStraddlePickerOpen(false);
                    }}
                    spotPrice={activeChart?.ltp || null}
                />
                <OptionChainModal
                    isOpen={isOptionChainOpen}
                    onClose={() => {
                        setIsOptionChainOpen(false);
                        setOptionChainInitialSymbol?.(null);
                    }}
                    onSelectOption={handleOptionSelect}
                    initialSymbol={optionChainInitialSymbol}
                />
                <SectorHeatmapModal
                    isOpen={isSectorHeatmapOpen}
                    onClose={() => setIsSectorHeatmapOpen(false)}
                    watchlistData={watchlistData}
                    onSectorSelect={(sector) => {
                        setPositionTrackerSettings?.(prev => ({ ...prev, sectorFilter: sector }));
                        setIsSectorHeatmapOpen(false);
                    }}
                    onSymbolSelect={(symData) => {
                        const symbol = typeof symData === 'string' ? symData : symData.symbol;
                        const exchange = typeof symData === 'string' ? 'NSE' : (symData.exchange || 'NSE');
                        setCharts(prev => prev.map(chart =>
                            chart.id === activeChartId ? { ...chart, symbol, exchange, strategyConfig: null } : chart
                        ));
                        setIsSectorHeatmapOpen(false);
                    }}
                />
            </Suspense>
        </>
    );
};

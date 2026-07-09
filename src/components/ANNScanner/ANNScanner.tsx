import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { KeyboardEvent, ChangeEvent } from 'react';
import classNames from 'classnames';
import { RefreshCw, Brain, AlertCircle, Bell, BellOff } from 'lucide-react';
import styles from './ANNScanner.module.css';
import ANNScannerItem from './ANNScannerItem';
import { sortResults, filterResults } from '../../services/annScannerService';
import { getStockList, STOCK_LIST_OPTIONS } from '../../data/stockLists';
import { SECTORS, getSector } from '../PositionTracker/sectorMapping';

type Direction = 'LONG' | 'SHORT' | null;
type StreakChange = 'up' | 'down' | 'same';
type FilterType = 'all' | 'long' | 'short';
type SortDirection = 'asc' | 'desc';

interface StockItem {
    symbol: string;
    exchange: string;
    name?: string;
}

interface ScanResultItem {
    symbol: string;
    exchange: string;
    name?: string;
    direction: Direction;
    streak: number;
    nnOutput: number | null;
    error?: string;
    sector?: string;
}

interface ScanResultWithDelta extends ScanResultItem {
    isNew: boolean;
    signalFlipped: boolean;
    streakChange: StreakChange;
    previousStreak: number;
}

interface ColumnWidths {
    symbol: number;
    signal: number;
    strength: number;
    streak: number;
    nnOutput: number;
    action: number;
}

interface ScanProgress {
    current: number;
    total: number;
}

interface PersistedState {
    source?: string;
    filter?: FilterType;
    results?: ScanResultItem[];
    previousResults?: ScanResultItem[];
    lastScanTime?: Date | null;
    isScanning?: boolean;
    progress?: ScanProgress;
    scanError?: string | null;
    refreshInterval?: string;
    alertsEnabled?: boolean;
    sectorFilter?: string;
}

interface SymbolData {
    symbol: string;
    exchange: string;
}

export interface ANNScannerProps {
    watchlistSymbols?: SymbolData[];
    onSymbolSelect: (data: SymbolData) => void;
    isAuthenticated: boolean;
    onAddToWatchlist?: (data: SymbolData) => void;
    showToast?: (message: string, type: string) => void;
    persistedState?: PersistedState;
    onStateChange?: (state: PersistedState) => void;
    onStartScan?: (stocks: StockItem[], alertsEnabled: boolean, showToast?: (message: string, type: string) => void) => void;
    onCancelScan?: () => void;
}

// Default column widths
const DEFAULT_COLUMN_WIDTHS: ColumnWidths = {
    symbol: 80,
    signal: 55,
    strength: 45,
    streak: 50,
    nnOutput: 60,
    action: 28,
};

const MIN_COLUMN_WIDTH = 30;

// Refresh interval options
const REFRESH_INTERVALS = [
    { id: 'off', label: 'Off', ms: 0 },
    { id: '5m', label: '5m', ms: 5 * 60 * 1000 },
    { id: '15m', label: '15m', ms: 15 * 60 * 1000 },
    { id: '30m', label: '30m', ms: 30 * 60 * 1000 },
    { id: '1h', label: '1h', ms: 60 * 60 * 1000 },
];

const ANNScanner: React.FC<ANNScannerProps> = ({
    watchlistSymbols = [],
    onSymbolSelect,
    isAuthenticated,
    onAddToWatchlist,
    showToast,
    persistedState = {},
    onStateChange,
    onStartScan,
    onCancelScan,
}) => {
    // State
    const [source, setSource] = useState(persistedState.source ?? 'watchlist');
    const [filter, setFilter] = useState<FilterType>(persistedState.filter ?? 'all');
    const [sortBy, setSortBy] = useState('streak');
    const [sortDir, setSortDir] = useState<SortDirection>('desc');
    const [results, setResults] = useState<ScanResultItem[]>(persistedState.results ?? []);
    const isScanning = persistedState.isScanning ?? false;
    const progress = persistedState.progress ?? { current: 0, total: 0 };
    const [error, setError] = useState<string | null>(persistedState.scanError ?? null);
    const [lastScanTime, setLastScanTime] = useState<Date | null>(persistedState.lastScanTime ?? null);
    const [columnWidths, setColumnWidths] = useState<ColumnWidths>(DEFAULT_COLUMN_WIDTHS);
    const [resizing, setResizing] = useState<string | null>(null);
    const [focusedIndex, setFocusedIndex] = useState(-1);

    // Auto-refresh state
    const [refreshInterval, setRefreshInterval] = useState(persistedState.refreshInterval ?? 'off');
    const [countdown, setCountdown] = useState(0);

    // Previous results for comparison
    const [previousResults, setPreviousResults] = useState<ScanResultItem[]>(persistedState.previousResults ?? []);

    // Alert state
    const [alertsEnabled, setAlertsEnabled] = useState(persistedState.alertsEnabled ?? true);
    const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

    // Sector filter state
    const [sectorFilter, setSectorFilter] = useState(persistedState.sectorFilter ?? 'All');

    // Refs
    const listRef = useRef<HTMLDivElement>(null);
    const startXRef = useRef(0);
    const startWidthRef = useRef(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Request notification permission on mount
    useEffect(() => {
        if ('Notification' in window) {
            setNotificationPermission(Notification.permission);
        }
    }, []);

    // Sync state back to parent for persistence
    useEffect(() => {
        if (onStateChange) {
            onStateChange({
                results,
                previousResults,
                lastScanTime,
                source,
                filter,
                refreshInterval,
                alertsEnabled,
                sectorFilter,
            });
        }
    }, [results, previousResults, lastScanTime, source, filter, refreshInterval, alertsEnabled, sectorFilter, onStateChange]);

    // Watchlist set for quick lookup
    const watchlistSet = useMemo(() => {
        return new Set(watchlistSymbols.map(s => `${s.symbol}-${s.exchange || 'NSE'}`));
    }, [watchlistSymbols]);

    // Get stocks to scan based on source
    const stocksToScan = useMemo((): StockItem[] => {
        if (source === 'watchlist') {
            return watchlistSymbols.map(s => ({
                symbol: s.symbol,
                exchange: s.exchange || 'NSE',
                name: s.symbol,
            }));
        }
        return getStockList(source) as StockItem[];
    }, [source, watchlistSymbols]);

    // Handle scan
    const handleScan = useCallback((): void => {
        if (stocksToScan.length === 0) {
            setError('No stocks to scan. Add stocks to your watchlist or select a different source.');
            return;
        }

        setError(null);

        if (onStartScan) {
            onStartScan(stocksToScan, alertsEnabled, showToast);
        }
    }, [stocksToScan, alertsEnabled, showToast, onStartScan]);

    // Cleanup intervals on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (countdownRef.current) clearInterval(countdownRef.current);
        };
    }, []);

    // Event-driven: No auto-refresh polling - manual scan only
    // Clears countdown since we're not using auto-refresh anymore
    useEffect(() => {
        setCountdown(0);
        // Clean up any existing intervals
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
        }
    }, [refreshInterval]);

    // Format countdown display
    const formatCountdown = (seconds: number): string => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Clear previous results when source changes
    useEffect(() => {
        setPreviousResults([]);
    }, [source]);

    // Filter and sort results with delta comparison
    const displayResultsWithDelta = useMemo((): ScanResultWithDelta[] => {
        let resultsWithSector = results.map(item => ({
            ...item,
            sector: getSector(item.symbol),
        }));

        if (sectorFilter !== 'All') {
            resultsWithSector = resultsWithSector.filter(item => item.sector === sectorFilter);
        }

        const filtered = filterResults(resultsWithSector as any, filter) as ScanResultItem[];
        const sorted = sortResults(filtered as any, sortBy as any, sortDir) as ScanResultItem[];

        const prevMap = new Map(previousResults.map(r => [`${r.symbol}-${r.exchange}`, r]));

        return sorted.map(item => {
            const key = `${item.symbol}-${item.exchange}`;
            const prev = prevMap.get(key);

            return {
                ...item,
                isNew: !prev && previousResults.length > 0,
                signalFlipped: !!(prev && prev.direction !== item.direction && prev.direction && item.direction),
                streakChange: (prev
                    ? (item.streak > prev.streak ? 'up' : item.streak < prev.streak ? 'down' : 'same')
                    : 'same') as StreakChange,
                previousStreak: prev?.streak || 0,
            };
        });
    }, [results, filter, sortBy, sortDir, previousResults, sectorFilter]);

    // Handle sort click
    const handleSortClick = useCallback((column: string): void => {
        if (sortBy === column) {
            setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortDir('desc');
        }
    }, [sortBy]);

    // Column resize handlers
    const handleResizeStart = useCallback((e: React.MouseEvent, column: string): void => {
        e.preventDefault();
        e.stopPropagation();
        setResizing(column);
        startXRef.current = e.clientX;
        startWidthRef.current = columnWidths[column as keyof ColumnWidths];
    }, [columnWidths]);

    useEffect(() => {
        if (!resizing) return;

        const handleMouseMove = (e: MouseEvent): void => {
            const diff = e.clientX - startXRef.current;
            const newWidth = Math.max(MIN_COLUMN_WIDTH, startWidthRef.current + diff);
            setColumnWidths(prev => ({
                ...prev,
                [resizing]: newWidth
            }));
        };

        const handleMouseUp = (): void => {
            setResizing(null);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [resizing]);

    // Keyboard navigation
    const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>): void => {
        if (displayResultsWithDelta.length === 0) return;

        let nextIndex = focusedIndex;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            nextIndex = focusedIndex < 0 ? 0 : Math.min(focusedIndex + 1, displayResultsWithDelta.length - 1);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            nextIndex = focusedIndex < 0 ? 0 : Math.max(focusedIndex - 1, 0);
        } else if (e.key === 'Enter' && focusedIndex >= 0) {
            e.preventDefault();
            const item = displayResultsWithDelta[focusedIndex];
            if (item) onSymbolSelect({ symbol: item.symbol, exchange: item.exchange });
            return;
        } else {
            return;
        }

        if (nextIndex !== focusedIndex) {
            setFocusedIndex(nextIndex);
            const item = displayResultsWithDelta[nextIndex];
            if (item) {
                onSymbolSelect({ symbol: item.symbol, exchange: item.exchange });
            }
        }
    }, [displayResultsWithDelta, focusedIndex, onSymbolSelect]);

    // Handle row click
    const handleRowClick = useCallback((item: ScanResultItem, index: number): void => {
        setFocusedIndex(index);
        onSymbolSelect({ symbol: item.symbol, exchange: item.exchange });
    }, [onSymbolSelect]);

    // Handle add to watchlist
    const handleAddToWatchlist = useCallback((symbolData: SymbolData): void => {
        if (onAddToWatchlist) {
            onAddToWatchlist(symbolData);
            if (showToast) {
                showToast(`${symbolData.symbol} added to watchlist`, 'success');
            }
        }
    }, [onAddToWatchlist, showToast]);

    // Request notification permission
    const requestNotificationPermission = useCallback(async (): Promise<void> => {
        if ('Notification' in window && notificationPermission !== 'granted') {
            const permission = await Notification.requestPermission();
            setNotificationPermission(permission);
        }
    }, [notificationPermission]);

    // Toggle alerts
    const toggleAlerts = useCallback((): void => {
        if (!alertsEnabled && notificationPermission === 'default') {
            requestNotificationPermission();
        }
        setAlertsEnabled(prev => !prev);
    }, [alertsEnabled, notificationPermission, requestNotificationPermission]);

    // Get sort indicator
    const getSortIndicator = (column: string): string | null => {
        if (sortBy !== column) return null;
        return sortDir === 'asc' ? ' ↑' : ' ↓';
    };

    // Render skeleton
    const renderSkeleton = (): React.ReactElement => (
        <div className={styles.skeletonContainer}>
            {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className={styles.skeletonRow}>
                    <div className={styles.skeletonCell} style={{ width: '80px' }} />
                    <div className={styles.skeletonCell} style={{ width: '55px' }} />
                    <div className={styles.skeletonCell} style={{ width: '45px' }} />
                    <div className={styles.skeletonCell} style={{ width: '50px' }} />
                    <div className={styles.skeletonCell} style={{ width: '60px' }} />
                </div>
            ))}
        </div>
    );

    // Render empty state
    const renderEmptyState = (): React.ReactElement => (
        <div className={styles.emptyState}>
            <Brain size={32} className={styles.emptyIcon} />
            <p className={styles.emptyTitle}>No scan results</p>
            <p className={styles.emptySubtitle}>
                Click the refresh button to scan stocks for ANN signals
            </p>
        </div>
    );

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.title}>
                    <Brain size={16} />
                    <span>ANN Scanner</span>
                </div>
                <div className={styles.headerControls}>
                    <select
                        className={styles.intervalSelect}
                        value={refreshInterval}
                        onChange={(e: ChangeEvent<HTMLSelectElement>) => setRefreshInterval(e.target.value)}
                        disabled={isScanning}
                        title="Auto-refresh interval"
                    >
                        {REFRESH_INTERVALS.map(opt => (
                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                    </select>
                    {refreshInterval !== 'off' && countdown > 0 && (
                        <span className={styles.countdown} title="Time until next scan">
                            {formatCountdown(countdown)}
                        </span>
                    )}
                    <button
                        className={classNames(styles.refreshBtn, { [styles.spinning]: isScanning })}
                        onClick={handleScan}
                        disabled={isScanning || !isAuthenticated}
                        title={isScanning ? 'Scanning...' : 'Scan stocks'}
                    >
                        <RefreshCw size={14} />
                    </button>
                </div>
            </div>

            {/* Source Selector */}
            <div className={styles.sourceRow}>
                <select
                    className={styles.sourceSelect}
                    value={source}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setSource(e.target.value)}
                    disabled={isScanning}
                >
                    {STOCK_LIST_OPTIONS.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.name}</option>
                    ))}
                </select>
                <span className={styles.stockCount}>
                    {stocksToScan.length} stocks
                </span>
            </div>

            {/* Filter Tabs */}
            <div className={styles.filterTabs}>
                <button
                    className={classNames(styles.filterTab, { [styles.active]: filter === 'all' })}
                    onClick={() => setFilter('all')}
                >
                    All
                </button>
                <button
                    className={classNames(styles.filterTab, styles.longTab, { [styles.active]: filter === 'long' })}
                    onClick={() => setFilter('long')}
                >
                    Long
                </button>
                <button
                    className={classNames(styles.filterTab, styles.shortTab, { [styles.active]: filter === 'short' })}
                    onClick={() => setFilter('short')}
                >
                    Short
                </button>
            </div>

            {/* Sector Filter */}
            <div className={styles.sectorFilter}>
                <select
                    className={styles.sectorSelect}
                    value={sectorFilter}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setSectorFilter(e.target.value)}
                    disabled={isScanning}
                >
                    {SECTORS.map(sector => (
                        <option key={sector} value={sector}>{sector}</option>
                    ))}
                </select>
                {sectorFilter !== 'All' && (
                    <span className={styles.sectorCount}>
                        {displayResultsWithDelta.length} in {sectorFilter}
                    </span>
                )}
            </div>

            {/* Progress Bar */}
            {isScanning && (
                <div className={styles.progressContainer}>
                    <div className={styles.progressBar}>
                        <div
                            className={styles.progressFill}
                            style={{ width: `${(progress.current / progress.total) * 100}%` }}
                        />
                    </div>
                    <span className={styles.progressText}>
                        Scanning {progress.current}/{progress.total}...
                    </span>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className={styles.errorMessage}>
                    <AlertCircle size={14} />
                    <span>{error}</span>
                </div>
            )}

            {/* Column Headers */}
            <div className={classNames(styles.columnHeaders, { [styles.isResizing]: resizing })}>
                <span
                    className={styles.colSymbol}
                    style={{ width: columnWidths.symbol, minWidth: MIN_COLUMN_WIDTH }}
                    onClick={() => handleSortClick('symbol')}
                >
                    Symbol{getSortIndicator('symbol')}
                </span>
                <div className={styles.resizeHandle} onMouseDown={(e) => handleResizeStart(e, 'symbol')} />
                <span
                    className={styles.colSignal}
                    style={{ width: columnWidths.signal, minWidth: MIN_COLUMN_WIDTH }}
                    onClick={() => handleSortClick('direction')}
                >
                    Signal{getSortIndicator('direction')}
                </span>
                <div className={styles.resizeHandle} onMouseDown={(e) => handleResizeStart(e, 'signal')} />
                <span
                    className={styles.colStrength}
                    style={{ width: columnWidths.strength, minWidth: MIN_COLUMN_WIDTH }}
                    title="Signal strength based on NN output magnitude"
                >
                    Str
                </span>
                <div className={styles.resizeHandle} onMouseDown={(e) => handleResizeStart(e, 'strength')} />
                <span
                    className={styles.colStreak}
                    style={{ width: columnWidths.streak, minWidth: MIN_COLUMN_WIDTH }}
                    onClick={() => handleSortClick('streak')}
                >
                    Days{getSortIndicator('streak')}
                </span>
                <div className={styles.resizeHandle} onMouseDown={(e) => handleResizeStart(e, 'streak')} />
                <span
                    className={styles.colNnOutput}
                    style={{ width: columnWidths.nnOutput, minWidth: MIN_COLUMN_WIDTH }}
                    onClick={() => handleSortClick('nnOutput')}
                >
                    NN{getSortIndicator('nnOutput')}
                </span>
                <span
                    className={styles.colAction}
                    style={{ width: columnWidths.action }}
                    title="Add to watchlist"
                >
                    +
                </span>
            </div>

            {/* Content Area */}
            <div className={styles.content}>
                {!isAuthenticated ? (
                    <div className={styles.emptyState}>
                        <AlertCircle size={32} className={styles.emptyIcon} />
                        <p className={styles.emptyTitle}>API not connected</p>
                        <p className={styles.emptySubtitle}>
                            Connect to OpenAlgo API to scan stocks
                        </p>
                    </div>
                ) : isScanning && results.length === 0 ? (
                    renderSkeleton()
                ) : displayResultsWithDelta.length === 0 && !isScanning ? (
                    renderEmptyState()
                ) : (
                    <div
                        className={styles.itemList}
                        ref={listRef}
                        tabIndex={0}
                        onKeyDown={handleKeyDown}
                    >
                        {displayResultsWithDelta.map((item, index) => (
                            <ANNScannerItem
                                key={`${item.symbol}-${item.exchange}`}
                                item={item}
                                isFocused={index === focusedIndex}
                                onClick={() => handleRowClick(item, index)}
                                columnWidths={columnWidths}
                                isNew={item.isNew}
                                signalFlipped={item.signalFlipped}
                                streakChange={item.streakChange}
                                previousStreak={item.previousStreak}
                                isInWatchlist={watchlistSet.has(`${item.symbol}-${item.exchange}`)}
                                onAddToWatchlist={handleAddToWatchlist}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className={styles.footer}>
                {lastScanTime && !isScanning && (
                    <span className={styles.lastScan}>
                        Last: {lastScanTime.toLocaleTimeString()}
                    </span>
                )}
                <button
                    className={classNames(styles.alertToggle, { [styles.alertsOn]: alertsEnabled })}
                    onClick={toggleAlerts}
                    title={alertsEnabled ? 'Alerts enabled - click to disable' : 'Alerts disabled - click to enable'}
                >
                    {alertsEnabled ? <Bell size={14} /> : <BellOff size={14} />}
                </button>
            </div>
        </div>
    );
};

export default ANNScanner;

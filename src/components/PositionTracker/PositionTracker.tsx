import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { KeyboardEvent, ChangeEvent } from 'react';
import classNames from 'classnames';
import { Plus, X, Search } from 'lucide-react';
import styles from './PositionTracker.module.css';
import PositionTrackerItem from './PositionTrackerItem';
import PositionTrackerHeader from './PositionTrackerHeader';
import { SECTORS, getSector } from './sectorMapping';

// Import extracted constants and utils
import { MARKET_OPEN, MARKET_CLOSE, TOP_N_OPTIONS, DEFAULT_COLUMN_WIDTHS, MIN_COLUMN_WIDTH } from './constants';
import { getMarketStatus } from './utils';

type SourceMode = 'watchlist' | 'custom';
type FilterMode = 'all' | 'gainers' | 'losers';

interface SymbolData {
    symbol: string;
    exchange: string;
}

interface WatchlistItem {
    symbol: string;
    exchange?: string;
    last?: string | number;
    open?: string | number;
    volume?: string | number;
    chgP?: string | number;
}

interface ColumnWidths {
    rank: number;
    move: number;
    symbol: number;
    ltp: number;
    change: number;
    volume: number;
}

interface RankedItem {
    symbol: string;
    exchange: string;
    ltp: number;
    openPrice: number;
    volume: number;
    percentChange: number;
    sector: string;
    currentRank: number;
    previousRank: number;
    rankChange: number;
}

interface DisplayItem extends RankedItem {
    isVolumeSpike: boolean;
}

interface MarketState {
    status: string;
    isOpen: boolean;
}

export interface PositionTrackerProps {
    sourceMode: SourceMode;
    customSymbols?: SymbolData[];
    watchlistData?: WatchlistItem[];
    isLoading?: boolean;
    onSourceModeChange: (mode: SourceMode) => void;
    onCustomSymbolsChange: (symbols: SymbolData[]) => void;
    onSymbolSelect: (data: SymbolData) => void;
    isAuthenticated: boolean;
}

const PositionTracker: React.FC<PositionTrackerProps> = ({
    sourceMode,
    customSymbols,
    watchlistData,
    isLoading,
    onSourceModeChange,
    onCustomSymbolsChange,
    onSymbolSelect,
    isAuthenticated,
}) => {
    const [showAddSymbol, setShowAddSymbol] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [marketState, setMarketState] = useState<MarketState>(() => getMarketStatus());
    const [filterMode, setFilterMode] = useState<FilterMode>('all');
    const [sectorFilter, setSectorFilter] = useState('All');
    const [topNCount, setTopNCount] = useState(10);
    const [focusedIndex, setFocusedIndex] = useState(-1);

    const [columnWidths, setColumnWidths] = useState<ColumnWidths>(DEFAULT_COLUMN_WIDTHS);
    const [resizing, setResizing] = useState<string | null>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const previousRanksRef = useRef<Map<string, number>>(new Map());
    const [openingRanks, setOpeningRanks] = useState<Record<string, number>>({});
    const hasSetOpeningRanks = useRef(false);
    const startXRef = useRef(0);
    const startWidthRef = useRef(0);

    // Event-driven: Check market status on mount and visibility change only (no polling)
    useEffect(() => {
        const checkStatus = () => setMarketState(getMarketStatus());

        // Initial check
        checkStatus();

        // Re-check when tab becomes visible
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkStatus();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    // Focus search input when add symbol panel opens
    useEffect(() => {
        if (showAddSymbol && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [showAddSymbol]);

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

    // Calculate % change from opening price (intraday)
    const calculateIntradayChange = (item: WatchlistItem): number => {
        const ltp = parseFloat(String(item.last)) || 0;
        const openPrice = parseFloat(String(item.open)) || 0;

        if (openPrice > 0 && ltp > 0) {
            return ((ltp - openPrice) / openPrice) * 100;
        }
        return parseFloat(String(item.chgP)) || 0;
    };

    // Process and rank the data
    const rankedData = useMemo((): RankedItem[] => {
        let dataToRank: Omit<RankedItem, 'currentRank' | 'previousRank' | 'rankChange'>[] = [];

        if (sourceMode === 'watchlist') {
            dataToRank = (watchlistData || []).map(item => ({
                symbol: item.symbol,
                exchange: item.exchange || 'NSE',
                ltp: parseFloat(String(item.last)) || 0,
                openPrice: parseFloat(String(item.open)) || 0,
                volume: parseFloat(String(item.volume)) || 0,
                percentChange: calculateIntradayChange(item),
                sector: getSector(item.symbol),
            }));
        } else {
            const customSet = new Set(
                (customSymbols || []).map(s => `${s.symbol}-${s.exchange || 'NSE'}`)
            );
            dataToRank = (watchlistData || [])
                .filter(item => customSet.has(`${item.symbol}-${item.exchange || 'NSE'}`))
                .map(item => ({
                    symbol: item.symbol,
                    exchange: item.exchange || 'NSE',
                    ltp: parseFloat(String(item.last)) || 0,
                    openPrice: parseFloat(String(item.open)) || 0,
                    volume: parseFloat(String(item.volume)) || 0,
                    percentChange: calculateIntradayChange(item),
                    sector: getSector(item.symbol),
                }));
        }

        const sorted = [...dataToRank].sort((a, b) => b.percentChange - a.percentChange);

        // eslint-disable-next-line react-hooks/refs -- intentional: reading previousRanks across renders without causing re-renders
        return sorted.map((item, index) => {
            const key = `${item.symbol}-${item.exchange}`;
            const previousRank = previousRanksRef.current.get(key) ?? (index + 1);
            const currentRank = index + 1;
            const rankChange = previousRank - currentRank;

            return {
                ...item,
                currentRank,
                previousRank,
                rankChange,
            };
        });
    }, [watchlistData, sourceMode, customSymbols]);

    // Update previous ranks after each committed render
    useEffect(() => {
        rankedData.forEach(item => {
            const key = `${item.symbol}-${item.exchange}`;
            previousRanksRef.current.set(key, item.currentRank);
        });
    }, [rankedData]);

    // Capture opening ranks once when market opens — stored in state so displayData re-renders
    useEffect(() => {
        if (marketState.isOpen && rankedData.length > 0 && !hasSetOpeningRanks.current) {
            const ranks: Record<string, number> = {};
            rankedData.forEach(item => {
                ranks[`${item.symbol}-${item.exchange}`] = item.currentRank;
            });
            setOpeningRanks(ranks);
            hasSetOpeningRanks.current = true;
        }

        if (!marketState.isOpen) {
            hasSetOpeningRanks.current = false;
            setOpeningRanks({});
        }
    }, [marketState.isOpen, rankedData]);

    // Calculate rank change from opening and volume spike detection
    const displayData = useMemo((): DisplayItem[] => {
        const totalVolume = rankedData.reduce((sum, item) => sum + (item.volume || 0), 0);
        const avgVolume = rankedData.length > 0 ? totalVolume / rankedData.length : 0;
        const spikeThreshold = avgVolume * 2;

        return rankedData.map(item => {
            const key = `${item.symbol}-${item.exchange}`;
            const openingRank = openingRanks[key];

            return {
                ...item,
                rankChange: openingRank !== undefined
                    ? openingRank - item.currentRank
                    : 0,
                isVolumeSpike: item.volume > spikeThreshold,
            };
        });
    }, [rankedData, openingRanks]);

    // Filter data based on sector and filter mode
    const filteredData = useMemo((): DisplayItem[] => {
        let data = displayData;
        if (sectorFilter !== 'All') {
            data = data.filter(item => item.sector === sectorFilter);
        }

        if (filterMode === 'all') return data;

        if (filterMode === 'gainers') {
            return data
                .filter(item => item.percentChange > 0)
                .sort((a, b) => b.percentChange - a.percentChange)
                .slice(0, topNCount);
        }

        if (filterMode === 'losers') {
            return data
                .filter(item => item.percentChange < 0)
                .sort((a, b) => a.percentChange - b.percentChange)
                .slice(0, topNCount);
        }

        return data;
    }, [displayData, filterMode, sectorFilter, topNCount]);

    // Clamp focused index when data changes
    useEffect(() => {
        if (focusedIndex >= filteredData.length) {
            setFocusedIndex(filteredData.length - 1);
        }
    }, [filteredData.length, focusedIndex]);

    const handleAddSymbol = useCallback((symbol: string, exchange = 'NSE'): void => {
        if (sourceMode !== 'custom') return;

        const exists = (customSymbols || []).some(
            s => s.symbol === symbol && s.exchange === exchange
        );
        if (!exists) {
            onCustomSymbolsChange([...(customSymbols || []), { symbol, exchange }]);
        }
        setSearchQuery('');
        setShowAddSymbol(false);
    }, [sourceMode, customSymbols, onCustomSymbolsChange]);

    const handleRemoveSymbol = useCallback((symbol: string, exchange: string): void => {
        if (sourceMode !== 'custom') return;

        onCustomSymbolsChange(
            (customSymbols || []).filter(s => !(s.symbol === symbol && s.exchange === exchange))
        );
    }, [sourceMode, customSymbols, onCustomSymbolsChange]);

    const handleRowClick = useCallback((item: DisplayItem): void => {
        onSymbolSelect({ symbol: item.symbol, exchange: item.exchange });
    }, [onSymbolSelect]);

    // Keyboard navigation handler
    const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>): void => {
        if (filteredData.length === 0) return;

        let nextIndex = focusedIndex;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            nextIndex = focusedIndex < 0 ? 0 : Math.min(focusedIndex + 1, filteredData.length - 1);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            nextIndex = focusedIndex < 0 ? 0 : Math.max(focusedIndex - 1, 0);
        } else if (e.key === 'Enter' && focusedIndex >= 0 && focusedIndex < filteredData.length) {
            e.preventDefault();
            const item = filteredData[focusedIndex];
            if (item) onSymbolSelect({ symbol: item.symbol, exchange: item.exchange });
            return;
        } else {
            return;
        }

        if (nextIndex !== focusedIndex) {
            setFocusedIndex(nextIndex);
            const item = filteredData[nextIndex];
            if (item) {
                onSymbolSelect({ symbol: item.symbol, exchange: item.exchange });
            }
        }
    }, [filteredData, focusedIndex, onSymbolSelect]);

    const handleItemClick = useCallback((item: DisplayItem, index: number): void => {
        setFocusedIndex(index);
        onSymbolSelect({ symbol: item.symbol, exchange: item.exchange });
    }, [onSymbolSelect]);

    // Render loading skeleton
    const renderSkeleton = (): React.ReactElement => (
        <div className={styles.skeletonContainer}>
            {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className={styles.skeletonRow}>
                    <div className={styles.skeletonCell} style={{ width: '32px' }} />
                    <div className={styles.skeletonCell} style={{ width: '40px' }} />
                    <div className={styles.skeletonCell} style={{ width: '70px' }} />
                    <div className={styles.skeletonCell} style={{ width: '70px' }} />
                    <div className={styles.skeletonCell} style={{ width: '60px' }} />
                    <div className={styles.skeletonCell} style={{ width: '55px' }} />
                </div>
            ))}
        </div>
    );

    // Render empty state
    const renderEmptyState = (): React.ReactElement => (
        <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>
                {sourceMode === 'watchlist'
                    ? 'No symbols in watchlist'
                    : 'No symbols added'}
            </p>
            <p className={styles.emptySubtitle}>
                {sourceMode === 'watchlist'
                    ? 'Add symbols to your watchlist to track positions'
                    : 'Click + to add symbols to track'}
            </p>
        </div>
    );

    return (
        <div className={styles.positionTracker}>
            <PositionTrackerHeader
                sourceMode={sourceMode}
                onSourceModeChange={onSourceModeChange}
                marketStatus={marketState.status}
                isMarketOpen={marketState.isOpen}
                symbolCount={rankedData.length}
            />

            {/* Filter Tabs */}
            <div className={styles.filterTabs}>
                <button
                    className={`${styles.filterTab} ${filterMode === 'all' ? styles.filterTabActive : ''}`}
                    onClick={() => setFilterMode('all')}
                >
                    All
                </button>
                <button
                    className={`${styles.filterTab} ${styles.filterTabGainers} ${filterMode === 'gainers' ? styles.filterTabActive : ''}`}
                    onClick={() => setFilterMode('gainers')}
                >
                    Top {topNCount} Gainers
                </button>
                <button
                    className={`${styles.filterTab} ${styles.filterTabLosers} ${filterMode === 'losers' ? styles.filterTabActive : ''}`}
                    onClick={() => setFilterMode('losers')}
                >
                    Top {topNCount} Losers
                </button>
                <select
                    className={styles.topNSelect}
                    value={topNCount}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setTopNCount(Number(e.target.value))}
                >
                    {TOP_N_OPTIONS.map(n => (
                        <option key={n} value={n}>Top {n}</option>
                    ))}
                </select>
            </div>

            {/* Sector Filter */}
            <div className={styles.sectorFilter}>
                <select
                    className={styles.sectorSelect}
                    value={sectorFilter}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setSectorFilter(e.target.value)}
                >
                    {SECTORS.map(sector => (
                        <option key={sector} value={sector}>{sector}</option>
                    ))}
                </select>
            </div>

            {/* Column Headers */}
            <div className={classNames(styles.columnHeaders, { [styles.isResizing]: resizing })}>
                <span className={styles.colRank} style={{ width: columnWidths.rank, minWidth: MIN_COLUMN_WIDTH }}>#</span>
                <div className={styles.resizeHandle} onMouseDown={(e) => handleResizeStart(e, 'rank')} />
                <span className={styles.colMove} style={{ width: columnWidths.move, minWidth: MIN_COLUMN_WIDTH }}>Move</span>
                <div className={styles.resizeHandle} onMouseDown={(e) => handleResizeStart(e, 'move')} />
                <span className={styles.colSymbol} style={{ width: columnWidths.symbol, minWidth: MIN_COLUMN_WIDTH }}>Symbol</span>
                <div className={styles.resizeHandle} onMouseDown={(e) => handleResizeStart(e, 'symbol')} />
                <span className={styles.colLtp} style={{ width: columnWidths.ltp, minWidth: MIN_COLUMN_WIDTH }}>LTP</span>
                <div className={styles.resizeHandle} onMouseDown={(e) => handleResizeStart(e, 'ltp')} />
                <span className={styles.colChange} style={{ width: columnWidths.change, minWidth: MIN_COLUMN_WIDTH }}>% Chg</span>
                <div className={styles.resizeHandle} onMouseDown={(e) => handleResizeStart(e, 'change')} />
                <span className={styles.colVolume} style={{ width: columnWidths.volume, minWidth: MIN_COLUMN_WIDTH }}>Vol</span>
                {sourceMode === 'custom' && <span className={styles.colAction} />}
            </div>

            {/* Content Area */}
            <div className={styles.content}>
                {!isAuthenticated ? (
                    <div className={styles.emptyState}>
                        <p className={styles.emptyTitle}>API not connected</p>
                        <p className={styles.emptySubtitle}>
                            Connect to OpenAlgo API to track positions
                        </p>
                    </div>
                ) : isLoading ? (
                    renderSkeleton()
                ) : filteredData.length === 0 ? (
                    renderEmptyState()
                ) : (
                    <div
                        className={styles.itemList}
                        ref={listRef}
                        tabIndex={0}
                        onKeyDown={handleKeyDown}
                    >
                        {filteredData.map((item, index) => (
                            <PositionTrackerItem
                                key={`${item.symbol}-${item.exchange}`}
                                item={item}
                                isFocused={index === focusedIndex}
                                onClick={() => handleItemClick(item, index)}
                                onRemove={sourceMode === 'custom' ? () => handleRemoveSymbol(item.symbol, item.exchange) : undefined}
                                showRemove={sourceMode === 'custom'}
                                columnWidths={columnWidths}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Add Symbol Button (Custom mode only) */}
            {sourceMode === 'custom' && isAuthenticated && (
                <div className={styles.footer}>
                    {showAddSymbol ? (
                        <div className={styles.addSymbolPanel}>
                            <div className={styles.searchInputWrapper}>
                                <Search size={14} className={styles.searchIcon} />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    className={styles.searchInput}
                                    placeholder="Enter symbol (e.g., RELIANCE)"
                                    value={searchQuery}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value.toUpperCase())}
                                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                        if (e.key === 'Enter' && searchQuery.trim()) {
                                            handleAddSymbol(searchQuery.trim());
                                        } else if (e.key === 'Escape') {
                                            setShowAddSymbol(false);
                                            setSearchQuery('');
                                        }
                                    }}
                                />
                                <button
                                    className={styles.cancelBtn}
                                    onClick={() => {
                                        setShowAddSymbol(false);
                                        setSearchQuery('');
                                    }}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                            <p className={styles.addHint}>Press Enter to add, Escape to cancel</p>
                        </div>
                    ) : (
                        <button
                            className={styles.addButton}
                            onClick={() => setShowAddSymbol(true)}
                        >
                            <Plus size={16} />
                            <span>Add Symbol</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default PositionTracker;

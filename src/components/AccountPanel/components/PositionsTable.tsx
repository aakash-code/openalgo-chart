/**
 * PositionsTable Component
 * Renders the positions table for AccountPanel with search and filter
 */
import React, { useState, useMemo, useCallback, memo } from 'react';
import type { MouseEvent, ChangeEvent, ReactNode } from 'react';
import { LogOut, Search, X, Filter } from 'lucide-react';
import styles from '../AccountPanel.module.css';
import { formatCurrency, sortData } from '../utils/accountFormatters';
import { BaseTable } from '../../shared';

interface Position {
    symbol: string;
    exchange: string;
    product: string;
    quantity: number;
    average_price: string | number;
    ltp: string | number;
    pnl: string | number;
    timestamp?: string;
}

interface SortConfig {
    key: string | null;
    direction: 'asc' | 'desc';
}

interface Filters {
    exchange: string[];
    product: string[];
}

interface LastUpdateTime {
    [key: string]: number;
}

interface Column {
    key: string;
    title: string;
    width: string;
    align?: 'left' | 'center' | 'right';
    sortable?: boolean;
    render?: (row: Position) => ReactNode;
}

export interface PositionsTableProps {
    positions: Position[];
    onRowClick?: (symbol: string, exchange: string) => void;
    onExitPosition: (position: Position, e: MouseEvent<HTMLButtonElement>) => void;
    lastUpdateTime?: LastUpdateTime;
    showSearchFilter?: boolean;
}

const PositionsTable: React.FC<PositionsTableProps> = ({
    positions,
    onRowClick,
    onExitPosition,
    lastUpdateTime = {},
    showSearchFilter = true
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState<Filters>({
        exchange: [],
        product: []
    });
    const [showFilters, setShowFilters] = useState(false);
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'asc' });

    // Check if value was recently updated (within 1 second)
    const isRecentlyUpdated = useCallback((symbol: string, exchange: string): boolean => {
        const key = `${symbol}-${exchange}`;
        const updateTime = lastUpdateTime[key];
        if (!updateTime) return false;
        return Date.now() - updateTime < 1000; // 1 second pulse
    }, [lastUpdateTime]);

    // Get unique values for filters
    const uniqueExchanges = useMemo(() => {
        return [...new Set(positions.map(p => p.exchange).filter(Boolean))];
    }, [positions]);

    const uniqueProducts = useMemo(() => {
        return [...new Set(positions.map(p => p.product).filter(Boolean))];
    }, [positions]);

    // Filter and sort positions
    const filteredPositions = useMemo(() => {
        const filtered = positions
            .filter(p => p.quantity !== 0) // Only open positions
            .filter(p => {
                // Search filter
                const matchesSearch = !searchTerm ||
                    p.symbol?.toLowerCase().includes(searchTerm.toLowerCase());

                // Exchange filter
                const matchesExchange = filters.exchange.length === 0 ||
                    filters.exchange.includes(p.exchange);

                // Product filter
                const matchesProduct = filters.product.length === 0 ||
                    filters.product.includes(p.product);

                return matchesSearch && matchesExchange && matchesProduct;
            });

        // Apply sorting if configured, otherwise sort by timestamp
        if (sortConfig.key) {
            return sortData(filtered, sortConfig);
        }
        return filtered.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
    }, [positions, searchTerm, filters, sortConfig]);

    // Handle filter toggle
    const handleFilterToggle = useCallback((filterType: keyof Filters, value: string): void => {
        setFilters(prev => {
            const currentFilters = prev[filterType];
            const newFilters = currentFilters.includes(value)
                ? currentFilters.filter(v => v !== value)
                : [...currentFilters, value];
            return { ...prev, [filterType]: newFilters };
        });
    }, []);

    // Clear all filters
    const handleClearFilters = useCallback((): void => {
        setSearchTerm('');
        setFilters({ exchange: [], product: [] });
    }, []);

    // Handle column sorting
    const handleSort = useCallback((key: string): void => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    }, []);

    const hasActiveFilters = searchTerm || filters.exchange.length > 0 || filters.product.length > 0;

    // Define columns for BaseTable
    const columns: Column[] = useMemo(() => [
        {
            key: 'symbol',
            title: 'Symbol',
            width: '16%',
            sortable: true,
            render: (row: Position) => <span className={styles.symbolCell}>{row.symbol}</span>
        },
        { key: 'exchange', title: 'Exchange', width: '8%' },
        { key: 'product', title: 'Product', width: '8%' },
        {
            key: 'quantity',
            title: 'Qty',
            width: '8%',
            align: 'right' as const,
            sortable: true,
            render: (row: Position) => (
                <span className={row.quantity > 0 ? styles.positive : styles.negative}>
                    {row.quantity > 0 ? '+' : ''}{row.quantity}
                </span>
            )
        },
        {
            key: 'average_price',
            title: 'Avg Price',
            width: '11%',
            align: 'right' as const,
            sortable: true,
            render: (row: Position) => formatCurrency(parseFloat(String(row.average_price || 0)))
        },
        {
            key: 'ltp',
            title: 'LTP',
            width: '11%',
            align: 'right' as const,
            sortable: true,
            render: (row: Position) => {
                const isPulsing = isRecentlyUpdated(row.symbol, row.exchange);
                return (
                    <span className={isPulsing ? styles.pulse : ''}>
                        {formatCurrency(parseFloat(String(row.ltp || 0)))}
                    </span>
                );
            }
        },
        {
            key: 'value',
            title: 'Value',
            width: '11%',
            align: 'right' as const,
            render: (row: Position) => {
                const ltp = parseFloat(String(row.ltp || 0));
                const qty = parseFloat(String(row.quantity || 0));
                const value = Math.abs(ltp * qty);
                const isPulsing = isRecentlyUpdated(row.symbol, row.exchange);
                return (
                    <span className={isPulsing ? styles.pulse : ''}>
                        {formatCurrency(value)}
                    </span>
                );
            }
        },
        {
            key: 'pnl',
            title: 'P&L',
            width: '10%',
            align: 'right' as const,
            sortable: true,
            render: (row: Position) => {
                const pnl = parseFloat(String(row.pnl || 0));
                const isPulsing = isRecentlyUpdated(row.symbol, row.exchange);
                return (
                    <span className={`
                        ${pnl >= 0 ? styles.positive : styles.negative}
                        ${isPulsing ? styles.pulse : ''}
                    `}>
                        {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
                    </span>
                );
            }
        },
        {
            key: 'pnlPercent',
            title: 'P&L %',
            width: '9%',
            align: 'right' as const,
            render: (row: Position) => {
                const pnl = parseFloat(String(row.pnl || 0));
                const avgPrice = parseFloat(String(row.average_price || 0));
                const qty = parseFloat(String(row.quantity || 0));
                const costBasis = Math.abs(avgPrice * qty);
                const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
                const isPulsing = isRecentlyUpdated(row.symbol, row.exchange);
                return (
                    <span className={`
                        ${pnlPercent >= 0 ? styles.positive : styles.negative}
                        ${isPulsing ? styles.pulse : ''}
                    `}>
                        {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                    </span>
                );
            }
        },
        {
            key: 'action',
            title: 'Action',
            width: '8%',
            align: 'center' as const,
            render: (row: Position) => (
                <button
                    className={styles.exitBtn}
                    onClick={(e: MouseEvent<HTMLButtonElement>) => {
                        e.stopPropagation();
                        onExitPosition(row, e);
                    }}
                    title={`Exit position - ${row.quantity > 0 ? 'SELL' : 'BUY'} ${Math.abs(row.quantity)} qty`}
                >
                    <LogOut size={12} />
                    <span>Exit</span>
                </button>
            )
        }
    ], [isRecentlyUpdated, onExitPosition]);

    const handleRowClick = useCallback((row: Position): void => {
        if (onRowClick) {
            onRowClick(row.symbol, row.exchange);
        }
    }, [onRowClick]);

    if (positions.filter(p => p.quantity !== 0).length === 0) {
        return (
            <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>📊</span>
                <p>No open positions</p>
            </div>
        );
    }

    return (
        <div className={styles.tableContainer}>
            {/* Search and Filter Bar */}
            {showSearchFilter && (
                <div className={styles.tableControls}>
                    <div className={styles.searchBar}>
                        <Search size={14} className={styles.searchIcon} />
                        <input
                            type="text"
                            placeholder="Search symbol..."
                            value={searchTerm}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                            className={styles.searchInput}
                        />
                        {searchTerm && (
                            <X
                                size={14}
                                className={styles.clearIcon}
                                onClick={() => setSearchTerm('')}
                            />
                        )}
                    </div>

                    <button
                        className={`${styles.filterBtn} ${hasActiveFilters ? styles.filterActive : ''}`}
                        onClick={() => setShowFilters(!showFilters)}
                        title="Toggle filters"
                    >
                        <Filter size={14} />
                        <span>Filters</span>
                        {hasActiveFilters && <span className={styles.filterCount}>
                            {filters.exchange.length + filters.product.length}
                        </span>}
                    </button>

                    {hasActiveFilters && (
                        <button
                            className={styles.clearFiltersBtn}
                            onClick={handleClearFilters}
                            title="Clear all filters"
                        >
                            <X size={12} />
                            <span>Clear</span>
                        </button>
                    )}
                </div>
            )}

            {/* Filter Dropdowns */}
            {showFilters && (
                <div className={styles.filterPanel}>
                    <div className={styles.filterGroup}>
                        <label>Exchange</label>
                        <div className={styles.filterOptions}>
                            {uniqueExchanges.map(exchange => (
                                <label key={exchange} className={styles.filterOption}>
                                    <input
                                        type="checkbox"
                                        checked={filters.exchange.includes(exchange)}
                                        onChange={() => handleFilterToggle('exchange', exchange)}
                                    />
                                    <span>{exchange}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className={styles.filterGroup}>
                        <label>Product</label>
                        <div className={styles.filterOptions}>
                            {uniqueProducts.map(product => (
                                <label key={product} className={styles.filterOption}>
                                    <input
                                        type="checkbox"
                                        checked={filters.product.includes(product)}
                                        onChange={() => handleFilterToggle('product', product)}
                                    />
                                    <span>{product}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Results Count */}
            {hasActiveFilters && (
                <div className={styles.resultsCount}>
                    Showing {filteredPositions.length} of {positions.filter(p => p.quantity !== 0).length} positions
                </div>
            )}

            {/* Use BaseTable */}
            <BaseTable
                columns={columns as any}
                data={filteredPositions as any}
                onSort={handleSort}
                sortConfig={sortConfig}
                onRowClick={handleRowClick as any}
                keyField="symbol"
                emptyState={
                    <div className={styles.emptyState}>
                        <span className={styles.emptyIcon}>🔍</span>
                        <p>No positions match your filters</p>
                        <button className={styles.clearFiltersBtn} onClick={handleClearFilters}>
                            Clear Filters
                        </button>
                    </div>
                }
            />
        </div>
    );
};

export default memo(PositionsTable);

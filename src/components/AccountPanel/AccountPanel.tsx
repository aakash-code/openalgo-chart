import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import type { MouseEvent, ChangeEvent, ReactNode } from 'react';
import { ChevronDown, ChevronUp, RefreshCw, X, Wallet, Minus, Maximize2, Minimize2, LogOut, XCircle, Wifi, WifiOff, Settings, Search, Filter } from 'lucide-react';
import styles from './AccountPanel.module.css';
import { ping, placeOrder, modifyOrder, cancelOrder, subscribeToMultiTicker } from '../../services/openalgo';
import ExitPositionModal from '../ExitPositionModal';
import ModifyOrderModal from './components/ModifyOrderModal';
import CancelOrderModal from './components/CancelOrderModal';
import { useOrders } from '../../context/OrderContext';

// Import extracted components
import { PositionsTable, ClosedPositionsTable, OrdersTable, HoldingsTable, TradesTable, TableSettingsPanel } from './components';

// Import hooks
import { useTablePreferences } from './hooks/useTablePreferences';

// Import constants and formatters
import { TABS, AUTO_REFRESH_INTERVAL_MS } from './constants/accountConstants';
import { formatCurrency, formatPnL, calculateOrderStats, isOpenOrderStatus } from './utils/accountFormatters';
import { debugOrderCancellation } from './utils/orderDebugger';

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

interface Order {
    symbol: string;
    exchange: string;
    action: string;
    pricetype: string;
    product: string;
    quantity: string | number;
    price: string | number;
    order_status: string;
    orderid?: string;
    timestamp?: string;
}

interface Holding {
    symbol: string;
    exchange: string;
    quantity: number;
    close?: number;
    ltp?: number;
    pnl: string | number;
    pnlpercent: string | number;
}

interface Trade {
    symbol: string;
    exchange: string;
    action: string;
    quantity: number;
    average_price: number;
    trade_value?: string | number;
    timestamp?: string;
}

interface Funds {
    availablecash?: string | number;
    utiliseddebits?: string | number;
    collateral?: string | number;
    m2mrealized?: string | number;
    m2munrealized?: string | number;
}

interface TickData {
    symbol: string;
    exchange: string;
    last: number;
}

interface SymbolSelection {
    symbol: string;
    exchange: string;
}

interface LastUpdateTime {
    [key: string]: number;
}

interface PositionsFilters {
    exchange: string[];
    product: string[];
}

interface SettingsPanelPosition {
    top: number;
    right: number;
}

export interface AccountPanelProps {
    isOpen: boolean;
    onClose: () => void;
    isAuthenticated: boolean;
    onSymbolSelect?: (selection: SymbolSelection) => void;
    isMinimized?: boolean;
    onMinimize?: () => void;
    isMaximized?: boolean;
    onMaximize?: () => void;
    isToolbarVisible?: boolean;
    showToast?: (message: string, type?: string) => void;
}

const AccountPanel: React.FC<AccountPanelProps> = ({
    isOpen,
    onClose,
    isAuthenticated,
    onSymbolSelect,
    isMinimized = false,
    onMinimize,
    isMaximized = false,
    onMaximize,
    isToolbarVisible = true,
    showToast
}) => {
    // Get data from OrderContext
    const {
        positions: contextPositions = [],
        orders: contextOrders = [],
        holdings: contextHoldings = [],
        trades: contextTrades = [],
        funds: contextFunds = {},
        onCancelOrder,
        refresh: refreshTradingData
    } = useOrders();
    const [activeTab, setActiveTab] = useState('positions');
    const [isLoading, setIsLoading] = useState(false);
    const [brokerName, setBrokerName] = useState('');
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

    // Exit Position Modal state
    const [isExitModalOpen, setIsExitModalOpen] = useState(false);
    const [selectedPositionForExit, setSelectedPositionForExit] = useState<Position | null>(null);

    // Modify Order Modal state
    const [isModifyModalOpen, setIsModifyModalOpen] = useState(false);
    const [selectedOrderForModify, setSelectedOrderForModify] = useState<Order | null>(null);

    // Cancel Order Modal state
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [selectedOrderForCancel, setSelectedOrderForCancel] = useState<Order | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);

    // WebSocket state for real-time P&L
    const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
    const [lastUpdateTime, setLastUpdateTime] = useState<LastUpdateTime>({});
    const wsUnsubscribeRef = useRef<(() => void) | null>(null);

    // Closed positions visibility state
    const [showClosedPositions, setShowClosedPositions] = useState(true);

    // Table settings state
    const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);
    const { preferences, updatePreference } = useTablePreferences();
    const settingsButtonRef = useRef<HTMLButtonElement>(null);
    const [settingsPanelPosition, setSettingsPanelPosition] = useState<SettingsPanelPosition>({ top: 0, right: 0 });

    // Unified positions search state
    const [positionsSearchTerm, setPositionsSearchTerm] = useState('');
    const [positionsFilters, setPositionsFilters] = useState<PositionsFilters>({
        exchange: [],
        product: []
    });
    const [showPositionsFilters, setShowPositionsFilters] = useState(false);

    // Local state for positions with real-time LTP updates
    const [positions, setPositions] = useState<Position[]>(contextPositions as any);

    // Sync local positions with context when context updates
    useEffect(() => {
        setPositions(contextPositions as any);
    }, [contextPositions]);

    // Use context data directly (OrderContext provides all data)
    const funds = contextFunds as Funds;

    const orders = { orders: contextOrders as any, statistics: {} }; // Wrap for compatibility
    const holdings = { holdings: contextHoldings as any, statistics: {} as { totalholdingvalue?: number; totalprofitandloss?: number; totalpnlpercentage?: number } }; // Wrap for compatibility
    const trades = contextTrades as any as Trade[];

    // Calculate order stats using extracted utility
    const orderStats = calculateOrderStats(contextOrders);

    // Unified positions search logic
    const uniquePositionsExchanges = useMemo(() => {
        if (!Array.isArray(positions)) return [];
        return [...new Set(positions.map(p => p.exchange).filter(Boolean))];
    }, [positions]);

    const uniquePositionsProducts = useMemo(() => {
        if (!Array.isArray(positions)) return [];
        return [...new Set(positions.map(p => p.product).filter(Boolean))];
    }, [positions]);

    const filteredPositions = useMemo(() => {
        if (!Array.isArray(positions)) return [];
        return positions.filter(p => {
            const matchesSearch = !positionsSearchTerm ||
                p.symbol?.toLowerCase().includes(positionsSearchTerm.toLowerCase());
            const matchesExchange = positionsFilters.exchange.length === 0 ||
                positionsFilters.exchange.includes(p.exchange);
            const matchesProduct = positionsFilters.product.length === 0 ||
                positionsFilters.product.includes(p.product);
            return matchesSearch && matchesExchange && matchesProduct;
        });
    }, [positions, positionsSearchTerm, positionsFilters]);

    const handlePositionsFilterToggle = useCallback((filterType: keyof PositionsFilters, value: string): void => {
        setPositionsFilters(prev => {
            const currentFilters = prev[filterType];
            const newFilters = currentFilters.includes(value)
                ? currentFilters.filter(v => v !== value)
                : [...currentFilters, value];
            return { ...prev, [filterType]: newFilters };
        });
    }, []);

    const handleClearPositionsFilters = useCallback((): void => {
        setPositionsSearchTerm('');
        setPositionsFilters({ exchange: [], product: [] });
    }, []);

    // Calculate settings panel position
    const handleToggleSettingsPanel = useCallback((): void => {
        if (!isSettingsPanelOpen && settingsButtonRef.current) {
            const rect = settingsButtonRef.current.getBoundingClientRect();
            setSettingsPanelPosition({
                top: rect.bottom + 8,
                right: window.innerWidth - rect.right
            });
        }
        setIsSettingsPanelOpen(!isSettingsPanelOpen);
    }, [isSettingsPanelOpen]);

    // Refresh function - uses OrderContext refresh + fetches broker info
    const fetchAccountData = useCallback(async (): Promise<void> => {
        if (!isAuthenticated) return;

        setIsLoading(true);
        try {
            // OrderContext handles data refresh
            await refreshTradingData();

            // Fetch broker name from ping
            const pingData = await ping();
            if (pingData?.broker) {
                setBrokerName(pingData.broker);
            }
            setLastRefresh(new Date());
        } catch (error) {
            console.error('[AccountPanel] Error refreshing data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated, refreshTradingData]);

    // Initialize broker name on mount
    useEffect(() => {
        if (isOpen && isAuthenticated) {
            console.log('[AccountPanel] Using OrderContext (event-driven updates)');
            ping().then(pingData => {
                if (pingData?.broker) setBrokerName(pingData.broker);
            });
        }
    }, [isOpen, isAuthenticated]);

    // WebSocket subscription for real-time P&L updates
    useEffect(() => {
        // Only subscribe if panel is open, authenticated, and we have positions
        if (!isOpen || !isAuthenticated || !positions || positions.length === 0) {
            // Cleanup previous subscription
            if (typeof wsUnsubscribeRef.current === 'function') {
                wsUnsubscribeRef.current();
                wsUnsubscribeRef.current = null;
                setIsWebSocketConnected(false);
            }
            return;
        }

        // Get open positions (quantity !== 0)
        const openPositions = positions.filter(p => p.quantity !== 0);
        if (openPositions.length === 0) {
            if (typeof wsUnsubscribeRef.current === 'function') {
                wsUnsubscribeRef.current();
                wsUnsubscribeRef.current = null;
                setIsWebSocketConnected(false);
            }
            return;
        }

        // Cleanup previous subscription before creating new one
        if (typeof wsUnsubscribeRef.current === 'function') {
            wsUnsubscribeRef.current();
        }

        // Create subscription array
        const subscriptions = openPositions.map(pos => ({
            symbol: pos.symbol,
            exchange: pos.exchange || 'NSE'
        }));

        console.log('[AccountPanel] Subscribing to WebSocket for', subscriptions.length, 'positions');

        // Subscribe to WebSocket
        const unsubscribe = subscribeToMultiTicker(subscriptions, (tickData: TickData) => {
            // Update position with new LTP
            setPositions(prevPositions => {
                return prevPositions.map(pos => {
                    if (pos.symbol === tickData.symbol && pos.exchange === tickData.exchange) {
                        const newLtp = tickData.last;
                        const qty = parseFloat(String(pos.quantity || 0));
                        const avgPrice = parseFloat(String(pos.average_price || 0));

                        // Calculate new P&L
                        const newPnl = (newLtp - avgPrice) * qty;

                        // Mark update time for pulse animation
                        setLastUpdateTime(prev => ({
                            ...prev,
                            [`${pos.symbol}-${pos.exchange}`]: Date.now()
                        }));

                        return {
                            ...pos,
                            ltp: newLtp,
                            pnl: newPnl
                        };
                    }
                    return pos;
                });
            });

            // Mark as connected on first update
            setIsWebSocketConnected(true);
        });

        wsUnsubscribeRef.current = unsubscribe as any;
        setIsWebSocketConnected(true);

        // Cleanup on unmount
        return () => {
            if (typeof wsUnsubscribeRef.current === 'function') {
                wsUnsubscribeRef.current();
                wsUnsubscribeRef.current = null;
                setIsWebSocketConnected(false);
            }
        };
    }, [isOpen, isAuthenticated, positions.map(p => `${p.symbol}-${p.exchange}`).join(',')]);

    // Calculate P&L summary - prefer broker's official P&L, fallback to manual calculation
    // Memoized to avoid recalculation on every render
    const { unrealizedPnL, realizedPnL } = useMemo(() => {
        // Extract broker's official P&L fields from funds
        const brokerRealizedPnL = parseFloat(String(funds?.m2mrealized || 0));
        const brokerUnrealizedPnL = parseFloat(String(funds?.m2munrealized || 0));

        // Manual calculation as fallback
        let manualUnrealizedPnL = 0;
        let manualRealizedPnL = 0;

        // Manual unrealized P&L: Sum from open positions
        positions.forEach(pos => {
            if (pos.quantity !== 0) {
                manualUnrealizedPnL += parseFloat(String(pos.pnl || 0));
            }
        });

        // Manual realized P&L: Calculate from trades
        // Group trades by symbol to match buy-sell pairs
        const tradesBySymbol: Record<string, { buys: Trade[]; sells: Trade[] }> = {};
        trades.forEach(trade => {
            const key = `${trade.symbol}-${trade.exchange}`;
            if (!tradesBySymbol[key]) {
                tradesBySymbol[key] = { buys: [], sells: [] };
            }
            if (trade.action === 'BUY') {
                tradesBySymbol[key].buys.push(trade);
            } else if (trade.action === 'SELL') {
                tradesBySymbol[key].sells.push(trade);
            }
        });

        // Calculate realized P&L from matched trades
        Object.values(tradesBySymbol).forEach(({ buys, sells }) => {
            // Simple FIFO matching for realized P&L
            sells.forEach(sell => {
                const sellValue = parseFloat(String(sell.trade_value || 0));
                const sellQty = parseFloat(String(sell.quantity || 0));
                const sellPrice = parseFloat(String(sell.average_price || 0));

                // Find matching buy cost basis (simplified - assumes trades are for closing positions)
                let matchedCost = 0;
                buys.forEach(buy => {
                    const buyPrice = parseFloat(String(buy.average_price || 0));
                    const buyQty = parseFloat(String(buy.quantity || 0));
                    // Estimate cost basis proportionally
                    matchedCost += buyPrice * buyQty;
                });

                // Realized P&L = Sell proceeds - Cost basis
                if (matchedCost > 0) {
                    manualRealizedPnL += sellValue - matchedCost;
                } else {
                    // If no matching buys, estimate based on sell value (rough approximation)
                    manualRealizedPnL += sellValue - (sellPrice * sellQty);
                }
            });
        });

        // Use broker P&L if available and non-zero, otherwise use manual calculation
        const unrealizedPnL = (funds?.m2munrealized !== undefined && funds?.m2munrealized !== null)
            ? brokerUnrealizedPnL
            : manualUnrealizedPnL;

        const realizedPnL = (funds?.m2mrealized !== undefined && funds?.m2mrealized !== null)
            ? brokerRealizedPnL
            : manualRealizedPnL;

        return { unrealizedPnL, realizedPnL };
    }, [funds, positions, trades]);

    // Extract additional margin information
    const availableMargin = parseFloat(String(funds?.availablecash || 0));
    const usedMargin = parseFloat(String(funds?.utiliseddebits || 0));
    const collateral = parseFloat(String(funds?.collateral || 0));
    const totalMargin = availableMargin + usedMargin;
    const marginUtilization = totalMargin > 0 ? (usedMargin / totalMargin) * 100 : 0;

    // Handle row click to navigate to symbol
    const handleRowClick = (symbol: string, exchange: string): void => {
        if (onSymbolSelect) {
            onSymbolSelect({ symbol, exchange: exchange || 'NSE' });
        }
    };

    // Handle exit position - opens the exit modal
    const handleExitPosition = (position: Position, e: MouseEvent<HTMLButtonElement>): void => {
        e.stopPropagation(); // Prevent row click
        setSelectedPositionForExit(position);
        setIsExitModalOpen(true);
    };

    // Handle exit modal close
    const handleExitModalClose = (): void => {
        setIsExitModalOpen(false);
        setSelectedPositionForExit(null);
    };

    // Handle exit complete - refresh data
    const handleExitComplete = (): void => {
        setTimeout(fetchAccountData, 1000);
    };

    // Handle cancel order - open modal after validation
    const handleCancelOrder = async (order: Order, e: MouseEvent<HTMLButtonElement>): Promise<void> => {
        e.stopPropagation(); // Prevent row click

        try {
            // Step 1: Refresh order book to get latest status
            console.log('[AccountPanel] Fetching latest order status before cancel...');
            await fetchAccountData();

            // Step 2: Find the order again with fresh status
            const freshOrder = orders.orders?.find((o: any) => o.orderid === order.orderid) as Order | undefined;

            if (!freshOrder) {
                console.warn('[AccountPanel] Order not found after refresh:', order.orderid);
                if (showToast) {
                    showToast('Order not found. It may have been filled or cancelled already.', 'warning');
                }
                return;
            }

            // Step 3: Check if status changed
            if (freshOrder.order_status !== order.order_status) {
                console.warn('[AccountPanel] Order status changed:', {
                    orderid: order.orderid,
                    oldStatus: order.order_status,
                    newStatus: freshOrder.order_status
                });
            }

            // Step 4: Debug the order before proceeding
            debugOrderCancellation(freshOrder);

            // Step 5: Validate status is still cancellable
            if (!isOpenOrderStatus(freshOrder.order_status)) {
                console.warn('[AccountPanel] Order is not cancellable:', {
                    orderid: order.orderid,
                    status: freshOrder.order_status
                });
                if (showToast) {
                    showToast(
                        `Cannot cancel order. Current status: ${freshOrder.order_status}`,
                        'warning'
                    );
                }
                return;
            }

            // Step 6: Show confirmation modal
            setSelectedOrderForCancel(freshOrder as Order);
            setIsCancelModalOpen(true);
        } catch (error) {
            console.error('[AccountPanel] Cancel validation error:', error);
            if (showToast) showToast(`Failed to validate order: ${(error as Error).message}`, 'error');
        }
    };

    // Handle cancel modal close
    const handleCancelModalClose = (): void => {
        if (!isCancelling) {
            setIsCancelModalOpen(false);
            setSelectedOrderForCancel(null);
        }
    };

    // Handle confirm cancel - actual cancellation
    const handleConfirmCancel = async (): Promise<void> => {
        if (!selectedOrderForCancel) return;

        setIsCancelling(true);
        try {
            // Proceed with cancellation
            console.log('[AccountPanel] Attempting to cancel order:', {
                orderid: selectedOrderForCancel.orderid,
                symbol: selectedOrderForCancel.symbol,
                status: selectedOrderForCancel.order_status,
                action: selectedOrderForCancel.action,
                quantity: selectedOrderForCancel.quantity,
                price: selectedOrderForCancel.price
            });

            // Pass full order object for better logging
            const result = await cancelOrder({ order: selectedOrderForCancel } as any);

            if (result.status === 'success') {
                console.log('[AccountPanel] Order cancelled successfully:', selectedOrderForCancel.orderid);
                if (showToast) showToast(`Order cancelled successfully`, 'success');

                // Close modal
                setIsCancelModalOpen(false);
                setSelectedOrderForCancel(null);

                // Refresh data after successful cancel
                setTimeout(fetchAccountData, 1000);
            } else {
                // Show detailed error message
                const errorMsg = result.message || 'Failed to cancel order';

                console.error('[AccountPanel] Cancel failed:', {
                    orderid: selectedOrderForCancel.orderid,
                    error: errorMsg,
                    brokerResponse: result.brokerResponse,
                    fullResult: result
                });

                // Show user-friendly error message
                if (showToast) {
                    const detailedMsg = result.brokerResponse
                        ? `${errorMsg}`
                        : errorMsg;
                    showToast(`Cancel failed: ${detailedMsg}`, 'error');
                }
            }
        } catch (error) {
            console.error('[AccountPanel] Cancel error:', error);
            if (showToast) showToast(`Failed to cancel order: ${(error as Error).message}`, 'error');
        } finally {
            setIsCancelling(false);
        }
    };

    // Handle modify order
    const handleModifyOrder = (order: Order, e: MouseEvent<HTMLButtonElement>): void => {
        e.stopPropagation(); // Prevent row click
        setSelectedOrderForModify(order);
        setIsModifyModalOpen(true);
    };

    // Handle modify complete
    const handleModifyComplete = async (modifyPayload: unknown): Promise<void> => {
        try {
            const result = await modifyOrder(modifyPayload as any);

            if (result.status === 'success') {
                if (showToast) showToast(`Order modified successfully`, 'success');
                // Refresh data after successful modify
                setTimeout(fetchAccountData, 1000);
            } else {
                throw new Error(result.message || 'Failed to modify order');
            }
        } catch (error) {
            console.error('Error modifying order:', error);
            if (showToast) showToast(`Failed to modify order: ${(error as Error).message}`, 'error');
            throw error; // Re-throw to let modal handle it
        }
    };

    if (!isOpen) return null;

    // Render content based on active tab using extracted components
    const renderContent = (): ReactNode => {
        const showSearchFilter = preferences.showSearchFilter;

        switch (activeTab) {
            case 'positions': {
                // Calculate counts from filtered positions
                const openPositionsCount = filteredPositions.filter(p => p.quantity !== 0).length;
                const closedPositionsCount = filteredPositions.filter(p => p.quantity === 0).length;
                const hasActiveFilters = positionsSearchTerm || positionsFilters.exchange.length > 0 || positionsFilters.product.length > 0;

                return (
                    <div className={styles.tabContent}>
                        {/* Unified Search and Filter Bar */}
                        {showSearchFilter && (
                            <>
                                <div className={styles.tableControls}>
                                    <div className={styles.searchBar}>
                                        <Search size={14} className={styles.searchIcon} />
                                        <input
                                            type="text"
                                            placeholder="Search symbol..."
                                            value={positionsSearchTerm}
                                            onChange={(e: ChangeEvent<HTMLInputElement>) => setPositionsSearchTerm(e.target.value)}
                                            className={styles.searchInput}
                                        />
                                        {positionsSearchTerm && (
                                            <X
                                                size={14}
                                                className={styles.clearIcon}
                                                onClick={() => setPositionsSearchTerm('')}
                                            />
                                        )}
                                    </div>

                                    <button
                                        className={`${styles.filterBtn} ${hasActiveFilters ? styles.filterActive : ''}`}
                                        onClick={() => setShowPositionsFilters(!showPositionsFilters)}
                                        title="Toggle filters"
                                    >
                                        <Filter size={14} />
                                        <span>Filters</span>
                                        {hasActiveFilters && <span className={styles.filterCount}>
                                            {positionsFilters.exchange.length + positionsFilters.product.length}
                                        </span>}
                                    </button>

                                    {hasActiveFilters && (
                                        <button
                                            className={styles.clearFiltersBtn}
                                            onClick={handleClearPositionsFilters}
                                            title="Clear all filters"
                                        >
                                            <X size={12} />
                                            <span>Clear</span>
                                        </button>
                                    )}
                                </div>

                                {/* Filter Dropdowns */}
                                {showPositionsFilters && (
                                    <div className={styles.filterPanel}>
                                        <div className={styles.filterGroup}>
                                            <label>Exchange</label>
                                            <div className={styles.filterOptions}>
                                                {uniquePositionsExchanges.map(exchange => (
                                                    <label key={exchange} className={styles.filterOption}>
                                                        <input
                                                            type="checkbox"
                                                            checked={positionsFilters.exchange.includes(exchange)}
                                                            onChange={() => handlePositionsFilterToggle('exchange', exchange)}
                                                        />
                                                        <span>{exchange}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        <div className={styles.filterGroup}>
                                            <label>Product</label>
                                            <div className={styles.filterOptions}>
                                                {uniquePositionsProducts.map(product => (
                                                    <label key={product} className={styles.filterOption}>
                                                        <input
                                                            type="checkbox"
                                                            checked={positionsFilters.product.includes(product)}
                                                            onChange={() => handlePositionsFilterToggle('product', product)}
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
                                        Showing {filteredPositions.length} of {positions.length} positions
                                    </div>
                                )}
                            </>
                        )}

                        {/* Active Positions Section */}
                        <div className={styles.positionsSection}>
                            <PositionsTable
                                positions={filteredPositions}
                                onRowClick={handleRowClick}
                                onExitPosition={handleExitPosition}
                                lastUpdateTime={lastUpdateTime}
                                showSearchFilter={false}
                            />
                        </div>

                        {/* Closed Positions Section */}
                        {closedPositionsCount > 0 && (
                            <div className={styles.closedSection}>
                                <div
                                    className={styles.sectionHeader}
                                    onClick={() => setShowClosedPositions(!showClosedPositions)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <h3>
                                        Closed Positions ({closedPositionsCount})
                                        <span className={styles.chevron}>
                                            {showClosedPositions ? '▼' : '▶'}
                                        </span>
                                    </h3>
                                </div>

                                {showClosedPositions && (
                                    <ClosedPositionsTable
                                        positions={filteredPositions}
                                        onRowClick={handleRowClick}
                                    />
                                )}
                            </div>
                        )}
                    </div>
                );
            }
            case 'orders':
                return (
                    <OrdersTable
                        orders={orders.orders || []}
                        onRowClick={handleRowClick}
                        onCancelOrder={handleCancelOrder}
                        onModifyOrder={handleModifyOrder}
                    />
                );
            case 'holdings':
                return (
                    <HoldingsTable
                        holdings={holdings.holdings || []}
                        onRowClick={handleRowClick}
                    />
                );
            case 'trades':
                return (
                    <TradesTable
                        trades={trades}
                        onRowClick={handleRowClick}
                    />
                );
            default:
                return (
                    <PositionsTable
                        positions={positions}
                        onRowClick={handleRowClick}
                        onExitPosition={handleExitPosition}
                        lastUpdateTime={lastUpdateTime}
                        showSearchFilter={showSearchFilter}
                    />
                );
        }
    };

    return (
        <div className={styles.accountPanel}>
            {/* Header */}
            <div className={`${styles.header} ${!isToolbarVisible ? styles.noToolbar : ''}`}>
                <div className={styles.headerLeft}>
                    <Wallet size={16} className={styles.headerIcon} />
                    <span className={styles.title}>Account Manager</span>
                    {brokerName && (
                        <span className={styles.brokerBadge}>{brokerName}</span>
                    )}
                    {/* WebSocket Connection Status */}
                    {activeTab === 'positions' && positions.filter(p => p.quantity !== 0).length > 0 && (
                        <div className={`${styles.connectionStatus} ${isWebSocketConnected ? styles.connected : styles.disconnected}`}>
                            {isWebSocketConnected ? <Wifi size={11} /> : <WifiOff size={11} />}
                            <span>{isWebSocketConnected ? 'Live' : 'Offline'}</span>
                        </div>
                    )}
                </div>

                <div className={styles.headerCenter}>
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>Unrealized P&L</span>
                        <span className={`${styles.summaryValue} ${unrealizedPnL >= 0 ? styles.positive : styles.negative}`}>
                            {unrealizedPnL >= 0 ? '+' : ''}₹{formatCurrency(unrealizedPnL)}
                        </span>
                    </div>
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>Realized P&L</span>
                        <span className={`${styles.summaryValue} ${realizedPnL >= 0 ? styles.positive : styles.negative}`}>
                            {realizedPnL >= 0 ? '+' : ''}₹{formatCurrency(realizedPnL)}
                        </span>
                    </div>
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>Available</span>
                        <span className={styles.summaryValue}>₹{formatCurrency(availableMargin)}</span>
                    </div>
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>Used</span>
                        <span className={styles.summaryValue}>₹{formatCurrency(usedMargin)}</span>
                    </div>
                    {collateral > 0 && (
                        <div className={styles.summaryItem}>
                            <span className={styles.summaryLabel}>Collateral</span>
                            <span className={styles.summaryValue}>₹{formatCurrency(collateral)}</span>
                        </div>
                    )}
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>Margin Used</span>
                        <span className={`${styles.summaryValue} ${marginUtilization > 80 ? styles.negative : marginUtilization > 50 ? styles.warning : ''}`}>
                            {marginUtilization.toFixed(1)}%
                        </span>
                    </div>
                </div>

                <div className={styles.headerRight} style={{ position: 'relative' }}>
                    <button
                        className={styles.refreshBtn}
                        onClick={fetchAccountData}
                        disabled={isLoading}
                        title="Refresh data"
                    >
                        <RefreshCw size={14} className={isLoading ? styles.spinning : ''} />
                    </button>
                    <button
                        ref={settingsButtonRef}
                        className={styles.controlBtn}
                        onClick={handleToggleSettingsPanel}
                        title="Table Settings"
                    >
                        <Settings size={14} />
                    </button>
                    <button
                        className={styles.controlBtn}
                        onClick={onMinimize}
                        title={isMinimized ? "Restore panel" : "Minimize panel"}
                    >
                        <Minus size={14} />
                    </button>
                    <button
                        className={styles.controlBtn}
                        onClick={onMaximize}
                        title={isMaximized ? "Restore size" : "Maximize panel"}
                    >
                        {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                    </button>
                    <button className={styles.closeBtn} onClick={onClose} title="Close panel">
                        <X size={16} />
                    </button>

                    {/* Settings Panel */}
                    {isSettingsPanelOpen && (
                        <TableSettingsPanel
                            preferences={preferences}
                            onUpdate={updatePreference}
                            onClose={() => setIsSettingsPanelOpen(false)}
                            position={settingsPanelPosition}
                        />
                    )}
                </div>
            </div>

            {/* Tabs - hidden when minimized */}
            {!isMinimized && (
                <div className={`${styles.tabs} ${!isToolbarVisible ? styles.noToolbar : ''}`}>
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.label}
                            {tab.id === 'positions' && positions.filter(p => p.quantity !== 0).length > 0 && (
                                <span className={styles.tabBadge}>{positions.filter(p => p.quantity !== 0).length}</span>
                            )}
                            {tab.id === 'orders' && orderStats.open > 0 && (
                                <span className={styles.tabBadge}>{orderStats.open}</span>
                            )}
                        </button>
                    ))}
                </div>
            )}

            {/* Content - hidden when minimized */}
            {!isMinimized && (
                <>
                    <div className={`${styles.content} ${!isToolbarVisible ? styles.noToolbar : ''}`}>
                        {!isAuthenticated ? (
                            <div className={styles.emptyState}>
                                <p>Connect to OpenAlgo to view account data</p>
                            </div>
                        ) : isLoading && positions.length === 0 ? (
                            <div className={styles.loading}>
                                <RefreshCw size={24} className={styles.spinning} />
                                <p>Loading account data...</p>
                            </div>
                        ) : (
                            renderContent()
                        )}
                    </div>
                    {/* Footer Stats - Pinned to bottom */}
                    {isAuthenticated && !isLoading && (
                        <div className={`${styles.footer} ${!isToolbarVisible ? styles.noToolbar : ''}`}>
                            {activeTab === 'orders' && (
                                <div className={styles.orderStats}>
                                    <span>Open: {orderStats.open}</span>
                                    <span>Completed: {orderStats.completed}</span>
                                    <span>Rejected: {orderStats.rejected}</span>
                                </div>
                            )}
                            {activeTab === 'holdings' && holdings.statistics && (
                                <div className={styles.holdingStats}>
                                    <span>Total Value: ₹{formatCurrency(holdings.statistics.totalholdingvalue || 0)}</span>
                                    <span className={(holdings.statistics.totalprofitandloss || 0) >= 0 ? styles.positive : styles.negative}>
                                        Total P&L: ₹{formatCurrency(holdings.statistics.totalprofitandloss || 0)} ({holdings.statistics.totalpnlpercentage?.toFixed(2) || '0.00'}%)
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Exit Position Modal */}
            <ExitPositionModal
                isOpen={isExitModalOpen}
                position={selectedPositionForExit as any}
                onClose={handleExitModalClose}
                onExitComplete={handleExitComplete}
                showToast={showToast}
            />

            {/* Modify Order Modal */}
            <ModifyOrderModal
                isOpen={isModifyModalOpen}
                order={selectedOrderForModify}
                onClose={() => setIsModifyModalOpen(false)}
                onModifyComplete={handleModifyComplete}
                showToast={showToast}
            />

            {/* Cancel Order Modal */}
            <CancelOrderModal
                isOpen={isCancelModalOpen}
                order={selectedOrderForCancel}
                onClose={handleCancelModalClose}
                onConfirm={handleConfirmCancel}
                isCancelling={isCancelling}
            />
        </div>
    );
};

export default memo(AccountPanel);

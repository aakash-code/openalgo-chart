import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import type { FC, MouseEvent } from 'react';
import { X, Grid3X3, LayoutGrid, BarChart3, TrendingUp, TrendingDown, List, LucideIcon } from 'lucide-react';
import styles from './SectorHeatmapModal.module.css';
import { SECTORS, getSector } from '../PositionTracker/sectorMapping';
import { getMarketCap, getAllMarketData } from '../../services/marketCapService';

// Import extracted constants and utils
import { HEATMAP_MODES } from './constants';
import { calculateIntradayChange, getChangeColor, getTextColor, getBarWidth, formatVolume, formatPrice, calculateTreemapLayout } from './utils';

type ActiveMode = 'treemap' | 'grid' | 'sector';
type DataSource = 'watchlist' | 'market';
type SizingMode = 'value' | 'equal';

interface WatchlistItem {
    symbol: string;
    exchange?: string;
    last?: string | number;
    volume?: string | number;
    marketCap?: string | number;
    open?: string | number;
    close?: string | number;
    prev_close?: string | number;
    [key: string]: unknown;
}

interface StockData {
    symbol: string;
    exchange: string;
    ltp: number;
    change: number;
    volume: number;
    sector: string;
    marketCap: number;
    hasRealMarketCap: boolean;
}

interface SectorDataItem {
    sector: string;
    stockCount: number;
    avgChange: number;
    totalVolume: number;
    totalMarketCap: number;
    stocks: StockData[];
}

interface TreemapSectorLayout extends SectorDataItem {
    x: number;
    y: number;
    width: number;
    height: number;
    value: number;
    stockLayout: TreemapStockLayout[];
}

interface TreemapStockLayout extends StockData {
    x: number;
    y: number;
    width: number;
    height: number;
    value: number;
}

interface MarketStats {
    gainers: number;
    losers: number;
    unchanged: number;
    avgChange: number;
}

interface ContainerSize {
    width: number;
    height: number;
}

interface TooltipPos {
    x: number;
    y: number;
}

interface SymbolSelection {
    symbol: string;
    exchange: string;
}

interface HeatmapMode {
    id: ActiveMode;
    label: string;
    icon: LucideIcon;
}

export interface SectorHeatmapModalProps {
    isOpen: boolean;
    onClose: () => void;
    watchlistData: WatchlistItem[];
    onSectorSelect?: (sector: string) => void;
    onSymbolSelect?: (selection: SymbolSelection) => void;
}

const SectorHeatmapModal: FC<SectorHeatmapModalProps> = ({
    isOpen,
    onClose,
    watchlistData,
    onSectorSelect,
    onSymbolSelect
}) => {
    const [activeMode, setActiveMode] = useState<ActiveMode>('treemap');
    const [dataSource, setDataSource] = useState<DataSource>('watchlist');
    const [selectedSector, setSelectedSector] = useState<string | null>(null);
    const [sizingMode, setSizingMode] = useState<SizingMode>('value');
    const [hoveredStock, setHoveredStock] = useState<StockData | null>(null);
    const [containerSize, setContainerSize] = useState<ContainerSize>({ width: 0, height: 0 });
    const resizeObserverRef = useRef<ResizeObserver | null>(null);
    const treemapRef = useRef<HTMLDivElement | null>(null);

    // Reset selection when datasource changes
    useEffect(() => {
        setSelectedSector(null);
    }, [dataSource]);

    // Memoized callback ref for treemap container
    const setTreemapRef = useCallback((node: HTMLDivElement | null): void => {
        if (resizeObserverRef.current) {
            resizeObserverRef.current.disconnect();
            resizeObserverRef.current = null;
        }

        treemapRef.current = node;

        if (node) {
            const rect = node.getBoundingClientRect();
            setContainerSize(prev => {
                if (prev.width === rect.width && prev.height === rect.height) return prev;
                return { width: rect.width, height: rect.height };
            });

            resizeObserverRef.current = new ResizeObserver(entries => {
                for (const entry of entries) {
                    setContainerSize(prev => {
                        if (prev.width === entry.contentRect.width && prev.height === entry.contentRect.height) return prev;
                        return {
                            width: entry.contentRect.width,
                            height: entry.contentRect.height
                        };
                    });
                }
            });
            resizeObserverRef.current.observe(node);
        }
    }, []);

    // Cleanup resize observer on unmount
    useEffect(() => {
        return () => {
            if (resizeObserverRef.current) {
                resizeObserverRef.current.disconnect();
            }
        };
    }, []);

    // Process stock data
    const stockData = useMemo((): StockData[] => {
        if (dataSource === 'market') {
            const allMarketData = getAllMarketData();
            return allMarketData.map(item => ({
                symbol: item.symbol,
                exchange: 'NSE',
                ltp: item.ltp,
                change: item.change,
                volume: 0,
                sector: getSector(item.symbol),
                marketCap: item.marketCap,
                hasRealMarketCap: true,
            }));
        }

        if (!watchlistData || watchlistData.length === 0) return [];
        return watchlistData.map(item => {
            const realMarketCap = getMarketCap(item.symbol);

            return {
                symbol: item.symbol,
                exchange: item.exchange || 'NSE',
                ltp: parseFloat(String(item.last)) || 0,
                change: calculateIntradayChange(item),
                volume: parseFloat(String(item.volume)) || 0,
                sector: getSector(item.symbol),
                marketCap: realMarketCap || parseFloat(String(item.marketCap)) || parseFloat(String(item.volume)) || 1000000,
                hasRealMarketCap: !!realMarketCap,
            };
        });
    }, [watchlistData, dataSource]);

    // Filter stock data based on selected sector
    const filteredStockData = useMemo((): StockData[] => {
        if (!selectedSector) return stockData;
        return stockData.filter(item => item.sector === selectedSector);
    }, [stockData, selectedSector]);

    // Calculate sector-wise performance
    const sectorData = useMemo((): SectorDataItem[] => {
        if (filteredStockData.length === 0) return [];
        const sectorGroups: Record<string, { sector: string; stocks: StockData[]; totalChange: number; totalVolume: number; totalMarketCap: number }> = {};

        filteredStockData.forEach(item => {
            const sector = item.sector;
            if (!sectorGroups[sector]) {
                sectorGroups[sector] = {
                    sector,
                    stocks: [],
                    totalChange: 0,
                    totalVolume: 0,
                    totalMarketCap: 0,
                };
            }
            sectorGroups[sector].stocks.push(item);
            sectorGroups[sector].totalChange += item.change;
            sectorGroups[sector].totalVolume += item.volume;
            sectorGroups[sector].totalMarketCap += item.marketCap;
        });

        return Object.values(sectorGroups)
            .map(group => ({
                sector: group.sector,
                stockCount: group.stocks.length,
                avgChange: group.stocks.length > 0 ? group.totalChange / group.stocks.length : 0,
                totalVolume: group.totalVolume,
                totalMarketCap: group.totalMarketCap,
                stocks: group.stocks.sort((a, b) => b.marketCap - a.marketCap),
            }))
            .filter(s => s.stockCount > 0)
            .sort((a, b) => b.totalMarketCap - a.totalMarketCap);
    }, [filteredStockData]);

    // Calculate market stats
    const marketStats = useMemo((): MarketStats => {
        if (filteredStockData.length === 0) return { gainers: 0, losers: 0, unchanged: 0, avgChange: 0 };
        const gainers = filteredStockData.filter(s => s.change > 0.1).length;
        const losers = filteredStockData.filter(s => s.change < -0.1).length;
        const unchanged = filteredStockData.length - gainers - losers;
        const avgChange = filteredStockData.reduce((sum, s) => sum + s.change, 0) / filteredStockData.length;
        return { gainers, losers, unchanged, avgChange };
    }, [filteredStockData]);

    const handleRowClick = (sector: string): void => {
        setSelectedSector(sector);
        setActiveMode('treemap');
    };

    const handleBackToAllSectors = (): void => {
        setSelectedSector(null);
    };

    const handleStockClick = (stock: StockData, e?: MouseEvent<HTMLDivElement>): void => {
        e?.stopPropagation();
        if (onSymbolSelect) onSymbolSelect({ symbol: stock.symbol, exchange: stock.exchange });
        onClose();
    };

    // Prepare treemap data with nested layout
    const treemapLayout = useMemo((): TreemapSectorLayout[] => {
        if (containerSize.width === 0 || containerSize.height === 0) return [];

        const sectorItems = sectorData.map(s => {
            const value = sizingMode === 'equal' ? s.stocks.length : s.totalMarketCap;
            return { ...s, value };
        }).sort((a, b) => b.value - a.value);

        const sectorLayout = calculateTreemapLayout(
            sectorItems,
            0, 0,
            containerSize.width,
            containerSize.height
        ) as (SectorDataItem & { x: number; y: number; width: number; height: number; value: number })[];

        return sectorLayout.map(sector => {
            const stockItems = sector.stocks.map(stock => ({
                ...stock,
                value: sizingMode === 'equal' ? 1 : stock.marketCap,
            }));

            const padding = selectedSector ? 0 : 1;
            const headerHeight = selectedSector ? 0 : 20;

            const stockLayout = calculateTreemapLayout(
                stockItems,
                padding,
                headerHeight,
                Math.max(sector.width - padding * 2, 0),
                Math.max(sector.height - headerHeight - padding, 0)
            ) as TreemapStockLayout[];

            return {
                ...sector,
                stockLayout,
            };
        });
    }, [sectorData, containerSize, selectedSector, sizingMode]);

    const [tooltipPos, setTooltipPos] = useState<TooltipPos>({ x: 0, y: 0 });

    const handleStockMouseEnter = (stock: StockData, e: MouseEvent<HTMLDivElement>): void => {
        setHoveredStock(stock);
        setTooltipPos({ x: e.clientX, y: e.clientY });
    };

    const handleStockMouseMove = (e: MouseEvent<HTMLDivElement>): void => {
        setTooltipPos({ x: e.clientX, y: e.clientY });
    };

    // Render Professional Treemap View
    const renderTreemapView = (): React.ReactNode => {
        return (
            <div className={styles.treemapWrapper}>
                <div className={styles.treemapContainer} ref={setTreemapRef} style={{ padding: '4px' }}>
                    {treemapLayout.map(sector => (
                        <div
                            key={sector.sector}
                            className={styles.treemapSector}
                            style={{
                                left: sector.x,
                                top: sector.y,
                                width: sector.width,
                                height: sector.height,
                                border: selectedSector ? 'none' : '1px solid rgba(255,255,255,0.05)',
                                backgroundColor: 'rgba(0,0,0,0.15)',
                            }}
                            onClick={() => !selectedSector && handleRowClick(sector.sector)}
                            title={!selectedSector ? "Click to zoom into sector" : ""}
                            role={!selectedSector ? "button" : "presentation"}
                        >
                            {!selectedSector && (
                                <div
                                    className={styles.treemapSectorHeader}
                                    style={{ borderBottom: `1px solid ${getChangeColor(sector.avgChange, true)}30` }}
                                >
                                    {sector.width > 35 && (
                                        <span
                                            className={styles.treemapSectorName}
                                            style={{
                                                fontSize: Math.max(Math.min(sector.width / 10, 10), 8),
                                                fontWeight: '700',
                                                letterSpacing: '0.5px',
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            {sector.sector}
                                        </span>
                                    )}
                                    {sector.width > 80 && (
                                        <span
                                            className={styles.treemapSectorChange}
                                            style={{
                                                color: getChangeColor(sector.avgChange, false),
                                                fontSize: '9px',
                                                fontWeight: '700',
                                            }}
                                        >
                                            {sector.avgChange >= 0 ? '+' : ''}{sector.avgChange.toFixed(2)}%
                                        </span>
                                    )}
                                </div>
                            )}

                            {sector.stockLayout.map(stock => {
                                const showContent = stock.width > 30 && stock.height > 30;
                                const showLogo = stock.width > 80 && stock.height > 70;
                                const showPrice = stock.height > 80 && stock.width > 80;

                                return (
                                    <div
                                        key={stock.symbol}
                                        className={styles.treemapStock}
                                        style={{
                                            left: stock.x,
                                            top: stock.y,
                                            width: stock.width,
                                            height: stock.height,
                                            backgroundColor: getChangeColor(stock.change, true),
                                            border: '1px solid rgba(0,0,0,0.1)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexDirection: 'column',
                                            overflow: 'hidden',
                                            cursor: 'pointer',
                                            transition: 'transform 0.1s ease',
                                        }}
                                        onClick={(e) => handleStockClick(stock, e)}
                                        onMouseEnter={(e) => handleStockMouseEnter(stock, e)}
                                        onMouseMove={handleStockMouseMove}
                                        onMouseLeave={() => setHoveredStock(null)}
                                    >
                                        {showContent && (
                                            <div className={styles.treemapStockContent} style={{ textAlign: 'center', width: '100%', padding: '0 2px' }}>
                                                {showLogo && (
                                                    <div style={{
                                                        width: '24px',
                                                        height: '24px',
                                                        backgroundColor: 'rgba(255,255,255,0.2)',
                                                        borderRadius: '50%',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        marginBottom: '4px',
                                                        marginLeft: 'auto',
                                                        marginRight: 'auto',
                                                        fontSize: '11px',
                                                        fontWeight: 'bold',
                                                        color: 'rgba(255,255,255,0.9)',
                                                        flexShrink: 0
                                                    }}>
                                                        {stock.symbol[0]}
                                                    </div>
                                                )}

                                                <span style={{
                                                    display: 'block',
                                                    fontSize: Math.min(stock.width / 5, 13) + 'px',
                                                    fontWeight: '700',
                                                    color: '#fff',
                                                    textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                                                    lineHeight: '1.2',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    maxWidth: '100%',
                                                    padding: '0 2px'
                                                }}>
                                                    {stock.symbol}
                                                </span>

                                                <span style={{
                                                    display: 'block',
                                                    fontSize: Math.min(stock.width / 6, 11) + 'px',
                                                    fontWeight: '600',
                                                    color: 'rgba(255,255,255,0.9)',
                                                    marginTop: '1px',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}%
                                                </span>

                                                {showPrice && (
                                                    <span style={{
                                                        display: 'block',
                                                        fontSize: '10px',
                                                        fontWeight: '400',
                                                        color: 'rgba(255,255,255,0.7)',
                                                        marginTop: '1px',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        ₹{formatPrice(stock.ltp)}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>

                {hoveredStock && (
                    <div
                        className={styles.tooltip}
                        style={{
                            top: (tooltipPos.y + 20) + 'px',
                            left: tooltipPos.x + 'px',
                            right: 'auto',
                            bottom: 'auto',
                            transform: 'translateX(-50%)',
                            position: 'fixed',
                            zIndex: 10001,
                            pointerEvents: 'none',
                        }}
                    >
                        <div className={styles.tooltipHeader}>
                            <span className={styles.tooltipSymbol}>{hoveredStock.symbol}</span>
                            <span className={styles.tooltipChange} style={{ color: getChangeColor(hoveredStock.change, false) }}>
                                {hoveredStock.change >= 0 ? '+' : ''}{hoveredStock.change.toFixed(2)}%
                            </span>
                        </div>
                        <div className={styles.tooltipRow}>
                            <span>LTP</span>
                            <span>₹{formatPrice(hoveredStock.ltp)}</span>
                        </div>
                        <div className={styles.tooltipRow}>
                            <span>Market Cap</span>
                            <span>{formatVolume(hoveredStock.marketCap)}</span>
                        </div>
                        <div className={styles.tooltipRow}>
                            <span>Sector</span>
                            <span>{hoveredStock.sector}</span>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Render Grid View
    const renderGridView = (): React.ReactNode => {
        const sortedStocks = [...filteredStockData].sort((a, b) => b.change - a.change);

        return (
            <div className={styles.gridContainer}>
                {sortedStocks.map(stock => (
                    <div
                        key={`${stock.symbol}-${stock.exchange}`}
                        className={styles.gridItem}
                        style={{ backgroundColor: getChangeColor(stock.change, true) }}
                        onClick={() => handleStockClick(stock)}
                    >
                        <span className={styles.gridSymbol} style={{ color: getTextColor(stock.change) }}>
                            {stock.symbol}
                        </span>
                        <span className={styles.gridChange} style={{ color: getTextColor(stock.change) }}>
                            {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}%
                        </span>
                        <span className={styles.gridLtp}>₹{formatPrice(stock.ltp)}</span>
                    </div>
                ))}
            </div>
        );
    };

    // Render Sector View
    const renderSectorView = (): React.ReactNode => {
        const maxChange = Math.max(...sectorData.map(s => Math.abs(s.avgChange)), 1);

        return (
            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th className={styles.colSector}>Sector</th>
                            <th className={styles.colStocks}>Stocks</th>
                            <th className={styles.colChange}>Avg Change</th>
                            <th className={styles.colBar}>Performance</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sectorData.map(item => (
                            <tr key={item.sector} className={styles.row} onClick={() => handleRowClick(item.sector)}>
                                <td className={styles.sectorName}>
                                    <div className={styles.sectorIndicator} style={{ backgroundColor: getChangeColor(item.avgChange, true) }} />
                                    {item.sector}
                                </td>
                                <td className={styles.stockCount}>{item.stockCount}</td>
                                <td className={styles.changeValue} style={{ color: getChangeColor(item.avgChange, false) }}>
                                    {item.avgChange >= 0 ? '+' : ''}{item.avgChange.toFixed(2)}%
                                </td>
                                <td className={styles.barCell}>
                                    <div className={styles.barContainer}>
                                        <div
                                            className={styles.bar}
                                            style={{
                                                width: `${getBarWidth(item.avgChange, maxChange)}%`,
                                                backgroundColor: getChangeColor(item.avgChange, true),
                                            }}
                                        />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    // Render content based on active mode
    const renderContent = (): React.ReactNode => {
        if (filteredStockData.length === 0) {
            return (
                <div className={styles.emptyState}>
                    <Grid3X3 size={48} strokeWidth={1} />
                    <p>No data available</p>
                    <p className={styles.emptyHint}>Add stocks to your watchlist to see heatmap</p>
                </div>
            );
        }

        switch (activeMode) {
            case 'treemap': return renderTreemapView();
            case 'grid': return renderGridView();
            case 'sector': return renderSectorView();
            default: return renderTreemapView();
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <div className={styles.titleWrapper} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {selectedSector && (
                                <button className={styles.backButton} onClick={handleBackToAllSectors} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <LayoutGrid size={18} />
                                </button>
                            )}
                            <h2 className={styles.title}>
                                {selectedSector ? (
                                    <>
                                        <span style={{ opacity: 0.6, cursor: 'pointer' }} onClick={handleBackToAllSectors}>Heatmap</span>
                                        <span style={{ margin: '0 6px', opacity: 0.4 }}>/</span>
                                        <span>{selectedSector}</span>
                                    </>
                                ) : 'Market Heatmap'}
                            </h2>
                        </div>

                        <div className={styles.marketStats}>
                            <div className={styles.statItem}>
                                <TrendingUp size={14} className={styles.statIconGreen} />
                                <span className={styles.statValue}>{marketStats.gainers}</span>
                            </div>
                            <div className={styles.statItem}>
                                <TrendingDown size={14} className={styles.statIconRed} />
                                <span className={styles.statValue}>{marketStats.losers}</span>
                            </div>
                            <div className={`${styles.statItem} ${styles.statAvg}`}>
                                <span className={styles.statAvgValue} style={{ color: getChangeColor(marketStats.avgChange, false) }}>
                                    {marketStats.avgChange >= 0 ? '+' : ''}{marketStats.avgChange.toFixed(2)}%
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className={styles.headerRight}>
                        {activeMode === 'treemap' && (
                            <div className={styles.dataSourceToggle} style={{ marginRight: '12px' }}>
                                <button className={`${styles.sourceButton} ${sizingMode === 'value' ? styles.sourceButtonActive : ''}`} onClick={() => setSizingMode('value')} title="Size tiles by Market Cap" style={{ minWidth: '60px' }}>
                                    <span>Value</span>
                                </button>
                                <button className={`${styles.sourceButton} ${sizingMode === 'equal' ? styles.sourceButtonActive : ''}`} onClick={() => setSizingMode('equal')} title="All tiles have equal size" style={{ minWidth: '60px' }}>
                                    <span>Equal</span>
                                </button>
                            </div>
                        )}

                        {!selectedSector && (
                            <div className={styles.dataSourceToggle}>
                                <button className={`${styles.sourceButton} ${dataSource === 'watchlist' ? styles.sourceButtonActive : ''}`} onClick={() => setDataSource('watchlist')} title="Show watchlist stocks only">
                                    <List size={14} />
                                    <span>Watchlist</span>
                                </button>
                                <button className={`${styles.sourceButton} ${dataSource === 'market' ? styles.sourceButtonActive : ''}`} onClick={() => setDataSource('market')} title="Show all market stocks">
                                    <BarChart3 size={14} />
                                    <span>Market</span>
                                </button>
                            </div>
                        )}
                        <button className={styles.closeButton} onClick={onClose}>
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Mode Tabs */}
                <div className={styles.modeTabs}>
                    {(HEATMAP_MODES as HeatmapMode[]).map(mode => {
                        const IconComponent = mode.icon;
                        return (
                            <button key={mode.id} className={`${styles.modeTab} ${activeMode === mode.id ? styles.modeTabActive : ''}`} onClick={() => setActiveMode(mode.id)}>
                                <IconComponent size={16} />
                                <span>{mode.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Content */}
                <div className={styles.content}>
                    {renderContent()}
                </div>

                {/* Color Legend */}
                <div className={styles.footer}>
                    <div className={styles.legend}>
                        <div className={styles.legendItem}>
                            <div className={styles.legendColor} style={{ background: 'linear-gradient(to right, #5C0618, #8B0A24, #B80F30, #D01238)' }} />
                            <span>-4%</span>
                        </div>
                        <div className={styles.legendItem}>
                            <div className={styles.legendColor} style={{ backgroundColor: '#3D1A1A' }} />
                            <span>0%</span>
                        </div>
                        <div className={styles.legendItem}>
                            <div className={styles.legendColor} style={{ background: 'linear-gradient(to right, #006B2C, #008235, #009A3E, #00B248)' }} />
                            <span>+4%</span>
                        </div>
                    </div>
                    <span className={styles.hint}>Tile size: Market Cap • Color: Change % • Click to view chart</span>
                </div>
            </div>
        </div>
    );
};

export default SectorHeatmapModal;

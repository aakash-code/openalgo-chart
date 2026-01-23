import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { X, Grid3X3, LayoutGrid, BarChart3, TrendingUp, TrendingDown, List } from 'lucide-react';
import styles from './SectorHeatmapModal.module.css';
import { SECTORS, getSector } from '../PositionTracker/sectorMapping';
import { getMarketCap, getAllMarketData } from '../../services/marketCapService';

// Import extracted constants and utils
import { HEATMAP_MODES } from './constants';
import { calculateIntradayChange, getChangeColor, getTextColor, getBarWidth, formatVolume, formatPrice, calculateTreemapLayout } from './utils';

const SectorHeatmapModal = ({ isOpen, onClose, watchlistData, onSectorSelect, onSymbolSelect }) => {
  const [activeMode, setActiveMode] = useState('treemap');
  const [dataSource, setDataSource] = useState('watchlist'); // 'watchlist' or 'market'
  const [selectedSector, setSelectedSector] = useState(null); // Drill-down state
  const [sizingMode, setSizingMode] = useState('value'); // 'value' (Market Cap) or 'equal' (Equal Weight)
  const [hoveredStock, setHoveredStock] = useState(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const resizeObserverRef = useRef(null);
  const treemapRef = useRef(null);

  // Reset selection when datasource changes
  useEffect(() => {
    setSelectedSector(null);
  }, [dataSource]);

  // ... (keep resizeObserverRef code same) ... 

  // Memoized callback ref for treemap container - prevents infinite loops
  const setTreemapRef = useCallback((node) => {
    // Cleanup previous observer
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
      resizeObserverRef.current = null;
    }

    treemapRef.current = node;

    if (node) {
      // Measure immediately, but only update if changed
      const rect = node.getBoundingClientRect();
      setContainerSize(prev => {
        if (prev.width === rect.width && prev.height === rect.height) return prev;
        return { width: rect.width, height: rect.height };
      });

      // Setup resize observer for future changes
      resizeObserverRef.current = new ResizeObserver(entries => {
        for (let entry of entries) {
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

  // Process stock data - either from watchlist or full market data
  const stockData = useMemo(() => {
    if (dataSource === 'market') {
      // Use all 207 stocks from market cap data
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

    // Use watchlist data
    if (!watchlistData || watchlistData.length === 0) return [];
    return watchlistData.map(item => {
      // Try to get real market cap data from service
      const realMarketCap = getMarketCap(item.symbol);

      return {
        symbol: item.symbol,
        exchange: item.exchange || 'NSE',
        ltp: parseFloat(item.last) || 0,
        change: calculateIntradayChange(item),
        volume: parseFloat(item.volume) || 0,
        sector: getSector(item.symbol),
        // Priority: Real market cap > Provided market cap > Volume as fallback > Default
        marketCap: realMarketCap || parseFloat(item.marketCap) || parseFloat(item.volume) || 1000000,
        hasRealMarketCap: !!realMarketCap, // Flag to indicate if real data is used
      };
    });
  }, [watchlistData, dataSource]);

  // Filter stock data based on selected sector
  const filteredStockData = useMemo(() => {
    if (!selectedSector) return stockData;
    return stockData.filter(item => item.sector === selectedSector);
  }, [stockData, selectedSector]);

  // Calculate sector-wise performance
  const sectorData = useMemo(() => {
    if (filteredStockData.length === 0) return [];
    const sectorGroups = {};

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
        stocks: group.stocks.sort((a, b) => b.marketCap - a.marketCap), // Sort stocks by market cap
      }))
      .filter(s => s.stockCount > 0)
      .sort((a, b) => b.totalMarketCap - a.totalMarketCap); // Sort sectors by total market cap
  }, [filteredStockData]);

  // Calculate market stats (Gainers/Losers/etc) ... (Keep same)
  const marketStats = useMemo(() => {
    if (filteredStockData.length === 0) return { gainers: 0, losers: 0, unchanged: 0, avgChange: 0 };
    const gainers = filteredStockData.filter(s => s.change > 0.1).length;
    const losers = filteredStockData.filter(s => s.change < -0.1).length;
    const unchanged = filteredStockData.length - gainers - losers;
    const avgChange = filteredStockData.reduce((sum, s) => sum + s.change, 0) / filteredStockData.length;
    return { gainers, losers, unchanged, avgChange };
  }, [filteredStockData]);

  const handleRowClick = (sector) => {
    setSelectedSector(sector);
    setActiveMode('treemap');
  };

  const handleBackToAllSectors = () => {
    setSelectedSector(null);
  };

  const handleStockClick = (stock, e) => {
    e?.stopPropagation();
    if (onSymbolSelect) onSymbolSelect({ symbol: stock.symbol, exchange: stock.exchange });
    onClose();
  };

  // Prepare treemap data with nested layout - MARKET CAP BASED sizing (TradingView style)
  const treemapLayout = useMemo(() => {
    if (containerSize.width === 0 || containerSize.height === 0) return [];

    // Calculate Sector Values based on Sizing Mode
    const sectorItems = sectorData.map(s => {
      // If 'equal' mode, sector size is proportional to number of stocks
      // If 'value' mode, sector size is proportional to total market cap
      const value = sizingMode === 'equal' ? s.stocks.length : s.totalMarketCap;
      return {
        ...s,
        value: value,
      };
    }).sort((a, b) => b.value - a.value);

    // Calculate Global Layout (Sectors)
    const sectorLayout = calculateTreemapLayout(
      sectorItems,
      0, 0,
      containerSize.width,
      containerSize.height
    );

    // Calculate Stock Layouts within each Sector
    return sectorLayout.map(sector => {
      const stockItems = sector.stocks.map(stock => ({
        ...stock,
        // If 'equal' mode, all stocks have value 1. If 'value' mode, use marketCap.
        value: sizingMode === 'equal' ? 1 : stock.marketCap,
      }));

      // In drill-down mode, use less padding to maximize space
      const padding = selectedSector ? 0 : 1;
      const headerHeight = selectedSector ? 0 : 20; // Hide sector header in drill-down mode

      const stockLayout = calculateTreemapLayout(
        stockItems,
        padding,
        headerHeight,
        Math.max(sector.width - padding * 2, 0),
        Math.max(sector.height - headerHeight - padding, 0)
      );

      return {
        ...sector,
        stockLayout,
      };
    });
  }, [sectorData, filteredStockData.length, containerSize, selectedSector, sizingMode]);

  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const handleStockMouseEnter = (stock, e) => {
    setHoveredStock(stock);
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  const handleStockMouseMove = (e) => {
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  // Render Professional Treemap View
  const renderTreemapView = () => {
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
              {/* Show Header only if NOT in drill-down mode */}
              {!selectedSector && (
                <div
                  className={styles.treemapSectorHeader}
                  style={{
                    borderBottom: `1px solid ${getChangeColor(sector.avgChange, true)}30`,
                  }}
                >
                  {/* Compact Header */}
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
                // Determine if we can show content
                const showContent = stock.width > 30 && stock.height > 30;
                // Only show logo on LARGE tiles to prevent clutter
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
                      border: '1px solid rgba(0,0,0,0.1)', // Subtle border
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
                        {/* Logo Placeholder (Circle with initial) - Only on large tiles */}
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

                        {/* Symbol */}
                        <span
                          style={{
                            display: 'block',
                            fontSize: Math.min(stock.width / 5, 13) + 'px', // Increased max size slightly, strictly scaling
                            fontWeight: '700',
                            color: '#fff',
                            textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                            lineHeight: '1.2',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '100%',
                            padding: '0 2px'
                          }}
                        >
                          {stock.symbol}
                        </span>

                        {/* Change % */}
                        <span
                          style={{
                            display: 'block',
                            fontSize: Math.min(stock.width / 6, 11) + 'px',
                            fontWeight: '600',
                            color: 'rgba(255,255,255,0.9)',
                            marginTop: '1px',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}%
                        </span>

                        {/* Price (optional, only for big tiles) */}
                        {showPrice && (
                          <span
                            style={{
                              display: 'block',
                              fontSize: '10px',
                              fontWeight: '400',
                              color: 'rgba(255,255,255,0.7)',
                              marginTop: '1px',
                              whiteSpace: 'nowrap'
                            }}
                          >
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

        {/* Hover tooltip */}
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
              transition: 'none',
              animation: 'none'
            }}
          >
            <div className={styles.tooltipHeader}>
              <span className={styles.tooltipSymbol}>{hoveredStock.symbol}</span>
              <span
                className={styles.tooltipChange}
                style={{ color: getChangeColor(hoveredStock.change, false) }}
              >
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

  // Render Grid View (enhanced)
  const renderGridView = () => {
    // Use filteredStockData
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

  // Render Sector View (enhanced table)
  const renderSectorView = () => {
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
              <tr
                key={item.sector}
                className={styles.row}
                onClick={() => handleRowClick(item.sector)}
              >
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
  const renderContent = () => {
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
                <button
                  className={styles.backButton}
                  onClick={handleBackToAllSectors}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#fff',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
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
                <span
                  className={styles.statAvgValue}
                  style={{ color: getChangeColor(marketStats.avgChange, false) }}
                >
                  {marketStats.avgChange >= 0 ? '+' : ''}{marketStats.avgChange.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
          <div className={styles.headerRight}>
            {/* Sizing Toggles (Visible in Treemap mode) */}
            {activeMode === 'treemap' && (
              <div className={styles.dataSourceToggle} style={{ marginRight: '12px' }}>
                <button
                  className={`${styles.sourceButton} ${sizingMode === 'value' ? styles.sourceButtonActive : ''}`}
                  onClick={() => setSizingMode('value')}
                  title="Size tiles by Market Cap"
                  style={{ minWidth: '60px' }}
                >
                  <span>Value</span>
                </button>
                <button
                  className={`${styles.sourceButton} ${sizingMode === 'equal' ? styles.sourceButtonActive : ''}`}
                  onClick={() => setSizingMode('equal')}
                  title="All tiles have equal size"
                  style={{ minWidth: '60px' }}
                >
                  <span>Equal</span>
                </button>
              </div>
            )}

            {/* Data Source Selector - Disable when zoomed in */}
            {!selectedSector && (
              <div className={styles.dataSourceToggle}>
                <button
                  className={`${styles.sourceButton} ${dataSource === 'watchlist' ? styles.sourceButtonActive : ''}`}
                  onClick={() => setDataSource('watchlist')}
                  title="Show watchlist stocks only"
                >
                  <List size={14} />
                  <span>Watchlist</span>
                </button>
                <button
                  className={`${styles.sourceButton} ${dataSource === 'market' ? styles.sourceButtonActive : ''}`}
                  onClick={() => setDataSource('market')}
                  title="Show all market stocks (207 stocks)"
                >
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
          {HEATMAP_MODES.map(mode => {
            const IconComponent = mode.icon;
            return (
              <button
                key={mode.id}
                className={`${styles.modeTab} ${activeMode === mode.id ? styles.modeTabActive : ''}`}
                onClick={() => setActiveMode(mode.id)}
              >
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

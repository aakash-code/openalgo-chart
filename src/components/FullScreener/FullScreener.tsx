import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  Filter, 
  Play, 
  X, 
  Search, 
  ChevronDown, 
  ArrowUpDown,
  RefreshCw,
  Layout as LayoutIcon,
  Maximize2
} from 'lucide-react';
import styles from './FullScreener.module.css';
import { batchScan, ScreenerRow, ScannerProgress, ScannerOptions } from '../../services/advancedScannerService';
import { STOCK_LIST_OPTIONS, getStockList } from '../../data/stockLists';
import classNames from 'classnames';

export interface FullScreenerProps {
  onSymbolSelect: (symbol: string, exchange: string) => void;
  onClose: () => void;
  initialUniverse?: string;
}

const FullScreener: React.FC<FullScreenerProps> = ({
  onSymbolSelect,
  onClose,
  initialUniverse = 'nifty50'
}) => {
  const [universe, setUniverse] = useState(initialUniverse);
  const [interval, setInterval] = useState('1d');
  const [results, setResults] = useState<ScreenerRow[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState<ScannerProgress | null>(null);
  const [sortKey, setSortKey] = useState<keyof ScreenerRow>('changePercent');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleScan = useCallback(async () => {
    setIsScanning(true);
    setResults([]);
    
    const stocks = getStockList(universe).map(s => ({
      symbol: s.symbol,
      exchange: s.exchange,
      name: s.name
    }));

    const options: ScannerOptions = {
      interval,
      indicators: ['rsi', 'sma50', 'sma200', 'ema20', 'volumetric']
    };

    try {
      const scanResults = await batchScan(stocks, options, (p) => setProgress(p));
      setResults(scanResults);
    } catch (error) {
      console.error('Scan failed:', error);
    } finally {
      setIsScanning(false);
      setProgress(null);
    }
  }, [universe, interval]);

  // Initial scan
  useEffect(() => {
    handleScan();
  }, []);

  const sortedResults = useMemo(() => {
    return [...results].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDir === 'asc' ? valA - valB : valB - valA;
      }
      
      return 0;
    });
  }, [results, sortKey, sortDir]);

  const handleSort = (key: keyof ScreenerRow) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const formatNumber = (val?: number, decimals = 2) => {
    if (val === undefined || isNaN(val)) return '-';
    return val.toFixed(decimals);
  };

  const formatVolume = (vol?: number) => {
    if (vol === undefined || isNaN(vol)) return '-';
    if (vol >= 10000000) return (vol / 10000000).toFixed(2) + ' Cr';
    if (vol >= 100000) return (vol / 100000).toFixed(2) + ' L';
    if (vol >= 1000) return (vol / 1000).toFixed(2) + ' K';
    return vol.toString();
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.leftHeader}>
          <div className={styles.title}>
            <LayoutIcon size={20} color="var(--tv-color-brand)" />
            <span>Market Screener</span>
          </div>
          
          <div className={styles.controls}>
            <select 
              className={styles.select}
              value={universe}
              onChange={(e) => setUniverse(e.target.value)}
              disabled={isScanning}
            >
              {STOCK_LIST_OPTIONS.filter(opt => opt.id !== 'watchlist').map(opt => (
                <option key={opt.id} value={opt.id}>{opt.name}</option>
              ))}
            </select>

            <select 
              className={styles.select}
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
              disabled={isScanning}
            >
              <option value="1d">Daily</option>
              <option value="1h">1 Hour</option>
              <option value="15m">15 Min</option>
              <option value="5m">5 Min</option>
            </select>

            <button 
              className={styles.scanBtn}
              onClick={handleScan}
              disabled={isScanning}
            >
              {isScanning ? <RefreshCw size={14} className={styles.spinning} /> : <Play size={14} fill="currentColor" />}
              {isScanning ? 'Scanning...' : 'Scan Market'}
            </button>
          </div>
        </div>

        <button className={styles.closeBtn} onClick={onClose} title="Back to Chart">
          <X size={20} />
        </button>
      </div>

      {/* Table Content */}
      <div className={styles.content}>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr>
                <th className={styles.th} style={{ width: '180px' }} onClick={() => handleSort('symbol')}>Symbol</th>
                <th className={styles.th} onClick={() => handleSort('lastPrice')}>Price</th>
                <th className={styles.th} onClick={() => handleSort('changePercent')}>Chg %</th>
                <th className={styles.th} onClick={() => handleSort('volume')}>Volume</th>
                <th className={styles.th} onClick={() => handleSort('rsi')}>RSI (14)</th>
                <th className={styles.th} onClick={() => handleSort('ema20')}>EMA 20</th>
                <th className={styles.th} onClick={() => handleSort('sma50')}>SMA 50</th>
                <th className={styles.th} onClick={() => handleSort('sma200')}>SMA 200</th>
                <th className={styles.th} onClick={() => handleSort('volumetric')}>Volumetric</th>
              </tr>
            </thead>
            <tbody>
              {sortedResults.map((row) => (
                <tr 
                  key={row.symbol} 
                  className={styles.tr}
                  onClick={() => onSymbolSelect(row.symbol, row.exchange)}
                >
                  <td className={styles.td}>
                    <div className={styles.symbolCell}>
                      <span className={styles.symbolName}>{row.symbol}</span>
                      <span className={styles.description}>{row.name}</span>
                    </div>
                  </td>
                  <td className={classNames(styles.td, styles.bold)}>
                    {formatNumber(row.lastPrice)}
                  </td>
                  <td className={classNames(styles.td, row.change >= 0 ? styles.up : styles.down)}>
                    {row.change >= 0 ? '+' : ''}{formatNumber(row.changePercent)}%
                  </td>
                  <td className={styles.td}>{formatVolume(row.volume)}</td>
                  <td className={classNames(styles.td, row.rsi && row.rsi > 70 ? styles.up : row.rsi && row.rsi < 30 ? styles.down : '')}>
                    {formatNumber(row.rsi)}
                  </td>
                  <td className={styles.td}>{formatNumber(row.ema20)}</td>
                  <td className={styles.td}>{formatNumber(row.sma50)}</td>
                  <td className={styles.td}>{formatNumber(row.sma200)}</td>
                  <td className={classNames(styles.td, styles.bold, {
                    [styles.up]: row.volumetric?.includes('Long'),
                    [styles.down]: row.volumetric?.includes('Short')
                  })}>
                    {row.volumetric || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Progress Overlay */}
        {isScanning && progress && (
          <div className={styles.progressOverlay}>
            <div className={styles.progressBox}>
              <div className={styles.title} style={{ fontSize: '14px', justifyContent: 'center' }}>
                Scanning {progress.currentSymbol}...
              </div>
              <div className={styles.progressBarContainer}>
                <div 
                  className={styles.progressBarFill} 
                  style={{ width: `${(progress.completed / progress.total) * 100}%` }}
                />
              </div>
              <div className={styles.description}>
                {progress.completed} of {progress.total} symbols
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FullScreener;

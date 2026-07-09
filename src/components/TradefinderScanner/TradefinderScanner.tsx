import React, { useState, useMemo, useCallback } from 'react';
import { Radar, Play, Square, Activity, Layout, Layers, Info } from 'lucide-react';
import classNames from 'classnames';
import styles from './TradefinderScanner.module.css';
import { calculateMarketRadar, type MarketRadarData } from '../../services/tradefinderService';
import { NIFTY_50 } from '../../data/stockLists';

export interface TradefinderScannerProps {
  isAuthenticated: boolean;
}

const TradefinderScanner: React.FC<TradefinderScannerProps> = ({
  isAuthenticated
}) => {
  // State
  const [radarData, setRadarData] = useState<MarketRadarData | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  // Handle Scan
  const handleStartScan = useCallback(async () => {
    if (!isAuthenticated) {
      setError('Please login to use radar');
      return;
    }

    setIsScanning(true);
    setError(null);

    try {
      // Use Nifty 50 as a proxy for market breadth
      const stocks = NIFTY_50.map(s => ({ symbol: s.symbol, exchange: 'NSE' }));
      const results = await calculateMarketRadar(
        stocks,
        { interval: '1d' },
        (current, total) => setProgress({ current, total })
      );
      setRadarData(results);
    } catch (err) {
      setError('Radar scan failed. Please check your connection.');
    } finally {
      setIsScanning(false);
    }
  }, [isAuthenticated]);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.title}>
          <Radar size={16} color="var(--tv-color-brand, #2962ff)" />
          <span>Market Radar</span>
        </div>
        <button 
          className={styles.scanBtn}
          onClick={handleStartScan}
          disabled={isScanning}
        >
          {isScanning ? <Square size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
          {isScanning ? 'Scanning...' : 'Update Radar'}
        </button>
      </div>

      {/* Progress */}
      {isScanning && (
        <div className={styles.progressContainer}>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill} 
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Dashboard Content */}
      <div className={styles.content}>
        {radarData ? (
          <>
            {/* Market Regime Awareness Tile */}
            <div className={styles.radarTile}>
              <div className={styles.tileHeader}>
                <span className={styles.tileTitle}>Market Regime Awareness</span>
                <Activity size={12} color="var(--tv-color-text-secondary)" />
              </div>
              
              <div className={styles.pulseContainer}>
                <div className={styles.pulseCircle}>
                  {radarData.pulseScore}
                </div>
                <div className={styles.pulseInfo}>
                  <div className={classNames(styles.marketMode, {
                    [styles.modeTrendingUp]: radarData.marketMode === 'TRENDING UP',
                    [styles.modeTrendingDown]: radarData.marketMode === 'TRENDING DOWN',
                    [styles.modeChoppy]: radarData.marketMode === 'CHOPPY',
                    [styles.modeNeutral]: radarData.marketMode === 'NEUTRAL',
                  })}>
                    {radarData.marketMode}
                  </div>
                  <div className={styles.tileTitle} style={{ fontSize: '9px' }}>
                    Market Pulse Score
                  </div>
                </div>
              </div>

              <div className={styles.statsGrid}>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Bullish Stack</span>
                  <span className={styles.statValue} style={{ color: '#26A69A' }}>
                    {radarData.bullishStackPercent}%
                  </span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Above 20 SMA</span>
                  <span className={styles.statValue}>
                    {Math.round((radarData.stocksAbove20SMA / radarData.totalScanned) * 100)}%
                  </span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Above 50 SMA</span>
                  <span className={styles.statValue}>
                    {Math.round((radarData.stocksAbove50SMA / radarData.totalScanned) * 100)}%
                  </span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Breadth Health</span>
                  <span className={styles.statValue}>
                    {radarData.pulseScore > 60 ? 'Healthy' : radarData.pulseScore > 40 ? 'Fair' : 'Weak'}
                  </span>
                </div>
              </div>
            </div>

            {/* Sector Heatmap Tile */}
            <div className={styles.radarTile}>
              <div className={styles.tileHeader}>
                <span className={styles.tileTitle}>Sector Heatmap (RSI 14)</span>
                <Layout size={12} color="var(--tv-color-text-secondary)" />
              </div>
              
              <div className={styles.heatmap}>
                {radarData.sectorData.map((sector) => (
                  <div key={sector.name} className={styles.sectorRow}>
                    <span className={styles.sectorName}>{sector.name}</span>
                    <div className={styles.sectorBarContainer}>
                      <div 
                        className={classNames(styles.sectorBar, {
                          [styles.barLeader]: sector.label === 'Leader',
                          [styles.barNeutral]: sector.label === 'Neutral',
                          [styles.barLaggard]: sector.label === 'Laggard',
                        })}
                        style={{ width: `${sector.rsi}%` }}
                      />
                      <span className={styles.rsiLabel}>{sector.rsi}</span>
                    </div>
                    <span className={classNames(styles.labelTag, {
                      [styles.modeTrendingUp]: sector.label === 'Leader',
                      [styles.modeTrendingDown]: sector.label === 'Laggard',
                      [styles.modeNeutral]: sector.label === 'Neutral',
                    })}>
                      {sector.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className={styles.emptyState}>
            <Radar size={48} className={styles.emptyIcon} />
            <p className={styles.emptyTitle}>Regime Awareness System</p>
            <p className={styles.emptySubtitle}>
              Analyze market breadth, pulse, and sector rotation across the Nifty 50 index constituents.
            </p>
            {!isScanning && (
              <button 
                className={styles.scanBtn} 
                onClick={handleStartScan}
                style={{ marginTop: '12px' }}
              >
                <Play size={12} fill="currentColor" />
                Start Analysis
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <span>Nifty 50 Sample Analysis</span>
        {radarData && (
          <span>Updated: {new Date(radarData.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        )}
      </div>
    </div>
  );
};

export default React.memo(TradefinderScanner);

import React, { memo, useState } from 'react';
import classNames from 'classnames';
import { TrendingUp, Link2, Square } from 'lucide-react';
import styles from './PositionTrackerHeader.module.css';
import { SECTORS } from './sectorMapping';

const PositionTrackerHeader = memo(({
  sourceMode,
  onSourceModeChange,
  marketStatus,
  isMarketOpen,
  symbolCount,
  // Chart Sync props
  chartSyncConfig,
  onChartSyncConfigChange,
  chartCount = 1,
}) => {
  const [showSyncPanel, setShowSyncPanel] = useState(false);
  const [localGainersCount, setLocalGainersCount] = useState(Math.floor(chartCount / 2));
  const [localLosersCount, setLocalLosersCount] = useState(Math.ceil(chartCount / 2));
  const [localSector, setLocalSector] = useState('All');
  const [localMinPercent, setLocalMinPercent] = useState(0);
  const [localMinVolume, setLocalMinVolume] = useState(0);
  const [localRefreshInterval, setLocalRefreshInterval] = useState(0);

  const isSyncEnabled = chartSyncConfig?.enabled;
  const totalSelected = localGainersCount + localLosersCount;
  const isValidConfig = totalSelected === chartCount;

  const handleStartSync = () => {
    onChartSyncConfigChange?.({
      enabled: true,
      gainersCount: localGainersCount,
      losersCount: localLosersCount,
      sector: localSector,
      minPercentChange: localMinPercent,
      minVolume: localMinVolume,
      refreshInterval: localRefreshInterval
    });
    setShowSyncPanel(false);
  };

  const handleStopSync = () => {
    onChartSyncConfigChange?.({
      enabled: false,
      gainersCount: 0,
      losersCount: 0
    });
  };

  // Update local counts when chart count changes
  React.useEffect(() => {
    if (!isSyncEnabled) {
      setLocalGainersCount(Math.floor(chartCount / 2));
      setLocalLosersCount(Math.ceil(chartCount / 2));
    }
  }, [chartCount, isSyncEnabled]);

  return (
    <div className={styles.header}>
      {/* Title Row */}
      <div className={styles.titleRow}>
        <div className={styles.titleLeft}>
          <TrendingUp size={16} className={styles.titleIcon} />
          <span className={styles.title}>Position Flow</span>
          <span className={styles.count}>{symbolCount}</span>
        </div>
        <div className={styles.marketStatus}>
          <span
            className={classNames(
              styles.statusDot,
              isMarketOpen ? styles.open : styles.closed
            )}
          />
          <span className={styles.statusText}>{marketStatus}</span>
        </div>
      </div>

      {/* Source Toggle */}
      <div className={styles.toggleRow}>
        <div className={styles.sourceToggle}>
          <button
            className={classNames(
              styles.toggleBtn,
              { [styles.active]: sourceMode === 'watchlist' }
            )}
            onClick={() => onSourceModeChange('watchlist')}
          >
            Watchlist
          </button>
          <button
            className={classNames(
              styles.toggleBtn,
              { [styles.active]: sourceMode === 'custom' }
            )}
            onClick={() => onSourceModeChange('custom')}
          >
            Custom
          </button>
        </div>
      </div>

      {/* Chart Sync Controls */}
      {chartCount > 1 && (
        <div className={styles.syncSection}>
          {!isSyncEnabled ? (
            <button
              className={styles.syncButton}
              onClick={() => setShowSyncPanel(!showSyncPanel)}
            >
              <Link2 size={14} />
              <span>Sync to Charts</span>
            </button>
          ) : (
            <button
              className={classNames(styles.syncButton, styles.active)}
              onClick={handleStopSync}
            >
              <Square size={14} />
              <span>Stop Sync</span>
            </button>
          )}

          {/* Sync Configuration Panel */}
          {showSyncPanel && !isSyncEnabled && (
            <div className={styles.syncPanel}>
              <div className={styles.syncRow}>
                <label>Sector:</label>
                <select
                  value={localSector}
                  onChange={(e) => setLocalSector(e.target.value)}
                  className={styles.syncSelect}
                >
                  {SECTORS.map(sector => (
                    <option key={sector} value={sector}>{sector}</option>
                  ))}
                </select>
              </div>
              <div className={styles.syncRow}>
                <label>Min %:</label>
                <input
                  type="number"
                  value={localMinPercent}
                  onChange={(e) => setLocalMinPercent(Number(e.target.value))}
                  className={styles.syncInput}
                  min="0"
                  step="0.5"
                  placeholder="0"
                />
              </div>
              <div className={styles.syncRow}>
                <label>Min Vol:</label>
                <input
                  type="number"
                  value={localMinVolume}
                  onChange={(e) => setLocalMinVolume(Number(e.target.value))}
                  className={styles.syncInput}
                  min="0"
                  step="10000"
                  placeholder="0"
                />
              </div>
              <div className={styles.syncRow}>
                <label>Refresh:</label>
                <select
                  value={localRefreshInterval}
                  onChange={(e) => setLocalRefreshInterval(Number(e.target.value))}
                  className={styles.syncSelect}
                >
                  <option value={0}>Off</option>
                  <option value={5000}>5 sec</option>
                  <option value={10000}>10 sec</option>
                  <option value={30000}>30 sec</option>
                </select>
              </div>
              <div className={styles.syncRow}>
                <label>Gainers:</label>
                <select
                  value={localGainersCount}
                  onChange={(e) => setLocalGainersCount(Number(e.target.value))}
                  className={styles.syncSelect}
                >
                  {Array.from({ length: chartCount + 1 }, (_, i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </div>
              <div className={styles.syncRow}>
                <label>Losers:</label>
                <select
                  value={localLosersCount}
                  onChange={(e) => setLocalLosersCount(Number(e.target.value))}
                  className={styles.syncSelect}
                >
                  {Array.from({ length: chartCount + 1 }, (_, i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </div>
              <div className={classNames(styles.syncInfo, { [styles.error]: !isValidConfig })}>
                Total: {totalSelected} / {chartCount} charts
              </div>
              <button
                className={styles.startSyncButton}
                disabled={!isValidConfig}
                onClick={handleStartSync}
              >
                Start Sync
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

PositionTrackerHeader.displayName = 'PositionTrackerHeader';

export default PositionTrackerHeader;

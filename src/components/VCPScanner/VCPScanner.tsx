import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { RefreshCw, ArrowUp, ArrowDown, AlertCircle, Activity } from 'lucide-react';
import styles from './VCPScanner.module.css';
import { vcpBreakoutMonitor } from '../../services/vcpBreakoutMonitor';
import type { VCPScanResult, VCPStatus } from '../../services/vcpScannerService';

type FilterType = 'all' | 'breakouts' | 'breakdowns' | 'zones';
type SortField = 'signalTime' | 'symbol' | 'status';

interface SymbolData {
  symbol: string;
  exchange: string;
}

export interface VCPScannerProps {
  onSymbolSelect: (data: SymbolData) => void;
  isAuthenticated: boolean;
}

const STATUS_RANK: Record<VCPStatus, number> = {
  long_breakout: 0,
  short_breakdown: 1,
  zone_formed: 2,
  c1_found: 3,
  no_zone: 4,
};

const STATUS_LABEL: Record<VCPStatus, string> = {
  long_breakout: 'Long Breakout',
  short_breakdown: 'Short Breakdown',
  zone_formed: 'Zone Formed',
  c1_found: 'C1 Found',
  no_zone: 'No Zone',
};

/**
 * Format a bar timestamp as IST HH:MM. The /history API returns timestamps
 * already IST-shifted (the wall-clock IST minute is encoded in the value's
 * UTC components — see timeUtils.ts/getISTComponents), so UTC accessors
 * recover the IST wall-clock; calling toLocaleTimeString would re-apply the
 * browser's offset and show the wrong time.
 */
const formatTime = (timestampSec: number | null): string => {
  if (!timestampSec) return '—';
  const date = new Date(timestampSec * 1000);
  const hh = date.getUTCHours().toString().padStart(2, '0');
  const mm = date.getUTCMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
};

/**
 * Format real wall-clock epoch (ms) as IST HH:MM:SS regardless of browser TZ.
 */
const formatNowIST = (epochMs: number): string =>
  new Date(epochMs).toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

const formatPrice = (price: number | null): string => {
  if (price === null || price === undefined) return '—';
  return price.toFixed(2);
};

const VCPScanner: React.FC<VCPScannerProps> = ({ onSymbolSelect, isAuthenticated }) => {
  const [results, setResults] = useState<VCPScanResult[]>(() => vcpBreakoutMonitor.getResults());
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortField, setSortField] = useState<SortField>('status');
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);

  // Subscribe to monitor results
  useEffect(() => {
    const unsubscribe = vcpBreakoutMonitor.subscribeResults((next) => {
      setResults(next);
      setLastUpdate(Date.now());
    });
    return unsubscribe;
  }, []);

  // Filter + sort
  const visibleResults = useMemo(() => {
    let list = results;

    if (filter === 'breakouts') {
      list = list.filter((r) => r.status === 'long_breakout');
    } else if (filter === 'breakdowns') {
      list = list.filter((r) => r.status === 'short_breakdown');
    } else if (filter === 'zones') {
      list = list.filter(
        (r) => r.status === 'zone_formed' || r.status === 'long_breakout' || r.status === 'short_breakdown'
      );
    }

    const sorted = [...list].sort((a, b) => {
      if (sortField === 'symbol') return a.symbol.localeCompare(b.symbol);
      if (sortField === 'signalTime') return (b.signalTime ?? 0) - (a.signalTime ?? 0);
      // 'status' — most-progressed first, then by signal time desc
      const sa = STATUS_RANK[a.status];
      const sb = STATUS_RANK[b.status];
      if (sa !== sb) return sa - sb;
      return (b.signalTime ?? 0) - (a.signalTime ?? 0);
    });

    return sorted;
  }, [results, filter, sortField]);

  const counts = useMemo(() => {
    const c = { breakouts: 0, breakdowns: 0, zones: 0, fired: 0 };
    for (const r of results) {
      if (r.status === 'long_breakout') { c.breakouts++; c.fired++; }
      else if (r.status === 'short_breakdown') { c.breakdowns++; c.fired++; }
      else if (r.status === 'zone_formed') c.zones++;
    }
    return c;
  }, [results]);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await vcpBreakoutMonitor.refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refreshing]);

  if (!isAuthenticated) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <AlertCircle size={32} />
          <p>Please log in to use the VCP Scanner</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>
          <Activity size={16} />
          <span>VCP Scanner</span>
          <span className={styles.subtitle}>3m</span>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className={styles.refreshBtn}
          title="Force scan now"
        >
          <RefreshCw size={14} className={refreshing ? styles.spinning : ''} />
        </button>
      </div>

      <div className={styles.summary}>
        <div className={styles.statBreakout}>
          <ArrowUp size={12} /> {counts.breakouts}
        </div>
        <div className={styles.statBreakdown}>
          <ArrowDown size={12} /> {counts.breakdowns}
        </div>
        <div className={styles.statZone}>Zones: {counts.zones}</div>
        <div className={styles.statTotal}>{results.length} scanned</div>
      </div>

      <div className={styles.filterBar}>
        {(['all', 'breakouts', 'breakdowns', 'zones'] as FilterType[]).map((f) => (
          <button
            key={f}
            type="button"
            className={filter === f ? styles.filterActive : styles.filterBtn}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <div className={styles.tableHeader}>
        <button
          type="button"
          className={styles.colHeader}
          onClick={() => setSortField('symbol')}
          style={{ flex: '1.5' }}
        >
          Symbol
        </button>
        <button
          type="button"
          className={styles.colHeader}
          onClick={() => setSortField('status')}
          style={{ flex: '1.6' }}
        >
          Status
        </button>
        <div className={styles.colHeaderStatic} style={{ flex: '2', textAlign: 'right' }}>
          Zone
        </div>
        <button
          type="button"
          className={styles.colHeader}
          onClick={() => setSortField('signalTime')}
          style={{ flex: '0.9', textAlign: 'right' }}
        >
          Time
        </button>
      </div>

      <div className={styles.list}>
        {visibleResults.length === 0 ? (
          <div className={styles.empty}>
            {results.length === 0
              ? 'Waiting for first scan… (runs every 3 min on bar close)'
              : `No matches for "${filter}"`}
          </div>
        ) : (
          visibleResults.map((r) => (
            <button
              key={`${r.symbol}:${r.exchange}`}
              type="button"
              className={styles.row}
              onClick={() => onSymbolSelect({ symbol: r.symbol, exchange: r.exchange })}
              data-status={r.status}
            >
              <div className={styles.cellSymbol} style={{ flex: '1.5' }}>
                <span className={styles.symbolText}>{r.symbol}</span>
                <span className={styles.exchangeText}>{r.exchange}</span>
              </div>
              <div className={styles.cellStatus} style={{ flex: '1.6' }}>
                {r.status === 'long_breakout' && <ArrowUp size={12} className={styles.iconLong} />}
                {r.status === 'short_breakdown' && <ArrowDown size={12} className={styles.iconShort} />}
                <span className={styles[`badge_${r.status}`] || ''}>{STATUS_LABEL[r.status]}</span>
              </div>
              <div className={styles.cellZone} style={{ flex: '2', textAlign: 'right' }}>
                {r.zoneHigh !== null && r.zoneLow !== null
                  ? `${formatPrice(r.zoneLow)} – ${formatPrice(r.zoneHigh)}`
                  : '—'}
              </div>
              <div className={styles.cellTime} style={{ flex: '0.9', textAlign: 'right' }}>
                {formatTime(r.signalTime)}
              </div>
            </button>
          ))
        )}
      </div>

      {lastUpdate && (
        <div className={styles.footer}>
          Last update: {formatNowIST(lastUpdate)} IST
        </div>
      )}
    </div>
  );
};

export default VCPScanner;

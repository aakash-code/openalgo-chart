import React, {
  useState, useEffect, useCallback, useRef, useMemo
} from 'react';
import {
  Zap, RefreshCw, Settings, Copy, Check, TrendingUp, TrendingDown,
  AlertCircle, Loader2, ArrowUpDown, Clock
} from 'lucide-react';
import classNames from 'classnames';
import styles from './BreakoutScanner.module.css';
import ScannerConfigPanel from './ScannerConfig';
import {
  scanSymbols, fetchTFWatchlist, msUntilNextBarClose,
  loadConfig, saveConfig, DEFAULT_SCANNER_CONFIG
} from '../../services/breakoutScannerService';
import { NIFTY_50 } from '../../data/stockLists';
import type { ScannerConfig, ScanSignal, ScanProgress } from '../../types/scanner';

// ── Types ───────────────────────────────────────────────────────────────────────

interface SymbolData { symbol: string; exchange: string; }

export interface BreakoutScannerProps {
  watchlistSymbols?: SymbolData[];
  onSymbolSelect: (data: SymbolData) => void;
  isAuthenticated: boolean;
  showToast?: (message: string, type: string) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtCountdown(ms: number): string {
  if (ms <= 0) return '0:00';
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function copySignalText(s: ScanSignal): string {
  const t = s.target > 0 ? `  T ${s.target.toFixed(2)}` : '';
  return `${s.symbol} ${s.direction} ${s.qty} @ ${s.entry.toFixed(2)}  SL ${s.sl.toFixed(2)}${t}`;
}

function buildSymbolList(
  cfg: ScannerConfig,
  watchlist: SymbolData[]
): { symbol: string; exchange: string }[] {
  if (cfg.source === 'watchlist') {
    return watchlist.filter(s => s.symbol && !s.symbol.startsWith('###'));
  }
  if (cfg.source === 'custom') {
    return cfg.customSymbols
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(Boolean)
      .map(s => ({ symbol: s, exchange: 'NSE' }));
  }
  // 'tradefinder' — symbols populated after TF fetch; fall back to Nifty 50
  return NIFTY_50.map(s => ({ symbol: s.symbol, exchange: s.exchange }));
}

// ── Component ──────────────────────────────────────────────────────────────────

const BreakoutScanner: React.FC<BreakoutScannerProps> = ({
  watchlistSymbols = [],
  onSymbolSelect,
  isAuthenticated,
  showToast,
}) => {
  const [config, setConfig]           = useState<ScannerConfig>(loadConfig);
  const [showConfig, setShowConfig]   = useState(false);
  const [signals, setSignals]         = useState<ScanSignal[]>([]);
  const [isScanning, setIsScanning]   = useState(false);
  const [progress, setProgress]       = useState<ScanProgress>({ current: 0, total: 0 });
  const [countdown, setCountdown]     = useState(msUntilNextBarClose());
  const [lastScan, setLastScan]       = useState<string>('');
  const [error, setError]             = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx]     = useState<number | null>(null);
  const [filterDir, setFilterDir]     = useState<'all' | 'LONG' | 'SHORT'>('all');
  const [sortDesc, setSortDesc]       = useState(true);

  const abortRef    = useRef<AbortController | null>(null);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoRef     = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Scan ──────────────────────────────────────────────────────────────────────

  const runScan = useCallback(async (cfg: ScannerConfig) => {
    if (!isAuthenticated) { setError('Not authenticated'); return; }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setIsScanning(true);
    setError(null);
    setProgress({ current: 0, total: 0 });

    try {
      let symbols = buildSymbolList(cfg, watchlistSymbols);

      // For TradeFinder source: fetch live symbol list first
      if (cfg.source === 'tradefinder') {
        if (!cfg.tfJwt.trim()) {
          setError('Paste your TradeFinder JWT in Config → JWT Token');
          setIsScanning(false);
          return;
        }
        try {
          const tfStocks = await fetchTFWatchlist(
            cfg.tfJwt.trim(),
            cfg.maxStocks > 0 ? cfg.maxStocks : 60
          );
          symbols = tfStocks.map(s => ({ symbol: s.symbol, exchange: 'NSE' }));
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          setError(`TradeFinder: ${msg}`);
          setIsScanning(false);
          return;
        }
      }

      if (symbols.length === 0) {
        setError('No symbols to scan. Check config → Stock Universe.');
        setIsScanning(false);
        return;
      }

      const result = await scanSymbols(
        symbols, cfg,
        p => setProgress(p),
        ctrl.signal
      );

      if (!ctrl.signal.aborted) {
        setSignals(result.signals);
        const now = new Date();
        setLastScan(
          `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`
        );
        if (result.signalCount === 0) {
          showToast?.(`Scanned ${result.scannedCount} stocks — no signals on last bar`, 'info');
        } else {
          showToast?.(`${result.signalCount} signal${result.signalCount > 1 ? 's' : ''} found on ${result.scannedCount} stocks`, 'success');
        }
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'AbortError') {
        setError(e.message);
      }
    } finally {
      if (!ctrl.signal.aborted) setIsScanning(false);
    }
  }, [isAuthenticated, watchlistSymbols, showToast]);

  // ── Auto-refresh: schedule next scan at the next 5m bar close ─────────────────

  const scheduleNext = useCallback((cfg: ScannerConfig) => {
    if (autoRef.current) clearTimeout(autoRef.current);
    if (!cfg.autoRefresh) return;
    const ms = msUntilNextBarClose();
    autoRef.current = setTimeout(() => {
      runScan(cfg);
      scheduleNext(cfg);
    }, ms);
  }, [runScan]);

  // ── Countdown timer ───────────────────────────────────────────────────────────

  useEffect(() => {
    timerRef.current = setInterval(() => setCountdown(msUntilNextBarClose()), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // ── Start auto-refresh whenever config changes ────────────────────────────────

  useEffect(() => {
    scheduleNext(config);
    return () => { if (autoRef.current) clearTimeout(autoRef.current); };
  }, [config, scheduleNext]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoRef.current)  clearTimeout(autoRef.current);
    };
  }, []);

  // ── Config save ───────────────────────────────────────────────────────────────

  const handleConfigChange = useCallback((cfg: ScannerConfig) => {
    setConfig(cfg);
    saveConfig(cfg);
  }, []);

  // ── Copy to clipboard ─────────────────────────────────────────────────────────

  const handleCopy = useCallback((sig: ScanSignal, idx: number) => {
    navigator.clipboard.writeText(copySignalText(sig)).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
      showToast?.(copySignalText(sig), 'success');
    });
  }, [showToast]);

  // ── Filtered + sorted signals ─────────────────────────────────────────────────

  const displayed = useMemo(() => {
    let list = filterDir === 'all' ? signals : signals.filter(s => s.direction === filterDir);
    if (!sortDesc) list = [...list].reverse();
    return list;
  }, [signals, filterDir, sortDesc]);

  // ── Show config panel ─────────────────────────────────────────────────────────

  if (showConfig) {
    return (
      <ScannerConfigPanel
        config={config}
        onChange={handleConfigChange}
        onClose={() => setShowConfig(false)}
      />
    );
  }

  const longCount  = signals.filter(s => s.direction === 'LONG').length;
  const shortCount = signals.filter(s => s.direction === 'SHORT').length;

  return (
    <div className={styles.container}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.title}>
          <Zap size={14} className={styles.titleIcon} />
          <span>Breakout Scanner</span>
          {signals.length > 0 && (
            <span className={styles.badge}>{signals.length}</span>
          )}
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.iconBtn}
            onClick={() => runScan(config)}
            disabled={isScanning}
            title="Scan now"
          >
            {isScanning
              ? <Loader2 size={13} className={styles.spin} />
              : <RefreshCw size={13} />}
          </button>
          <button
            className={styles.iconBtn}
            onClick={() => setShowConfig(true)}
            title="Settings"
          >
            <Settings size={13} />
          </button>
        </div>
      </div>

      {/* ── Status bar ── */}
      <div className={styles.statusBar}>
        <div className={styles.statusLeft}>
          {isScanning ? (
            <span className={styles.scanning}>
              Scanning {progress.current}/{progress.total}…
            </span>
          ) : lastScan ? (
            <span className={styles.lastScan}>Last: {lastScan}</span>
          ) : (
            <span className={styles.hint}>Click ↻ to scan or wait for next bar</span>
          )}
        </div>
        {config.autoRefresh && (
          <div className={styles.countdown}>
            <Clock size={10} />
            <span>{fmtCountdown(countdown)}</span>
          </div>
        )}
      </div>

      {/* ── Progress bar ── */}
      {isScanning && progress.total > 0 && (
        <div className={styles.progressTrack}>
          <div
            className={styles.progressFill}
            style={{ width: `${(progress.current / progress.total) * 100}%` }}
          />
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className={styles.error}>
          <AlertCircle size={12} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Filter bar ── */}
      {signals.length > 0 && (
        <div className={styles.filterBar}>
          {(['all', 'LONG', 'SHORT'] as const).map(d => (
            <button
              key={d}
              className={classNames(styles.filterBtn, {
                [styles.filterActive]: filterDir === d,
                [styles.filterLong]:  d === 'LONG',
                [styles.filterShort]: d === 'SHORT',
              })}
              onClick={() => setFilterDir(d)}
            >
              {d === 'all'
                ? `All (${signals.length})`
                : d === 'LONG'
                  ? `▲ Long (${longCount})`
                  : `▼ Short (${shortCount})`}
            </button>
          ))}
          <button
            className={styles.sortBtn}
            onClick={() => setSortDesc(p => !p)}
            title="Toggle sort order"
          >
            <ArrowUpDown size={11} />
          </button>
        </div>
      )}

      {/* ── Signal table ── */}
      <div className={styles.tableWrapper}>
        {displayed.length === 0 && !isScanning && (
          <div className={styles.empty}>
            {signals.length === 0
              ? 'No signals yet — click ↻ or wait for next 5m bar'
              : 'No signals match the current filter'}
          </div>
        )}

        {displayed.length > 0 && (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.thSymbol}>Symbol</th>
                <th className={styles.thDir}>Dir</th>
                <th className={styles.thNum}>Entry</th>
                <th className={styles.thNum}>SL</th>
                <th className={styles.thNum}>SL%</th>
                {config.targetRR > 0 && <th className={styles.thNum}>Target</th>}
                <th className={styles.thNum}>Qty</th>
                <th className={styles.thNum}>ADX</th>
                <th className={styles.thTime}>Time</th>
                <th className={styles.thAction}></th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((sig, idx) => (
                <tr
                  key={`${sig.symbol}-${sig.signalTs}`}
                  className={classNames(
                    styles.row,
                    sig.direction === 'LONG' ? styles.rowLong : styles.rowShort
                  )}
                >
                  {/* Symbol — click to navigate chart */}
                  <td
                    className={styles.tdSymbol}
                    onClick={() => onSymbolSelect({ symbol: sig.symbol, exchange: sig.exchange })}
                    title={`Open ${sig.symbol} on 5m chart`}
                  >
                    {sig.direction === 'LONG'
                      ? <TrendingUp size={10} className={styles.dirIconUp} />
                      : <TrendingDown size={10} className={styles.dirIconDn} />}
                    <span>{sig.symbol}</span>
                    <span className={styles.kind}>{sig.kind === 'double' ? 'dbl' : 'sgl'}</span>
                  </td>

                  {/* Direction badge */}
                  <td className={styles.tdDir}>
                    <span className={classNames(
                      styles.dirBadge,
                      sig.direction === 'LONG' ? styles.badgeLong : styles.badgeShort
                    )}>
                      {sig.direction}
                    </span>
                  </td>

                  <td className={styles.tdNum}>{sig.entry.toFixed(2)}</td>

                  <td className={classNames(styles.tdNum, styles.tdSl)}>
                    {sig.sl.toFixed(2)}
                  </td>

                  <td className={classNames(styles.tdNum,
                    sig.slPct < 0.5 ? styles.slTight : sig.slPct > 2 ? styles.slWide : ''
                  )}>
                    {sig.slPct.toFixed(2)}%
                  </td>

                  {config.targetRR > 0 && (
                    <td className={styles.tdNum}>{sig.target.toFixed(2)}</td>
                  )}

                  <td className={styles.tdNum}>{sig.qty}</td>

                  <td className={classNames(
                    styles.tdNum,
                    sig.adx >= 30 ? styles.adxStrong : ''
                  )}>
                    {sig.adx.toFixed(0)}
                  </td>

                  <td className={styles.tdTime}>{sig.signalTime}</td>

                  {/* Copy button */}
                  <td className={styles.tdAction}>
                    <button
                      className={classNames(styles.copyBtn, {
                        [styles.copyDone]: copiedIdx === idx
                      })}
                      onClick={() => handleCopy(sig, idx)}
                      title={copySignalText(sig)}
                    >
                      {copiedIdx === idx
                        ? <Check size={11} />
                        : <Copy size={11} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Source chip ── */}
      <div className={styles.footer}>
        <span className={styles.sourceChip}>
          {config.source === 'tradefinder' ? '⚡ TradeFinder' :
           config.source === 'watchlist'   ? '📋 Watchlist'   : '✏ Custom'}
        </span>
        <span className={styles.footerRight}>
          {config.useVwap && <span className={styles.chip}>VWAP</span>}
          {config.useAdx  && <span className={styles.chip}>ADX≥{config.adxThreshold}</span>}
          {config.enableDouble && !config.enableSingle && <span className={styles.chip}>dbl</span>}
        </span>
      </div>
    </div>
  );
};

export default BreakoutScanner;

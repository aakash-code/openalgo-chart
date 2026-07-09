/**
 * VCP Breakout Monitor
 *
 * Background scanner that runs on every 3-minute bar boundary, evaluates the
 * VCP (Volume Centric Pair) indicator for each watchlist symbol, and fires a
 * callback when a Long Breakout or Short Breakdown signal is detected.
 *
 * Signals are deduped per symbol-day-direction so we never re-notify the same
 * breakout twice within a session.
 */

import {
  scanStocks,
  getSignalDedupKey,
  type VCPStockInput,
  type VCPScanResult,
} from './vcpScannerService';
import logger from '../utils/logger';

// ==================== TYPES ====================

/** Notification event fired when a new breakout/breakdown is detected */
export interface VCPNotificationEvent {
  symbol: string;
  exchange: string;
  direction: 'long' | 'short';
  signalText: string;
  signalTime: number;
  zoneHigh: number;
  zoneLow: number;
  /** Close of the breakout candle — used as the planned entry by the trade engine */
  entryPrice: number;
  /** ATR(14) on the scan timeframe; null when warmup period not yet met */
  atr: number | null;
  /** C1 candle high/low — needed by the C2-based SL strategy */
  c1High: number | null;
  c1Low: number | null;
  /** C2 candle high/low — needed by the C2-based SL strategy */
  c2High: number | null;
  c2Low: number | null;
  timestamp: number;
}

export type VCPNotificationCallback = (event: VCPNotificationEvent) => void;

/** Listener for full results updates (panel UI) */
export type VCPResultsListener = (results: VCPScanResult[]) => void;

// ==================== CONSTANTS ====================

const SCAN_INTERVAL_MIN = 3;
const BAR_CLOSE_GRACE_MS = 2000; // wait 2s after bar close before scanning
const STORAGE_KEY = 'tv_vcp_fired_signals';
const RESULTS_STORAGE_KEY = 'tv_vcp_scanner_results';
const SIGNAL_RETENTION_MS = 24 * 60 * 60 * 1000; // 24h

// IST market hours
const MARKET_OPEN_MIN = 9 * 60 + 15;
const MARKET_CLOSE_MIN = 15 * 60 + 30;

// ==================== HELPERS ====================

/**
 * Convert a Date to IST minutes-since-midnight using the same UTC-trick the
 * candle data uses (server returns IST-shifted timestamps).
 */
const getISTMinuteOfDay = (now: Date): number => {
  // Use Asia/Kolkata offset (+05:30) explicitly so this works regardless of host TZ.
  const istMs = now.getTime() + (5 * 60 + 30) * 60 * 1000;
  const ist = new Date(istMs);
  return ist.getUTCHours() * 60 + ist.getUTCMinutes();
};

/**
 * True when the current wall-clock time is within Indian market hours.
 */
const isMarketOpenNow = (): boolean => {
  const minute = getISTMinuteOfDay(new Date());
  return minute >= MARKET_OPEN_MIN && minute <= MARKET_CLOSE_MIN;
};

/**
 * Today's date in IST as YYYY-MM-DD. Matches the convention used by
 * `getSignalDedupKey` in vcpScannerService so dedup-key lookups line up.
 */
const todayIstDateStr = (): string => {
  const now = Date.now() + (5 * 60 + 30) * 60 * 1000;
  return new Date(now).toISOString().split('T')[0] as string;
};

/**
 * Milliseconds until the next 3-minute bar close + grace.
 * 3-min bars close at minutes that are multiples of 3 (e.g., 9:18, 9:21...).
 */
const msUntilNextBarClose = (): number => {
  const now = new Date();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const ms = now.getMilliseconds();

  const minutesIntoBar = minutes % SCAN_INTERVAL_MIN;
  const totalMsIntoBar = minutesIntoBar * 60_000 + seconds * 1000 + ms;
  const msToBoundary = SCAN_INTERVAL_MIN * 60_000 - totalMsIntoBar;

  return msToBoundary + BAR_CLOSE_GRACE_MS;
};

/**
 * Load the persisted set of already-fired signal dedup keys (24h retention).
 */
const loadFiredSignals = (): Set<string> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as Record<string, number>;
    if (!parsed || typeof parsed !== 'object') return new Set();
    const cutoff = Date.now() - SIGNAL_RETENTION_MS;
    const fresh = new Set<string>();
    for (const [key, ts] of Object.entries(parsed)) {
      if (typeof ts === 'number' && ts >= cutoff) fresh.add(key);
    }
    return fresh;
  } catch (err) {
    logger.warn('[VCPBreakoutMonitor] Failed to load fired signals:', err);
    return new Set();
  }
};

const saveFiredSignals = (keys: Map<string, number>): void => {
  try {
    const cutoff = Date.now() - SIGNAL_RETENTION_MS;
    const fresh: Record<string, number> = {};
    for (const [key, ts] of keys.entries()) {
      if (ts >= cutoff) fresh[key] = ts;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  } catch (err) {
    logger.warn('[VCPBreakoutMonitor] Failed to save fired signals:', err);
  }
};

// ---------- Results cache (per IST trading day) ----------

interface ResultsCache {
  /** YYYY-MM-DD IST when these results were saved */
  date: string;
  /** Filtered to stocks with meaningful state (we drop the noisy no_zone ones) */
  results: VCPScanResult[];
}

/**
 * Load cached scan results from localStorage. Returns [] if cache is missing,
 * malformed, or stale (different IST day). Lets the panel show today's
 * accumulated findings immediately on app boot — even before the first new
 * scan completes — and survives reloads.
 */
const loadCachedResults = (): VCPScanResult[] => {
  try {
    const raw = localStorage.getItem(RESULTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ResultsCache;
    if (!parsed || parsed.date !== todayIstDateStr() || !Array.isArray(parsed.results)) return [];
    return parsed.results;
  } catch {
    return [];
  }
};

/**
 * Persist non-noise scan results (anything past `no_zone`) to localStorage.
 * Only meaningful states are saved so we don't waste 5–10 KB on a watchlist
 * full of unmeaningful entries; on hydrate, no_zone stocks just get re-scanned
 * fresh on the first scan tick.
 */
const saveCachedResults = (results: VCPScanResult[]): void => {
  try {
    const meaningful = results.filter((r) => r.status !== 'no_zone');
    if (meaningful.length === 0) {
      // Nothing useful to remember — clear out any stale entry so we don't
      // hydrate yesterday's leftovers tomorrow.
      localStorage.removeItem(RESULTS_STORAGE_KEY);
      return;
    }
    const cache: ResultsCache = { date: todayIstDateStr(), results: meaningful };
    localStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(cache));
  } catch (err) {
    logger.warn('[VCPBreakoutMonitor] Failed to save scan results:', err);
  }
};

// ==================== MONITOR ====================

class VCPBreakoutMonitor {
  private _isRunning: boolean = false;
  private _onNotify: VCPNotificationCallback | null = null;
  private _resultsListeners: Set<VCPResultsListener> = new Set();

  private _watchlist: VCPStockInput[] = [];
  private _results: VCPScanResult[] = [];
  private _firedSignals: Map<string, number> = new Map();

  private _scanTimer: ReturnType<typeof setTimeout> | null = null;
  private _abortController: AbortController | null = null;
  private _isScanning: boolean = false;

  constructor() {
    // Hydrate fired-signal cache from previous sessions
    const persisted = loadFiredSignals();
    for (const key of persisted) this._firedSignals.set(key, Date.now());

    // Hydrate today's scan results (only meaningful states are persisted) so
    // the panel shows everything found earlier today even right after a page
    // reload, before the next 3-min scan tick fires.
    const cached = loadCachedResults();
    if (cached.length > 0) {
      this._results = cached;
      logger.info(`[VCPBreakoutMonitor] Hydrated ${cached.length} cached scan results from earlier today`);
    }
  }

  // ---------- lifecycle ----------

  start(onNotify: VCPNotificationCallback): void {
    if (this._isRunning) {
      this._onNotify = onNotify;
      return;
    }
    this._isRunning = true;
    this._onNotify = onNotify;
    logger.info('[VCPBreakoutMonitor] Started');

    // Run an immediate scan to populate state, then schedule the next bar boundary
    this._runScan().finally(() => this._scheduleNext());
  }

  stop(): void {
    if (!this._isRunning) return;
    this._isRunning = false;

    if (this._scanTimer) {
      clearTimeout(this._scanTimer);
      this._scanTimer = null;
    }
    if (this._abortController) {
      this._abortController.abort();
      this._abortController = null;
    }
    this._isScanning = false;
    logger.info('[VCPBreakoutMonitor] Stopped');
  }

  isRunning(): boolean {
    return this._isRunning;
  }

  // ---------- already-fired filter ----------

  /**
   * Has either Long Breakout or Short Breakdown already fired today for this
   * (symbol, exchange)? VCP creates one zone per stock per day; once a
   * decisive breakout fires, no new actionable signals are possible from that
   * stock today. Skipping it from the scanner saves an API call per cycle.
   */
  private _isAlreadyFiredToday(symbol: string, exchange: string): boolean {
    const today = todayIstDateStr();
    return (
      this._firedSignals.has(`${symbol}:${exchange}:${today}:long`) ||
      this._firedSignals.has(`${symbol}:${exchange}:${today}:short`)
    );
  }

  // ---------- watchlist sync ----------

  setWatchlist(stocks: VCPStockInput[]): void {
    // Dedupe by symbol:exchange so duplicate watchlist entries don't double-scan
    const map = new Map<string, VCPStockInput>();
    for (const s of stocks) {
      if (!s || !s.symbol) continue;
      const key = `${s.symbol}:${s.exchange || 'NSE'}`;
      if (!map.has(key)) {
        map.set(key, { symbol: s.symbol, exchange: s.exchange || 'NSE', name: s.name });
      }
    }
    this._watchlist = Array.from(map.values());
    logger.debug(`[VCPBreakoutMonitor] Watchlist updated: ${this._watchlist.length} symbols`);
  }

  // ---------- results subscription ----------

  getResults(): VCPScanResult[] {
    return this._results;
  }

  subscribeResults(listener: VCPResultsListener): () => void {
    this._resultsListeners.add(listener);
    // Push current snapshot to new listener
    listener(this._results);
    return () => {
      this._resultsListeners.delete(listener);
    };
  }

  private _emitResults(): void {
    // Persist meaningful results so the panel survives page reloads.
    saveCachedResults(this._results);
    for (const listener of this._resultsListeners) {
      try {
        listener(this._results);
      } catch (err) {
        logger.error('[VCPBreakoutMonitor] Listener error:', err);
      }
    }
  }

  // ---------- manual trigger ----------

  /** Force an immediate scan (does not affect the regular schedule) */
  async refresh(): Promise<void> {
    if (!this._isRunning || this._isScanning) return;
    await this._runScan();
  }

  // ---------- scheduling ----------

  private _scheduleNext(): void {
    if (!this._isRunning) return;
    if (this._scanTimer) clearTimeout(this._scanTimer);

    const delayMs = msUntilNextBarClose();
    this._scanTimer = setTimeout(() => {
      this._runScan().finally(() => this._scheduleNext());
    }, delayMs);
  }

  // ---------- scan execution ----------

  private async _runScan(): Promise<void> {
    if (!this._isRunning || this._isScanning) return;
    if (this._watchlist.length === 0) {
      logger.debug('[VCPBreakoutMonitor] Skip scan — empty watchlist');
      return;
    }
    if (!isMarketOpenNow()) {
      logger.debug('[VCPBreakoutMonitor] Skip scan — market closed');
      return;
    }

    // Partition watchlist: stocks that have ALREADY fired today are skipped
    // from the API loop. Their last known scan result is preserved so the
    // panel still shows them as "fired" — we just don't re-fetch their bars.
    const activeSymbols: VCPStockInput[] = [];
    const skippedSymbols: VCPStockInput[] = [];
    for (const stock of this._watchlist) {
      if (this._isAlreadyFiredToday(stock.symbol, stock.exchange)) {
        skippedSymbols.push(stock);
      } else {
        activeSymbols.push(stock);
      }
    }

    // Build a lookup of previous-scan results so we can carry them forward
    // for skipped symbols (preserves their "Long Breakout @ 13:46" display).
    const prevByKey = new Map<string, VCPScanResult>();
    for (const r of this._results) {
      prevByKey.set(`${r.symbol}:${r.exchange}`, r);
    }
    const preservedResults: VCPScanResult[] = [];
    for (const s of skippedSymbols) {
      const prev = prevByKey.get(`${s.symbol}:${s.exchange}`);
      if (prev) preservedResults.push(prev);
    }

    if (skippedSymbols.length > 0) {
      logger.info(
        `[VCPBreakoutMonitor] Skipping ${skippedSymbols.length} already-fired stocks; scanning ${activeSymbols.length}`
      );
    }

    // If everything has fired, nothing to scan — keep showing what we have.
    if (activeSymbols.length === 0) {
      this._results = [...preservedResults];
      this._emitResults();
      logger.info('[VCPBreakoutMonitor] All watchlist stocks already fired today — no fetch needed');
      return;
    }

    this._isScanning = true;
    this._abortController = new AbortController();
    const signal = this._abortController.signal;

    const startedAt = Date.now();
    // Start with preserved fired results so live updates always show the
    // full list (preserved + freshly-scanned).
    const scanned: VCPScanResult[] = [...preservedResults];

    try {
      const results = await scanStocks(
        activeSymbols,
        { interval: '3m', daysToFetch: 1, delayMs: 100 },
        (_current, _total, result) => {
          scanned.push(result);
          this._results = [...scanned];
          this._emitResults();
          this._maybeNotify(result);
        },
        signal
      );

      this._results = [...preservedResults, ...results];
      this._emitResults();

      logger.info(
        `[VCPBreakoutMonitor] Scan complete: ${results.length} fetched, ${preservedResults.length} preserved (${this._results.length} total) in ${
          Date.now() - startedAt
        }ms`
      );
    } catch (err) {
      const error = err as Error;
      if (error.name !== 'AbortError') {
        logger.error('[VCPBreakoutMonitor] Scan failed:', err);
      }
    } finally {
      this._isScanning = false;
      this._abortController = null;
    }
  }

  private _maybeNotify(result: VCPScanResult): void {
    if (result.status !== 'long_breakout' && result.status !== 'short_breakdown') return;
    if (!result.direction || !result.signalTime) return;

    const dedupKey = getSignalDedupKey(result);
    if (!dedupKey) return;
    if (this._firedSignals.has(dedupKey)) return;

    this._firedSignals.set(dedupKey, Date.now());
    saveFiredSignals(this._firedSignals);

    if (!this._onNotify) return;

    try {
      this._onNotify({
        symbol: result.symbol,
        exchange: result.exchange,
        direction: result.direction,
        signalText: result.signalText || (result.direction === 'long' ? 'Long Breakout' : 'Short Breakdown'),
        signalTime: result.signalTime,
        zoneHigh: result.zoneHigh ?? 0,
        zoneLow: result.zoneLow ?? 0,
        entryPrice: result.entryPrice ?? 0,
        atr: result.atr,
        c1High: result.c1High,
        c1Low: result.c1Low,
        c2High: result.c2High,
        c2Low: result.c2Low,
        timestamp: Date.now(),
      });
    } catch (err) {
      logger.error('[VCPBreakoutMonitor] Notification callback error:', err);
    }
  }
}

// ==================== SINGLETON ====================

export const vcpBreakoutMonitor = new VCPBreakoutMonitor();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    vcpBreakoutMonitor.stop();
  });
}

export default vcpBreakoutMonitor;

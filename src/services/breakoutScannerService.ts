/**
 * Breakout Scanner Service
 *
 * TypeScript port of strategies/breakout_intraday_strategy.py — validated
 * against Pine "Intraday Signals & Risk Calculator [India v5.6]" on 58 stocks.
 *
 * Signal logic:
 *   buy2  (double): green, prev green, prev2 red,  close > high[2]  → SL = min(L,L1,L2)
 *   sell2 (double): red,  prev red,  prev2 green, close < low[2]   → SL = max(H,H1,H2)
 *   buy1  (single): green, prev red,  close > high[1]              → SL = min(L,L1)
 *   sell1 (single): red,  prev green, close < low[1]               → SL = max(H,H1)
 *
 * Filters: VWAP direction + ADX ≥ threshold (Wilder smoothing, same as Python)
 * Sizing:  qty = min(floor(risk_budget / sl_dist), floor(capital_per_trade / entry))
 */

import { getKlines } from './chartDataService';
import type { Candle } from './chartDataService';
import type { ScannerConfig, ScanSignal, ScanResult, ScanProgress } from '../types/scanner';

// ── IST helpers ────────────────────────────────────────────────────────────────

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function nowIST(): Date {
  return new Date(Date.now() + IST_OFFSET_MS);
}

function toISTDate(unixSec: number): string {
  return new Date(unixSec * 1000 + IST_OFFSET_MS).toISOString().slice(0, 10);
}

function toISTHHMM(unixSec: number): string {
  const d = new Date(unixSec * 1000 + IST_OFFSET_MS);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

function istHM(unixSec: number): number {
  const d = new Date(unixSec * 1000 + IST_OFFSET_MS);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

// ── Indicators ─────────────────────────────────────────────────────────────────

/** Intraday VWAP — daily reset, returns array aligned with candles */
function computeVWAP(candles: Candle[]): number[] {
  const vwap = new Array<number>(candles.length).fill(0);
  let cumPV = 0, cumV = 0;
  let currentDate = '';
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const d = toISTDate(c.time);
    if (d !== currentDate) {
      cumPV = 0; cumV = 0;
      currentDate = d;
    }
    const tp = (c.high + c.low + c.close) / 3;
    cumPV += tp * c.volume;
    cumV  += c.volume;
    vwap[i] = cumV > 0 ? cumPV / cumV : c.close;
  }
  return vwap;
}

/**
 * Wilder ADX — EWM alpha=1/period (matches Python `ewm(alpha=alpha, adjust=False)`)
 * Returns array aligned with candles.
 */
function computeADX(candles: Candle[], period: number): number[] {
  const n = candles.length;
  const adx = new Array<number>(n).fill(0);
  if (n < period + 1) return adx;

  const alpha = 1.0 / period;

  // TR, +DM, -DM
  const tr    = new Array<number>(n).fill(0);
  const pDM   = new Array<number>(n).fill(0);
  const mDM   = new Array<number>(n).fill(0);

  for (let i = 1; i < n; i++) {
    const c = candles[i], p = candles[i - 1];
    tr[i]  = Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close));
    const up = c.high - p.high;
    const dn = p.low  - c.low;
    pDM[i]  = (up > dn && up > 0) ? up : 0;
    mDM[i]  = (dn > up && dn > 0) ? dn : 0;
  }

  // Wilder EWM (adjust=False) — rolling from index 1
  let atr = tr[1], pdi = pDM[1], mdi = mDM[1];
  const plusDI  = new Array<number>(n).fill(0);
  const minusDI = new Array<number>(n).fill(0);

  for (let i = 1; i < n; i++) {
    atr = atr * (1 - alpha) + tr[i]  * alpha;
    pdi = pdi * (1 - alpha) + pDM[i] * alpha;
    mdi = mdi * (1 - alpha) + mDM[i] * alpha;
    plusDI[i]  = atr > 0 ? (100 * pdi / atr) : 0;
    minusDI[i] = atr > 0 ? (100 * mdi / atr) : 0;
  }

  // DX → ADX
  let adxVal = 0;
  for (let i = 1; i < n; i++) {
    const sum = plusDI[i] + minusDI[i];
    const dx  = sum > 0 ? (100 * Math.abs(plusDI[i] - minusDI[i]) / sum) : 0;
    adxVal    = adxVal * (1 - alpha) + dx * alpha;
    adx[i]    = adxVal;
  }
  return adx;
}

// ── Sizing ──────────────────────────────────────────────────────────────────────

function computeQty(entry: number, sl: number, cfg: ScannerConfig): number {
  const slDist = Math.abs(entry - sl);
  if (slDist < 0.01 || entry <= 0) return 0;
  const riskBudget = cfg.balance * (cfg.maxLossPct / 100);
  const qtyRisk    = Math.floor(riskBudget / slDist);
  const qtyCap     = Math.floor(cfg.capitalPerTrade / entry);
  return Math.max(0, Math.min(qtyRisk, qtyCap));
}

// ── Signal detection on today's 5m bars ────────────────────────────────────────

function detectSignal(
  candles: Candle[],
  vwap: number[],
  adx: number[],
  cfg: ScannerConfig
): ScanSignal | null {
  const today = nowIST().toISOString().slice(0, 10);

  // Session 09:15 – 15:00 (entry cutoff)
  const SESSION_START = 9 * 60 + 15;
  const ENTRY_CUTOFF  = 15 * 60;

  // Filter to today's session
  const todayBars: { c: Candle; v: number; a: number }[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (toISTDate(candles[i].time) !== today) continue;
    const hm = istHM(candles[i].time);
    if (hm < SESSION_START || hm > 15 * 60 + 25) continue;
    todayBars.push({ c: candles[i], v: vwap[i], a: adx[i] });
  }

  // Need ≥ 4 bars; drop the last (still forming)
  if (todayBars.length < 4) return null;
  const bars = todayBars.slice(0, -1); // drop forming bar
  if (bars.length < 3) return null;

  const { c: b, v: bVwap, a: bAdx } = bars[bars.length - 1];
  const { c: p1 }                    = bars[bars.length - 2];
  const { c: p2 }                    = bars[bars.length - 3];

  // Entry cutoff check on signal bar
  const sigHM = istHM(b.time);
  if (sigHM < SESSION_START || sigHM > ENTRY_CUTOFF) return null;

  const isGreen  = b.close  > b.open;
  const isRed    = b.close  < b.open;
  const p1Green  = p1.close > p1.open;
  const p1Red    = p1.close < p1.open;
  const p2Green  = p2.close > p2.open;
  const p2Red    = p2.close < p2.open;

  // Pattern flags
  const buy1  = cfg.enableSingle && cfg.enableBuy  && isGreen && p1Red   && b.close > p1.high;
  const sell1 = cfg.enableSingle && cfg.enableSell && isRed   && p1Green && b.close < p1.low;
  const buy2  = cfg.enableDouble && cfg.enableBuy  && isGreen && p1Green && p2Red   && b.close > p2.high;
  const sell2 = cfg.enableDouble && cfg.enableSell && isRed   && p1Red   && p2Green && b.close < p2.low;

  // Filters
  const vwapBuyOk  = !cfg.useVwap || b.close > bVwap;
  const vwapSellOk = !cfg.useVwap || b.close < bVwap;
  const adxOk      = !cfg.useAdx  || bAdx >= cfg.adxThreshold;

  let direction: 'LONG' | 'SHORT' | null = null;
  let sl = 0;
  let kind: 'single' | 'double' = 'double';

  if ((buy1 || buy2) && vwapBuyOk && adxOk) {
    direction = 'LONG';
    sl        = buy1 ? Math.min(b.low, p1.low) : Math.min(b.low, p1.low, p2.low);
    kind      = buy1 ? 'single' : 'double';
  } else if ((sell1 || sell2) && vwapSellOk && adxOk) {
    direction = 'SHORT';
    sl        = sell1 ? Math.max(b.high, p1.high) : Math.max(b.high, p1.high, p2.high);
    kind      = sell1 ? 'single' : 'double';
  }

  if (!direction) return null;

  const entry  = b.close;
  const slDist = Math.abs(entry - sl);
  const slPct  = entry > 0 ? (slDist / entry) * 100 : 0;

  // Min SL distance guard (skip tiny-SL trades where charges > profit)
  if (cfg.minSlDistPct > 0 && slPct < cfg.minSlDistPct) return null;

  // Direction guard
  if (direction === 'LONG'  && entry <= sl) return null;
  if (direction === 'SHORT' && entry >= sl) return null;

  const qty    = computeQty(entry, sl, cfg);
  if (qty <= 0) return null;

  const target = cfg.targetRR > 0
    ? (direction === 'LONG' ? entry + cfg.targetRR * slDist : entry - cfg.targetRR * slDist)
    : 0;

  return {
    symbol:     '',  // filled by caller
    exchange:   'NSE',
    direction,
    kind,
    entry:      +entry.toFixed(2),
    sl:         +sl.toFixed(2),
    slPct:      +slPct.toFixed(2),
    target:     +target.toFixed(2),
    qty,
    adx:        +bAdx.toFixed(1),
    vwap:       +bVwap.toFixed(2),
    signalTime: toISTHHMM(b.time),
    signalTs:   b.time * 1000,
  };
}

// ── TradeFinder watchlist proxy ─────────────────────────────────────────────────

export interface TFStock {
  symbol: string;
  score: number;
  ltp: number;
  change_pct: number;
}

export async function fetchTFWatchlist(jwt: string, top = 60): Promise<TFStock[]> {
  const url = `/api/scanner/tf_watchlist?jwt=${encodeURIComponent(jwt)}&top=${top}`;
  const resp = await fetch(url, { credentials: 'include' });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ message: resp.statusText }));
    throw new Error(err.message || 'TF watchlist fetch failed');
  }
  const data = await resp.json();
  if (data.status !== 'success') throw new Error(data.message || 'TF error');
  return data.symbols as TFStock[];
}

// ── Main scan function ──────────────────────────────────────────────────────────

/**
 * Scan an array of symbols for breakout signals on the last closed 5m bar.
 * Fetches data in parallel batches of 10 to avoid overwhelming OpenAlgo.
 */
export async function scanSymbols(
  symbols: { symbol: string; exchange: string }[],
  cfg: ScannerConfig,
  onProgress?: (p: ScanProgress) => void,
  abortSignal?: AbortSignal
): Promise<ScanResult> {
  const t0      = Date.now();
  const signals: ScanSignal[] = [];
  const total   = symbols.length;
  let scanned   = 0;

  const BATCH = 10;
  for (let i = 0; i < total; i += BATCH) {
    if (abortSignal?.aborted) break;
    const batch = symbols.slice(i, i + BATCH);

    await Promise.all(batch.map(async ({ symbol, exchange }) => {
      try {
        const candles = await getKlines(symbol, exchange, '5m', 1000, abortSignal ?? undefined);
        if (!candles || candles.length < 10) return;

        const vwap = computeVWAP(candles);
        const adx  = computeADX(candles, cfg.adxPeriod);
        const sig  = detectSignal(candles, vwap, adx, cfg);
        if (sig) signals.push({ ...sig, symbol, exchange });
      } catch {
        // silent — network errors or missing symbols are normal
      } finally {
        scanned++;
        onProgress?.({ current: scanned, total });
      }
    }));
  }

  // Sort: newest signal first
  signals.sort((a, b) => b.signalTs - a.signalTs);

  return {
    signals,
    scannedCount:    scanned,
    signalCount:     signals.length,
    scanDurationMs:  Date.now() - t0,
    scanTs:          Date.now(),
  };
}

// ── Next 5-minute bar close (IST) ──────────────────────────────────────────────

/** Returns ms until the next 5m bar close, aligned to HH:15/20/25… IST */
export function msUntilNextBarClose(): number {
  const now = nowIST();
  const totalMin = now.getUTCHours() * 60 + now.getUTCMinutes();
  const nextMin  = Math.ceil((totalMin + 1) / 5) * 5;
  const diffMin  = nextMin - totalMin;
  const diffMs   = diffMin * 60 * 1000 - now.getUTCSeconds() * 1000 - now.getUTCMilliseconds();
  return Math.max(diffMs, 1000);
}

// ── Default config ──────────────────────────────────────────────────────────────

export const DEFAULT_SCANNER_CONFIG: ScannerConfig = {
  source:          'watchlist',
  customSymbols:   '',
  tfJwt:           '',
  maxStocks:       60,
  adxThreshold:    25,
  adxPeriod:       14,
  enableBuy:       true,
  enableSell:      true,
  enableSingle:    false,
  enableDouble:    true,
  useVwap:         true,
  useAdx:          true,
  minSlDistPct:    0.3,
  balance:         311000,
  capitalPerTrade: 50000,
  maxLossPct:      1.0,
  targetRR:        2.0,
  autoRefresh:     true,
};

export const CONFIG_STORAGE_KEY = 'breakout_scanner_config';

export function loadConfig(): ScannerConfig {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (raw) return { ...DEFAULT_SCANNER_CONFIG, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_SCANNER_CONFIG };
}

export function saveConfig(cfg: ScannerConfig): void {
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(cfg));
}

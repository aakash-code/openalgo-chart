// ── Breakout Signal Scanner — TypeScript types ─────────────────────────────

export type ScanSource = 'tradefinder' | 'watchlist' | 'custom';
export type SignalDirection = 'LONG' | 'SHORT';

/** All config stored in localStorage — every field has a sensible default */
export interface ScannerConfig {
  // Stock universe
  source: ScanSource;
  customSymbols: string;      // comma-separated when source='custom'
  tfJwt: string;              // TradeFinder JWT — paste each morning
  maxStocks: number;          // top-N from TF list (0 = all)

  // Signal filters
  adxThreshold: number;       // default 25
  adxPeriod: number;          // default 14
  enableBuy: boolean;         // default true
  enableSell: boolean;        // default true
  enableSingle: boolean;      // default false (single-candle breakouts)
  enableDouble: boolean;      // default true  (double-candle breakouts)
  useVwap: boolean;           // default true
  useAdx: boolean;            // default true
  minSlDistPct: number;       // default 0.3 — skip if SL < 0.3% away

  // Sizing (Pine risk calculator)
  balance: number;            // default 311000
  capitalPerTrade: number;    // default 50000
  maxLossPct: number;         // default 1.0
  targetRR: number;           // default 2.0 (0 = don't show target)

  // Refresh
  autoRefresh: boolean;       // default true
}

/** One breakout signal detected on the last closed 5m bar */
export interface ScanSignal {
  symbol: string;
  exchange: string;
  direction: SignalDirection;
  kind: 'single' | 'double';
  entry: number;              // signal candle close (≈ next-bar open)
  sl: number;                 // stop-loss price
  slPct: number;              // SL distance as % of entry
  target: number;             // entry ± targetRR × sl_dist (0 if targetRR=0)
  qty: number;                // risk-sized qty
  adx: number;
  vwap: number;
  signalTime: string;         // "HH:MM" IST of signal candle close
  signalTs: number;           // unix ms — used for dedup / sorting
}

/** Full result returned by one scan pass */
export interface ScanResult {
  signals: ScanSignal[];
  scannedCount: number;
  signalCount: number;
  scanDurationMs: number;
  scanTs: number;             // unix ms when scan completed
  error?: string;
}

/** Progress during a running scan */
export interface ScanProgress {
  current: number;
  total: number;
}

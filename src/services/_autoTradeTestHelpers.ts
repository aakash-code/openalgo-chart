/**
 * Test-only window exposure for the auto-trade pipeline.
 *
 * Imported once from main.tsx. In DEV builds only, this attaches singletons
 * to `window.__autoTrade` so Playwright tests (and console debugging) can
 * drive the system without touching internals via private members.
 *
 * Production builds tree-shake this away because the body is gated on
 * `import.meta.env.DEV`.
 */

import { vcpBreakoutMonitor } from './vcpBreakoutMonitor';
import { multiVariantEngine } from './multiVariantEngine';
import { positionStore } from './positionStore';
import { tradeJournal } from './tradeJournal';
import { STRATEGY_VARIANTS, setVariantEnabled } from './strategyRegistry';
import * as autoTradeConfig from './autoTradeConfig';
import { setAnalyzerMode, getAnalyzerStatus } from './openalgoAnalyzer';
import { __testSeedLiquidity } from './liquidityCache';
import type { VCPScanResult } from './vcpScannerService';

interface TestHelpers {
  vcpMonitor: typeof vcpBreakoutMonitor;
  engine: typeof multiVariantEngine;
  positionStore: typeof positionStore;
  tradeJournal: typeof tradeJournal;
  config: typeof autoTradeConfig;
  variants: typeof STRATEGY_VARIANTS;
  setVariantEnabled: typeof setVariantEnabled;
  analyzer: { setMode: typeof setAnalyzerMode; getStatus: typeof getAnalyzerStatus };
  /** Inject synthetic VCP scan results, firing all subscribers as if a real scan completed */
  injectVCPResults: (results: Partial<VCPScanResult>[]) => void;
  /** Build a complete VCPScanResult skeleton from minimal overrides */
  makeScanResult: (overrides: Partial<VCPScanResult>) => VCPScanResult;
  /** Seed a liquidity-cache value so getLiquidity returns it deterministically */
  seedLiquidity: (symbol: string, exchange: string, turnover: number) => void;
}

const makeScanResult = (overrides: Partial<VCPScanResult>): VCPScanResult => ({
  symbol: 'TEST',
  exchange: 'NSE',
  status: 'no_zone',
  direction: null,
  zoneHigh: null,
  zoneLow: null,
  c1Time: null,
  c1High: null,
  c1Low: null,
  c2Time: null,
  c2High: null,
  c2Low: null,
  signalTime: null,
  signalText: null,
  entryPrice: null,
  atr: null,
  ema20: null,
  lastCandleTime: null,
  scannedAt: Date.now(),
  error: null,
  ...overrides,
});

const injectVCPResults = (overrides: Partial<VCPScanResult>[]): void => {
  const full = overrides.map((o) => makeScanResult(o));
  // Reach into the singleton — these private fields are deliberately accessed
  // here for test-injection purposes only.
  const m = vcpBreakoutMonitor as unknown as {
    _results: VCPScanResult[];
    _resultsListeners: Set<(results: VCPScanResult[]) => void>;
  };
  m._results = full;
  for (const listener of m._resultsListeners) {
    try { listener(full); } catch { /* ignore */ }
  }
};

if (import.meta.env.DEV && typeof window !== 'undefined') {
  const helpers: TestHelpers = {
    vcpMonitor: vcpBreakoutMonitor,
    engine: multiVariantEngine,
    positionStore,
    tradeJournal,
    config: autoTradeConfig,
    variants: STRATEGY_VARIANTS,
    setVariantEnabled,
    analyzer: { setMode: setAnalyzerMode, getStatus: getAnalyzerStatus },
    injectVCPResults,
    makeScanResult,
    seedLiquidity: __testSeedLiquidity,
  };
  (window as unknown as { __autoTrade: TestHelpers }).__autoTrade = helpers;
}

export {};

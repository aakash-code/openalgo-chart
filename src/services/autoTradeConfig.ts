/**
 * Auto-Trade Configuration Store
 *
 * Persists the user's auto-trade preferences to localStorage so they survive
 * reloads. Two presets are baked in (TESTING and LIVE) matching the spec
 * confirmed in our design conversation:
 *
 *   TESTING (analyzer mode, 8 variants in parallel)
 *     - 0.5% risk, 12.5% notional cap, 25 trades/day cap
 *     - Quality filters all ON, capacity = reject-when-full, silent notifications
 *
 *   LIVE (single promoted variant on real broker capital)
 *     - 0.75% risk (start), 40% notional cap, 25 trades/day cap
 *     - Quality filters all ON, capacity = reject-when-full, fill-only notifications
 *
 * The user can override individual fields. The shape is versioned so future
 * migrations can transparently upgrade old saved configs.
 */

import logger from '../utils/logger';

const STORAGE_KEY = 'oa_autotrade_config';
const CONFIG_VERSION = 1;

// ==================== TYPES ====================

export type AutoTradeMode = 'off' | 'testing' | 'live';

export type CapacityBehavior = 'reject' | 'displace';

export type NotificationLevel = 'silent' | 'fill_only' | 'all';

export interface QualityFilters {
  /** Reject signal if 20-day avg turnover < this many crores */
  minLiquidityCr: number;
  /** Reject signals before this time (HH:MM IST) */
  earliestEntry: string;
  /** Reject signals after this time (HH:MM IST) */
  latestEntry: string;
  /** Reject if pre-market gap > this percent */
  maxGapPct: number;
  /** Reject if bid-ask spread > this percent of price */
  maxSpreadPct: number;
  /** Skip signals counter to broader market trend (NIFTY vs VWAP) */
  requireMarketAlignment: boolean;
  /** Block re-entry on a symbol that already lost today */
  blockRevengeTrade: boolean;
}

export interface AutoTradeConfig {
  /** Schema version — bumped when shape changes */
  version: number;
  /** Master switch */
  mode: AutoTradeMode;
  /** Capital basis (read from broker's getFunds() at runtime, but this is the override) */
  capitalOverride: number | null;
  /** Risk per trade as percentage of capital */
  riskPct: number;
  /** Notional value cap per trade as percentage of capital */
  notionalCapPct: number;
  /** Intraday MIS leverage (default 5x) */
  leverage: number;
  /** Max simultaneous open positions per variant */
  maxConcurrent: number;
  /** Max trades fired per day per variant */
  maxTradesPerDay: number;
  /** Max total margin used as percentage of capital */
  maxTotalMarginPct: number;
  /** Daily loss cutoff as percentage (positive number) — trading halts at -X% */
  dailyLossCutoffPct: number;
  /** Auto square-off time in HH:MM IST */
  squareOffTime: string;
  /** Behavior when at max concurrent positions and a new signal arrives */
  capacityBehavior: CapacityBehavior;
  /** Notification verbosity */
  notificationLevel: NotificationLevel;
  /** Quality filters applied before any signal becomes a trade */
  qualityFilters: QualityFilters;
}

// ==================== PRESETS ====================

const DEFAULT_QUALITY_FILTERS: QualityFilters = {
  minLiquidityCr: 50,
  earliestEntry: '09:30',
  latestEntry: '14:45',
  maxGapPct: 3,
  maxSpreadPct: 0.2,
  requireMarketAlignment: true,
  blockRevengeTrade: true,
};

export const TESTING_PRESET: AutoTradeConfig = {
  version: CONFIG_VERSION,
  mode: 'testing',
  capitalOverride: null,
  riskPct: 0.5,
  notionalCapPct: 12.5,
  leverage: 5,
  maxConcurrent: 5,
  maxTradesPerDay: 25,
  maxTotalMarginPct: 50,
  dailyLossCutoffPct: 2,
  squareOffTime: '15:15',
  capacityBehavior: 'reject',
  notificationLevel: 'silent',
  qualityFilters: { ...DEFAULT_QUALITY_FILTERS },
};

export const LIVE_PRESET: AutoTradeConfig = {
  version: CONFIG_VERSION,
  mode: 'live',
  capitalOverride: null,
  riskPct: 0.75,
  notionalCapPct: 40,
  leverage: 5,
  maxConcurrent: 5,
  maxTradesPerDay: 25,
  maxTotalMarginPct: 50,
  dailyLossCutoffPct: 2,
  squareOffTime: '15:15',
  capacityBehavior: 'reject',
  notificationLevel: 'fill_only',
  qualityFilters: { ...DEFAULT_QUALITY_FILTERS },
};

/** Default state on first run — system is OFF until the user opts in */
export const DEFAULT_CONFIG: AutoTradeConfig = {
  ...TESTING_PRESET,
  mode: 'off',
};

// ==================== PERSISTENCE ====================

/**
 * Load the stored config, falling back to DEFAULT_CONFIG. Migrates older
 * versions transparently.
 */
export const loadAutoTradeConfig = (): AutoTradeConfig => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };

    const parsed = JSON.parse(raw) as Partial<AutoTradeConfig>;
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_CONFIG };

    // Future-proof: when version diverges, apply migrations here.
    // For now we just merge over defaults so missing fields backfill.
    const merged: AutoTradeConfig = {
      ...DEFAULT_CONFIG,
      ...parsed,
      qualityFilters: {
        ...DEFAULT_QUALITY_FILTERS,
        ...(parsed.qualityFilters ?? {}),
      },
      version: CONFIG_VERSION,
    };

    return merged;
  } catch (err) {
    logger.warn('[autoTradeConfig] Failed to load — using defaults:', err);
    return { ...DEFAULT_CONFIG };
  }
};

/**
 * Save a config. Returns true on success.
 */
export const saveAutoTradeConfig = (config: AutoTradeConfig): boolean => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    return true;
  } catch (err) {
    logger.error('[autoTradeConfig] Failed to save:', err);
    return false;
  }
};

/**
 * Reset to defaults (system OFF). Returns the new config.
 */
export const resetAutoTradeConfig = (): AutoTradeConfig => {
  saveAutoTradeConfig(DEFAULT_CONFIG);
  return { ...DEFAULT_CONFIG };
};

/**
 * Apply a preset over the current saved config and persist.
 */
export const applyPreset = (preset: 'testing' | 'live'): AutoTradeConfig => {
  const next = preset === 'testing' ? { ...TESTING_PRESET } : { ...LIVE_PRESET };
  saveAutoTradeConfig(next);
  return next;
};

export default {
  loadAutoTradeConfig,
  saveAutoTradeConfig,
  resetAutoTradeConfig,
  applyPreset,
  TESTING_PRESET,
  LIVE_PRESET,
  DEFAULT_CONFIG,
};

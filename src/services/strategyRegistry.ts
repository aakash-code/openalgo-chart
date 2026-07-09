/**
 * Strategy Variant Registry
 *
 * Declarative spec of the 8 VCP strategy variants we run in parallel during
 * analyzer-mode testing. Each variant is identified by a stable string ID
 * (used as the OpenAlgo `strategy` tag, so the broker logs every order
 * tagged with which variant produced it).
 *
 * A variant is just two policies:
 *   - slStrategy:    how to compute the initial stop-loss from a VCP signal
 *   - trailStrategy: how to evolve the stop-loss as the trade plays out
 *
 * The actual implementations live in trailEvaluator.ts. This file is just
 * the catalogue.
 */

export type SLStrategy = 'zone' | 'hybrid' | 'atr' | 'c2';
export type TrailStrategy = 'none' | 'be_ema' | 'step' | 'chandelier' | 'be_atr';

export interface StrategyVariant {
  /** Stable ID — used as OpenAlgo `strategy` field so journal can group by it */
  id: string;
  /** Short human label (1-2 words), shown in leaderboard */
  label: string;
  /** Long description for tooltips */
  description: string;
  /** SL placement policy */
  slStrategy: SLStrategy;
  /** SL trailing policy */
  trailStrategy: TrailStrategy;
  /** Whether to fire orders for this variant. Editable by user. */
  enabled: boolean;
  /**
   * Optional per-variant overrides. When undefined, falls back to the global
   * autoTradeConfig values. Useful when one variant should size differently
   * (e.g., aggressive variants at smaller risk).
   */
  riskPctOverride?: number;
  notionalCapPctOverride?: number;
}

// ==================== THE 8 VARIANTS ====================

export const STRATEGY_VARIANTS: StrategyVariant[] = [
  {
    id: 'vcp-A-zone-static',
    label: 'A: Zone / Static',
    description: 'SL at zone boundary, no trailing — pure structure baseline',
    slStrategy: 'zone',
    trailStrategy: 'none',
    enabled: true,
  },
  {
    id: 'vcp-B-zone-ema',
    label: 'B: Zone / EMA trail',
    description: 'SL at zone boundary, BE@1R then trail to EMA(20) on each 3m close',
    slStrategy: 'zone',
    trailStrategy: 'be_ema',
    enabled: true,
  },
  {
    id: 'vcp-C-hybrid-static',
    label: 'C: Hybrid / Static',
    description: 'SL at min(zone, entry-1.5×ATR) — volatility floor, no trailing',
    slStrategy: 'hybrid',
    trailStrategy: 'none',
    enabled: true,
  },
  {
    id: 'vcp-D-hybrid-ema',
    label: 'D: Hybrid / EMA trail ★',
    description: 'My recommended combo — hybrid SL + BE@1R + EMA(20) trail',
    slStrategy: 'hybrid',
    trailStrategy: 'be_ema',
    enabled: true,
  },
  {
    id: 'vcp-E-hybrid-step',
    label: 'E: Hybrid / Step trail',
    description: 'Hybrid SL with discrete 1R/2R/3R step trail — coarse, broker-friendly',
    slStrategy: 'hybrid',
    trailStrategy: 'step',
    enabled: true,
  },
  {
    id: 'vcp-F-c2-ema',
    label: 'F: C2 / EMA trail',
    description: 'Tight SL just past C2 candle wick — bigger size, more whipsaws',
    slStrategy: 'c2',
    trailStrategy: 'be_ema',
    enabled: true,
  },
  {
    id: 'vcp-G-atr-chandelier',
    label: 'G: ATR / Chandelier',
    description: 'Pure volatility — entry-1.5×ATR SL, chandelier (3×ATR) trail',
    slStrategy: 'atr',
    trailStrategy: 'chandelier',
    enabled: true,
  },
  {
    id: 'vcp-H-hybrid-atrtrail',
    label: 'H: Hybrid / ATR trail',
    description: 'Hybrid SL with BE@1R then 2×ATR trail — middle ground',
    slStrategy: 'hybrid',
    trailStrategy: 'be_atr',
    enabled: true,
  },
];

// ==================== LOOKUPS ====================

const VARIANT_BY_ID = new Map<string, StrategyVariant>(
  STRATEGY_VARIANTS.map((v) => [v.id, v])
);

export const getVariantById = (id: string): StrategyVariant | undefined =>
  VARIANT_BY_ID.get(id);

export const getEnabledVariants = (): StrategyVariant[] =>
  STRATEGY_VARIANTS.filter((v) => v.enabled);

export const getAllVariantIds = (): string[] =>
  STRATEGY_VARIANTS.map((v) => v.id);

// ==================== USER PERSISTENCE ====================

const ENABLED_STORAGE_KEY = 'oa_strategy_enabled';

interface EnabledState {
  [variantId: string]: boolean;
}

/**
 * Load per-variant enabled flags from localStorage and apply them to the
 * registry in-place. Defaults to all-enabled if no preference is stored.
 */
export const loadEnabledFlags = (): void => {
  try {
    const raw = localStorage.getItem(ENABLED_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as EnabledState;
    if (!parsed || typeof parsed !== 'object') return;
    for (const variant of STRATEGY_VARIANTS) {
      if (typeof parsed[variant.id] === 'boolean') {
        variant.enabled = parsed[variant.id];
      }
    }
  } catch {
    // ignore — keep defaults
  }
};

export const saveEnabledFlags = (): void => {
  const state: EnabledState = {};
  for (const v of STRATEGY_VARIANTS) state[v.id] = v.enabled;
  try {
    localStorage.setItem(ENABLED_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
};

export const setVariantEnabled = (id: string, enabled: boolean): void => {
  const variant = VARIANT_BY_ID.get(id);
  if (!variant) return;
  variant.enabled = enabled;
  saveEnabledFlags();
};

// Hydrate on module load
if (typeof window !== 'undefined') {
  loadEnabledFlags();
}

export default {
  STRATEGY_VARIANTS,
  getVariantById,
  getEnabledVariants,
  getAllVariantIds,
  setVariantEnabled,
  loadEnabledFlags,
  saveEnabledFlags,
};

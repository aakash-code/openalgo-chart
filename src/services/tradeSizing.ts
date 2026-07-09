/**
 * Trade Sizing Engine
 *
 * Pure functions that turn (capital, risk%, entry, stop-loss, leverage, caps)
 * into the order quantity that respects:
 *
 *   1. Risk per trade   = capital × riskPct
 *   2. Notional cap     = capital × notionalCapPct  (caps single-stock concentration)
 *   3. Leverage         = MIS gives 5× by default — affects margin only
 *   4. Lot size         = round-down to nearest lot (F&O)
 *   5. Per-day & per-portfolio limits applied externally by the engine
 *
 * Reference (Phase 1 spec — confirmed):
 *   Testing  → 0.5% risk, 12.5% notional cap, 5x MIS leverage, 5 max concurrent
 *   Live     → 0.75% risk,  40%  notional cap, 5x MIS leverage, 5 max concurrent
 */

// ==================== TYPES ====================

export type CapBoundBy = 'risk' | 'notional' | 'lot_size' | 'rejected';

export interface TradeSizingInput {
  /** Total trading capital in INR */
  capital: number;
  /** Risk per trade as a percentage (e.g., 0.5 means 0.5%) */
  riskPct: number;
  /** Notional cap per trade as a percentage of capital (e.g., 12.5) */
  notionalCapPct: number;
  /** Intraday MIS leverage from broker (e.g., 5 means 5× — affects margin only) */
  leverage: number;
  /** Planned entry price */
  entryPrice: number;
  /** Planned stop-loss price */
  stopLoss: number;
  /** Lot size (1 for equity, e.g., 50 for NIFTY F&O); qty rounds down to nearest lot */
  lotSize?: number;
  /** Side — 'long' or 'short'. Determines which side of the SL is below/above entry. */
  side: 'long' | 'short';
}

export interface TradeSizingResult {
  /** Final order quantity (in shares / units, after lot rounding) */
  qty: number;
  /** Per-share SL distance |entry − stopLoss| */
  slDistance: number;
  /** Risk amount used for sizing (capital × riskPct%) */
  riskAmount: number;
  /** Per-share risk × qty — the actual ₹ at stake if SL hits */
  actualRisk: number;
  /** qty × entry — gross position value */
  notionalValue: number;
  /** Notional / leverage — cash tied up by the broker */
  marginRequired: number;
  /** Which constraint capped the quantity */
  capBoundBy: CapBoundBy;
  /** Hard rejections — set when qty < 1 lot or invalid inputs */
  errors: string[];
}

// ==================== HELPERS ====================

const isFiniteNumber = (n: unknown): n is number =>
  typeof n === 'number' && Number.isFinite(n);

/**
 * Floor `n` to nearest multiple of `lot`. lot=1 → no rounding effect.
 */
const floorToLot = (n: number, lot: number): number => {
  if (lot <= 1) return Math.floor(n);
  return Math.floor(n / lot) * lot;
};

// ==================== CORE ====================

/**
 * Compute the order quantity for a single trade given all inputs and caps.
 *
 * The result always includes both `qty` (possibly 0) and a `capBoundBy`
 * explaining which constraint won. If `qty` ends at 0, `errors` will tell
 * you why.
 */
export const calculateTradeSize = (input: TradeSizingInput): TradeSizingResult => {
  const {
    capital,
    riskPct,
    notionalCapPct,
    leverage,
    entryPrice,
    stopLoss,
    lotSize = 1,
    side,
  } = input;

  const errors: string[] = [];
  const empty: TradeSizingResult = {
    qty: 0,
    slDistance: 0,
    riskAmount: 0,
    actualRisk: 0,
    notionalValue: 0,
    marginRequired: 0,
    capBoundBy: 'rejected',
    errors,
  };

  // ---- input validation ----
  if (!isFiniteNumber(capital) || capital <= 0) {
    errors.push('capital must be > 0');
    return empty;
  }
  if (!isFiniteNumber(riskPct) || riskPct <= 0 || riskPct > 100) {
    errors.push('riskPct must be in (0, 100]');
    return empty;
  }
  if (!isFiniteNumber(notionalCapPct) || notionalCapPct <= 0) {
    errors.push('notionalCapPct must be > 0');
    return empty;
  }
  if (!isFiniteNumber(leverage) || leverage <= 0) {
    errors.push('leverage must be > 0');
    return empty;
  }
  if (!isFiniteNumber(entryPrice) || entryPrice <= 0) {
    errors.push('entryPrice must be > 0');
    return empty;
  }
  if (!isFiniteNumber(stopLoss) || stopLoss <= 0) {
    errors.push('stopLoss must be > 0');
    return empty;
  }
  if (side === 'long' && stopLoss >= entryPrice) {
    errors.push('long stopLoss must be below entryPrice');
    return empty;
  }
  if (side === 'short' && stopLoss <= entryPrice) {
    errors.push('short stopLoss must be above entryPrice');
    return empty;
  }
  if (!isFiniteNumber(lotSize) || lotSize < 1) {
    errors.push('lotSize must be ≥ 1');
    return empty;
  }

  // ---- core math ----
  const slDistance = Math.abs(entryPrice - stopLoss);
  const riskAmount = capital * (riskPct / 100);
  const notionalCap = capital * (notionalCapPct / 100);

  const qtyByRisk = riskAmount / slDistance;
  const qtyByNotional = notionalCap / entryPrice;

  // Pick the smaller — both constraints must be satisfied
  const rawQty = Math.min(qtyByRisk, qtyByNotional);
  const qty = floorToLot(rawQty, lotSize);

  let capBoundBy: CapBoundBy;
  if (qty < lotSize) {
    capBoundBy = 'rejected';
    errors.push(
      `qty<lotSize after caps (raw=${rawQty.toFixed(2)}, lot=${lotSize}) — increase capital or widen notional cap`
    );
  } else if (qtyByRisk <= qtyByNotional) {
    capBoundBy = 'risk';
  } else {
    capBoundBy = 'notional';
  }

  // If lot rounding actually moved us off the binding-cap value, surface it
  if (qty >= lotSize && lotSize > 1 && rawQty - qty >= lotSize * 0.5) {
    capBoundBy = 'lot_size';
  }

  const notionalValue = qty * entryPrice;
  const marginRequired = notionalValue / leverage;
  const actualRisk = qty * slDistance;

  return {
    qty,
    slDistance,
    riskAmount,
    actualRisk,
    notionalValue,
    marginRequired,
    capBoundBy,
    errors,
  };
};

// ==================== PORTFOLIO-LEVEL CHECKS ====================

export interface PortfolioCheckInput {
  /** Already-deployed margin across all open positions */
  currentMarginUsed: number;
  /** Margin this new trade would consume */
  newMargin: number;
  /** Total capital (denominator) */
  capital: number;
  /** Max total margin as % of capital (e.g., 50 = 50%) */
  maxTotalMarginPct: number;
  /** Currently-open position count */
  currentOpenPositions: number;
  /** Max concurrent position count */
  maxConcurrent: number;
  /** Trades already filed today */
  tradesToday: number;
  /** Max trades per day */
  maxTradesPerDay: number;
  /** Realized P&L today (negative if loss); used for daily-loss cutoff */
  realizedPnLToday: number;
  /** Daily-loss cutoff as % of capital (positive number; e.g., 2 = stop at -2%) */
  dailyLossCutoffPct: number;
}

export interface PortfolioCheckResult {
  allowed: boolean;
  /** Empty when allowed=true; populated with the failing reasons otherwise */
  reasons: string[];
}

/**
 * Check whether a new trade may be placed given current portfolio state.
 * Independent of any single trade's qty — call after `calculateTradeSize`
 * with the resulting `marginRequired`.
 */
export const checkPortfolioGuards = (
  input: PortfolioCheckInput
): PortfolioCheckResult => {
  const {
    currentMarginUsed,
    newMargin,
    capital,
    maxTotalMarginPct,
    currentOpenPositions,
    maxConcurrent,
    tradesToday,
    maxTradesPerDay,
    realizedPnLToday,
    dailyLossCutoffPct,
  } = input;

  const reasons: string[] = [];

  if (currentOpenPositions >= maxConcurrent) {
    reasons.push(`max concurrent positions reached (${currentOpenPositions}/${maxConcurrent})`);
  }

  if (tradesToday >= maxTradesPerDay) {
    reasons.push(`daily trade cap reached (${tradesToday}/${maxTradesPerDay})`);
  }

  const lossThreshold = -capital * (dailyLossCutoffPct / 100);
  if (realizedPnLToday <= lossThreshold) {
    reasons.push(
      `daily loss cutoff hit (${realizedPnLToday.toFixed(0)} ≤ ${lossThreshold.toFixed(0)})`
    );
  }

  const marginCap = capital * (maxTotalMarginPct / 100);
  if (currentMarginUsed + newMargin > marginCap) {
    reasons.push(
      `would exceed total margin cap (${(currentMarginUsed + newMargin).toFixed(0)} > ${marginCap.toFixed(0)})`
    );
  }

  return { allowed: reasons.length === 0, reasons };
};

export default { calculateTradeSize, checkPortfolioGuards };

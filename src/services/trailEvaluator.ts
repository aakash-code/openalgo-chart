/**
 * Stop-Loss & Trail Evaluators
 *
 * Pure functions implementing the SL placement and trailing rules used by
 * the strategy variants registered in strategyRegistry.ts.
 *
 * SL strategies (computeInitialStopLoss):
 *   zone    — at zone boundary
 *   hybrid  — min(zone, entry−1.5×ATR) for long; max(zone, entry+1.5×ATR) for short
 *   atr     — entry ± 1.5×ATR (no zone reference)
 *   c2      — 1 tick past C2 candle wick
 *
 * Trail strategies (evaluateTrail):
 *   none        — never moves
 *   be_ema      — at +1R move SL to entry; thereafter trail to EMA(20) on bar close
 *   step        — at +1R → entry; +2R → +1R; +3R → +2R (discrete steps)
 *   chandelier  — SL = highWatermark − 3×ATR (longs); + for shorts
 *   be_atr      — at +1R move to entry; thereafter trail to high − 2×ATR
 *
 * All functions return a candidate SL price. The engine then enforces:
 *   - never moves SL against the trade (longs: SL only goes up; shorts: down)
 *   - never moves SL past current price (would instantly stop out)
 */

import type { SLStrategy, TrailStrategy } from './strategyRegistry';
import type { OpenPosition } from './positionStore';

// ==================== TYPES ====================

export interface SignalContext {
  direction: 'long' | 'short';
  entryPrice: number;
  zoneHigh: number;
  zoneLow: number;
  atr: number | null;
  c2High: number | null;
  c2Low: number | null;
}

export interface MarketState {
  /** Last traded price */
  ltp: number;
  /** ATR(14) on the trailing timeframe — null if not yet computed */
  atr: number | null;
  /** EMA(20) on the trailing timeframe — null if not yet computed */
  ema20: number | null;
}

const ATR_FALLBACK_FRACTION = 0.005; // 0.5% of price when ATR unavailable
const HYBRID_ATR_MULTIPLIER = 1.5;
const ATR_SL_MULTIPLIER = 1.5;
const CHANDELIER_ATR_MULTIPLIER = 3;
const BE_ATR_TRAIL_MULTIPLIER = 2;
const TICK_BUFFER = 0.05; // ₹0.05 buffer past structural levels

const safeAtr = (atr: number | null, price: number): number => {
  if (atr && Number.isFinite(atr) && atr > 0) return atr;
  return price * ATR_FALLBACK_FRACTION;
};

// ==================== INITIAL SL ====================

/**
 * Compute the initial stop-loss for a new entry given the chosen strategy.
 * Returns null if required inputs are missing (e.g., c2 strategy without C2 data).
 */
export const computeInitialStopLoss = (
  strategy: SLStrategy,
  ctx: SignalContext
): number | null => {
  const { direction, entryPrice, zoneHigh, zoneLow, atr, c2High, c2Low } = ctx;
  const atrValue = safeAtr(atr, entryPrice);

  switch (strategy) {
    case 'zone': {
      return direction === 'long'
        ? zoneLow - TICK_BUFFER
        : zoneHigh + TICK_BUFFER;
    }

    case 'hybrid': {
      const zoneSL = direction === 'long' ? zoneLow - TICK_BUFFER : zoneHigh + TICK_BUFFER;
      const atrFloor = direction === 'long'
        ? entryPrice - HYBRID_ATR_MULTIPLIER * atrValue
        : entryPrice + HYBRID_ATR_MULTIPLIER * atrValue;
      // Take the FARTHER of the two — never tighter than the ATR floor
      return direction === 'long' ? Math.min(zoneSL, atrFloor) : Math.max(zoneSL, atrFloor);
    }

    case 'atr': {
      return direction === 'long'
        ? entryPrice - ATR_SL_MULTIPLIER * atrValue
        : entryPrice + ATR_SL_MULTIPLIER * atrValue;
    }

    case 'c2': {
      // Tight SL just past C2 wick — requires C2 data
      if (direction === 'long') {
        if (c2Low === null) return null;
        return c2Low - TICK_BUFFER;
      } else {
        if (c2High === null) return null;
        return c2High + TICK_BUFFER;
      }
    }

    default:
      return null;
  }
};

// ==================== TRAIL EVALUATION ====================

/**
 * Compute a candidate new SL based on the trail rule and current market state.
 * Returns the existing SL unchanged when the rule isn't ready to move it
 * (e.g., trade hasn't reached +1R yet for a BE-based rule).
 */
export const evaluateTrail = (
  strategy: TrailStrategy,
  position: OpenPosition,
  market: MarketState
): number => {
  switch (strategy) {
    case 'none':
      return position.stopLoss;
    case 'be_ema':
      return _trailBreakEvenThenEMA(position, market);
    case 'step':
      return _trailStep(position, market);
    case 'chandelier':
      return _trailChandelier(position, market);
    case 'be_atr':
      return _trailBreakEvenThenATR(position, market);
    default:
      return position.stopLoss;
  }
};

// ==================== TRAIL IMPLEMENTATIONS ====================

const oneRDistance = (pos: OpenPosition): number =>
  Math.abs(pos.entryPrice - pos.initialStopLoss);

/** R-multiple of the current price relative to entry */
const currentR = (pos: OpenPosition, ltp: number): number => {
  const r = oneRDistance(pos);
  if (r <= 0) return 0;
  const sign = pos.direction === 'long' ? 1 : -1;
  return (sign * (ltp - pos.entryPrice)) / r;
};

/** Move SL to break-even when trade is at +1R or beyond */
const _breakEvenSL = (pos: OpenPosition, ltp: number): number | null => {
  if (currentR(pos, ltp) >= 1) return pos.entryPrice;
  return null;
};

/**
 * BE@1R, then on each bar close trail SL to EMA(20).
 * NOTE: this is called on every bar-close evaluation; the engine passes the
 * latest EMA(20) value via market.ema20.
 */
const _trailBreakEvenThenEMA = (pos: OpenPosition, market: MarketState): number => {
  const be = _breakEvenSL(pos, market.ltp);
  let candidate = be ?? pos.stopLoss;

  if (market.ema20 !== null && currentR(pos, market.ltp) >= 1) {
    // Use EMA only when in profit and EMA is a valid stop side
    if (pos.direction === 'long' && market.ema20 < market.ltp) {
      candidate = Math.max(candidate, market.ema20 - TICK_BUFFER);
    } else if (pos.direction === 'short' && market.ema20 > market.ltp) {
      candidate = Math.min(candidate, market.ema20 + TICK_BUFFER);
    }
  }

  return _enforceMonotonic(pos, candidate, market.ltp);
};

/**
 * Step trail: at +1R → entry, +2R → +1R, +3R → +2R, ...
 */
const _trailStep = (pos: OpenPosition, market: MarketState): number => {
  const r = currentR(pos, market.ltp);
  const oneR = oneRDistance(pos);
  if (r < 1 || oneR <= 0) return pos.stopLoss;

  const steps = Math.floor(r); // 1 → entry, 2 → +1R, 3 → +2R, ...
  const offset = (steps - 1) * oneR;
  const candidate = pos.direction === 'long'
    ? pos.entryPrice + offset
    : pos.entryPrice - offset;

  return _enforceMonotonic(pos, candidate, market.ltp);
};

/**
 * Chandelier exit: SL = highWatermark − 3×ATR for longs.
 */
const _trailChandelier = (pos: OpenPosition, market: MarketState): number => {
  const atrValue = safeAtr(market.atr ?? pos.atrAtEntry, pos.entryPrice);
  const candidate = pos.direction === 'long'
    ? pos.highWatermark - CHANDELIER_ATR_MULTIPLIER * atrValue
    : pos.lowWatermark + CHANDELIER_ATR_MULTIPLIER * atrValue;
  return _enforceMonotonic(pos, candidate, market.ltp);
};

/**
 * BE@1R, then trail by 2×ATR from the watermark.
 */
const _trailBreakEvenThenATR = (pos: OpenPosition, market: MarketState): number => {
  const be = _breakEvenSL(pos, market.ltp);
  let candidate = be ?? pos.stopLoss;

  if (currentR(pos, market.ltp) >= 1) {
    const atrValue = safeAtr(market.atr ?? pos.atrAtEntry, pos.entryPrice);
    const atrCandidate = pos.direction === 'long'
      ? pos.highWatermark - BE_ATR_TRAIL_MULTIPLIER * atrValue
      : pos.lowWatermark + BE_ATR_TRAIL_MULTIPLIER * atrValue;
    candidate = pos.direction === 'long'
      ? Math.max(candidate, atrCandidate)
      : Math.min(candidate, atrCandidate);
  }

  return _enforceMonotonic(pos, candidate, market.ltp);
};

// ==================== GUARDS ====================

/**
 * Enforce that SL only moves in the favorable direction (longs: only up;
 * shorts: only down) and never crosses current LTP (which would instantly
 * stop the position out as soon as we apply it).
 */
const _enforceMonotonic = (
  pos: OpenPosition,
  candidate: number,
  ltp: number
): number => {
  if (!Number.isFinite(candidate)) return pos.stopLoss;

  if (pos.direction === 'long') {
    // Don't move SL down
    let next = Math.max(pos.stopLoss, candidate);
    // Don't put SL above LTP (would instantly trigger)
    if (next >= ltp) next = pos.stopLoss;
    return next;
  } else {
    // Short: don't move SL up
    let next = Math.min(pos.stopLoss, candidate);
    if (next <= ltp) next = pos.stopLoss;
    return next;
  }
};

// ==================== SOFT-EXIT CHECKS ====================

export type SoftExitReason = 'sl_hit' | 'target_hit' | null;

/**
 * Determine whether the latest market price triggers an SL or target.
 * Used by the engine on every tick to decide when to exit a position.
 */
export const checkSoftExit = (
  pos: OpenPosition,
  ltp: number
): SoftExitReason => {
  if (pos.direction === 'long') {
    if (ltp <= pos.stopLoss) return 'sl_hit';
    if (pos.target !== null && ltp >= pos.target) return 'target_hit';
  } else {
    if (ltp >= pos.stopLoss) return 'sl_hit';
    if (pos.target !== null && ltp <= pos.target) return 'target_hit';
  }
  return null;
};

export default {
  computeInitialStopLoss,
  evaluateTrail,
  checkSoftExit,
};

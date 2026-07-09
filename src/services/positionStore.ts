/**
 * Position Store
 *
 * In-memory + localStorage-backed store of all open and recently-closed
 * positions across every strategy variant. The trade engine writes here when
 * orders fill / exit; the leaderboard panel reads from here via subscribe().
 *
 * State is partitioned by trading-day (IST). On a new day, yesterday's open
 * positions are auto-closed at last-known price (in case the app was
 * restarted overnight) and their stats roll into the closed set; today
 * starts clean.
 */

import logger from '../utils/logger';

// ==================== TYPES ====================

export type Direction = 'long' | 'short';
export type PositionStatus = 'open' | 'closed';
export type ExitReason =
  | 'sl_hit'
  | 'target_hit'
  | 'trail_sl_hit'
  | 'eod_squareoff'
  | 'manual_close'
  | 'rejected';

export interface OpenPosition {
  /** Unique id — `${variantId}:${symbol}:${entryTime}` */
  id: string;
  /** Strategy variant that owns this position */
  variantId: string;
  /** Trading symbol */
  symbol: string;
  exchange: string;
  direction: Direction;

  /** Entry */
  entryTime: number;          // unix sec, fill time
  entryPrice: number;
  qty: number;
  /** Broker's order id from /placeorder */
  entryOrderId: string;

  /** Current SL — updates as we trail */
  stopLoss: number;
  /** Initial SL — frozen at entry, used for R-multiple math */
  initialStopLoss: number;
  /** Optional fixed target (price); null means trail-only */
  target: number | null;

  /** Watermarks for trail calculations */
  highWatermark: number;
  lowWatermark: number;

  /** ATR at entry, used by ATR-based trail strategies */
  atrAtEntry: number | null;

  status: PositionStatus;
}

export interface ClosedPosition extends OpenPosition {
  status: 'closed';
  exitTime: number;
  exitPrice: number;
  exitReason: ExitReason;
  /** Realized P&L in INR (already net of qty) */
  realizedPnL: number;
  /** R-multiple = realizedPnL / (initial risk per share × qty) */
  rMultiple: number;
}

export type AnyPosition = OpenPosition | ClosedPosition;

// ==================== STORAGE ====================

const STORAGE_KEY = 'oa_position_store';
const RETAIN_DAYS = 7;

interface StoredState {
  /** YYYY-MM-DD IST of the last day positions were touched */
  lastDay: string;
  open: OpenPosition[];
  closed: ClosedPosition[];
}

const istDayString = (epochSec: number = Date.now() / 1000): string => {
  // IST = UTC+5:30
  const ms = epochSec * 1000 + (5 * 60 + 30) * 60 * 1000;
  return new Date(ms).toISOString().split('T')[0] as string;
};

const loadFromStorage = (): StoredState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { lastDay: istDayString(), open: [], closed: [] };
    const parsed = JSON.parse(raw) as StoredState;
    if (!parsed || !Array.isArray(parsed.open) || !Array.isArray(parsed.closed)) {
      return { lastDay: istDayString(), open: [], closed: [] };
    }
    return parsed;
  } catch {
    return { lastDay: istDayString(), open: [], closed: [] };
  }
};

const saveToStorage = (state: StoredState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    logger.warn('[positionStore] Persist failed:', err);
  }
};

// ==================== STORE ====================

class PositionStore {
  private _state: StoredState;
  private _listeners: Set<() => void> = new Set();

  constructor() {
    this._state = loadFromStorage();
    this._rolloverIfNewDay();
    this._pruneOldClosed();
  }

  // ---- subscriptions ----
  subscribe(listener: () => void): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  private _emit(): void {
    saveToStorage(this._state);
    for (const l of this._listeners) {
      try { l(); } catch (err) { logger.error('[positionStore] listener error:', err); }
    }
  }

  // ---- day rollover ----
  private _rolloverIfNewDay(): void {
    const today = istDayString();
    if (this._state.lastDay === today) return;

    // Yesterday's open positions are stranded — flush them as eod_squareoff at
    // their last-known price (entry price as fallback). Real exits should have
    // happened via the engine's 15:15 squareoff; this is the safety net for
    // crashed sessions.
    if (this._state.open.length > 0) {
      logger.warn(
        `[positionStore] Rolling over ${this._state.open.length} stranded positions from ${this._state.lastDay}`
      );
      for (const pos of this._state.open) {
        const closed: ClosedPosition = {
          ...pos,
          status: 'closed',
          exitTime: Date.now() / 1000,
          exitPrice: pos.entryPrice, // unknown; use entry as conservative
          exitReason: 'eod_squareoff',
          realizedPnL: 0,
          rMultiple: 0,
        };
        this._state.closed.push(closed);
      }
      this._state.open = [];
    }
    this._state.lastDay = today;
  }

  private _pruneOldClosed(): void {
    const cutoff = Date.now() / 1000 - RETAIN_DAYS * 86400;
    this._state.closed = this._state.closed.filter((p) => p.exitTime >= cutoff);
  }

  // ---- mutations ----
  openPosition(pos: OpenPosition): void {
    this._rolloverIfNewDay();
    this._state.open.push(pos);
    this._emit();
  }

  updatePosition(id: string, updates: Partial<OpenPosition>): void {
    const idx = this._state.open.findIndex((p) => p.id === id);
    if (idx < 0) return;
    this._state.open[idx] = { ...this._state.open[idx], ...updates } as OpenPosition;
    this._emit();
  }

  closePosition(
    id: string,
    exit: { exitPrice: number; exitTime: number; exitReason: ExitReason }
  ): ClosedPosition | null {
    const idx = this._state.open.findIndex((p) => p.id === id);
    if (idx < 0) return null;

    const open = this._state.open[idx]!;
    const direction = open.direction;
    const sign = direction === 'long' ? 1 : -1;
    const realizedPnL = sign * (exit.exitPrice - open.entryPrice) * open.qty;

    const initialRiskPerShare = Math.abs(open.entryPrice - open.initialStopLoss);
    const rMultiple = initialRiskPerShare > 0
      ? (sign * (exit.exitPrice - open.entryPrice)) / initialRiskPerShare
      : 0;

    const closed: ClosedPosition = {
      ...open,
      status: 'closed',
      exitTime: exit.exitTime,
      exitPrice: exit.exitPrice,
      exitReason: exit.exitReason,
      realizedPnL,
      rMultiple,
    };

    this._state.open.splice(idx, 1);
    this._state.closed.push(closed);
    this._emit();
    return closed;
  }

  // ---- queries ----
  getOpenPositions(): OpenPosition[] {
    return [...this._state.open];
  }

  getOpenByVariant(variantId: string): OpenPosition[] {
    return this._state.open.filter((p) => p.variantId === variantId);
  }

  getOpenForSymbol(variantId: string, symbol: string, exchange: string): OpenPosition | undefined {
    return this._state.open.find(
      (p) => p.variantId === variantId && p.symbol === symbol && p.exchange === exchange
    );
  }

  getClosedToday(): ClosedPosition[] {
    const today = istDayString();
    return this._state.closed.filter((p) => istDayString(p.exitTime) === today);
  }

  getClosedAll(): ClosedPosition[] {
    return [...this._state.closed];
  }

  getOpenSymbolKeys(): string[] {
    const keys = new Set<string>();
    for (const p of this._state.open) keys.add(`${p.symbol}:${p.exchange}`);
    return Array.from(keys);
  }

  /** Total margin currently in use across all open positions */
  getTotalMarginUsed(leverage: number): number {
    let sum = 0;
    for (const p of this._state.open) {
      sum += (p.qty * p.entryPrice) / leverage;
    }
    return sum;
  }

  /** Number of trades placed today by a variant (open + closed) */
  getTradesTodayForVariant(variantId: string): number {
    const today = istDayString();
    const openCount = this._state.open.filter(
      (p) => p.variantId === variantId && istDayString(p.entryTime) === today
    ).length;
    const closedCount = this._state.closed.filter(
      (p) => p.variantId === variantId && istDayString(p.entryTime) === today
    ).length;
    return openCount + closedCount;
  }

  /** Realized P&L today for a variant */
  getRealizedPnLTodayForVariant(variantId: string): number {
    const today = istDayString();
    return this._state.closed
      .filter((p) => p.variantId === variantId && istDayString(p.exitTime) === today)
      .reduce((sum, p) => sum + p.realizedPnL, 0);
  }

  /** Symbols a variant has already lost on today (used by quality filter) */
  getSymbolsWithLossToday(variantId: string): Set<string> {
    const today = istDayString();
    const set = new Set<string>();
    for (const p of this._state.closed) {
      if (
        p.variantId === variantId &&
        istDayString(p.exitTime) === today &&
        p.realizedPnL < 0
      ) {
        set.add(`${p.symbol}:${p.exchange}`);
      }
    }
    return set;
  }
}

// ==================== SINGLETON ====================

export const positionStore = new PositionStore();
export default positionStore;

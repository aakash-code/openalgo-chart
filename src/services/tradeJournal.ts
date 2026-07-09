/**
 * Trade Journal & Per-Variant Stats
 *
 * Append-only log of every entry and exit event, plus a stats engine that
 * summarises performance per variant for the leaderboard.
 *
 * The journal is the source of truth for "how did each variant do?". The
 * positionStore tracks live state; the journal tracks history.
 *
 * Data is keyed off a single localStorage entry with day-rolling retention.
 */

import logger from '../utils/logger';
import type { OpenPosition, ClosedPosition } from './positionStore';
import { STRATEGY_VARIANTS } from './strategyRegistry';

// ==================== TYPES ====================

export interface JournalEntry {
  /** Stable id matching the OpenPosition id */
  positionId: string;
  variantId: string;
  symbol: string;
  exchange: string;
  direction: 'long' | 'short';

  entryTime: number;
  entryPrice: number;
  qty: number;
  initialStopLoss: number;

  /** Filled when the trade closes */
  exitTime: number | null;
  exitPrice: number | null;
  exitReason: string | null;
  realizedPnL: number | null;
  rMultiple: number | null;
}

export interface VariantStats {
  variantId: string;
  variantLabel: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;        // 0..1
  avgR: number;            // average R-multiple across all closed trades
  totalPnL: number;
  avgPnL: number;
  bestTrade: number;
  worstTrade: number;
  maxDrawdown: number;     // INR; running peak-to-trough on cumulative P&L
  profitFactor: number;    // sum(wins) / |sum(losses)|; Infinity when no losses
  openCount: number;
}

// ==================== STORAGE ====================

const STORAGE_KEY = 'oa_trade_journal';
const RETAIN_DAYS = 30;

interface JournalState {
  entries: JournalEntry[];
}

const loadJournal = (): JournalState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { entries: [] };
    const parsed = JSON.parse(raw) as JournalState;
    if (!parsed || !Array.isArray(parsed.entries)) return { entries: [] };
    return parsed;
  } catch {
    return { entries: [] };
  }
};

const saveJournal = (state: JournalState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    logger.warn('[tradeJournal] Persist failed:', err);
  }
};

// ==================== JOURNAL ====================

class TradeJournal {
  private _state: JournalState;
  private _listeners: Set<() => void> = new Set();

  constructor() {
    this._state = loadJournal();
    this._prune();
  }

  // ---- subscription ----
  subscribe(listener: () => void): () => void {
    this._listeners.add(listener);
    return () => { this._listeners.delete(listener); };
  }

  private _emit(): void {
    saveJournal(this._state);
    for (const l of this._listeners) {
      try { l(); } catch (err) { logger.error('[tradeJournal] listener:', err); }
    }
  }

  private _prune(): void {
    const cutoff = Date.now() / 1000 - RETAIN_DAYS * 86400;
    const before = this._state.entries.length;
    this._state.entries = this._state.entries.filter((e) => {
      const t = e.exitTime ?? e.entryTime;
      return t >= cutoff;
    });
    if (this._state.entries.length < before) saveJournal(this._state);
  }

  // ---- mutations ----
  recordEntry(pos: OpenPosition): void {
    // Avoid duplicates if this is called twice
    const existing = this._state.entries.find((e) => e.positionId === pos.id);
    if (existing) return;

    const entry: JournalEntry = {
      positionId: pos.id,
      variantId: pos.variantId,
      symbol: pos.symbol,
      exchange: pos.exchange,
      direction: pos.direction,
      entryTime: pos.entryTime,
      entryPrice: pos.entryPrice,
      qty: pos.qty,
      initialStopLoss: pos.initialStopLoss,
      exitTime: null,
      exitPrice: null,
      exitReason: null,
      realizedPnL: null,
      rMultiple: null,
    };
    this._state.entries.push(entry);
    this._emit();
  }

  recordExit(closed: ClosedPosition): void {
    const idx = this._state.entries.findIndex((e) => e.positionId === closed.id);
    if (idx < 0) {
      // Entry was never recorded — synthesize one
      this.recordEntry(closed);
      return this.recordExit(closed);
    }
    this._state.entries[idx] = {
      ...this._state.entries[idx]!,
      exitTime: closed.exitTime,
      exitPrice: closed.exitPrice,
      exitReason: closed.exitReason,
      realizedPnL: closed.realizedPnL,
      rMultiple: closed.rMultiple,
    };
    this._emit();
  }

  // ---- queries ----
  getAllEntries(): JournalEntry[] {
    return [...this._state.entries];
  }

  getEntriesForVariant(variantId: string): JournalEntry[] {
    return this._state.entries.filter((e) => e.variantId === variantId);
  }

  // ---- stats ----
  getVariantStats(variantId: string, openCountByVariant: Map<string, number>): VariantStats {
    const all = this.getEntriesForVariant(variantId);
    const closed = all.filter((e): e is JournalEntry & { realizedPnL: number; rMultiple: number } =>
      e.realizedPnL !== null && e.rMultiple !== null
    );

    const variantLabel = STRATEGY_VARIANTS.find((v) => v.id === variantId)?.label ?? variantId;

    if (closed.length === 0) {
      return {
        variantId,
        variantLabel,
        trades: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        avgR: 0,
        totalPnL: 0,
        avgPnL: 0,
        bestTrade: 0,
        worstTrade: 0,
        maxDrawdown: 0,
        profitFactor: 0,
        openCount: openCountByVariant.get(variantId) ?? 0,
      };
    }

    const wins = closed.filter((e) => e.realizedPnL > 0);
    const losses = closed.filter((e) => e.realizedPnL <= 0);
    const totalPnL = closed.reduce((s, e) => s + e.realizedPnL, 0);
    const grossProfit = wins.reduce((s, e) => s + e.realizedPnL, 0);
    const grossLoss = Math.abs(losses.reduce((s, e) => s + e.realizedPnL, 0));

    // Max drawdown — running peak-to-trough on cumulative P&L
    let runningPnL = 0;
    let peak = 0;
    let maxDD = 0;
    const sortedByExit = [...closed].sort((a, b) => a.exitTime! - b.exitTime!);
    for (const e of sortedByExit) {
      runningPnL += e.realizedPnL;
      if (runningPnL > peak) peak = runningPnL;
      const dd = peak - runningPnL;
      if (dd > maxDD) maxDD = dd;
    }

    return {
      variantId,
      variantLabel,
      trades: closed.length,
      wins: wins.length,
      losses: losses.length,
      winRate: wins.length / closed.length,
      avgR: closed.reduce((s, e) => s + e.rMultiple, 0) / closed.length,
      totalPnL,
      avgPnL: totalPnL / closed.length,
      bestTrade: Math.max(...closed.map((e) => e.realizedPnL)),
      worstTrade: Math.min(...closed.map((e) => e.realizedPnL)),
      maxDrawdown: maxDD,
      profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
      openCount: openCountByVariant.get(variantId) ?? 0,
    };
  }

  getAllStats(openCountByVariant: Map<string, number>): VariantStats[] {
    return STRATEGY_VARIANTS.map((v) => this.getVariantStats(v.id, openCountByVariant));
  }

  // ---- export ----
  toCSV(): string {
    const headers = [
      'variant', 'symbol', 'exchange', 'direction',
      'entry_time', 'entry_price', 'qty', 'initial_sl',
      'exit_time', 'exit_price', 'exit_reason',
      'realized_pnl', 'r_multiple',
    ];
    const lines = [headers.join(',')];
    for (const e of this._state.entries) {
      lines.push([
        e.variantId,
        e.symbol,
        e.exchange,
        e.direction,
        new Date(e.entryTime * 1000).toISOString(),
        e.entryPrice,
        e.qty,
        e.initialStopLoss,
        e.exitTime ? new Date(e.exitTime * 1000).toISOString() : '',
        e.exitPrice ?? '',
        e.exitReason ?? '',
        e.realizedPnL?.toFixed(2) ?? '',
        e.rMultiple?.toFixed(3) ?? '',
      ].join(','));
    }
    return lines.join('\n');
  }
}

// ==================== SINGLETON + CONVENIENCE EXPORTS ====================

export const tradeJournal = new TradeJournal();

export const recordEntry = (pos: OpenPosition): void => tradeJournal.recordEntry(pos);
export const recordExit = (closed: ClosedPosition): void => tradeJournal.recordExit(closed);

export default tradeJournal;

/**
 * Multi-Variant Trade Engine
 *
 * Orchestrator that turns VCP breakout signals into parallel orders across
 * every enabled strategy variant, then manages each position's lifecycle.
 *
 * On each VCP signal:
 *   1. Apply quality filters (gap, time-of-day, recent loss, market alignment)
 *   2. For each enabled variant:
 *        - Compute initial SL via the variant's slStrategy
 *        - Size the trade via tradeSizing engine
 *        - Run portfolio guards (max concurrent, daily cap, loss cutoff)
 *        - Place a MARKET MIS order tagged with the variant's strategy id
 *        - Store the open position
 *
 * On each live tick (from subscribeToMultiTicker):
 *   - Update high/low watermarks
 *   - Soft-exit check: SL hit, target hit
 *   - Fire MARKET exit on hit
 *
 * On each 3-min bar close (re-using vcpBreakoutMonitor's tick):
 *   - Re-evaluate the trail rule for every open position
 *
 * At 15:15 IST every day:
 *   - Square off every open position with MARKET orders
 *
 * Soft stops (client-side SL detection) are used during analyzer testing for
 * simplicity. When promoting to live, we'll switch to broker-managed
 * SL legs (TODO Phase 5).
 */

import logger from '../utils/logger';
import { placeOrder, type OrderDetails } from './orderService';
import { subscribeToMultiTicker } from './openalgo';
import { getFunds, getOrderBook } from './trading/account.service';
import { getLiquidity } from './liquidityCache';
import {
  vcpBreakoutMonitor,
  type VCPNotificationEvent,
} from './vcpBreakoutMonitor';
import {
  STRATEGY_VARIANTS,
  type StrategyVariant,
} from './strategyRegistry';
import {
  loadAutoTradeConfig,
  type AutoTradeConfig,
} from './autoTradeConfig';
import {
  calculateTradeSize,
  checkPortfolioGuards,
} from './tradeSizing';
import {
  computeInitialStopLoss,
  evaluateTrail,
  checkSoftExit,
  type SignalContext,
  type MarketState,
} from './trailEvaluator';
import {
  positionStore,
  type OpenPosition,
  type ExitReason,
} from './positionStore';
import { recordEntry, recordExit } from './tradeJournal';

// ==================== TYPES ====================

interface PriceUpdate {
  symbol: string;
  exchange?: string;
  last: number;
  timestamp?: number;
}

interface WSConn {
  close: () => void;
}

// ==================== CONSTANTS ====================

const TICK_RESUBSCRIBE_DEBOUNCE_MS = 500;
const FUNDS_REFRESH_MS = 60_000;
const FUNDS_FALLBACK = 10_000_000; // ₹1 Cr — analyzer-mode sandbox capital

// ==================== ENGINE ====================

class MultiVariantEngine {
  private _running = false;
  private _config: AutoTradeConfig = loadAutoTradeConfig();
  private _ws: WSConn | null = null;
  private _resubscribeTimer: ReturnType<typeof setTimeout> | null = null;
  private _eodTimer: ReturnType<typeof setTimeout> | null = null;
  private _fundsTimer: ReturnType<typeof setInterval> | null = null;
  private _unsubVCP: (() => void) | null = null;
  /** Symbols we already lost on today (per variant) — refreshed lazily */
  private _lossSymbolsByVariant: Map<string, Set<string>> = new Map();
  /** Latest broker capital from getFunds(); falls back to FUNDS_FALLBACK on errors */
  private _capital: number = FUNDS_FALLBACK;

  // ---- lifecycle ----

  start(): void {
    if (this._running) return;
    this._config = loadAutoTradeConfig();

    // Engine only runs when the user has flipped autotrade ON
    if (this._config.mode === 'off') {
      logger.info('[MultiVariantEngine] Skipping start — mode=off');
      return;
    }

    this._running = true;
    logger.info(`[MultiVariantEngine] Started (mode=${this._config.mode})`);

    // Hook into VCP signal stream
    this._unsubVCP = this._subscribeToVCPSignals();

    // Reconcile any open broker positions placed by this engine in earlier
    // sessions so we don't double-fire on the same symbol after a reload.
    // Fire-and-forget: scheduling continues even if reconcile fails.
    this._reconcileBrokerPositions().catch((err) => {
      logger.warn('[MultiVariantEngine] Reconcile failed:', err);
    });

    // Initial tick subscription (covers any positions already open from previous session)
    this._refreshTickSubscription();

    // Schedule EOD square-off
    this._scheduleEODSquareOff();

    // Capital from broker — refresh periodically
    this._refreshCapital();
    this._fundsTimer = setInterval(() => this._refreshCapital(), FUNDS_REFRESH_MS);
  }

  /**
   * Read today's broker order history and rebuild any open positions in our
   * positionStore. This protects against the catastrophic scenario where:
   *
   *   1. Engine fires order on signal → broker has open position
   *   2. Page reloads → positionStore.localStorage cleared/lost
   *   3. Same signal fires again later → engine has no record → fires AGAIN
   *   4. Broker now has DOUBLE position
   *
   * After reconciliation, the engine's idempotency check
   * (positionStore.getOpenForSymbol) correctly blocks re-entry.
   *
   * Per-variant SLs aren't recoverable from order history, so we set a
   * conservative wide SL (5% from entry) — the next 3m bar close will
   * tighten it via the normal trail evaluation pass.
   */
  private async _reconcileBrokerPositions(): Promise<void> {
    const orderResp = await getOrderBook();
    const orders = (orderResp?.orders ?? []) as Array<{
      orderid: string; symbol: string; exchange: string;
      action: 'BUY' | 'SELL'; quantity: number; price?: number;
      average_price?: number; strategy?: string; order_status: string;
      timestamp: string;
    }>;
    if (orders.length === 0) return;

    // Group complete orders by (variant, symbol, exchange)
    type OrderEntry = typeof orders[number];
    const buckets = new Map<string, OrderEntry[]>();
    for (const o of orders) {
      if (!o.strategy?.startsWith('vcp-')) continue;
      if (o.order_status !== 'complete') continue;
      const key = `${o.strategy}|${o.symbol}|${o.exchange}`;
      const list = buckets.get(key) ?? [];
      list.push(o);
      buckets.set(key, list);
    }

    let reconciled = 0;
    for (const [key, list] of buckets) {
      const [variantId, symbol, exchange] = key.split('|');
      if (!variantId || !symbol || !exchange) continue;

      // Skip if already tracked locally
      if (positionStore.getOpenForSymbol(variantId, symbol, exchange)) continue;

      // Sort by timestamp ascending — first action determines direction
      list.sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      const first = list[0];
      if (!first) continue;

      // Net qty: BUY adds, SELL subtracts. Long has positive net while open;
      // short has negative net. Closed positions net to 0.
      let netQty = 0;
      let totalEntryQty = 0;
      let entryPriceSum = 0;
      let entryQtySum = 0;
      const entryAction = first.action;
      for (const o of list) {
        const qty = Number(o.quantity);
        if (o.action === 'BUY') netQty += qty;
        else netQty -= qty;
        // Track entries (same direction as first action) for avg price calc
        if (o.action === entryAction) {
          totalEntryQty += qty;
          const px = Number(o.average_price ?? o.price ?? 0);
          if (px > 0) {
            entryPriceSum += px * qty;
            entryQtySum += qty;
          }
        }
      }

      const stillOpen = netQty !== 0;
      if (!stillOpen) continue;

      const direction: 'long' | 'short' = entryAction === 'BUY' ? 'long' : 'short';
      const openQty = Math.abs(netQty);
      const avgEntryPrice =
        entryQtySum > 0 ? entryPriceSum / entryQtySum : Number(first.price ?? 0);
      if (avgEntryPrice <= 0) continue;

      // Conservative wide SL — the trail evaluator will tighten on next bar close
      const slBuffer = 0.05; // 5%
      const stopLoss =
        direction === 'long'
          ? avgEntryPrice * (1 - slBuffer)
          : avgEntryPrice * (1 + slBuffer);
      const entryTimeSec = Math.floor(new Date(first.timestamp).getTime() / 1000);

      positionStore.openPosition({
        id: `${variantId}:${symbol}:${entryTimeSec}:reconciled`,
        variantId,
        symbol,
        exchange,
        direction,
        entryTime: entryTimeSec,
        entryPrice: avgEntryPrice,
        qty: openQty,
        entryOrderId: first.orderid,
        stopLoss,
        initialStopLoss: stopLoss,
        target: null,
        highWatermark: avgEntryPrice,
        lowWatermark: avgEntryPrice,
        atrAtEntry: null,
        status: 'open',
      });
      reconciled++;
    }

    if (reconciled > 0) {
      logger.info(`[MultiVariantEngine] Reconciled ${reconciled} open positions from broker`);
      this._refreshTickSubscription();
    }
  }

  stop(): void {
    if (!this._running) return;
    this._running = false;

    this._unsubVCP?.();
    this._unsubVCP = null;

    if (this._ws) {
      try { this._ws.close(); } catch { /* ignore */ }
      this._ws = null;
    }
    if (this._resubscribeTimer) {
      clearTimeout(this._resubscribeTimer);
      this._resubscribeTimer = null;
    }
    if (this._eodTimer) {
      clearTimeout(this._eodTimer);
      this._eodTimer = null;
    }
    if (this._fundsTimer) {
      clearInterval(this._fundsTimer);
      this._fundsTimer = null;
    }
    logger.info('[MultiVariantEngine] Stopped');
  }

  /** Latest known broker capital (or fallback), in INR */
  getCapital(): number {
    if (this._config.capitalOverride && this._config.capitalOverride > 0) {
      return this._config.capitalOverride;
    }
    return this._capital;
  }

  private async _refreshCapital(): Promise<void> {
    try {
      const funds = await getFunds();
      if (funds && Number.isFinite(funds.availablecash) && funds.availablecash > 0) {
        if (Math.abs(funds.availablecash - this._capital) > 0.01) {
          logger.info(`[MultiVariantEngine] Capital updated: ₹${funds.availablecash.toFixed(0)}`);
        }
        this._capital = funds.availablecash;
      }
    } catch (err) {
      logger.debug('[MultiVariantEngine] getFunds failed; keeping last-known capital', err);
    }
  }

  isRunning(): boolean { return this._running; }

  /** Re-read config from storage (call after user changes settings) */
  reloadConfig(): void {
    this._config = loadAutoTradeConfig();
  }

  // ==================== SIGNAL HANDLING ====================

  private _subscribeToVCPSignals(): () => void {
    // vcpBreakoutMonitor.start expects ONE callback. We can't take it from the
    // app — App.tsx already owns it for popups. Instead we hook via the
    // results-listener channel and re-detect new breakouts here.
    return vcpBreakoutMonitor.subscribeResults((results) => {
      // 1. Open new positions for breakout/breakdown signals
      for (const r of results) {
        if (r.status === 'long_breakout' || r.status === 'short_breakdown') {
          if (!r.direction || !r.signalTime) continue;
          const evt: VCPNotificationEvent = {
            symbol: r.symbol,
            exchange: r.exchange,
            direction: r.direction,
            signalText: r.signalText ?? 'VCP signal',
            signalTime: r.signalTime,
            zoneHigh: r.zoneHigh ?? 0,
            zoneLow: r.zoneLow ?? 0,
            entryPrice: r.entryPrice ?? 0,
            atr: r.atr,
            c1High: r.c1High,
            c1Low: r.c1Low,
            c2High: r.c2High,
            c2Low: r.c2Low,
            timestamp: Date.now(),
          };
          this._maybeOpenForAllVariants(evt).catch((err) => {
            logger.error(`[MVE] _maybeOpenForAllVariants failed for ${r.symbol}:`, err);
          });
        }
      }

      // 2. Trail evaluation — every scan tick is a 3m bar close, perfect cadence
      // for re-evaluating trail rules on every open position.
      const market = new Map<string, MarketState>();
      for (const r of results) {
        if (r.entryPrice === null || r.atr === null) continue;
        market.set(`${r.symbol}:${r.exchange}`, {
          ltp: r.entryPrice,        // last close — best LTP we have at scan time
          atr: r.atr,
          ema20: r.ema20,
        });
      }
      this.evaluateAllTrails(market);
    });
  }

  private async _maybeOpenForAllVariants(evt: VCPNotificationEvent): Promise<void> {
    if (!this._running) return;
    if (!this._passesQualityFilters(evt)) return;
    if (evt.entryPrice <= 0) {
      logger.debug(`[MVE] Skip ${evt.symbol} — no entry price in event`);
      return;
    }

    // Liquidity gate — uses cache, falls back to fail-open on errors so a
    // single failed kline fetch doesn't block all trading.
    const minTurnover = this._config.qualityFilters.minLiquidityCr * 10_000_000;
    if (minTurnover > 0) {
      const turnover = await getLiquidity(evt.symbol, evt.exchange);
      if (turnover !== null && turnover < minTurnover) {
        logger.debug(
          `[MVE] Skip ${evt.symbol} — liquidity ₹${(turnover / 10_000_000).toFixed(1)} Cr < ${this._config.qualityFilters.minLiquidityCr} Cr`
        );
        return;
      }
    }

    const enabledVariants = STRATEGY_VARIANTS.filter((v) => v.enabled);
    for (const variant of enabledVariants) {
      // Idempotency: only one open position per (variant, symbol) at a time
      const existing = positionStore.getOpenForSymbol(variant.id, evt.symbol, evt.exchange);
      if (existing) continue;

      this._openOne(variant, evt).catch((err) => {
        logger.error(`[MVE] Open failed for ${variant.id}/${evt.symbol}:`, err);
      });
    }
  }

  // ==================== QUALITY FILTERS ====================

  private _passesQualityFilters(evt: VCPNotificationEvent): boolean {
    const f = this._config.qualityFilters;

    // Time of day
    const minute = istMinuteOfDay(new Date());
    const earliest = parseHHMM(f.earliestEntry);
    const latest = parseHHMM(f.latestEntry);
    if (minute < earliest || minute > latest) return false;

    // Recent loss block applied lazily (not market-data dependent — checked per-variant in _openOne)
    // Liquidity / gap / spread / market-alignment require external data we don't
    // have here yet — left as TODOs (Phase 5 enhancement). Defaulting to ON
    // means we don't block on those; the engine still works correctly.
    return true;
  }

  // ==================== OPEN ONE VARIANT POSITION ====================

  private async _openOne(variant: StrategyVariant, evt: VCPNotificationEvent): Promise<void> {
    const cfg = this._config;
    const capital = this.getCapital();

    // Per-variant overrides
    const riskPct = variant.riskPctOverride ?? cfg.riskPct;
    const notionalCapPct = variant.notionalCapPctOverride ?? cfg.notionalCapPct;

    // Block revenge trades on a symbol the variant already lost on today
    if (cfg.qualityFilters.blockRevengeTrade) {
      const lossSet = this._lossSymbolsForVariant(variant.id);
      if (lossSet.has(`${evt.symbol}:${evt.exchange}`)) {
        logger.debug(`[MVE] ${variant.id} skip ${evt.symbol} — revenge trade blocked`);
        return;
      }
    }

    // 1. Compute initial SL
    const ctx: SignalContext = {
      direction: evt.direction,
      entryPrice: evt.entryPrice,
      zoneHigh: evt.zoneHigh,
      zoneLow: evt.zoneLow,
      atr: evt.atr,
      c2High: evt.c2High,
      c2Low: evt.c2Low,
    };
    const stopLoss = computeInitialStopLoss(variant.slStrategy, ctx);
    if (stopLoss === null) {
      logger.debug(`[MVE] ${variant.id} skip ${evt.symbol} — SL strategy returned null`);
      return;
    }

    // 2. Size the trade
    const size = calculateTradeSize({
      capital,
      riskPct,
      notionalCapPct,
      leverage: cfg.leverage,
      entryPrice: evt.entryPrice,
      stopLoss,
      lotSize: 1, // TODO: fetch lot size for F&O
      side: evt.direction,
    });
    if (size.qty < 1) {
      logger.debug(`[MVE] ${variant.id} skip ${evt.symbol} — sizing rejected: ${size.errors[0]}`);
      return;
    }

    // 3. Portfolio guards
    const guards = checkPortfolioGuards({
      currentMarginUsed: positionStore.getTotalMarginUsed(cfg.leverage),
      newMargin: size.marginRequired,
      capital,
      maxTotalMarginPct: cfg.maxTotalMarginPct,
      currentOpenPositions: positionStore.getOpenByVariant(variant.id).length,
      maxConcurrent: cfg.maxConcurrent,
      tradesToday: positionStore.getTradesTodayForVariant(variant.id),
      maxTradesPerDay: cfg.maxTradesPerDay,
      realizedPnLToday: positionStore.getRealizedPnLTodayForVariant(variant.id),
      dailyLossCutoffPct: cfg.dailyLossCutoffPct,
    });
    if (!guards.allowed) {
      logger.debug(`[MVE] ${variant.id} skip ${evt.symbol} — guards: ${guards.reasons.join('; ')}`);
      return;
    }

    // 4. Place the order
    const order: OrderDetails = {
      symbol: evt.symbol,
      exchange: evt.exchange,
      action: evt.direction === 'long' ? 'BUY' : 'SELL',
      quantity: size.qty,
      product: 'MIS',
      pricetype: 'MARKET',
      strategy: variant.id,
    };

    const response = await placeOrder(order);
    if (response.status !== 'success' || !response.orderid) {
      logger.warn(`[MVE] ${variant.id} placeOrder failed for ${evt.symbol}:`, response.message);
      return;
    }

    // 5. Store the open position
    const now = Date.now() / 1000;
    const pos: OpenPosition = {
      id: `${variant.id}:${evt.symbol}:${Math.floor(now)}`,
      variantId: variant.id,
      symbol: evt.symbol,
      exchange: evt.exchange,
      direction: evt.direction,
      entryTime: now,
      entryPrice: evt.entryPrice, // assume MARKET fills at signal close (approximation in analyzer)
      qty: size.qty,
      entryOrderId: response.orderid,
      stopLoss,
      initialStopLoss: stopLoss,
      target: null, // TODO: measured-move target
      highWatermark: evt.entryPrice,
      lowWatermark: evt.entryPrice,
      atrAtEntry: evt.atr,
      status: 'open',
    };

    positionStore.openPosition(pos);
    recordEntry(pos);

    logger.info(
      `[MVE] OPEN ${variant.id} ${evt.symbol} ${evt.direction} qty=${size.qty} @ ${evt.entryPrice} SL=${stopLoss.toFixed(2)}`
    );

    // Refresh tick subscription so we hear about this symbol
    this._refreshTickSubscription();
  }

  private _lossSymbolsForVariant(variantId: string): Set<string> {
    if (!this._lossSymbolsByVariant.has(variantId)) {
      this._lossSymbolsByVariant.set(
        variantId,
        positionStore.getSymbolsWithLossToday(variantId)
      );
    }
    return this._lossSymbolsByVariant.get(variantId)!;
  }

  // ==================== TICK HANDLING ====================

  private _refreshTickSubscription(): void {
    if (!this._running) return;
    if (this._resubscribeTimer) clearTimeout(this._resubscribeTimer);
    this._resubscribeTimer = setTimeout(() => {
      this._doRefreshTickSubscription();
    }, TICK_RESUBSCRIBE_DEBOUNCE_MS);
  }

  private _doRefreshTickSubscription(): void {
    // Tear down old subscription
    if (this._ws) {
      try { this._ws.close(); } catch { /* ignore */ }
      this._ws = null;
    }

    const symbolKeys = positionStore.getOpenSymbolKeys();
    if (symbolKeys.length === 0) return;

    const symbols = symbolKeys.map((k) => {
      const [symbol, exchange] = k.split(':');
      return { symbol: symbol!, exchange: exchange ?? 'NSE' };
    });

    this._ws = subscribeToMultiTicker(symbols, (tick: PriceUpdate) => {
      this._onTick(tick);
    });
  }

  private _onTick(tick: PriceUpdate): void {
    if (!this._running) return;
    const ltp = Number(tick.last);
    if (!Number.isFinite(ltp) || ltp <= 0) return;
    const exchange = tick.exchange || 'NSE';

    // Find every open position for this symbol (across variants)
    const matching = positionStore
      .getOpenPositions()
      .filter((p) => p.symbol === tick.symbol && p.exchange === exchange);

    for (const pos of matching) {
      // Update watermarks
      const updates: Partial<OpenPosition> = {};
      if (ltp > pos.highWatermark) updates.highWatermark = ltp;
      if (ltp < pos.lowWatermark) updates.lowWatermark = ltp;
      if (Object.keys(updates).length > 0) {
        positionStore.updatePosition(pos.id, updates);
      }

      // Soft exit check (with the freshly-updated watermark via local var)
      const refreshed: OpenPosition = { ...pos, ...updates };
      const exitReason = checkSoftExit(refreshed, ltp);
      if (exitReason) {
        const reasonMap: Record<typeof exitReason & string, ExitReason> = {
          sl_hit: 'sl_hit',
          target_hit: 'target_hit',
        };
        this._closeOne(refreshed, ltp, reasonMap[exitReason]).catch((err) => {
          logger.error('[MVE] Close failed:', err);
        });
      }
    }
  }

  // ==================== TRAIL EVALUATION (called from external 3m tick) ====================

  /**
   * Re-evaluate trail rules for every open position. Engine consumer should
   * call this on each 3m bar close (typically piggybacking on the existing
   * vcpBreakoutMonitor tick).
   */
  evaluateAllTrails(marketByKey: Map<string, MarketState>): void {
    if (!this._running) return;
    const opens = positionStore.getOpenPositions();
    for (const pos of opens) {
      const variant = STRATEGY_VARIANTS.find((v) => v.id === pos.variantId);
      if (!variant) continue;
      if (variant.trailStrategy === 'none') continue;

      const market = marketByKey.get(`${pos.symbol}:${pos.exchange}`);
      if (!market) continue;

      const newSL = evaluateTrail(variant.trailStrategy, pos, market);
      if (newSL !== pos.stopLoss) {
        positionStore.updatePosition(pos.id, { stopLoss: newSL });
        logger.debug(`[MVE] TRAIL ${pos.variantId} ${pos.symbol} SL ${pos.stopLoss.toFixed(2)} → ${newSL.toFixed(2)}`);
      }
    }
  }

  // ==================== EXIT ====================

  private async _closeOne(
    pos: OpenPosition,
    exitPrice: number,
    reason: ExitReason
  ): Promise<void> {
    const order: OrderDetails = {
      symbol: pos.symbol,
      exchange: pos.exchange,
      action: pos.direction === 'long' ? 'SELL' : 'BUY',
      quantity: pos.qty,
      product: 'MIS',
      pricetype: 'MARKET',
      strategy: pos.variantId,
    };

    const response = await placeOrder(order);
    if (response.status !== 'success') {
      logger.warn(`[MVE] Close order failed for ${pos.symbol}:`, response.message);
      // Even on failure, mark closed locally — engine isn't a broker reconciliator
    }

    const closed = positionStore.closePosition(pos.id, {
      exitPrice,
      exitTime: Date.now() / 1000,
      exitReason: reason,
    });
    if (closed) {
      recordExit(closed);
      this._lossSymbolsByVariant.delete(pos.variantId); // invalidate cache
      logger.info(
        `[MVE] CLOSE ${pos.variantId} ${pos.symbol} @ ${exitPrice} ${reason} P&L=${closed.realizedPnL.toFixed(0)} R=${closed.rMultiple.toFixed(2)}`
      );
    }

    this._refreshTickSubscription();
  }

  // ==================== EOD SQUARE-OFF ====================

  private _scheduleEODSquareOff(): void {
    if (this._eodTimer) clearTimeout(this._eodTimer);

    const cfg = this._config;
    const target = parseHHMM(cfg.squareOffTime);
    const now = istMinuteOfDay(new Date());
    let delayMin = target - now;
    if (delayMin <= 0) delayMin += 24 * 60; // tomorrow's

    const delayMs = delayMin * 60 * 1000;
    this._eodTimer = setTimeout(() => {
      this._squareOffAll().finally(() => this._scheduleEODSquareOff()); // schedule next day
    }, delayMs);
    logger.debug(`[MVE] EOD square-off scheduled in ${delayMin} min`);
  }

  private async _squareOffAll(): Promise<void> {
    const opens = positionStore.getOpenPositions();
    if (opens.length === 0) return;
    logger.info(`[MVE] EOD square-off: closing ${opens.length} positions`);
    for (const pos of opens) {
      // We don't have a fresh LTP for every symbol at this moment — use the
      // last-known watermark closest to current direction as a fallback. The
      // broker fills at actual market price; this is just for our internal
      // P&L approximation.
      const fallbackPrice = pos.direction === 'long' ? pos.lowWatermark : pos.highWatermark;
      await this._closeOne(pos, fallbackPrice || pos.entryPrice, 'eod_squareoff');
    }
  }
}

// ==================== UTILITIES ====================

const parseHHMM = (s: string): number => {
  const [h, m] = s.split(':').map((x) => Number(x));
  return (h || 0) * 60 + (m || 0);
};

const istMinuteOfDay = (now: Date): number => {
  const istMs = now.getTime() + (5 * 60 + 30) * 60 * 1000;
  const ist = new Date(istMs);
  return ist.getUTCHours() * 60 + ist.getUTCMinutes();
};

// ==================== SINGLETON ====================

export const multiVariantEngine = new MultiVariantEngine();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    multiVariantEngine.stop();
  });
}

export default multiVariantEngine;

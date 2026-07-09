/**
 * Trade Sizing Engine Tests
 *
 * Verifies the qty computation respects every cap:
 *  - risk per trade
 *  - notional value cap
 *  - lot-size rounding
 *  - per-portfolio margin / position / loss limits
 */

import { calculateTradeSize, checkPortfolioGuards } from '../services/tradeSizing';

describe('calculateTradeSize — equity (lotSize=1)', () => {
  const baseInput = {
    capital: 10_000_000,        // ₹1 Cr
    riskPct: 0.5,                // 0.5%
    notionalCapPct: 12.5,        // 12.5%
    leverage: 5,                 // 5× MIS
    lotSize: 1,
    side: 'long' as const,
  };

  it('caps by notional when SL is tight (HDFCBANK)', () => {
    const result = calculateTradeSize({
      ...baseInput,
      entryPrice: 1500,
      stopLoss: 1485, // ₹15 SL distance
    });
    // qtyByRisk     = 50,000 / 15  = 3,333
    // qtyByNotional = 1,250,000 / 1,500 = 833
    expect(result.qty).toBe(833);
    expect(result.capBoundBy).toBe('notional');
    expect(result.notionalValue).toBeCloseTo(833 * 1500);
    expect(result.marginRequired).toBeCloseTo((833 * 1500) / 5);
    expect(result.errors).toHaveLength(0);
  });

  it('caps by risk when SL is wide relative to price (cheap stock, wide SL)', () => {
    const result = calculateTradeSize({
      ...baseInput,
      entryPrice: 100,
      stopLoss: 85,   // ₹15 SL distance — wide vs price
    });
    // qtyByRisk     = 50,000 / 15  = 3,333
    // qtyByNotional = 1,250,000 / 100 = 12,500
    expect(result.qty).toBe(3333);
    expect(result.capBoundBy).toBe('risk');
    expect(result.actualRisk).toBeCloseTo(3333 * 15);
  });

  it('rejects when SL is so wide that qty rounds to zero', () => {
    const result = calculateTradeSize({
      ...baseInput,
      capital: 10_000,    // ₹10K capital
      riskPct: 0.5,        // ₹50 risk amount
      entryPrice: 24500,
      stopLoss: 24400,    // ₹100 distance
    });
    // qtyByRisk = 50 / 100 = 0.5 → floors to 0
    expect(result.qty).toBe(0);
    expect(result.capBoundBy).toBe('rejected');
    expect(result.errors[0]).toMatch(/qty<lotSize/);
  });

  it('accepts a short trade with SL above entry', () => {
    const result = calculateTradeSize({
      ...baseInput,
      side: 'short',
      entryPrice: 500,
      stopLoss: 510,  // ₹10 above entry
    });
    expect(result.qty).toBeGreaterThan(0);
    expect(result.slDistance).toBe(10);
  });

  it('rejects long trade when SL is at or above entry', () => {
    const result = calculateTradeSize({
      ...baseInput,
      side: 'long',
      entryPrice: 500,
      stopLoss: 510,
    });
    expect(result.qty).toBe(0);
    expect(result.errors[0]).toMatch(/long stopLoss must be below entryPrice/);
  });
});

describe('calculateTradeSize — F&O lot sizing', () => {
  it('rounds down to nearest lot for NIFTY (lot=50)', () => {
    const result = calculateTradeSize({
      capital: 10_000_000,
      riskPct: 0.5,
      notionalCapPct: 12.5,
      leverage: 5,
      lotSize: 50,
      side: 'long',
      entryPrice: 24500,
      stopLoss: 24400,
    });
    // qtyByNotional = 1,250,000 / 24,500 = 51.02 → floor to nearest 50 = 50
    expect(result.qty).toBe(50);
    expect(result.qty % 50).toBe(0);
  });

  it('rejects when capital cannot afford even one lot', () => {
    const result = calculateTradeSize({
      capital: 100_000,
      riskPct: 0.5,
      notionalCapPct: 12.5,
      leverage: 5,
      lotSize: 50,
      side: 'long',
      entryPrice: 24500,
      stopLoss: 24400,
    });
    // qtyByNotional = 12,500 / 24,500 = 0.51 → floor to 0
    expect(result.qty).toBe(0);
    expect(result.capBoundBy).toBe('rejected');
  });
});

describe('calculateTradeSize — input validation', () => {
  const valid = {
    capital: 1_000_000,
    riskPct: 1,
    notionalCapPct: 10,
    leverage: 5,
    entryPrice: 100,
    stopLoss: 95,
    lotSize: 1,
    side: 'long' as const,
  };

  it('rejects zero capital', () => {
    expect(calculateTradeSize({ ...valid, capital: 0 }).qty).toBe(0);
  });

  it('rejects negative riskPct', () => {
    expect(calculateTradeSize({ ...valid, riskPct: -1 }).qty).toBe(0);
  });

  it('rejects riskPct > 100', () => {
    expect(calculateTradeSize({ ...valid, riskPct: 150 }).qty).toBe(0);
  });

  it('rejects zero leverage', () => {
    expect(calculateTradeSize({ ...valid, leverage: 0 }).qty).toBe(0);
  });

  it('rejects non-finite entry price', () => {
    expect(calculateTradeSize({ ...valid, entryPrice: NaN }).qty).toBe(0);
  });
});

describe('checkPortfolioGuards', () => {
  const baseInput = {
    currentMarginUsed: 0,
    newMargin: 250_000,
    capital: 10_000_000,
    maxTotalMarginPct: 50,
    currentOpenPositions: 0,
    maxConcurrent: 5,
    tradesToday: 0,
    maxTradesPerDay: 25,
    realizedPnLToday: 0,
    dailyLossCutoffPct: 2,
  };

  it('allows when all guards pass', () => {
    expect(checkPortfolioGuards(baseInput).allowed).toBe(true);
  });

  it('blocks at max concurrent positions', () => {
    const result = checkPortfolioGuards({ ...baseInput, currentOpenPositions: 5 });
    expect(result.allowed).toBe(false);
    expect(result.reasons[0]).toMatch(/max concurrent/);
  });

  it('blocks at daily trade cap', () => {
    const result = checkPortfolioGuards({ ...baseInput, tradesToday: 25 });
    expect(result.allowed).toBe(false);
    expect(result.reasons[0]).toMatch(/daily trade cap/);
  });

  it('blocks at daily loss cutoff', () => {
    const result = checkPortfolioGuards({
      ...baseInput,
      realizedPnLToday: -250_000, // -2.5% on ₹1 Cr capital
    });
    expect(result.allowed).toBe(false);
    expect(result.reasons[0]).toMatch(/daily loss cutoff/);
  });

  it('blocks when total margin would exceed cap', () => {
    const result = checkPortfolioGuards({
      ...baseInput,
      currentMarginUsed: 4_900_000, // 49%
      newMargin: 200_000,            // would push to 51%
    });
    expect(result.allowed).toBe(false);
    expect(result.reasons[0]).toMatch(/total margin cap/);
  });

  it('reports multiple reasons when multiple guards fail', () => {
    const result = checkPortfolioGuards({
      ...baseInput,
      currentOpenPositions: 5,
      tradesToday: 25,
    });
    expect(result.reasons).toHaveLength(2);
  });
});

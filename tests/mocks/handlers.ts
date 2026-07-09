/**
 * MSW Request Handlers
 * Mock API handlers for testing
 */

import { http, HttpResponse } from 'msw';

const API_BASE = '/api/v1';

/** Mock funds data */
export const mockFunds = {
  availablecash: 100000,
  collateral: 50000,
  m2mrealized: 5000,
  m2munrealized: -2000,
  utiliseddebits: 30000,
};

/** Mock positions data */
export const mockPositions = [
  {
    symbol: 'RELIANCE',
    exchange: 'NSE',
    product: 'MIS',
    quantity: 10,
    average_price: 2500,
    ltp: 2550,
    pnl: 500,
    pnlpercent: 2.0,
    buy_quantity: 10,
    sell_quantity: 0,
    buy_price: 2500,
    sell_price: 0,
  },
];

/** Mock orders data */
export const mockOrders = [
  {
    orderid: 'ORD001',
    symbol: 'RELIANCE',
    exchange: 'NSE',
    action: 'BUY',
    quantity: 10,
    pricetype: 'LIMIT',
    price: 2500,
    trigger_price: 0,
    product: 'MIS',
    order_status: 'COMPLETE',
    filledqty: 10,
    average_price: 2500,
    timestamp: '2024-01-15T10:30:00',
  },
];

/** Mock holdings data */
export const mockHoldings = [
  {
    symbol: 'TATASTEEL',
    exchange: 'NSE',
    quantity: 100,
    average_price: 120,
    ltp: 130,
    pnl: 1000,
    pnlpercent: 8.33,
  },
];

/** API handlers */
export const handlers = [
  // Ping
  http.post(`${API_BASE}/ping`, () => {
    return HttpResponse.json({
      status: 'success',
      broker: 'test',
      message: 'API is working',
    });
  }),

  // Funds
  http.post(`${API_BASE}/funds`, () => {
    return HttpResponse.json({
      status: 'success',
      data: mockFunds,
    });
  }),

  // Position Book
  http.post(`${API_BASE}/positionbook`, () => {
    return HttpResponse.json({
      status: 'success',
      data: mockPositions,
    });
  }),

  // Order Book
  http.post(`${API_BASE}/orderbook`, () => {
    return HttpResponse.json({
      status: 'success',
      orders: mockOrders,
      statistics: {
        total: 1,
        open: 0,
        completed: 1,
        rejected: 0,
      },
    });
  }),

  // Trade Book
  http.post(`${API_BASE}/tradebook`, () => {
    return HttpResponse.json({
      status: 'success',
      data: [],
    });
  }),

  // Holdings
  http.post(`${API_BASE}/holdings`, () => {
    return HttpResponse.json({
      status: 'success',
      holdings: mockHoldings,
      statistics: {
        total_investment: 12000,
        total_current_value: 13000,
        total_pnl: 1000,
        total_pnl_percent: 8.33,
        day_pnl: 100,
        day_pnl_percent: 0.77,
      },
    });
  }),

  // Place Order
  http.post(`${API_BASE}/placeorder`, async ({ request }) => {
    const body = await request.json() as { symbol?: string };
    return HttpResponse.json({
      status: 'success',
      orderid: `ORD${Date.now()}`,
      message: `Order placed for ${body.symbol}`,
    });
  }),

  // Modify Order
  http.post(`${API_BASE}/modifyorder`, async ({ request }) => {
    const body = await request.json() as { orderid?: string };
    return HttpResponse.json({
      status: 'success',
      orderid: body.orderid,
      message: 'Order modified successfully',
    });
  }),

  // Cancel Order
  http.post(`${API_BASE}/cancelorder`, async ({ request }) => {
    const body = await request.json() as { orderid?: string };
    return HttpResponse.json({
      status: 'success',
      message: `Order ${body.orderid} cancelled`,
    });
  }),

  // Klines/History
  http.post(`${API_BASE}/history`, () => {
    const now = Date.now();
    const candles = Array.from({ length: 100 }, (_, i) => ({
      time: Math.floor((now - (100 - i) * 86400000) / 1000),
      open: 100 + Math.random() * 10,
      high: 105 + Math.random() * 10,
      low: 95 + Math.random() * 10,
      close: 100 + Math.random() * 10,
      volume: Math.floor(Math.random() * 1000000),
    }));

    return HttpResponse.json({
      status: 'success',
      data: candles,
    });
  }),

  // Quote
  http.post(`${API_BASE}/quotes`, () => {
    return HttpResponse.json({
      status: 'success',
      data: {
        symbol: 'RELIANCE',
        exchange: 'NSE',
        ltp: 2550,
        chg: 50,
        chgP: 2.0,
        volume: 5000000,
        open: 2510,
        high: 2560,
        low: 2505,
        close: 2550,
        prevClose: 2500,
      },
    });
  }),
];

export default handlers;

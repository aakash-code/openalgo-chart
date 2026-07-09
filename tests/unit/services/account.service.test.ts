/**
 * Account Service Unit Tests
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { server } from '../../mocks/server';
import { getFunds, getPositionBook, getOrderBook } from '@/services/trading/account.service';

// Mock the API config
vi.mock('@/services/api/config', () => ({
  getApiKey: () => 'test-api-key',
  getApiBase: () => '/api/v1',
}));

describe('Account Service', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  afterAll(() => {
    server.close();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  describe('getFunds', () => {
    it('should return funds data on success', async () => {
      const funds = await getFunds();

      expect(funds).not.toBeNull();
      expect(funds).toHaveProperty('availablecash');
      expect(funds).toHaveProperty('collateral');
      expect(funds?.availablecash).toBe(100000);
    });
  });

  describe('getPositionBook', () => {
    it('should return positions array on success', async () => {
      const positions = await getPositionBook();

      expect(Array.isArray(positions)).toBe(true);
      expect(positions.length).toBeGreaterThan(0);
      expect(positions[0]).toHaveProperty('symbol');
      expect(positions[0]).toHaveProperty('quantity');
    });
  });

  describe('getOrderBook', () => {
    it('should return order book with statistics on success', async () => {
      const orderBook = await getOrderBook();

      expect(orderBook).toHaveProperty('orders');
      expect(orderBook).toHaveProperty('statistics');
      expect(Array.isArray(orderBook.orders)).toBe(true);
      expect(orderBook.statistics).toHaveProperty('total');
    });
  });
});

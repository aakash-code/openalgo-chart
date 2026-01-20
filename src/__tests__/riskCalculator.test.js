/**
 * Risk Calculator Tests
 * Verify calculations match expected behavior from the plan
 */

import { calculateRiskPosition, validateRiskParams } from '../utils/indicators/riskCalculator';

describe('Risk Calculator - Core Logic', () => {
  describe('Test Case 1: Basic BUY Setup', () => {
    const params = {
      capital: 200000,
      riskPercent: 1,
      entryPrice: 500,
      stopLossPrice: 490,
      riskRewardRatio: 2,
      side: 'BUY'
    };

    it('should calculate correct risk amount', () => {
      const result = calculateRiskPosition(params);
      expect(result.success).toBe(true);
      expect(result.riskAmount).toBe(2000);
    });

    it('should calculate correct SL points', () => {
      const result = calculateRiskPosition(params);
      expect(result.slPoints).toBe(10);
    });

    it('should calculate correct quantity', () => {
      const result = calculateRiskPosition(params);
      expect(result.quantity).toBe(200);
    });

    it('should calculate correct position value', () => {
      const result = calculateRiskPosition(params);
      expect(result.positionValue).toBe(100000);
    });

    it('should calculate correct target price', () => {
      const result = calculateRiskPosition(params);
      expect(result.targetPrice).toBe(520);
    });

    it('should calculate correct reward points', () => {
      const result = calculateRiskPosition(params);
      expect(result.rewardPoints).toBe(20);
    });

    it('should calculate correct reward amount', () => {
      const result = calculateRiskPosition(params);
      expect(result.rewardAmount).toBe(4000);
    });

    it('should have correct risk:reward ratio', () => {
      const result = calculateRiskPosition(params);
      expect(result.riskRewardRatio).toBe(2);
      expect(result.formatted.rrRatio).toBe('1 : 2');
    });
  });

  describe('Test Case 2: SELL Setup', () => {
    const params = {
      capital: 100000,
      riskPercent: 2,
      entryPrice: 1000,
      stopLossPrice: 1050,
      riskRewardRatio: 3,
      side: 'SELL'
    };

    it('should calculate correct risk amount', () => {
      const result = calculateRiskPosition(params);
      expect(result.success).toBe(true);
      expect(result.riskAmount).toBe(2000);
    });

    it('should calculate correct SL points', () => {
      const result = calculateRiskPosition(params);
      expect(result.slPoints).toBe(50);
    });

    it('should calculate correct quantity', () => {
      const result = calculateRiskPosition(params);
      expect(result.quantity).toBe(40);
    });

    it('should calculate correct target price for SELL', () => {
      const result = calculateRiskPosition(params);
      // For SELL: target = entry - (slPoints × RR)
      // target = 1000 - (50 × 3) = 850
      expect(result.targetPrice).toBe(850);
    });

    it('should calculate correct reward amount', () => {
      const result = calculateRiskPosition(params);
      expect(result.rewardAmount).toBe(6000);
    });
  });

  describe('Test Case 3: Validation Errors', () => {
    it('should error when entry equals stop loss', () => {
      const params = {
        capital: 100000,
        riskPercent: 2,
        entryPrice: 500,
        stopLossPrice: 500,
        riskRewardRatio: 2,
        side: 'BUY'
      };
      const result = calculateRiskPosition(params);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Invalid stop loss');
    });

    it('should error when BUY with entry < stop loss', () => {
      const params = {
        capital: 100000,
        riskPercent: 2,
        entryPrice: 490,
        stopLossPrice: 500,
        riskRewardRatio: 2,
        side: 'BUY'
      };
      const result = calculateRiskPosition(params);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('For BUY: Entry must be above Stop Loss');
    });

    it('should error when SELL with entry > stop loss', () => {
      const params = {
        capital: 100000,
        riskPercent: 2,
        entryPrice: 1050,
        stopLossPrice: 1000,
        riskRewardRatio: 2,
        side: 'SELL'
      };
      const result = calculateRiskPosition(params);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('For SELL: Entry must be below Stop Loss');
    });

    it('should error when capital is zero', () => {
      const params = {
        capital: 0,
        riskPercent: 2,
        entryPrice: 500,
        stopLossPrice: 490,
        riskRewardRatio: 2,
        side: 'BUY'
      };
      const result = calculateRiskPosition(params);
      expect(result.error).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small risk percentage', () => {
      const params = {
        capital: 100000,
        riskPercent: 0.5,
        entryPrice: 500,
        stopLossPrice: 490,
        riskRewardRatio: 2,
        side: 'BUY'
      };
      const result = calculateRiskPosition(params);
      expect(result.success).toBe(true);
      expect(result.riskAmount).toBe(500);
      expect(result.quantity).toBe(50);
    });

    it('should handle high risk-reward ratio', () => {
      const params = {
        capital: 100000,
        riskPercent: 2,
        entryPrice: 500,
        stopLossPrice: 490,
        riskRewardRatio: 5,
        side: 'BUY'
      };
      const result = calculateRiskPosition(params);
      expect(result.success).toBe(true);
      // target = 500 + (10 × 5) = 550
      expect(result.targetPrice).toBe(550);
      expect(result.rewardPoints).toBe(50);
    });

    it('should floor quantity to integer', () => {
      const params = {
        capital: 100000,
        riskPercent: 2,
        entryPrice: 333,
        stopLossPrice: 327,
        riskRewardRatio: 2,
        side: 'BUY'
      };
      const result = calculateRiskPosition(params);
      expect(result.success).toBe(true);
      // riskAmount = 2000
      // slPoints = 6
      // quantity = floor(2000 / 6) = 333
      expect(result.quantity).toBe(333);
      expect(Number.isInteger(result.quantity)).toBe(true);
    });
  });

  describe('Formatted Output', () => {
    it('should format values correctly', () => {
      const params = {
        capital: 200000,
        riskPercent: 1,
        entryPrice: 500,
        stopLossPrice: 490,
        riskRewardRatio: 2,
        side: 'BUY'
      };
      const result = calculateRiskPosition(params);

      expect(result.formatted.capital).toBe('₹2,00,000');
      expect(result.formatted.riskPercent).toBe('1%');
      expect(result.formatted.riskAmount).toBe('₹2,000.00');
      expect(result.formatted.quantity).toBe('200');
      expect(result.formatted.rrRatio).toBe('1 : 2');
    });
  });

  describe('Validation Function', () => {
    it('should validate correct parameters', () => {
      const params = {
        capital: 100000,
        riskPercent: 2,
        entryPrice: 500,
        stopLossPrice: 490,
        riskRewardRatio: 2,
        side: 'BUY'
      };
      const validation = validateRiskParams(params);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid capital', () => {
      const params = {
        capital: -100,
        riskPercent: 2,
        entryPrice: 500,
        stopLossPrice: 490,
        side: 'BUY'
      };
      const validation = validateRiskParams(params);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should detect invalid risk percentage', () => {
      const params = {
        capital: 100000,
        riskPercent: 150,
        entryPrice: 500,
        stopLossPrice: 490,
        side: 'BUY'
      };
      const validation = validateRiskParams(params);
      expect(validation.isValid).toBe(false);
    });
  });
});

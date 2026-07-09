/**
 * Risk Calculator Tests
 * Verify calculations match expected behavior from the plan
 */

import { calculateRiskPosition, validateRiskParams } from '../utils/indicators/riskCalculator';

interface RiskParams {
  capital: number;
  riskPercent: number;
  entryPrice: number;
  stopLossPrice: number;
  riskRewardRatio?: number;
  side: 'BUY' | 'SELL';
  leverage?: number;
  segment?: any;
  exchange?: any;
}

describe('Risk Calculator - Core Logic', () => {
  describe('Test Case 1: Basic BUY Setup', () => {
    const params: RiskParams = {
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
      expect((result as any).riskAmount).toBe(2000);
    });

    it('should calculate correct SL points', () => {
      const result = calculateRiskPosition(params);
      expect((result as any).slPoints).toBe(10);
    });

    it('should calculate correct quantity', () => {
      const result = calculateRiskPosition(params);
      expect((result as any).quantity).toBe(200);
    });

    it('should calculate correct position value', () => {
      const result = calculateRiskPosition(params);
      expect((result as any).positionValue).toBe(100000);
    });

    it('should calculate correct target price', () => {
      const result = calculateRiskPosition(params);
      expect((result as any).targetPrice).toBe(520);
    });

    it('should calculate correct reward points', () => {
      const result = calculateRiskPosition(params);
      expect((result as any).rewardPoints).toBe(20);
    });

    it('should calculate correct reward amount', () => {
      const result = calculateRiskPosition(params);
      expect((result as any).rewardAmount).toBe(4000);
    });

    it('should have correct risk:reward ratio', () => {
      const result = calculateRiskPosition(params);
      expect((result as any).riskRewardRatio).toBe(2);
      expect((result as any).formatted.rrRatio).toBe('1 : 2');
    });
  });

  describe('Test Case 2: SELL Setup', () => {
    const params: RiskParams = {
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
      expect((result as any).riskAmount).toBe(2000);
    });

    it('should calculate correct SL points', () => {
      const result = calculateRiskPosition(params);
      expect((result as any).slPoints).toBe(50);
    });

    it('should calculate correct quantity', () => {
      const result = calculateRiskPosition(params);
      expect((result as any).quantity).toBe(40);
    });

    it('should calculate correct target price for SELL', () => {
      const result = calculateRiskPosition(params);
      // For SELL: target = entry - (slPoints × RR)
      // target = 1000 - (50 × 3) = 850
      expect((result as any).targetPrice).toBe(850);
    });

    it('should calculate correct reward amount', () => {
      const result = calculateRiskPosition(params);
      expect((result as any).rewardAmount).toBe(6000);
    });
  });

  describe('Test Case 3: Validation Errors', () => {
    it('should error when entry equals stop loss', () => {
      const params: RiskParams = {
        capital: 100000,
        riskPercent: 2,
        entryPrice: 500,
        stopLossPrice: 500,
        riskRewardRatio: 2,
        side: 'BUY'
      };
      const result = calculateRiskPosition(params);
      expect(result.success).toBeFalsy();
      expect((result as any).error).toBeDefined();
      expect((result as any).error).toContain('Invalid stop loss');
    });

    it('should auto-flip to SELL when entry < stop loss', () => {
      const params: RiskParams = {
        capital: 100000,
        riskPercent: 2,
        entryPrice: 490,
        stopLossPrice: 500,
        riskRewardRatio: 2,
        side: 'BUY' // Originally requested BUY
      };
      const result = calculateRiskPosition(params);
      expect(result.success).toBe(true);
      expect((result as any).side).toBe('SELL');
    });

    it('should auto-flip to BUY when entry > stop loss', () => {
      const params: RiskParams = {
        capital: 100000,
        riskPercent: 2,
        entryPrice: 1050,
        stopLossPrice: 1000,
        riskRewardRatio: 2,
        side: 'SELL' // Originally requested SELL
      };
      const result = calculateRiskPosition(params);
      expect(result.success).toBe(true);
      expect((result as any).side).toBe('BUY');
    });

    it('should error when capital is zero', () => {
      const params: RiskParams = {
        capital: 0,
        riskPercent: 2,
        entryPrice: 500,
        stopLossPrice: 490,
        riskRewardRatio: 2,
        side: 'BUY'
      };
      const result = calculateRiskPosition(params);
      expect(result.success).toBeFalsy();
      expect((result as any).error).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small risk percentage', () => {
      const params: RiskParams = {
        capital: 100000,
        riskPercent: 0.5,
        entryPrice: 500,
        stopLossPrice: 490,
        riskRewardRatio: 2,
        side: 'BUY'
      };
      const result = calculateRiskPosition(params);
      expect(result.success).toBe(true);
      expect((result as any).riskAmount).toBe(500);
      expect((result as any).quantity).toBe(50);
    });

    it('should handle high risk-reward ratio', () => {
      const params: RiskParams = {
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
      expect((result as any).targetPrice).toBe(550);
      expect((result as any).rewardPoints).toBe(50);
    });

    it('should floor quantity to integer', () => {
      const params: RiskParams = {
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
      expect((result as any).quantity).toBe(333);
      expect(Number.isInteger((result as any).quantity)).toBe(true);
    });
  });

  describe('Multi-Target Support', () => {
    it('should calculate correct values for multiple targets', () => {
      const params = {
        capital: 100000,
        riskPercent: 1, // riskAmount = 1000
        entryPrice: 500,
        stopLossPrice: 490, // slPoints = 10, qty = 100
        targets: [
          { price: 510, exitPercent: 50 }, // T1: 50 shares, 1:1 RR, 500 reward
          { price: 520, exitPercent: 50 }  // T2: 50 shares, 2:1 RR, 1000 reward
        ],
        side: 'BUY' as const
      };
      const result = calculateRiskPosition(params);
      expect(result.success).toBe(true);
      expect((result as any).targets).toHaveLength(2);
      
      // T1
      expect((result as any).targets![0].quantity).toBe(50);
      expect((result as any).targets![0].rewardAmount).toBe(500);
      expect((result as any).targets![0].riskRewardRatio).toBe(1);
      
      // T2
      expect((result as any).targets![1].quantity).toBe(50);
      expect((result as any).targets![1].rewardAmount).toBe(1000);
      expect((result as any).targets![1].riskRewardRatio).toBe(2);
      
      // Blended RR: (500 + 1000) / 1000 = 1.5
      expect((result as any).blendedRR).toBe(1.5);
      expect((result as any).formatted.blendedRR).toBe('1 : 1.50');
    });
  });

  describe('New Metrics', () => {
    it('should calculate risk per share', () => {
      const params: RiskParams = {
        capital: 100000,
        riskPercent: 2,
        entryPrice: 500,
        stopLossPrice: 490,
        side: 'BUY'
      };
      const result = calculateRiskPosition(params);
      expect(result.success).toBe(true);
      expect((result as any).riskPerShare).toBe(10);
      expect((result as any).formatted.riskPerShare).toBe('₹10.00');
    });
  });

  describe('Formatted Output', () => {
    it('should format values correctly', () => {
      const params: RiskParams = {
        capital: 200000,
        riskPercent: 1,
        entryPrice: 500,
        stopLossPrice: 490,
        riskRewardRatio: 2,
        side: 'BUY'
      };
      const result = calculateRiskPosition(params);

      expect((result as any).formatted.capital).toBe('₹2,00,000');
      expect((result as any).formatted.riskPercent).toBe('1%');
      expect((result as any).formatted.riskAmount).toBe('₹2,000.00');
      expect((result as any).formatted.quantity).toBe('200');
      expect((result as any).formatted.rrRatio).toBe('1 : 2');
    });
  });

  describe('Validation Function', () => {
    it('should validate correct parameters', () => {
      const params: RiskParams = {
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
        side: 'BUY' as const
      };
      const validation = validateRiskParams(params as RiskParams);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should detect invalid risk percentage', () => {
      const params: RiskParams = {
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

  describe('Indian Market Charges', () => {
    it('should calculate correct STT and Brokerage for F&O Options', () => {
      const params = {
        capital: 100000,
        riskPercent: 1, // risk = 1000
        entryPrice: 100,
        stopLossPrice: 90, // slPoints = 10 -> qty = 100
        targetPrice: 120, // reward = 20 * 100 = 2000
        side: 'BUY' as const,
        leverage: 1,
        segment: 'F&O Options' as const,
        exchange: 'NSE' as const
      };
      
      const result = calculateRiskPosition(params);
      expect(result.success).toBe(true);
      
      // qty = 100.
      // entryValue = 100 * 100 = 10000.
      // exitValue = 120 * 100 = 12000.
      // STT for F&O options: buy = 0, sell = 0.15% (budget 2026)
      // STT = 12000 * 0.0015 = 18.
      expect((result as any).charges?.sttTotal).toBe(18);
      
      // Brokerage = 20 + 20 = 40
      expect((result as any).charges?.brokerageTotal).toBe(40);
    });
  });
});
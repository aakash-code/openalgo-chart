import { validateRiskParamsDetailed } from '../utils/indicators/riskCalculator';

describe('Risk Calculator detailed validation', () => {
  it('handles string-backed form values without throwing', () => {
    expect(() =>
      validateRiskParamsDetailed({
        capital: '100000',
        riskPercent: '2',
        side: 'BUY',
        entryPrice: '100',
        stopLossPrice: '110',
        targetPrice: '90',
      })
    ).not.toThrow();
  });

  it('formats validation messages using coerced numeric values', () => {
    const validation = validateRiskParamsDetailed({
      capital: '100000',
      riskPercent: '2',
      side: 'BUY',
      entryPrice: '100',
      stopLossPrice: '110',
      targetPrice: '90',
    });

    expect(validation.errors.stopLossPrice).toBe('For BUY, stop loss must be below entry (< 100.00)');
    expect(validation.errors.stopLossSuggestion).toBe('98.00');
    expect(validation.errors.targetPrice).toBe('For BUY, target must be above entry (> 100.00)');
    expect(validation.errors.targetSuggestion).toBe('102.00');
  });
});

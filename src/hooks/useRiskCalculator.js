import { useState, useEffect, useMemo, useCallback } from 'react';
import { calculateRiskPosition, validateRiskParams } from '../utils/indicators/riskCalculator';

/**
 * React hook for managing risk calculator state and calculations
 *
 * @param {Object} initialParams - Initial parameters
 * @param {number} initialParams.capital - Initial capital
 * @param {number} initialParams.riskPercent - Initial risk percentage
 * @param {number} initialParams.entryPrice - Initial entry price
 * @param {number} initialParams.stopLossPrice - Initial stop loss price
 * @param {number} initialParams.riskRewardRatio - Initial risk:reward ratio
 * @param {string} initialParams.side - Initial side (BUY/SELL)
 * @param {boolean} initialParams.showTarget - Show target line
 * @returns {Object} Hook state and methods
 */
export function useRiskCalculator(initialParams = {}) {
  const [params, setParams] = useState({
    capital: initialParams.capital || 100000,
    riskPercent: initialParams.riskPercent || 2,
    entryPrice: initialParams.entryPrice || 0,
    stopLossPrice: initialParams.stopLossPrice || 0,
    targetPrice: initialParams.targetPrice || 0,
    riskRewardRatio: initialParams.riskRewardRatio || 2,
    side: initialParams.side || 'BUY',
    showTarget: initialParams.showTarget !== false
  });

  // Calculate results (memoized)
  const results = useMemo(() => {
    return calculateRiskPosition(params);
  }, [params]);

  // Validate parameters (memoized)
  const validation = useMemo(() => {
    return validateRiskParams(params);
  }, [params]);

  // Update individual param
  const updateParam = useCallback((key, value) => {
    setParams(prev => ({ ...prev, [key]: value }));
  }, []);

  // Update multiple params at once
  const updateParams = useCallback((updates) => {
    setParams(prev => ({ ...prev, ...updates }));
  }, []);

  // Reset to initial params
  const reset = useCallback(() => {
    setParams({
      capital: initialParams.capital || 100000,
      riskPercent: initialParams.riskPercent || 2,
      entryPrice: initialParams.entryPrice || 0,
      stopLossPrice: initialParams.stopLossPrice || 0,
      targetPrice: initialParams.targetPrice || 0,
      riskRewardRatio: initialParams.riskRewardRatio || 2,
      side: initialParams.side || 'BUY',
      showTarget: initialParams.showTarget !== false
    });
  }, [initialParams]);

  // Set entry price from current LTP
  const setEntryFromLTP = useCallback((ltp) => {
    updateParam('entryPrice', ltp);
  }, [updateParam]);

  // Auto-calculate stop loss based on percentage
  const setStopLossFromPercent = useCallback((percent) => {
    if (!params.entryPrice || params.entryPrice <= 0) {
      return;
    }

    let stopLoss;
    if (params.side === 'BUY') {
      stopLoss = params.entryPrice * (1 - percent / 100);
    } else {
      stopLoss = params.entryPrice * (1 + percent / 100);
    }

    updateParam('stopLossPrice', parseFloat(stopLoss.toFixed(2)));
  }, [params.entryPrice, params.side, updateParam]);

  return {
    params,
    results,
    validation,
    updateParam,
    updateParams,
    reset,
    setEntryFromLTP,
    setStopLossFromPercent,
    isValid: results?.success === true,
    hasError: results?.error !== undefined
  };
}

export default useRiskCalculator;

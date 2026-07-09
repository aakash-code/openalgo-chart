/**
 * Risk Calculator Hook
 * Manages risk calculator state and calculations for position sizing
 */

import { useState, useMemo, useCallback } from 'react';
import { calculateRiskPosition, validateRiskParams } from '../utils/indicators/riskCalculator';

// ==================== TYPES ====================

/** Trading side */
export type TradeSide = 'BUY' | 'SELL';

/** Risk calculator parameters */
export interface RiskParams {
  capital: number;
  riskPercent: number;
  entryPrice: number;
  stopLossPrice: number;
  targetPrice: number;
  riskRewardRatio: number;
  side: TradeSide;
  showTarget: boolean;
}

/** Initial parameters (all optional) */
export interface InitialRiskParams {
  capital?: number | undefined;
  riskPercent?: number | undefined;
  entryPrice?: number | undefined;
  stopLossPrice?: number | undefined;
  targetPrice?: number | undefined;
  riskRewardRatio?: number | undefined;
  side?: TradeSide | undefined;
  showTarget?: boolean | undefined;
}

/** Risk calculation results */
export interface RiskResults {
  success: boolean;
  positionSize?: number | undefined;
  riskAmount?: number | undefined;
  rewardAmount?: number | undefined;
  riskRewardRatio?: number | undefined;
  error?: string | undefined;
}

/** Validation result */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/** Hook return type */
export interface UseRiskCalculatorReturn {
  params: RiskParams;
  results: RiskResults;
  validation: ValidationResult;
  updateParam: <K extends keyof RiskParams>(key: K, value: RiskParams[K]) => void;
  updateParams: (updates: Partial<RiskParams>) => void;
  reset: () => void;
  setEntryFromLTP: (ltp: number) => void;
  setStopLossFromPercent: (percent: number) => void;
  isValid: boolean;
  hasError: boolean;
}

// ==================== HOOK ====================

/**
 * React hook for managing risk calculator state and calculations
 *
 * @param initialParams - Initial parameters
 * @returns Hook state and methods
 */
export function useRiskCalculator(initialParams: InitialRiskParams = {}): UseRiskCalculatorReturn {
  const [params, setParams] = useState<RiskParams>({
    capital: initialParams.capital || 100000,
    riskPercent: initialParams.riskPercent || 2,
    entryPrice: initialParams.entryPrice || 0,
    stopLossPrice: initialParams.stopLossPrice || 0,
    targetPrice: initialParams.targetPrice || 0,
    riskRewardRatio: initialParams.riskRewardRatio || 2,
    side: initialParams.side || 'BUY',
    showTarget: initialParams.showTarget !== false,
  });

  // Calculate results (memoized)
  const results = useMemo((): RiskResults => {
    return calculateRiskPosition(params) as RiskResults;
  }, [params]);

  // Validate parameters (memoized)
  const validation = useMemo((): ValidationResult => {
    return validateRiskParams(params) as ValidationResult;
  }, [params]);

  // Update individual param
  const updateParam = useCallback(<K extends keyof RiskParams>(key: K, value: RiskParams[K]) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Update multiple params at once
  const updateParams = useCallback((updates: Partial<RiskParams>) => {
    setParams((prev) => ({ ...prev, ...updates }));
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
      showTarget: initialParams.showTarget !== false,
    });
  }, [initialParams]);

  // Set entry price from current LTP
  const setEntryFromLTP = useCallback(
    (ltp: number) => {
      updateParam('entryPrice', ltp);
    },
    [updateParam]
  );

  // Auto-calculate stop loss based on percentage
  const setStopLossFromPercent = useCallback(
    (percent: number) => {
      if (!params.entryPrice || params.entryPrice <= 0) {
        return;
      }

      let stopLoss: number;
      if (params.side === 'BUY') {
        stopLoss = params.entryPrice * (1 - percent / 100);
      } else {
        stopLoss = params.entryPrice * (1 + percent / 100);
      }

      updateParam('stopLossPrice', parseFloat(stopLoss.toFixed(2)));
    },
    [params.entryPrice, params.side, updateParam]
  );

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
    hasError: results?.error !== undefined,
  };
}

export default useRiskCalculator;

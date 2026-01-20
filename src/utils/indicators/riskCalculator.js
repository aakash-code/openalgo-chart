/**
 * Risk Calculator - Calculate position size based on risk
 * Inspired by: https://www.tradingview.com/script/LJGj41W8-Risk-Calculator/
 *
 * @module riskCalculator
 */

/**
 * Calculate risk position and target based on capital, risk %, and risk-reward ratio
 *
 * @param {Object} params - Calculation parameters
 * @param {number} params.capital - Total trading capital
 * @param {number} params.riskPercent - Risk percentage (0.5 to 5)
 * @param {number} params.entryPrice - Entry price
 * @param {number} params.stopLossPrice - Stop loss price
 * @param {number} [params.targetPrice] - Optional manual target price (if provided, R:R is calculated)
 * @param {number} [params.riskRewardRatio=2] - Risk:Reward ratio (used if targetPrice not provided)
 * @param {string} params.side - 'BUY' or 'SELL'
 * @returns {Object|null} Calculation results or error
 */
export function calculateRiskPosition(params) {
  const {
    capital,
    riskPercent,
    entryPrice,
    stopLossPrice,
    targetPrice = null,
    riskRewardRatio = 2,
    side
  } = params;

  // Validation: Check required fields
  if (!capital || capital <= 0) {
    return { error: 'Capital must be greater than 0' };
  }

  if (!riskPercent || riskPercent <= 0) {
    return { error: 'Risk % must be greater than 0' };
  }

  if (!entryPrice || entryPrice <= 0) {
    return { error: 'Entry price must be greater than 0' };
  }

  if (!stopLossPrice || stopLossPrice <= 0) {
    return { error: 'Stop loss price must be greater than 0' };
  }

  // Note: riskRewardRatio is optional if targetPrice is provided
  if (!targetPrice && (!riskRewardRatio || riskRewardRatio <= 0)) {
    return { error: 'Risk:Reward ratio must be greater than 0' };
  }

  // Step 1: Calculate risk amount
  const riskAmount = capital * (riskPercent / 100);

  // Step 2: Calculate SL points
  const slPoints = Math.abs(entryPrice - stopLossPrice);

  // Validation: SL must be different from entry
  if (slPoints <= 0) {
    return { error: 'Invalid stop loss: must be different from entry' };
  }

  // Validation: Check direction validity
  if (side === 'BUY' && entryPrice <= stopLossPrice) {
    return { error: 'For BUY: Entry must be above Stop Loss' };
  }

  if (side === 'SELL' && entryPrice >= stopLossPrice) {
    return { error: 'For SELL: Entry must be below Stop Loss' };
  }

  // Step 3: Calculate quantity
  const quantity = Math.floor(riskAmount / slPoints);

  // Check if quantity is valid
  if (quantity <= 0) {
    return { error: 'Calculated quantity is 0. Increase capital or risk %' };
  }

  // Step 4: Calculate position value
  const positionValue = quantity * entryPrice;

  // Step 5: Calculate target price OR R:R ratio
  let finalTargetPrice;
  let finalRiskRewardRatio;

  if (targetPrice && targetPrice > 0) {
    // Manual target provided - calculate R:R ratio from it
    finalTargetPrice = targetPrice;

    // Validate target is on correct side
    if (side === 'BUY' && targetPrice <= entryPrice) {
      return { error: 'For BUY: Target must be above Entry' };
    }
    if (side === 'SELL' && targetPrice >= entryPrice) {
      return { error: 'For SELL: Target must be below Entry' };
    }

    // Calculate R:R ratio from target
    const targetPoints = Math.abs(targetPrice - entryPrice);
    finalRiskRewardRatio = targetPoints / slPoints;

  } else {
    // No manual target - use R:R ratio to calculate target (current behavior)
    finalRiskRewardRatio = riskRewardRatio;

    if (side === 'BUY') {
      finalTargetPrice = entryPrice + (slPoints * finalRiskRewardRatio);
    } else {
      finalTargetPrice = entryPrice - (slPoints * finalRiskRewardRatio);
    }
  }

  // Step 6: Calculate reward
  const rewardPoints = Math.abs(finalTargetPrice - entryPrice);
  const rewardAmount = rewardPoints * quantity;

  // Return successful calculation
  return {
    success: true,
    riskAmount,
    slPoints,
    quantity,
    positionValue,
    targetPrice: finalTargetPrice,
    rewardPoints,
    rewardAmount,
    riskRewardRatio: finalRiskRewardRatio,
    // Formatted for display
    formatted: {
      capital: `₹${capital.toLocaleString('en-IN')}`,
      riskPercent: `${riskPercent}%`,
      riskAmount: `₹${riskAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      entryPrice: `₹${entryPrice.toFixed(2)}`,
      stopLossPrice: `₹${stopLossPrice.toFixed(2)}`,
      slPoints: slPoints.toFixed(2),
      quantity: quantity.toLocaleString('en-IN'),
      positionValue: `₹${positionValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      targetPrice: `₹${finalTargetPrice.toFixed(2)}`,
      rewardPoints: rewardPoints.toFixed(2),
      rewardAmount: `₹${rewardAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      rrRatio: `1 : ${finalRiskRewardRatio.toFixed(2)}`
    }
  };
}

/**
 * Auto-detect trade side based on entry and stop loss prices
 *
 * Logic:
 * - SELL when Stop Loss > Entry (stop loss above entry price)
 * - BUY when Stop Loss < Entry (stop loss below entry price)
 *
 * @param {number} entryPrice - Entry price
 * @param {number} stopLossPrice - Stop loss price
 * @returns {string|null} 'BUY', 'SELL', or null if prices are equal/invalid
 */
export function autoDetectSide(entryPrice, stopLossPrice) {
  if (!entryPrice || !stopLossPrice || entryPrice <= 0 || stopLossPrice <= 0) {
    return null;
  }

  if (entryPrice === stopLossPrice) {
    return null; // Invalid - entry and SL are same
  }

  // SELL when SL > Entry (stop loss above entry)
  // BUY when SL < Entry (stop loss below entry)
  return stopLossPrice > entryPrice ? 'SELL' : 'BUY';
}

/**
 * Validate risk calculator parameters
 *
 * @param {Object} params - Parameters to validate
 * @returns {Object} Validation result with isValid flag and errors array
 */
export function validateRiskParams(params) {
  const errors = [];

  if (!params.capital || params.capital <= 0) {
    errors.push('Capital must be greater than 0');
  }

  if (!params.riskPercent || params.riskPercent <= 0 || params.riskPercent > 100) {
    errors.push('Risk % must be between 0 and 100');
  }

  if (!params.entryPrice || params.entryPrice <= 0) {
    errors.push('Entry price must be greater than 0');
  }

  if (!params.stopLossPrice || params.stopLossPrice <= 0) {
    errors.push('Stop loss price must be greater than 0');
  }

  if (params.entryPrice && params.stopLossPrice && params.side) {
    if (params.side === 'BUY' && params.entryPrice <= params.stopLossPrice) {
      errors.push('For BUY: Entry must be above Stop Loss');
    }

    if (params.side === 'SELL' && params.entryPrice >= params.stopLossPrice) {
      errors.push('For SELL: Entry must be below Stop Loss');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Enhanced validation with field-level errors and suggestions
 * Provides detailed error messages and suggestions for each field
 *
 * @param {Object} params - Parameters to validate
 * @returns {Object} Validation result with isValid, errors object, and warnings
 */
export function validateRiskParamsDetailed(params) {
  const errors = {};

  // Capital validation
  if (!params.capital || params.capital <= 0) {
    errors.capital = 'Capital must be greater than 0';
  } else if (params.capital < 1000) {
    errors.capital = 'Capital should be at least ₹1,000';
    errors.capitalLevel = 'warning';
  }

  // Risk percent validation
  if (!params.riskPercent || params.riskPercent <= 0) {
    errors.riskPercent = 'Risk % must be greater than 0';
  } else if (params.riskPercent > 5) {
    errors.riskPercent = 'Risk > 5% is very aggressive';
    errors.riskPercentLevel = 'warning'; // Not blocking
  } else if (params.riskPercent > 100) {
    errors.riskPercent = 'Risk % cannot exceed 100%';
  }

  // Entry price validation
  if (!params.entryPrice || params.entryPrice <= 0) {
    errors.entryPrice = 'Entry must be greater than 0';
  }

  // Stop loss validation
  if (!params.stopLossPrice || params.stopLossPrice <= 0) {
    errors.stopLossPrice = 'Stop loss must be greater than 0';
  }

  // Cross-field validation (entry vs stop loss)
  if (params.entryPrice && params.stopLossPrice && params.entryPrice > 0 && params.stopLossPrice > 0) {
    if (params.entryPrice === params.stopLossPrice) {
      errors.stopLossPrice = 'Stop loss must differ from entry';
      errors.entryPrice = 'Entry must differ from stop loss';
    } else {
      const side = params.side || 'BUY';

      if (side === 'BUY' && params.stopLossPrice >= params.entryPrice) {
        errors.stopLossPrice = `For BUY, stop loss must be below entry (< ₹${params.entryPrice.toFixed(2)})`;
        errors.stopLossSuggestion = Math.max(0.01, params.entryPrice * 0.98).toFixed(2);
      }

      if (side === 'SELL' && params.stopLossPrice <= params.entryPrice) {
        errors.stopLossPrice = `For SELL, stop loss must be above entry (> ₹${params.entryPrice.toFixed(2)})`;
        errors.stopLossSuggestion = (params.entryPrice * 1.02).toFixed(2);
      }
    }
  }

  // Target validation (if provided)
  if (params.targetPrice && params.targetPrice > 0 && params.entryPrice && params.entryPrice > 0) {
    const side = params.side || 'BUY';

    if (side === 'BUY' && params.targetPrice <= params.entryPrice) {
      errors.targetPrice = `For BUY, target must be above entry (> ₹${params.entryPrice.toFixed(2)})`;
      errors.targetSuggestion = (params.entryPrice * 1.02).toFixed(2);
    }

    if (side === 'SELL' && params.targetPrice >= params.entryPrice) {
      errors.targetPrice = `For SELL, target must be below entry (< ₹${params.entryPrice.toFixed(2)})`;
      errors.targetSuggestion = Math.max(0.01, params.entryPrice * 0.98).toFixed(2);
    }
  }

  // Filter out suggestion and level keys for validity check
  const errorKeys = Object.keys(errors).filter(k => !k.endsWith('Suggestion') && !k.endsWith('Level'));
  const warningKeys = Object.keys(errors).filter(k => errors[`${k}Level`] === 'warning');

  // Only blocking errors (not warnings) should invalidate the form
  const blockingErrors = errorKeys.filter(k => !warningKeys.includes(k));

  return {
    isValid: blockingErrors.length === 0,
    errors,
    warnings: warningKeys
  };
}

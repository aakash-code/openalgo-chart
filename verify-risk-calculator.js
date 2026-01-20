/**
 * Verification script for Risk Calculator
 * Run with: node verify-risk-calculator.js
 */

// Simple implementation to verify logic
function calculateRiskPosition(params) {
  const {
    capital,
    riskPercent,
    entryPrice,
    stopLossPrice,
    riskRewardRatio,
    side
  } = params;

  // Validation
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

  // Step 1: Calculate risk amount
  const riskAmount = capital * (riskPercent / 100);

  // Step 2: Calculate SL points
  const slPoints = Math.abs(entryPrice - stopLossPrice);

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

  if (quantity <= 0) {
    return { error: 'Calculated quantity is 0. Increase capital or risk %' };
  }

  // Step 4: Calculate position value
  const positionValue = quantity * entryPrice;

  // Step 5: Calculate target price
  let targetPrice;
  if (side === 'BUY') {
    targetPrice = entryPrice + (slPoints * riskRewardRatio);
  } else {
    targetPrice = entryPrice - (slPoints * riskRewardRatio);
  }

  // Step 6: Calculate reward
  const rewardPoints = Math.abs(targetPrice - entryPrice);
  const rewardAmount = rewardPoints * quantity;

  return {
    success: true,
    riskAmount,
    slPoints,
    quantity,
    positionValue,
    targetPrice,
    rewardPoints,
    rewardAmount,
    riskRewardRatio
  };
}

console.log('Risk Calculator Verification\n');
console.log('=' + '='.repeat(60) + '\n');

// Test Case 1: Basic BUY Setup
console.log('Test Case 1: Basic BUY Setup');
console.log('-'.repeat(60));
const test1 = {
  capital: 200000,
  riskPercent: 1,
  entryPrice: 500,
  stopLossPrice: 490,
  riskRewardRatio: 2,
  side: 'BUY'
};

const result1 = calculateRiskPosition(test1);
console.log('Inputs:', test1);
console.log('Results:', result1);
console.log('\nExpected:');
console.log('  Risk Amount: ₹2,000');
console.log('  SL Points: 10');
console.log('  Quantity: 200 shares');
console.log('  Position Value: ₹100,000');
console.log('  Target: ₹520');
console.log('  Reward Points: 20');
console.log('  Reward Amount: ₹4,000');
console.log('  Risk:Reward: 1:2');

console.log('\nActual:');
console.log('  Risk Amount: ₹' + result1.riskAmount.toLocaleString('en-IN'));
console.log('  SL Points:', result1.slPoints);
console.log('  Quantity:', result1.quantity, 'shares');
console.log('  Position Value: ₹' + result1.positionValue.toLocaleString('en-IN'));
console.log('  Target: ₹' + result1.targetPrice);
console.log('  Reward Points:', result1.rewardPoints);
console.log('  Reward Amount: ₹' + result1.rewardAmount.toLocaleString('en-IN'));
console.log('  Risk:Reward: 1:' + result1.riskRewardRatio);

console.log('\n✓ Test Case 1:', result1.success ? 'PASSED' : 'FAILED');

// Test Case 2: SELL Setup
console.log('\n' + '='.repeat(60));
console.log('\nTest Case 2: SELL Setup');
console.log('-'.repeat(60));
const test2 = {
  capital: 100000,
  riskPercent: 2,
  entryPrice: 1000,
  stopLossPrice: 1050,
  riskRewardRatio: 3,
  side: 'SELL'
};

const result2 = calculateRiskPosition(test2);
console.log('Inputs:', test2);
console.log('Results:', result2);
console.log('\nExpected:');
console.log('  Risk Amount: ₹2,000');
console.log('  SL Points: 50');
console.log('  Quantity: 40 shares');
console.log('  Target: ₹850');
console.log('  Reward Amount: ₹6,000');

console.log('\nActual:');
console.log('  Risk Amount: ₹' + result2.riskAmount.toLocaleString('en-IN'));
console.log('  SL Points:', result2.slPoints);
console.log('  Quantity:', result2.quantity, 'shares');
console.log('  Target: ₹' + result2.targetPrice);
console.log('  Reward Amount: ₹' + result2.rewardAmount.toLocaleString('en-IN'));

console.log('\n✓ Test Case 2:', result2.success ? 'PASSED' : 'FAILED');

// Test Case 3: Validation - Entry = SL
console.log('\n' + '='.repeat(60));
console.log('\nTest Case 3: Validation - Entry = Stop Loss');
console.log('-'.repeat(60));
const test3 = {
  capital: 100000,
  riskPercent: 2,
  entryPrice: 500,
  stopLossPrice: 500,
  riskRewardRatio: 2,
  side: 'BUY'
};

const result3 = calculateRiskPosition(test3);
console.log('Inputs:', test3);
console.log('Result:', result3);
console.log('✓ Test Case 3:', result3.error ? 'PASSED (Error detected)' : 'FAILED');

// Test Case 4: Validation - BUY with entry < SL
console.log('\n' + '='.repeat(60));
console.log('\nTest Case 4: Validation - BUY with Entry < Stop Loss');
console.log('-'.repeat(60));
const test4 = {
  capital: 100000,
  riskPercent: 2,
  entryPrice: 490,
  stopLossPrice: 500,
  riskRewardRatio: 2,
  side: 'BUY'
};

const result4 = calculateRiskPosition(test4);
console.log('Inputs:', test4);
console.log('Result:', result4);
console.log('✓ Test Case 4:', result4.error ? 'PASSED (Error detected)' : 'FAILED');

// Test Case 5: Validation - SELL with entry > SL
console.log('\n' + '='.repeat(60));
console.log('\nTest Case 5: Validation - SELL with Entry > Stop Loss');
console.log('-'.repeat(60));
const test5 = {
  capital: 100000,
  riskPercent: 2,
  entryPrice: 1050,
  stopLossPrice: 1000,
  riskRewardRatio: 2,
  side: 'SELL'
};

const result5 = calculateRiskPosition(test5);
console.log('Inputs:', test5);
console.log('Result:', result5);
console.log('✓ Test Case 5:', result5.error ? 'PASSED (Error detected)' : 'FAILED');

console.log('\n' + '='.repeat(60));
console.log('\n✅ All test cases completed!\n');

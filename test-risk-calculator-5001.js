/**
 * Comprehensive Risk Calculator Test
 * Including test with entry price 5001
 */

import { calculateRiskPosition } from './src/utils/indicators/riskCalculator.js';

console.log('🧪 Risk Calculator Comprehensive Test Suite\n');
console.log('='.repeat(70) + '\n');

const tests = [];

// Test 1: Entry price 5001 - BUY
console.log('TEST 1: Entry Price 5001 - BUY Setup');
console.log('-'.repeat(70));
const test1 = {
  capital: 500000,
  riskPercent: 1,
  entryPrice: 5001,
  stopLossPrice: 4950,
  riskRewardRatio: 2,
  side: 'BUY'
};

const result1 = calculateRiskPosition(test1);
console.log('Input:');
console.log('  Capital: ₹5,00,000');
console.log('  Risk %: 1%');
console.log('  Entry: ₹5,001');
console.log('  Stop Loss: ₹4,950');
console.log('  Risk:Reward: 1:2');
console.log('  Side: BUY');
console.log('\nCalculations:');
console.log('  Risk Amount:', result1.formatted?.riskAmount || result1.error);
console.log('  SL Points:', result1.slPoints || 'N/A');
console.log('  Quantity:', result1.formatted?.quantity || 'N/A', 'shares');
console.log('  Position Value:', result1.formatted?.positionValue || 'N/A');
console.log('  Target Price:', result1.formatted?.targetPrice || 'N/A');
console.log('  Reward Amount:', result1.formatted?.rewardAmount || 'N/A');
console.log('  Risk:Reward:', result1.formatted?.rrRatio || 'N/A');

const expectedQty1 = Math.floor(5000 / 51); // Risk 5000, SL points 51
console.log('\n✓ Expected Quantity:', expectedQty1, 'shares');
console.log('✓ Actual Quantity:', result1.quantity, 'shares');
console.log('✓ Match:', result1.quantity === expectedQty1 ? 'YES ✅' : 'NO ❌');

tests.push({
  name: 'Test 1: Entry 5001 BUY',
  passed: result1.success && result1.quantity === expectedQty1
});

// Test 2: Entry price 5001 - SELL
console.log('\n' + '='.repeat(70));
console.log('\nTEST 2: Entry Price 5001 - SELL Setup');
console.log('-'.repeat(70));
const test2 = {
  capital: 500000,
  riskPercent: 1,
  entryPrice: 5001,
  stopLossPrice: 5051,
  riskRewardRatio: 3,
  side: 'SELL'
};

const result2 = calculateRiskPosition(test2);
console.log('Input:');
console.log('  Capital: ₹5,00,000');
console.log('  Risk %: 1%');
console.log('  Entry: ₹5,001');
console.log('  Stop Loss: ₹5,051');
console.log('  Risk:Reward: 1:3');
console.log('  Side: SELL');
console.log('\nCalculations:');
console.log('  Risk Amount:', result2.formatted?.riskAmount || result2.error);
console.log('  SL Points:', result2.slPoints || 'N/A');
console.log('  Quantity:', result2.formatted?.quantity || 'N/A', 'shares');
console.log('  Position Value:', result2.formatted?.positionValue || 'N/A');
console.log('  Target Price:', result2.formatted?.targetPrice || 'N/A');
console.log('  Reward Amount:', result2.formatted?.rewardAmount || 'N/A');

const expectedTarget2 = 5001 - (50 * 3); // 4851
console.log('\n✓ Expected Target:', expectedTarget2);
console.log('✓ Actual Target:', result2.targetPrice);
console.log('✓ Match:', result2.targetPrice === expectedTarget2 ? 'YES ✅' : 'NO ❌');

tests.push({
  name: 'Test 2: Entry 5001 SELL',
  passed: result2.success && result2.targetPrice === expectedTarget2
});

// Test 3: Small capital with 5001 entry
console.log('\n' + '='.repeat(70));
console.log('\nTEST 3: Small Capital (₹50,000) with Entry 5001');
console.log('-'.repeat(70));
const test3 = {
  capital: 50000,
  riskPercent: 2,
  entryPrice: 5001,
  stopLossPrice: 4976,
  riskRewardRatio: 2,
  side: 'BUY'
};

const result3 = calculateRiskPosition(test3);
console.log('Input:');
console.log('  Capital: ₹50,000');
console.log('  Risk %: 2%');
console.log('  Entry: ₹5,001');
console.log('  Stop Loss: ₹4,976');
console.log('  Risk:Reward: 1:2');
console.log('  Side: BUY');
console.log('\nCalculations:');
console.log('  Risk Amount:', result3.formatted?.riskAmount || result3.error);
console.log('  SL Points:', result3.slPoints || 'N/A');
console.log('  Quantity:', result3.formatted?.quantity || 'N/A', 'shares');
console.log('  Position Value:', result3.formatted?.positionValue || 'N/A');
console.log('  Target Price:', result3.formatted?.targetPrice || 'N/A');

const riskAmt3 = 50000 * 0.02; // 1000
const slPts3 = 25;
const expectedQty3 = Math.floor(riskAmt3 / slPts3); // 40
console.log('\n✓ Expected Quantity:', expectedQty3, 'shares');
console.log('✓ Actual Quantity:', result3.quantity, 'shares');
console.log('✓ Match:', result3.quantity === expectedQty3 ? 'YES ✅' : 'NO ❌');

tests.push({
  name: 'Test 3: Small capital 5001',
  passed: result3.success && result3.quantity === expectedQty3
});

// Test 4: Fractional quantity test
console.log('\n' + '='.repeat(70));
console.log('\nTEST 4: Fractional Quantity (Should Floor)');
console.log('-'.repeat(70));
const test4 = {
  capital: 100000,
  riskPercent: 2,
  entryPrice: 5001,
  stopLossPrice: 4994.5,
  riskRewardRatio: 1.5,
  side: 'BUY'
};

const result4 = calculateRiskPosition(test4);
console.log('Input:');
console.log('  Capital: ₹1,00,000');
console.log('  Risk %: 2%');
console.log('  Entry: ₹5,001');
console.log('  Stop Loss: ₹4,994.5');
console.log('  SL Points: 6.5');
console.log('  Risk:Reward: 1:1.5');
console.log('\nCalculations:');
console.log('  Risk Amount:', result4.formatted?.riskAmount || result4.error);
console.log('  Quantity:', result4.formatted?.quantity || 'N/A', 'shares');
console.log('  Position Value:', result4.formatted?.positionValue || 'N/A');

const riskAmt4 = 100000 * 0.02; // 2000
const slPts4 = 6.5;
const rawQty4 = riskAmt4 / slPts4; // 307.69...
const expectedQty4 = Math.floor(rawQty4); // 307
console.log('\n✓ Raw Quantity:', rawQty4.toFixed(2));
console.log('✓ Expected Quantity (floored):', expectedQty4, 'shares');
console.log('✓ Actual Quantity:', result4.quantity, 'shares');
console.log('✓ Match:', result4.quantity === expectedQty4 ? 'YES ✅' : 'NO ❌');
console.log('✓ Is Integer:', Number.isInteger(result4.quantity) ? 'YES ✅' : 'NO ❌');

tests.push({
  name: 'Test 4: Fractional quantity flooring',
  passed: result4.success && result4.quantity === expectedQty4 && Number.isInteger(result4.quantity)
});

// Test 5: High risk percentage
console.log('\n' + '='.repeat(70));
console.log('\nTEST 5: High Risk % (5%) with Entry 5001');
console.log('-'.repeat(70));
const test5 = {
  capital: 1000000,
  riskPercent: 5,
  entryPrice: 5001,
  stopLossPrice: 4901,
  riskRewardRatio: 5,
  side: 'BUY'
};

const result5 = calculateRiskPosition(test5);
console.log('Input:');
console.log('  Capital: ₹10,00,000');
console.log('  Risk %: 5%');
console.log('  Entry: ₹5,001');
console.log('  Stop Loss: ₹4,901');
console.log('  Risk:Reward: 1:5');
console.log('\nCalculations:');
console.log('  Risk Amount:', result5.formatted?.riskAmount || result5.error);
console.log('  SL Points:', result5.slPoints || 'N/A');
console.log('  Quantity:', result5.formatted?.quantity || 'N/A', 'shares');
console.log('  Position Value:', result5.formatted?.positionValue || 'N/A');
console.log('  Target Price:', result5.formatted?.targetPrice || 'N/A');
console.log('  Reward Amount:', result5.formatted?.rewardAmount || 'N/A');

const expectedTarget5 = 5001 + (100 * 5); // 5501
console.log('\n✓ Expected Target:', expectedTarget5);
console.log('✓ Actual Target:', result5.targetPrice);
console.log('✓ Match:', result5.targetPrice === expectedTarget5 ? 'YES ✅' : 'NO ❌');

tests.push({
  name: 'Test 5: High risk % and R:R',
  passed: result5.success && result5.targetPrice === expectedTarget5
});

// Test 6: Validation - Invalid setup
console.log('\n' + '='.repeat(70));
console.log('\nTEST 6: Validation - BUY with Entry Below SL');
console.log('-'.repeat(70));
const test6 = {
  capital: 100000,
  riskPercent: 2,
  entryPrice: 5001,
  stopLossPrice: 5050,
  riskRewardRatio: 2,
  side: 'BUY'
};

const result6 = calculateRiskPosition(test6);
console.log('Input:');
console.log('  Side: BUY');
console.log('  Entry: ₹5,001');
console.log('  Stop Loss: ₹5,050');
console.log('\nResult:');
console.log('  Error:', result6.error || 'None');
console.log('✓ Error Detected:', result6.error ? 'YES ✅' : 'NO ❌');

tests.push({
  name: 'Test 6: Validation error',
  passed: !!result6.error
});

// Test 7: Edge case - Very tight stop loss
console.log('\n' + '='.repeat(70));
console.log('\nTEST 7: Very Tight Stop Loss (1 point)');
console.log('-'.repeat(70));
const test7 = {
  capital: 100000,
  riskPercent: 1,
  entryPrice: 5001,
  stopLossPrice: 5000,
  riskRewardRatio: 2,
  side: 'BUY'
};

const result7 = calculateRiskPosition(test7);
console.log('Input:');
console.log('  Capital: ₹1,00,000');
console.log('  Risk %: 1%');
console.log('  Entry: ₹5,001');
console.log('  Stop Loss: ₹5,000');
console.log('  SL Points: 1');
console.log('\nCalculations:');
console.log('  Risk Amount:', result7.formatted?.riskAmount || result7.error);
console.log('  Quantity:', result7.formatted?.quantity || 'N/A', 'shares');
console.log('  Position Value:', result7.formatted?.positionValue || 'N/A');

const expectedQty7 = Math.floor(1000 / 1); // 1000 shares
console.log('\n✓ Expected Quantity:', expectedQty7, 'shares');
console.log('✓ Actual Quantity:', result7.quantity, 'shares');
console.log('✓ Match:', result7.quantity === expectedQty7 ? 'YES ✅' : 'NO ❌');

tests.push({
  name: 'Test 7: Tight stop loss',
  passed: result7.success && result7.quantity === expectedQty7
});

// Test 8: Real-world Nifty scenario
console.log('\n' + '='.repeat(70));
console.log('\nTEST 8: Real-World Nifty Scenario');
console.log('-'.repeat(70));
const test8 = {
  capital: 200000,
  riskPercent: 1.5,
  entryPrice: 23500,
  stopLossPrice: 23400,
  riskRewardRatio: 2,
  side: 'BUY'
};

const result8 = calculateRiskPosition(test8);
console.log('Input:');
console.log('  Capital: ₹2,00,000');
console.log('  Risk %: 1.5%');
console.log('  Entry: ₹23,500 (Nifty)');
console.log('  Stop Loss: ₹23,400');
console.log('  Risk:Reward: 1:2');
console.log('  Side: BUY');
console.log('\nCalculations:');
console.log('  Risk Amount:', result8.formatted?.riskAmount || result8.error);
console.log('  SL Points:', result8.slPoints || 'N/A');
console.log('  Quantity:', result8.formatted?.quantity || 'N/A', 'shares');
console.log('  Position Value:', result8.formatted?.positionValue || 'N/A');
console.log('  Target Price:', result8.formatted?.targetPrice || 'N/A');
console.log('  Reward Amount:', result8.formatted?.rewardAmount || 'N/A');

tests.push({
  name: 'Test 8: Real-world Nifty',
  passed: result8.success
});

// Summary
console.log('\n' + '='.repeat(70));
console.log('\n📊 TEST SUMMARY\n');
console.log('='.repeat(70));

const passedTests = tests.filter(t => t.passed).length;
const totalTests = tests.length;

tests.forEach((test, index) => {
  const status = test.passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${index + 1}. ${test.name.padEnd(40)} ${status}`);
});

console.log('\n' + '='.repeat(70));
console.log(`\nResults: ${passedTests}/${totalTests} tests passed`);
console.log(`Success Rate: ${((passedTests/totalTests) * 100).toFixed(1)}%`);

if (passedTests === totalTests) {
  console.log('\n🎉 ALL TESTS PASSED! Risk Calculator is working perfectly.\n');
} else {
  console.log('\n⚠️  Some tests failed. Please review the implementation.\n');
}

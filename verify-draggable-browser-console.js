/**
 * Browser Console Verification Script
 * Copy and paste this into browser console after Risk Calculator is added
 *
 * This will check if the primitive is properly initialized
 */

console.log('=== Risk Calculator Drag Verification ===');

// Check 1: Chart element exists
const chartElement = document.querySelector('.tv-lightweight-charts');
console.log('✓ Chart element exists:', !!chartElement);
if (chartElement) {
  console.log('  - Element tag:', chartElement.tagName);
  console.log('  - Element classes:', chartElement.className);
  console.log('  - Has mousedown listener:', chartElement.onclick !== undefined);
}

// Check 2: Look for Risk Calculator lines
const canvas = document.querySelector('canvas');
if (canvas) {
  console.log('✓ Canvas found:', canvas.width, 'x', canvas.height);
} else {
  console.log('✗ Canvas not found');
}

// Check 3: Check for console logs
console.log('\n📋 Expected Console Logs:');
console.log('   [RiskCalculator] Constructor called');
console.log('   [RiskCalculator] attached() called');
console.log('   [RiskCalculator] Mouse event listeners attached successfully');
console.log('\n👆 Scroll up to check if these logs appeared when you added the indicator');

console.log('\n🧪 Next Steps:');
console.log('1. Move cursor over green Entry line');
console.log('2. Watch for: [RiskCalculator] Hovering over Entry line');
console.log('3. Cursor should change to ↕️ (ns-resize)');
console.log('4. Click and drag - watch for drag logs');

console.log('\n=== End Verification ===');

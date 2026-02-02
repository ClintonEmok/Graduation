/**
 * Test script for useFilterStore
 * Verifies all actions and computed values work correctly
 */

import { useFilterStore } from '@/store/useFilterStore';

console.log('=== Filter Store Test ===\n');

// Reset to clean state
useFilterStore.getState().resetFilters();

// Test 1: Initial state
console.log('Test 1: Initial State');
const initialState = useFilterStore.getState();
console.log(`  selectedTypes: [${initialState.selectedTypes.join(', ')}] (expected: [])`);
console.log(`  selectedDistricts: [${initialState.selectedDistricts.join(', ')}] (expected: [])`);
console.log(`  selectedTimeRange: ${initialState.selectedTimeRange} (expected: null)`);

const test1Pass = 
  initialState.selectedTypes.length === 0 &&
  initialState.selectedDistricts.length === 0 &&
  initialState.selectedTimeRange === null;
console.log(`  Test 1: ${test1Pass ? '✓ PASS' : '✗ FAIL'}\n`);

// Test 2: Toggle type
console.log('Test 2: Toggle Type');
useFilterStore.getState().toggleType(1);
const afterToggle1 = useFilterStore.getState();
console.log(`  After toggleType(1): [${afterToggle1.selectedTypes.join(', ')}] (expected: [1])`);

useFilterStore.getState().toggleType(5);
const afterToggle2 = useFilterStore.getState();
console.log(`  After toggleType(5): [${afterToggle2.selectedTypes.join(', ')}] (expected: [1, 5])`);

useFilterStore.getState().toggleType(1);
const afterToggle3 = useFilterStore.getState();
console.log(`  After toggleType(1) again: [${afterToggle3.selectedTypes.join(', ')}] (expected: [5])`);

const test2Pass = 
  afterToggle1.selectedTypes.length === 1 &&
  afterToggle2.selectedTypes.length === 2 &&
  afterToggle3.selectedTypes.length === 1 &&
  afterToggle3.selectedTypes[0] === 5;
console.log(`  Test 2: ${test2Pass ? '✓ PASS' : '✗ FAIL'}\n`);

// Test 3: Set types
console.log('Test 3: Set Types');
useFilterStore.getState().setTypes([1, 2, 3]);
const afterSetTypes = useFilterStore.getState();
console.log(`  After setTypes([1, 2, 3]): [${afterSetTypes.selectedTypes.join(', ')}] (expected: [1, 2, 3])`);

const test3Pass = 
  afterSetTypes.selectedTypes.length === 3 &&
  afterSetTypes.selectedTypes[0] === 1 &&
  afterSetTypes.selectedTypes[2] === 3;
console.log(`  Test 3: ${test3Pass ? '✓ PASS' : '✗ FAIL'}\n`);

// Test 4: Toggle district
console.log('Test 4: Toggle District');
useFilterStore.getState().toggleDistrict(1);
useFilterStore.getState().toggleDistrict(10);
const afterDistrictToggle = useFilterStore.getState();
console.log(`  After toggleDistrict(1) and toggleDistrict(10): [${afterDistrictToggle.selectedDistricts.join(', ')}] (expected: [1, 10])`);

const test4Pass = 
  afterDistrictToggle.selectedDistricts.length === 2 &&
  afterDistrictToggle.selectedDistricts.includes(1) &&
  afterDistrictToggle.selectedDistricts.includes(10);
console.log(`  Test 4: ${test4Pass ? '✓ PASS' : '✗ FAIL'}\n`);

// Test 5: Set time range
console.log('Test 5: Set Time Range');
useFilterStore.getState().setTimeRange([0, 999999999]);
const afterTimeSet = useFilterStore.getState();
console.log(`  After setTimeRange([0, 999999999]): [${afterTimeSet.selectedTimeRange?.join(', ')}] (expected: [0, 999999999])`);

const test5Pass = 
  afterTimeSet.selectedTimeRange !== null &&
  afterTimeSet.selectedTimeRange[0] === 0 &&
  afterTimeSet.selectedTimeRange[1] === 999999999;
console.log(`  Test 5: ${test5Pass ? '✓ PASS' : '✗ FAIL'}\n`);

// Test 6: isTypeSelected
console.log('Test 6: isTypeSelected');
useFilterStore.getState().setTypes([1, 5, 10]);
const isType1Selected = useFilterStore.getState().isTypeSelected(1);
const isType3Selected = useFilterStore.getState().isTypeSelected(3);
const isType5Selected = useFilterStore.getState().isTypeSelected(5);
console.log(`  Types [1, 5, 10] selected:`);
console.log(`    isTypeSelected(1): ${isType1Selected} (expected: true)`);
console.log(`    isTypeSelected(3): ${isType3Selected} (expected: false)`);
console.log(`    isTypeSelected(5): ${isType5Selected} (expected: true)`);

const test6Pass = isType1Selected === true && isType3Selected === false && isType5Selected === true;
console.log(`  Test 6: ${test6Pass ? '✓ PASS' : '✗ FAIL'}\n`);

// Test 7: isDistrictSelected with empty array (all selected)
console.log('Test 7: Empty Selection = All Selected');
useFilterStore.getState().resetFilters();
const isDistrict1Selected = useFilterStore.getState().isDistrictSelected(1);
const isType1SelectedAfterReset = useFilterStore.getState().isTypeSelected(1);
console.log(`  After reset, empty districts:`);
console.log(`    isDistrictSelected(1): ${isDistrict1Selected} (expected: true - all selected when empty)`);
console.log(`    isTypeSelected(1): ${isType1SelectedAfterReset} (expected: true - all selected when empty)`);

const test7Pass = isDistrict1Selected === true && isType1SelectedAfterReset === true;
console.log(`  Test 7: ${test7Pass ? '✓ PASS' : '✗ FAIL'}\n`);

// Test 8: isTimeFiltered
console.log('Test 8: isTimeFiltered');
useFilterStore.getState().clearTimeRange();
const notFiltered = useFilterStore.getState().isTimeFiltered();
console.log(`  After clearTimeRange(): ${notFiltered} (expected: false)`);

useFilterStore.getState().setTimeRange([1000, 2000]);
const isFiltered = useFilterStore.getState().isTimeFiltered();
console.log(`  After setTimeRange([1000, 2000]): ${isFiltered} (expected: true)`);

const test8Pass = notFiltered === false && isFiltered === true;
console.log(`  Test 8: ${test8Pass ? '✓ PASS' : '✗ FAIL'}\n`);

// Test 9: getActiveFilterCount
console.log('Test 9: getActiveFilterCount');
useFilterStore.getState().resetFilters();
const count0 = useFilterStore.getState().getActiveFilterCount();
console.log(`  After reset: ${count0} (expected: 0)`);

useFilterStore.getState().setTypes([1]);
const count1 = useFilterStore.getState().getActiveFilterCount();
console.log(`  After setTypes([1]): ${count1} (expected: 1)`);

useFilterStore.getState().setDistricts([5]);
const count2 = useFilterStore.getState().getActiveFilterCount();
console.log(`  After setDistricts([5]): ${count2} (expected: 2)`);

useFilterStore.getState().setTimeRange([0, 100]);
const count3 = useFilterStore.getState().getActiveFilterCount();
console.log(`  After setTimeRange([0, 100]): ${count3} (expected: 3)`);

const test9Pass = count0 === 0 && count1 === 1 && count2 === 2 && count3 === 3;
console.log(`  Test 9: ${test9Pass ? '✓ PASS' : '✗ FAIL'}\n`);

// Test 10: Reset filters
console.log('Test 10: Reset Filters');
useFilterStore.getState().setTypes([1, 2, 3]);
useFilterStore.getState().setDistricts([1, 2]);
useFilterStore.getState().setTimeRange([0, 1000]);
useFilterStore.getState().resetFilters();
const afterReset = useFilterStore.getState();
console.log(`  After reset:`);
console.log(`    selectedTypes: [${afterReset.selectedTypes.join(', ')}] (expected: [])`);
console.log(`    selectedDistricts: [${afterReset.selectedDistricts.join(', ')}] (expected: [])`);
console.log(`    selectedTimeRange: ${afterReset.selectedTimeRange} (expected: null)`);

const test10Pass = 
  afterReset.selectedTypes.length === 0 &&
  afterReset.selectedDistricts.length === 0 &&
  afterReset.selectedTimeRange === null;
console.log(`  Test 10: ${test10Pass ? '✓ PASS' : '✗ FAIL'}\n`);

// Summary
const allPass = test1Pass && test2Pass && test3Pass && test4Pass && test5Pass && 
                test6Pass && test7Pass && test8Pass && test9Pass && test10Pass;
console.log('=== Test Summary ===');
console.log(`Total: 10 tests`);
console.log(`Passed: ${[test1Pass, test2Pass, test3Pass, test4Pass, test5Pass, test6Pass, test7Pass, test8Pass, test9Pass, test10Pass].filter(Boolean).length}`);
console.log(`Failed: ${[test1Pass, test2Pass, test3Pass, test4Pass, test5Pass, test6Pass, test7Pass, test8Pass, test9Pass, test10Pass].filter(x => !x).length}`);
console.log(`\nOverall: ${allPass ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED'}`);

process.exit(allPass ? 0 : 1);

import { getCrimeTypeId, getDistrictId, CRIME_TYPE_MAP } from '../src/lib/category-maps';

console.log("Testing Category Maps...");

const testCases = [
    { type: 'THEFT', expected: 1 },
    { type: 'Theft', expected: 1 },
    { type: 'BATTERY', expected: 2 },
    { type: 'Unknown', expected: 0 },
];

let failed = 0;

testCases.forEach(tc => {
    const id = getCrimeTypeId(tc.type);
    if (id !== tc.expected) {
        console.error(`FAIL: Type '${tc.type}' -> ${id}, expected ${tc.expected}`);
        failed++;
    } else {
        console.log(`PASS: Type '${tc.type}' -> ${id}`);
    }
});

const districtCases = [
    { dist: '1', expected: 1 },
    { dist: '001', expected: 1 },
    { dist: '025', expected: 25 },
    { dist: 'District 15', expected: 15 },
    { dist: 'Invalid', expected: 0 },
];

districtCases.forEach(tc => {
    const id = getDistrictId(tc.dist);
    if (id !== tc.expected) {
        console.error(`FAIL: District '${tc.dist}' -> ${id}, expected ${tc.expected}`);
        failed++;
    } else {
        console.log(`PASS: District '${tc.dist}' -> ${id}`);
    }
});

if (failed > 0) {
    console.error(`${failed} tests failed.`);
    process.exit(1);
} else {
    console.log("All tests passed.");
}

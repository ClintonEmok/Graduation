# Bin Generation Concerns

**Analysis Date:** 2026-03-30

## Tech Debt

### Long-Range Bin Cap Skew (SEED-002)

**Issue:** When generating bins for long time ranges (e.g., Jan 2001 to Dec 2024), the global merge strategy under maxBins constraint produces severely skewed bins. A single first bin can contain ~31k events while subsequent bins have under 40 events.

**Files:**
- `src/lib/binning/engine.ts` - `postProcessBins` function (lines 438-458)
- `src/lib/binning/rules.ts` - `mergeSmallBins` function (lines 275-307)

**Impact:** Generated bins become useless for burst analysis. Temporal shape is lost, and investigative interpretation is distorted.

**Fix approach:** Replace global merge with adjacent time-aware merging, implement adaptive caps per bin based on local density, and add cap-hit quality warnings in the UI. This is documented in SEED-002.

---

### Duplicate Code Between Worker and Diagnostics

**Issue:** The `adaptive-bin-diagnostics.ts` file duplicates boundary calculation logic that exists in `adaptiveTime.worker.ts`. Both files have `ensureStrictlyMonotonicBoundaries`, `findBoundaryBin`, and `toFiniteDomain` functions with identical implementations.

**Files:**
- `src/app/timeslicing-algos/lib/adaptive-bin-diagnostics.ts` (lines 66-111)
- `src/workers/adaptiveTime.worker.ts` (lines 30-60)

**Impact:** Maintenance burden - bug fixes must be applied in two places. Risk of drift between implementations.

**Fix approach:** Extract shared boundary calculation logic into a common utility module that both can import.

---

### Hard Cap Truncation Without Warning

**Issue:** The `postProcessBins` function in `engine.ts` uses a simple slice to enforce maxBins: `result = result.slice(0, constraints.maxBins)`. This silently discards bins without any user notification.

**Files:**
- `src/lib/binning/engine.ts` - line 455

**Impact:** Users have no visibility into data loss from bin capping. Quality of analysis may be compromised without awareness.

**Fix approach:** Return metadata indicating truncation occurred, and surface warnings through the UI.

---

### Missing Input Validation in Engine

**Issue:** The `generateBins` function does not validate input data for edge cases. Empty arrays, undefined values, and invalid domains are handled inconsistently across different strategy implementations.

**Files:**
- `src/lib/binning/engine.ts` - `generateBins` function (lines 26-100)

**Impact:** Potential runtime errors or silent failures when unexpected data is passed.

**Fix approach:** Add comprehensive input validation at the start of `generateBins` with early returns for invalid states.

---

## Known Bugs

### Duplicate Timestamp Handling in Uniform-Events Binning

**Issue:** When multiple events share the same timestamp (e.g., `[10, 10, 10, 10, 20, 30, 40, 50]`), the uniform-events boundary calculation can produce zero-width or negative-width bins.

**Files:**
- `src/workers/adaptiveTime.worker.ts` - lines 99-117
- `src/app/timeslicing-algos/lib/adaptive-bin-diagnostics.ts` - lines 133-157

**Trigger:** Dataset with clustered timestamps at exact same epoch second.

**Workaround:** The code does have `ensureStrictlyMonotonicBoundaries` to mitigate this, but edge cases may still occur. Test coverage exists in `adaptive-bin-diagnostics.test.ts` (lines 74-96).

---

### Bin Split Count Distribution Not Time-Aware

**Issue:** The `splitBin` function in `useBinningStore.ts` distributes counts evenly (`Math.floor(bin.count / 2)`) rather than based on the actual time distribution of events within the bin.

**Files:**
- `src/store/useBinningStore.ts` - lines 155-194

**Impact:** Split bins may show unrealistic count distributions that don't reflect actual event timing.

---

### Burstiness Map Calculation Edge Case

**Issue:** In `adaptiveTime.worker.ts`, the burstiness calculation uses a simplified coefficient of variation formula that can produce negative values before normalization, which are then clamped to 0.

**Files:**
- `src/workers/adaptiveTime.worker.ts` - lines 216-230

**Impact:** Bins with high variance in inter-arrival times may show unexpected burstiness values.

---

## Security Considerations

### No Security Concerns Identified

The bin generation code operates entirely on in-memory data structures with no external API calls, file system access, or user input that could lead to injection attacks. All numeric computations are performed locally.

---

## Performance Bottlenecks

### Sorting on Large Datasets

**Issue:** Multiple functions sort the entire timestamp array independently:
- `adaptiveTime.worker.ts` - line 95: `validTimestamps.sort((a, b) => a - b)`
- `adaptive-bin-diagnostics.ts` - line 143: `sorted = filterToDomain(...).sort((a, b) => a - b)`
- `engine.ts` - line 267: `sorted = [...data].sort((a, b) => b.timestamp - a.timestamp)`

**Impact:** For large datasets (hundreds of thousands of events), repeated sorting adds significant overhead.

**Improvement path:** Sort once at the entry point and pass sorted data through the pipeline.

---

### Quadratic Complexity in Merge Operations

**Issue:** The `mergeSmallBins` function in `rules.ts` iterates through sorted bins and can push to result array, but the overall complexity is O(n log n) due to the initial sort by event count.

**Files:**
- `src/lib/binning/rules.ts` - lines 275-307

**Impact:** Performance degrades when maxBins constraint is significantly lower than natural bin count.

---

### Kernel Smoothing in Worker

**Issue:** The kernel smoothing in `adaptiveTime.worker.ts` (lines 140-157) uses nested loops with O(kernelWidth * binCount) complexity per call.

**Impact:** Large kernelWidth values (not currently exposed as user config) could significantly slow computation.

---

## Fragile Areas

### Magic Numbers and Hardcoded Thresholds

**Issue:** Multiple magic numbers are hardcoded throughout the binning code without constants or configuration:

- `maxBins: 40` - default in `useBinningStore.ts` line 50
- `kernelWidth: 1` - default in `adaptiveTime.worker.ts` line 67
- `weight = 1 + density * 5` - in both worker and diagnostics
- Threshold constants (0.6, 0.55, 2.0, etc.) in `adaptive-bin-diagnostics.ts`

**Files:**
- `src/store/useBinningStore.ts`
- `src/workers/adaptiveTime.worker.ts`
- `src/app/timeslicing-algos/lib/adaptive-bin-diagnostics.ts`

**Why fragile:** Changing these values requires code changes and understanding of downstream effects. No clear documentation of why specific values were chosen.

**Safe modification:** Extract to constants at module level with JSDoc explaining rationale.

---

### Empty Data Handling Inconsistencies

**Issue:** Different parts of the codebase handle empty data differently:
- `binTimeData` in `src/utils/binning.ts` returns empty array
- `computeAdaptiveMaps` in worker returns zero-filled arrays with valid boundaries
- `generateBins` in engine returns empty bins array

**Impact:** Components consuming these outputs may behave unexpectedly depending on which function they call.

---

### Float32Array/Float64Array Type Mixing

**Issue:** The codebase mixes Float32Array and Float64Array in boundary calculations:
- Worker uses `Float32Array` for boundaries
- Diagnostics uses `Float64Array` for boundaries
- Both use similar logic but with different types

**Files:**
- `src/workers/adaptiveTime.worker.ts`
- `src/app/timeslicing-algos/lib/adaptive-bin-diagnostics.ts`

**Why fragile:** Precision differences could cause subtle boundary discrepancies between worker output and diagnostic reconstruction.

---

## Scaling Limits

### Browser Memory with Large Datasets

**Current capacity:** The bin generation is designed for datasets up to approximately 100k-500k events in the browser context.

**Limit:** Web Worker memory limits and main thread serialization overhead become problematic above ~1M events.

**Scaling path:** Consider streaming approaches or server-side computation for very large datasets. The current architecture supports workers but data transfer serialization could be optimized.

---

### Max Bins Hard Limit

**Current capacity:** Default maxBins of 40 provides reasonable visualization but limits analytical granularity.

**Limit:** For long time ranges with high event density, 40 bins cannot capture meaningful variation.

**Scaling path:** Implement dynamic bin count based on data characteristics and time range span, or allow user-configurable bin counts up to 200+.

---

## Dependencies at Risk

### D3-Array Dependency

**Package:** `d3-array`

**Risk:** Used only in `src/utils/binning.ts` for the `bin()` generator function.

**Impact:** Could be replaced with native implementation (which exists in other parts of the codebase), eliminating a dependency.

**Migration plan:** The `binTimeData` function in `src/utils/binning.ts` is a thin wrapper around d3-array. Can be replaced with the same logic used in `adaptiveTime.worker.ts`.

---

## Test Coverage Gaps

### Missing Edge Case Tests

**What's not tested:**
- Empty domain edge case (domain[0] === domain[1])
- Single event in dataset
- All events at same timestamp
- Events outside domain boundaries
- Very large binCount values (>1000)

**Files lacking coverage:**
- `src/lib/binning/engine.ts` - No dedicated test file
- `src/utils/binning.ts` - No test file

**Risk:** Edge cases may cause runtime errors or silent failures in production.

**Priority:** Medium - these are known edge cases that could affect user experience.

---

### No Integration Tests for Bin-to-Visual Pipeline

**What's not tested:** The complete pipeline from bin generation through visualization rendering.

**Risk:** Changes in bin generation may break visualization components without detection.

**Priority:** High - QA issues like the long-range skew problem would be caught earlier.

---

*Concerns audit: 2026-03-30*

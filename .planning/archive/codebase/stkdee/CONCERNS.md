# STKDEE Concerns

**Analysis Date:** 2026-03-30

## Technical Debt

### Duplicate Grid Building Logic
- **Issue:** `buildStkdeGridConfig` is called in both `computeStkdeFromCrimes` and `computeStkdeFromAggregates`, but the full-population pipeline rebuilds it separately
- **Files:** `src/lib/stkde/compute.ts`, `src/lib/stkde/full-population-pipeline.ts`
- **Impact:** Inconsistency risk - grid config could diverge between pipelines
- **Fix approach:** Extract grid building to single source of truth, pass config to both compute paths

### Duplicate Peak Window Computation
- **Issue:** Two nearly identical functions: `computePeakWindow` (line 80) and `computePeakWindowFromBuckets` (line 185) in `compute.ts`
- **Files:** `src/lib/stkde/compute.ts`
- **Impact:** Maintenance burden, potential for behavior drift
- **Fix approach:** Consolidate into single function with conditional handling for input type

### Hardcoded Temporal Bucket Minimum
- **Issue:** Bucket size is `Math.max(3600, request.params.temporalBandwidthHours * 3600)` - minimum 1 hour regardless of bandwidth setting
- **Files:** `src/lib/stkde/full-population-pipeline.ts` (line 107)
- **Impact:** Low temporal bandwidths (< 1 hour) don't actually provide finer temporal resolution
- **Fix approach:** Remove minimum or make configurable

### Stale State Race Condition
- **Issue:** `markStale` can be called during an active run, but UI logic in `useDashboardStkde.ts` checks `runStatus` separately from stale updates
- **Files:** `src/store/useStkdeStore.ts` (line 133), `src/app/dashboard-v2/hooks/useDashboardStkde.ts` (lines 195-198)
- **Impact:** Could mark stale while computation is running, leading to confusing UI state
- **Fix approach:** Add check in `markStale` to guard against running state, or update stale logic to atomically handle concurrent state

## Performance Concerns

### Response Size Guard is Reactive
- **Issue:** `applyResponsePayloadGuard` builds full response first, then truncates if oversized - wasteful for large datasets
- **Files:** `src/lib/stkde/compute.ts` (lines 154-183)
- **Impact:** Memory waste when generating oversized responses that get truncated
- **Fix approach:** Implement cell limit during cell generation loop or use streaming response

### Client-Side Response Size Guard Differs from Server
- **Issue:** Client truncates to 8000 cells (line 60 in `useDashboardStkde.ts`), server uses 85% iterative reduction
- **Files:** `src/lib/stkde/compute.ts`, `src/app/dashboard-v2/hooks/useDashboardStkde.ts`
- **Impact:** Inconsistent behavior between client and server truncation, different cell counts returned
- **Fix approach:** Share truncation logic between client and server or document the difference

### Worker Timeout Falls Back to Main Thread
- **Issue:** When worker times out, `projectHotspotsWithWorker` falls back to synchronous `projectHotspots` on main thread
- **Files:** `src/app/dashboard-v2/hooks/useDashboardStkde.ts` (lines 71-82)
- **Impact:** Defeats purpose of worker for expensive filtering, blocks UI
- **Fix approach:** Increase timeout or use Web Workers more aggressively

### Memory: Cell Timestamps Array
- **Issue:** `cellTimestamps` in `computeStkdeFromCrimes` stores all timestamps per cell - `Array.from({ length: cellCount }, () => [] as number[])`
- **Files:** `src/lib/stkde/compute.ts` (line 269)
- **Impact:** High memory usage for large grids with many events
- **Fix approach:** Use more memory-efficient temporal aggregation or streaming approach

### Large Hotspot Candidate Array
- **Issue:** All hotspot candidates are generated before sorting and slicing to topK
- **Files:** `src/lib/stkde/compute.ts` (lines 304-334)
- **Impact:** Unnecessary memory allocation for filtered-out candidates
- **Fix approach:** Use heap-based top-K selection or filter during generation

## Known Bugs

### Worker Termination Race
- **Issue:** In `useDashboardStkde.ts`, worker is terminated both in cleanup function AND after handleMessage resolves - double termination
- **Files:** `src/app/dashboard-v2/hooks/useDashboardStkde.ts` (lines 100-102)
- **Impact:** Potential error, but likely benign since termination is idempotent
- **Fix approach:** Remove duplicate termination call

### Null Coalescing in Peak Window Loop
- **Issue:** Lines 95-96 in `compute.ts` use `??` operator: `const endValue = sorted[endIdx] ?? sorted[0]` - but if `endIdx` exists, `sorted[endIdx]` should always be defined
- **Files:** `src/lib/stkde/compute.ts` (lines 94-102)
- **Impact:** Defensive but confusing - indicates uncertainty about array handling
- **Fix approach:** Remove unnecessary null coalescing or assert array integrity

### BBox Clamping Order
- **Issue:** BBox clamping in contracts.ts clamps min/max independently which could result in invalid bbox if min > max after clamping
- **Files:** `src/lib/stkde/contracts.ts` (lines 171-179)
- **Impact:** Edge case where clamping could produce invalid result (though re-check prevents this)
- **Fix approach:** Simplify logic, single clamp operation per coordinate

## Security Considerations

### No Input Sanitization on Crime Types
- **Issue:** Crime types are passed directly to SQL with minimal validation - only trimmed and filtered for empty strings
- **Files:** `src/lib/stkde/full-population-pipeline.ts` (lines 67-71)
- **Impact:** Potential SQL injection if types contain special characters (mitigated by parameterization)
- **Fix approach:** Add whitelist validation for known crime types or escape special characters

### Full Population Mode Has No Rate Limiting
- **Issue:** Full population compute mode has guardrails but no per-user or per-IP rate limiting
- **Files:** `src/app/api/stkde/hotspots/route.ts`
- **Impact:** Could be abused to run expensive full-population queries repeatedly
- **Fix approach:** Add rate limiting middleware for full-population mode

### Environment Variable Feature Flag
- **Issue:** Full population QA is controlled by `STKDE_QA_FULL_POP_ENABLED` env var - no runtime toggle
- **Files:** `src/app/api/stkde/hotspots/route.ts` (lines 10-13)
- **Impact:** Requires redeployment to toggle feature, delays in testing
- **Fix approach:** Consider runtime feature flag or at minimum document the env var requirement

## Fragile Areas

### Hardcoded Chicago Bounds
- **Issue:** STKDEE is hardcoded to Chicago coordinates from `CHICAGO_BOUNDS`
- **Files:** `src/lib/stkde/compute.ts` (line 43), `src/lib/stkde/contracts.ts`
- **Impact:** Not portable to other cities without code changes
- **Fix approach:** Extract bounds to configuration or detect from data

### Magic Numbers Throughout
- **Issue:** Multiple magic numbers: 3600, 85% (line 164), 8000 cells client limit, 8-second worker timeout
- **Files:** Multiple files
- **Impact:** Hard to tune performance without code changes, unclear rationale
- **Fix approach:** Extract to constants with descriptive names

### Int64 to Number Conversion
- **Issue:** DuckDB returns BIGINT values that are converted via `toNumber` helper - potential precision loss for very large counts
- **Files:** `src/lib/stkde/full-population-pipeline.ts` (line 56)
- **Impact:** For extremely high crime counts, precision could be lost
- **Fix approach:** Use BigInt throughout or document precision limits

## Test Coverage Gaps

### Missing Full-Population Pipeline Tests
- **Issue:** No unit tests for `buildFullPopulationStkdeInputs`
- **Files:** `src/lib/stkde/full-population-pipeline.ts`
- **Risk:** Critical path for full-population mode has no test coverage
- **Priority:** High

### Missing Compute Integration Tests
- **Issue:** No tests that verify end-to-end compute with real crime data patterns
- **Files:** `src/lib/stkde/compute.ts`
- **Risk:** Edge cases in grid/temporal computation untested
- **Priority:** Medium

### No Worker Error Scenarios Tested
- **Issue:** Worker tests don't cover timeout, message errors, or fallback scenarios
- **Files:** `src/workers/stkdeHotspot.worker.test.ts`
- **Risk:** User-facing errors in production not validated
- **Priority:** Medium

## API/Contract Concerns

### Score Version Not Enforced
- **Issue:** `scoreVersion: 'stkde-v1'` is hardcoded but not validated on input
- **Files:** `src/lib/stkde/compute.ts`, `src/lib/stkde/contracts.ts`
- **Impact:** No forward compatibility for version changes
- **Fix approach:** Add version validation or document backward compatibility promise

### Compute Mode String Typo Risk
- **Issue:** Uses string literals `'sampled'` and `'full-population'` - easy to misspell
- **Files:** Multiple files including store, API, compute
- **Impact:** Runtime errors if typos occur
- **Fix approach:** Use TypeScript string literal types exclusively (already done in contracts.ts but not enforced in all consumers)

---

*Concerns audit: 2026-03-30*

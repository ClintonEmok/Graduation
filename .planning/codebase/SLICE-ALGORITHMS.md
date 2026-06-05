# Slice Algorithm Analysis

**Analysis Date:** 2026-06-01

## Overview

Complete catalog of all distinct algorithms found across slice generation, creation, allocation, and utility modules. 21 files analyzed, ~2,400 lines of algorithmic code.

---

## A. SLICE UTILITY ALGORITHMS

### A1. `normalizeRange` — Range ordering
- **File:** `src/lib/slice-utils.ts:5-6`
- **What it does:** Returns range as `[min, max]` regardless of input order.
- **Approach:** Single comparison — if `start > end`, swap.
- **Time:** O(1)
- **Space:** O(1)
- **Data structures:** None (primitive numbers)
- **Bottlenecks:** None — trivially optimal.
- **Improvement:** None needed.

### A2. `withinTolerance` — Tolerance check
- **File:** `src/lib/slice-utils.ts:8-10`
- **What it does:** Checks if `|value - target| <= |tolerance|`.
- **Approach:** Absolute difference comparison.
- **Time:** O(1)
- **Space:** O(1)
- **Data structures:** None
- **Bottlenecks:** None.
- **Improvement:** None needed.

### A3. `calculateRangeTolerance` — Tolerance from range span
- **File:** `src/lib/slice-utils.ts:12-18`
- **What it does:** Computes tolerance as `|end - start| * percent`.
- **Approach:** Simple arithmetic.
- **Time:** O(1)
- **Space:** O(1)
- **Bottlenecks:** None.
- **Improvement:** None needed.

### A4. `rangesMatch` — Range equality with tolerance
- **File:** `src/lib/slice-utils.ts:20-36`
- **What it does:** Checks if two ranges are equal within an automatically computed tolerance. Tolerance is the average of each range's individual `calculateRangeTolerance`.
- **Approach:** Normalize both ranges, compute mean tolerance, check each endpoint.
- **Time:** O(1)
- **Space:** O(1)
- **Bottlenecks:** None.
- **Improvement:** The tolerance averaging (`a+b/2`) is unusual — if one range is tiny and the other is huge, the tolerance may be too loose for the small range. Consider `Math.max(tol1, tol2)` for conservative matching.

### A5. `focusTimelineRange` — Multi-store timeline sync
- **File:** `src/lib/slice-utils.ts:51-107`
- **What it does:** Accepts start/end timestamps and calls multiple store setters (`setTimeRange`, `setRange`, `setBrushRange`, `setTime`). Detects whether inputs are normalized (0–100) or raw epoch seconds and converts accordingly.
- **Approach:** Heuristic normalization detection (`looksNormalized = rangeStart >= 0 && rangeEnd <= 100`), conditional conversion chain with `minTimestampSec`/`maxTimestampSec` fallback.
- **Time:** O(1)
- **Space:** O(1)
- **Data structures:** None
- **Bottlenecks:** The epoch-unit detection flag (`looksNormalized`) is fragile — real epoch seconds that fall in 0–100 range (Jan 1 1970 ± 100s) would be misclassified as normalized, leading to silent double-conversion bugs.
- **Improvement:** Add explicit `isNormalized` parameter or check magnitude against `minTimestampSec`. See `time-domain.ts:detectEpochUnit` for precedent — it uses a `1e11` threshold to distinguish milliseconds from seconds.

### A6. `clusterSlices` — Linear gap-based clustering
- **File:** `src/lib/slice-geometry.ts:64-108`
- **What it does:** Groups adjacent timeline slices into clusters where the gap between consecutive slices is below a `gapThreshold`.
- **Approach:** Single-pass linear scan. Accumulates slices in `currentCluster[]`, pushes cluster when gap exceeds threshold. Recalculates `totalWidth` on each push.
- **Time:** O(n) where n = number of slices
- **Space:** O(n) for cluster storage
- **Data structures:** Array of `SliceCluster[]` containing `TimeSlice[]` sub-arrays
- **Bottlenecks:** **Redundant width recalculation:** `totalWidth` is recomputed by `reduce` over the full `currentCluster` every time a slice is added (lines 86-91 and 99-104). This makes clustering O(n²) worst-case for dense clusters. The `maxDensity` field is also set once at creation and never updated.
- **Improvement:** Accumulate `totalWidth` incrementally (`currentWidth += sliceWidth`) instead of recalculating from scratch. Track `maxDensity` incrementally. This drops from O(n²) to O(n).

### A7. `computeSliceGeometry` — Single slice pixel geometry
- **File:** `src/lib/slice-geometry.ts:34-53`
- **What it does:** Converts normalized slice range [0–100] to pixel x/width using an `xScale`, then applies density-based opacity.
- **Approach:** Scale divide-by-100, compute width from diff, clamp to minimum 1px.
- **Time:** O(1)
- **Space:** O(1)
- **Bottlenecks:** The `x = xScale(startPercent / 100)` division is correct but is repeated at every render for each slice. If `xScale` is a d3 linear scale, this is fast. The `Math.max(1, width)` clamp means zero-width point slices always render at 1px instead of being invisible.
- **Improvement:** Pre-compute the `1/100` factor if this function is called in a hot loop. Consider separate handling for point vs range slices.

### A8. `resolveSliceBoundsPercent` — Slice bounds extraction
- **File:** `src/lib/slice-geometry.ts:23-29`
- **What it does:** Extracts `[start%, end%]` from a `TimeSlice`, falling back to `[time, time]` for point-type slices.
- **Approach:** Pattern match on `slice.type`.
- **Time:** O(1)
- **Bottlenecks:** None.
- **Improvement:** None needed.

---

## B. SLICE ALLOCATION ALGORITHMS

### B1. `allocateNonUniformSlices` — Proportional slice allocation (Largest Remainder)
- **File:** `src/lib/slice-allocator.ts:10-89`
- **What it does:** Distributes `targetCount` slices across burst bins proportional to each bin's `combinedB` score. Subdivides bins into equal-sized sub-slices based on allocation count. Sorts by `startEpoch`.
- **Approach:**
  1. Compute `totalB` (O(b))
  2. If `totalB <= 0`, allocate 1 slice per bin (O(b))
  3. Proportional allocation: `raw = (bin.combinedB / totalB) * targetCount`, round to `allocated = max(1, Math.round(raw))` (O(b))
  4. **Largest-remainder correction** while `remaining != 0`: iterates all bins to find the one with smallest `allocated - raw` gap (for excess) or largest gap (for deficit). Adjusts 1 at a time. (O(remaining · b))
  5. Subdivide each bin into `allocated` equal-width sub-slices (O(totalAllocations))
  6. Final sort (O(n log n))
- **Time:** O(n log n + k · b) where k = |remaining|, b = number of bins, n = total allocated slices. For typical cases k ≤ b, so O(n log n + b²)
- **Space:** O(n + b)
- **Data structures:** `AllocatedSlice[]`, intermediate `rawAllocations[]` array
- **Bottlenecks:**
  1. **O(k·b) remainder loop:** Each iteration scans all bins via `reduce` to find the best candidate. At worst k = b (all bins adjusted), making this O(b²). Lines 48-70.
  2. **`bins.indexOf(bin)` called per sub-slice:** Inside the subdivision loop (line 80), `bins.indexOf(bin)` is called for every sub-slice, making this O(n·b) when it should be O(1). This is O(n) index lookups doing O(b) work each.
  3. **Duplicate logic:** This function duplicates logic from `burst-detection.ts:allocateSlices` (lines 305-338). Both implement the same largest-remainder proportional allocation but with different output shapes and slight differences in the correction strategy.
- **Improvement:**
  1. **Replace remainder correction with Hare quota + largest remainder (single-pass).** Instead of iterating bins one-by-one, compute floor allocations, sum remaining slots, sort bins by fractional remainder descending, allocate 1 extra to the top `remaining` bins. This drops O(k·b) to O(b log b). Standard apportionment method (Hare quota).
  2. **Cache bin indices:** Pre-compute a `Map<BurstBinResult, number>` before the subdivision loop to eliminate `indexOf`.
  3. **Consolidate with `burst-detection.ts:allocateSlices`** into a shared utility to eliminate duplication.

### B2. `allocateSlices` (burst-detection) — Proportional allocation v2
- **File:** `src/lib/burst-detection.ts:305-338`
- **What it does:** Same proportional allocation as B1 but uses different comparison logic in the remainder correction.
- **Approach:** Same structure as B1 but the remainder loop compares `raw - slicesAllocated` (largest deficit gets extra) instead of `allocated - raw` (lines 325-327). Also uses configurable burst metric instead of hardcoded `combinedB`.
- **Time:** O(k·b + b) same as B1
- **Space:** O(b)
- **Data structures:** Inline allocation array (mutated in place)
- **Bottlenecks:** Same O(k·b) remainder loop as B1. Also sorts by different criteria (`raw - slicesAllocated` descending vs B1's `allocated - raw` ascending) — these should produce equivalent results but the difference indicates duplicated logic drifted apart.
- **Improvement:** DRY with B1 into shared library. Use Hare quota method. Both currently guarantee `max(1, ...)` which means bins with zero burst score still get at least 1 slice — this is a policy decision that should be explicit.

### B3. `compactBurstPartitions` — Partition grouping
- **File:** `src/lib/burst-detection.ts:246-269`
- **What it does:** Reduces an array of burst partition ranges to at most `maxPartitions` by grouping adjacent partitions.
- **Approach:** Ceiling-based grouping: `groupSize = ceil(length / maxPartitions)`. Groups are consecutive slices merged into single start-end ranges.
- **Time:** O(b)
- **Space:** O(maxPartitions)
- **Bottlenecks:** `partitions.slice(i, i + groupSize)` creates temporary arrays for each group. For 1000+ partitions this creates avoidable GC pressure.
- **Improvement:** Track first/last in each group without `slice()`: `const last = partitions[Math.min(i + groupSize - 1, partitions.length - 1)]`.

---

## C. SLICE CREATION & STATE ALGORITHMS

### C1. `sortSlices` — Stable multi-key slice sort
- **File:** `src/store/slice-domain/createSliceCoreSlice.ts:50-68`
- **What it does:** Sorts slices by start time (primary), with burst slices sorted after non-burst (secondary), preserving insertion order for ties (tertiary).
- **Approach:** `.map((slice, index) => ({ slice, index }))` → sort by `startDelta` then `isBurst` flag then original index → `.map()` back.
- **Time:** O(n log n)
- **Space:** O(n) for the intermediate tuples
- **Data structures:** Mapped tuples `{ slice, index }[]`
- **Bottlenecks:** The index-preservation pattern (Schwartzian transform) is correct but creates 2× memory overhead. For typical slice counts (<100) this is negligible.
- **Improvement:** For n < 100, this is fine. If slice counts grow, consider an in-place sort with a custom comparator that uses insertion order stored on the slice itself.

### C2. `getOverlapCounts` — Pairwise overlap detection
- **File:** `src/store/slice-domain/createSliceCoreSlice.ts:117-148`
- **What it does:** For each visible range-slice, counts how many other visible range-slices it overlaps with.
- **Approach:** Brute-force O(n²) pairwise check: for each pair `(i, j)` with `i < j`, check `left.start < right.end && right.start < left.end`. Increment both counts.
- **Time:** O(n²) where n = number of visible range slices
- **Space:** O(n) for result map
- **Bottlenecks:** The O(n²) pairwise loop is optimal for overlap counting in 1D (no sorting-based improvement for count-per-slice). However, it's called reactively on every store read via the store getter.
- **Improvement:** If called frequently, memoize the result or compute only when `slices` reference changes. Use `useShallow` or custom equality checks in React consumers.

### C3. `findMatchingSlice` — Linear scan with tolerance matching
- **File:** `src/store/slice-domain/createSliceCoreSlice.ts:176-191`
- **What it does:** Finds a slice whose range matches `[start, end]` within a computed tolerance. Optionally filters to burst-only slices.
- **Approach:** Converts input to normalized range, computes tolerance from range span, then `Array.find()` with `rangesMatch` predicate.
- **Time:** O(n) where n = number of slices
- **Space:** O(1)
- **Bottlenecks:** Linear scan over all slices. For large slice counts (1000+) this could lag during burst creation.
- **Improvement:** If slice counts grow beyond 100, maintain a spatial index (interval tree) for O(log n) matching. For current usage (<100 slices), linear scan is fine.

### C4. `addBurstSlice` — Burst slice creation with dedup
- **File:** `src/store/slice-domain/createSliceCoreSlice.ts:192-225`
- **What it does:** Creates a new burst slice if no matching one exists, otherwise activates existing. Auto-names "Burst N".
- **Approach:** Normalize range → `findMatchingSlice` (O(n)) → if exists, activate and return → else create, hydrate, sort (O(n log n)).
- **Time:** O(n log n) dominated by `sortSlices`
- **Bottlenecks:** Calls `sortSlices` on every creation even though only one element is added. An insert-in-order approach would be O(log n) for binary search + O(n) for array insertion.
- **Improvement:** Replace full sort with binary search + splice insertion when adding a single slice. Keep `sortSlices` for bulk operations.

### C5. `mergeSlices` — Slice merger with adjacency check
- **File:** `src/store/slice-domain/createSliceCoreSlice.ts:236-294`
- **What it does:** Merges multiple slices into one, checking that all candidates are adjacent (gap ≤ 0.5% tolerance). Names "Merged Slice N".
- **Approach:**
  1. Filter candidates by ID set (O(m))
  2. Normalize each candidate's range (O(m))
  3. Sort by start (O(m log m))
  4. Check adjacency: for each consecutive pair, `current.start - previous.end > MERGE_TOUCH_TOLERANCE` (O(m))
  5. Compute merged bounds as min/max (O(m))
  6. Create new slice, replace all originals (O(n) filter + O(n log n) sort)
- **Time:** O(n log n + m log m) where n = total slices, m = merge candidates (usually 2 ≤ m ≤ 10)
- **Bottlenecks:** `MERGE_TOUCH_TOLERANCE = 0.5` (twice the typical burst tolerance of 0.005 × 100 = 0.5%) — this is reasonable but should be documented as "0.5% of normalized range" not a dimensionless 0.5.
- **Improvement:** Count existing merged slices via a more robust mechanism — the `name?.startsWith('Merged Slice ')` heuristic (line 271) is fragile (user could rename). Consider a metadata field instead.

### C6. `replaceSlicesFromBins` — Bulk slice replacement from bin data
- **File:** `src/store/slice-domain/createSliceCoreSlice.ts:374-436`
- **What it does:** Replaces all slices with new slices created from a `TimeBin[]`. Each bin becomes a slice with burst taxonomy if available.
- **Approach:** `.map` over bins (O(b)) → filter nulls → `sortSlices` (O(b log b)).
- **Time:** O(b log b) where b = number of bins
- **Space:** O(b) for the new slice array
- **Data structures:** `TimeSlice[]` built from `TimeBin[]`
- **Bottlenecks:** **Duplicated slice construction logic.** The burst-taxonomy and non-burst slice construction blocks (lines 384-428) are nearly identical to `addSliceFromBin` (lines 320-364). This violates DRY and increases maintenance cost.
- **Improvement:** Factor out a shared `binToTimeSlice(bin, domain, index): TimeSlice` function used by both `addSliceFromBin` and `replaceSlicesFromBins`.

### C7. `toNormalizedStoreRange` — Multi-source range normalization
- **File:** `src/store/slice-domain/createSliceCoreSlice.ts:16-41`
- **What it does:** Converts a raw `[start, end]` range to normalized [0, 100] using store state (timeline range or map domain) as reference.
- **Approach:** Priority cascade:
  1. If already in [0, 100], return as-is (O(1))
  2. Else if `minTimestampSec`/`maxTimestampSec` available, convert via `epochSecondsToNormalized` (O(1))
  3. Else if `mapDomain` available, convert linearly (O(1))
  4. Else clamp to [0, 100] (O(1))
- **Bottlenecks:** This function reads from two external stores (`useTimelineDataStore`, `useAdaptiveStore`) via `.getState()`. This is fine for non-reactive reads but makes this function impure (side-effect via external state). Duplicated in `useSliceStore.ts:18-43`.
- **Improvement:** Unify the duplicate at `useSliceStore.ts:18-43` with this one. Consider passing domain as a parameter instead of reading stores for testability.

### C8. `updatePreview` — Creation preview geometry
- **File:** `src/store/slice-domain/createSliceCreationSlice.ts:75-87`
- **What it does:** Clamps and normalizes the preview start/end time, computes ghost position x/width.
- **Approach:** `clampNormalizedTime` on min/max, set `ghostPosition.x` to start, `ghostPosition.width` to `end - start`.
- **Time:** O(1)
- **Bottlenecks:** None.
- **Improvement:** None needed.

### C9. `commitCreation` — Finalize slice creation
- **File:** `src/store/slice-domain/createSliceCreationSlice.ts:96-135`
- **What it does:** Creates a `TimeSlice` from the current preview state, adds it via `addSlice()`, resets creation state.
- **Approach:** Determine point vs range based on `previewEnd !== null && previewEnd !== previewStart`. Build slice object, call `get().addSlice(createdSlice)`.
- **Time:** O(n log n) via `addSlice` → `sortSlices`
- **Space:** O(1) for the new slice
- **Bottlenecks:** Same as `addSlice` — full sort for a single insertion.
- **Improvement:** Same as C4 — binary search + splice insertion.

### C10. `selectAll` / `toggleSlice` etc. — Selection state
- **File:** `src/store/slice-domain/createSliceSelectionSlice.ts:5-48`
- **What it does:** Manages `Set<string>` of selected slice IDs with count tracking.
- **Approach:** Standard Set operations wrapped in Zustand setters.
- **Time:** O(1) for toggle/deselect, O(k) for selectAll
- **Space:** O(k) for Set size
- **Bottlenecks:** `selectedCount` is stored redundantly alongside `selectedIds.size`. Could be derived.
- **Improvement:** Derive `selectedCount` via selector instead of storing it. Currently it can drift if only one is updated. Example: `select((state) => state.selectedIds.size)`.

### C11. `selectCreationPreviewFeedback` — Manual memoization
- **File:** `src/store/slice-domain/selectors.ts:39-63`
- **What it does:** Returns a `CreationPreviewFeedback` object, reusing the previous object reference if all values are identical (shallow equality).
- **Approach:** Manual cached reference (`cachedCreationPreviewFeedback` module-level variable). On each call, builds new object, compares field-by-field with cached version, returns cached if unchanged.
- **Time:** O(1) — 7 field comparisons
- **Bottlenecks:** **Module-level mutable cache.** The `cachedCreationPreviewFeedback` variable at module scope is reset every HMR and not garbage-collectable. It's thread-safe in JS but conceptually fragile.
- **Improvement:** Replace with `createSelector` from Zustand or a `useMemo`-based approach in the consuming component. The module-level cache pattern works but is non-standard.

### C12. `useAutoBurstSlices` hook — Burst duplication guard
- **File:** `src/store/useSliceStore.ts:46-117`
- **What it does:** React hook that auto-creates burst slices when `burstWindows` change. Guards against duplicates using a `useRef<Set<string>>` of processed signatures.
- **Approach:**
  1. Compute signature string from window start/end (rounded to 3dp)
  2. Check `processedRef.current.has(signature)` — if present, skip
  3. Otherwise add to set, call `addBurstSlice`
  4. Second effect normalizes burst slice ranges that fall outside [0, 100]
  5. Third effect clears the processed set when no burst slices remain
- **Time:** O(n) where n = number of burst windows. Each `addBurstSlice` is O(m log m) internally.
- **Bottlenecks:** Three separate `useEffect`s for related concerns (creation, normalization, cleanup). The signature-based dedup using rounded floats is fragile — two epoch ranges that differ by <0.001s will produce different signatures but may refer to the same window.
- **Improvement:** Consolidate into a single effect. The cleanup effect (lines 111-116) should also fire if the processed set grows stale (e.g., if burst windows are regenerated with different timestamps). Consider using a more robust dedup — compare windows by midpoint proximity within tolerance instead of string signatures.

---

## D. WARP SLICE ALGORITHMS

### D1. `useWarpSliceStore.addSlice` — Warp slice creation
- **File:** `src/store/useWarpSliceStore.ts:44-58`
- **What it does:** Creates a new `WarpSlice` with auto-incrementing label and cascading default range.
- **Approach:** Index-based default positioning: `range = [12 + index * 10, 20 + index * 10]` clamped to [0, 100] with fallback UUID generation.
- **Time:** O(1)
- **Bottlenecks:** `typeof crypto !== 'undefined'` check runs on every call. The default range formula produces overlapping slices for index ≥ 8 (range exceeds 100).
- **Improvement:** Extract crypto check to a module-level constant. Fix default range generation to ensure non-overlapping defaults.

### D2. `useWarpSliceStore.updateSlice` — Warp slice update with validation
- **File:** `src/store/useWarpSliceStore.ts:60-77`
- **What it does:** Updates a warp slice with normalized range and clamped weight [0, 3].
- **Approach:** `Array.map` with identity check → `normalizeRange` on range → `clamp(weight, 0, 3)`.
- **Time:** O(n)
- **Bottlenecks:** Scans all slices even though it updates only one. For typical counts (<20) this is fine.
- **Improvement:** None significant.

### D3. `useWarpSliceStore.removeSlice` — Warp slice removal with profile cleanup
- **File:** `src/store/useWarpSliceStore.ts:78-96`
- **What it does:** Removes a warp slice; if it was the last slice in a warp profile, also clears the active warp.
- **Approach:** `filter` → check if removed slice had a `warpProfileId` and it matches `activeWarpId` → check remaining slices for same profile → clear if none found.
- **Time:** O(n)
- **Bottlenecks:** The slice-find (line 80) and profile-scan (line 87-89) are separate O(n) passes. Could be combined into one pass.
- **Improvement:** Combine into a single `reduce` pass that excludes the target and tracks profile presence simultaneously.

### D4. `normalizeRange` (WarpStore) — Minimum width enforcement
- **File:** `src/store/useWarpSliceStore.ts:28-37`
- **What it does:** Normalizes a warp range with a minimum width guarantee of 0.5 (in normalized percentage units).
- **Approach:** Clamp inputs, swap if needed, if `end - start < 0.5`, extend end by `start + 0.5`.
- **Time:** O(1)
- **Bottlenecks:** Extends only `end`, not `start`. If start is near 100, extending end may produce values >100. The caller (`updateSlice` → `normalizeRange`) doesn't clamp the result again.
- **Improvement:** Symmetric expansion: if `end - start < 0.5`, center the range: `const mid = (start + end) / 2; return [mid - 0.25, mid + 0.25]`. Then clamp to [0, 100].

---

## E. WARP GENERATION ALGORITHMS

### E1. `analyzeDensity` — Crime density binning
- **File:** `src/lib/warp-generation.ts:67-149`
- **What it does:** Divides crime timestamps into `binCount` equal-width bins, counts crimes per bin, normalizes density to [0, 1], identifies peak/low epochs (top/bottom 10%).
- **Approach:**
  1. Find min/max timestamp (O(n))
  2. Create bins with equal time intervals (O(k))
  3. Count crimes into bins via `Math.floor((timestamp - min) / binSize)` (O(n))
  4. Normalize by max count (O(k))
  5. Sort bins by density, take top/bottom 10% as peak/low epochs (O(k log k))
- **Time:** O(n + k log k) where n = crime count, k = bin count
- **Space:** O(k) for bins
- **Bottlenecks:** Full sort of bins (O(k log k)) just to find top/bottom 10%. This is equivalent to finding the k*0.1-th percentile, which can be done with QuickSelect in O(k).
- **Improvement:** Replace `sort` + `slice(0, threshold)` with a partial sort or `nth_element` (quickselect) approach. For k=50 (default), the full sort is only ~50 log 50 = 282 operations — not a real bottleneck, but the pattern propagates.

### E2. `detectEvents` — Sliding window change point detection
- **File:** `src/lib/warp-generation.ts:160-203`
- **What it does:** Finds significant density transitions using sliding window comparison. Compares mean of left window vs right window; if change > `1.5 * stdDev`, marks as event.
- **Approach:**
  1. Compute mean/stdDev of densities (O(k))
  2. For each position i from `windowSize` to `k - windowSize`:
     `leftMean` = mean of densities[i-windowSize..i]
     `rightMean` = mean of densities[i..i+windowSize]
     If `|rightMean - leftMean| > threshold`, add event
     Dedup: if new event is within 5% range of existing, skip (O(e) per event)
  3. windowSize = `max(2, floor(k/10))`
- **Time:** O(k·w) where k = bin count, w = window size. With default k=50, w=5, this is O(250) sliding window operations.
- **Space:** O(e) for events array
- **Bottlenecks:**
  1. **O(k·w) sliding window:** Each window position calls two `slice().reduce()` chains, creating temporary arrays. For k=50 this is fine, but if bin scaling occurs, the array slicing is wasteful.
  2. **Inner `tooClose` check:** `events.some(e => ...)` is O(e) per event candidate, making dedup O(e²) worst-case. With e ≤ 5 (max peaks) this is negligible.
- **Improvement:** Use a rolling window with cached sums to avoid `slice().reduce()`. Maintain `leftSum` and `rightSum` that update incrementally as the window slides: subtract outgoing element, add incoming element. This drops from O(k·w) to O(k).

### E3. `generateWarpProfiles` — Warp profile generation
- **File:** `src/lib/warp-generation.ts:218-303`
- **What it does:** Generates 2-3 warp profiles (aggressive, balanced, conservative) with different interval counts and strength ranges.
- **Approach:**
  1. Call `analyzeDensity` (O(n + k log k))
  2. Call `detectEvents` (not used for intervals, only metadata)
  3. Call `calculateConfidence` (O(n + k))
  4. For each emphasis (up to 3):
     Call `generateIntervals` (O(k))
     Adjust confidence by emphasis multiplier
  5. Push profiles
- **Time:** O(n + k log k) — dominated by density analysis
- **Space:** O(k + p) where p = profile count (≤3)
- **Bottlenecks:** The `detectEvents` result (line 239) is computed but never passed to `generateIntervals`. It's dead work — the events variable is only assigned, never read beyond the assignment.
- **Improvement:** Remove the dead `detectEvents` call or pass event boundaries to `generateIntervals` for smarter boundary placement.

### E4. `generateIntervals` — Equal-interval density averaging
- **File:** `src/lib/warp-generation.ts:308-350`
- **What it does:** Divides the time range into `intervalCount` equal-sized sub-ranges, computes average density per interval, derives warp strength inversely proportional to density.
- **Approach:**
  1. Compute equal-size interval boundaries: `boundaryStep = n / intervalCount` (O(1))
  2. For each interval, sum densities of bins in that range, compute average (O(k))
  3. Strength = `minStrength + (1 - avgDensity) * (maxStrength - minStrength)` — higher density = lower warp (less compressing needed)
  4. Convert indices to percent (indices / n × 100)
- **Time:** O(k) where k = bin count
- **Bottlenecks:** The inverse relationship (`1 - avgDensity`) means dense intervals get compressed (low strength) and sparse intervals get expanded (high strength). This is the correct behavior for warp profiles but the `strength` axis is inverted relative to user intuition ("strength 2.0 = expand sparse" is counter-intuitive).
- **Improvement:** Rename `strength` to `compressionFactor` or `warpFactor` to clarify the axis. No algorithmic changes needed.

---

## F. INTERVAL DETECTION ALGORITHMS

### F1. `detectPeaks` — Peak detection in density histogram
- **File:** `src/lib/interval-detection.ts:57-98`
- **What it does:** Identifies local maxima in density distribution where value exceeds neighbors AND surpasses sensitivity-based threshold (mean + k·stdDev).
- **Approach:**
  1. Compute mean/stdDev (O(k))
  2. Threshold = `mean + stdDev * multiplier` based on sensitivity (O(1))
  3. Linear scan: if `density[i] > left && density[i] > right && density[i] >= threshold`, add peak (O(k))
  4. Slice to maxPeaks based on sensitivity (O(1))
- **Time:** O(k) where k = bin count
- **Space:** O(p) where p = peak count (≤10)
- **Bottlenecks:** None. This is a clean O(k) implementation.
- **Improvement:** None needed.

### F2. `detectChangePoints` — Sliding window change detection
- **File:** `src/lib/interval-detection.ts:110-159`
- **What it does:** Detects points where density distribution significantly shifts using sliding window mean comparison, deduplicated.
- **Approach:**
  1. windowSize = `max(2, floor(n/8))`
  2. Compute mean/stdDev (O(k))
  3. Threshold = `stdDev * multiplier` (sensitivity-based)
  4. For each position i: compare left window mean vs right window mean (O(k·w))
  5. Dedup: skip if too close to existing change point (O(c·e))
  6. Slice to maxChangePoints
- **Time:** O(k·w) = O(k²/8) worst case with w = k/8. For k ≤ 100: O(1250) window operations.
- **Space:** O(c) where c = change points (≤8)
- **Data structures:** None (raw array)
- **Bottlenecks:** Same issue as E2 — `slice().reduce()` per window position creates temporary arrays. Dedup via `changePoints.some(cp => Math.abs(cp - i) < windowSize / 2)` is O(c) per candidate.
- **Improvement:** Same as E2 — use rolling window sums. Replace `some()` dedup with a simple last-position check since change points are found in-order.

### F3. `applyRuleBased` — Equal-time boundary division
- **File:** `src/lib/interval-detection.ts:170-189`
- **What it does:** Creates boundaries at equal time intervals (not equal density).
- **Approach:** `step = n / boundaryCount`, push `idx = floor(i * step)` for i = 1..boundaryCount-1.
- **Time:** O(k) where k = boundaryCount
- **Bottlenecks:** Input `boundaryCount` is an index count, not epoch boundaries. The function returns bin indices, not epochs — the caller handles conversion.
- **Improvement:** None needed. Clean implementation.

### F4. `detectBoundaries` — Main boundary detection orchestrator
- **File:** `src/lib/interval-detection.ts:224-328`
- **What it does:** Main entry point that bins crimes, runs the selected detection method, applies snapping, and falls back to rule-based if insufficient boundaries found.
- **Approach:**
  1. Validate inputs (O(1))
  2. Compute `binCount = min(max(floor(crimes / 50), 20), 100)` (O(1))
  3. Bin crimes into histogram (O(n))
  4. Normalize bins by max count (O(k))
  5. Run detection method (varies)
  6. Convert indices to epoch seconds (O(k))
  7. Apply `snapToBoundary` if requested (O(k))
  8. If < 2 boundaries, merge with rule-based fallback: sort + dedup with 5% min gap (O(k log k))
  9. Calculate confidence (O(n + k))
- **Time:** O(n + k log k) in the worst case (when fallback merge triggers)
- **Space:** O(n + k) for bins + normalized bins + metadata
- **Bottlenecks:**
  1. **Duplicate binning:** `calculateConfidence` at line 316 internally re-bins the crimes (O(n)) when it receives `densityArray = normalizedBins`. But `calculateConfidence` checks `if (densityBins && densityBins.length > 0)` and skips rebinning if provided — however, the `statisticalScore` branch uses densityBins directly while `calculateDataClarity` and `calculateCoverage` still re-bin from scratch because they receive raw `crimes`. This means O(2n) binning work overall.
  2. **Fallback merge double-work:** The fallback path (lines 296-312) re-runs `applyRuleBased` and merges even when the primary detection returns 0 boundaries — but if the fallback produces the same boundaries as the primary, the dedup loop still runs.
- **Improvement:** Pass the already-computed `normalizedBins` and `binCount`/`binSize` metadata into `calculateConfidence` to avoid re-binning. Currently `calculateConfidence` only accepts `densityBins: number[]` but not the binning context needed to skip clarity/coverage rebinning.

### F5. `snapToBoundary` — Date unit snapping
- **File:** `src/lib/interval-detection.ts:198-209`
- **What it does:** Rounds an epoch timestamp to the nearest hour or day boundary.
- **Approach:** Date arithmetic: `setMinutes(+30, 0, 0, 0)` for hours, `setHours(12, 0, 0, 0)` for days.
- **Time:** O(1)
- **Bottlenecks:** `new Date(epoch * 1000)` allocation on every call. For batch snapping of 100+ boundaries this creates GC pressure.
- **Improvement:** Batch conversion could use epoch arithmetic: `Math.round(epoch / 3600) * 3600` for hours. For days: `Math.floor(epoch / 86400) * 86400 + 43200` (midday).

---

## G. CONFIDENCE SCORING ALGORITHMS

### G1. `calculateDataClarity` — Variance-based clarity score
- **File:** `src/lib/confidence-scoring.ts:46-93`
- **What it does:** Scores data clarity (0-100) based on coefficient of variation of crime density across time bins.
- **Approach:**
  1. Bin crimes into `min(max(floor(n/100), 10), 100)` buckets (O(n))
  2. Compute mean = total/n (O(1))
  3. Compute variance (O(k))
  4. CV = sqrt(variance) / mean (O(1))
  5. Score = `min(100, CV * 50)` (O(1))
- **Time:** O(n + k) where n = crimes, k = bin count
- **Bottlenecks:** Re-bins crimes even when bins are already available from caller (e.g., `calculateConfidence` receives `densityBins` but clarity still re-bins).
- **Improvement:** Add an overload or parameter to accept pre-computed bins.

### G2. `calculateCoverage` — Multi-factor coverage score
- **File:** `src/lib/confidence-scoring.ts:105-168`
- **What it does:** Scores data coverage (0-100) using temporal span, density, and distribution uniformity (Gini coefficient).
- **Approach:**
  1. Find min/max of crimes (O(n))
  2. Span coverage = temporalSpan / range (O(1))
  3. Density score = `min(100, log10(n+1) * 20)` (O(1))
  4. Bin into 20 buckets, compute Gini coefficient (O(n + k log k))
  5. Weighted combination: span(30%) + density(35%) + uniformity(35%)
- **Time:** O(n + k log k) where k = 20 (constant)
- **Bottlenecks:** **Another full pass of crime binning** (lines 136-148), even when this function is called from `calculateConfidence` which already has bins. The Gini calculation sorts bins (O(k log k)) though k=20 makes this negligible.
- **Improvement:** Accept pre-computed bins as parameters. The Gini coefficient implementation is correct (formula: `(2i - n - 1) * sorted[i]` / `n * mean`) and is a reasonable approximation for distribution uniformity.

### G3. `calculateStatisticalConfidence` — Entropy + SNR confidence
- **File:** `src/lib/confidence-scoring.ts:179-218`
- **What it does:** Scores statistical confidence (0-100) from density bins using signal-to-noise ratio, peak prominence, and entropy.
- **Approach:**
  1. SNR score = `min(100, stdDev/mean * 100)` (O(k))
  2. Prominence = `(max - mean) / max * 100` (O(k))
  3. Normalized entropy = `sum(v * log2(v)) / log2(n)` (O(k))
  4. Weighted: SNR(40%) + prominence(35%) + entropy(25%)
- **Time:** O(k)
- **Bottlenecks:** The entropy calculation uses `Math.log2` which is less optimized than `Math.log` in V8 (though the difference is tiny). The normalization `v / (maxVal || 1)` (line 203) divides by 1 when maxVal = 0, leaving density values unchanged — this is a division-by-zero guard but produces incorrect entropy when all bins are zero (entropy of all-zero array should be 0, but normalized values remain as-is).
- **Improvement:** Add an explicit early return: `if (maxVal <= 0) return 0;` before entropy calculation.

### G4. `calculateConfidence` — Composite confidence orchestrator
- **File:** `src/lib/confidence-scoring.ts:228-277`
- **What it does:** Combines data clarity, coverage, and statistical confidence into a composite 0-100 score.
- **Approach:** Delegates to G1, G2, G3. If `densityBins` not provided, generates them from crimes (O(n)).
- **Time:** O(n + k log k) overall (calls G1, G2, G3)
- **Bottlenecks:** **Triple binning.** When called without `densityBins`: generate bins (O(n)), then G1 bins again (O(n)), then G2 bins again (O(n)). This is O(3n) redundant work for the same operation. Even when `densityBins` IS provided, G1 and G2 still re-bin because they don't accept pre-computed bins.
- **Improvement:** Restructure `calculateConfidence` to compute bins once, then pass them to each sub-scorer. This is the single biggest performance optimization opportunity in the entire codebase.

---

## H. PROPOSAL RANKING & SCORING ALGORITHMS

### H1. `generateRankedAutoProposalSets` — Full auto-proposal pipeline
- **File:** `src/lib/full-auto-orchestrator.ts:34-141`
- **What it does:** Generates warp profiles from crime data, builds shared interval sets, scores and ranks them, returns top 3 with recommendation metadata.
- **Approach:**
  1. Generate warp candidates via `generateWarpProfiles` (O(n + k log k))
  2. Build shared interval set via `detectBoundaries` (O(n + k log k))
  3. Score each candidate via `scoreWarpOnly` (O(i) per candidate, i ≤ 12)
  4. Sort by total score descending (O(p log p), p ≤ 6)
  5. Slice top 3 (O(1))
  6. Enrich with recommendation metadata
  7. Check low-confidence threshold (< 25 crimes or < MIN_CONFIDENCE_THRESHOLD)
- **Time:** O(n + k log k) — dominated by density analysis & boundary detection
- **Space:** O(n + k + p) where p = profiles
- **Bottlenecks:** `buildSharedIntervalSet` calls `detectBoundaries` which bins crimes again — after `generateWarpProfiles` already binned them. This double-binning happens within the same function call. Additionally, `buildSharedIntervalSet` creates a normalized boundary set that's attached to every proposal set identically (lines 88-90 with spread `{...sharedIntervalSet}`). If multiple profiles share the same interval set, it's cloned unnecessarily.
- **Improvement:** Pass the already-computed density bins from `analyzeDensity` into `detectBoundaries` to eliminate the re-binning. Ensure `detectBoundaries` accepts pre-computed normalized bins.

### H2. `normalizeBoundaries` — Boundary dedup & clamp
- **File:** `src/lib/full-auto-orchestrator.ts:164-181`
- **What it does:** Filters, clamps, sorts, and deduplicates boundary epoch values.
- **Approach:** `filter(isFinite) → map(clamp) → sort → Set → Array.from`. Falls back to `[min, max]` if < 2 unique values.
- **Time:** O(m log m) where m = boundary count
- **Bottlenecks:** The `new Set()` for dedup is O(m) and correct.
- **Improvement:** None needed.

### H3. `scoreWarpOnly` — Composite warp score
- **File:** `src/lib/full-auto-orchestrator.ts:183-205`
- **What it does:** Computes weighted composite score (coverage, relevance, continuity, overlap minimization) for a single warp profile.
- **Approach:** Calls 4 sub-scorers, applies weights, penalizes overlap by 50%.
- **Time:** O(i log i) where i = interval count (≤12) — dominated by `scoreOverlapMinimization`
- **Bottlenecks:** `hasOverlappingIntervals` (O(i log i)) is called separately from `scoreOverlapMinimization` (also O(i log i)). Both sort the intervals independently. This is O(2i log i) where O(i log i) would suffice.
- **Improvement:** Merge the overlap detection into `scoreOverlapMinimization` — it already computes activeEnd tracking which implies overlap. Return a `hasOverlap` flag alongside the score.

### H4. `scoreWarpContinuity` — Smoothness scoring
- **File:** `src/lib/full-auto-orchestrator.ts:222-236`
- **What it does:** Scores how smoothly warp strengths transition between adjacent intervals (lower adjacent differences = higher score).
- **Approach:** Sum of absolute differences between adjacent strengths → average step → `max(0, 100 - avgStep * 50)`.
- **Time:** O(i) where i = intervals
- **Bottlenecks:** The multiplier 50 means a single large step of 2.0 between adjacent intervals reduces score to 0. This is an arbitrary scaling factor.
- **Improvement:** Document the 50× multiplier rationale. Consider using standard deviation instead of average step for smoother penalty distribution.

### H5. `hasOverlappingIntervals` — Interval overlap detection
- **File:** `src/lib/full-auto-orchestrator.ts:238-257`
- **What it does:** Checks if any pair of intervals overlaps (after normalization).
- **Approach:** Sort by `startPercent`, scan: if `sorted[i].startPercent < sorted[i-1].endPercent`, return true.
- **Time:** O(i log i) for sort + O(i) for scan
- **Bottlenecks:** **Duplicate implementation.** The sort + scan logic is nearly identical to the first half of `scoreOverlapMinimization`. Both are called separately.
- **Improvement:** Merge with H3 suggestion — compute overlap flag during `scoreOverlapMinimization` pass.

### H6. `scoreOverlapMinimization` — Overlap penalty estimation
- **File:** `src/lib/full-auto-orchestrator.ts:259-296`
- **What it does:** Calculates overlap ratio (overlapLength / totalIntervalLength). Higher overlap = lower score.
- **Approach:** Sort by start (O(i log i)), track `activeEnd`, compute overlap when `interval.start < activeEnd`. Update `activeEnd = max(activeEnd, interval.end)`. Score = `100 * (1 - overlapRatio)`.
- **Time:** O(i log i) for sort + O(i) for scan
- **Bottlenecks:** The overlap calculation at line 283 uses `Math.min(activeEnd, interval.end) - interval.start` which is correct for standard interval overlap but doesn't handle nested intervals (one interval fully contained within another) — for nested intervals, the overlap counts the inner interval's full width against the outer, which is double-counting.
- **Improvement:** For nested intervals, the overlap of the inner interval should not be double-counted. Track a stack of active intervals rather than a single `activeEnd`.

### H7. `generateWhyRecommended` — Explanation generator
- **File:** `src/lib/full-auto-orchestrator.ts:298-319`
- **What it does:** Generates a human-readable explanation for why a proposal was recommended by finding the top-2 contributing score dimensions.
- **Approach:** Compute weighted contributions, sort descending, take top 2, format as `"Best: {dim1} + {dim2}"`.
- **Time:** O(d log d) where d = 4 (constant)
- **Bottlenecks:** None for d=4.
- **Improvement:** None needed.

---

## I. BURST DETECTION ALGORITHMS

### I1. `computeTemporalB` — Temporal burstiness coefficient
- **File:** `src/lib/burst-detection.ts:53-60`
- **What it does:** Computes the coefficient of variation of inter-event gaps: `(std - mean) / (std + mean)`. Returns value in [-1, 1].
- **Approach:** Mean → variance → std → formula.
- **Time:** O(g) where g = number of gaps
- **Bottlenecks:** None — this is a standard burstiness formula from Goh & Barabási (2008).
- **Improvement:** None needed.

### I2. `buildDistribution` — Spatial grid distribution
- **File:** `src/lib/burst-detection.ts:72-93`
- **What it does:** Maps 2D points to a 32×32 grid (1024 cells), normalizes cell counts to probabilities.
- **Approach:** `cellIndexFor(point)` → `Float64Array[1024]` increment → divide by total.
- **Time:** O(p) where p = points
- **Space:** O(1024) = O(1) (fixed grid)
- **Bottlenecks:** The grid size (32×32 = 1024 cells) is hardcoded via `GRID_SIZE = 32`. For large spatial extents, 1024 cells may be too coarse to capture local clustering patterns. For small extents (city blocks), 1024 cells may be excessive.
- **Improvement:** Make `GRID_SIZE` configurable based on spatial extent or number of points. Adaptive grid sizing: `GRID_SIZE = Math.max(8, Math.min(64, Math.floor(Math.sqrt(points.length))))`.

### I3. `normalizedEntropy` — Grid distribution entropy
- **File:** `src/lib/burst-detection.ts:95-110`
- **What it does:** Computes Shannon entropy of the spatial distribution, normalized by log(support). Returns [0, 1] where 0 = all in one cell, 1 = uniform.
- **Approach:** Sum over cells: `-p * ln(p)`. Support = non-zero cells. Entropy = `entropy / ln(support)`.
- **Time:** O(N) where N = 1024 (constant)
- **Bottlenecks:** Uses `Math.log` (natural log) but normalizes by `log(support)` — this mixes log bases. Shannon entropy should use log base 2 or consistently use natural log. Since normalization divides by `log(support)` (natural log of support count), the result is still correct regardless of log base as long as both numerator and denominator use the same base. This is correct.
- **Improvement:** For clarity, use `Math.log2` throughout or document the mixed-base normalization.

### I4. `jensenShannonDivergence` — Distribution comparison
- **File:** `src/lib/burst-detection.ts:112-130`
- **What it does:** Computes Jensen-Shannon divergence between two probability distributions (point distribution vs baseline).
- **Approach:** For each cell: midpoint `m = (p+q)/2`, compute KL(p||m) + KL(q||m). Average and normalize by log(2).
- **Time:** O(N) where N = 1024 (constant)
- **Bottlenecks:** None — mathematically correct implementation of JS-divergence.
- **Improvement:** None needed.

### I5. `averageNearestNeighborDistance` — O(p²) ANN
- **File:** `src/lib/burst-detection.ts:132-156`
- **What it does:** Computes average nearest-neighbor distance for a set of 2D points.
- **Approach:** Brute-force O(p²): for each point, find nearest neighbor distance by scanning all other points.
- **Time:** O(p²) where p = points in a burst bin (potentially millions per bin)
- **Space:** O(1)
- **Bottlenecks:** **CRITICAL.** This is called inside `computeAnnScore` which is called by `computeSpatialB` for every burst bin. With 8.5M crime records and even modest binning (e.g., 12 partitions × ~708K points per bin), this O(p²) scan is computationally infeasible. Each nearest-neighbor search requires `sqrt(dx² + dz²)` distance calculation with `p²` comparisons.
- **Improvement:** Replace with spatial index:
  1. **Use a KD-tree or R-tree** to reduce ANN search from O(p²) to O(p log p) for construction + O(log p) per query.
  2. **Grid-based approximation:** Since we already have a 32×32 grid from `buildDistribution`, use grid cell proximity as a proxy for nearest-neighbor distance.
  3. **Skip ANN formula entirely:** The `balanced` spatial formula already doesn't use ANN. The `ann` formula is rarely selected.

### I6. `computeAnnScore` — Normalized ANN clustering score
- **File:** `src/lib/burst-detection.ts:158-166`
- **What it does:** Computes clustering score: `1 - observed/expected` where expected is `0.5 * sqrt((100*100) / n)` (Ripley's K expectation for CSR).
- **Approach:** Calls I5 (O(p²)), compares to expected nearest-neighbor distance under complete spatial randomness.
- **Time:** O(p²) — delegates to I5
- **Bottlenecks:** Same as I5. The `expected` formula `0.5 * sqrt(area / n)` is correct for Poisson CSR in a square.
- **Improvement:** Same as I5.

### I7. `computeSpatialB` — Composite spatial burstiness
- **File:** `src/lib/burst-detection.ts:168-193`
- **What it does:** Computes spatial burstiness using configurable formula (balanced, entropy, JS-divergence, or ANN).
- **Approach:**
  1. `buildDistribution(points)` (O(p))
  2. `concentration = 1 - normalizedEntropy(distribution)` (O(N))
  3. `surprise = jensenShannonDivergence(distribution, baselineDistribution)` (O(N))
  4. Dispatch to formula-specific computation
- **Time:** O(p + N) for all formulas except `ann` which is O(p²)
- **Bottlenecks:** For the `balanced` formula (default): `concentration * (0.25 + 0.75 * surprise)` — the weights 0.25/0.75 mean surprise (JS-divergence) dominates by 3× over concentration (entropy). This is fine for most cases but the ratio should be validated against domain expectations.
- **Improvement:** The `baselinePoints` default (line 170: `baselinePoints = points`) means when called without a baseline, `surprise` compares the distribution against itself — producing JS-divergence = 0 (identical distributions). This makes `surprise = 1` due to the guard `baselinePoints.length >= 3 ? JS-divergence : 1`. When no baseline exists, falls back to `surprise = 1` which gives maximum weight to the concentration-only term. This is correct but the behavior shift should be documented.

### I8. `computeTemporalBBinned` / `computeSpatialBBinned` — Convenience wrappers
- **File:** `src/lib/burst-detection.ts:340-357`
- **What it does:** Wrapper functions that apply burst formulas to arrays of timestamps/points.
- **Approach:** Sort timestamps (O(t log t)), compute gaps, delegate to `computeTemporalB`. For spatial, delegate directly to `computeSpatialB`.
- **Time:** O(t log t) for temporal, O(p + N) or O(p²) for spatial
- **Bottlenecks:** The sort in `computeTemporalBBinned` is necessary but adds O(t log t) overhead. If timestamps are already sorted upstream, this is wasted.
- **Improvement:** Accept an optional `alreadySorted` parameter to skip sorting.

### I9. `buildFallbackBurstResponse` — Determinstic mock burst data
- **File:** `src/lib/burst-detection.ts:271-303`
- **What it does:** Generates pseudo-random but deterministic burst bin results when the real API fails.
- **Approach:** Uses `Math.sin(seed) * 10000 → fraction` to produce deterministic-but-random-looking burst scores from partition timestamps.
- **Time:** O(b) where b = partitions
- **Bottlenecks:** Uses `Math.sin` as a pseudo-random function, which has known periodicity issues for correlated inputs. Adjacent partitions with similar timestamps may produce correlated burst scores.
- **Improvement:** Use a proper hash function (e.g., FNV-1a or siphash) for deterministic pseudo-random values. The `seed = Math.sin(...) * 10000` approach is a known pattern but `Math.sin` can produce collisions.

---

## J. BURST TAXONOMY ALGORITHMS

### J1. `classifyBurstWindow` — Rule-based burst classification
- **File:** `src/lib/binning/burst-taxonomy.ts:104-182`
- **What it does:** Classifies a time window into one of four burst classes: `prolonged-peak`, `isolated-spike`, `valley`, or `neutral`.
- **Approach:** Multi-condition decision tree with hardcoded thresholds:
  1. Compute neighbor median, max, min, average (O(k) for k neighbors)
  2. Check high-contrast: `value >= 0.72 || value >= neighbor_median + 0.16`
  3. Check low-contrast: `value <= 0.30 || value <= neighbor_median - 0.16`
  4. Shape heuristics: isolated if duration ≤ 90s or ≤ 75% of neighbor median; sustained if duration ≥ 180s or count ≥ 3
  5. Multiple tie-break conditions for edge cases
  6. Compute burst score via `normalizeScore` (weighted median of value, count, duration)
  7. Compute confidence via `deriveBurstConfidence` (contrast + support + shape bonus)
- **Time:** O(k) where k = neighbor count (typically 2-6)
- **Space:** O(1)
- **Bottlenecks:** The hardcoded thresholds (globalHigh = 0.72, globalLow = 0.30, highContrast gap = 0.16) are domain-specific constants that should be configurable. The multiple tie-break paths (lines 134-157) create a complex decision surface that's hard to test exhaustively.
- **Improvement:** Extract thresholds to a config object with good defaults. Add property-based tests to verify monotonicity and boundary behavior. The `sustainedShape` and `isolatedShape` conditions (lines 125-127) can both be true simultaneously — the priority cascade handles this (sustainedShape wins) but this should be documented.

### J2. `deriveBurstConfidence` — Evidence-weighted confidence
- **File:** `src/lib/binning/burst-taxonomy.ts:76-102`
- **What it does:** Computes confidence in a classification based on contrast with neighbors and classification shape bonuses.
- **Approach:** `0.46 * contrast + 0.34 * support + shapeBonus`. Contrast = `|value - neighborMedian| + spread * 0.35`. Support = `average(neighborValues) + 0.15`.
- **Time:** O(k) where k = neighbors
- **Bottlenecks:** The weights (0.46, 0.34) sum to 0.80, not 1.00, with shapeBonus on top. This means shapeBonus (0.08–0.22) is additive, not a fraction of the remaining weight. The total can exceed 1.0 before `clamp01`.
- **Improvement:** Normalize so that `weights + shapeBonusWeight = 1.0`. E.g., `0.42 * contrast + 0.28 * support + 0.30 * shapeBonus` where shapeBonus varies. The current implementation gives inconsistent weight to classification shape versus data evidence.

---

## K. WARP SCALING ALGORITHMS (Comparable Warp)

### K1. `scoreComparableWarpBins` — Peer-relative bin scoring
- **File:** `src/lib/binning/warp-scaling.ts:108-163`
- **What it does:** Scores each bin's warp weight relative to its peers (same granularity). Score = `bin.count / averageAcrossBins`.
- **Approach:**
  1. Validate all bins have same granularity (O(b))
  2. Compute total count, peer average (O(b))
  3. For each bin: `peerRelativeScore = count / peerAverage`, `warpWeight = clamp(peerRelativeScore * hintWeight)`
  4. If all scores are 1 (or totalCount ≤ 0), mark as neutral fallback
- **Time:** O(b) where b = bin count
- **Bottlenecks:** None — this is a clean O(b) implementation.
- **Improvement:** None needed.

### K2. `buildComparableWarpMap` — Proportional width allocation
- **File:** `src/lib/binning/warp-scaling.ts:165-226`
- **What it does:** Computes normalized width shares for each bin proportional to warp weight, enforcing a minimum width share per bin.
- **Approach:**
  1. Score bins if not already scored (delegates to K1)
  2. Compute `minimumWidthShare = min(0.45, 1/(2*bins))` (adaptive per bin count)
  3. `remainingShare = 1 - minWidthShare * binCount`
  4. Width share = `minWidthShare + (weight / totalWeight) * remainingShare`
  5. Normalize shares to sum to 1.0
  6. Build Float32Array boundary offsets
- **Time:** O(b)
- **Bottlenecks:** The minimum width share formula `min(0.45, 1 / (binCount * 2))` means for 2 bins, each gets at least 25% width share; for 10 bins, at least 5%. This is reasonable but the 0.45 cap is arbitrary. For binCount = 1, the formula gives `1/(1*2) = 0.5`, which is > 0.45, so the cap applies: `min(0.45, 0.5) = 0.45`. This means a single bin with 2 neighbors would get 45% + remaining share — this feels excessive but is unlikely in practice.
- **Improvement:** The 0.45 cap ensures total minimum share can't exceed `bins * 0.45 = 0.45` for single-bin edge case. Make this configurable.

---

## L. BINNING UTILITY ALGORITHMS

### L1. `validateConstraints` — Per-bin constraint validator
- **File:** `src/lib/binning/rules.ts:247-279`
- **What it does:** Validates all bins against min/max events, min/max time span, and max bin count constraints.
- **Approach:** Linear scan with O(b) checks.
- **Time:** O(b)
- **Bottlenecks:** None.
- **Improvement:** None needed.

### L2. `mergeSmallBins` — Greedy small-bin merger
- **File:** `src/lib/binning/rules.ts:284-316`
- **What it does:** Merges adjacent small bins when bin count exceeds `maxBins`, ensuring each merged group meets `minEvents`.
- **Approach:**
  1. Sort bins by count ascending (O(b log b))
  2. Greedy accumulation: if current group ≥ minEvents, flush to results; else merge into accumulator
  3. Final sort by time (O(b log b))
- **Time:** O(b log b) for two sorts
- **Bottlenecks:** Sorting by count (ascending) and then by time (ascending) means the final result may lose temporal ordering within merged groups. The first sort-by-count destroys temporal adjacency, but since bins are sorted by time at the end, the result is temporally ordered. However, the greedy accumulation may merge non-adjacent bins when sorted by count.
- **Improvement:** Replace with a sequential scan that merges temporally adjacent low-count bins without sorting by count. Alternative: Use a rolling merge that checks: "if current bin is small, merge with next adjacent bin; repeat until minEvents met or no more bins."

---

## M. STATE MACHINE & ADJUSTMENT ALGORITHMS

### M1. `createStateMachine` — Generic state machine
- **File:** `src/lib/state-machine.ts:19-36`
- **What it does:** Creates a state machine with allowed transitions and state validation.
- **Approach:** Closure-based state with `canTransition` lookup in transition map. Reads from `transitions[from]`.
- **Time:** O(1) per transition (hash lookup + array includes)
- **Bottlenecks:** `transitions[from]?.includes(to)` — the `transitions` record is typed as `Record<S, S[]>` so `includes` scans the allowed-transitions array. For typical state machines (≤6 states, ≤3 transitions each), this is negligible.
- **Improvement:** Consider `Set<S>` for transition arrays if state count grows. But for current usage (5 states), fine.

### M2. `snapToInterval` / `getSnapInterval` — Adaptive snap selection
- **File:** `src/app/timeline-test/lib/slice-utils.ts:21-43`
- **What it does:** Snaps a timestamp to the nearest grid interval. `getSnapInterval` selects interval based on domain span.
- **Approach:** `snapToInterval`: offset from domain start, `Math.round(offset / interval) * interval`, re-add domain start. `getSnapInterval`: heuristic cascade — span < 1h → minutes, < 24h → hours, else days.
- **Time:** O(1) each
- **Bottlenecks:** None.
- **Improvement:** None needed.

### M3. `constrainDuration` — Min/max duration enforcement
- **File:** `src/app/timeline-test/lib/slice-utils.ts:45-88`
- **What it does:** Clamps start/end to domain bounds, enforces minimum duration (60s) and maximum duration (80% of domain span).
- **Approach:**
  1. Clamp both to domain [O(1)]
  2. If `end - start < MIN_SLICE_DURATION`, extend (try end first, then start) [O(1)]
  3. If `end - start > domainSpan * MAX_SLICE_RATIO`, cap end [O(1)]
- **Time:** O(1)
- **Bottlenecks:** The min-duration enforcement only extends in one direction (end) before falling back to start (line 61: `end = Math.min(maxDomain, start + MIN_SLICE_DURATION)`). If `start` is near `maxDomain`, extending end may not work, and the fallback reduces start. This can shift the slice's center point by up to 60s on every interaction.
- **Improvement:** Prefer symmetric expansion: center the slice at the midpoint, expand both ends. Only shift if symmetric expansion exceeds bounds.

### M4. `pickNearest` — Nearest-candidate selection with tie-breaking
- **File:** `src/app/timeline-test/lib/slice-adjustment.ts:144-172`
- **What it does:** Selects the nearest snap candidate to `rawSec` within tolerance, preferring neighbor sources over grid on ties.
- **Approach:**
  1. Sort by proximity to `rawSec` (ascending) [O(m log m)]
  2. On equal distance: prefer `neighbor` over `grid` source
  3. On still equal: prefer smaller value
  4. Check winner against tolerance
- **Time:** O(m log m) where m = candidates (typically <20)
- **Bottlenecks:** Full sort of m candidates just to find the minimum. With m ≤ 20, O(m log m) ≈ O(m) practically. If candidate counts grow (100+ neighbors), this becomes wasteful.
- **Improvement:** Use linear scan with `reduce` (O(m)) instead of sort (O(m log m)). Track best candidate and update if better found.

### M5. `resolveSnap` — Snap dispatch
- **File:** `src/app/timeline-test/lib/slice-adjustment.ts:174-194`
- **What it does:** Applies snap configuration (enabled/bypass/grid+neighbor candidates) to produce snapped value.
- **Approach:** If disabled or bypass → raw. Otherwise merge grid and neighbor candidates, call `pickNearest`.
- **Time:** O(m log m) via M4
- **Bottlenecks:** Creates two intermediate arrays (`.map()`) for candidate conversion even when snap is disabled/bypassed. The bypass check is after the map creation in the return chain — though short-circuited by `!snap || !snap.enabled || snap.bypass`.
- **Improvement:** Move bypass check to prevent unnecessary candidate building:
  ```ts
  if (!snap?.enabled || snap.bypass) return { snappedSec: rawSec, source: 'none' };
  ```

### M6. `adjustBoundary` — Interactive slice boundary adjustment
- **File:** `src/app/timeline-test/lib/slice-adjustment.ts:196-256`
- **What it does:** The core interactive boundary adjustment algorithm. Takes raw pointer position, snaps to nearest candidate, enforces domain bounds and minimum duration, returns normalized + applied values with limit cues.
- **Approach:**
  1. Normalize domain [O(1)]
  2. Clamp raw pointer to domain [O(1)]
  3. Resolve snap (M5) [O(m log m)]
  4. Clamp snapped to domain again [O(1)]
  5. If adjusting start: enforce `start ≤ fixedBoundary - minDuration`, enforce `start ≥ domainStart`
  6. If adjusting end: enforce `end ≥ fixedBoundary + minDuration`, enforce `end ≤ domainEnd`
  7. Limit cue assignment for UI feedback
  8. Normalize result to [0, 100] for store update
- **Time:** O(m log m) where m = candidates (via M5)
- **Bottlenecks:**
  1. **Double domain clamp:** raw is clamped (line 201), then snapped is clamped again (line 203). The second clamp is technically redundant if snap candidates are also in-domain, but serves as a safety net.
  2. **Limit cue priority:** `minDuration` check happens before `domainStart`/`domainEnd` check (lines 211-215). If both violations occur simultaneously (e.g., dragging a wide slice's start handle past domain start and minimum duration simultaneously), the `minDuration` cue wins. This is reasonable but should be documented.
- **Improvement:** The `limitCue` could be a stack/priority rather than a single value to communicate multiple constraints simultaneously.

### M7. `resolveNeighborCandidates` — Cross-slice boundary collection
- **File:** `src/app/timeline-test/lib/slice-adjustment.ts:121-142`
- **What it does:** Collects boundary candidates from other visible slices for neighbor snapping.
- **Approach:** Start with domain boundary for the relevant handle (min for start, max for end). Then collect `boundary.startSec` and `boundary.endSec` from all visible slices except the active one. Dedup and sort.
- **Time:** O(b · n · s) where b = boundaries, n = other slices (each contributes 2 values), s = sorting. With typical n < 20, this is O(1).
- **Bottlenecks:** The `domainCandidate` (line 130) is always included, even when it's the same as `fixedBoundarySec`. It gets filtered later (line 141). This is trivial.
- **Improvement:** None needed.

---

## K. CROSS-CUTTING CONCERNS

### K1. Duplicate binning (most severe)
The single biggest source of wasted computation across the codebase. Multiple functions independently bin the same crime data:
- `detectBoundaries` (lib/interval-detection.ts:250-264)
- `calculateDataClarity` (lib/confidence-scoring.ts:59-73)
- `calculateCoverage` (lib/confidence-scoring.ts:136-148)
- `calculateConfidence` fallback (lib/confidence-scoring.ts:249-263)
- `analyzeDensity` (lib/warp-generation.ts:101-122)
- `buildSharedIntervalSet` → `detectBoundaries` (lib/full-auto-orchestrator.ts:148)

These are called in chains where the same crime data traverses the same binning logic 3-4 times. For 100K crimes, this is ~400K bin operations instead of ~100K.

### K2. Largest-remainder duplication
`allocateNonUniformSlices` (`src/lib/slice-allocator.ts`) and `allocateSlices` (`src/lib/burst-detection.ts`) implement the same proportional allocation algorithm with minor differences in correction strategy and output format. Should be unified.

### K3. `toNormalizedStoreRange` duplication
Identical logic in `src/store/slice-domain/createSliceCoreSlice.ts:16-41` and `src/store/useSliceStore.ts:18-43`. Should be extracted to a shared utility.

### K4. Brute-force ANN
`averageNearestNeighborDistance` at O(p²) is the only algorithmic bottleneck with potential to cause real-world performance issues. For crime datasets of 8.5M records, even binning into 12 partitions leaves ~708K points per partition — a 708K² ≈ 5×10¹¹ operation cost per bin.

---

## SUMMARY TABLE

| # | Algorithm | File | Complexity | Bottleneck Severity |
|---|-----------|------|-----------|-------------------|
| A6 | `clusterSlices` | slice-geometry.ts | O(n²) worst-case | **Medium** — redundant reduce per cluster |
| B1 | `allocateNonUniformSlices` | slice-allocator.ts | O(n log n + b²) | **Medium** — O(b²) remainder loop + indexOf in loop |
| B2 | `allocateSlices` | burst-detection.ts | O(k·b) | **Medium** — duplicate of B1 |
| E2 | `detectEvents` | warp-generation.ts | O(k·w) | **Low** — rolling sum eliminates temp arrays |
| F2 | `detectChangePoints` | interval-detection.ts | O(k·w) | **Low** — same rolling sum fix |
| F4 | `detectBoundaries` | interval-detection.ts | O(n + k log k) | **Medium** — duplicate binning |
| G1-4 | All confidence scorers | confidence-scoring.ts | O(n + k log k) each | **HIGH** — triple binning of same data |
| H1 | `generateRankedAutoProposalSets` | full-auto-orchestrator.ts | O(n + k log k) | **Medium** — double binning |
| I5 | `averageNearestNeighborDistance` | burst-detection.ts | **O(p²)** | **CRITICAL** — brute force for large datasets |
| I7 | `computeSpatialB` (ANN formula) | burst-detection.ts | **O(p²)** via I5 | **CRITICAL** |
| L2 | `mergeSmallBins` | binning/rules.ts | O(b log b) | **Low** — wrong merge strategy (non-temporal) |
| M4 | `pickNearest` | slice-adjustment.ts | O(m log m) | **Low** — linear scan would be O(m) |

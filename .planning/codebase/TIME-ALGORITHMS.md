# Time Manipulation & Binning Algorithms — Complete Analysis

**Analysis Date:** 2026-05-29  
**Scope:** All time normalization, binning, date formatting, timeline series, and time store algorithms

---

## 1. Epoch Detection & Linear Normalization

### 1.1 `detectEpochUnit` — `src/lib/time-domain.ts:6-8`
- **What:** Detects whether a numeric timestamp is in seconds or milliseconds by comparing against a threshold (1e11).
- **Approach:** Single comparison: `Math.abs(value) >= 1e11 ? 'milliseconds' : 'seconds'`
- **Time:** O(1)
- **Space:** O(1)
- **Structure:** Simple heuristic constant.
- **Bottleneck:** None.
- **Improvement:** The threshold `1e11` corresponds to year ~5138 in ms, which works for modern data (2001 = ~978M sec, ~978B ms). At the boundary (~1973 in ms, ~1973 in sec), seconds and ms are both ~6e10 — ambiguous. Acceptable for crime data (2001–2026 range).

### 1.2 `toEpochSeconds` — `src/lib/time-domain.ts:10-12`
- **What:** Converts any numeric timestamp to epoch seconds.
- **Approach:** Delegates to `detectEpochUnit`, divides by 1000 if ms.
- **Time:** O(1)
- **Space:** O(1)
- **Bottleneck:** None.

### 1.3 `epochSecondsToNormalized` — `src/lib/time-domain.ts:14-21`
- **What:** Maps epoch seconds to a 0–100 normalized value based on data range.
- **Approach:** `((epochSeconds - minEpoch) / span) * 100`, with `span = max - min || 1`.
- **Time:** O(1)
- **Space:** O(1)
- **Bottleneck:** Division-by-zero protection uses `|| 1`, which gives 50% for any input when span is 0. This means if min==max, every timestamp normalizes to 50, losing all temporal information. Acceptable as degenerate-case handling.

### 1.4 `normalizedToEpochSeconds` — `src/lib/time-domain.ts:23-30`
- **What:** Inverse: 0–100 normalized value → epoch seconds.
- **Approach:** `min + (normalized / 100) * span`, same `|| 1` fallback.
- **Time:** O(1)
- **Space:** O(1)

### 1.5 `normalizeToPercent` — `src/lib/date-normalization.ts:14-22`
- **What:** Same linear 0–100 normalization but clamped to `[0, 100]`.
- **Approach:** `((realTime - minTime) / (maxTime - minTime)) * 100`, then `Math.max(0, Math.min(100, percent))`.
- **Time:** O(1)
- **Space:** O(1)
- **Key difference from `epochSecondsToNormalized`:** This version clamps output to `[0, 100]`, and returns 50 when `maxTime === minTime`. The `time-domain.ts` version does not clamp output — values can exceed 100 if input falls outside the specified range.

### 1.6 `denormalizeToEpoch` — `src/lib/date-normalization.ts:32-38`
- **What:** Inverse of `normalizeToPercent` (0–100 → epoch seconds).
- **Approach:** `minTime + (percent / 100) * (maxTime - minTime)`.
- **Time:** O(1) / **Space:** O(1)

### 1.7 `normalizedRangeToEpoch` / `epochRangeToNormalized` — `src/lib/date-normalization.ts:48-76`
- **What:** Batch range conversion (pairs of values) using above functions.
- **Time:** O(1) each (two calls to the single-value functions).
- **Space:** O(1)
- **Note:** These do NOT clamp individually — values outside `[0,100]` can produce epoch times outside the original data range. This is by design (allows zooming).

### 1.8 `resolutionToSeconds` — `src/lib/time-domain.ts:42-44`
- **What:** Maps symbolic `TimeResolution` to seconds, using fixed lookup table.
- **Approach:** Record lookup with `?? 1` fallback for unknown entries.
- **Time:** O(1)
- **Space:** O(1) (constant table)
- **Note:** Uses Gregorian approximations: 30 days = month, 365 days = year. Good for approximate binning.

### 1.9 `resolutionToNormalizedStep` — `src/lib/time-domain.ts:46-55`
- **What:** Converts resolution to a normalized 0–100 step size.
- **Approach:** `(resolutionToSeconds(resolution) / span) * 100`
- **Time:** O(1)
- **Space:** O(1)

---

## 2. Time Range Algorithms

### 2.1 `normalizeTimeRange` — `src/lib/time-range.ts:14-30`
- **What:** Accepts multiple range formats (tuple, object with start/end, object with startEpoch/endEpoch) and returns a validated `[min, max]` tuple or null.
- **Approach:** Type dispatch → extract values → validate with `Number.isFinite` → sort to `[min, max]`.
- **Time:** O(1)
- **Space:** O(1)
- **Structures:** Union type `TimeRangeLike`, tuple `TimeRangeTuple`.
- **Bottleneck:** Per-call allocation of tuple. Acceptable.

### 2.2 `normalizeTimeRangeBounds` — `src/lib/time-range.ts:32-40`
- **What:** Wraps `normalizeTimeRange` returning `{ start, end }` object.
- **Time:** O(1) / **Space:** O(1) (allocates object).

### 2.3 `timeRangeOverlapsDomain` — `src/lib/time-range.ts:42-48`
- **What:** Boolean check if a range overlaps `[domainStart, domainEnd]`.
- **Approach:** Normalize, then `end >= domainStart && start <= domainEnd`.
- **Time:** O(1) / **Space:** O(1)

### 2.4 `clampTimeRangeToDomain` — `src/lib/time-range.ts:50-63`
- **What:** Clips a time range to fit within a domain, returns null if the result would be empty or invalid.
- **Approach:** `Math.max(normalized[0], domainStart)` / `Math.min(normalized[1], domainEnd)`, return null if `end <= start`.
- **Time:** O(1) / **Space:** O(1)

---

## 3. Timeline Series Sampling

### 3.1 `sampleTimelinePoints` — `src/lib/timeline-series.ts:5-10`
- **What:** Downsamples a number array to a maximum of 100,000 points via stride sampling.
- **Approach:** Wraps `downsampleNumbers` with default cap.
- **Time:** O(n) where n = points.length.
- **Space:** O(maxPoints) output array.

### 3.2 `selectTimelinePointsInRange` — `src/lib/timeline-series.ts:12-16`
- **What:** Filters timestamp array to points within a given `[start, end]` range.
- **Approach:** `points.filter(value => value >= start && value <= end)`.
- **Time:** O(n) linear scan.
- **Space:** O(k) where k = count of matching points.
- **Bottleneck:** No early exit; entire array scanned even if range is very narrow at start. For 100k+ arrays with early-range queries, could skip later elements if array were sorted. However, the function assumes unsorted input.

---

## 4. Downsampling

### 4.1 `downsampleArray<T>` — `src/lib/downsample.ts:7-15`
- **What:** Generic stride-based downsampling for any array type.
- **Approach:** `stride = Math.ceil(arr.length / maxPoints)`, then `result.push(arr[i])` for `i += stride`.
- **Time:** O(newLength) ≈ O(maxPoints)
- **Space:** O(maxPoints)
- **Key behavior:** Uses `Math.ceil(stride)` which can produce results shorter than `maxPoints` when `arr.length` is not a clean multiple of `stride`. This is a uniform stride sampler — it does NOT preserve spikes or outliers.

### 4.2 `downsampleNumbers` — `src/lib/downsample.ts:18-27`
- **What:** Optimized number-array stride sampling with pre-allocated array.
- **Approach:** Same as generic but uses `new Array(newLength)` pre-allocation.
- **Time:** O(newLength)
- **Space:** O(newLength)
- **Improvement over generic:** Pre-allocates result array instead of pushing. ~2x faster.

### 4.3 `downsampleByStride` — `src/lib/downsample.ts:30-46`
- **What:** Columnar data downsampler that applies stride sampling to each typed array column (Float32, Float64, Uint8, string[]).
- **Approach:** Computes stride once, then delegates each column to a type-specific helper.
- **Time:** O(maxPoints * numColumns) — typically 5–8 columns.
- **Space:** O(maxPoints * numColumns) output allocation.
- **Bottleneck:** Memory allocation for each typed array column. Each downsampled column allocates a new TypedArray. With 8 columns and 100k maxPoints, that's ~3.2MB per call.
- **Improvement:** Could share a single index array and use views if the stride were uniform, but typed arrays don't support non-contiguous views.

### 4.4 Type-specific helpers: `downsampleFloat32`, `downsampleFloat64`, `downsampleUint8`, `downsampleStrings` — `src/lib/downsample.ts:48-70`
- **What:** Individual column stride sampling.
- **Approach:** `result[i] = arr[i * stride]` in tight loops.
- **Time:** O(newLength) each.
- **Space:** O(newLength) each.
- **Bottleneck:** `downsampleStrings` uses dynamic push, while typed arrays are pre-allocated. Inconsistent pattern.

---

## 5. Binning Engine — Core Algorithm

### 5.1 `generateBins` — `src/lib/binning/engine.ts:26-103`
- **What:** Dispatcher function that selects and runs the appropriate binning strategy based on `BinningConfig.strategy`. Supports 14 strategies.
- **Approach:** Switch-case dispatching. If `domain` is degenerate (`[0,0]`), auto-computes min/max from data via `Math.min(...data.map(...))` and `Math.max(...data.map(...))`.
- **Time:** O(n) for domain detection (double scan), plus O(strategy-run) for the actual binning.
- **Space:** O(k) where k = number of output bins.
- **Bottleneck:** Domain auto-detection uses `Math.min(...data.map(...))` which creates an intermediate array of size n, then spreads it. For 8.5M records this will stack-overflow or OOM. See improvement below.
- **🔴 Improvement:** Replace `Math.min(...data.map(d => d.timestamp))` with a single `reduce` pass:
  ```typescript
  let minTime = Infinity, maxTime = -Infinity;
  for (const d of data) {
    if (d.timestamp < minTime) minTime = d.timestamp;
    if (d.timestamp > maxTime) maxTime = d.timestamp;
  }
  ```
  This avoids allocating an O(n) intermediate array and the spread operator's argument length limit.

### 5.2 `generateIntervalBins` — `src/lib/binning/engine.ts:339-375`
- **What:** Fixed-interval binning: assigns events to bins of duration `intervalMs`.
- **Approach:** 
  1. For each event, compute `binStart = Math.floor(timestamp / intervalMs) * intervalMs`
  2. Group by `binStart` using `Map<number, CrimeEventData[]>`
  3. For each group, compute average timestamp, deduplicate crime types/districts
- **Time:** O(n) for grouping + O(k * m log m) for per-bin sorts (k bins, m avg events per bin).
- **Space:** O(n) for the map values (all events stored across bins).
- **Data Structures:** `Map<number, CrimeEventData[]>`
- **Bottleneck:** The Map stores all CrimeEventData references; memory is O(n). Per-bin sorting is O(m log m) per bin.
- **Improvement:** Inline aggregations (running sum, running min/max) instead of storing all events per bin. Currently stores everything, then sorts each bin just to compute avgTimestamp. The avg can be computed incrementally: `runningSum += timestamp; count++`.

### 5.3 `generateMonthlyBins` — `src/lib/binning/engine.ts:380-426`
- **What:** Calendar month binning using `new Date()` to extract year/month.
- **Approach:** 
  1. For each event, create key `"YYYY-MM"` from `new Date(timestamp)`
  2. Group using `Map<string, CrimeEventData[]>`
  3. Compute calendar boundaries via `new Date(year, month, 1)` / `new Date(year, month+1, 1)`
- **Time:** O(n) for grouping + O(k m log m) for per-bin sorting.
- **Space:** O(n) for map values.
- **Bottleneck:** Same per-bin storage issue as `generateIntervalBins`. Additionally, the sort step `Array.from(monthlyBins.entries()).sort(...)` uses localeCompare on date strings — less efficient than a numeric sort.
- **Improvement:** Sort numerically on `year * 12 + month` instead of string localeCompare. Use incremental avg.

### 5.4 `generateUniformDistributionBins` — `src/lib/binning/engine.ts:265-284`
- **What:** Equal-event-count bins: each bin gets exactly `eventsPerBin` events.
- **Approach:** 
  1. Sort all events by timestamp: O(n log n)
  2. Slice into chunks of size `Math.ceil(n / maxBins)`: O(n)
- **Time:** O(n log n) due to full sort.
- **Space:** O(n) for the sorted copy.
- **Bottleneck:** Full sort of all events is O(n log n). For 8.5M records this is expensive.
- **Improvement:** If data is already sorted or mostly sorted (plausible for timestamped crime data), use a stable sort or detect pre-sorted order. Alternative: approximate with a streaming algorithm.

### 5.5 `generateUniformTimeBins` — `src/lib/binning/engine.ts:289-299`
- **What:** Equal-time-span bins: divides domain into `maxBins` equal parts, delegates to `generateIntervalBins`.
- **Approach:** `binSpan = (end - start) / maxBins`, then call `generateIntervalBins`.
- **Time:** O(n) + generateIntervalBins cost.
- **Space:** O(n)

### 5.6 `generateBurstinessBins` — `src/lib/binning/engine.ts:228-260`
- **What:** Gap-based burst detection: splits bins wherever the inter-event gap exceeds a threshold.
- **Approach:**
  1. Sort all events: O(n log n)
  2. Single pass: if `gap > minGap || currentBin.length >= burstThreshold`, start new bin
- **Time:** O(n log n) for sort + O(n) for pass.
- **Space:** O(n) for sorted copy + O(n) for output bins.
- **Bottleneck:** Like `generateUniformDistributionBins`, the full sort dominates.
- **Improvement:** Since timestamp data may arrive monotonically, skip the copy+sort when input is already sorted by timestamp. The function currently always copies with `[...data].sort(...)`.

### 5.7 `generateDaytimeHeavyBins` / `generateNighttimeHeavyBins` — `src/lib/binning/engine.ts:108-182`
- **What:** Diurnal split: separates events into day (6AM–6PM) and night (6PM–6AM), then applies interval binning with different granularities (3h day, 4h night).
- **Approach:**
  1. Linear scan: classify each event by `new Date(event.timestamp).getHours()`: O(n)
  2. Generate sub-bins for each group using `generateIntervalBins`: O(n)
- **Time:** O(n) classification + O(n) binning.
- **Space:** O(n) for the two partition arrays.
- **Bottleneck:** `new Date(event.timestamp).getHours()` creates a Date object per event. This is costly in tight loops.
- **🔴 Improvement:** Use a UTC-based hour calculation instead of `new Date()`:
  ```typescript
  const hour = (Math.floor(timestamp / 3600000) % 24 + 24) % 24;
  ```
  This avoids Date object allocation entirely and is ~50x faster in tight loops.

### 5.8 `generateCrimeTypeBins` — `src/lib/binning/engine.ts:187-223`
- **What:** Groups events by crime type, creates one bin per type.
- **Approach:** 
  1. `Map<string, CrimeEventData[]>` grouping: O(n)
  2. For each type, sort events and compute range: O(k * m log m)
- **Time:** O(n) for grouping + O(k m log m) for per-type sorting.
- **Space:** O(n) for map values.
- **Bottleneck:** The per-type sort is unnecessary — only `sorted[0]` and `sorted[sorted.length-1]` are used, plus the average. These can be computed in a single pass without sorting: track `min, max, sum, count`.
- **🔴 Improvement:** Replace per-type sort with running min/max/sum:
  ```typescript
  for (const [type, events] of typeGroups) {
    let minT = Infinity, maxT = -Infinity, sum = 0;
    for (const e of events) {
      if (e.timestamp < minT) minT = e.timestamp;
      if (e.timestamp > maxT) maxT = e.timestamp;
      sum += e.timestamp;
    }
    // use minT, maxT, sum/events.length
  }
  ```
  This reduces O(m log m) to O(m) per type.

### 5.9 `generateWeekdayWeekendBins` — `src/lib/binning/engine.ts:304-334`
- **What:** Separates weekday from weekend events, then applies uniform distribution binning to each group.
- **Approach:** 
  1. Linear scan, classify by `new Date(event.timestamp).getDay()`: O(n)
  2. `generateUniformDistributionBins` on each partition (O(n log n) each)
- **Time:** O(n) + O(n log n) = O(n log n) due to sorts.
- **Space:** O(n) for partition arrays.
- **Bottleneck:** Same `new Date()` per event issue, plus full sorts on each partition.
- **Improvement:** Use epoch-arithmetic day-of-week calculation instead of Date objects. Consider that uniform-distribution is called twice, doubling sort cost.

### 5.10 `generateAutoAdaptiveBins` — `src/lib/binning/engine.ts:431-468`
- **What:** Automatically selects the best strategy based on the coefficient of variation (CV) of inter-event gaps.
- **Approach:**
  1. Sort events: O(n log n)
  2. Compute average gap and variance in one pass: O(n)
  3. CV = σ/μ; if CV > 2 → burstiness strategy, else if n > 1000 → uniform distribution, else → uniform time
- **Time:** O(n log n) due to sort.
- **Space:** O(n) for sorted copy.
- **Bottleneck:** The sort is done before checking whether it's needed. If n > 1000, a sort is still done before switching to uniform distribution (which sorts again internally).
- **🔴 Improvement:** Use a streaming approximation for CV (Welford's online algorithm) to avoid the sort entirely for the decision phase. Only sort once the strategy is chosen, if that strategy needs sorted data.

---

## 6. Post-Processing & Validation

### 6.1 `validateConstraints` — `src/lib/binning/rules.ts:247-279`
- **What:** Checks each bin against min/max events, min/max time span, and max bins.
- **Approach:** Linear scan of bins, building error array.
- **Time:** O(k) where k = number of bins.
- **Space:** O(e) where e = number of errors found.

### 6.2 `mergeSmallBins` — `src/lib/binning/rules.ts:284-316`
- **What:** Merges bins that are too small to satisfy constraints, using a greedy approach.
- **Approach:**
  1. Sort bins by count ascending: O(k log k)
  2. Greedy accumulate: merge consecutive small bins until `minEvents` is reached
  3. Re-sort by startTime: O(k log k)
- **Time:** O(k log k)
- **Space:** O(k)
- **🔴 Bottleneck:** The greedy algorithm merges bins that may not be temporally adjacent (they're sorted by count, not by time). The resulting merged bin spans from the first to last merged bin's time, which could be non-contiguous in time. This is a correctness issue — the merge should preserve temporal contiguity by merging adjacent bins in time order, then selecting the smallest ones.
- **Improvement:** Restructure to: (1) identify adjacent bins that violate constraints, (2) merge adjacent violators only, (3) use a priority queue to pick the cheapest merge pair.

### 6.3 `mergeBinArray` — `src/lib/binning/rules.ts:318-328`
- **What:** Merges multiple bins into one aggregated bin.
- **Approach:** Min startTime, max endTime, sum counts, union of crimeTypes/districts, weighted avg timestamp.
- **Time:** O(k) for aggregation over merged bins.
- **Space:** O(1) for the output bin.

---

## 7. Comparable Warp Scaling (Width Allocation)

### 7.1 `scoreComparableWarpBins` — `src/lib/binning/warp-scaling.ts:108-163`
- **What:** Scores bins relative to their peers for adaptive time warping. Computes `peerRelativeScore = bin.count / average` and maps to a `warpWeight`.
- **Approach:**
  1. Validate all bins: same granularity, valid fields
  2. Compute total count and peer average: O(k)
  3. For each bin: `peerRelativeScore = count / average`, `warpWeight = clamp(score * hintWeight)`, `normalizedScore = 0.5 + (peerRelativeScore - 1) * 0.5`
  4. Neutral fallback if all scores ≈ 1 and hint weights ≈ 1
- **Time:** O(k) where k = number of bins.
- **Space:** O(k) for scored output.
- **Structures:** `ComparableWarpBinInput` → `ComparableWarpScore`.
- **Edge Cases:** Handles empty arrays, invalid bins, zero total count, non-finite values (all fallback to neutral with warpWeight=1).

### 7.2 `buildComparableWarpMap` — `src/lib/binning/warp-scaling.ts:165-226`
- **What:** Builds actual warp boundaries from scored bins, allocating normalized width proportional to warp weight with a minimum width floor.
- **Approach:**
  1. Optionally scores bins if not already scored: O(k)
  2. Compute `weights = bin.warpWeight`, `totalWeight = sum(weights)`: O(k)
  3. Compute `minimumWidthShare = clamp(width / binCount)`: O(1)
  4. `widthShares[i] = minShare + (weight[i] / totalWeight) * remainingShare`: O(k)
  5. Normalize shares to sum to 1: O(k)
  6. Build `Float32Array` boundaries via cumulative sum: O(k)
- **Time:** O(k)
- **Space:** O(k) for `Float32Array` of boundaries (k+1) + scored bins.
- **Key insight:** The minimum width floor prevents any bin from being invisible when its neighbor is very heavy. The formula `minShare + (weight/totalWeight) * (1 - k*minShare)` guarantees all widths ≥ minShare and sum to 1.

### 7.3 Helper functions — `src/lib/binning/warp-scaling.ts:42-106`
- **`clampComparableWarpWeight` (69-78):** Clamps weight to `[min, max]`. O(1).
- **`clampMinimumWidthShare` (62-67):** Caps share at `max(0.45, 1/(2*binCount))` to prevent any single bin from dominating. O(1).
- **`toComparableScore` (89-106):** Builds a `ComparableWarpScore` from raw input. O(1).

---

## 8. Burst Taxonomy (Window Classification)

### 8.1 `classifyBurstWindow` — `src/lib/binning/burst-taxonomy.ts:104-182`
- **What:** Classifies a time window's density into one of four categories: `prolonged-peak`, `isolated-spike`, `valley`, or `neutral`.
- **Approach:** Rule-based decision tree using the window's normalized density value, count, duration, and neighbor statistics:
  1. Compute neighbor median/max/min from `neighborhood[]`: O(k)
  2. Determine `highContrast` (value ≥ 0.72 or ≥ neighborMedian + 0.16)
  3. Determine `lowContrast` (value ≤ 0.30 or ≤ neighborMedian - 0.16)
  4. Determine shape: `isolatedShape` (duration ≤ 90s), `sustainedShape` (duration ≥ 180s or count ≥ 3)
  5. Apply decision tree with tie-breaking rules
- **Time:** O(k) where k = number of neighbors (typically small, 2–10).
- **Space:** O(1).
- **Constants:** Global high threshold = 0.72, global low = 0.30, contrast delta = 0.16, neighbor support fraction = 0.84.
- **Bottleneck:** Each call recomputes median of neighbor values, which sorts a small array. Acceptable for small k.
- **Improvement:** For the typical case of 2 neighbors, the median sort is trivial. No improvement needed.

### 8.2 `deriveBurstConfidence` — `src/lib/binning/burst-taxonomy.ts:76-102`
- **What:** Computes confidence score (0–100) for a burst classification using contrast, neighbor support, and a shape bonus.
- **Approach:** `0.46 * contrast + 0.34 * support + shapeBonus`, clamped to [0, 100].
- **Shape bonuses:** prolonged-peak = 0.22, isolated-spike = 0.18, valley = 0.16, neutral = 0.08.
- **Time:** O(k) where k = neighbor count.
- **Space:** O(1)

### 8.3 `normalizeScore` — `src/lib/binning/burst-taxonomy.ts:60-74`
- **What:** Combines value, count, and duration into a 0–100 burst score.
- **Approach:** `round(clamp01(valueMedian * 0.6 + countScore * 0.2 + durationScore * 0.2) * 100)` where `countScore = count / (count + 2)` and `durationScore = duration / (duration + 120)`.
- **Time:** O(k log k) due to median computation over k+1 values.
- **Space:** O(k) for sorted copy.

### 8.4 Helper functions — `src/lib/binning/burst-taxonomy.ts:34-58`
- **`median` (34-41):** Sorts copy and returns middle value. O(k log k), O(k) space.
- **`average` (43-46):** Simple sum/count. O(k), O(1) space.

---

## 9. Aggregation & SQL Query Algorithms

### 9.1 `computeWarpMap` — `src/lib/queries/aggregations.ts:43-64`
- **What:** Builds a cumulative warp map from a normalized density array, using weight = `1 + density * 5`.
- **Approach:**
  1. Compute weights and totalWeight: O(k)
  2. Accumulate `warpMap[i] = start + (accumulated / totalWeight) * span`: O(k)
- **Time:** O(k) where k = bin count.
- **Space:** O(k) for weights and warpMap Float32Arrays.

### 9.2 `smoothSeries` — `src/lib/queries/aggregations.ts:25-41`
- **What:** Simple moving average smoother over a Float32Array with configurable kernel width.
- **Approach:** For each `i`, average values in `[i-kernelWidth, i+kernelWidth]`. Edge boundaries are handled by counting only valid indices.
- **Time:** O(k * w) where k = array length, w = 2*kernelWidth+1.
- **Space:** O(k) for the output array.
- **Bottleneck:** O(k * w) is O(k²) in the worst case when kernelWidth ≈ k/2. For a kernel width of 200 and 5000 bins, that's 2M operations — acceptable, but the inner loop over count/neighbors could use a prefix sum for O(k) sliding window.
- **🔴 Improvement:** Use a two-pass prefix-sum approach:
  ```typescript
  // Build prefix sums
  const prefix = new Float32Array(values.length + 1);
  for (let i = 0; i < values.length; i++) 
    prefix[i + 1] = prefix[i] + values[i];
  // Query each window in O(1)
  for (let i = 0; i < values.length; i++) {
    const left = Math.max(0, i - kernelWidth);
    const right = Math.min(values.length - 1, i + kernelWidth);
    const windowSum = prefix[right + 1] - prefix[left];
    const windowCount = right - left + 1;
    smoothed[i] = windowSum / windowCount;
  }
  ```
  This reduces from O(k*w) to O(k).

### 9.3 `buildAdaptiveDensityQuery` — `src/lib/queries/aggregations.ts:162-177`
- **What:** Builds a SQL query that bins timestamps into `binCount` bins for density computation.
- **Approach:** `idx = LEAST(FLOOR(((ts - domainStart) / span) * binCount), binCount - 1)`, then `GROUP BY idx`.
- **Time:** Executed by DuckDB — query complexity depends on data size.
- **Key detail:** Uses `LEAST(FLOOR(...), binCount - 1)` to clamp the last bin. This means the final bin captures values exactly at `domainEnd`. All earlier bins use `FLOOR` truncation.

### 9.4 `buildAdaptiveBurstQuery` — `src/lib/queries/aggregations.ts:179-203`
- **What:** Builds SQL query computing per-bin burst statistics using window functions (LAG).
- **Approach:**
  1. CTE `ordered`: compute `ts` and `delta = ts - LAG(ts)` per event: O(n) on database
  2. CTE `binned`: assign each delta to a bin index
  3. Output: `COUNT(delta)`, `SUM(delta)`, `SUM(delta^2)` per bin
- **Space:** Intermediate result size = n rows (full dataset).
- **Key detail:** `SUM(delta * delta)` as `ss` is used to compute variance via `Var = E[X²] - E[X]²` in the worker, not in SQL.

### 9.5 `buildDensityBinsQuery` — `src/lib/queries/aggregations.ts:207-267`
- **What:** Builds a 3D density bin query for the space-time cube, with configurable x/y/z resolution.
- **Approach:**
  1. Compute normalized lon/lat bin indices using precomputed coordinate ranges
  2. Compute time bin index using `FLOOR(((EXTRACT(EPOCH FROM "Date") - minEpoch) / (maxEpoch - minEpoch) * resY))`
  3. GROUP BY ix, iy, iz
  4. Output: center coordinates `(ix+0.5)/res*100 - 50`, count, and mode of crime types
- **Time:** Database-side: O(n) scan + GROUP BY.
- **Space:** Up to resX * resY * resZ output rows.
- **Note:** Uses hard-coded min/max epochs: 978307200 (2001-01-01) to 1767225600 (2026-01-01). The query's WHERE clause also filters by the user-specified `startEpoch/endEpoch`, so the global range is just for normalization. This hard-coding should match the data's actual date range or the normalization will produce skewed bin indices.

### 9.6 `buildCrimesInRangeQuery` — `src/lib/queries/builders.ts:21-62`
- **What:** Builds SQL query for fetching crime records within a time range, with optional stride sampling.
- **Approach:** If `sampleStride > 1`, uses a CTE with `ROW_NUMBER()` and modulo filtering for determinism.
- **Time:** Database-side: O(n) scan.
- **Bottleneck:** `ROW_NUMBER() OVER ()` requires a full scan and sort-like window operation.
- **Improvement:** For stride sampling, a simpler approach would be `WHERE (rowid % ?) = 0` if the table has a rowid, avoiding the window function entirely.

### 9.7 `buildAdaptiveTimestampQuery` — `src/lib/queries/aggregations.ts:150-160`
- **What:** Fetches sorted epoch timestamps for a given domain.
- **Approach:** `SELECT EXTRACT(EPOCH FROM "Date") ... ORDER BY "Date" ASC`
- **Time:** Database-side: O(n log n) if sort needed.
- **Space:** Full result set transmitted to client.

### 9.8 `buildCrimeRangeFilters` — `src/lib/queries/filters.ts:17-41`
- **What:** Builds SQL WHERE clause fragment with time range, coordinate-non-null, and optional type/district IN-list filters.
- **Approach:** Concatenates fragments with ` AND `. Builds parameterized `IN (?, ?, ...)` placeholders.
- **Time:** O(k) where k = number of filter values.
- **Space:** O(k) for params array.

---

## 10. DuckDB Aggregator

### 10.1 `getAggregatedBins` — `src/lib/duckdb-aggregator.ts:36-101`
- **What:** DuckDB-based 3D histogram: bins crime data into a resX × resY × resZ grid.
- **Approach:** SQL query with:
  1. `FLOOR(((lon - minLon) / (maxLon - minLon)) * resX)` for longitude bin
  2. `FLOOR(((epoch - minEpoch) / (maxEpoch - minEpoch)) * resY)` for time bin
  3. `FLOOR(((lat - minLat) / (maxLat - minLat)) * resZ)` for latitude bin
  4. GROUP BY + mode() for dominant type
- **Time:** Database-side: O(n) scan + GROUP BY aggregation.
- **Bottleneck:** SQL injection risk: types and districts are interpolated directly into the query string (lines 51-57) without sanitization:
  ```typescript
  const typeList = types.map(t => `'${t}'`).join(',');
  whereClause += ` AND "Primary Type" IN (${typeList})`;
  ```
  If a type name contains a single quote, this injects a syntax error or SQL injection.
- **🔴 Improvement:** Use parameterized queries via `db.all()` params instead of string interpolation.
- **Note:** This file duplicates logic also found in `buildDensityBinsQuery` in `queries/aggregations.ts`, but with hard-coded coordinate bounds instead of using the `coordinate-normalization.ts` utilities. This is a duplication of concern.

### 10.2 `generateMockBins` — `src/lib/duckdb-aggregator.ts:15-34`
- **What:** Fallback mock data generator using random coordinates and types.
- **Approach:** Cap at 100 bins, random indices.
- **Time:** O(min(resX*resY*resZ, 100))
- **Space:** O(same)

---

## 11. Adaptive Time Worker (Web Worker)

### 11.1 `computeAdaptiveMaps` — `src/workers/adaptiveTime.worker.ts:62-238`
- **What:** Core web worker algorithm that computes density, count, burstiness, and warp maps from raw timestamps. Supports two binning modes: `uniform-time` and `uniform-events`.
- **Approach:**

#### Uniform-Time Mode (default):
1. Filter valid timestamps: O(n)
2. Sort valid timestamps: O(n log n)
3. For each timestamp, compute `norm = (t - tStart) / tSpan`, bin index = `FLOOR(norm * binCount)`: O(n)
4. Smooth density with kernel (if kernelWidth > 1): O(k * w)
5. Normalize density to [0, 1]: O(k)
6. Compute warp weights: `weight = 1 + normalizedDensity * 5`: O(k)
7. Build warp map via cumulative accumulation: O(k)
8. Compute burstiness per bin using inter-event gaps:
   - For each adjacent pair: O(n)
   - Per bin: `burstiness = (σ - μ) / (σ + μ)`, then normalize to [0, 1]
9. Output 4 Float32Arrays

#### Uniform-Events Mode:
1. Compute bin boundaries via quantile sampling: `boundaries[i] = sorted[FLOOR(i * n / binCount)]`: O(k)
2. Ensure strict monotonicity (clamp boundaries): O(k)
3. Assign each timestamp to a boundary via binary search (`findBoundaryBin`): O(n log k)
4. Compute density as `count / width` per bin: O(k)
5. Same smoothing, warp, burstiness steps as uniform-time.

- **Time:** O(n log n) for sort + O(n) for counting + O(k * w) for smoothing + O(n) for burstiness. In uniform-events mode, adds O(n log k) for binary search assignment.
- **Space:** O(n) for filtered+ sorted timestamps + O(k) for each output map (4 maps × k).
- **Data Structures:** Four Float32Arrays of length binCount: `densityMap`, `burstinessMap`, `warpMap`, `countMap`.

#### Key Mathematical Details:
- **Warp formula:** `warpMap[i] = start + (accumulatedWeight / totalWeight) * span`. The warp map gives the x-axis position where bin `i` ends in the time domain.
- **Burstiness formula:** `(σ - μ) / (σ + μ)` → normalized to `[0, 1]` via `(burstiness + 1) / 2`. Values > 0.5 indicate bursty (σ > μ, overdispersed), < 0.5 indicate regular (σ < μ, underdispersed).
- **Smoothing kernel:** Simple box filter of width `2*kernelWidth + 1`. Kernel width of 1 means average of 3 neighbors.

### 11.2 `findBoundaryBin` — `src/workers/adaptiveTime.worker.ts:48-60`
- **What:** Binary search to find which bin a timestamp belongs to given sorted boundaries.
- **Approach:** Lower-bound binary search: array is `Float32Array` of length binCount+1.
- **Time:** O(log k) where k = binCount.
- **Space:** O(1).
- **Correctness:** Searches for the rightmost boundary where `boundaries[mid] < value`. Returns `low` (0-indexed). This correctly handles the case where `value` equals a boundary — it goes into the left bin.

### 11.3 `ensureStrictlyMonotonicBoundaries` — `src/workers/adaptiveTime.worker.ts:30-46`
- **What:** Fixes non-strictly-increasing boundaries by pushing each to `previous + EPSILON`.
- **Approach:** Linear scan, clamp to previous + 1e-6. Final boundary = `max(domainEnd, previous + EPSILON)`.
- **Time:** O(k)
- **Space:** O(1) (in-place modification)

---

## 12. Store-Level Time Algorithms

### 12.1 `useTimeStore` — `src/store/useTimeStore.ts:1-83`
- **What:** Zustand store managing `currentTime` (0–100), playback state, time range, speed, resolution, and scale mode.
- **Algorithms:**
  - **`clampToRange`** (line 10-12): Clamps a value to `[min, max]`. O(1).
  - **`normalizeRange`** (line 14-21): Ensures `start <= end`. O(1).
  - **`stepTime`** (line 56-61): Steps `currentTime` by `direction * TIME_STEP_DEFAULT` (1). O(1).

### 12.2 `useTimelineDataStore` — `src/store/useTimelineDataStore.ts:1-293`
- **What:** Manages columnar crime data, overview timestamps, and bounds.
- **Algorithms:**
  - **`getBounds`** (line 17-40): Single-pass min/max over `ArrayLike<number>`. O(n).
  - **`generateMockData`** (line 80-112): Generates random crime data, sorts by timestamp. O(n log n).
  - **`loadSummaryData`** (line 114-166): Fetches overview timestamps from API.
  - **`loadRealData`** (line 168-292): Fetches Arrow IPC stream, parses `RecordBatchReader`, converts typed arrays. Critical path:
    - For each row (n = 8.5M): converts timestamp via `toEpochSeconds()` and `epochSecondsToNormalized()`.
    - Maps crime type strings to uint8 IDs via `getCrimeTypeId()`.
    - Double-scans each column for bounds if meta is null.

### 12.3 `useBinningStore` — `src/store/useBinningStore.ts:1-297`
- **What:** Stateful binning store with undo, configuration management, and bin manipulation.
- **Algorithms:**
  - **`computeBins`** (line 84-111): Wraps `generateBins` in a `setTimeout(0)` for non-blocking execution. This prevents the store update from being synchronous but relies on browser's event loop.
  - **`mergeBins`** (line 117-153): Finds bins by ID, sorts by startTime, creates merged bin. **O(k log k)** where k = merged count.
  - **`splitBin`** (line 155-194): Splits at time point with `Math.floor(count/2)` for left bin. **O(k)**.
  - **`resizeBin`** (line 210-231): Maps over bins, updates matching ID. **O(k)**.

### 12.4 `useTimeslicingModeStore` — `src/store/useTimeslicingModeStore.ts:1-425`
- **What:** Manages time-slice generation workflow: create, review, apply, merge, split, delete.
- **Algorithms:**
  - **`mergeBins`** (line 112-142): Finds by ID, sorts, merges with weighted avg. **O(k log k)**.
  - **`splitBin`** (line 144-179): Splits at boundary, validates within range. **O(k)**.
  - **`applyGeneratedBins`** (line 394-408): Delegates to `useSliceDomainStore.replaceSlicesFromBins`.
  - **`areGenerationInputsEqual`** (line 46-51): Shallow comparison of generation inputs to avoid redundant computation. **O(k)** for crime type string arrays.

### 12.5 `useSliceDomainStore` (core slice) — `src/store/slice-domain/createSliceCoreSlice.ts:1-439`
- **Algorithms:**
  - **`toNormalizedStoreRange`** (line 16-41): Multi-source normalization — checks if input is already in 0-100 range, otherwise falls back to timeline data store's epoch bounds, then adaptive store's `mapDomain`. **O(1)**.
  - **`toNormalizedBinRange`** (line 75-81): Converts bin `[startTime, endTime]` to normalized `[0, 100]` using the domain. **O(1)**.
  - **`getOverlapCounts`** (line 117-148): O(n²) pairwise overlap detection. For each visible range, checks against every other visible range. **O(v²)** where v = visible range slices. For 100 slices, this is 4950 comparisons — fine. For 1000+, would be 500k — problematic.
  - **`sortSlices`** (line 50-68): Stable-ish sort by start time, then burst status. **O(s log s)**.
  - **`addBurstSlice`** (line 192-225): Checks for existing matching burst slice via `findMatchingSlice`, then creates if unique. Handles deduplication.
  - **`replaceSlicesFromBins`** (line 374-436): Converts array of bins to `TimeSlice[]` with taxonomy metadata. **O(k)**.

### 12.6 `focusTimelineRange` — `src/lib/slice-utils.ts:51-107`
- **What:** Coordinates multiple stores to focus on a specific time range. Handles both normalized (0-100) and epoch inputs.
- **Approach:** Uses heuristic: if range is within [0, 100], treat as normalized, else as epoch. Then converts bidirectionally (epoch→normalized and normalized→epoch) to set all store values consistently.
- **Time:** O(1).
- **Bottleneck:** The heuristic `looksNormalized = rangeStart >= 0 && rangeEnd <= 100` is ambiguous for data spans of ~100 seconds. For epoch ranges within [0, 100], it would incorrectly treat them as normalized. For crime data (epoch range ~978M), this is not a problem.

---

## 13. Selection Algorithms

### 13.1 `findNearestIndexByTime` — `src/lib/selection.ts:76-119`
- **What:** Brute-force linear scan to find the crime event closest to a given timestamp.
- **Approach:** Full scan with `Math.abs(timestampSec - targetSec)` distance. **O(n)** with n = all crime events.
- **Space:** O(1).
- **Bottleneck:** O(n) scan over all 8.5M events. Each iteration calls `getTimestampSec` which may call `normalizedToEpochSeconds`. This is the most expensive selection operation.
- **🔴 Improvement:** Pre-sort events by timestamp and use binary search (`O(log n)`). The events are already loaded in order (from the SQL `ORDER BY`), so binary search would reduce 8.5M comparisons to ~24.

### 13.2 `findNearestIndexByScenePosition` — `src/lib/selection.ts:121-166`
- **What:** Brute-force linear scan to find the crime event closest to a (x, z) 3D point.
- **Approach:** Full scan using `Math.hypot(dx, dz)`. **O(n)**.
- **Space:** O(1).
- **Bottleneck:** Same as above — O(n) scan with no spatial index. `Math.hypot` is also slower than `dx*dx + dz*dz` due to internal sqrt and overflow protection.
- **🔴 Improvement:** (1) Use squared distance `dx*dx + dz*dz` instead of `Math.hypot` for the comparison, only computing sqrt for the final result. (2) Consider a spatial index (grid-based bucketing or a simple KD-tree for the 3D scene).

### 13.3 `resolvePointByIndex` — `src/lib/selection.ts:52-74`
- **What:** Resolves a crime event by its array index, returning full selection point with lat/lon.
- **Approach:** Checks columnar data first, then flat data. Uses `unproject` to compute lat/lon if not stored.
- **Time:** O(1).

### 13.4 `selectFilteredData` — `src/lib/data/selectors.ts:17-71`
- **What:** Filters crime data by type, district, and time range simultaneously, returning `FilteredPoint[]`.
- **Approach:**
  1. If time range is active, convert it to normalized `[minT, maxT]` by mapping through `normalizeTimeRange` then scaling from epoch to 0-100.
  2. Linear scan: for each point, check type, district, and time range. Build result array.
- **Time:** O(n) scan with per-element checks.
- **Space:** O(k) where k = number of matching points.
- **Bottleneck:** The time range conversion (lines 32-36) is done once but incorrectly handles the normalization when the time range and data timestamps use different scales. The formula `((normalizedRange[0] - minTimestampSec) / span) * 100` assumes the input range is in epoch seconds, but it may already be in normalized 0-100 units. This is a potential correctness bug if `normalizedRange[0] > 100` is not checked.

---

## 14. Projection & Coordinate Algorithms

### 14.1 `project` / `unproject` — `src/lib/projection.ts:35-57`
- **What:** Web Mercator projection between (lat, lon) and 3D scene coordinates (x, z).
- **Approach:** Uses `@math.gl/web-mercator` viewport at zoom 12, tile size 512. Scene origin = Chicago city center.
- **Time:** O(1) per call.

### 14.2 `lonLatToNormalized` / `normalizedToLonLat` — `src/lib/coordinate-normalization.ts:33-45`
- **What:** Linear normalization of Chicago coordinates to [-50, 50] range using hard-coded bounds.
- **Approach:** `((value - min) / span) * 100 - 50`.
- **Time:** O(1) per call.

---

## 15. Cross-Cutting Concerns & Systemic Issues

### 15.1 Duplicate Logic
- `duckdb-aggregator.ts` and `queries/aggregations.ts` both implement 3D density bin queries with hard-coded Chicago bounds. The aggregator uses string interpolation (SQL injection risk), while the query builder uses parameterized queries.

### 15.2 `new Date()` in Tight Loops
- Multiple binning strategies (`generateDaytimeHeavyBins`, `generateNighttimeHeavyBins`, `generateWeekdayWeekendBins`, `generateMonthlyBins`) call `new Date(event.timestamp)` per event. For 8.5M events, this allocates 8.5M Date objects. Use epoch arithmetic instead.

### 15.3 Repeated Sorting
- `generateAutoAdaptiveBins` sorts data to compute CV, then delegates to strategies that also sort. The `generateBins` dispatcher also does a `Math.min(...data.map(...))` scan before the strategy runs. For some strategies, the same data is scanned 3+ times.

### 15.4 Memory Amplification in Binning Engine
- `generateIntervalBins`, `generateMonthlyBins`, `generateCrimeTypeBins` store all events in `Map` values. The events are already in memory (as function parameter), but the map's arrays duplicate references. Each bin's events are stored as a separate array, creating O(n) pointer overhead.

### 15.5 Normalization Ambiguity
- The 0–100 normalized scale is used inconsistently:
  - `time-domain.ts` does NOT clamp to [0, 100]
  - `date-normalization.ts` DOES clamp
  - `selection.ts` assumes raw epoch input
  - `data/selectors.ts` may receive either and uses a heuristic check
  - `createSliceCoreSlice.toNormalizedStoreRange` uses a range check `rawStart >= 0 && rawEnd <= 100`

### 15.6 No Spatial Index for Nearest-Neighbor
- `findNearestIndexByTime` and `findNearestIndexByScenePosition` both use O(n) brute force. For interactive brushing/selection, these run on every mouse movement. At 8.5M records, this blocks the main thread.

---

## 16. Complexity Summary Table

| Algorithm | File:Line | Time | Space | Strategy |
|---|---|---|---|---|
| `detectEpochUnit` | `time-domain.ts:6` | O(1) | O(1) | Threshold comparison |
| `normalizeToPercent` | `date-normalization.ts:14` | O(1) | O(1) | Linear mapping |
| `generateBins` | `binning/engine.ts:26` | O(n)+strategy | O(n) | Switch dispatch |
| `generateIntervalBins` | `binning/engine.ts:339` | O(n + k m log m) | O(n) | Floor-based grouping |
| `generateMonthlyBins` | `binning/engine.ts:380` | O(n + k m log m) | O(n) | Calendar grouping |
| `generateUniformDistributionBins` | `binning/engine.ts:265` | O(n log n) | O(n) | Sort + chunk |
| `generateBurstinessBins` | `binning/engine.ts:228` | O(n log n) | O(n) | Gap threshold |
| `generateAutoAdaptiveBins` | `binning/engine.ts:431` | O(n log n) | O(n) | CV-based selection |
| `mergeSmallBins` | `binning/rules.ts:284` | O(k log k) | O(k) | Greedy by count |
| `scoreComparableWarpBins` | `binning/warp-scaling.ts:108` | O(k) | O(k) | Peer-relative ratio |
| `buildComparableWarpMap` | `binning/warp-scaling.ts:165` | O(k) | O(k) | Weighted allocation |
| `classifyBurstWindow` | `binning/burst-taxonomy.ts:104` | O(k log k) | O(k) | Decision tree |
| `computeAdaptiveMaps` | `workers/adaptiveTime.worker.ts:62` | O(n log n+kw) | O(n+k) | Uniform-time/events |
| `smoothSeries` | `queries/aggregations.ts:25` | O(k w) → O(k) | O(k) | Moving average |
| `computeWarpMap` | `queries/aggregations.ts:43` | O(k) | O(k) | Cumulative weighting |
| `findNearestIndexByTime` | `selection.ts:76` | O(n) | O(1) | Brute force |
| `findNearestIndexByScenePosition` | `selection.ts:121` | O(n) | O(1) | Brute force |
| `getOverlapCounts` | `store/slice-domain/createSliceCoreSlice.ts:117` | O(v²) | O(v) | Pairwise |
| `selectFilteredData` | `data/selectors.ts:17` | O(n) | O(k) | Linear filter |
| `focusTimelineRange` | `slice-utils.ts:51` | O(1) | O(1) | Bidirectional map |
| `downsampleByStride` | `downsample.ts:30` | O(m × c) | O(m × c) | Uniform stride |

Where: n = event count, k = bin count, v = visible slice count, w = kernel width, m = max points, c = column count.

---

## 17. Priority Recommendations

| # | Finding | Severity | Effort | File |
|---|---|---|---|---|
| 1 | O(n) nearest-neighbor with no spatial index | **High** | 2d | `selection.ts` |
| 2 | `new Date()` per event in tight loops | **High** | 1h | `binning/engine.ts` |
| 3 | Domain auto-detect uses spread on mapped array (OOM for large n) | **High** | 15m | `binning/engine.ts:37-39` |
| 4 | Per-bin sort for avgTimestamp (can use running agg) | **Medium** | 2h | `binning/engine.ts` |
| 5 | `smoothSeries` O(k w) instead of O(k) with prefix sum | **Medium** | 30m | `queries/aggregations.ts:25` |
| 6 | `mergeSmallBins` merges non-adjacent bins (correctness) | **Medium** | 1h | `binning/rules.ts:284` |
| 7 | SQL injection risk in `duckdb-aggregator.ts` | **High** | 30m | `duckdb-aggregator.ts:51-57` |
| 8 | Duplicate 3D bin query logic | **Low** | 2h | aggregator vs queries |
| 9 | Repeated sorting in `generateAutoAdaptiveBins` | **Medium** | 1h | `binning/engine.ts:431` |
| 10 | Normalization scale ambiguity across modules | **Medium** | 4h | Multiple files |

---

*Analysis: 30+ algorithms cataloged across 25+ source files. Generated 2026-05-29.*

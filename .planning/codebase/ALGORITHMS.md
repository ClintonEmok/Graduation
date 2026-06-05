# Algorithm Catalog & Analysis

**Analysis Date:** 2026-06-01

## Scope

Complete audit of STKDE, KDE, clustering, hotspot detection, density estimation, temporal boundary detection, binning, burst classification, adaptive time warping, and statistical aggregation algorithms. All in-memory algorithms are in TypeScript; database-accelerated operations run via DuckDB SQL.

---

## Algorithm 1: Grid-Based 2D Spatial Gaussian KDE (STKDE)

| Property | Value |
|----------|-------|
| **Function** | `buildIntensityFromSupport()` |
| **File** | `src/lib/stkde/compute.ts` |
| **Lines** | 117–154 |
| **Approach** | Manual grid-convolution with truncated Gaussian kernel. For each grid cell, iterates over neighbors within `kernelRadius = ceil(3 * sigmaCells)` and accumulates `count * exp(-0.5 * (distance / sigmaCells)^2)`. |
| **Time** | O(rows × cols × K²) where K = kernel radius in cells. K ≈ 3 × (bandwidth / cellSize) / 2. Typical: K=6–20. Worst case (max grid): 12K × 400 ≈ 4.8M weight evaluations. |
| **Space** | O(rows × cols) — two `Float64Array` arrays for support and intensity |
| **Data Structures** | `Float64Array` linearized 2D array (row-major), scalar kernel radius |
| **Bottlenecks** | (1) Brute-force convolution — no FFT, no separable kernel, no integral image. (2) `Math.sqrt` + `Math.exp` evaluated per neighbor cell in nested loops. (3) Gaussian kernel is separable (exp(-0.5×(dr²+dc²)/σ²) = exp(-0.5×dr²/σ²) × exp(-0.5×dc²/σ²)) but not exploited. (4) `r * cols + c` recalculated inside inner loop. |
| **Improvements** | 1. **Separable convolution**: Row pass then column pass reduces O(R·C·K²) → O(R·C·K). 2. **Precompute kernel weights**: Build a 1D Gaussian weight array of size K+1. 3. **Hoist `cols` to local const** and cache `sigmaCells²`. 4. Replace sqrt-based distance with squared distance using `distSq * invTwoSigmaSq`. |

---

## Algorithm 2: Full STKDE Surface Pipeline (raw crimes)

| Property | Value |
|----------|-------|
| **Function** | `computeSingleStkdeSurfaceFromCrimes()` |
| **File** | `src/lib/stkde/compute.ts` |
| **Lines** | 238–391 |
| **Approach** | Filter → sort → bin → KDE → hotspot detection → slice sub-computation. Filters crimes by domain, type, bbox; sorts; assigns to grid cells; runs KDE; normalizes; generates hotspots with temporal peak detection; optionally re-runs pipeline for each slice. |
| **Time** | O(N log N) sorting + O(N) binning + O(R·C·K²) KDE + O(C·M log M) peak detection. Dominated by KDE. |
| **Space** | O(N + R·C) for crimes copy + grid arrays + per-cell timestamp arrays |
| **Bottlenecks** | (1) `Array.from({length: cellCount}, () => [])` pre-allocates 12000+ empty arrays. (2) Full crime array copy via `filter` + `sort` + `slice`. (3) Slice sub-computation re-runs entire KDE for each slice. (4) `stableCrimeSort` compares 4 fields when only timestamp is needed. (5) Sorts all crimes globally when peak detection only needs per-cell timestamp order. |
| **Improvements** | 1. **Lazy cell allocation**: Use `Map<number, number[]>` for populated cells only. 2. **Skip global sort**: Data arrives sorted from DuckDB; sort only per-cell arrays. 3. **Share KDE across slices**: Compute full-domain KDE once, then slice results are re-normalization. 4. **Use `Int32Array` for support counts** (integer values). |

---

## Algorithm 3: Sliding-Window Temporal Peak Detection

| Property | Value |
|----------|-------|
| **Function** | `computePeakWindow()` |
| **File** | `src/lib/stkde/compute.ts` |
| **Lines** | 82–111 |
| **Approach** | Sort timestamps, sliding window of `windowSeconds`. Two-pointer scan — expand `endIdx`, advance `startIdx` while `endValue - sorted[startIdx] > windowSeconds`. Track max count and its start time. |
| **Time** | O(M log M) dominated by sort; two-pointer scan is O(M). |
| **Space** | O(M) for sorted copy |
| **Bottlenecks** | (1) Called per populated cell (up to 12000×), each sorts its own sub-array. (2) Degenerate zero-width window if `bestStart + windowSeconds` is at domain edge. (3) `sorted[0] ?? sorted[0]` is a no-op (line 97). |
| **Improvements** | 1. **Timestamps arrive sorted** from DuckDB aggregation; pass a `preSorted` flag. 2. **Batch adjacent cells** with low counts. 3. **Return early** for M ≤ 2. |

---

## Algorithm 4: Bucket-Based Temporal Peak Detection

| Property | Value |
|----------|-------|
| **Function** | `computePeakWindowFromBuckets()` |
| **File** | `src/lib/stkde/compute.ts` |
| **Lines** | 187–219 |
| **Approach** | Same two-pointer technique on pre-bucketed `{bucketStartEpochSec, count}` objects. Tracks `runningWeight` (weighted count) not event count. |
| **Time** | O(B log B) sorting + O(B) scan. B ≤ M (fewer items than raw timestamps). |
| **Bottlenecks** | (1) Sorting object arrays (comparator overhead). (2) Same per-cell invocation as Algorithm 3. (3) `sorted[endIdx] ?? sorted[0]` repeated in loop. |
| **Improvements** | 1. **Buckets arrive sorted** from DuckDB `ORDER BY row_idx, col_idx, bucket_start`. 2. Use `Uint32Array` pair storage instead of object arrays. 3. Same batching as Algorithm 3. |

---

## Algorithm 5: Grid Configuration Builder with Coarsening

| Property | Value |
|----------|-------|
| **Function** | `buildStkdeGridConfig()` |
| **File** | `src/lib/stkde/compute.ts` |
| **Lines** | 44–80 |
| **Approach** | Computes lat/lon cell degrees from `gridCellMeters`, adjusts for Mercator distortion via `cos(lat)`, coarsens grid via `ceil(sqrt(totalCells / maxCells))` if limits exceeded. |
| **Time** | O(1) |
| **Bottlenecks** | Uniform coarsening — all cells resize equally, losing resolution uniformly even in data-dense areas. |
| **Improvements** | Adaptive coarsening: fine grid in dense regions, coarse in sparse regions. |

---

## Algorithm 6: Full Population DuckDB Aggregation Pipeline

| Property | Value |
|----------|-------|
| **Function** | `buildFullPopulationStkdeInputs()` |
| **File** | `src/lib/stkde/full-population-pipeline.ts` |
| **Lines** | 89–198 |
| **Approach** | SQL grid + temporal bucketing in DuckDB: `GROUP BY FLOOR((lon-minLng)/lonCellDeg), FLOOR((lat-minLat)/latCellDeg), FLOOR(ts/bucketSize)`. Paginated via `LIMIT/OFFSET` (20K rows/chunk). |
| **Time** | O(N) DuckDB table scan + aggregation. Pages: ceil(N/20000) round-trips. |
| **Space** | O(R·C + B) — `Float64Array` + `Map<number, FullPopulationBucket[]>` |
| **Bottlenecks** | (1) **Pagination overhead**: For 8.5M records, ~425 round-trips. (2) Object allocation per bucket row (`existing.push(nextBucket)`). (3) Separate COUNT query before aggregation. (4) SQL `FLOOR(ts / ?) * ?` not indexable. (5) Throws `'full-population-aborted'` on signal but signal checking only happens between chunks, not mid-chunk. |
| **Improvements** | 1. **Remove pagination**: DuckDB can return all rows in one result if memory permits. 2. **Use `Int32Array` pairs** for bucket storage instead of object arrays. 3. **Combine COUNT and aggregation** via `COUNT(*) OVER()`. 4. **Use `epoch_ms("Date")`** instead of `EXTRACT(EPOCH FROM "Date")` for integer arithmetic. 5. Check AbortSignal inside row processing loop for responsiveness. |

---

## Algorithm 7: 2D Grid KDE for 3D Cube Visualization

| Property | Value |
|----------|-------|
| **Function** | `computeSliceKde()` |
| **File** | `src/lib/kde/compute-slice-kde.ts` |
| **Lines** | 9–94 |
| **Approach** | Same grid-convolution Gaussian KDE as Algorithm 1 but in normalized (-50,50) space. Default 32×32=1024 cells. Uses `Float32Array`. |
| **Time** | O(P) binning + O(R·C·K²) convolution. 32×32 with K=6 → ~173K weight evals. |
| **Bottlenecks** | (1) Same brute-force as Algorithm 1. (2) Square grid only — `gridRows = gridCols = gridSize`. (3) `Math.sqrt` + `Math.exp` per neighbor. |
| **Improvements** | 1. Separable convolution (see Algorithm 1). 2. Precompute 2D kernel LUT (K×K < 169 entries). 3. Accept non-square grids. 4. Remove sqrt: `Math.exp(distSq * invTwoSigmaSq)`. |

---

## Algorithm 8: DBSCAN Spatial-Temporal Clustering

| Property | Value |
|----------|-------|
| **Function** | `analyzeClusters()` |
| **File** | `src/lib/clustering/cluster-analysis.ts` |
| **Lines** | 81–184 |
| **Approach** | Wraps `density-clustering` DBSCAN. Projects to 3D `[x, y*0.5, z]` (y halved to reduce temporal influence). Sensitivity → epsilon via `max(2, 15 - s*12)`. Computes per-cluster bounds, type counts, dominant type. |
| **Time** | O(P²) worst case — `density-clustering` uses naive O(n²) DBSCAN without spatial index. |
| **Space** | O(P) for dataset + cluster membership |
| **Bottlenecks** | (1) **O(P²) complexity** on full point dataset. (2) `readNoiseIndexes()` accesses private `noise` property via `(dbscan as unknown as {noise?: number[]}).noise` — fragile cast. (3) `stabilizeNumber` called redundantly on every bound/center/size value. (4) `point.y * 0.5` scaling is arbitrary — hardcoded rather than parameterized. |
| **Improvements** | 1. **Replace with `supercluster` or implement kd-tree-accelerated DBSCAN** for O(P log P) expected case. 2. Expose `noise` properly or subclass `DBSCAN`. 3. Hoist `stabilizeNumber` calls to only the final output path. 4. Make y-scaling a parameter (`timeWeight`). 5. Consider OPTICS instead of DBSCAN for variable-density clusters. |

---

## Algorithm 9: Adjacent Slice Evolution Flow

| Property | Value |
|----------|-------|
| **Function** | `buildEvolutionFlowModel()` |
| **File** | `src/lib/evolution/evolution-flow.ts` |
| **Lines** | 40–89 |
| **Approach** | Filters visible slices, sorts by time, generates linear flow segments from adjacent pairs. Strength decays with temporal distance: `max(0.15, 1 - min(0.85, |diff| / 100))`. |
| **Time** | O(M log M) for sorting + O(M) for segments. M = visible slices. |
| **Bottlenecks** | (1) Strength formula `100` is a magic number — hardcodes assumption about the coordinate scale. (2) `activeIndex` defaults to 0 when activeSliceId not found (silent fallback). |
| **Improvements** | 1. Make strength decay factor a parameter. 2. Log or surface active-slice-not-found condition. |

---

## Algorithm 10: Burst Evolution Model (Slices ↔ Windows)

| Property | Value |
|----------|-------|
| **Function** | `buildBurstEvolutionModel()` |
| **File** | `src/lib/stkde/burst-evolution.ts` |
| **Lines** | 84–167 |
| **Approach** | Finds strongest burst score across slices + windows, builds graph: slice nodes with normalized scores, connector segments between overlapping-slice pairs sharing a burst window. |
| **Time** | O(M·B) where M = visible slices, B = burst windows. For each window, iterates all nodes to find overlapping slices. |
| **Bottlenecks** | (1) **O(M·B)** can be O(M²·B) worst-case because `matchedNodes` is union of overlapping slices, then nested pair iteration (`for index; index < matchedNodes.length-1`). (2) `seenSegmentKeys` Set grows with each pair — O(B·M²). (3) Normalizes to strongest score, losing relative scale when score differs significantly across windows. |
| **Improvements** | 1. Use interval tree for overlap queries (O(log M) per window instead of O(M)). 2. Deduplicate segment keys at the algorithm level rather than a growing Set. 3. Winsorize extreme scores before normalization. |

---

## Algorithm 11: Adjacent Slice Statistical Comparison

| Property | Value |
|----------|-------|
| **Function** | `compareAdjacentSlices()` |
| **File** | `src/lib/stkde/adjacent-slice-comparison.ts` |
| **Lines** | 121–166 |
| **Approach** | Computes count delta, density ratio, dominant type shift, district overlap (Jaccard-like ratio) between two adjacent time slices. |
| **Time** | O(T + D) where T = type keys, D = district keys. |
| **Bottlenecks** | (1) `JSON.stringify(left.typeCounts) === JSON.stringify(right.typeCounts)` for identity check — creates string representations of entire maps. (2) Set operations construct multiple intermediate arrays (`shared`, `leftOnly`, `rightOnly`). (3) `densityRatio` defaults to `right.totalCount` when left = 0, which can produce misleading ratios. |
| **Improvements** | 1. Replace `JSON.stringify` identity check with a rolling hash or `Object.keys` length + sentinel comparisons. 2. Compute all Set operations in one pass. 3. Use `Infinity` sentinel for zero-denominator ratio instead of the right-hand count. |

---

## Algorithm 12: Adaptive Time Warp Map

| Property | Value |
|----------|-------|
| **Function** | `computeAdaptiveMaps()` |
| **File** | `src/workers/adaptiveTime.worker.ts` |
| **Lines** | 62–238 |
| **Approach** | Computes four maps: (1) **density**: count events per time bin (uniform-time or uniform-events binning), smoothed with box filter. (2) **warp**: integrates density weights to create non-linear time mapping. (3) **burstiness**: inter-event-interval coefficient of variation per bin, normalized to [0,1]. (4) **count**: raw event counts. |
| **Time** | O(N log N) for sorting (if uniform-time) + O(N) binning + O(B·K) smoothing + O(B) warp + O(N) burstiness. |
| **Space** | O(N + B) — arrays for timestamps, boundaries, maps. |
| **Bottlenecks** | (1) **`Array.from(timestamps)` copies entire Float32Array** to regular array (line 91), then `validTimestamps.sort()` — double allocation. (2) Burstiness loop (lines 203–213) re-normalizes each sorted[i] to bin index, recomputing `norm * safeBinCount` per event — redundant because sorted timestamps are in order, so bin index can be tracked incrementally. (3) Smoothing uses box filter (equal-weight neighbors) instead of Gaussian — less accurate density estimate. (4) Three separate passes over bin data: smoothing→max density, density→weights→warp, and density→normalize. |
| **Improvements** | 1. **Sort in-place on the Float32Array** using `Float32Array.prototype.sort` (available in modern JS) or sort indexes to avoid array copy. 2. **Incremental bin computation** for burstiness — track when bin changes instead of recomputing norm for every event. 3. **Gaussian smoothing** with precomputed weights for better density fidelity. 4. **Single-pass combined** density normalization, weight calculation, and warp accumulation. |

---

## Algorithm 13: Comparable Warp Binning Scoring

| Property | Value |
|----------|-------|
| **Function** | `scoreComparableWarpBins()` |
| **File** | `src/lib/binning/warp-scaling.ts` |
| **Lines** | 108–163 |
| **Approach** | Computes peer-relative scores: `bin.count / (totalCount / binCount)`. Maps to normalized [0,1] via `0.5 + (score - 1) * 0.5`. Clamps warp weights to [minWarpWeight, maxWarpWeight]. |
| **Time** | O(B) |
| **Bottlenecks** | (1) Validation loop runs `isValidComparableWarpBin` on every bin (8 checks each). (2) Object spread in `toComparableScore` creates new objects per bin — functional style but allocates. |
| **Improvements** | 1. Validate once and return neutral early before scoring loop. 2. Mutate and return modified objects to avoid spread overhead. |

---

## Algorithm 14: Comparable Warp Map Construction

| Property | Value |
|----------|-------|
| **Function** | `buildComparableWarpMap()` |
| **File** | `src/lib/binning/warp-scaling.ts` |
| **Lines** | 165–226 |
| **Approach** | Converts warp scores to normalized width shares with minimum-width guarantee. Builds cumulative `Float32Array` boundaries. |
| **Time** | O(B) |
| **Bottlenecks** | (1) `'peerRelativeScore' in (scoredInput[0] ?? {})` for type discrimination — fragile duck-typing. (2) `totalShare / normalizedShares` correction loop can produce FP rounding errors at boundaries. |
| **Improvements** | 1. Use explicit discriminated union instead of duck-typing. 2. Push final boundary to exact domainEnd after normalization (already done for last index, but earlier boundaries may drift). |

---

## Algorithm 15: Burst Taxonomy Classification

| Property | Value |
|----------|-------|
| **Function** | `classifyBurstWindow()` |
| **File** | `src/lib/binning/burst-taxonomy.ts` |
| **Lines** | 104–182 |
| **Approach** | Rule-based: compares window density against global thresholds (0.72 high, 0.3 low) and neighborhood stats. Outputs prolonged-peak, isolated-spike, valley, or neutral with confidence and rationale. |
| **Time** | O(N) for neighborhood analysis. |
| **Bottlenecks** | (1) **`median()` sorts a copy** on every call — invoked 5+ times per classification (lines 113–117). Each sorts a fresh copy = O(N log N) × 5. (2) Hardcoded thresholds (0.72, 0.3) — not data-adaptive. (3) `deriveBurstConfidence()` redundantly recomputes neighbor median. (4) Complex 6-branch conditional. |
| **Improvements** | 1. **Pre-sort neighbors once** and reuse for all median computations. 2. Compute neighbor stats in one pass (mean, max, min, median via quickselect). 3. Derive thresholds from data percentiles. 4. Replace conditional tree with a scoring function. |

---

## Algorithm 16: Hotspot Worker Filtering

| Property | Value |
|----------|-------|
| **Function** | `projectHotspots()` |
| **File** | `src/workers/stkdeHotspot.worker.ts` |
| **Lines** | 28–60 |
| **Approach** | Four chained `.filter()` calls (intensity, support, temporal, spatial) then sort by intensity→support→id. |
| **Time** | O(H log H) — sorting dominates; filtering is O(H). |
| **Bottlenecks** | (1) **Four chained `.filter()` calls** iterate the array 4 times. (2) Temporal overlap test is correct but non-obvious. |
| **Improvements** | 1. Single-pass loop with combined predicate. 2. Accept pre-sorted data flag. |

---

## Algorithm 17: Boundary Detection Orchestrator

| Property | Value |
|----------|-------|
| **Function** | `detectBoundaries()` |
| **File** | `src/lib/interval-detection.ts` |
| **Lines** | 224–328 |
| **Approach** | Bins crimes into density histogram (bin count = max(20, min(100, N/50))), normalizes, dispatches to method, deduplicates, snaps to hour/day. |
| **Time** | O(N) binning + method-specific complexity. |
| **Bottlenecks** | (1) Fallback merge uses `[...all].sort()` — O(F log F). (2) `snapToBoundary` creates Date objects. (3) Triple-nested `Math.min(Math.max(Math.floor(...)))`. |
| **Improvements** | 1. Integer math for epoch snapping. 2. Early exit on sufficient boundaries. 3. Merge via sorted pass instead of full sort. |

---

## Algorithm 18: Peak Detection (Density-Based)

| Property | Value |
|----------|-------|
| **Function** | `detectPeaks()` |
| **File** | `src/lib/interval-detection.ts` |
| **Lines** | 57–98 |
| **Approach** | Local maxima: `density[i] > density[i-1] && density[i] > density[i+1] && density[i] >= threshold`. |
| **Time** | O(N) for stats + O(N) for scan. |
| **Bottlenecks** | (1) Two-pass variance. (2) `Math.pow(v - mean, 2)` over multiplication. (3) Plateaus not detected. |
| **Improvements** | 1. Single-pass Welford variance. 2. `(v - mean) * (v - mean)`. 3. Handle plateaus (pick midpoint). |

---

## Algorithm 19: Change Point Detection (Sliding Window)

| Property | Value |
|----------|-------|
| **Function** | `detectChangePoints()` |
| **File** | `src/lib/interval-detection.ts` |
| **Lines** | 110–159 |
| **Approach** | Sliding window: left vs right window mean comparison. Threshold = stdDev × sensitivity multiplier. |
| **Time** | O(N·W) — `.slice()` creates arrays per iteration + reduce each. |
| **Bottlenecks** | (1) **O(N·W) array allocation from `.slice()`** in every loop iteration. (2) `.some()` linear scan for dedup. (3) Dedup only checks previous point. |
| **Improvements** | 1. Sliding window with running sums (subtract outgoing, add incoming). 2. Replace `.some()` with sorted lastChangePoint pointer. 3. Deduplicate against all accepted points. |

---

## Algorithm 20: Rule-Based Equal-Time Partitioning

| Property | Value |
|----------|-------|
| **Function** | `applyRuleBased()` |
| **File** | `src/lib/interval-detection.ts` |
| **Lines** | 170–189 |
| **Approach** | Even split into `boundaryCount` segments. |
| **Time** | O(B). |
| **Bottlenecks** | Floor truncation can drift final boundary. |
| **Improvements** | Use `Math.round` for even spacing. |

---

## Algorithm 21: Data Clarity Score

| Property | Value |
|----------|-------|
| **Function** | `calculateDataClarity()` |
| **File** | `src/lib/confidence-scoring.ts` |
| **Lines** | 46–93 |
| **Approach** | Bins crimes, computes CV=σ/μ, maps to 0–100. |
| **Time** | O(N). |
| **Bottlenecks** | (1) `Math.pow(count-mean, 2)`. (2) Duplicates binning from `stats/aggregation.ts`. |
| **Improvements** | 1. Reuse shared binning. 2. Inline squared difference. |

---

## Algorithm 22: Coverage Score

| Property | Value |
|----------|-------|
| **Function** | `calculateCoverage()` |
| **File** | `src/lib/confidence-scoring.ts` |
| **Lines** | 105–168 |
| **Approach** | Three factors: temporal span, log-density, Gini coefficient. |
| **Time** | O(N). |
| **Bottlenecks** | (1) Two crime passes (min/max then bins). (2) Gini sorts 20 bins (fine). (3) Duplicated binning. |
| **Improvements** | 1. Single-pass for min/max and bins. 2. Reuse shared binner. |

---

## Algorithm 23: Statistical Confidence (SNR + Prominence + Entropy)

| Property | Value |
|----------|-------|
| **Function** | `calculateStatisticalConfidence()` |
| **File** | `src/lib/confidence-scoring.ts` |
| **Lines** | 179–218 |
| **Approach** | SNR×0.4 + prominence×0.35 + entropy×0.25. |
| **Time** | O(N). |
| **Bottlenecks** | (1) `Math.log2(v)` slower than `Math.log(v)*LOG2E`. (2) `.map()` for normalization creates array. |
| **Improvements** | 1. Compute entropy in same pass as mean. 2. Inline normalization. |

---

## Algorithm 24: Composite Confidence Score

| Property | Value |
|----------|-------|
| **Function** | `calculateConfidence()` |
| **File** | `src/lib/confidence-scoring.ts` |
| **Lines** | 228–277 |
| **Approach** | Orchestrates clarity + coverage + statistical scoring. |
| **Time** | O(N) — crimes binned up to 3 times. |
| **Bottlenecks** | (1) **Crimes binned three times** (clarity, coverage, fallback). (2) Weights object merge per call. |
| **Improvements** | 1. Bin once, pass through all functions. 2. Share binner utility. 3. Hoist default weights. |

---

## Algorithm 25: Statistical Aggregation Functions

| Property | Value |
|----------|-------|
| **Functions** | `aggregateStats()`, `aggregateByDistrict()`, `aggregateByType()`, `aggregateByHour()`, `aggregateByDayOfWeek()`, `aggregateByMonth()` |
| **File** | `src/lib/stats/aggregation.ts` |
| **Lines** | 32–210 |
| **Approach** | Single-pass per aggregation. `aggregateStats()` runs 5 iterations. |
| **Time** | O(5×N). |
| **Bottlenecks** | (1) **5 iterations over same array**. (2) `new Date(timestamp*1000)` called 3× per crime. |
| **Improvements** | 1. Single-pass for all aggregations. 2. Cache `Date` per crime. |

---

## Algorithm 26: Temporal Pulse Builder

| Property | Value |
|----------|-------|
| **Function** | `buildTemporalPulseSeries()` |
| **File** | `src/lib/stats/temporal-pulses.ts` |
| **Lines** | 33–50 |
| **Approach** | Converts raw arrays to labeled points. |
| **Time** | O(1) — 24+7+12. |
| **Bottlenecks** | None significant. |

---

## Algorithm 27: Basic Statistics (mean, stddev, burstiness)

| Property | Value |
|----------|-------|
| **Functions** | `mean()`, `stddev()`, `coefficientOfVariation()`, `burstiness()` |
| **File** | `src/lib/stats.ts` |
| **Lines** | 6–31 |
| **Approach** | Textbook definitions. Two-pass stddev. |
| **Time** | O(2N) for stddev. |
| **Bottlenecks** | (1) Two-pass variance. (2) `burstiness` and `coefficientOfVariation` are identical. (3) `.map().reduce()` creates intermediate array. |
| **Improvements** | 1. Single-pass Welford. 2. Merge duplicate functions. 3. Inline squared differences. |

---

## Algorithm 28: Binning Engine (generateBins + all strategies)

| Property | Value |
|----------|-------|
| **Function** | `generateBins()` + 10 strategy implementations |
| **File** | `src/lib/binning/engine.ts` |
| **Lines** | 26–513 |
| **Approach** | Switch dispatch. Strategies: daytime-heavy, nighttime-heavy, crime-type-specific, burstiness, uniform-distribution, uniform-time, weekday-weekend, interval, monthly, auto-adaptive. |
| **Bottlenecks** | (1) Most strategies iterate data 2–4 times. (2) daytimeHeavy/nighttimeHeavy are nearly identical. (3) crimeTypeSpecific sorts each type group separately. (4) weekdayWeekend splits then re-sorts each half. (5) autoAdaptive computes CV then re-iterates. |
| **Improvements** | 1. Merge daytime/nighttime into one parameterized function. 2. Single-pass split+compute. 3. Pass pre-computed stats to sub-strategies. |

---

## Algorithm 29: Burstiness Binning (Gap-Based)

| Property | Value |
|----------|-------|
| **Function** | `generateBurstinessBins()` |
| **File** | `src/lib/binning/engine.ts` |
| **Lines** | 228–260 |
| **Approach** | New bin when gap > 1h or bin > maxEvents. |
| **Time** | O(N log N) sort + O(N). |
| **Bottlenecks** | (1) `createBinFromEvents` re-sorts per bin (already sorted). (2) 1h default can over-merge. |
| **Improvements** | 1. Use existing sorted order. 2. Adaptive gap threshold. |

---

## Algorithm 30: Auto-Adaptive Strategy Selection

| Property | Value |
|----------|-------|
| **Function** | `generateAutoAdaptiveBins()` |
| **File** | `src/lib/binning/engine.ts` |
| **Lines** | 431–468 |
| **Approach** | CV > 2 → burstiness. N > 1000 → uniform-distribution. Else → uniform-time. |
| **Time** | O(N) CV + O(N log N) dispatched. |
| **Bottlenecks** | (1) Two-pass variance. (2) Arbitrary thresholds. (3) Dispatched strategy re-sorts. |
| **Improvements** | 1. Single-pass Welford. 2. Configurable thresholds. 3. Pass sorted data. |

---

## Algorithm 31: Box Smoothing (Adaptive Time Worker)

| Property | Value |
|----------|-------|
| **Function** | `computeAdaptiveMaps()` kernelWidth branch |
| **File** | `src/workers/adaptiveTime.worker.ts` |
| **Lines** | 139–157 |
| **Approach** | Uniform kernel: average of ±kernelWidth neighbors. |
| **Time** | O(B·K). |
| **Bottlenecks** | (1) Box filter produces blocky density. (2) Bounds check per bin×K. (3) K=1 enters branch unnecessarily. |
| **Improvements** | 1. Gaussian kernel. 2. Precompute neighbor indices. 3. Skip branch when K≤1. |

---

## Cross-Cutting Concerns

| # | Concern | Impact | Files |
|---|---------|--------|-------|
| C1 | **No FFT for any KDE** | All 2D KDE is brute-force O(R·C·K²). ~4.8M evals at max grid. FFT is O(R·C·log(R·C)). | `compute.ts`, `compute-slice-kde.ts` |
| C2 | **Duplicated binning** | 3 functions in confidence-scoring.ts reimplement same logic. | `confidence-scoring.ts`, `aggregation.ts` |
| C3 | **No memoization** | STKDE slices recompute KDE from scratch. | `compute.ts` |
| C4 | **Object allocation in hot paths** | Per-cell arrays, per-bucket objects, functional chains create GC pressure. | `compute.ts`, `full-population-pipeline.ts` |
| C5 | **Magic numbers** | y-scale 0.5, strength 100, CV>2, 0.72/0.3 thresholds. | Multiple files |
| C6 | **Two-pass statistics** | stddev, detectPeaks, detectChangePoints all compute mean first. | `stats.ts`, `interval-detection.ts` |
| C7 | **Degenerate input handling** | densityRatio uses right count when left=0. | `adjacent-slice-comparison.ts`, `burst-evolution.ts` |
| C8 | **Fragile library interface** | `readNoiseIndexes` accesses private `.noise` via cast. | `cluster-analysis.ts` |

---

## Algorithm Count Summary

| Category | Count | Key Files |
|----------|-------|-----------|
| **KDE / Density** | 2 | `compute.ts`, `compute-slice-kde.ts` |
| **STKDE Pipelines** | 3 | `compute.ts` (×2), `full-population-pipeline.ts` |
| **Peak / Temporal Detection** | 4 | `compute.ts` (×2), `interval-detection.ts` (×2) |
| **Clustering** | 1 | `cluster-analysis.ts` |
| **Burst / Evolution Models** | 3 | `burst-evolution.ts`, `evolution-flow.ts`, `burst-taxonomy.ts` |
| **Adaptive Time / Warp** | 4 | `adaptiveTime.worker.ts`, `warp-scaling.ts` (×2) |
| **Boundary Detection** | 2 | `interval-detection.ts` (rule-based + orchestrator) |
| **Confidence Scoring** | 4 | `confidence-scoring.ts` |
| **Statistical Aggregation** | 7 | `stats.ts`, `aggregation.ts`, `temporal-pulses.ts` |
| **Binning Engine** | 9 | `engine.ts` (8 strategies + dispatch) |
| **Worker Filtering** | 1 | `stkdeHotspot.worker.ts` |
| **Utils** | 2 | `gridConfig`, `responseGuard` |
| **Total** | **41 algorithms** across ~2,800 LOC | |

---

*Algorithm audit: 2026-06-01*

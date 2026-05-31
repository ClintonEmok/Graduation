# Algorithm Analysis — Adaptive Space-Time Cube Prototype

**Generated:** 2026-05-31  
**Scope:** Complete audit of all algorithms across slice generation, adaptive time scaling, STKDE/KDE/clustering, time manipulation, binning, burst detection, and confidence scoring.  
**Coverage:** ~197 distinct algorithms across 60+ source files (~5,200 LOC of algorithmic code).  
**Sources:** 4 parallel agents cataloging `src/lib/`, `src/store/`, `src/workers/`, `src/app/api/`, `src/app/timeslicing-algos/lib/`, `src/app/cube-sandbox/lib/`.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Complete Algorithm Catalog](#2-complete-algorithm-catalog)
   - [A. Time & Date Algorithms](#a-time--date-algorithms)
   - [B. Binning Engine Strategies](#b-binning-engine-strategies)
   - [C. Downsampling](#c-downsampling)
   - [D. Adaptive Time Scaling](#d-adaptive-time-scaling)
   - [E. Burst Detection](#e-burst-detection)
   - [F. Burst Taxonomy Classification](#f-burst-taxonomy-classification)
   - [G. Confidence Scoring](#g-confidence-scoring)
   - [H. Interval / Boundary Detection](#h-interval--boundary-detection)
   - [I. Slice Generation & Allocation](#i-slice-generation--allocation)
   - [J. Slice Creation & State](#j-slice-creation--state)
   - [K. Warp Slice & Profile Generation](#k-warp-slice--profile-generation)
   - [L. Proposal Ranking & Scoring](#l-proposal-ranking--scoring)
   - [M. STKDE / KDE / Hotspot Detection](#m-stkde--kde--hotspot-detection)
   - [N. Clustering](#n-clustering)
   - [O. Evolution Models](#o-evolution-models)
   - [P. Statistical Aggregation](#p-statistical-aggregation)
   - [Q. Comparable Warp Scaling](#q-comparable-warp-scaling)
   - [R. Selection Algorithms](#r-selection-algorithms)
3. [Duplicate Algorithm Registry](#3-duplicate-algorithm-registry)
4. [Critical Bottlenecks](#4-critical-bottlenecks)
5. [Priority Improvement Recommendations](#5-priority-improvement-recommendations)
6. [Cross-Cutting Concerns](#6-cross-cutting-concerns)
7. [Key Data Structures Catalog](#7-key-data-structures-catalog)

---

## 1. Executive Summary

This project uses ~197 distinct algorithms across 17 subsystems. The performance profile is dominated by **O(N log N) sorting** (for 8.5M crime records) and **brute-force O(N²) spatial operations** on the critical burst-detection path. The largest optimization opportunities are:

| Category | Current Worst | Target | Operations Saved |
|----------|--------------|--------|-----------------|
| KDE (2D Gaussian) | O(R·C·K²) brute-force | O(R·C·K) separable | ~3.6M weight evals |
| ANN spatial burstiness | O(N²) brute-force | O(N log N) kd-tree | ~30B distance calcs |
| Confidence pipeline | 3-4× redundant binning | 1× shared binning | ~300K bin ops per call |
| Change point detection | O(B·W) slice+reduce | O(B) rolling sum | 1000× fewer allocations |
| Selection queries | O(N) linear scan | O(log N) binary search | 8.5M → 24 comparisons |

---

## 2. Complete Algorithm Catalog

### A. Time & Date Algorithms

| # | Algorithm | File:Line | Time | Space | Approach |
|---|-----------|-----------|------|-------|----------|
| A1 | `detectEpochUnit` | `time-domain.ts:6` | O(1) | O(1) | Threshold (1e11) comparison |
| A2 | `toEpochSeconds` | `time-domain.ts:10` | O(1) | O(1) | Delegates to A1 |
| A3 | `epochSecondsToNormalized` | `time-domain.ts:14` | O(1) | O(1) | Linear: `(v - min) / span * 100` |
| A4 | `normalizedToEpochSeconds` | `time-domain.ts:23` | O(1) | O(1) | Inverse linear |
| A5 | `normalizeToPercent` | `date-normalization.ts:14` | O(1) | O(1) | Linear + clamp to [0,100] |
| A6 | `denormalizeToEpoch` | `date-normalization.ts:32` | O(1) | O(1) | Inverse linear |
| A7 | `normalizedRangeToEpoch` | `date-normalization.ts:48` | O(1) | O(1) | Wraps A4 (batch) |
| A8 | `epochRangeToNormalized` | `date-normalization.ts:62` | O(1) | O(1) | Wraps A3 (batch) |
| A9 | `resolutionToSeconds` | `time-domain.ts:42` | O(1) | O(1) | Lookup table |
| A10 | `resolutionToNormalizedStep` | `time-domain.ts:46` | O(1) | O(1) | `sec/span * 100` |
| A11 | `normalizeTimeRange` | `time-range.ts:14` | O(1) | O(1) | Type dispatch + validation |
| A12 | `normalizeTimeRangeBounds` | `time-range.ts:32` | O(1) | O(1) | Wraps A11 |
| A13 | `timeRangeOverlapsDomain` | `time-range.ts:42` | O(1) | O(1) | Endpoint overlap check |
| A14 | `clampTimeRangeToDomain` | `time-range.ts:50` | O(1) | O(1) | Min/max clamp |
| A15 | `focusTimelineRange` | `slice-utils.ts:51` | O(1) | O(1) | 4-store sync with normalization heuristic |
| A16 | `resolutionToSeconds` table | `time-domain.ts:42` | O(1) | O(1) | Fixed mapping |

**Notes on A5 vs A3:** `normalizeToPercent` clamps output to [0,100] and returns 50 when min=max. `epochSecondsToNormalized` does NOT clamp and uses `|| 1` fallback. This normalization ambiguity is a cross-cutting concern (see §6).

**Improvement opportunities:** None — all are O(1) trivial algorithms.

---

### B. Binning Engine Strategies

**Core dispatcher:** `generateBins` — `src/lib/binning/engine.ts:26-103`

| # | Strategy | File:Line | Time | Space | Approach |
|---|----------|-----------|------|-------|----------|
| B1 | `generateDaytimeHeavyBins` | `engine.ts:108` | O(n) | O(n) | 6AM-6PM split, 3h/4h interval binning |
| B2 | `generateNighttimeHeavyBins` | `engine.ts:146` | O(n) | O(n) | 6PM-6AM split (mirror of B1) |
| B3 | `generateCrimeTypeBins` | `engine.ts:187` | O(n + k·m log m) | O(n) | Map by type → per-type sort |
| B4 | `generateBurstinessBins` | `engine.ts:228` | O(n log n) | O(n) | Gap threshold: new bin when gap > 1h |
| B5 | `generateUniformDistributionBins` | `engine.ts:265` | O(n log n) | O(n) | Sort → chunk into equal-count bins |
| B6 | `generateUniformTimeBins` | `engine.ts:289` | O(n) | O(n) | Equal time spans, delegates to B8 |
| B7 | `generateWeekdayWeekendBins` | `engine.ts:304` | O(n log n) | O(n) | Split by day-of-week → sort each half |
| B8 | `generateIntervalBins` | `engine.ts:339` | O(n + k·m log m) | O(n) | Floor(t/interval) → Map → per-bin sort |
| B9 | `generateMonthlyBins` | `engine.ts:380` | O(n + k·m log m) | O(n) | Calendar month grouping |
| B10 | `generateAutoAdaptiveBins` | `engine.ts:431` | O(n log n) | O(n) | CV > 2 → burstiness, else unif-dist or unif-time |
| B11 | `domainAutoDetect` | `engine.ts:37` | O(n) per scan | O(n) intermediate | `Math.min(...data.map(...))` — **OOM risk** |

**Bottlenecks:**
- **B11 (🔴 CRITICAL):** `Math.min(...data.map(d => d.timestamp))` creates an intermediate array of size n and spreads it. For 8.5M records, this either stack-overflows or OOMs. Fix: single-pass `reduce`.
- **B1/B2/B7:** `new Date(event.timestamp)` per event — allocates 8.5M Date objects. Fix: epoch arithmetic for hour/day-of-week.
- **B3/B8/B9:** Per-group sort to compute avgTimestamp. Only min/max/sum/count needed — can be done in a single pass. O(m log m) → O(m).
- **B10:** Sorts to compute CV, then dispatches to strategy that sorts again. Double sort.
- **All:** `Math.min(...data.map(...))` in `generateBins` dispatcher runs before strategy dispatch — redundant scan.

**Improvements:**
1. Replace `Math.min(...map)` with `reduce` or tracked min/max during data load
2. Replace `new Date()` with epoch arithmetic:
   - Hour: `Math.floor(t / 3600000) % 24`
   - Day-of-week: `(Math.floor(t / 86400000) + 4) % 7` (Jan 1 1970 = Thursday)
3. Use running aggregation instead of per-group sort for avgTimestamp
4. Pass pre-computed stats (sorted, min/max, CV) from dispatcher to strategies
5. Merge B1/B2 into parameterized `generateDiurnalBins(hourRange, interval)`

**MergeSmallBins correctness issue:** `src/lib/binning/rules.ts:284` — sorts by count (ascending) before greedy merging, destroying temporal adjacency. Should merge temporally adjacent bins with a rolling check.

---

### C. Downsampling

| # | Algorithm | File:Line | Time | Space | Approach |
|---|-----------|-----------|------|-------|----------|
| C1 | `downsampleArray<T>` | `downsample.ts:7` | O(m) | O(m) | Stride = ceil(n / maxPoints) |
| C2 | `downsampleNumbers` | `downsample.ts:18` | O(m) | O(m) | Pre-allocated array, stride |
| C3 | `downsampleByStride` | `downsample.ts:30` | O(m·c) | O(m·c) | Per-column stride on typed arrays |
| C4 | `downsampleFloat32/64/8` | `downsample.ts:48` | O(m) | O(m) | Typed array copy by stride |
| C5 | `downsampleStrings` | `downsample.ts:70` | O(m) | O(m) | Dynamic push (inconsistent with typed arrays) |

**Note:** All uniform stride — does NOT preserve spikes or outliers. Acceptable for overview, but consider Largest-Triangle-Three-Buckets (LTTB) if outlier preservation matters for timeline visualization.

---

### D. Adaptive Time Scaling

| # | Algorithm | File:Line | Time | Space | Approach |
|---|-----------|-----------|------|-------|----------|
| D1 | `computeAdaptiveMaps` (uniform-time) | `adaptiveTime.worker.ts:62` | O(n log n + B·K) | O(n + B) | Filter→sort→bin→smooth→warp→burstiness |
| D2 | `computeAdaptiveMaps` (uniform-events) | `adaptiveTime.worker.ts:99` | O(n log n + n log B + B·K) | O(n + B) | Quantile boundaries → binary search assignment |
| D3 | `findBoundaryBin` | `adaptiveTime.worker.ts:48` | O(log B) | O(1) | Lower-bound binary search |
| D4 | `ensureStrictlyMonotonicBoundaries` | `adaptiveTime.worker.ts:30` | O(B) | O(1) | Linear fix-up with 1e-6 epsilon |
| D5 | `computeBurstinessPerBin` | `adaptiveTime.worker.ts:200` | O(n) | O(B) | Online variance of inter-event gaps per bin |
| D6 | `getAdaptiveScaleConfig` | `adaptive-scale.ts:21` | O(n + B) | O(B) | Density→weight→cumulative range |
| D7 | `getAdaptiveScaleConfigColumnar` | `adaptive-scale.ts:91` | O(n + B) | O(B) | Same as D6, columnar input |
| D8 | `computeAdaptiveY` | `adaptive-scale.ts:157` | **O(2n + 2B)** | O(n + B) | Calls D6 (bins all) THEN bins again — double binning |
| D9 | `computeAdaptiveYColumnar` | `adaptive-scale.ts:193` | **O(2n + 2B)** | O(n + B) | Same double-binning as D8 |
| D10 | `smoothSeries` | `queries/aggregations.ts:25` | O(B·W) | O(B) | Box filter averaging |
| D11 | `computeWarpMap` | `queries/aggregations.ts:43` | O(B) | O(B) | Cumulative weight accumulation |
| D12 | `buildAdaptiveDensityQuery` | `queries/aggregations.ts:162` | O(n) DB | — | SQL bin via FLOOR + GROUP BY |
| D13 | `buildAdaptiveBurstQuery` | `queries/aggregations.ts:179` | O(n) DB | — | SQL LAG window function for gaps |
| D14 | `buildDensityBinsQuery` | `queries/aggregations.ts:207` | O(n) DB | O(R·C·T) | 3D density cube SQL query |
| D15 | `computeBurstResponse` (API) | `bursts/route.ts:181` | O(P·(n + S²)) | O(P·S) | Batched partition processing, samples 50k |
| D16 | `computeTemporalBFromTimestamps` | `bursts/route.ts:45` | O(K log K) | O(K) | **Duplicate** of E1 |

**Bottlenecks:**
- **D1/D2:** `Array.from(timestamps)` creates a full copy before filter+sort. Use in-place `Float32Array.sort()` or sort indexes.
- **D8/D9:** Double binning — calls D6 which bins all data, then bins again for position mapping. Refactor to single pass.
- **D2 uniform-events:** `findBoundaryBin` called per event (n log B). When boundaries collapse (same-timestamp events), `ensureStrictlyMonotonicBoundaries` creates artificial 1e-6 gaps producing absurd density values.
- **D10:** Box filter runs in O(B·W). Use prefix sum for O(B).
- **D15:** If `SpatialFormula = 'ann'`, inner `computeAnnScore` drives O(P·S²) time. For P=12 partitions, S=50k: 12 × 2.5B = 30B distance computations.
- **D16:** Duplicate of `computeTemporalB` in burst-detection.ts.

**Numerical stability (D5):** Uses `sumSq/N - mean²` for variance — can produce negative values for large numbers. Mitigated by `Math.max(0, ...)`. Fix: Welford's online algorithm.

**Improvements:**
1. Sort Float32Array in-place instead of `Array.from() → sort()`
2. Single-pass compute in worker: combine density accumulation, burstiness, and warp accumulation
3. Refactor D8/D9 to compute config once and reuse
4. Prefix sum for box filter smoothing (O(B·W) → O(B))
5. Gaussian kernel instead of box filter for smoother density estimates
6. Track bin index incrementally in burstiness loop instead of recomputing `norm * safeBinCount` per event

---

### E. Burst Detection

| # | Algorithm | File:Line | Time | Space | Approach |
|---|-----------|-----------|------|-------|----------|
| E1 | `computeTemporalB` | `burst-detection.ts:53` | O(K) | O(1) | `(σ-μ)/(σ+μ)` on inter-event gaps |
| E2 | `computeTemporalBBinned` | `burst-detection.ts:340` | O(K log K) | O(K) | Sort→gaps→E1 (wrapper) |
| E3 | `buildDistribution` | `burst-detection.ts:72` | O(n) | O(1024) | 32×32 grid projection |
| E4 | `normalizedEntropy` | `burst-detection.ts:95` | O(1024) | O(1) | Shannon entropy / ln(support) |
| E5 | `jensenShannonDivergence` | `burst-detection.ts:112` | O(1024) | O(1) | KL(P||M) + KL(Q||M) |
| E6 | `averageNearestNeighborDistance` | `burst-detection.ts:132` | **O(n²)** | O(1) | Brute-force pairwise distance |
| E7 | `computeAnnScore` | `burst-detection.ts:158` | **O(n²)** | O(1) | Clark-Evans: `1 - observed/expected` |
| E8 | `computeSpatialB` | `burst-detection.ts:168` | O(n) or **O(n²)** | O(1) | Formula selector: balanced/entropy/JS/ann |
| E9 | `compactBurstPartitions` | `burst-detection.ts:246` | O(P) | O(P) | Ceiling-based partition grouping |
| E10 | `allocateSlices` (burst) | `burst-detection.ts:305` | O(b·target) | O(b) | Greedy largest-remainder allocation |
| E11 | `buildFallbackBurstResponse` | `burst-detection.ts:271` | O(P) | O(P) | `Math.sin`-seeded deterministic fallback |

**🔴 CRITICAL: E6 `averageNearestNeighborDistance`**
- Brute-force O(n²) with sqrt per comparison
- Called via E7 → E8 for `ann` formula path
- For 50k sampled points per partition (up to 12 partitions) = 30 billion distance computations
- **Fix:** Replace with kd-tree (O(n log n) build + O(log n) per query), or grid-based ANN approximation reusing the 32×32 spatial grid

**E10 bottleneck:** Greedy remainder loop scans all bins per allocation (`O(b·target)`). Fix: Hare quota with largest-remainder single-pass, or max-heap for O(b + target·log b).

**E3 grid sizing:** Hardcoded 32×32 = 1024 cells. Make adaptive: `Math.max(8, min(64, floor(sqrt(n))))`.

**E4/E5:** Mathematically correct implementations of Shannon entropy and JS-divergence.

**E11:** `Math.sin` as PRNG has known periodicity with correlated inputs. Use FNV-1a or siphash.

---

### F. Burst Taxonomy Classification

| # | Algorithm | File:Line | Time | Space | Approach |
|---|-----------|-----------|------|-------|----------|
| F1 | `classifyBurstWindow` | `burst-taxonomy.ts:104` | O(k) | O(1) | Rule-based decision tree (4 classes) |
| F2 | `deriveBurstConfidence` | `burst-taxonomy.ts:76` | O(k) | O(1) | Contrast + support + shape bonus |
| F3 | `normalizeScore` | `burst-taxonomy.ts:60` | O(k log k) | O(k) | Weighted median of value/count/duration |
| F4 | `median` helper | `burst-taxonomy.ts:34` | O(k log k) | O(k) | Sort→midpoint |
| F5 | `average` helper | `burst-taxonomy.ts:43` | O(k) | O(1) | Sum / count |

**F1 complexity:** The decision tree has hardcoded thresholds (0.72 high, 0.30 low, 0.16 contrast delta). Multiple tie-break paths create complex decision surface. `sustainedShape` and `isolatedShape` can both be true simultaneously (sustained wins).

**F3:** Calls `median` 5+ times per classification, each sorting a copy. Pre-sort neighbors once. Compute all stats in one pass.

**F2:** Weights (0.46 + 0.34 = 0.80) don't sum to 1.0 — shapeBonus is additive. Total can exceed 1.0 before clamp01. Fix: normalize weights.

---

### G. Confidence Scoring

| # | Algorithm | File:Line | Time | Space | Approach |
|---|-----------|-----------|------|-------|----------|
| G1 | `calculateDataClarity` | `confidence-scoring.ts:46` | O(n + k) | O(k) | CV = σ/μ → min(100, CV·50) |
| G2 | `calculateCoverage` | `confidence-scoring.ts:105` | O(n + k log k) | O(k) | Span + log-density + Gini coefficient |
| G3 | `calculateStatisticalConfidence` | `confidence-scoring.ts:179` | O(k) | O(k) | SNR·0.4 + prominence·0.35 + entropy·0.25 |
| G4 | `calculateConfidence` | `confidence-scoring.ts:228` | **O(3n)** | O(k) | Orchestrator: clarity + coverage + statistical |

**🔴 G4 triple binning:** When `densityBins` not provided: generates bins (O(n)). G1 bins again (O(n)). G2 bins again (O(n)). Even when `densityBins` IS provided, G1 and G2 ignore it and re-bin independently because they don't accept pre-computed bins. **This is the single most impactful performance fix in the codebase.**

Additionally, the bin counts differ: G1 uses `clamp(n/100, 10, 100)` while callers use `clamp(n/50, 20, 100)`. Inconsistent granularity means confidence scores operate on different resolution than the detection that invoked them.

**G2:** Gini coefficient calculation sorts 20 bins (fine), but two crime passes (min/max + bins) can be fused into one.

**G3:** `Math.log2` slower than `Math.log(v) * Math.LOG2E`. `.map()` for normalization creates array. Fix: inline.

---

### H. Interval / Boundary Detection

| # | Algorithm | File:Line | Time | Space | Approach |
|---|-----------|-----------|------|-------|----------|
| H1 | `detectPeaks` | `interval-detection.ts:57` | O(k) | O(k) | Local max above mean + k·σ threshold |
| H2 | `detectChangePoints` | `interval-detection.ts:110` | **O(k·w)** | O(k) | Sliding window mean comparison |
| H3 | `applyRuleBased` | `interval-detection.ts:170` | O(k) | O(k) | Equal-time division |
| H4 | `detectBoundaries` | `interval-detection.ts:224` | O(n + k²) worst | O(n + k) | Main orchestrator with fallback merge |
| H5 | `snapToBoundary` | `interval-detection.ts:198` | O(1) | O(1) | Date arithmetic for hour/day rounding |

**H2:** `densityBins.slice(i-w, i).reduce()` creates temporary array per iteration. Use running sum: O(k·w) → O(k).

**H4:** Falls back to rule-based merge when < 2 boundaries found. Full sort of merged array (`O(f log f)`). Fix: merge via sorted pass. Also re-bins crimes after caller (e.g., `full-auto-orchestrator`) already binned them.

**H5:** `new Date(epoch*1000)` per boundary. Fix epoch arithmetic: `Math.round(e/3600)*3600` for hours, `Math.floor(e/86400)*86400 + 43200` for midday.

**H1 plateau issue:** Uses `>` on both sides — misses plateaus `[1,2,2,1]`. Use `>=` on one side.

---

### I. Slice Generation & Allocation

| # | Algorithm | File:Line | Time | Space | Approach |
|---|-----------|-----------|------|-------|----------|
| I1 | `clusterSlices` | `slice-geometry.ts:64` | O(n²) worst | O(n) | Gap-based clustering with **redundant reduce** |
| I2 | `computeSliceGeometry` | `slice-geometry.ts:34` | O(1) | O(1) | Scale + clamp to 1px min |
| I3 | `resolveSliceBoundsPercent` | `slice-geometry.ts:23` | O(1) | O(1) | Pattern match on slice type |
| I4 | `allocateNonUniformSlices` | `slice-allocator.ts:10` | O(n log n + b²) | O(n + b) | Proportion alloc + **O(b²) remainder** + **O(n·b) indexOf** |
| I5 | `allocateSlices` (burst) | `burst-detection.ts:305` | O(b·target) | O(b) | Same as I4, different remainder strategy |
| I6 | `normalizeRange` | `slice-utils.ts:5` | O(1) | O(1) | Swap if start > end |
| I7 | `withinTolerance` | `slice-utils.ts:8` | O(1) | O(1) | Absolute diff comparison |
| I8 | `rangesMatch` | `slice-utils.ts:20` | O(1) | O(1) | Tolerance-based equality |
| I9 | `compactBurstPartitions` | `burst-detection.ts:246` | O(P) | O(P) | Ceiling-based group reduce |

**I4 bottlenecks:**
1. Remainder correction loop scans all bins per iteration (`O(b²)`). Fix: Hare quota apportionment (single pass) cuts to O(b log b).
2. `bins.indexOf(bin)` per sub-slice inside subdivision loop (`O(n·b)`). Fix: pre-compute `Map<BurstBinResult, number>`.
3. **Duplicate of I5** — same proportional allocation algorithm, different file, minor variations in correction strategy.

**I1:** `totalWidth` recomputed via `.reduce()` on every slice append in a cluster. Accumulate incrementally: O(n²) → O(n).

---

### J. Slice Creation & State

| # | Algorithm | File:Line | Time | Space | Approach |
|---|-----------|-----------|------|-------|----------|
| J1 | `sortSlices` | `createSliceCoreSlice.ts:50` | O(s log s) | O(s) | Stable Schwartzian transform |
| J2 | `getOverlapCounts` | `createSliceCoreSlice.ts:117` | O(v²) | O(v) | Pairwise 1D overlap |
| J3 | `findMatchingSlice` | `createSliceCoreSlice.ts:176` | O(s) | O(1) | Linear scan with tolerance |
| J4 | `addBurstSlice` | `createSliceCoreSlice.ts:192` | O(s log s) | O(s) | Dedup + full sort |
| J5 | `mergeSlices` | `createSliceCoreSlice.ts:236` | O(s log s + m log m) | O(s) | Adjacency check + merge |
| J6 | `replaceSlicesFromBins` | `createSliceCoreSlice.ts:374` | O(b log b) | O(b) | Bin→slice conversion |
| J7 | `toNormalizedStoreRange` | `createSliceCoreSlice.ts:16` | O(1) | O(1) | Multi-source range normalization |
| J8 | `updatePreview` | `createSliceCreationSlice.ts:75` | O(1) | O(1) | Clamp + compute ghost position |
| J9 | `commitCreation` | `createSliceCreationSlice.ts:96` | O(s log s) | O(1) | Create + add + sort |
| J10 | `toggleSlice`/`selectAll` | `createSliceSelectionSlice.ts:5` | O(1)/O(k) | O(k) | Set operations |
| J11 | `selectCreationPreviewFeedback` | `selectors.ts:39` | O(1) | O(1) | Manual memoization with module-level cache |
| J12 | `useAutoBurstSlices` | `useSliceStore.ts:46` | O(w·s log s) | O(w) | 3 effects: create, normalize, cleanup |
| J13 | `snapToInterval` / `getSnapInterval` | `slice-utils.ts:21` (timeline-test) | O(1) | O(1) | Round to nearest interval |
| J14 | `constrainDuration` | `slice-utils.ts:45` (timeline-test) | O(1) | O(1) | Clip to domain + min/max duration |
| J15 | `resolveNeighborCandidates` | `slice-adjustment.ts:121` | O(b·s) | O(s) | Collect boundary candidates from other slices |
| J16 | `pickNearest` | `slice-adjustment.ts:144` | O(m log m) | O(m) | Full sort for nearest — use linear scan instead |
| J17 | `resolveSnap` | `slice-adjustment.ts:174` | O(m log m) | O(m) | Snap dispatch + delegate to J16 |
| J18 | `adjustBoundary` | `slice-adjustment.ts:196` | O(m log m) | O(m) | Core boundary adjustment orchestration |

**J12:** Three separate `useEffect`s for burst creation, normalization, cleanup. Signature-based dedup using rounded floats is fragile. Consolidate into single effect.

**J16:** Full sort of m candidates (m ≤ 20) for nearest pick. Use linear `reduce`: O(m log m) → O(m).

**J4:** Full sort on every burst slice addition. Use binary search + splice for single insertions.

---

### K. Warp Slice & Profile Generation

| # | Algorithm | File:Line | Time | Space | Approach |
|---|-----------|-----------|------|-------|----------|
| K1 | `analyzeDensity` | `warp-generation.ts:67` | O(n + k log k) | O(k) | Equal-width binning + top/bottom 10% |
| K2 | `detectEvents` | `warp-generation.ts:160` | O(k·w) | O(e) | Sliding window change detection |
| K3 | `generateWarpProfiles` | `warp-generation.ts:218` | O(n + k log k) | O(k + p) | 3 profiles: aggressive/balanced/conservative |
| K4 | `generateIntervals` | `warp-generation.ts:308` | O(k) | O(k) | Equal-interval density averaging |
| K5 | `addSlice` (warp) | `useWarpSliceStore.ts:44` | O(1) | O(1) | Index-based default positioning |
| K6 | `updateSlice` (warp) | `useWarpSliceStore.ts:60` | O(n) | O(n) | Map scan + normalize |
| K7 | `removeSlice` (warp) | `useWarpSliceStore.ts:78` | O(n) | O(n) | Filter + profile cleanup |

**K2:** Sliding window calls `slice().reduce()` per position. Use rolling sums. `detectEvents` result is computed but never consumed by `generateIntervals` (dead work, line 239).

**K3:** Calls `detectEvents` at line 239 but `events` variable is only assigned, never read. Dead code.

**K1:** Full sort of bins (O(k log k)) to extract top/bottom 10%. Use QuickSelect (O(k)).

**K5/K6/K7:** For typical counts (<20), O(n) is fine. `min-width-enforcement` extends only `end`, not `start` — can exceed 100 when start is near 100. Fix: symmetric centering.

---

### L. Proposal Ranking & Scoring

| # | Algorithm | File:Line | Time | Space | Approach |
|---|-----------|-----------|------|-------|----------|
| L1 | `generateRankedAutoProposalSets` | `full-auto-orchestrator.ts:34` | O(n + k log k) | O(n + k + p) | Full pipeline: profiles + boundaries + scoring |
| L2 | `normalizeBoundaries` | `full-auto-orchestrator.ts:164` | O(m log m) | O(m) | Filter→clamp→sort→Set→Array |
| L3 | `scoreWarpOnly` | `full-auto-orchestrator.ts:183` | O(2i log i) | O(i) | Calls overlap check + overlap scoring separately |
| L4 | `scoreWarpContinuity` | `full-auto-orchestrator.ts:222` | O(i) | O(1) | Sum of absolute adjacent differences |
| L5 | `hasOverlappingIntervals` | `full-auto-orchestrator.ts:238` | O(i log i) | O(i) | Sort + scan — **duplicate** of L6 first half |
| L6 | `scoreOverlapMinimization` | `full-auto-orchestrator.ts:259` | O(i log i) | O(i) | Sort + activeEnd tracking |
| L7 | `generateWhyRecommended` | `full-auto-orchestrator.ts:298` | O(d log d) | O(1) | Top-2 dimension extraction |
| L8 | `generateIntervalProposals` | `intervalProposalEngine.ts:166` | O(M·N log M·N) | O(M·N) | Cartesian product → score → sort → greedy suppression |
| L9 | `scoreProposal` | `intervalProposalEngine.ts:110` | O(1) | O(1) | Heuristic: 0.5·density + 0.35·coverage + 0.15·sharpness |
| L10 | `shouldSuppress` | `intervalProposalEngine.ts:86` | O(A) | O(1) | Overlap ratio check |
| L11 | `generateWarpProposals` | `warpProposalEngine.ts:135` | O(M) | O(M) | One proposal per constraint |
| L12 | `buildProposalMaps` | `applyWarpProposal.ts:19` | O(B) | O(B) | Gaussian synthetic map generation |

**L3:** `hasOverlappingIntervals` (L5) and `scoreOverlapMinimization` (L6) both sort and scan independently. Merge — return overlap flag from L6. O(2i log i) → O(i log i).

**L8:** All M×N proposals materialized before sort+filter. Use beam search (top-K per constraint) or max-heap.

**L1:** `buildSharedIntervalSet` → `detectBoundaries` re-bins data that `generateWarpProfiles` already binned. Pass pre-computed density bins.

**L2:** Clean implementation.

---

### M. STKDE / KDE / Hotspot Detection

| # | Algorithm | File:Line | Time | Space | Approach |
|---|-----------|-----------|------|-------|----------|
| M1 | `buildStkdeGridConfig` | `stkde/compute.ts:44` | O(1) | O(1) | Coarsening via ceil(sqrt(total/max)) |
| M2 | `computePeakWindow` | `stkde/compute.ts:82` | O(M log M) per cell | O(M) | Two-pointer peak on sorted timestamps |
| M3 | `computePeakWindowFromBuckets` | `stkde/compute.ts:187` | O(B log B) per cell | O(B) | Two-pointer on pre-bucketed data |
| M4 | `buildIntensityFromSupport` | `stkde/compute.ts:117` | **O(R·C·K²)** | O(R·C) | Grid-convolution Gaussian KDE |
| M5 | `computeSingleStkdeSurfaceFromCrimes` | `stkde/compute.ts:238` | **O(N log N + R·C·K²)** | O(N + R·C) | Full pipeline: filter→sort→bin→KDE→peak→hotspot |
| M6 | `buildFullPopulationStkdeInputs` | `full-population-pipeline.ts:89` | O(N) DB + pagination | O(R·C + B) | DuckDB grid+bucket aggregation |
| M7 | `computeSliceKde` | `compute-slice-kde.ts:9` | **O(R·C·K²)** | O(R·C) | Same brute-force KDE on 32×32 grid |
| M8 | `projectHotspots` | `stkdeHotspot.worker.ts:28` | O(H log H) | O(H) | 4 chained filters + sort |

**🔴 M4/M7:** All 2D KDE uses brute-force O(R·C·K²) Gaussian convolution. No FFT, no separable kernel, no integral image. For max grid (12K cells, K≈20): ~4.8M weight evaluations with sqrt+exp per neighbor. Fix:
1. **Separable convolution** (highest impact, O(R·C·K²) → O(R·C·K))
2. Precompute kernel weight LUT
3. Replace sqrt with squared distance: `exp(distSq * invTwoSigmaSq)`

**M2:** Called per populated cell (up to 12,000×). Each sorts its own timestamp array. Data arrives sorted from DuckDB — pass `preSorted` flag. Fix: return early for M ≤ 2.

**M6:** Pagination via `LIMIT/OFFSET` — ~425 round-trips for 8.5M records. DuckDB can return all rows in one result. Combine COUNT + aggregation via `COUNT(*) OVER()`.

**M8:** 4 chained `.filter()` calls iterate 4 times. Single-pass loop.

**M5:** `Array.from({length: cellCount}, () => [])` pre-allocates 12,000+ empty arrays. Use lazy `Map<number, number[]>`.

---

### N. Clustering

| # | Algorithm | File:Line | Time | Space | Approach |
|---|-----------|-----------|------|-------|----------|
| N1 | `analyzeClusters` | `cluster-analysis.ts:81` | **O(n²)** | O(n) | DBSCAN via `density-clustering` — no spatial index |

**N1 bottlenecks:**
1. **O(n²)** — `density-clustering` uses naive DBSCAN without kd-tree or R-tree acceleration
2. `(dbscan as unknown as {noise?: number[]}).noise` — fragile private property access via type cast
3. `point.y * 0.5` temporal weight is hardcoded magic number
4. `stabilizeNumber` called redundantly on every output value

**Improvements:**
1. Replace with `supercluster` or implement kd-tree-accelerated DBSCAN (O(n log n) expected)
2. Make `timeWeight` a parameter
3. Consider OPTICS for variable-density clusters
4. Subclass DBSCAN or fork to expose noise/official API

---

### O. Evolution Models

| # | Algorithm | File:Line | Time | Space | Approach |
|---|-----------|-----------|------|-------|----------|
| O1 | `buildEvolutionFlowModel` | `evolution-flow.ts:40` | O(M log M) | O(M) | Slice-to-slice linear flow segments |
| O2 | `buildBurstEvolutionModel` | `burst-evolution.ts:84` | O(M·B + M²) | O(M + B) | Slice↔window burst graph |
| O3 | `compareAdjacentSlices` | `adjacent-slice-comparison.ts:121` | O(T + D) | O(T + D) | Count/delta/type/district comparison |

**O2:** For each burst window, iterates all slice nodes to find overlapping slices. Use interval tree (O(log M) per window). `seenSegmentKeys` Set grows with each pair — dedup at algorithm level, not via growing set.

**O3:** `JSON.stringify(left.typeCounts) === JSON.stringify(right.typeCounts)` for identity check — creates full string representations. Use rolling hash or Object.keys length + sentinel. `densityRatio` falls back to `right.totalCount` when left=0 — use Infinity.

---

### P. Statistical Aggregation

| # | Algorithm | File:Line | Time | Space | Approach |
|---|-----------|-----------|------|-------|----------|
| P1 | `aggregateStats` | `aggregation.ts:32` | O(5·n) | O(1) | 5 single-pass iterations over same array |
| P2 | `aggregateByDistrict` | `aggregation.ts:80` | O(n) | O(d) | Map group |
| P3 | `aggregateByType` | `aggregation.ts:110` | O(n) | O(t) | Map group |
| P4 | `aggregateByHour` | `aggregation.ts:145` | O(n) | O(24) | Hour group |
| P5 | `aggregateByDayOfWeek` | `aggregation.ts:175` | O(n) | O(7) | Day group |
| P6 | `aggregateByMonth` | `aggregation.ts:195` | O(n) | O(m) | Month group |
| P7 | `mean` | `stats.ts:6` | O(n) | O(1) | Sum/count |
| P8 | `stddev` | `stats.ts:13` | O(2n) | O(1) | Two-pass variance |
| P9 | `coefficientOfVariation` | `stats.ts:23` | O(2n) | O(1) | σ/μ — **identical to burstiness** |
| P10 | `burstiness` | `stats.ts:31` | O(2n) | O(1) | (σ-μ)/(σ+μ) — **identical to CV** |

**P1:** 5 independent iterations over the same crime array can be fused into one pass. Each calls `new Date(timestamp*1000)` 3+ times — cache Date per crime.

**P8/P9/P10:** `coefficientOfVariation` and `burstiness` are identical implementations. Two-pass variance throughout. Use Welford's online algorithm for single-pass.

---

### Q. Comparable Warp Scaling

| # | Algorithm | File:Line | Time | Space | Approach |
|---|-----------|-----------|------|-------|----------|
| Q1 | `scoreComparableWarpBins` | `warp-scaling.ts:108` | O(k) | O(k) | Peer-relative: `count / average` |
| Q2 | `buildComparableWarpMap` | `warp-scaling.ts:165` | O(k) | O(k) | Proportional width + minimum share |
| Q3 | `clampComparableWarpWeight` | `warp-scaling.ts:69` | O(1) | O(1) | Clamp to [minWarpWeight, maxWarpWeight] |
| Q4 | `clampMinimumWidthShare` | `warp-scaling.ts:62` | O(1) | O(1) | Cap at min(0.45, 1/(2·k)) |
| Q5 | `toComparableScore` | `warp-scaling.ts:89` | O(1) | O(1) | Object construction |

Clean O(k) implementations. Minimum width floor guarantees all bins visible. `clampMinimumWidthShare` at 0.45 seems arbitrary but ensures no single bin dominates.

---

### R. Selection Algorithms

| # | Algorithm | File:Line | Time | Space | Approach |
|---|-----------|-----------|------|-------|----------|
| R1 | `findNearestIndexByTime` | `selection.ts:76` | **O(n)** | O(1) | Brute-force linear scan |
| R2 | `findNearestIndexByScenePosition` | `selection.ts:121` | **O(n)** | O(1) | Brute-force with `Math.hypot` |
| R3 | `resolvePointByIndex` | `selection.ts:52` | O(1) | O(1) | Columnar → flat lookup |
| R4 | `selectFilteredData` | `data/selectors.ts:17` | O(n) | O(k) | Linear filter by type/district/time |

**R1:** O(n) scan over all 8.5M events. Events loaded in SQL ORDER BY order — use binary search (O(log n) ≈ 24 comparisons).

**R2:** `Math.hypot(dx, dz)` has sqrt+overflow protection built in. Use `dx*dx + dz*dz` for comparison, sqrt only for final result. Consider spatial bucketing.

**R4:** Time range normalization may incorrectly handle input scale (epoch vs normalized). See §6 normalization ambiguity.

---

## 3. Duplicate Algorithm Registry

| Algorithm | Location 1 | Location 2 | Impact |
|-----------|-----------|-----------|--------|
| `computeTemporalB` | `burst-detection.ts:53` | `bursts/route.ts:45` | Fixes must replicate |
| Proportional allocation | `slice-allocator.ts:10` | `burst-detection.ts:305` | Different correction strategies — drift risk |
| `toNormalizedStoreRange` | `createSliceCoreSlice.ts:16` | `useSliceStore.ts:18` | Identical logic |
| 3D density bin SQL | `queries/aggregations.ts:207` | `duckdb-aggregator.ts:36` | Aggregator uses string interpolation (SQLi risk) |
| Adaptive boundaries | `adaptiveTime.worker.ts` | `adaptive-bin-diagnostics.ts` | Float32 vs Float64, same logic |
| `findBoundaryBin` | `adaptiveTime.worker.ts:48` | `adaptive-bin-diagnostics.ts:100` | Different array type |
| `ensureStrictlyMonotonicBoundaries` | `adaptiveTime.worker.ts:30` | `adaptive-bin-diagnostics.ts:82` | Same logic |
| `uniform-time` boundaries | `adaptiveTime.worker.ts:126` | `adaptive-bin-diagnostics.ts:128` | Inline vs separate function |
| `uniform-events` boundaries | `adaptiveTime.worker.ts:99` | `adaptive-bin-diagnostics.ts:143` | Float32 vs Float64 |
| `coefficientOfVariation` / `burstiness` | `stats.ts:23` | `stats.ts:31` | Identical implementation |
| `hasOverlappingIntervals` / `scoreOverlapMinimization` | `full-auto-orchestrator.ts:238` | `full-auto-orchestrator.ts:259` | Same sort+scan, merged |
| Bin→slice conversion | `createSliceCoreSlice.ts:384` | `createSliceCoreSlice.ts:320` | Nearly identical blocks |

**Total: 12 known duplicates across the codebase.**

---

## 4. Critical Bottlenecks

(sorted by potential impact)

| Rank | Algorithm | Complexity | File:Line | Impact | Fix |
|------|-----------|-----------|-----------|--------|-----|
| 🔴 1 | `averageNearestNeighborDistance` | **O(n²)** | `burst-detection.ts:132` | ~30B distance calcs for 12×50k points | kd-tree or grid-based ANN |
| 🔴 2 | `buildIntensityFromSupport` (KDE) | **O(R·C·K²)** | `stkde/compute.ts:117` | ~4.8M weight evals at max grid | Separable convolution |
| 🔴 3 | `computeSingleStkdeSurfaceFromCrimes` | **O(N log N + R·C·K²)** | `stkde/compute.ts:238` | Full pipeline for each slice | Share KDE across slices |
| 🔴 4 | `computeAdaptiveMaps` sort+copy | **O(N log N) + O(N) copy** | `adaptiveTime.worker.ts:91` | Blocks UI thread | In-place sort, no Array.from |
| 🔴 5 | `computeSliceKde` | **O(R·C·K²)** | `compute-slice-kde.ts:9` | Brute-force on 32×32 grid | Separable conv / precomputed LUT |
| 🔴 6 | `analyzeClusters` (DBSCAN) | **O(n²)** | `cluster-analysis.ts:81` | Full point dataset | kd-tree-accelerated DBSCAN |
| 🟠 7 | `calculateConfidence` + callees | **O(3n)** triple bin | `confidence-scoring.ts` | Every confidence call | Shared binning utility |
| 🟠 8 | `resolveBinTimestampTraits` | **O(B·N)** | `adaptive-bin-diagnostics.ts:191` | 50M iterations | Two-pointer sliding window |
| 🟠 9 | `computeAdaptiveY` | **O(2n+2B)** double bin | `adaptive-scale.ts:157` | On every render | Cache config, reuse |
| 🟠 10 | `findNearestIndexByTime` | **O(n)** on 8.5M | `selection.ts:76` | Interactive brushing | Binary search (O(log n)) |
| 🟠 11 | `findNearestIndexByScenePosition` | **O(n)** | `selection.ts:121` | Interactive selection | Squared distance + spatial index |
| 🟠 12 | `detectChangePoints` | **O(B·W)** slice+reduce | `interval-detection.ts:110` | Many temp arrays | Rolling sum (O(B)) |
| 🟡 13 | `domainAutoDetect` spread | **O(n) + OOM risk** | `binning/engine.ts:37` | 8.5M records OOM | reduce pass |
| 🟡 14 | `generateIntervalProposals` | **O(M·N log M·N)** | `intervalProposalEngine.ts:166` | All proposals materialized | Beam search / max-heap |
| 🟡 15 | `allocateNonUniformSlices` | **O(n·b) indexOf + O(b²)** | `slice-allocator.ts:10` | Subdivision + remainder | Cache Map + Hare quota |
| 🟡 16 | `buildBurstEvolutionModel` | **O(M·B + M²)** | `burst-evolution.ts:84` | Slice/window iteration | Interval tree |
| 🟢 17 | `clusterSlices` redundant reduce | O(n²) actual | `slice-geometry.ts:64` | Incremental width | Accumulate instead of reduce |
| 🟢 18 | `pickNearest` full sort | O(m log m) | `slice-adjustment.ts:144` | Small candidate set | Linear scan |

---

## 5. Priority Improvement Recommendations

### Immediate (1-3 days, high impact)

| # | Improvement | Effort | Files Affected | Expected Gain |
|---|------------|--------|---------------|---------------|
| 1 | **Shared binning utility** — bin once, pass to all confidence scorers | 4h | `confidence-scoring.ts`, `interval-detection.ts` | 3× fewer bin operations per call |
| 2 | **Replace Math.min(...map) with reduce** | 15m | `binning/engine.ts:37` | Prevents OOM for 8.5M |
| 3 | **Epoch arithmetic instead of new Date()** | 1h | `binning/engine.ts` (5 strategies) | ~50× faster per-call, avoids 8.5M Date allocations |
| 4 | **Sort Float32Array in-place** in worker | 30m | `adaptiveTime.worker.ts:91` | Eliminates O(n) copy on every worker message |
| 5 | **Prefix sum for box filter smoothing** | 30m | `queries/aggregations.ts:25` | O(B·W) → O(B) |
| 6 | **Remove dead `detectEvents` call** | 5m | `warp-generation.ts:239` | Eliminates wasted computation |
| 7 | **SQL injection fix in duckdb-aggregator** | 30m | `duckdb-aggregator.ts:51` | Parameterize queries |

### Short-term (3-7 days)

| # | Improvement | Effort | Files Affected | Expected Gain |
|---|------------|--------|---------------|---------------|
| 8 | **Merge overlap sort+scan** (L3/L5) | 1h | `full-auto-orchestrator.ts` | 2× fewer sorts per ranking |
| 9 | **Cache bin indices in subdivision loop** | 1h | `slice-allocator.ts` | O(n·b) → O(n) in subdivision |
| 10 | **Rolling sum for change point detection** | 2h | `interval-detection.ts:110` | O(B·W) → O(B) |
| 11 | **Binary search for nearest-by-time** | 2h | `selection.ts:76` | 8.5M → 24 comparisons |
| 12 | **Separate KDE convolution** | 4h | `stkde/compute.ts:117` | O(R·C·K²) → O(R·C·K) |
| 13 | **Single-pass `aggregateStats`** | 2h | `aggregation.ts:32` | 5 scans → 1 scan |
| 14 | **Per-type running agg instead of sort** | 2h | `binning/engine.ts` | O(m log m) → O(m) per type |
| 15 | **Two-pointer for bin trait classification** | 2h | `adaptive-bin-diagnostics.ts` | O(B·N) → O(N+B) |

### Medium-term (1-3 weeks)

| # | Improvement | Effort | Files Affected | Expected Gain |
|---|------------|--------|---------------|---------------|
| 16 | **kd-tree for ANN spatial burstiness** | 3d | `burst-detection.ts:132` | O(n²) → O(n log n) |
| 17 | **kd-tree for DBSCAN acceleration** | 2d | `cluster-analysis.ts:81` | O(n²) → O(n log n) |
| 18 | **Hare quota for slice allocation** | 1d | `slice-allocator.ts`, `burst-detection.ts` | O(b²) → O(b log b) |
| 19 | **DRY duplicate algorithms** | 3d | Multiple files | 12 fewer maintenance points |
| 20 | **Adaptive grid sizing** | 2d | `burst-detection.ts:72`, `compute-slice-kde.ts` | Configurable spatial resolution |

### Long-term (3+ weeks)

| # | Improvement | Effort | Files Affected | Expected Gain |
|---|------------|--------|---------------|---------------|
| 21 | **FFT-based 2D KDE** | 1-2w | `stkde/compute.ts` | O(R·C·K²) → O(R·C·log(R·C)) |
| 22 | **Radix sort for timestamp sorting** | 1w | `adaptiveTime.worker.ts` | O(N log N) → O(N·k) integer sort |
| 23 | **Normalization scale unification** | 1w | Multiple files | Eliminates ambiguity bugs |
| 24 | **Full-pipeline memoization** | 1w | STKDE pipeline | Zero recomputation for unchanged inputs |

---

## 6. Cross-Cutting Concerns

| # | Concern | Severity | Impact | Files |
|---|---------|----------|--------|-------|
| CC1 | **Duplicate binning** — 3-4× redundant crime data binning across subsystems | **High** | 3× compute per call chain | `confidence-scoring.ts`, `interval-detection.ts`, `warp-generation.ts`, `full-auto-orchestrator.ts` |
| CC2 | **No FFT for any 2D KDE** — all brute-force O(R·C·K²) | **High** | ~4.8M evals at max grid | `stkde/compute.ts`, `compute-slice-kde.ts` |
| CC3 | **No memoization** — STKDE slices recompute full KDE from scratch | **Medium** | N·slice × full cost | `stkde/compute.ts` |
| CC4 | **Object allocation in hot paths** — per-cell arrays, per-bucket objects, functional chains create GC pressure | **Medium** | GC stalls | `stkde/compute.ts`, `full-population-pipeline.ts`, `binning/engine.ts` |
| CC5 | **Magic numbers** — y-scale 0.5, strength 100, CV>2, 0.72/0.3 thresholds, isolation duration 90/180s | **Medium** | Non-configurable heuristics | Multiple files |
| CC6 | **Two-pass statistics** — stddev, detectPeaks, detectChangePoints all compute mean first | **Low** | 2× scan per stat | `stats.ts`, `interval-detection.ts` |
| CC7 | **Degenerate input handling** — densityRatio falls back to right count when left=0 | **Low** | Misleading ratios | `adjacent-slice-comparison.ts`, `burst-evolution.ts` |
| CC8 | **Fragile library interface** — `readNoiseIndexes` accesses private `.noise` via cast | **Low** | Breaks on library update | `cluster-analysis.ts` |
| CC9 | **Normalization ambiguity** — 0-100 scale handled differently across 4+ modules (clamping, heuristic checks, inconsistent conventions) | **Medium** | Potential bugs | `time-domain.ts`, `date-normalization.ts`, `selection.ts`, `data/selectors.ts` |
| CC10 | **Numerical stability** — sumSq/N - mean² for variance produces negatives; 1e-6 boundaries produce absurd densities; log(0) handling inconsistent | **Low** | Edge case precision loss | `adaptiveTime.worker.ts`, `burst-detection.ts` |
| CC11 | **SQL injection risk** — duckdb-aggregator interpolates type/district values into query strings | **High** | Security | `duckdb-aggregator.ts:51-57` |

---

## 7. Key Data Structures Catalog

| Structure | Type | Typical Size | Used In |
|-----------|------|-------------|---------|
| `countMap` | `Float32Array` | binCount (default 1024) | Worker, diagnostics |
| `densityMap` | `Float32Array` | binCount | Worker, diagnostics |
| `burstinessMap` | `Float32Array` | binCount | Worker |
| `warpMap` | `Float32Array` | binCount | Worker, diagnostics |
| Boundaries (uniform-time) | `Float64Array` / `Float32Array` | binCount + 1 | Worker + diagnostics |
| Boundaries (uniform-events) | `Float32Array` | binCount + 1 | Worker |
| Spatial distribution grid | `Float64Array` | 1024 (32×32) | `burst-detection.ts` |
| Grid KDE support | `Float64Array` | rows × cols (up to 12K) | `stkde/compute.ts` |
| Per-cell timestamp arrays | `number[][]` | Cell count × avg events | `stkde/compute.ts` |
| `RankableIntervalProposal[]` | Object[] | M × N proposals | `intervalProposalEngine.ts` |
| `ComparableWarpScore[]` | Object[] | M bins | `warp-scaling.ts` |
| `AdaptiveBinDiagnosticRow[]` | Object[] | binCount | `adaptive-bin-diagnostics.ts` |
| `TimeSlice[]` | Object[] | s < 200 | Store slices |
| Crime data (columnar) | TypedArrays + Uint8Array | 8.5M × ~8 columns | Store, queries |
| Burst bin results | Object[] | P partitions | `burst-detection.ts` |
| Full population buckets | `Map<number, FullPopulationBucket[]>` | R × C × B | `full-population-pipeline.ts` |

---

*Generated from 4 parallel agent analyses covering 60+ source files, ~197 distinct algorithms, ~5,200 LOC of algorithmic code across `src/`.*

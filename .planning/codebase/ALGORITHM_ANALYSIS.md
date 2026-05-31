# Algorithm Analysis: Adaptive Time Scaling, Burst Detection & Interval Proposal

**Analysis Date:** 2026-05-29

**Scope:** 18 source files across `src/lib/`, `src/workers/`, `src/store/`, `src/app/api/`, `src/app/cube-sandbox/lib/`, `src/app/timeslicing-algos/lib/`, `src/types/`

---

## A. Adaptive Binning & Density Maps

### A1. `computeAdaptiveMaps` (Worker — Core Algorithm)
**File:** `src/workers/adaptiveTime.worker.ts`, line 62  
**Algorithm:** Histogram binning with optional smoothing → density-normalization → weight-proportional warp map  
**Inputs:** `Float32Array timestamps`, `[number,number] domain`, `WorkerConfig { binCount, kernelWidth, binningMode }`  

**Behavior:**
1. **Filter + sort** timestamps to domain (line 91-95)
2. **Mode A (`uniform-time`, default):** Equal-width bins — `norm = (t-tStart)/tSpan`, `idx = floor(norm * binCount)` (line 126-131)
3. **Mode B (`uniform-events`):** Variable-width bins — compute `sorted.length / binCount` quantile boundaries, then assign counts via binary search (line 99-123)
4. **Optional smoothing:** Simple moving average (box filter) with `kernelWidth` (line 139-157)
5. **Weight computation:** `weight[i] = 1 + normalizedDensity[i] * 5`; accumulate for warp map (line 170-192)
6. **Burstiness per bin:** running mean/variance of inter-event gaps → normalized coefficient of variation `(σ-μ)/(σ+μ)` mapped to [0,1] (line 200-230)
7. Returns `{ densityMap, burstinessMap, warpMap, countMap }`

**Complexity:**
- Time: **O(N log N)** due to sort in filter step (line 95 — `validTimestamps.sort`) + **O(B) + O(N)** for binning/warp
- Space: **O(N + B)** — full timestamp copy + B-length Float32Arrays
- Bottleneck: **Sort is the dominant cost**. For 8.5M records, this sort runs on the main (worker) thread.
- Suboptimal: `Array.from(timestamps)` on line 91 creates a full intermediate copy before filtering, doubling memory.

**Improvement suggestion:**
- Eliminate the redundant `Array.from()` + `.filter()` + `.sort()` chain. Use a single-pass typed array approach: count entries into bins directly while walking the input once, then sort within occupied bins only.
- Replace the **O(N log N) full sort** with a **radix sort** (O(N·k)) on epoch integers since timestamps are monotonic integers, or use **counting sort** if the domain's time range is bounded and the resolution is seconds → O(N + R) where R is time-span-in-seconds.
- For uniform-events mode: avoid `Array.from()` entirely by working with pre-sorted data from the database (crime data is often ingested in chronological order).

### A2. `computeBurstinessPerBin` (Worker — Burstiness computation)
**File:** `src/workers/adaptiveTime.worker.ts`, lines 200-230  
**Algorithm:** Online Welford-like variance per bin of inter-event gaps  
**Data structures:** `burstCounts[]`, `burstSum[]`, `burstSumSq[]`  

```
For each consecutive pair (sorted[i-1], sorted[i]):
  delta = sorted[i] - sorted[i-1]
  idx = binOf(sorted[i])
  burstCounts[idx]++
  burstSum[idx] += delta
  burstSumSq[idx] += delta²

For each bin:
  mean = burstSum / count
  variance = burstSumSq/count - mean²
  burstiness = (std - mean) / (std + mean) → normalize to [0,1]
```

**Complexity:** O(N) time, O(B) space  
**Note:** Uses `sumSq/N - mean²` formula which is numerically stable ONLY if deltas are small. For very large gaps this can produce negative variance (though clamped via `Math.max(0, ...)` on line 224).  
**Improvement:** Use proper Welford's online algorithm for numerically stable variance.

### A3. `ensureStrictlyMonotonicBoundaries`
**File:** `src/workers/adaptiveTime.worker.ts`, line 30  
**Algorithm:** Linear sequential fix-up — if `boundaries[i] <= boundaries[i-1]`, set to `previous + EPSILON`  
**Complexity:** O(B)  
**Note:** This is a defensive repair heuristic. In uniform-events mode, when many timestamps share the same value (same-second crimes), adjacent quantile boundaries collapse. This fix creates artificial gaps of `1e-6`, which can produce absurdly high density values in those bins (count / 1e-6).

### A4. `findBoundaryBin` — Binary Search
**File:** `src/workers/adaptiveTime.worker.ts`, line 48  
**Algorithm:** Upper-bound binary search (find last boundary < value)  
**Complexity:** O(log B)  
**Called:** For every timestamp in uniform-events mode → O(N log B)

---

## B. Client-Side Adaptive Scale Functions

### B1. `getAdaptiveScaleConfig` / `getAdaptiveScaleConfigColumnar`
**File:** `src/lib/adaptive-scale.ts`, lines 21 / 91  
**Algorithm:** Density-weighted adaptive domain/range for `d3.scaleLinear()`  
**Identical logic** to the worker's weight computation but returns `{ domain[], range[] }` suitable for d3:
1. Bin into `Float64Array(binCount)` — O(N)
2. `maxDensity = max(counts)`
3. `weights[i] = 1 + (density/maxDensity) * 5` — O(B)
4. `totalWeight = sum(weights)`
5. `range[i] = cumulative sum of weight-proportional height` — O(B)

**Complexity:** O(N + B) time, O(B) space  
**Bottleneck:** Two passes over the Float64Array (sum + cumulative build). Can be fused into one.

### B2. `computeAdaptiveY` / `computeAdaptiveYColumnar`
**File:** `src/lib/adaptive-scale.ts`, lines 157 / 193  
**Algorithm:** Maps timestamps to Y positions using adaptive bin interpolation  
**Behavior:** For each timestamp, find its bin, then linearly interpolate within bin's Y-range.  
**Complexity:** O(N + B)  
**Redundancy:** `computeAdaptiveY` calls `getAdaptiveScaleConfig` internally, which bins ALL data. Then it bins again. **Double binning** — the binned counts are computed twice.  
**Improvement:** Refactor to use a single pass: build the config once, reuse it for position mapping.

---

## C. Burst Detection Algorithms

### C1. `computeTemporalB` — Coefficient of Variation
**File:** `src/lib/burst-detection.ts`, line 53  
**Algorithm:** 
```
mean = avg(interEventGaps)
std = sqrt(variance of gaps)
burstiness = (std - mean) / (std + mean)
```
**Range:** [-1, 1], where positive = bursty (clustered), negative = regular, zero = Poisson  
**Complexity:** O(K) where K = gap count = N-1  
**Note:** Simple CoV-based metric. Does not account for seasonality or periodicity.

### C2. `computeTemporalBBinned`
**File:** `src/lib/burst-detection.ts`, line 340  
**Wrapper:** sorts timestamps → computes gaps → calls `computeTemporalB`  
**Complexity:** O(N log N) due to sort

### C3. `buildDistribution` — 32×32 Spatial Grid
**File:** `src/lib/burst-detection.ts`, line 72  
**Algorithm:** Project (x,z) coordinates onto a 32×32 grid where each cell is `100/32 = 3.125` units wide. Counts per cell → normalize to probability distribution.  
**Complexity:** O(N) time, O(1024) space  
**Grid bounds:** Hardcoded to [-50, 50] range (line 67: `(x + 50) / GRID_CELL_SIZE`). Points outside this range get clamped.

### C4. `normalizedEntropy`
**File:** `src/lib/burst-detection.ts`, line 95  
**Algorithm:** Shannon entropy normalized by log(support) → range [0,1]  
**Formula:** `H = -Σ p·ln(p) / ln(support)`  
**Complexity:** O(1024)  
**Used for:** Concentration = `1 - normalizedEntropy`

### C5. `jensenShannonDivergence`
**File:** `src/lib/burst-detection.ts`, line 112  
**Algorithm:** Jensen-Shannon divergence = `0.5 * KL(P||M) + 0.5 * KL(Q||M)` where M = (P+Q)/2, divided by ln(2)  
**Complexity:** O(1024)  
**Used for:** "Surprise" — how different a bin's spatial distribution is from the baseline

### C6. `averageNearestNeighborDistance` — O(N²)
**File:** `src/lib/burst-detection.ts`, line 132  
**Algorithm:** Brute-force O(N²) nearest neighbor search  
```
for each point i:
  for each point j != i:
    compute distance
    track minimum
return average of minima
```
**Complexity:** **O(N²) time**, O(1) space  
**Bottleneck:** For 50,000 sampled points, this is 2.5 billion distance computations.  
**Called by:** `computeAnnScore` which is called when `SpatialFormula = 'ann'`  
**Impact:** The API route (`src/app/api/adaptive/bursts/route.ts`, line 163) samples up to 50,000 points per partition. If `computeAnnScore` is selected, it triggers an O(N²) brute-force search — catastrophic for large datasets.  
**Improvement:** Replace with a **k-d tree** (O(N log N) build + O(log N) per query) or a **Delaunay triangulation** approach. Even a simple **grid-based ANN approximation** (reuse the 32×32 grid and compute cell centroid distances) would reduce this to O(1024²).

### C7. `computeAnnScore`
**File:** `src/lib/burst-detection.ts`, line 158  
**Algorithm:** 
```
observed = avgNearestNeighborDistance(points)
expected = 0.5 * sqrt(100² / N)  (Clark-Evans expectation for a square of side 100)
score = 1 - observed/expected
```
**Complexity:** O(N²) due to `averageNearestNeighborDistance`  
**Note:** Score of 1 = maximally clustered, 0 = random, negative = dispersed

### C8. `computeSpatialB`
**File:** `src/lib/burst-detection.ts`, line 168  
**Algorithm:** Formula selector — computes concentration and surprise, optionally ANN  
```
concentration = 1 - normalizedEntropy(distribution)
surprise = JS-divergence(distribution, baselineDistribution)

switch formula:
  'ann'         → computeAnnScore (O(N²))
  'entropy'     → concentration
  'js-divergence' → surprise
  'balanced'    → concentration * (0.25 + 0.75 * surprise)
```
**Complexity:** O(N) for entropy/JS-divergence paths, **O(N²) for ANN path**

### C9. `compactBurstPartitions`
**File:** `src/lib/burst-detection.ts`, line 246  
**Algorithm:** Greedy grouping — ceil partitions into `maxPartitions` groups, merge each group's time range  
**Complexity:** O(P)  
**Note:** Simple ceiling-based merge that can produce uneven group sizes (last group may be smaller).

### C10. `allocateSlices` — Greedy Proportional Allocation
**File:** `src/lib/burst-detection.ts`, line 305  
**Algorithm:** 
1. Compute proportional allocation: `raw = (binScore / totalScore) * targetCount`, `atLeast = max(1, round(raw))`
2. Compute remainder: `remaining = targetCount - sum(allocations)`
3. While `remaining > 0`: find bin with largest `raw - allocated` deficit, increment by 1 (greedy largest-remainder)
**Complexity:** O(B + R·B) where R ≤ targetCount — worst case O(B·targetCount)  
**Data structure:** Simple array of `{ raw, slicesAllocated }`  
**Improvement:** Use a max-heap for O(B + R log B) instead of scanning all B bins each round.

### C11. `buildFallbackBurstResponse` — Deterministic Seeded Fallback
**File:** `src/lib/burst-detection.ts`, line 271  
**Algorithm:** Uses `Math.sin(seed) * 10000 - floor(...)` to generate deterministic pseudo-random burst scores from partition timestamps  
**Complexity:** O(P)  
**Purpose:** Returns plausible-looking burst data when the API call fails — no network dependency.

---

## D. Confidence Scoring

### D1. `calculateDataClarity`
**File:** `src/lib/confidence-scoring.ts`, line 46  
**Algorithm:** Coefficient of variation of bin counts  
```
binCount = clamp(len/100, 10, 100)
mean = total/bins
variance = Σ(count - mean)² / bins
cv = sqrt(variance) / mean
score = min(100, cv * 50)
```
**Complexity:** O(N + B)  
**Interpretation:** Higher variance → higher clarity. Uniform distribution → score near 0.

### D2. `calculateCoverage`
**File:** `src/lib/confidence-scoring.ts`, line 105  
**Algorithm:** Three-factor composite:
1. **Temporal span:** `(max-min)/range * 30` → weight 30%
2. **Density score:** `log10(N+1) * 20` → weight 35%
3. **Uniformity:** Gini coefficient inverted → `(1 - |gini|) * 100` → weight 35%

The Gini calculation (line 151-157) uses a O(B log B) sort of bins.  
**Complexity:** O(N + B log B) — the sort for Gini is unnecessary since bin indices can be mapped to rank without sorting.

### D3. `calculateStatisticalConfidence`
**File:** `src/lib/confidence-scoring.ts`, line 179  
**Algorithm:** Three-factor weighted score:
1. **SNR:** `std/mean * 100` capped at 100 → weight 40%
2. **Prominence:** `(max-mean)/max * 100` → weight 35%
3. **Entropy-based:** `|Σ v·log₂(v)| / log₂(n) * 100` → weight 25%

**Complexity:** O(B)

### D4. `calculateConfidence`
**File:** `src/lib/confidence-scoring.ts`, line 228  
**Algorithm:** Weighted composite of clarity + coverage + statistical  
**Weights:** clarity=0.4, coverage=0.3, statistical=0.3  
**Fallback:** If densityBins not provided, generates them from crimes array (triple binning — see issue below)  
**Issue:** When called without densityBins, this function bins crimes into density bins. It's called from `detectBoundaries` in `interval-detection.ts` which also already bins crimes into density bins. **The data gets binned twice** for no reason. Worse, the bin counts differ (clarity uses `clamp(len/100,10,100)` while interval-detection uses `clamp(len/50,20,100)`). This means the statistical score operates on a different binning granularity than the detection used.

---

## E. Interval Boundary Detection

### E1. `detectPeaks`
**File:** `src/lib/interval-detection.ts`, line 57  
**Algorithm:** Local maxima above a sensitivity threshold
```
threshold = mean + stdDev * multiplier  (high=0, medium=0.5, low=1.0)
isPeak = density[i] > density[i-1] && density[i] > density[i+1] && density[i] >= threshold
```
Then capped at `maxPeaks` (high=10, medium=6, low=3).  
**Complexity:** O(B)  
**Issue:** The "local maximum" definition (`> left AND > right`) will miss plateaus (e.g., `[1,2,2,1]`). Use `>=` on one side for strict peaks.

### E2. `detectChangePoints` — Sliding Window
**File:** `src/lib/interval-detection.ts`, line 110  
**Algorithm:** Sliding window comparison
```
windowSize = max(2, floor(n/8))
for i = windowSize to n - windowSize:
  leftMean = avg(bins[i-windowSize : i])
  rightMean = avg(bins[i : i+windowSize])
  if |rightMean - leftMean| > threshold:
    if not tooClose to existing change point (< windowSize/2):
      add change point
```
Capped at `maxPoints` (high=8, medium=5, low=3).  
**Complexity:** O(B·W) where W ≈ B/8 → effectively O(B²) in worst case due to repeated `slice` + `reduce` calls.  
**Bottleneck:** `densityBins.slice(i-windowSize, i)` creates a new array each iteration, and `reduce` sums it. This is O(B·W) total allocations.  
**Improvement:** Maintain a running sum for the sliding window: `leftSum += bins[i-1] - bins[i-windowSize-1]`. Reduce from O(B·W) to O(B). Use two-pointer technique.

### E3. `applyRuleBased`
**File:** `src/lib/interval-detection.ts`, line 170  
**Algorithm:** Equal-time spacing: boundaries at `floor(i * n / boundaryCount)` for i = 1..boundaryCount-1  
**Complexity:** O(B)

### E4. `detectBoundaries` — Main Orchestrator
**File:** `src/lib/interval-detection.ts`, line 224  
**Algorithm:**
1. Bin crimes into density histogram (O(N))
2. Normalize bins (O(B))
3. Call selected method (peak/change-point/rule-based)
4. If < 2 boundaries found and method ≠ rule-based: merge with rule-based fallback, deduplicate with 5% min-gap filter
5. Calculate confidence from density bins
**Complexity:** O(N + B) for peak path, O(N + B²) for change-point path

---

## F. Burst Taxonomy Classification

### F1. `classifyBurstWindow`
**File:** `src/lib/binning/burst-taxonomy.ts`, line 104  
**Algorithm:** Multi-criteria rule-based decision tree
```
Input: value, count, durationSec, neighbors[ {value, count, durationSec} ]

Features computed:
  neighborMedian, neighborMax, neighborMin, neighborAverage
  highContrast = value >= 0.72 || value >= neighborMedian + 0.16
  lowContrast = value <= 0.30 || value <= neighborMedian - 0.16
  hasNeighborSupport = average(neighborValues) >= value * 0.84 || max >= value * 0.92
  isolatedShape = duration <= max(90, neighborDurationMedian * 0.75, 180)
  sustainedShape = duration >= max(180, neighborDurationMedian || duration)
                    || count >= max(3, ceil(neighborCountMedian) + 1)

Decision tree:
  if highContrast:
    if !sustained && isolated && !neighborSupport → 'isolated-spike'
    else → 'prolonged-peak'
  else if lowContrast && (no neighbors || lowNeighborContrast) → 'valley'
  else if value >= 0.68 && !sustained && isolated && !neighborSupport → 'isolated-spike'
  else if value <= 0.34 && (no neighbors || lowNeighborContrast) → 'valley'
  else → 'neutral'
  // Then tie-breaking logic with detailed reason strings for each path
```
**Complexity:** O(K) where K = neighbor count (usually 2 — left and right neighbors)  
**Data structures:** Simple arrays for neighbor values/counts/durations  
**Issue:** The decision tree has nested conditions with duplicate code paths. The tie-break reasons are string-encoded logic that cannot be queried programmatically.  
**Improvement:** Replace with a configurable rules engine or decision matrix to make threshold tuning data-driven.

### F2. `deriveBurstConfidence`
**File:** `src/lib/binning/burst-taxonomy.ts`, line 76  
**Algorithm:**
```
contrast = min(1, |value - neighborMedian| + neighborSpread * 0.35)
support = clamp01(average(neighborValues) + 0.15)
shapeBonus = { prolonged-peak: 0.22, isolated-spike: 0.18, valley: 0.16, neutral: 0.08 }
confidence = 0.46 * contrast + 0.34 * support + shapeBonus
```
**Complexity:** O(K)

### F3. `normalizeScore`
**File:** `src/lib/binning/burst-taxonomy.ts`, line 60  
**Algorithm:** Weighted median-based composite:
```
valueMedian = median([value, ...neighborValues])
countMedian = median([count, ...neighborCounts])
durationMedian = median([durationSec, ...neighborDurations])
score = signalScore*0.6 + countScore*0.2 + durationScore*0.2
```
**Complexity:** O(K log K) due to median computation (sorting)

---

## G. Proposal Engine Algorithms

### G1. `generateIntervalProposals` — Greedy Suppression
**File:** `src/app/cube-sandbox/lib/intervalProposalEngine.ts`, line 166  
**Algorithm:**
1. Normalize constraints and burst windows (sort by ID/peak)
2. Cartesian product: for each constraint × each burst → scoreProposal() → **M × N proposals**
3. Sort proposals by score (descending), then constraint ID, then range start, then burst ID
4. **Greedy suppression:** iterate sorted proposals; accept if no already-accepted proposal from same constraint has overlap ratio ≥ 0.55
5. Return accepted proposals

**Complexity:** O(M·N log(M·N)) for sort + O(M·N·A) for suppression, where A = accepted count ≤ M  
**Space:** O(M·N) — all proposals materialized before sorting  
**Bottleneck:** All M×N proposals are generated and sorted even though most are suppressed. If M=20 constraints and N=20 bursts, that's 400 proposals with O(400 log 400) sort.  
**Improvement:** Use **beam search** — generate top-K per constraint, then sort and suppress. Or use a **max-heap** and pop until satisfied.

### G2. `scoreProposal` (interval)
**File:** `src/app/cube-sandbox/lib/intervalProposalEngine.ts`, line 110  
**Algorithm:** Heuristic scoring function:
```
volume = spanX * spanY * spanZ
footprint = spanX * spanZ
densityConcentration = peak*72 + (1/(1+volume/180))*28
hotspotCoverage = peak*55 + (footprint/(footprint+70))*45
intervalSharpness = 16/(16+intervalLength)*100
score = 0.5*densityConcentration + 0.35*hotspotCoverage + 0.15*intervalSharpness
confidence = score*0.88 + peak*12
```
**Complexity:** O(1)  
**Constants:** The magic numbers (72, 28, 55, 45, 16, 180, 70, 0.88, 12) are tuned empirically without documentation of the tuning process.

### G3. `shouldSuppress` / `overlapRatio`
**File:** `src/app/cube-sandbox/lib/intervalProposalEngine.ts`, lines 86-108  
**Algorithm:** `overlap = max(0, min(end₁,end₂) - max(start₁,start₂)) / min(span₁, span₂)`. Suppress if overlap ≥ 0.55 AND same constraint.  
**Complexity:** O(A) per candidate

### G4. `generateWarpProposals`
**File:** `src/app/cube-sandbox/lib/warpProposalEngine.ts`, line 135  
**Algorithm:** One proposal per constraint:
```
for each constraint:
  score = densityConcentration*0.58 + hotspotCoverage*0.42
  warpFactor = currentWarpFactor*0.45 + densityConc/100*0.35 + hotspotCoverage/100*0.2
  temporalWidth = max(10, min(48, spanY*6+8))
  range = [focusTime - width/2, focusTime + width/2] clamped to domain
```
Sort by score (descending), return all.  
**Complexity:** O(M log M)  

### G5. `buildProposalMaps` — Gaussian Synthetic Maps
**File:** `src/app/cube-sandbox/lib/applyWarpProposal.ts`, line 19  
**Algorithm:** Generates synthetic density/burstiness/warp maps shaped as a Gaussian centered on the proposal range:
```
for each bin at time t:
  distance = |t - center| / sigma (sigma = range/2.8)
  gaussian = exp(-0.5 * distance²)
  inRangeBoost = t in [rangeStart, rangeEnd] ? 0.45 : 0
  density = clamp(gaussian + inRangeBoost, 0, 1.6)
  burstiness = clamp(density*0.85 + 0.1, 0, 1.6)
  weight = clamp(0.25 + density*0.75, 0.1, 2.2)
```
Warp map built from cumulative weights.  
**Complexity:** O(B)  
**Note:** This generates fake data — it doesn't query the actual crime data. The maps are purely synthetic shapes. The adaptive store then treats these as if they were computed from real data.

---

## H. Comparable Warp Scoring

### H1. `scoreComparableWarpBins` — Peer-Relative Scoring
**File:** `src/lib/binning/warp-scaling.ts`, line 108  
**Algorithm:**
1. Validate all bins share same granularity
2. Compute `totalCount`, `peerAverage = totalCount / binCount`
3. For each bin: `peerRelativeScore = bin.count / peerAverage`
4. `warpWeight = clamp(peerRelativeScore * hintWeight, 0.25, 4)`
5. `normalizedScore = clamp01(0.5 + (peerRelativeScore - 1) * 0.5)`
**Complexity:** O(M)  
**Fallback:** Returns neutral scores (1.0) if any bin is invalid or total count ≤ 0

### H2. `buildComparableWarpMap` — Proportional Width Map
**File:** `src/lib/binning/warp-scaling.ts`, line 165  
**Algorithm:**
1. If input is raw `ComparableWarpBinInput[]`, run `scoreComparableWarpBins` first
2. Compute `minimumWidthShare` = `clamp(0.08, [0, min(0.45, 1/(2M))])`
3. `remainingShare = 1 - minimumWidthShare * M`
4. `widthShares[i] = minimumWidthShare + weight[i]/totalWeight * remainingShare`
5. Normalize shares to sum to 1
6. Build boundary array from cumulative shares * domainSpan
**Complexity:** O(M)  
**Key property:** Guarantees each bin at least `minimumWidthShare` of the domain, preventing collapsed bins.

---

## I. Adaptive Bin Diagnostics

### I1. `buildUniformTimeBoundaries` / `buildUniformEventsBoundaries`
**File:** `src/app/timeslicing-algos/lib/adaptive-bin-diagnostics.ts`, lines 128 / 143  
**Algorithm:** Same as worker but with Float64Array and domain fallback safety  

### I2. `resolveBinTimestampTraits` — Temporal Trait Classification
**File:** `src/app/timeslicing-algos/lib/adaptive-bin-diagnostics.ts`, line 191  
**Algorithm:** For each bin, classify events within its time range by:
- **Weekend vs weekday** (share ≥ 0.6)
- **Night vs daytime** (night = 22:00-06:00, share ≥ 0.55)
- **Commute hours** (weekday 7-10 or 17-20, share ≥ 0.55)
- **Late night** (00:00-05:00, share ≥ 0.55)
- **Burst pattern** (count/total ÷ width/span ≥ 2.0, min 4 events)

**Complexity:** O(N·B) worst case — for each bin, filters all timestamps in range → O(B·N)  
**Bottleneck:** `resolveBinTimestampTraits` is called per row inside `buildAdaptiveBinDiagnostics`. For each bin, it scans all timestamps with `timestamps.filter(t => t >= start && t < end)`. This is **O(B·N)** — on 1000 bins × 50k timestamps = 50 million iterations.  
**Improvement:** Sort timestamps once, then use two-pointer sliding window. Since bins are contiguous and sorted, a single linear pass O(N + B) suffices.

### I3. `buildAdaptiveBinDiagnostics` — Full Diagnostics Builder
**File:** `src/app/timeslicing-algos/lib/adaptive-bin-diagnostics.ts`, line 337  
**Algorithm:** Assembles a diagnostic table by:
1. Building boundaries (uniform-time or uniform-events)
2. Resolving count/density/warp maps (fallback to compute if missing)
3. Computing weights, warp positions
4. For each bin: computing temporal traits + burst taxonomy classification
**Complexity:** O(B·N + B·K) — dominated by trait classification  
**Bottleneck:** Double iteration — `resolveBinTimestampTraits` inside each row's lambda

---

## J. API-Level Burst Computation

### J1. `computeBurstResponse` (API)
**File:** `src/app/api/adaptive/bursts/route.ts`, line 181  
**Algorithm:** Batched partition processing:
1. Compute baseline range (min start to max end across all partitions)
2. Process partitions in batches of 4 (serial per batch, parallel across batches in future)
3. For each partition: query count → sample points (max 50k) → compute temporalB + spatialB
4. Aggregate total B and target slice count

**Complexity:** O(P·(Db + Ds·Ns²)) where Db = count query time, Ds = spatial computation, Ns = sample size  
**Bottleneck:** If `SpatialFormula = 'ann'`, the inner `computeAnnScore` drives O(P·Ns²) time. For P=12 partitions and Ns=50k, this is 12 × 2.5B = 30 billion distance computations.  
**Sampling:** Points are sampled with stride (line 163) when total > 50k — but the validation at line 174 falls back to mock data if points.length === 0, losing real data.

### J2. `computeTemporalBFromTimestamps`
**File:** `src/app/api/adaptive/bursts/route.ts`, line 45  
**Algorithm:** Identical to `computeTemporalB` in `burst-detection.ts` (duplicated code)  
**Complexity:** O(K log K) due to sort — but sort already done in `buildBurstBin` via `computeSpatialBBinned` which sorts too? No, `computeTemporalBFromTimestamps` sorts its own copy.  

---

## K. Cross-Cutting Concerns

### K1. Duplicate Algorithm Implementations

| Algorithm | Location 1 | Location 2 | Divergence |
|---|---|---|---|
| `computeTemporalB` | `src/lib/burst-detection.ts:53` | `src/app/api/adaptive/bursts/route.ts:45` | Identical code, different file |
| `ensureStrictlyMonotonicBoundaries` | `src/workers/adaptiveTime.worker.ts:30` | `src/app/timeslicing-algos/lib/adaptive-bin-diagnostics.ts:82` | Same logic, one uses Float32Array, one Float64Array |
| `findBoundaryBin` | `src/workers/adaptiveTime.worker.ts:48` | `src/app/timeslicing-algos/lib/adaptive-bin-diagnostics.ts:100` | Same binary search, different array type |
| Uniform-time boundaries | `adaptiveTime.worker.ts:126-132` | `adaptive-bin-diagnostics.ts:128-136` | Inline vs separate function |
| Uniform-events boundaries | `adaptiveTime.worker.ts:99-123` | `adaptive-bin-diagnostics.ts:143-167` | Worker uses Float32Array, diagnostics uses Float64Array |

**Impact:** 4 instances of algorithm duplication. Maintenance hazard — fixes to one must be manually replicated.

### K2. Repeated Binning (N+ pass)

| Call chain | Bin count | Notes |
|---|---|---|
| `detectBoundaries` → binning | `clamp(len/50, 20, 100)` | → normalized density bins |
| `detectBoundaries` → `calculateConfidence` → binning | `clamp(len/100, 10, 100)` | Different bin count! |
| `calculateDataClarity` | `clamp(len/100, 10, 100)` | Same as above, but recalculated |
| `computeAdaptiveY` → `getAdaptiveScaleConfig` → binning | 100 (hardcoded default) | Fourth pass |

In `src/lib/adaptive-scale.ts`, `computeAdaptiveY` calls `getAdaptiveScaleConfig` which bins ALL data, then bins again to map each point. If called for visualization update, this is two passes.

### K3. Memory Allocation Patterns

- `new Float64Array(binCount)` in adaptive-scale.ts — reasonable
- `Array.from(timestamps)` in `adaptiveTime.worker.ts:91` — full copy before filter/sort
- `[...sorted]` in burst-detection.ts:343 — second copy
- `new Float32Array(safeBinCount)` × 4 in adaptiveTime.worker.ts — ~16KB for 1024 bins (negligible)
- Large allocations: `queryCrimePoints` returns up to 50k `Point` objects plus all intermediate arrays

### K4. Numerical Stability

- **Variance formula:** `sumSq/N - mean²` in `adaptiveTime.worker.ts:224` is known to produce negative values for large numbers (catastrophic cancellation). Mitigated by `Math.max(0, ...)` but still loses precision.
- **Uniform-events density:** When boundaries collapse (same timestamp), `width = EPSILON = 1e-6` produces density = count / 1e-6. For count=1, that's 1,000,000 density — which then normalizes everything else to near-zero.
- **Log of zero:** Guarded by `probability <= EPSILON` checks in `normalizedEntropy` and `jensenShannonDivergence`.

---

## L. Summary: Improvement Prioritization

| Priority | Issue | Impact | Files |
|---|---|---|---|
| **Critical** | O(N²) ANN spatial burstiness | 30B distance computations for 12×50k points | `src/lib/burst-detection.ts:132` |
| **Critical** | O(N log N) sort on every worker call | Blocks UI thread for large datasets | `src/workers/adaptiveTime.worker.ts:95` |
| **High** | O(B·N) bin trait classification | 50M iterations for 1000 bins × 50k timestamps | `adaptive-bin-diagnostics.ts:191` |
| **High** | O(B²) change point detection | Unnecessary slice+reduce in sliding window | `src/lib/interval-detection.ts:110` |
| **High** | 4x identical algorithm implementations | Maintenance burden, bug propagation | Multiple files |
| **Medium** | Greedy slice allocation O(B·targetCount) | Linear scan instead of heap | `src/lib/burst-detection.ts:305` |
| **Medium** | Cartesian product proposal generation | M×N materialization before filtering | `intervalProposalEngine.ts:166` |
| **Medium** | Triple binning in confidence pipeline | Wasted computation, inconsistent bin counts | `confidence-scoring.ts` + `interval-detection.ts` |
| **Low** | Numeric precision for variance | Catastrophic cancellation in burstiness | `adaptiveTime.worker.ts:224` |
| **Low** | Artificial 1e-6 boundaries in uniform-events | Inflated densities for same-timestamp events | `adaptiveTime.worker.ts:37-45` |

---

## M. Key Data Structures Catalog

| Structure | Type | Size | Used In |
|---|---|---|---|
| `countMap` | `Float32Array` | binCount (default 1024) | Worker, diagnostics |
| `densityMap` | `Float32Array` | binCount | Worker, diagnostics |
| `burstinessMap` | `Float32Array` | binCount | Worker |
| `warpMap` | `Float32Array` | binCount | Worker, diagnostics |
| Boundaries (uniform-time) | `Float64Array` or `Float32Array` | binCount + 1 | Worker + diagnostics |
| Boundaries (uniform-events) | `Float32Array` | binCount + 1 | Worker |
| Spatial distribution | `Float64Array` | 1024 (32×32 grid) | `burst-detection.ts` |
| `RankableIntervalProposal[]` | Object[] | M×N proposals | `intervalProposalEngine.ts` |
| `ComparableWarpScore[]` | Object[] | M bins | `warp-scaling.ts` |
| `AdaptiveBinDiagnosticRow[]` | Object[] | binCount | `adaptive-bin-diagnostics.ts` |

---

*Analysis generated from reading all 18 source files. File paths relative to project root unless otherwise noted.*

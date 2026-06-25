# Algorithm Analysis

**Analysis Date:** 2026-06-25

---

## 1. Adaptive Time Warping — Complexity & Tradeoffs

### Location: `src/workers/adaptiveTime.worker.ts`

**Time Complexity:**
| Step | Worst Case | Notes |
|------|-----------|-------|
| Timestamp assignment | O(n) | Single pass through n timestamps |
| Kernel smoothing | O(b × k) | b=1024 bins, k=3 kernel width |
| Burstiness computation | O(n + b) | Adjacent pairs + per-bin final pass |
| Warp map | O(b) | Single weight accumulation pass |
| **Total** | **O(n + b × k)** | Dominated by timestamp iteration and kernel pass |

**Space Complexity:**
- O(b) for densityMap, burstinessMap, warpMap, countMap (4 × Float32Array of 1024 = 16KB)
- O(n) for sorted timestamp copy in uniform-events mode (but sorting is in-place)

**Tradeoffs:**

1. **Uniform kernel vs. Gaussian kernel:** The current running-average (uniform) kernel is computationally cheap (O(b×k)) but provides no distance-based weighting. A Gaussian kernel would give smoother falloff but requires computing exp() per neighbor. For k=3, the difference is negligible.

2. **Fixed bin count (1024):** Provides consistent granularity but may over- or under-sample for extreme data spans (days vs years). The bin width changes with domain size.

3. **Burstiness metric (K-S derived):** The `(σ - μ) / (σ + μ)` metric is a well-known burstiness measure from Goh & Barabási (2008). It ranges from -1 (regular) to +1 (bursty), with 0 being Poisson. Normalization to [0,1] loses the negative regime — regular inter-arrival patterns are indistinguishable from Poisson.

4. **Weight scaling factor (5×):** The fixed multiplier of 5 on the blended signal is arbitrary. For uniformly distributed data, weights would hover near 1+0.2 = 1.2, producing mild warping. For bursty data, weights reach ~6, producing strong warping. The ratio between min/max weights is 1:6, which means sparse regions still get ~14% of the minimum-weight space.

**Edge Cases:**
- **Uniform data in uniform-events mode:** Bin boundaries are perfectly quantile-based, so each bin has exactly (or within 1) the same count. Density map becomes uniform → weights all equal → no warping. Correct behavior.
- **Single cluster of events:** All events land in ~1 bin → warpMap compresses all space into that cluster's region. Other bins get minimum width from the minimum share.
- **Gaps in data:** Zero-count bins get density=0, burstiness=0, weight=1. They retain their proportional width.
- **Transferable buffers:** Uses `postMessage` with transferable `ArrayBuffer` for zero-copy. The `timestamps.slice()` in `useAdaptiveStore` is necessary to avoid detaching the original buffer from the main thread.

---

## 2. Comparable Warp Scaling — Analysis

### Location: `src/lib/binning/warp-scaling.ts`

**Peer-relative vs. Absolute:** Instead of using absolute density, bins are scored relative to their peer average. This normalizes across different granularities — a "busy hour" and a "busy month" are both framed as 2× the peer average.

**Minimum width guarantee:** The `clampMinimumWidthShare` function ensures each bin gets at least `min(0.45, 1/(2×binCount))` of the domain. For 3 bins: ~0.16 each (48% total reserved). For 100 bins: ~0.005 each (50% total reserved). This ensures sparse bins are never completely invisible.

**Neutral fallback behavior:**
- All bins equal → `peerRelativeScore = 1` for all → `warpWeight = 1`
- `isNeutralPartition = true` when `|peerRelativeScore - 1| < 1e-6 AND |hintWeight - 1| < 1e-6`
- `buildComparableWarpMap` returns even spacing (`1/binCount` each)

**Granularity constraint:** All bins must share the same granularity. Mixed granularity forces neutral fallback. This prevents meaningless cross-granularity comparisons (e.g., comparing hourly counts to monthly averages).

**Float32Array boundaries:** Uses typed arrays for memory efficiency. Boundaries array has length `binCount + 1`. The final boundary is always snapped to `domainEnd` to prevent floating-point drift.

**Potential numerical issues:**
- `cursor` accumulation over many bins may drift from `domainEnd` in pathological cases
- `totalWeight ≈ EPSILON` when all counts are near-zero triggers equal-width fallback
- `peerAverage ≤ EPSILON` when totalCount is 0 → neutral fallback

---

## 3. Burst Taxonomy — Classification Analysis

### Location: `src/lib/binning/burst-taxonomy.ts`

**Classification Approach:** Heuristic rule-based classifier rather than statistical model. Uses absolute thresholds (0.72, 0.3) with neighborhood-aware conditions.

**Strengths:**
- Deterministic and explainable (every result includes rationale, tie-break reason, provenance)
- Neighborhood-aware: considers adjacent bins when classifying
- Low computational cost

**Weaknesses:**
- Arbitrary thresholds (0.72, 0.3, 0.16, 0.12) — fine-tuned for this dataset
- `globalHigh = 0.72` and `globalLow = 0.3` are dataset-dependent and may not generalize
- No adaptive/multi-scale analysis — single fixed window size
- Binary classification within each class — no fuzzy boundaries

**Tie-Breaking:** The system has explicit tie-breaking rules with descriptive reasons:
- "short, sharp window wins isolated spike because neighbors do not sustain the peak"
- "longer run and/or stronger count support makes the peak sustained"

**Confidence Formula Analysis:**
- Contrast (46% weight): Measures how distinct this window is from neighbors
- Support (34% weight): How much neighborhood evidence exists
- Shape bonus (20% max): Adds to confidence based on classification type

**Edge Cases:**
- Single window (no neighbors): Support defaults to 0.45, thresholdSource = 'global-thresholds'
- All-neutral neighborhood: neighborMedian ≈ 0.5, neighborSpread ≈ 0
- Zero-count window with low neighbors: Falls to valley
- Near-threshold (0.68-0.72): Handled by explicit tie-break clauses

---

## 4. STKDE — Algorithm Selection & Tradeoffs

### Location: `src/lib/stkde/compute.ts`

**Bandwidth Selection:**
- Spatial: `sigmaCells = max(0.5, spatialBandwidthMeters / gridCellMeters / 2)`
- Temporal: Directly `temporalBandwidthHours` parameter (default 24h)
- Kernel radius: `ceil(3 × sigmaCells)` (covers 99.7% of Gaussian mass)

Both are user-configurable, not data-driven (no Silverman's rule or cross-validation).

**Grid Construction:**
- Uses meters-per-degree approximation: `111320 m/°lat`, `111320 × cos(lat) m/°lon`
- Valid for Chicago (41.8°N) where `cos(41.8°) ≈ 0.745`
- Grid coarsening when cells exceed `maxGridCells (12000)`: coarsen factor is `ceil(sqrt(total/max))`, which approximately halves both rows and cols

**Temporal vs. Spatial Decomposition:**
STKDE decomposes into:
1. Per-cell: temporal Gaussian peak detection (bucketed by hour)
2. Spatial: Gaussian KDE over the temporal peak supports

This two-phase approach is more efficient than a full 3D KDE but assumes temporal and spatial kernels are separable.

**Complexity:**
- Temporal peak: O(cells × buckets²) worst case, but typically O(cells × buckets) since sorted
- Spatial KDE: O(cells × kernelRadius²) ≈ O(cells × (3σ)²) ≈ O(cells × 9σ²)
- For default params (750m spatial, 500m grid): σ = 0.75 cells, radius ≈ 3 cells → O(cells × 9) ≈ 108,000 cells × 9 = manageable
- For max params (5000m spatial, 100m grid): σ = 25 cells, radius ≈ 75 → O(cells × 5625) — potentially expensive

**Memory:**
- Full population pipeline: `Float64Array` for cellSupport, Map of cellTemporalBuckets
- For 12000 cells with hourly buckets over 1 year: ~12000 × 8760 bucket entries if every hour has data, but typically sparse
- Response size guard: truncates when JSON exceeds 2.5MB

**Hotspot Detection:**
- Uses two-pointer sliding window for O(n) peak window detection per cell
- No spatial merging of adjacent hotspot cells — each grid cell reports independently
- Hotspots sorted by intensity, then support, then lat/lng for determinism
- `topK` limits results (default 12)

**Key Tradeoffs:**
1. **Separable kernels** - Faster but less accurate than full 3D KDE, assumes temp/spatial independence
2. **Grid-based** - Resolution limited by grid cell size; hotspots are centroid-based, not contiguous regions
3. **Event truncation** - `maxEvents` (default 50000) limits both memory and compute when events are dense
4. **Hourly buckets** - Fixed at 3600s; temporal bandwidth changes smoothing but not bucket geometry

**Response Size Guard:**
- Sorts cells by intensity descending, keeps top N
- Reduces by 15% chunks until under 2.5MB limit
- Marks `truncated: true` and documents in `fallbackApplied`

---

## 5. Full Population vs. Sampled Compute

| Aspect | Sampled (`computeStkdeFromCrimes`) | Full Population (DuckDB pipeline) |
|--------|-----------------------------------|-----------------------------------|
| Data source | In-memory CrimeRecord[] | DuckDB table |
| Temporal bucketing | Bucketize from raw timestamps | Pre-aggregated by SQL |
| Memory usage | O(cellTimestamps) — all timestamps stored | O(cellTemporalBuckets) — only bucket counts |
| Scalability | Limited by `maxEvents` (50K default) | Scans all matching rows, any size |
| Latency | Low (pre-filtered data) | Higher (SQL queries with pagination) |
| Use case | Interactive viewport | Server-side batch / export |

**Pipeline selection logic:**
- `computeMode: 'sampled'` → use `computeStkdeFromCrimes()` from in-memory data
- `computeMode: 'full-population'` → build inputs via DuckDB, then `computeStkdeFromAggregates()`

---

## 6. Binning Strategies — Comparison

**File:** `src/lib/binning/engine.ts`

| Strategy | Deterministic | Adaptable | Use Case |
|----------|--------------|-----------|----------|
| uniform-distribution | No (depends on sort order) | Yes | Large datasets, consistent bin size |
| uniform-time | Yes | No | Fixed temporal granularity |
| burstiness | No (greedy algorithm) | Yes | Event burst detection |
| daytime-heavy | Yes | No | Diurnal crime pattern analysis |
| crime-type-specific | Yes (sorted) | No | Per-crime-type analysis |
| weekday-weekend | No (sub-delegates) | No | Weekend vs weekday comparison |
| auto-adaptive | No (data-dependent) | Yes | General-purpose / unknown data |

**Auto-adaptive threshold analysis:**
- CV > 2 → bursty (threshold is generous — CV > 1 already indicates overdispersion)
- N > 1000 → uniform-distribution (consistent visual density)
- The choice to delegate to sub-strategies means the auto-adaptive approach is a selector, not a unique algorithm

---

## 7. Interval Detection — Method Comparison

**File:** `src/lib/interval-detection.ts`

| Method | Sensitivity | Best For | Limitations |
|--------|------------|----------|-------------|
| Peak | Medium-high | Clear seasonal patterns | Misses gradual changes |
| Change point | Low-medium | Regime shifts | Window size affects precision |
| Rule-based | None | Equal coverage | Ignores data distribution |

**Fallback merge strategy:** When primary detection yields <2 boundaries, rule-based boundaries are merged in and deduplicated. The 5% minimum gap ensures no boundaries are within 5% of the time range of each other.

**Snap to boundary:** Hour-snapping rounds to nearest hour; day-snapping sets to noon. Useful for aligning boundaries with natural temporal units.

---

## 8. Confidence Scoring — Analysis

**File:** `src/lib/confidence-scoring.ts`

**Data Clarity:** Uses CV(Coefficient of Variation). A perfect uniform distribution has CV=0 → clarity=0. A highly peaked distribution with CV>2 → clarity=100. Scale: CV × 50 capped at 100.

**Coverage:** Three factors weighted 30/35/35. The Gini coefficient approach for uniformity is borrowed from economics — adapted to measure temporal balance.

**Statistical Confidence:**
- SNR = `stdDev/mean` — captures how pronounced the pattern is relative to noise
- Prominence = `(max - mean)/max` — how much the peak stands out
- Entropy = `sum(v × log2(v))` — measures distribution "interestingness"; low for uniform, high for diverse

**Default weights (0.4/0.3/0.3):** Clarity gets highest weight, reflecting the principle that clearer patterns deserve higher confidence.

---

## 9. Scalability Considerations

| Algorithm | Bottleneck | Mitigation |
|-----------|-----------|------------|
| Adaptive warp | Timestamp iteration O(n) | Web Worker offloading |
| Comparable warp | O(b) where b ≤ 100 | Already negligible |
| STKDE sampled | In-memory event array | `maxEvents` cap |
| STKDE full-pop | DuckDB `LIMIT/OFFSET` scan | Chunked pagination |
| Burst taxonomy | O(b × neighbors) per call | Small input (single bin + neighborhood) |
| Interval boundary | O(bins) | bins ≤ 100 |
| Auto proposal | O(profiles × intervals) | profiles ≤ 6, intervals ≤ 12 |

**Web Worker pattern (src/workers/):**
- `adaptiveTime.worker.ts` — Heavy warp computation
- `stkdeHotspot.worker.ts` — Lightweight hotspot filtering/sorting
- Both use transferable `postMessage` for zero-copy ArrayBuffer transfer

---

*Algorithm analysis: 2026-06-25*

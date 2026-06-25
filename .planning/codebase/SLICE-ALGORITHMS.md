# Slice Algorithms — Time Binning, Burst Detection, Warp Scaling

**Analysis Date:** 2026-06-25

---

## 1. Binning Engine

**File:** `src/lib/binning/engine.ts`

The core binning engine (`generateBins()`) accepts `CrimeEventData[]` and a `BinningConfig` and dispatches to one of 16 strategy-specific generators:

| Strategy | Function | Description |
|---|---|---|
| `daytime-heavy` | `generateDaytimeHeavyBins()` | 3-hour day bins (6am–6pm), 4-hour night bins |
| `nighttime-heavy` | `generateNighttimeHeavyBins()` | 3-hour night bins, 4-hour day bins |
| `crime-type-specific` | `generateCrimeTypeBins()` | One bin per crime type cluster |
| `burstiness` | `generateBurstinessBins()` | Split on inter-arrival gap > `minTimeSpan` or count > `maxEvents` |
| `uniform-distribution` | `generateUniformDistributionBins()` | Equal events per bin, controlled by `maxBins` |
| `uniform-time` | `generateUniformTimeBins()` | Equal time spans, controlled by `maxBins` |
| `weekday-weekend` | `generateWeekdayWeekendBins()` | Separate weekday vs weekend → uniform-distribution |
| `quarter-hourly` | `generateIntervalBins()` | Fixed 15-minute intervals |
| `hourly` | `generateIntervalBins()` | Fixed 1-hour intervals |
| `daily` | `generateIntervalBins()` | Fixed 24-hour intervals |
| `weekly` | `generateIntervalBins()` | Fixed 7-day intervals |
| `monthly` | `generateMonthlyBins()` | Calendar month boundaries |
| `auto-adaptive` | `generateAutoAdaptiveBins()` | Detects: high CV > 2 → burstiness; large > 1000 → uniform-distribution; else uniform-time |
| `custom` | Falls through to `uniform-distribution` | — |

### Post-processing

All strategies funnel through `postProcessBins()` (`src/lib/binning/engine.ts`, line 492):
- Validates constraints (min/max events/span, max bins)
- Merges small bins if constraint violations exist
- Filters bins below `minEvents`
- Truncates to `maxBins`

---

## 2. Burst Taxonomy Classification

**File:** `src/lib/binning/burst-taxonomy.ts`

### Classification Taxonomy

Each time window is classified into one of four types:

| Class | Meaning |
|---|---|
| `prolonged-peak` | Sustained high activity across multiple adjacent windows |
| `isolated-spike` | Brief high burst without strong neighborhood support |
| `valley` | Low window compared to neighborhood |
| `neutral` | Not distinct enough for any burst class |

### Algorithm (`classifyBurstWindow()`, line 104)

**Input:** `BurstTaxonomyInput` — `value` (normalized density/burstiness score, 0–1), `count`, `durationSec`, optional `neighborhood[]`

**Decision tree:**

1. Compute global thresholds: `globalHigh = 0.72`, `globalLow = 0.3`
2. Compute neighborhood stats: median, max, min, average of neighbor values
3. Detect high contrast: `value >= globalHigh || value >= neighborMedian + 0.16`
4. Detect low contrast: `value <= globalLow || value <= neighborMedian - 0.16`
5. If `highContrast`:
   - If NOT sustained AND isolated AND no neighbor support → `isolated-spike`
   - Otherwise → `prolonged-peak`
6. If `lowContrast` AND (no neighbors OR low neighbor contrast) → `valley`
7. Tiebreakers for near-threshold windows

### Burst Confidence (`deriveBurstConfidence()`, line 76)

```
confidence = 0.46 * contrast + 0.34 * support + shapeBonus
```

- **Shape bonus:** `prolonged-peak` = 0.22, `isolated-spike` = 0.18, `valley` = 0.16, `neutral` = 0.08
- **Contrast:** `min(1, |value - neighborMedian| + neighborSpread * 0.35)`
- **Support:** clamp01(average of neighbor values + 0.15), or 0.45 with no neighbors

### Burst Score (`normalizeScore()`, line 60)

```
score = 0.6 * signalScore + 0.2 * countScore + 0.2 * durationScore
```

Where each component uses median of (value + neighbor values) normalized.

---

## 3. Adaptive Time Warp (Web Worker)

**File:** `src/workers/adaptiveTime.worker.ts`

The `computeAdaptiveMaps()` function runs in a Web Worker and produces four `Float32Array` maps:

### 3a. Density Map

- Bin mode `uniform-time`: Equal-width time bins, count per bin → normalize by max count
- Bin mode `uniform-events`: Quantile-based boundaries from sorted timestamps → count / bin-width → normalize
- Optional Gaussian kernel smoothing (configurable `kernelWidth`)

### 3b. Burstiness Map

For each bin, compute inter-event interval statistics:
```
mean = ΣΔ / count
variance = ΣΔ² / count - mean²
burstiness = (σ - mean) / (σ + mean)   // −1 to +1
normalized = (burstiness + 1) / 2       // 0 to 1
```

Non-finite values or bins with ≤1 interval → burstiness = 0.

### 3c. Warp Map

Blends density and burstiness:
```
blended = (1 - burstInfluence) * density[i] + burstInfluence * burstiness[i]
weight = 1 + blended * 5
```

Cumulative weight → non-uniform positions on domain axis. High-density/high-burstiness bins get proportionally more space.

### 3d. Count Map

Raw per-bin event counts.

### Worker Protocol

```
Main → Worker: { requestId, timestamps: Float32Array, domain: [number, number], config }
Worker → Main: { requestId, densityMap, burstinessMap, warpMap, countMap }
```

Stale request detection via `activeRequestId` counter in `useAdaptiveStore`.

---

## 4. Interval Boundary Detection

**File:** `src/lib/interval-detection.ts`

Three methods for detecting natural time boundaries in crime density:

### Peak Detection (`detectPeaks()`, line 57)

- Threshold-based: `high` = mean, `medium` = mean + 0.5σ, `low` = mean + σ
- Local maxima with left/right comparison
- Limits: 3–10 peaks depending on sensitivity

### Change Point Detection (`detectChangePoints()`, line 110)

- Sliding window (n/8 size) mean comparison
- Threshold: `high` = 1.0σ, `medium` = 1.5σ, `low` = 2.0σ
- Deduplication: skip points within window/2 of existing
- Limits: 3–8 points

### Rule-Based (`applyRuleBased()`, line 170)

- Equal-time interval division
- Boundaries at `floor(i * n / count)` for `i = 1..count-1`

### Orchestration (`detectBoundaries()`, line 224)

1. Create density histogram (20–100 bins from crime count)
2. Normalize by max count
3. Apply selected detection method
4. Snap to hour/day boundaries if configured
5. Fallback to rule-based if < 2 boundaries found
6. Deduplicate with 5% min gap
7. Calculate confidence score

---

## 5. Slice Allocator (Non-Uniform Slicing)

**File:** `src/lib/slice-allocator.ts`

`allocateNonUniformSlices()` converts burst bins to evenly-sized sub-slices weighted by burst score:

```
rawAllocation = (combinedB / totalB) * targetCount
```

- Round-trip correction: allocate remaining slots via best-fit or reduce by worst-fit
- Slots split evenly within each bin
- Maintains `startEpoch` order

---

## 6. Warp Scaling (Comparable Granularity)

**File:** `src/lib/binning/warp-scaling.ts`

### Scoring (`scoreComparableWarpBins()`, line 108)

```
peerRelativeScore = bin.count / (totalCount / n)
warpWeight = clamp(peerRelativeScore * hintWeight, 0.25, 4)
normalizedScore = 0.5 + (peerRelativeScore - 1) * 0.5
```

### Map Building (`buildComparableWarpMap()`, line 165)

Produces non-uniform boundaries for timeline visualization:

```
widthShare = minWidthShare + (weight / totalWeight) * remainingShare
cumulative → Float32Array boundaries
```

- Minimum width share prevents zero-width bins (default 0.08, clamped to ≤ 0.45)
- Neutral fallback when all scores = 1

### Granularities

`hourly | daily | weekly | monthly | quarterly` — all bins in a set must share the same granularity.

---

## 7. Route Binning Mode Resolution

**File:** `src/lib/adaptive/route-binning-mode.ts`

Maps route pathname to binning mode:
- `/timeslicing-algos` → `uniform-events`
- `/timeslicing` → `uniform-time`
- Default → `uniform-time`

---

*Algorithm analysis: 2026-06-25*

# STKDE Temporal Scope & Hotspot Extraction

**Analysis Date:** 2026-06-25

---

## Overview

STKDE (Space-Time Kernel Density Estimation) detects spatiotemporal crime hotspots by combining:
1. **Per-cell temporal peak detection** using Gaussian-weighted kernel over hourly buckets
2. **Spatial intensity smoothing** using 2D Gaussian KDE over the temporal peak supports
3. **Hotspot extraction** via sliding-window peak detection with configurable time window

**Key files:**
- `src/lib/stkde/compute.ts` — Core computation (grid, temporal, spatial, hotspots)
- `src/lib/stkde/contracts.ts` — Request/response types, validation, defaults
- `src/lib/stkde/full-population-pipeline.ts` — DuckDB-based full population pipeline
- `src/lib/stkde/burst-evolution.ts` — Temporal burst-visualization model
- `src/lib/stkde/adjacent-slice-comparison.ts` — Change detection between adjacent slices
- `src/lib/stkde/heatmap-scale.ts` — Color ramp for heatmap rendering
- `src/workers/stkdeHotspot.worker.ts` — Off-thread hotspot filtering
- `src/store/useStkdeStore.ts` — STKDE state management

---

## Algorithm Flow

```
StkdeRequest
    │
    ├── validateAndNormalizeStkdeRequest()
    │       ├── Clamp params to valid ranges
    │       ├── Validate domain, bbox, crime types, slices
    │       └── Return StkdeRequest with coercion notes
    │
    ├── computeStkdeFromCrimes()  (sampled / in-memory)
    │   OR
    └── buildFullPopulationStkdeInputs() → computeStkdeFromAggregates()  (full population)
            │
            ▼
    buildStkdeGridConfig()
        ├── Lat cell size: gridCellMeters / 111320
        ├── Lon cell size: gridCellMeters / (111320 × cos(meanLat))
        ├── rows = ceil(latSpan / latCellDegrees)
        ├── cols = ceil(lonSpan / lonCellDegrees)
        └── Coarsen if rows × cols > maxGridCells
            │
            ▼
    Temporal Peak Support (per cell)
        ├── Bucketize timestamps into 1-hour buckets
        └── Gaussian-weighted peak count across buckets
            │
            ▼
    Spatial Intensity (Gaussian KDE)
        ├── Gaussian kernel (σ = bandwidth / gridCellSize / 2)
        ├── Kernel radius = ceil(3σ)
        └── Convolve temporal support with kernel
            │
            ▼
    Hotspot Detection
        ├── For each cell with support >= minSupport
        ├── Sliding window peak (two-pointer, O(n))
        └── Sort by intensity → support → geo → topK
            │
            ▼
    Slice Sub-Computations (optional)
        └── For each slice filter: independent STKDE from filtered events
            │
            ▼
    Response Size Guard
        └── Truncate cells if payload > 2.5MB
```

---

## Temporal Scope Parameters

All live under `StkdeRequest.params`:

| Parameter | Default | Range | Unit | Purpose |
|-----------|---------|-------|------|---------|
| `temporalBandwidthHours` | 24 | [1, 168] | hours | Gaussian σ for temporal peak kernel |
| `timeWindowHours` | 24 | [1, 168] | hours | Width of sliding peak detection window |
| `gridCellMeters` | 500 | [100, 5000] | meters | Spatial grid resolution |
| `spatialBandwidthMeters` | 750 | [100, 5000] | meters | Gaussian σ for spatial KDE |
| `topK` | 12 | [1, 100] | count | Max hotspots to return |
| `minSupport` | 5 | [1, 1000] | count | Min events per cell for hotspot candidacy |

### Temporal Domain
```
StkdeRequest.domain:
  startEpochSec: number
  endEpochSec: number
```

Must satisfy `startEpochSec < endEpochSec`. Used for filtering crimes and clipping boundaries.

---

## Temporal Peak Support Computation

### Step 1: Bucketization (1-hour fixed buckets)

```typescript
const TEMPORAL_BUCKET_SIZE_SEC = 3600;

// From raw timestamps (sampled path):
bucketStartEpochSec = Math.floor(timestamp / 3600) * 3600

// From DuckDB (full-population path):
// SQL: CAST(FLOOR(ts / 3600) * 3600 AS BIGINT) as bucket_start
```

The hourly bucket resolution is **fixed**. Changing `temporalBandwidthHours` affects the Gaussian kernel applied over these buckets, not the bucket geometry. This design choice means "temporal bandwidth changes the smoothing stage rather than the underlying bucket geometry" (as noted in the full-population pipeline).

### Step 2: Gaussian Weighted Peak

```typescript
computeTemporalPeakSupportFromTimestamps(timestamps, temporalBandwidthSec)

// Internally:
function computeTemporalPeakSupportFromBuckets(buckets, temporalBandwidthSec):
  safeBandwidthSec = max(3600, temporalBandwidthSec)
  
  for each centerIdx:
    for each bucketIdx:
      deltaSec = bucket.bucketStartEpochSec - center.bucketStartEpochSec
      weight = exp(-0.5 × (deltaSec / safeBandwidthSec)²)
      weighted += bucket.count × weight
    peak = max(peak, weighted)
  
  return peak
```

**Key property:** The temporal support is the **maximum Gaussian-weighted count** achieved at any one-hour bucket position. This is NOT the same as density — it captures the best-aligned window, not the average.

**Effect of temporalBandwidthHours:**
- **Small (1h):** Very tight kernel — only nearby hours contribute. Good for detecting short-duration bursts.
- **Default (24h):** Moderate smoothing — captures daily cycles.
- **Large (168h / 7 days):** Wide kernel — captures weekly cycles. May wash out short bursts.

**Safety clamp:** `safeBandwidthSec = max(3600, temporalBandwidthSec)` ensures the kernel is at least as wide as one bucket, preventing sub-bucket resolution artifacts.

---

## Spatial Intensity Computation

### Gaussian KDE on Grid

```typescript
function buildIntensityFromSupport(signal, rows, cols, request):
  bandwidthCells = max(1, ceil(spatialBandwidthMeters / gridCellMeters))
  sigmaCells = max(0.5, bandwidthCells / 2)
  kernelRadius = ceil(3 × sigmaCells)

  For each cell (row, col):
    center_idx = row × cols + col
    sum = 0
    For each neighbor (r, c) within kernelRadius:
      if signal[neighbor_idx] <= 0: continue
      distance = sqrt((r-row)² + (c-col)²)
      weight = exp(-0.5 × (distance / sigmaCells)²)
      sum += signal[neighbor_idx] × weight
    intensity[center_idx] = sum

  maxIntensity = max over all cells
  Normalize: intensity / maxIntensity
```

**The spatial kernel operates on temporal peak supports**, not raw event counts. This is the "space-time" coupling — a cell gets high intensity only if it has both spatial neighbors AND temporal concentration.

**Bandwidth translation:**
- `bandwidthCells = ceil(750m / 500m) = 2 cells` (default)
- `sigmaCells = max(0.5, 2/2) = 1.0 cell`
- `kernelRadius = ceil(3 × 1.0) = 3 cells`
- So a hotspot influences a ~7×7 cell region (~3.5km × 3.5km at default settings)

---

## Hotspot Extraction

### Sliding Window Peak Detection

```typescript
function computePeakWindow(timestamps, domainStart, domainEnd, windowSeconds):
  if empty: return [domainStart, min(domainEnd, domainStart + windowSeconds)]

  sorted = [...timestamps].sort()
  bestStart, bestCount = sorted[0], 1
  startIdx = 0

  for endIdx in 0..sorted.length-1:
    while (sorted[endIdx] - sorted[startIdx]) > windowSeconds:
      startIdx += 1
    count = endIdx - startIdx + 1
    if count > bestCount:
      bestCount = count
      bestStart = sorted[startIdx]

  return [clamp(bestStart, domainStart, domainEnd),
          clamp(bestStart + windowSeconds, domainStart, domainEnd)]
```

**Properties:**
- Classic two-pointer (sliding window) technique — O(n) per cell
- Finds the window placement that captures the most events, not the highest density
- Returns `[peakStart, peakStart + timeWindow]` — not the actual window bounds that contained the max

**For aggregated data (full-population path):**
```typescript
function computePeakWindowFromBuckets(buckets, domainStart, domainEnd, windowSeconds):
  // Same two-pointer approach but weighted by bucket counts
  runningWeight accumulates/removes bucket counts as window slides
  bestWeight = max runningWeight across all positions
```

### Hotspot Candidate Criteria

A cell becomes a hotspot candidate if:
1. `supportCount >= minSupport` (default 5 events in the cell)
2. Has a valid peak window (always true if any timestamps exist)

Each candidate produces:
```
{
  id: "hs-{row}-{col}-{peakStart}-{peakEnd}",
  centroidLng, centroidLat,  // Cell center
  intensityScore,             // Normalized intensity [0, 1]
  supportCount,               // Raw event count in cell
  peakStartEpochSec,          // Peak window start
  peakEndEpochSec,            // Peak window end
  radiusMeters               // = spatialBandwidthMeters
}
```

### Hotspot Ranking & Selection

```typescript
hotspots = candidates
  .sort((a, b) => {
    b.intensityScore - a.intensityScore    // DESC
    || b.supportCount - a.supportCount      // DESC
    || a.centroidLat - b.centroidLat        // ASC
    || a.centroidLng - b.centroidLng        // ASC
    || a.id.localeCompare(b.id)             // ASC
  })
  .slice(0, params.topK)
```

**Deterministic sort** — ties broken by geographic coordinates and ID for stable results across identical inputs.

---

## Sub-Slice Computations

When `filters.slices` contains `StkdeSliceDescriptor[]`, each slice gets its own STKDE surface computed from events filtered to that time range:

```typescript
for each slice:
  sliceCrimes = filteredEvents.filter(t in [slice.start, slice.end])
  sliceResult = computeSingleStkdeSurface(sliceRequest, sliceCrimes)
```

Results returned in `sliceResults: Record<string, StkdeSurfaceResponse>`. This enables side-by-side comparison of different time segments within a single request.

---

## Full Population Aggregation Pipeline

### Location: `src/lib/stkde/full-population-pipeline.ts`

**When to use:** `request.computeMode === 'full-population'`

**DuckDB query strategy:**
1. Count total matching rows
2. Fetch aggregated data in chunks of 20,000 rows
3. Each row: `{ row_idx, col_idx, bucket_start, bucket_count }`
4. Populate `cellSupport: Float64Array` and `cellTemporalBuckets: Map<number, FullPopulationBucket[]>`
5. Support abort signal for cancellation

**Advantages over sampled path:**
- No event limit — scans all data via SQL GROUP BY
- Memory efficient — stores bucket counts, not individual timestamps
- Fixed hourly bucket resolution reduces row count by ~3600× vs raw events

**Performance notes:**
- Scans all matching rows via `LIMIT/OFFSET` pagination (20,000 per chunk)
- SQL does the spatial binning (`FLOOR((lon - minLng) / lonCellDegrees)`) — not JavaScript
- Temporal binning done in SQL: `FLOOR(ts / 3600) × 3600`

---

## Response Size Guard

### Location: `src/lib/stkde/compute.ts:applyResponsePayloadGuard`

```typescript
const STKDE_RESPONSE_SIZE_LIMIT_BYTES = 2_500_000;  // 2.5 MB

if (payloadBytes > limit && cells.length > 1):
  sort cells by intensity DESC
  keep = cells.length
  while payloadBytes > limit && keep > 1:
    keep = max(1, floor(keep × 0.85))   // Reduce by 15% each iteration
  truncate cells to keep
  mark truncated: true
```

This guard prevents extremely dense grids (like Chicago at 100m resolution producing 200K+ cells) from overwhelming the response channel. The 15% decay rate is a heuristic — it converges quickly but may over-truncate in edge cases.

---

## Validation & Clamping

### Location: `src/lib/stkde/contracts.ts`

All request parameters are validated and clamped into ranges:

| Parameter | Range | Clamped to |
|-----------|-------|------------|
| `spatialBandwidthMeters` | [100, 5000] | Floor to integer |
| `temporalBandwidthHours` | [1, 168] | Floor to integer |
| `gridCellMeters` | [100, 5000] | Floor to integer |
| `topK` | [1, 100] | Floor to integer |
| `minSupport` | [1, 1000] | Floor to integer |
| `timeWindowHours` | [1, 168] | Floor to integer |
| `maxEvents` | [1000, 50000] | Floor to integer |
| `maxGridCells` | [1000, 12000] | Floor to integer |
| `fullPopulationMaxSpanDays` | [1, 12000] | Floor to integer |
| `fullPopulationTimeoutMs` | [1000, 60000] | Floor to integer |

bbox is clamped to Chicago bounds (`CHICAGO_BOUNDS` from `src/lib/coordinate-normalization.ts`).

---

## Burst Evolution Visualization Model

### Location: `src/lib/stkde/burst-evolution.ts`

Connects slices to burst windows for the "burst evolution" visualization:

```typescript
Input:
  slices: BurstEvolutionSliceInput[]   // Temporal slices with burst classifications
  burstWindows: BurstEvolutionWindowInput[]  // Burst windows

Output:
  BurstEvolutionModel {
    sliceNodes: [{ id, label, score, normalizedScore, isActive, isBurst, burstClass, center, windowIds }],
    connectorSegments: [{ id, fromId, toId, score, windowId, burstClass }],
    strongestScore,
    activeWindowIds,
    isNeutral
  }
```

Each connector segment score averages the two slice scores and the window burst score. This creates a node/link graph showing how burst events propagate across adjacent time slices.

---

## Adjacent Slice Comparison

### Location: `src/lib/stkde/adjacent-slice-comparison.ts`

Quantifies change between two time slices:
- `countDelta` — Absolute difference in event counts
- `densityRatio` — Ratio of counts (right/left)
- `dominantTypeShift` — Whether the most frequent crime type changes
- `districtOverlap` — Jaccard-like district overlap (`shared / |union|`)
- `hotspotDelta` — Change in dominant district count

Returns `isNeutral: true` for identical or null inputs.

---

## Edge Cases & Failure Modes

1. **Empty crime dataset:** `computeTemporalPeakSupportFromBuckets` returns 0. No hotspots generated. Response has empty cells and hotspots arrays.

2. **Single cell grid:** When grid span is very small or coarsened to 1×1. Only one hotspot possible. KDE still runs but has no neighbors to smooth with.

3. **Very tall temporal bandwidth (168h):** Kernel width of 7 days with hourly buckets = 168 buckets. The `computeTemporalPeakSupportFromBuckets` nested loop becomes O(buckets²) = O(28K) per cell, which is still manageable.

4. **Coarsening:** Grid coarsening loses spatial resolution but preserves cell count under `maxGridCells`. The `coarsenFactor` is noted in `metaNotes` as `grid-coarsened-x{N}`.

5. **Event truncation:** When `maxEvents` is exceeded, the first N events are used. This is a simple head-of-list truncation, not random sampling. For sorted data, this biases toward earlier events.

6. **Response truncation:** When individual cell payload exceeds 2.5MB, cells are dropped by intensity. This preferentially removes low-intensity cells, preserving hotspots.

7. **Bucket bounds:** The full population pipeline's `bucket_start` calculation `FLOOR(ts / 3600) * 3600` is in epoch seconds. The resulting buckets align with UTC hours, which may not align with local time zones.

---

*STKDE temporal scope analysis: 2026-06-25*

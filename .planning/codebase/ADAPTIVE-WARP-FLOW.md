# Adaptive Time Warp Flow

**Analysis Date:** 2026-06-25

## Overview

The adaptive time warp system redistributes visual space along a timeline so that denser time intervals get more screen real estate. It combines density estimation with a burstiness signal, produces a warp map (mapping from linear-time to warped-time), and supports both viewport-level and peer-relative binning.

**Key files:**
- `src/lib/adaptive-utils.ts` — Global constants (bin count, kernel width, burst influence)
- `src/workers/adaptiveTime.worker.ts` — Core warp computation running off main thread
- `src/lib/binning/warp-scaling.ts` — Peer-relative comparable warp scoring and boundary mapping
- `src/store/useAdaptiveStore.ts` — Zustand store managing warp state and dispatching to worker
- `src/lib/adaptive/route-binning-mode.ts` — Route-driven binning mode selection
- `src/lib/warp-generation.ts` — Warp profile generation from crime density analysis
- `src/app/cube-sandbox/lib/warpProposalEngine.ts` — Spatial constraint-based warp proposal generation
- `src/store/useWarpSliceStore.ts` — Manual warp slice authoring store
- `src/store/useWarpProposalStore.ts` — Warp proposal lifecycle management

## Architecture

```
User Input / Route
         │
         ▼
  Route Binning Mode ◄──── route-binning-mode.ts
  ('uniform-time' | 'uniform-events')
         │
         ▼
  useAdaptiveStore.computeMaps()
         │
         ├──► adaptiveTime.worker.ts (Web Worker)
         │       ├── computeAdaptiveMaps()
         │       │   ├── Density map (Float32Array)
         │       │   ├── Burstiness map (Float32Array)
         │       │   ├── Count map (Float32Array)
         │       │   └── Warp map (Float32Array)  ← final output
         │       └── self.onmessage → postMessage back
         │
         ▼
  useAdaptiveStore receives maps
  → updates densityMap, burstinessMap, warpMap, countMap
  → recalculates burstCutoff (percentile-based)
         │
         ▼
  Peer-Relative Warp (optional) ◄── warp-scaling.ts
  → scoreComparableWarpBins()
  → buildComparableWarpMap()
         │
         ▼
  Warp Slice Authoring (manual) ◄── useWarpSliceStore
  → WarpSlice { range, weight, enabled }
         │
         ▼
  Proposal Systems (auto)
  ├── useWarpProposalStore → warpProposalEngine.ts
  └── useIntervalProposalStore → intervalProposalEngine.ts
```

## Adaptive Worker Pipeline (`src/workers/adaptiveTime.worker.ts`)

### Input
```typescript
interface WorkerInput {
  requestId: number;
  timestamps: Float32Array;    // Crime timestamps (epoch ms)
  domain: [number, number];    // Time domain [start, end]
  config: WorkerConfig;
}

interface WorkerConfig {
  binCount: number;            // = 1024 (from ADAPTIVE_BIN_COUNT)
  kernelWidth?: number;        // = 3 (from ADAPTIVE_KERNEL_WIDTH)
  binningMode?: 'uniform-time' | 'uniform-events';
  burstInfluence?: number;     // = 0.25 (from ADAPTIVE_BURST_INFLUENCE)
}
```

### Step 1: Timestamp Assignment to Bins

**Mode: `uniform-time`** (default for `/timeslicing` routes)
- Normalizes timestamp to `[0, 1]` via `(t - tStart) / tSpan`
- Assigns to bin index `floor(norm * binCount)`
- Count map stores event count per bin

**Mode: `uniform-events`** (default for `/timeslicing-algos` routes)
- Calculates quantile-based boundaries such that each bin has roughly equal event count
- Uses `sorted[sampleIndex]` for boundary positions where `sampleIndex = (edgeIndex * sorted.length) / binCount`
- Calls `ensureStrictlyMonotonicBoundaries()` to enforce domain constraints
- Density = count / bin width (accounts for uneven bin sizes)

### Step 2: Density Map Computation

```typescript
// Kernel smoothing (configurable width, default 3)
for each bin i:
  sum = 0, neighbors = 0
  for k in [-kernelWidth, +kernelWidth]:
    sum += densityInput[i + k]
    neighbors += 1
  smoothedDensity[i] = sum / neighbors

// Normalize to [0, 1]
densityMap[i] = smoothedDensity[i] / maxDensity
```

### Step 3: Burstiness Map Computation

Uses inter-arrival time statistics per bin:
```typescript
for each adjacent pair (sorted[i-1], sorted[i]):
  delta = sorted[i] - sorted[i-1]
  norm = (sorted[i] - tStart) / tSpan
  idx = clampToBin(floor(norm * binCount))
  burstCounts[idx] += 1
  burstSum[idx] += delta
  burstSumSq[idx] += delta * delta

for each bin i:
  mean = burstSum[i] / count
  variance = burstSumSq[i] / count - mean²
  sigma = sqrt(variance)
  burstiness = (sigma - mean) / (sigma + mean)    // K-S statistic derived
  burstinessMap[i] = max(0, min(1, (burstiness + 1) / 2)) // Normalize to [0,1]
```

The burstiness formula uses the **K-S (Kolmogorov-Smirnov) derived burstiness measure**:
- **B = 0** (Poisson): sigma == mean → burstiness = 0
- **B > 0** (bursty): sigma > mean → burstiness > 0
- **B < 0** (regular): sigma < mean → burstiness < 0

### Step 4: Warp Map Construction

Blends density and burstiness, then allocates screen space proportionally:

```typescript
for each bin i:
  blendedSignal = (1 - burstInfluence) * densityMap[i] + burstInfluence * burstinessMap[i]
  weight = 1 + blendedSignal * 5   // Scale factor of 5x
  totalWeight += weight

// Accumulate warp map
accumulated = 0
for each bin i:
  warpMap[i] = tStart + (accumulated / totalWeight) * tSpan
  accumulated += weights[i]
```

**Key parameters:**
- `ADAPTIVE_BURST_INFLUENCE = 0.25` — Burstiness contributes 25% to warp signal
- Global default: burstInfluence=0.25, density influence=0.75
- Weights range from 1 (zero density/burstiness) to ~6 (peak density + burstiness)

### Empty Data Handling

Returns zero-filled maps with linear warp positions (even spacing) when no valid timestamps exist.

## Peer-Relative Comparable Warp (`src/lib/binning/warp-scaling.ts`)

This system scores bins relative to their peers (same granularity level) and produces warp weights for comparable bins.

### Algorithm: `scoreComparableWarpBins()`

1. **Validate** — All bins must share same granularity (`hourly | daily | weekly | monthly | quarterly`)
2. **Compute peer average** — `totalCount / binCount`
3. **Score each bin** — `peerRelativeScore = bin.count / peerAverage`
4. **Clamp warp weight** — `warpWeight = clamp(peerRelativeScore * hintWeight, [0.25, 4.0])`
5. **Normalize score** — `normalizedScore = clamp01(0.5 + (peerRelativeScore - 1) * 0.5)`

### Algorithm: `buildComparableWarpMap()`

Takes scored bins and a domain, produces `Float32Array` boundaries:

1. Calculate `minimumWidthShare` — clamped to `min(0.45, 1/(binCount*2))`
2. Compute `weights` from `warpWeight` values (floor at `EPSILON`)
3. Allocate `widthShares = minimumWidthShare + (weight/totalWeight) * remainingShare`
4. Normalize shares to sum to 1
5. Build cumulative boundary `Float32Array`

**Neutral fallback** occurs when all scores are exactly 1 (uniform distribution) or on validation failure. All weights = 1, returning even spacing.

### Clamping Ranges

| Parameter | Default | Range |
|-----------|---------|-------|
| `MIN_WARP_WEIGHT` | 0.25 | [0.25, 4.0] |
| `MAX_WARP_WEIGHT` | 4.0 | [0.25, 4.0] |
| `DEFAULT_MINIMUM_WIDTH_SHARE` | 0.08 | [0, 0.45] |

## Burst Taxonomy Classification (`src/lib/binning/burst-taxonomy.ts`)

Classifies individual bins into four burst classes:

| Class | Description | Criteria |
|-------|-------------|----------|
| `prolonged-peak` | Sustained high activity | High signal + sustained shape (duration ≥180s or count≥3) |
| `isolated-spike` | Brief sharp increase | High signal + isolated shape (duration ≤90s) |
| `valley` | Low period | Low signal + lower than neighborhood |
| `neutral` | Not distinct | Falls between thresholds |

**Key thresholds:**
- `globalHigh = 0.72` — Peak threshold
- `globalLow = 0.3` — Valley threshold
- `highContrast` = value ≥ 0.72 OR value ≥ neighborMedian + 0.16
- `isolatedShape` = duration ≤ max(90, neighborDurationMedian * 0.75, 180)

**Confidence formula:**
```
confidence = round(clamp01(0.46 * contrast + 0.34 * support + shapeBonus) * 100)
```

Where:
- `contrast = min(1, abs(value - neighborMedian) + neighborSpread * 0.35)`
- `support = clamp01(average(neighborValues) + 0.15)`
- `shapeBonus` = 0.22 (prolonged-peak), 0.18 (isolated-spike), 0.16 (valley), 0.08 (neutral)

## Route-Driven Binning Mode (`src/lib/adaptive/route-binning-mode.ts`)

```typescript
'/timeslicing-algos' → 'uniform-events'
'/timeslicing'       → 'uniform-time'
default              → 'uniform-time'
```

## Store Architecture

### `useAdaptiveStore` (`src/store/useAdaptiveStore.ts`)
- State: `warpFactor` (0=linear, 1=fully adaptive), `densityMap`, `burstinessMap`, `warpMap`, `countMap`
- Controls: `warpSource` (density | slice-authored | proposal-applied), `warpControlMode` (automatic | manual)
- Burst controls: `burstMetric` (density | burstiness), `burstThreshold` (0.7 percentile), `burstCutoff`
- Worker management: module-level singleton, `activeRequestId` counter for stale request filtering
- Uses `computePercentile()` for threshold-based burst cutoff

### `useWarpSliceStore` (`src/store/useWarpSliceStore.ts`)
- Manual warp slice authoring
- Each `WarpSlice`: `{ id, label, range, weight, enabled, source, warpProfileId }`
- Weight is clamped to [0, 3], range must have at least 0.5 unit width

### `useWarpProposalStore` (`src/store/useWarpProposalStore.ts`)
- Wraps `warpProposalEngine.ts` — generates proposals from spatial constraints + temporal context
- Tracks `selectedProposalId`, `appliedProposalId`, `generation` metadata
- `applySelected()` calls `applyWarpProposal()` which modifies the cube sandbox state

## Performance Characteristics

| Operation | Location | Complexity | Notes |
|-----------|----------|------------|-------|
| Density computation | Worker | O(n + b×k) | n=timestamps, b=bins(1024), k=kernelWidth(3) |
| Burstiness computation | Worker | O(n + b) | Per adjacent pair + per bin |
| Warp map | Worker | O(b) | Single pass weight accumulation |
| Comparable scoring | `warp-scaling.ts` | O(b) | Single pass scoring |
| Comparable warp map | `warp-scaling.ts` | O(b) | Single pass boundary construction |

Key performance design: All heavy computation runs in a **Web Worker** (`adaptiveTime.worker.ts`), never blocking the main thread. The worker uses `Float32Array` and `ArrayBuffer` transferables for zero-copy communication.

## Edge Cases

1. **Single timestamp** — Uniform bin boundaries, single point of density
2. **Zero timestamps** — Returns zeros with even linear warp spacing
3. **Uniform distribution** — `scoreComparableWarpBins` returns `neutralFallback: true`, all weights = 1.0
4. **Mixed granularity** — Falls back to neutral (all weights = 1.0)
5. **Very sparse data** — `ensureStrictlyMonotonicBoundaries` prevents zero-width bins with EPSILON gap
6. **Off-domain timestamps** — Filtered out before computation (`value >= tStart && value <= tEnd`)
7. **Stale worker responses** — `activeRequestId` counter discards out-of-order worker responses

---

*Adaptive warp flow analysis: 2026-06-25*

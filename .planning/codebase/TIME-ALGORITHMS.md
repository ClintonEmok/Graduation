# Time Algorithms

**Analysis Date:** 2026-06-25

---

## 1. Dynamic Binning Engine (`src/lib/binning/engine.ts`)

The core binning engine supports 14 strategies via a `switch` on `BinningStrategy`:

### Strategy List

| Strategy | Type | Description | Bin Count Control |
|----------|------|-------------|-------------------|
| `uniform-distribution` | Count-equal | Equal events per bin: `eventsPerBin = ceil(N / maxBins)` | `maxBins` (default 40) |
| `uniform-time` | Time-equal | Equal time spans: `binSpan = (end - start) / maxBins` | `maxBins` (default 40) |
| `burstiness` | Event-driven | Splits when gap > `minGap (1h)` OR count > `maxEvents (100)` | Gap + count thresholds |
| `daytime-heavy` | Diurnal | 3h day blocks, 4h night blocks (6am/6pm split) | Fixed by interval |
| `nighttime-heavy` | Diurnal | 3h night blocks, 4h day blocks (6am/6pm split) | Fixed by interval |
| `crime-type-specific` | Type-driven | One bin per crime type with events sorted | Per type group |
| `weekday-weekend` | Day-of-week | Separate weekday/weekend, each uses uniform-distribution | Sub-delegation |
| `quarter-hourly` | Fixed interval | 15-minute bins | Domain-driven |
| `hourly` | Fixed interval | 60-minute bins | Domain-driven |
| `daily` | Fixed interval | 24-hour bins | Domain-driven |
| `weekly` | Fixed interval | 7-day bins | Domain-driven |
| `monthly` | Calendar | Calendar month boundaries (`YYYY-MM` key) | Month count |
| `custom` | User-defined | Delegates to uniform-distribution | `maxBins` |
| `auto-adaptive` | Auto-detect | Chooses strategy based on CV of inter-arrival times | Dynamic |

### Auto-Adaptive Strategy Selection

```typescript
function generateAutoAdaptiveBins(data, domain, constraints):
  // 1. Calculate coefficient of variation of inter-arrival gaps
  avgGap = mean(gaps)
  variance = mean((gap - avgGap)²)
  cv = sqrt(variance) / avgGap

  // 2. Decision tree:
  if cv > 2        → 'burstiness' strategy
  if N > 1000      → 'uniform-distribution'
  else             → 'uniform-time'
```

**Rationale:** High CV (>2) indicates bursty data requiring event-driven binning. Large datasets (>1000) get distribution-based binning for consistency. Default is uniform time.

### Burstiness Binning Algorithm

```
Sort events by timestamp
Initialize currentBin with first event

For each subsequent event:
  gap = event.timestamp - prev.timestamp
  if gap > minGap (default 1h) OR currentBin.length >= maxEvents (default 100):
    → Finalize current bin
    → Start new bin with this event
  else:
    → Add to current bin
```

**Properties:** Greedy left-to-right scan. Does not optimize bin count or balance. Good for detecting natural burst boundaries.

### Post-Processing Pipeline

1. `validateConstraints()` — Check min/max events, time spans, bin count
2. `mergeSmallBins()` — Sort by count ascending, merge smallest until count ≥ `minEvents`
3. Filter by `minEvents`
4. Slice by `maxBins`

---

## 2. Fixed Interval Binning Helper (`src/lib/binning/engine.ts:generateIntervalBins`)

```
For each event:
  binStart = floor(timestamp / intervalMs) * intervalMs
  Add to bin[binStart]

For each bin:
  avgTimestamp = mean of event timestamps in bin
  Bounds clamped to domain
```

Used by: quarter-hourly, hourly, daily, weekly, uniform-time.

---

## 3. Monthly Binning (`src/lib/binning/engine.ts:generateMonthlyBins`)

- Groups by calendar month key: `YYYY-MM`
- `startTime = new Date(year, month, 1).getTime()`
- `endTime = new Date(year, month + 1, 1).getTime()`
- Sorted alphabetically by key (which sorts chronologically)

---

## 4. Comparable Warp Scoring (`src/lib/binning/warp-scaling.ts`)

### Granularities Supported
`hourly | daily | weekly | monthly | quarterly`

### `scoreComparableWarpBins()`
1. Validate all bins share same granularity
2. Compute `peerAverage = totalCount / binCount`
3. For each bin: `peerRelativeScore = bin.count / peerAverage`
4. `warpWeight = clamp(peerRelativeScore * hintWeight, 0.25, 4.0)`
5. `normalizedScore = clamp01(0.5 + (peerRelativeScore - 1) * 0.5)`

### `buildComparableWarpMap()`
- Minimum width share: `min(0.45, 1/(binCount*2))`
- Weighted allocation: `width = minWidth + (weight/totalWeight) * remainingShare`
- Returns `Float32Array` boundaries + scored bins

---

## 5. Warp Profile Generation (`src/lib/warp-generation.ts`)

### `analyzeDensity()`
- Equal-width bins over time range
- Count events per bin, normalize to [0,1]
- Peak/lothreshold = top/bottom 10% density bins

### `detectEvents()`
- Change point detection: sliding window comparison
- Window size = `max(2, floor(N/10))`
- Threshold = `1.5 × stdDev` of densities
- Minimum stdDev floor: 0.05 (returns empty if no variation)

### `generateWarpProfiles()`
- Analyzes density into 50 bins
- Detects change points for boundary hints
- Generates 3 profiles (aggressive, balanced, conservative):

| Emphasis | Intervals | Strength Range | Intervals step |
|----------|-----------|----------------|----------------|
| Aggressive | intervalCount+2 (max 12) | [0.5, 2.0] | More granular |
| Balanced | intervalCount (default 5) | [0.7, 1.5] | Default |
| Conservative | intervalCount-2 (min 3) | [0.8, 1.3] | Coarser |

- Assigns confidence: `conservative × 1.1`, `aggressive × 0.9`
- Strength = `minStrength + (1 - avgDensity) × (maxStrength - minStrength)`

---

## 6. Full Auto Orchestrator (`src/lib/full-auto-orchestrator.ts`)

### Scoring Weights
| Dimension | Weight | Description |
|-----------|--------|-------------|
| `relevance` | 0.4 | Warp profile confidence scaled by emphasis |
| `continuity` | 0.3 | Smoothness of strength changes between adjacent intervals |
| `overlapMin` | 0.2 | Minimization of interval overlap |
| `coverage` | 0.1 | Sufficient interval coverage |

### Ranking Pipeline
1. Generate warp profiles (up to 6, default 3)
2. Build shared interval set via `detectBoundaries('peak', 'medium')`
3. Score each profile against 4 dimensions
4. Penalize overlapping intervals: `total × 0.5`
5. Sort by total score descending, slice to top 3
6. Tag top-ranked as `isRecommended`

### Confidence Calculation
```
finalConfidence = round((warp.confidence + score.total) / 2)
lowConfidence if: crimes.length < 25 OR ranked[0].confidence < 45
```

---

## 7. Interval Boundary Detection (`src/lib/interval-detection.ts`)

### `detectBoundaries()`

1. **Binning**: `binCount = clamp(floor(N/50), 20, 100)`
2. **Normalization**: Each bin normalized by max count
3. **Method dispatch** — three methods:

### Peak Detection (`detectPeaks()`)
```
For each bin i (1 to n-2):
  isPeak = bins[i] > bins[i-1] AND bins[i] > bins[i+1] AND bins[i] >= threshold

Sensitivity thresholds (mean + multiplier × stdDev):
  low:    mean + 1.0 × stdDev  (max 3 peaks)
  medium: mean + 0.5 × stdDev  (max 6 peaks)
  high:   mean                  (max 10 peaks)
```

### Change Point Detection (`detectChangePoints()`)
```
Window size = max(2, floor(N/8))
For each point i (window to n-window):
  leftMean = mean(density[i-window .. i])
  rightMean = mean(density[i .. i+window])
  change = abs(rightMean - leftMean)
  if change > threshold (stdDev × multiplier):
    → Accept if not too close to existing change point (min gap: window/2)

Sensitivity multipliers:
  low:    2.0 × stdDev  (max 3 points)
  medium: 1.5 × stdDev  (max 5 points)
  high:   1.0 × stdDev  (max 8 points)
```

### Rule-Based Boundary Detection (`applyRuleBased()`)
```
step = N / boundaryCount
boundaries[i] = floor(i × step) for i in 1..boundaryCount-1
```

### Boundary Snapping
- Hour snap: round to nearest hour (set minutes to 0)
- Day snap: set to midday

### Fallback Logic
If fewer than 2 boundaries detected (and method is not rule-based), merge with rule-based fallback at `boundaryCount = max(3, requested)`. Deduplicate with 5% minimum gap.

---

## 8. Confidence Scoring (`src/lib/confidence-scoring.ts`)

### Composite Score
```
confidence = clarity × 0.4 + coverage × 0.3 + statistical × 0.3
```

### Data Clarity (`calculateDataClarity()`)
- Bin data into `clamp(floor(N/100), 10, 100)` bins
- Calculate CV = `sqrt(variance) / mean`
- Score = `min(100, CV × 50)`
- Higher variance (peaks/valleys) → higher clarity

### Coverage (`calculateCoverage()`)
Three factors combined:
1. **Span coverage (30%)**: `temporalSpan / range`
2. **Data density (35%)**: `min(100, log10(N+1) × 20)` (diminishing returns)
3. **Uniformity (35%)**: Gini coefficient inverted → `(1 - |gini|) × 100`

### Statistical Confidence (`calculateStatisticalConfidence()`)
```
snrScore (40%):      min(100, stdDev/mean × 100)    // Signal-to-noise
prominenceScore (35%): (maxVal - mean) / maxVal × 100
entropyScore (25%):   |entropy| / log2(n) × 100
```

---

## 9. Burst Evolution Model (`src/lib/stkde/burst-evolution.ts`)

Builds a graph connecting temporal slices to burst windows for visualization:

```
Slice Nodes:  Each visible temporal slice with score and burst class
Connectors:   Edge between consecutive overlapping slices for each burst window
              score = (from.score + to.score + window.burstScore) / 3

Model:
  sliceNodes: BurstEvolutionSliceNode[]
  connectorSegments: BurstEvolutionConnectorSegment[]
  strongestScore, activeWindowIds, isNeutral
```

Used for visualizing how burst classifications evolve across adjacent time windows in the 3D cube and timeline.

---

## 10. Adjacent Slice Comparison (`src/lib/stkde/adjacent-slice-comparison.ts`)

Compares two adjacent time slices for change detection:

- `countDelta`: Difference in event counts
- `densityRatio`: Ratio of counts (right/left)
- `dominantTypeShift`: Whether the most frequent crime type changes
- `districtOverlap`: Jaccard-like overlap ratio of districts
- `hotspotDelta`: Change in dominant district count

Flags identical slices (same `sliceId`, `totalCount`, and serialized type/district counts) as neutral.

---

*Time algorithms analysis: 2026-06-25*

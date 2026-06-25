# Core Algorithms

**Analysis Date:** 2026-06-25

---

## 1. Adaptive Time Warping

**File:** `src/workers/adaptiveTime.worker.ts`

### Density Map
1. Assign timestamps to bins (uniform-time or uniform-events mode)
2. Smooth with running average kernel (width = 3 bins)
3. Normalize to [0, 1]

### Burstiness Map (K-S Derived Measure)
```
burstiness = (σ - μ) / (σ + μ)
normalized = clamp((burstiness + 1) / 2, 0, 1)
```
- **0 (Poisson):** σ = μ → burstiness = 0
- **> 0 (Bursty):** σ > μ → burstiness > 0
- **< 0 (Regular):** σ < μ → burstiness < 0

### Warp Map
```
weight = 1 + blendedSignal × 5
warpMap[i] = domainStart + (accumulatedWeight / totalWeight) × domainSpan
```

### Kernel Smoothing
Running average over 2*kernelWidth+1 neighboring bins. Simple uniform kernel — no Gaussian weight falloff.

---

## 2. Comparable Peer-Relative Warp Scoring

**File:** `src/lib/binning/warp-scaling.ts`

### Scoring
```
peerAverage = totalCount / binCount
peerRelativeScore = bin.count / peerAverage
warpWeight = clamp(peerRelativeScore × hintWeight, 0.25, 4.0)
normalizedScore = clamp01(0.5 + (peerRelativeScore - 1) × 0.5)
```

### Boundary Construction
```
minimumWidthShare = clamp(0.08, [0, min(0.45, 1/(2×binCount))])
remainingShare = 1 - minimumWidthShare × binCount
widthShare = minimumWidthShare + (weight / totalWeight) × remainingShare
```

The minimum width guarantee ensures sparse bins retain visual presence.

---

## 3. Burst Taxonomy Classification

**File:** `src/lib/binning/burst-taxonomy.ts`

### Decision Tree
```
1. Is highContrast (value ≥ 0.72 OR value ≥ neighborMedian + 0.16)?
   ├── Yes, sustainedShape → prolongued-peak
   ├── Yes, isolatedShape AND no neighbor support → isolated-spike
   └── Yes, ambiguous → prolongued-peak (default)
2. Is lowContrast (value ≤ 0.3 OR value ≤ neighborMedian - 0.16)?
   ├── AND lowNeighborContrast → valley
   └── No → neutral
3. Near threshold tie-breaks:
   ├── value ≥ 0.68, isolated, no support → isolated-spike
   └── value ≤ 0.34, low neighbor contrast → valley
4. Default → neutral
```

### Confidence
```
contrast = min(1, |value - neighborMedian| + neighborSpread × 0.35)
support = neighborCount > 0 ? clamp01(average(neighborValues) + 0.15) : 0.45
shapeBonus = { prolonged-peak: 0.22, isolated-spike: 0.18, valley: 0.16, neutral: 0.08 }
confidence = round(clamp01(0.46 × contrast + 0.34 × support + shapeBonus) × 100)
```

---

## 4. STKDE — Space-Time Kernel Density Estimation

**File:** `src/lib/stkde/compute.ts`

### Grid Construction
```
latCellDegrees = gridCellMeters / 111320
lonCellDegrees = gridCellMeters / (111320 × cos(meanLat × π/180))
rows = ceil(latSpan / latCellDegrees)
cols = ceil(lonSpan / lonCellDegrees)
```

If `rows × cols > maxGridCells (12000)`:
```
coarsenFactor = ceil(sqrt(totalCells / maxGridCells))
rows = ceil(rows / coarsenFactor)
cols = ceil(cols / coarsenFactor)
```

### Temporal Peak Support
**From timestamps (computeStkdeFromCrimes path):**
1. Bucketize into 1-hour buckets: `floor(timestamp / 3600) × 3600`
2. For each cell, compute weighted peak count using Gaussian kernel:
```
weight = exp(-0.5 × (deltaSec / temporalBandwidthSec)²)
temporalPeakSupport = max over centerIdx of (sum of weighted bucket counts)
```

**From aggregates (computeStkdeFromAggregates, full-population path):**
- Same computation but uses pre-bucketed `cellTemporalBuckets` data from DuckDB

### Spatial Intensity (Gaussian KDE)
```
sigmaCells = max(0.5, spatialBandwidthMeters / gridCellMeters / 2)
kernelRadius = ceil(3 × sigmaCells)

For each cell (row, col):
  sum = 0
  For each neighbor (r, c) within kernelRadius:
    distance = sqrt((r-row)² + (c-col)²)
    weight = exp(-0.5 × (distance/sigmaCells)²)
    sum += temporalPeakSupport[neighbor] × weight
  intensity[row,col] = sum

Normalize: intensity / maxIntensity
```

### Hotspot Detection
```
For each cell with support >= minSupport:
  peakWindow = sliding window (timeWindowHours) over cell timestamps
  → finds max-count window via two-pointer scan
  hotspot = { centroid, intensityScore, supportCount, peakStart, peakEnd, radius }

Sort: intensityScore DESC → supportCount DESC → centroidLat ASC → centroidLng ASC
Slice: top K (topK parameter)
```

### Slice Sub-Computation
When `filters.slices` are provided, each slice gets its own STKDE surface computed independently using filtered events from the parent dataset. Results returned in `sliceResults` map.

---

## 5. Full Population Pipeline

**File:** `src/lib/stkde/full-population-pipeline.ts`

### DuckDB Aggregation Query
```sql
WITH filtered AS (
  SELECT EXTRACT(EPOCH FROM "Date") as ts,
         "Latitude" as lat, "Longitude" as lon
  FROM crimes
  WHERE <filters>
), aggregated AS (
  SELECT
    CAST(FLOOR((lon - minLng) / lonCellDegrees) AS INTEGER) as col_idx,
    CAST(FLOOR((lat - minLat) / latCellDegrees) AS INTEGER) as row_idx,
    CAST(FLOOR(ts / 3600) * 3600 AS BIGINT) as bucket_start,
    COUNT(*) as bucket_count
  FROM filtered
  GROUP BY 1, 2, 3
)
SELECT row_idx, col_idx, bucket_start, bucket_count
FROM aggregated
WHERE row_idx >= 0 AND col_idx >= 0
  AND row_idx < rows AND col_idx < cols
ORDER BY row_idx, col_idx, bucket_start
LIMIT ? OFFSET ?
```

Chunks of 20,000 rows at a time. Hourly bucket resolution is fixed (`3600` seconds).

### Compute Modes
| Mode | Path | Data Source |
|------|------|-------------|
| `sampled` | `computeStkdeFromCrimes` | In-memory CrimeRecord[] |
| `full-population` | `buildFullPopulationStkdeInputs → computeStkdeFromAggregates` | DuckDB-aggregated buckets |

---

## 6. Interval Boundary Detection

**File:** `src/lib/interval-detection.ts`

### Method: Peak Detection
Finds local maxima in normalized density array with sensitivity-controlled amplitude threshold.

### Method: Change Point Detection
Sliding window mean comparison — detects where distribution shifts significantly.

### Method: Rule-Based
Equal-time interval division — creates evenly spaced boundaries.

### Fallback
When primary method yields <2 boundaries, supplement with rule-based boundaries, merge, deduplicate (5% minimum gap).

---

## 7. Confidence Scoring System

**File:** `src/lib/confidence-scoring.ts`

Three-component composite:
| Component | Weight | What It Measures |
|-----------|--------|------------------|
| Data Clarity | 40% | Variance in density distribution (peaks vs uniform) |
| Coverage | 30% | Temporal span, data density (log scale), uniformity (Gini) |
| Statistical | 30% | SNR, peak prominence, distribution entropy |

---

## 8. Warp Profile Generation

**File:** `src/lib/warp-generation.ts`

### Event Detection
Sliding window density change detection:
```
windowSize = max(2, floor(N/10))
threshold = 1.5 × stdDev
change > threshold → event detected
min gap: 5% of range
```

### Profile Construction
```
1. Bin data into 50 equal-width bins
2. Normalize to [0, 1]
3. Detect events for boundary hints
4. Generate 3 profiles (aggressive, balanced, conservative)
   Each with different interval count and strength range
5. Strength = minStrength + (1 - avgDensity) × (maxStrength - minStrength)
```

---

## 9. Full Auto Proposal Ranking

**File:** `src/lib/full-auto-orchestrator.ts`

### Scoring Dimensions
```
relevance  (40%): confidence × emphasisMultiplier
continuity (30%): 100 - avgStrengthStep × 50
overlapMin (20%): 100 × (1 - overlapLength / totalIntervalLength)
coverage   (10%): 100 if intervals ≥ 3, else 70

overlap penalty: total × 0.5 (if any overlap detected)
```

### Pipeline
1. Generate warp profiles (up to 6)
2. Build shared interval set via peak detection
3. Score each profile
4. Apply overlap penalty
5. Sort → top 3 → rank 1 is recommended
6. Generate `whyRecommended` text from top-2 contributing dimensions

---

## 10. Cube Sandbox Proposal Engines

### Warp Proposal (`src/app/cube-sandbox/lib/warpProposalEngine.ts`)

Generates proposals from 3D spatial constraints:
```
densityConcentration = clamp((1 / (1 + volume/160)) × 100, 0, 100)
hotspotCoverage = clamp((footprint/(footprint+60)) × hotspotBase × 130, 0, 100)
blendedScore = densityConcentration × 0.58 + hotspotCoverage × 0.42
warpFactor = currentWarpFactor × 0.45 + densityConc/100 × 0.35 + hotspotCov/100 × 0.2
```

Range width = `clamp(spanY × 6 + 8, 10, 48)` where spanY is the Y-axis span of the constraint.

### Interval Proposal (`src/app/cube-sandbox/lib/intervalProposalEngine.ts`)

Generates range proposals from spatial constraints × burst windows:
```
densityConcentration = clamp(peak × 72 + (1/(1+volume/180)) × 28, 0, 100)
hotspotCoverage = clamp(peak × 55 + (footprint/(footprint+70)) × 45, 0, 100)
intervalSharpness = clamp((16/(16+intervalLength)) × 100, 0, 100)
score = densityConc × 0.5 + hotspotCoverage × 0.35 + intervalSharpness × 0.15

Suppression: skip if overlap ≥ 55% with existing proposal for same constraint
```

---

## 11. Heatmap Color Scale (`src/lib/stkde/heatmap-scale.ts`)

6-stop linear interpolation color ramp:
```
0.0 → rgba(30, 64, 175, 0)      (transparent blue)
0.2 → rgba(59, 130, 246, 0.35)  (blue)
0.4 → rgba(16, 185, 129, 0.5)   (green)
0.6 → rgba(234, 179, 8, 0.7)    (yellow)
0.8 → rgba(249, 115, 22, 0.8)   (orange)
1.0 → rgba(239, 68, 68, 0.9)    (red)
```

Uses linear interpolation (`lerp`) between consecutive stops for continuous coloring.

---

## 12. Hotspot Worker Filtering (`src/workers/stkdeHotspot.worker.ts`)

Off-main-thread filtering/sorting of hotspot results:
```
filters: minIntensity, minSupport, temporalWindow, spatialBbox
sort: intensityScore DESC → supportCount DESC → id ASC
```

---

*Core algorithms reference: 2026-06-25*

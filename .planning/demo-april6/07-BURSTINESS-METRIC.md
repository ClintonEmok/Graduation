# Burstiness Metric Design and Generation

**Purpose:** Document the mathematical foundation and implementation of the burstiness metric.

**Last updated:** 2026-03-31

---

## Overview

The burstiness metric quantifies the "burstiness" of event arrival patterns. Unlike simple density, burstiness captures the **irregularity** and **clustering** of events, distinguishing between uniformly distributed, random, and highly clustered patterns.

---

## Mathematical Foundation

### Burstiness Coefficient

The burstiness coefficient B is derived from the mean (μ) and standard deviation (σ) of inter-arrival times:

```
B = (σ - μ) / (σ + μ)
```

**Properties:**
| B Value | Interpretation |
|---------|----------------|
| -1 | Perfectly regular (uniform, like a clock) |
| 0 | Poisson process (memoryless random) |
| +1 | Extremely bursty (all events at once) |

**Range:** [-1, +1]

### Derivation

Given a sequence of event timestamps:
```
t₁, t₂, t₃, ..., tₙ
```

Inter-arrival times:
```
Δ₁ = t₂ - t₁
Δ₂ = t₃ - t₂
...
Δₙ₋₁ = tₙ - tₙ₋₁
```

Statistical moments:
```
μ = (1/(n-1)) × Σ Δᵢ         (mean inter-arrival time)
σ² = (1/(n-1)) × Σ (Δᵢ - μ)²  (variance)
σ = √σ²                        (standard deviation)
```

Burstiness coefficient:
```
B = (σ - μ) / (σ + μ)
```

---

## Implementation

### Web Worker Computation

**File:** `src/workers/adaptiveTime.worker.ts:200-230`

```typescript
// Step 1: Collect inter-arrival times per bin
const burstCounts = new Float32Array(safeBinCount);
const burstSum = new Float32Array(safeBinCount);
const burstSumSq = new Float32Array(safeBinCount);

if (sorted.length > 1) {
  for (let i = 1; i < sorted.length; i++) {
    const delta = sorted[i] - sorted[i - 1];
    if (!Number.isFinite(delta) || delta < 0) continue;
    
    const norm = (sorted[i] - tStart) / tSpan;
    if (norm < 0 || norm > 1) continue;
    
    const idx = clampToBin(Math.floor(norm * safeBinCount), safeBinCount);
    burstCounts[idx] += 1;
    burstSum[idx] += delta;
    burstSumSq[idx] += delta * delta;
  }
}

// Step 2: Compute burstiness for each bin
const burstinessMap = new Float32Array(safeBinCount);
for (let i = 0; i < safeBinCount; i++) {
  const count = burstCounts[i];
  
  if (count <= 1) {
    burstinessMap[i] = 0; // Not enough events
    continue;
  }
  
  // Mean inter-arrival time
  const mean = burstSum[i] / count;
  
  // Variance: E[X²] - E[X]²
  const variance = Math.max(0, burstSumSq[i] / count - mean * mean);
  const sigma = Math.sqrt(variance);
  
  // Burstiness coefficient
  const denom = sigma + mean;
  const burstiness = denom > 0 ? (sigma - mean) / denom : 0;
  
  // Normalize to [0, 1] for display
  // B ∈ [-1, 1] → normalized ∈ [0, 1]
  const normalized = Math.max(0, Math.min(1, (burstiness + 1) / 2));
  burstinessMap[i] = Number.isFinite(normalized) ? normalized : 0;
}
```

---

### Normalization for Display

**Raw burstiness:** B ∈ [-1, +1]

**Normalization formula:**
```
normalized = (B + 1) / 2
```

**Result:** normalized ∈ [0, 1]

**Why normalize?**
- Shader values typically in [0, 1] range
- Percentile calculations work on [0, 1]
- Simplifies threshold comparisons

---

## Comparison: Density vs Burstiness

| Aspect | Density Metric | Burstiness Metric |
|---------|----------------|-------------------|
| **Definition** | Events per time unit | Variance in inter-arrival times |
| **Captures** | Absolute activity level | Irregularity/clustering |
| **Range** | [0, ∞) | [-1, +1] (normalized: [0, 1]) |
| **Use case** | Find high-activity periods | Find irregular patterns |
| **Best for** | Expected high-crime times | Unexpected clustering |
| **Example** | "Friday nights are busy" | "Crime spiked unexpectedly" |

### Example Scenarios

**Scenario A: Regular Pattern**
```
Events: ● ● ● ● ● ● ● ● (uniform)
Density: High (8 events)
Burstiness: Low (B ≈ -1, regular)
```

**Scenario B: Random Pattern**
```
Events: ●●  ●  ●●●  ●  ● (Poisson)
Density: Medium (6 events)
Burstiness: Medium (B ≈ 0, random)
```

**Scenario C: Burst Pattern**
```
Events: ●●●●●●           ● (clustered)
Density: Medium (7 events)
Burstiness: High (B ≈ +0.8, bursty)
```

---

## Binning Strategy: Burstiness-Aware

**Strategy:** `burstiness`

**File:** `src/lib/binning/engine.ts:225-257`

```typescript
function generateBurstinessBins(
  data: CrimeEventData[],
  domain: [number, number],
  constraints: BinningConstraint
): TimeBin[] {
  const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);
  const bins: TimeBin[] = [];

  if (sorted.length === 0) return [];

  let currentBin: CrimeEventData[] = [sorted[0]];
  const burstThreshold = constraints.maxEvents || 100;
  const minGap = constraints.minTimeSpan || 3600000; // 1 hour default

  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].timestamp - sorted[i - 1].timestamp;

    // Start new bin if:
    // 1. Gap exceeds minimum gap (sparse period)
    // 2. Bin reaches max events (dense period)
    if (gap > minGap || currentBin.length >= burstThreshold) {
      bins.push(createBinFromEvents(currentBin, bins.length));
      currentBin = [sorted[i]];
    } else {
      currentBin.push(sorted[i]);
    }
  }

  // Don't forget last bin
  if (currentBin.length > 0) {
    bins.push(createBinFromEvents(currentBin, bins.length));
  }

  return bins;
}
```

**Behavior:**
- Creates narrow bins during bursty periods (small gaps)
- Creates wider bins during sparse periods (large gaps)
- Naturally adapts bin size to event clustering

---

## Auto-Adaptive Strategy Detection

**Strategy:** `auto-adaptive`

**File:** `src/lib/binning/engine.ts:377-414`

```typescript
function generateAutoAdaptiveBins(
  data: CrimeEventData[],
  domain: [number, number],
  constraints: BinningConstraint
): TimeBin[] {
  const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);

  // Calculate burstiness (variance in inter-arrival times)
  let totalGap = 0;
  let gapCount = 0;
  for (let i = 1; i < sorted.length; i++) {
    totalGap += sorted[i].timestamp - sorted[i - 1].timestamp;
    gapCount++;
  }
  const avgGap = gapCount > 0 ? totalGap / gapCount : 0;

  // Calculate variance
  let variance = 0;
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].timestamp - sorted[i - 1].timestamp;
    variance += Math.pow(gap - avgGap, 2);
  }
  variance = gapCount > 0 ? variance / gapCount : 0;

  // Coefficient of variation
  const cv = avgGap > 0 ? Math.sqrt(variance) / avgGap : 0;

  // Choose strategy based on characteristics
  if (cv > 2) {
    // High burstiness - use burstiness strategy
    return generateBurstinessBins(data, domain, constraints);
  } else if (sorted.length > 1000) {
    // Large dataset - use uniform distribution
    return generateUniformDistributionBins(data, domain, constraints);
  } else {
    // Default to uniform time
    return generateUniformTimeBins(data, domain, constraints);
  }
}
```

**Decision Logic:**
| Coefficient of Variation | Strategy |
|--------------------------|----------|
| CV > 2 (high burstiness) | `burstiness` |
| CV ≤ 2, n > 1000 | `uniform-distribution` |
| CV ≤ 2, n ≤ 1000 | `uniform-time` |

---

## Integration with Adaptive Store

### Burstiness Map Storage

**File:** `src/store/useAdaptiveStore.ts:15`

```typescript
interface AdaptiveState {
  // ...
  burstinessMap: Float32Array | null;
  // ...
}
```

### Metric Selection

**File:** `src/store/useAdaptiveStore.ts:108-116`

```typescript
setBurstMetric: (metric) => set((state) => {
  const nextState = { ...state, burstMetric: metric };
  const map = resolveBurstMap(nextState);
  return {
    burstMetric: metric,
    burstCutoff: map
      ? computePercentile(map, state.burstThreshold)
      : state.burstCutoff
  };
}),

// Helper
const resolveBurstMap = (state: AdaptiveState) => {
  return state.burstMetric === 'burstiness'
    ? state.burstinessMap
    : state.densityMap;
};
```

---

## Shader Integration

### Burstiness Texture Lookup

**File:** `src/components/viz/shaders/ghosting.ts:270-275`

```glsl
// Sample burstiness from texture
float densitySpan = max(0.0001, uDensityDomainMax - uDensityDomainMin);
float burstNorm = clamp((vLinearY - uDensityDomainMin) / densitySpan, 0.0, 1.0);
float burstDensity = texture2D(uDensityTexture, vec2(burstNorm, 0.5)).r;

// Highlight if above threshold
if (burstDensity >= uBurstThreshold) {
  gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0, 0.55, 0.1), 0.6);
}
```

**Note:** Shader uses `uDensityTexture` for both metrics; the store switches which map is uploaded.

---

## Testing

### Unit Tests

**File:** `src/workers/adaptiveTime.worker.test.ts`

```typescript
test('computes burstiness map from timestamps', () => {
  // Burst pattern: 6 events clustered, then gaps
  const timestamps = new Float32Array([
    0, 100, 200, 300, 400, 500,  // burst (500ms span)
    10000,                        // gap
    10500, 10600                  // another small cluster
  ]);
  
  const result = computeAdaptiveMaps(timestamps, [0, 11000], {
    binCount: 10,
    binningMode: 'uniform-time',
  });
  
  // First bin should have higher burstiness (clustered events)
  expect(result.burstinessMap[0]).toBeGreaterThan(
    result.burstinessMap[5]  // Middle bin (sparse)
  );
});
```

---

## Visualization in Timeslicing Diagnostics

**File:** `src/app/timeslicing-algos/lib/adaptive-bin-diagnostics.ts:396`

```typescript
// Burst pattern characterization
if (eventShare / timeShare >= 2.0) {
  characterizationLabels.push('burst-pattern');
  traitPercents.push({
    label: 'burst-pattern',
    percent: (eventShare / timeShare) * 100
  });
}
```

**Threshold:** 2× concentration ratio for burst classification

---

## Key Design Decisions

### D1: Why use coefficient of variation for auto-detection?

**Decision:** CV = σ/μ for burstiness detection in auto-adaptive strategy.

**Rationale:**
- CV is scale-independent (unlike raw variance)
- CV > 2 indicates significant clustering
- Well-established in burstiness literature

### D2: Why normalize to [0, 1] for display?

**Decision:** Normalize B ∈ [-1, +1] to [0, 1].

**Rationale:**
- Shader uniforms expect [0, 1] values
- Percentile calculations simpler on [0, 1]
- Preserves relative ordering
- Linear transformation (reversible)

### D3: Why per-bin burstiness instead of global?

**Decision:** Compute burstiness for each time bin separately.

**Rationale:**
- Captures temporal variation in burstiness
- Different periods can have different patterns
- Allows targeted burst detection
- Matches binning granularity

---

## Limitations and Future Work

### Current Limitations

1. **Minimum events:** Bins with ≤1 event have burstiness = 0
2. **No confidence intervals:** Point estimate only
3. **Static bin size:** Burstiness computed for fixed bin count

### Future Enhancements

1. **Confidence scores:** Bootstrap-based uncertainty
2. **Adaptive binning:** Adjust bin count based on burstiness variance
3. **Multi-scale burstiness:** Compute at multiple time scales
4. **Burst classification:** Classify burst type (peak, spike, cluster)

---

## References

- Goh, K.I. & Barabási, A.L. (2008). *Burstiness and memory in complex systems* - Europhysics Letters
- Kleinberg, J. (2003). *Bursty and Hierarchical Structure in Streams* - Data Mining and Knowledge Discovery
- Wheatman, M. & Xu, K. (2022). *A Survey of Algorithms for Burst Detection in Time Series* - ACM Computing Surveys

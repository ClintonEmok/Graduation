# Rate of Events Metric

**Purpose:** Document the event rate metric as the primary measure for burstiness detection.

**Last updated:** 2026-03-31

---

## Overview

The **rate of events** (events per unit time) is the primary metric for burst detection in the Adaptive Space-Time Cube. This document covers the mathematical definition, implementation, and application of the event rate metric.

---

## Mathematical Definition

### Event Rate

The event rate λ(t) is defined as:

```
λ(t) = Number of events in time window / Duration of time window
```

**Units:** events per time unit (e.g., events/hour, events/day)

### Kernel Density Estimation (KDE)

To compute a smooth rate estimate, we use Gaussian kernel density estimation:

```
λ̂(t) = (1/n) × Σᵢ K_h(t - tᵢ)
```

Where:
- K_h(x) = (1/h√2π) × exp(-x²/2h²) is the Gaussian kernel
- h is the bandwidth (kernel width)
- tᵢ are the event timestamps

---

## Implementation

### Web Worker Computation

**File:** `src/workers/adaptiveTime.worker.ts:96-157`

```typescript
// Step 1: Count events per bin
const countMap = new Float32Array(safeBinCount);

if (binningMode === 'uniform-events' && sorted.length > 0) {
  // Uniform-events: equal events per bin
  // ... boundary-based binning
} else {
  // Uniform-time: equal time per bin
  for (const t of sorted) {
    const norm = (t - tStart) / tSpan;
    if (norm < 0 || norm > 1) continue;
    const rawIndex = Math.floor(norm * safeBinCount);
    const idx = clampToBin(rawIndex, safeBinCount);
    countMap[idx] += 1;
  }
}

// Step 2: Apply kernel smoothing
const densityInput = new Float32Array(safeBinCount);
for (let i = 0; i < safeBinCount; i++) {
  if (binningMode === 'uniform-events') {
    // Density = count / bin_width
    const start = boundaries[i];
    const end = boundaries[i + 1];
    const width = Math.max(EPSILON, end - start);
    densityInput[i] = countMap[i] / width;
  } else {
    densityInput[i] = countMap[i];
  }
}

let smoothedDensity = densityInput;
if (kernelWidth > 1) {
  smoothedDensity = new Float32Array(safeBinCount);
  for (let i = 0; i < safeBinCount; i++) {
    let sum = 0;
    let neighbors = 0;
    for (let k = -kernelWidth; k <= kernelWidth; k++) {
      const idx = i + k;
      if (idx >= 0 && idx < safeBinCount) {
        const value = densityInput[idx];
        if (Number.isFinite(value)) {
          sum += value;
          neighbors += 1;
        }
      }
    }
    smoothedDensity[i] = neighbors > 0 ? sum / neighbors : 0;
  }
}

// Step 3: Normalize to [0, 1]
const densityMap = new Float32Array(safeBinCount);
let maxDensity = 0;
for (let i = 0; i < safeBinCount; i++) {
  if (smoothedDensity[i] > maxDensity) {
    maxDensity = smoothedDensity[i];
  }
}
if (maxDensity <= 0) maxDensity = 1;

for (let i = 0; i < safeBinCount; i++) {
  densityMap[i] = smoothedDensity[i] / maxDensity;
}
```

---

## Configuration

### Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `binCount` | 100 | Number of bins for rate computation |
| `kernelWidth` | 1 | Smoothing window half-width (bins) |
| `binningMode` | `uniform-time` | Time vs event-based binning |

**File:** `src/lib/adaptive-utils.ts`

```typescript
export const ADAPTIVE_BIN_COUNT = 100;
export const ADAPTIVE_KERNEL_WIDTH = 1;
```

---

## Binning Modes

### Uniform-Time Binning

**Definition:** Each bin spans equal time duration.

**Formula:**
```
bin_width = (t_end - t_start) / bin_count
```

**Rate calculation:**
```
λ[bin_i] = count[bin_i] / bin_width
```

**Use case:** Comparing rates across time (calendar analysis)

**Example:**
```
Time range: 0-1000ms
Bin count: 10
Bin width: 100ms each

Events: [50, 150, 152, 155, 900]

Counts:
  Bin 0 (0-100ms):    1 event  → λ = 1/100ms = 0.01 events/ms
  Bin 1 (100-200ms):  3 events → λ = 3/100ms = 0.03 events/ms
  ...
  Bin 9 (900-1000ms): 1 event  → λ = 1/100ms = 0.01 events/ms
```

---

### Uniform-Events Binning

**Definition:** Each bin contains equal number of events.

**Formula:**
```
bin_boundary[i] = timestamp[floor(i × n / bin_count)]
```

**Rate calculation:**
```
λ[bin_i] = events_per_bin / (end_i - start_i)
```

**Use case:** Burst detection (expands dense regions)

**Example:**
```
Events: [50, 150, 152, 155, 900]
Bin count: 5
Events per bin: 1

Boundaries:
  Bin 0: 50-150   (100ms span)  → λ = 1/100ms
  Bin 1: 150-152  (2ms span)    → λ = 1/2ms = 0.5 events/ms (burst!)
  Bin 2: 152-155  (3ms span)    → λ = 1/3ms
  Bin 3: 155-900  (745ms span)  → λ = 1/745ms
  Bin 4: 900-1000 (100ms span)  → λ = 1/100ms
```

**Key Insight:** Dense clusters result in narrow bins with high rates.

---

## Kernel Smoothing

### Purpose

Raw bin counts are noisy. Kernel smoothing:
1. Reduces variance from binning artifacts
2. Provides continuous rate estimate
3. Enables meaningful interpolation

### Implementation

**File:** `src/workers/adaptiveTime.worker.ts:140-157`

```typescript
// Box kernel smoothing (for efficiency)
if (kernelWidth > 1) {
  smoothedDensity = new Float32Array(safeBinCount);
  for (let i = 0; i < safeBinCount; i++) {
    let sum = 0;
    let neighbors = 0;
    for (let k = -kernelWidth; k <= kernelWidth; k++) {
      const idx = i + k;
      if (idx >= 0 && idx < safeBinCount) {
        sum += densityInput[idx];
        neighbors += 1;
      }
    }
    smoothedDensity[i] = neighbors > 0 ? sum / neighbors : 0;
  }
}
```

**Note:** Uses box kernel for computational efficiency. Gaussian kernel would provide smoother results but at higher computational cost.

---

## Rate-to-Warp Mapping

### From Rate to Visual Space

The density map drives adaptive warping via:

```typescript
// Weight calculation: 1 + (normalized_density × 5)
const weights = new Float32Array(safeBinCount);
let totalWeight = 0;

for (let i = 0; i < safeBinCount; i++) {
  const normalized = smoothedDensity[i] / maxDensity;
  const weight = 1 + normalized * 5; // Dense bins get 6× visual space
  weights[i] = weight;
  totalWeight += weight;
}

// Cumulative distribution → warp map
const warpMap = new Float32Array(safeBinCount);
let accumulated = 0;
for (let i = 0; i < safeBinCount; i++) {
  const warped = tStart + (accumulated / totalWeight) * tSpan;
  warpMap[i] = warped;
  accumulated += weights[i];
}
```

**Interpretation:**
- Bins with λ = λ_max get 6× the visual space
- Bins with λ = 0 get 1× the visual space (minimum)
- Smooth transition between rates

---

## Rate Thresholding for Burst Detection

### Percentile-Based Threshold

**File:** `src/store/useAdaptiveStore.ts:39-45`

```typescript
const computePercentile = (values: Float32Array, percentile: number): number => {
  if (!values.length) return 1;
  const sorted = Array.from(values).sort((a, b) => a - b);
  const clamped = Math.max(0, Math.min(1, percentile));
  const index = Math.min(sorted.length - 1, Math.floor(clamped * (sorted.length - 1)));
  return sorted[index] ?? 1;
};
```

**Default threshold:** 70th percentile

**Meaning:** Points in bins with density ≥ 70th percentile are highlighted as "bursty".

---

## Timeline Visualization

### Density Histogram

**Location:** Timeline overview

**Visual encoding:**
- Bar height = event count (or rate)
- Color gradient = density intensity
- Threshold line = burst cutoff

### Interactive Threshold

**User can adjust:**
- Slider from 50% to 99%
- Real-time update of burst highlights
- Count of points above threshold

---

## Comparison: Rate vs Count

| Metric | Formula | Pros | Cons |
|--------|---------|------|------|
| **Count** | Events in bin | Simple, intuitive | Ignores bin width |
| **Rate** | Events / time | Normalized, comparable | Requires time info |

**Example:**
```
Bin A: 100 events in 1 hour → count=100, rate=100/hr
Bin B: 100 events in 24 hours → count=100, rate=4.17/hr

Same count, different rate!
Rate reveals Bin A is much denser.
```

---

## Use Cases

### Use Case 1: Identifying Peak Crime Hours

**Scenario:** When is crime most active?

**Approach:**
1. Use `uniform-time` binning
2. Set bin width to 1 hour
3. Observe rate distribution
4. Identify hours with λ > 70th percentile

**Interpretation:** Hours with high rate are peak crime times.

---

### Use Case 2: Detecting Crime Waves

**Scenario:** Is there an unusual clustering?

**Approach:**
1. Use `uniform-events` binning
2. Compare rate across bins
3. Look for narrow bins (dense clusters)
4. High rate = burst detected

**Interpretation:** Narrow bins with high rate indicate burst periods.

---

### Use Case 3: Comparing Districts

**Scenario:** Which district has highest activity?

**Approach:**
1. Filter by district
2. Compute rate for each
3. Compare max rates

**Note:** Must use rate (not count) for fair comparison across time spans.

---

## Performance Considerations

### Computational Complexity

| Operation | Complexity |
|-----------|------------|
| Event counting | O(n) |
| Kernel smoothing | O(bins × kernelWidth) |
| Normalization | O(bins) |
| Warp calculation | O(bins) |

**Total:** O(n + bins × kernelWidth)

With typical values:
- n = 1,200,000 events
- bins = 100
- kernelWidth = 1

**Result:** ~1.2M operations, computed in Web Worker (non-blocking)

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Rate Computation Pipeline                                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Input: timestamps (Float32Array)                         │
│     ↓                                                         │
│  2. Bin events (O(n))                                         │
│     ↓                                                         │
│  3. Apply kernel smoothing (O(bins × kernelWidth))           │
│     ↓                                                         │
│  4. Normalize to [0, 1] (O(bins))                            │
│     ↓                                                         │
│  5. Output: densityMap (Float32Array)                        │
│     ↓                                                         │
│  6. Compute percentile threshold                              │
│     ↓                                                         │
│  7. Upload to GPU texture                                     │
│     ↓                                                         │
│  8. Shader: highlight points above threshold                  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Design Decisions

### D1: Why normalize rate to [0, 1]?

**Decision:** Normalize density by maximum for display.

**Rationale:**
- Shader uniforms work best with [0, 1] range
- Percentile calculations simpler
- Preserves relative ordering
- Avoids numerical precision issues

### D2: Why use box kernel instead of Gaussian?

**Decision:** Box kernel for smoothing.

**Rationale:**
- Box kernel: O(bins × kernelWidth)
- Gaussian: O(bins²) for proper convolution
- With kernelWidth=1, box kernel is sufficient
- Trade-off: efficiency vs smoothness

### D3: Why 6× maximum weight?

**Decision:** Weight = 1 + (normalized_density × 5)

**Rationale:**
- Minimum weight of 1 ensures all bins have some space
- Maximum weight of 6 prevents over-expansion
- Empirically provides good visual balance
- 6× expansion is noticeable but not extreme

---

## Testing

### Unit Tests

**File:** `src/workers/adaptiveTime.worker.test.ts`

```typescript
test('computes density map from timestamps', () => {
  const timestamps = new Float32Array([0, 100, 200, 300, 400, 500]);
  const result = computeAdaptiveMaps(timestamps, [0, 500], {
    binCount: 5,
    kernelWidth: 1,
  });

  // All bins should have similar density (uniform distribution)
  const variance = result.densityMap.reduce(
    (sum, v, _, arr) => sum + Math.pow(v - arr.reduce((a, b) => a + b) / arr.length, 2),
    0
  ) / result.densityMap.length;

  expect(variance).toBeLessThan(0.1);
});
```

---

## References

- Silverman, B.W. (1986). *Density Estimation for Statistics and Data Analysis*
- Scott, D.W. (2015). *Multivariate Density Estimation: Theory, Practice, and Visualization*
- Härdle, W.K. et al. (2004). *Nonparametric and Semiparametric Models*

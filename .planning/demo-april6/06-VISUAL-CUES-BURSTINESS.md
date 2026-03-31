# Visual Cues for Burstiness

**Purpose:** Document the visual encoding and interaction design for burst detection and highlighting.

**Last updated:** 2026-03-31

---

## Overview

Burstiness detection is a core feature of the Adaptive Space-Time Cube. The system provides multiple visual cues to help users identify and investigate bursty periods in spatiotemporal crime data.

---

## Burst Definition

### What is a Burst?

A **burst** is a temporal period with significantly higher event density than expected. Bursts are characterized by:

1. **High event concentration** in a short time span
2. **Short inter-arrival times** between consecutive events
3. **Variance in inter-arrival times** (irregular clustering)

### Burst Metrics

| Metric | Formula | Interpretation |
|--------|---------|----------------|
| **Density** | events / time_unit | Events per time interval |
| **Burstiness coefficient** | (σ - μ) / (σ + μ) | Variance in inter-arrival times |
| **Concentration ratio** | (events in bin / total events) / (bin duration / total duration) | Relative event concentration |

---

## Visual Encoding for Bursts

### 1. Color Overlay

**Encoding:** Orange overlay on points above burst threshold.

**Implementation:** `src/components/viz/shaders/ghosting.ts:269-275`

```glsl
// Burst highlight (based on density)
float densitySpan = max(0.0001, uDensityDomainMax - uDensityDomainMin);
float burstNorm = clamp((vLinearY - uDensityDomainMin) / densitySpan, 0.0, 1.0);
float burstDensity = texture2D(uDensityTexture, vec2(burstNorm, 0.5)).r;
if (burstDensity >= uBurstThreshold) {
  gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0, 0.55, 0.1), 0.6);
}
```

**Color Choice Rationale:**
- Orange (#FF8B1A) is high-visibility and distinct from categorical colors
- Blend (60%) preserves underlying crime type color
- Works against both dark and light backgrounds

---

### 2. Timeline Density Histogram

**Encoding:** Bar heights showing event density at each time bin.

**Visual Features:**
- Gradient fill from cyan to white based on density
- Burst threshold line (dashed) showing current cutoff
- Highlighted regions for bins above threshold

**Implementation:** `src/components/timeline/DualTimeline.tsx` (density bars)

---

### 3. Adaptive Warp Visualization

**Encoding:** Expanded vertical space for dense regions.

**Visual Features:**
- Slider controls warp factor (0% = uniform, 100% = fully adaptive)
- Animated transition between uniform and adaptive modes
- Visual expansion of bursty periods when adaptive is active

**Implementation:** `src/workers/adaptiveTime.worker.ts:170-192`

```typescript
// Weight bins by density: weight = 1 + (normalized_density * 5)
const weights = new Float32Array(safeBinCount);
for (let i = 0; i < safeBinCount; i++) {
  const normalized = smoothedDensity[i] / maxDensity;
  const weight = 1 + normalized * 5; // Dense bins get 6x space
  weights[i] = weight;
  totalWeight += weight;
}
```

---

### 4. Burst Window Highlights

**Encoding:** Highlighted regions on timeline for detected bursts.

**Visual Features:**
- Semi-transparent overlay on burst periods
- Label showing burst classification
- Interactive: click to create slice from burst

**Implementation:** `src/store/useCoordinationStore.ts:32`

```typescript
interface CoordinationState {
  selectedBurstWindows: {
    start: number;
    end: number;
    metric: 'density' | 'burstiness';
  }[];
}
```

---

### 5. Auto-Generated Burst Slices

**Encoding:** Time slices automatically created for detected bursts.

**Visual Features:**
- Named "Burst 1", "Burst 2", etc.
- Different visual treatment than manual slices
- Indicates source (auto-detected vs user-created)

**Implementation:** `src/store/slice-domain/createSliceCoreSlice.ts:154-182`

```typescript
addBurstSlice: (burstWindow) => {
  const [rangeStart, rangeEnd] = toNormalizedStoreRange(
    burstWindow.start,
    burstWindow.end
  );

  const burstNumber = get().slices.filter(slice => slice.isBurst).length + 1;
  const burstSlice: TimeSlice = {
    id: generateId(),
    name: `Burst ${burstNumber}`,
    // ... other fields
    isBurst: true,
    burstSliceId: buildBurstSliceId(rangeStart, rangeEnd),
  };

  set({ slices: sortSlices([...state.slices, burstSlice]) });
  return burstSlice;
},
```

---

## Burst Metric Options

### Density Metric

**Definition:** Number of events per time bin, smoothed with KDE.

**Use Case:** Identifying periods with high absolute event counts.

**Configuration:**
- `burstThreshold`: Percentile cutoff (default: 0.7 = 70th percentile)
- Bins above threshold are highlighted

**Implementation:** `src/store/useAdaptiveStore.ts:97-98`

```typescript
burstMetric: 'density',
burstThreshold: 0.7, // 70th percentile
```

---

### Burstiness Metric

**Definition:** Coefficient of variation in inter-arrival times.

**Formula:** 
```
burstiness = (σ - μ) / (σ + μ)
```
Where:
- σ = standard deviation of inter-arrival times
- μ = mean inter-arrival time

**Range:** -1 (uniform) to +1 (bursty)

**Interpretation:**
| Value | Pattern |
|-------|---------|
| -1.0 | Perfectly uniform (clockwork) |
| 0.0 | Poisson process (random) |
| +1.0 | Extreme burstiness (all events at once) |

**Implementation:** `src/workers/adaptiveTime.worker.ts:200-230`

```typescript
// Calculate burstiness from inter-arrival times
const burstCounts = new Float32Array(safeBinCount);
const burstSum = new Float32Array(safeBinCount);
const burstSumSq = new Float32Array(safeBinCount);

for (let i = 1; i < sorted.length; i++) {
  const delta = sorted[i] - sorted[i - 1];
  const idx = /* bin index */;
  burstCounts[idx] += 1;
  burstSum[idx] += delta;
  burstSumSq[idx] += delta * delta;
}

// Compute burstiness coefficient
for (let i = 0; i < safeBinCount; i++) {
  const count = burstCounts[i];
  if (count <= 1) {
    burstinessMap[i] = 0;
    continue;
  }
  const mean = burstSum[i] / count;
  const variance = Math.max(0, burstSumSq[i] / count - mean * mean);
  const sigma = Math.sqrt(variance);
  const denom = sigma + mean;
  const burstiness = denom > 0 ? (sigma - mean) / denom : 0;
  const normalized = Math.max(0, Math.min(1, (burstiness + 1) / 2));
  burstinessMap[i] = normalized;
}
```

---

## User Controls

### Burst Threshold Slider

**Location:** Adaptive Controls panel

**Behavior:**
- Range: 50% - 99%
- Default: 70%
- Real-time update of highlighted regions

**Visual Feedback:**
- Points above threshold turn orange
- Timeline regions above threshold are shaded
- Count of burst points shown in legend

**Implementation:** `src/store/useAdaptiveStore.ts:117-121`

```typescript
setBurstThreshold: (v) => set((state) => ({
  burstThreshold: v,
  burstCutoff: resolveBurstMap(state)
    ? computePercentile(resolveBurstMap(state) as Float32Array, v)
    : state.burstCutoff
})),
```

---

### Metric Selector

**Location:** Adaptive Controls panel

**Options:**
- Density (default)
- Burstiness

**Behavior:**
- Switches which map is used for burst detection
- Updates burst cutoff calculation
- Refreshes highlighted regions

**Implementation:** `src/store/useAdaptiveStore.ts:108-116`

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
```

---

## Burst Detection Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Burst Detection Pipeline                                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Data Loading                                              │
│     ↓                                                         │
│  2. Web Worker: Compute density & burstiness maps            │
│     ↓                                                         │
│  3. Store: Receive maps, compute percentile cutoff           │
│     ↓                                                         │
│  4. Shader: Highlight points above threshold                  │
│     ↓                                                         │
│  5. UI: Display burst windows, enable slice creation         │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Burst Pattern Types

### Type 1: Prolonged Peak

**Characteristics:**
- Sustained high density over extended period
- Moderate burstiness coefficient
- Clear start/end boundaries

**Visual Pattern:** Continuous orange region in timeline

**Example:** Weekend crime spree over 48 hours

---

### Type 2: Isolated Spike

**Characteristics:**
- Very high density in short period
- High burstiness coefficient
- Sharp boundaries

**Visual Pattern:** Single bright orange bar in timeline

**Example:** Flash mob event, single incident with multiple reports

---

### Type 3: Clustered Bursts

**Characteristics:**
- Multiple spikes in succession
- High burstiness coefficient
- Gaps between spikes

**Visual Pattern:** Series of orange bars with gaps

**Example:** Crime wave with activity peaks

---

### Type 4: Valley Detection

**Characteristics:**
- Low density periods between bursts
- Negative burstiness regions
- Useful for identifying "safe" periods

**Visual Pattern:** Absence of orange, lower histogram bars

**Future Work:** Explicit valley highlighting not yet implemented

---

## Cross-View Burst Indication

### Timeline View

- Density histogram bars
- Burst threshold line
- Burst slice overlays
- Orange highlighting on timeline brush

### 3D Cube View

- Orange color overlay on burst points
- Expanded vertical space in adaptive mode
- Slice planes for burst periods

### 2D Map View

- Burst points highlighted
- Count indicator: "X points above 70% threshold"
- Spatial clustering visible

**Implementation:** `src/components/map/MapVisualization.tsx:57,285-351`

```typescript
const isSampled = Boolean(crimeMeta?.sampled);
const burstThreshold = useAdaptiveStore((state) => state.burstThreshold);

// ... color mode selection
const [colorMode, setColorMode] = useState<'burst' | 'type'>('burst');

// ... render
{colorMode === 'burst' ? (
  <>
    <span>Burst ≥ {Math.round(burstThreshold * 100)}%</span>
    <span> ({formatCount(burstCount)} points)</span>
  </>
) : (
  <span>By Type</span>
)}
```

---

## Interaction Design

### From Burst to Slice

**Workflow:**
1. User observes orange-highlighted region
2. User clicks on burst region (timeline or suggestion)
3. System creates "Burst N" slice
4. User can adjust slice boundaries
5. User investigates slice in detail views

**Automatic Burst Slices:**
- System suggests burst slices when burst data available
- `useAutoBurstSlices` hook creates slices automatically
- Can be disabled via `disableAutoBurstSlices` flag

**Implementation:** `src/components/timeline/DualTimeline.tsx:475-479`

```typescript
const burstWindows = useBurstWindows();
const burstWindowsForAutoSlices = disableAutoBurstSlices ? [] : burstWindows;

useAutoBurstSlices(burstWindowsForAutoSlices);
```

---

## Performance Considerations

### GPU-Based Highlighting

- Burst detection computed in Web Worker (non-blocking)
- Threshold comparison in fragment shader (parallel)
- No CPU-side iteration over points

### Efficient Updates

- Threshold changes only update `burstCutoff` value
- Shader automatically re-renders with new threshold
- No re-computation of density map needed

---

## Accessibility

### Colorblind Considerations

**Issue:** Orange burst overlay may be difficult for some colorblind users.

**Mitigation:**
1. Colorblind-safe theme available (Okabe-Ito palette)
2. Burst indication also via density histogram height
3. Numerical count displayed in legend
4. Adaptive warp provides non-color indication

**Future:** Add pattern overlay option for burst regions

---

## Key Design Decisions

### D1: Why orange for burst highlighting?

**Decision:** Use orange (#FF8B1A) for burst overlay.

**Rationale:**
- High contrast against dark background
- Distinct from categorical crime type colors
- Attention-grabbing without being aggressive
- Preserves underlying color identity

### D2: Why 70th percentile default threshold?

**Decision:** Default burst threshold is 70%.

**Rationale:**
- 50% would mark too many points (half)
- 90% would mark too few (extreme only)
- 70% provides good balance for exploration
- User can adjust based on their needs

### D3: Why both density and burstiness metrics?

**Decision:** Support both density and burstiness as burst metric.

**Rationale:**
- Density: Identifies high-activity periods (absolute)
- Burstiness: Identifies irregular patterns (relative)
- Different use cases require different metrics
- User can choose based on analysis goal

---

## References

- Kleinberg, J. (2003). *Bursty and Hierarchical Structure in Streams*
- Goh, K.I. & Barabási, A.L. (2008). *Burstiness and memory in complex systems*
- Wheatman, M. & Xu, K. (2022). *A Survey of Algorithms for Burst Detection*

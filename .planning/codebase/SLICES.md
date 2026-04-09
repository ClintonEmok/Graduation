# Slice System Analysis

**Analysis Date:** 2026-04-09

---

## 1. Slice Data Structures (Types/Interfaces)

### Core Slice Type
**Location:** `src/store/slice-domain/types.ts`

```typescript
export type TimeSliceSource = 'manual' | 'generated-applied' | 'suggestion';

export interface TimeSlice {
  id: string;
  name?: string;
  color?: string;
  notes?: string;
  source?: TimeSliceSource;
  type: 'point' | 'range';
  time: number;           // Normalized time position (0-100)
  range?: [number, number]; // For range slices: [start, end] normalized
  isBurst?: boolean;       // Auto-generated from burst detection
  burstSliceId?: string;   // Deterministic ID for burst deduplication
  isLocked: boolean;
  isVisible: boolean;
}
```

### Slice Domain State (Combined Store State)
**Location:** `src/store/slice-domain/types.ts` (lines 22-139)

```typescript
export type SliceDomainState =
  & SliceCoreState        // Core slice operations
  & SliceSelectionState   // Multi-select functionality
  & SliceCreationState    // Drag-to-create new slices
  & SliceAdjustmentState; // Handle dragging for resize
```

### Burst Window Type
**Location:** `src/components/viz/BurstList.tsx`

```typescript
export type BurstWindow = {
  id: string;
  start: number;           // Epoch seconds
  end: number;             // Epoch seconds
  peak: number;            // Normalized density/burstiness value
  count: number;
  duration: number;         // Seconds
  burstClass?: 'prolonged-peak' | 'isolated-spike' | 'valley' | 'neutral';
  burstConfidence?: number;
  burstScore?: number;
  // ... taxonomy metadata
};
```

---

## 2. Slice Store Architecture

### Main Store: `useSliceDomainStore`
**Location:** `src/store/useSliceDomainStore.ts`

```typescript
// Composed from 4 slices using Zustand's slice pattern:
export const useSliceDomainStore = create<SliceDomainState>()(
  persist(
    (...args) => ({
      ...createSliceCoreSlice(...args),         // Slice CRUD
      ...createSliceSelectionSlice(...args),     // Multi-select
      ...createSliceCreationSlice(...args),      // New slice creation
      ...createSliceAdjustmentSlice(...args),    // Resize handles
    }),
    { name: 'slice-domain-v1', partialize: (state) => ({ slices: state.slices }) }
  )
);
```

### Wrapper Hook: `useSliceStore`
**Location:** `src/store/useSliceStore.ts`

Exposes `useSliceDomainStore` with additional auto-burst functionality:
- `useAutoBurstSlices(burstWindows)` - Auto-creates slices from detected burst windows
- Handles range normalization (epoch ↔ normalized 0-100)
- Deduplication using burst window signatures

### Key Store Selectors
**Location:** `src/store/slice-domain/selectors.ts`

```typescript
selectSlices              // All slices
selectVisibleSlices       // Filtered by isVisible
selectActiveSliceId       // Currently focused slice
selectActiveSlice         // The active slice object
selectSelectedIds         // Multi-selected slice IDs
selectIsCreating          // Whether in slice creation mode
selectCreationPreviewRange // Drag preview coordinates
selectDraggingSliceId     // Which slice is being resized
selectHoverSliceId        // Which slice is hovered
```

---

## 3. Slice Generation Logic

### 3.1 Burst Window Detection
**Source:** `src/components/viz/BurstList.tsx` → `useBurstWindows()`

1. Reads from `useAdaptiveStore`:
   - `densityMap` / `burstinessMap` (Float32Array)
   - `burstCutoff` (percentile threshold, default 0.7)
   - `mapDomain` (time range as epoch seconds)

2. Algorithm:
   - Iterate through density/burstiness array
   - Find contiguous regions above `burstCutoff`
   - Convert indices back to epoch seconds
   - Sort by peak value, return top 10

3. Taxonomy Classification:
   **Location:** `src/lib/binning/burst-taxonomy.ts`

   ```typescript
   classifyBurstWindow(input: BurstTaxonomyInput): BurstTaxonomyResult
   
   // Burst classes:
   // - 'prolonged-peak': High density + sustained over multiple windows
   // - 'isolated-spike': High density + brief + no neighborhood support
   // - 'valley': Low density relative to neighbors
   // - 'neutral': Default for ambiguous cases
   ```

### 3.2 Auto-Burst Slice Creation
**Source:** `src/store/useSliceStore.ts` → `useAutoBurstSlices()`

```typescript
// Hook that auto-creates TimeSlices from burstWindows
useAutoBurstSlices(burstWindows: { start: number; end: number }[])

// Flow:
// 1. Deduplicate using window signature (rounded start-end)
// 2. For each new window, call addBurstSlice()
// 3. Normalize ranges from epoch seconds → normalized 0-100
// 4. Update existing burst slices if ranges need renormalization
```

### 3.3 Interval Boundary Detection
**Source:** `src/lib/interval-detection.ts`

```typescript
detectBoundaries(crimes, timeRange, options): BoundarySuggestion

// Detection methods:
// - 'peak': Local maxima above mean + stdDev threshold
// - 'change-point': Sliding window comparison for density shifts
// - 'rule-based': Equal-density or equal-time intervals

// Output:
interface BoundarySuggestion {
  boundaries: number[];  // Epoch seconds
  method: BoundaryMethod;
  confidence: number;
  metadata: { peaks?, changePoints?, ruleBasedBoundaries? }
}
```

### 3.4 Adaptive Time Warp
**Source:** `src/store/useAdaptiveStore.ts`, `src/workers/adaptiveTime.worker.ts`

```typescript
// Computes density map, burstiness map, and warp map
// warpFactor: 0 = linear, 1 = fully adaptive

interface AdaptiveState {
  warpFactor: number;
  densityMap: Float32Array;
  burstinessMap: Float32Array;
  countMap: Float32Array;
  warpMap: Float32Array;  // Time warping function
  isComputing: boolean;
  burstMetric: 'density' | 'burstiness';
  burstThreshold: number;  // 0.7 default
}
```

---

## 4. Timeline Rendering of Slices

### DualTimeline Component
**Location:** `src/components/timeline/DualTimeline.tsx`

#### Slice Geometry Calculation
**Lines 647-753:**

```typescript
// Computes pixel positions for each slice
const sliceGeometries = useMemo<TimelineSliceGeometry[]>(() => {
  // 1. Convert normalized slice range → pixel coordinates
  const toX = (normalized: number): number | null => {
    const sec = domainStart + (clampedNorm / 100) * spanSec;
    return detailScale(new Date(sec * 1000));
  };
  
  // 2. Filter visible slices, compute overlap counts
  // 3. Return geometry objects with pixel positions
}, [slices, detailScale, domainStart, domainEnd]);

interface TimelineSliceGeometry {
  id: string;
  left: number;           // Pixel x position
  width: number;          // Pixel width
  isActive: boolean;       // Currently focused
  isBurst: boolean;       // Auto-generated burst
  isSuggestion: boolean;   // Proposal slice
  isGeneratedApplied: boolean; // Accepted proposal
  overlapCount: number;   // How many slices overlap
  color: string | undefined;
}
```

#### Rendering Styles
**Lines 1063-1129:**

| Slice Type | Fill Color | Stroke | Special Effects |
|------------|------------|--------|----------------|
| Burst | `rgba(251, 146, 60, 0.26)` | `rgba(251, 146, 60, 0.85)` | Orange tint |
| Suggestion | `rgba(139, 92, 246, 0.2)` | `rgba(167, 139, 250, 0.85)` | Violet tint |
| Generated Applied | `rgba(16, 185, 129, 0.18)` | `rgba(74, 222, 128, 0.92)` | Green tint |
| Active | + pulsing glow animation | +2.3px stroke | Pulsing opacity |
| Overlap ≥2 | Hatching pattern overlay | Dashed stroke | Hatch fill |

#### Stacking Order
**Lines 737-753:**

```typescript
// Active slices render on top
// Higher overlap count = lower in stack (drawn first)
const stackWeight = (geometry) => {
  let weight = 0;
  if (geometry.overlapCount >= 2) weight += 1;
  if (geometry.isBurst) weight += 1;
  if (geometry.isActive) weight += 3;
  return weight;
};
return [...sliceGeometries].sort((a, b) => stackWeight(a) - stackWeight(b));
```

---

## 5. Cube/Map Synchronization

### 5.1 Cube Slice Planes
**Location:** `src/components/viz/TimeSlices.tsx`

```typescript
export function TimeSlices() {
  const slices = useSliceStore((state) => state.slices);
  const addSlice = useSliceStore((state) => state.addSlice);
  const updateSlice = useSliceStore((state) => state.updateSlice);
  
  // Maps normalized time → Y position in cube
  const scale = useMemo(() => {
    // Uses adaptive or linear scale based on timeScaleMode
  }, [timeScaleMode, columns, data]);
  
  return (
    <group>
      {slices.map((slice) => (
        <SlicePlane
          key={slice.id}
          slice={slice}
          y={scale(slice.time)}  // Y position based on time
          onUpdate={(updates) => updateSlice(slice.id, updates)}
        />
      ))}
    </group>
  );
}
```

### 5.2 DataPoints Shader Integration
**Location:** `src/components/viz/DataPoints.tsx` (lines 397-425)

```typescript
// Updates shader uniforms for each frame
const slices = useSliceStore.getState().slices;
const activeSlices = slices.filter(s => s.isVisible);

if (shader.uniforms.uSliceCount) {
  shader.uniforms.uSliceCount.value = activeSlices.length;
}

if (shader.uniforms.uSliceRanges) {
  for (let i = 0; i < 20; i++) {
    if (i < activeSlices.length) {
      const slice = activeSlices[i];
      if (slice.type === 'point') {
        sliceRanges[i * 2] = slice.time - threshold;
        sliceRanges[i * 2 + 1] = slice.time + threshold;
      } else {
        sliceRanges[i * 2] = slice.range?.[0] ?? 0;
        sliceRanges[i * 2 + 1] = slice.range?.[1] ?? 0;
      }
    }
  }
}
```

### 5.3 Coordination via Shared Store
**Location:** `src/store/useCoordinationStore.ts`

```typescript
interface CoordinationState {
  selectedIndex: number | null;      // Selected crime point
  selectedSource: SelectionSource;  // 'cube' | 'timeline' | 'map'
  brushRange: [number, number] | null;
  selectedBurstWindows: BurstWindow[];
  workflowPhase: 'generate' | 'review' | 'applied' | 'refine';
  syncStatus: SyncStatus;
}

// Selection sync flow:
// 1. Any component calls setSelectedIndex(index, source)
// 2. CoordinationStore tracks which component initiated
// 3. Other components subscribe and react to changes
```

### 5.4 Active Slice Focus
**Multiple locations sync via `activeSliceId`:**

| Component | Behavior on Active Slice |
|-----------|-------------------------|
| `DualTimeline.tsx` | Renders pulsing highlight, updates on `activeSliceUpdatedAt` |
| `TimeSlices.tsx` | 3D plane gets enhanced rendering |
| `DataPoints.tsx` | Shader highlights points within slice |
| `BurstList.tsx` | Highlights matching burst window |
| `ContextualSlicePanel.tsx` | Opens analysis panel |

---

## 6. Key Files Reference

| Purpose | File Path |
|---------|-----------|
| Core Types | `src/store/slice-domain/types.ts` |
| Main Store | `src/store/useSliceDomainStore.ts` |
| Store Wrapper + Auto-Burst | `src/store/useSliceStore.ts` |
| Core Slice Operations | `src/store/slice-domain/createSliceCoreSlice.ts` |
| Selection Logic | `src/store/slice-domain/createSliceSelectionSlice.ts` |
| Creation Mode | `src/store/slice-domain/createSliceCreationSlice.ts` |
| Resize Handles | `src/store/slice-domain/createSliceAdjustmentSlice.ts` |
| Selectors | `src/store/slice-domain/selectors.ts` |
| Slice Utilities | `src/lib/slice-utils.ts` |
| Interval Detection | `src/lib/interval-detection.ts` |
| Burst Taxonomy | `src/lib/binning/burst-taxonomy.ts` |
| Burst Windows | `src/components/viz/BurstList.tsx` |
| Timeline Rendering | `src/components/timeline/DualTimeline.tsx` |
| Cube Slice Planes | `src/components/viz/TimeSlices.tsx` |
| Shader Integration | `src/components/viz/DataPoints.tsx` |
| Coordination | `src/store/useCoordinationStore.ts` |
| Adaptive Store | `src/store/useAdaptiveStore.ts` |

---

## 7. Data Flow Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    CRIME DATA PIPELINE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CSV Files → DuckDB → Arrow → TimelineDataStore                  │
│                            ↓                                    │
│                   useAdaptiveStore                              │
│                   ┌───────────────────────┐                    │
│                   │ densityMap            │                    │
│                   │ burstinessMap         │                    │
│                   │ warpMap               │                    │
│                   │ (computed in worker)  │                    │
│                   └───────────────────────┘                    │
│                            ↓                                    │
│                   useBurstWindows()                             │
│                   ┌───────────────────────┐                    │
│                   │ Detects contiguous    │                    │
│                   │ high-density regions │                    │
│                   │ Classifies taxonomy  │                    │
│                   └───────────────────────┘                    │
│                            ↓                                    │
│                   useAutoBurstSlices()                          │
│                   ┌───────────────────────┐                    │
│                   │ Creates TimeSlices   │                    │
│                   │ Normalizes ranges     │                    │
│                   │ Deduplicates          │                    │
│                   └───────────────────────┘                    │
│                            ↓                                    │
│                   useSliceDomainStore                           │
│                   ┌───────────────────────┐                    │
│                   │ slices[]             │                    │
│                   │ activeSliceId        │                    │
│                   │ selectedIds           │                    │
│                   └───────────────────────┘                    │
│                            ↓                                    │
│         ┌────────────────┬────────────────┐                    │
│         ↓                ↓                ↓                     │
│   DualTimeline     TimeSlices      DataPoints                   │
│   (2D rendering)   (3D planes)     (shader)                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

*Slice system analysis complete*

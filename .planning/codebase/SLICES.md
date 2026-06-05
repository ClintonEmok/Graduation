# Slice System Analysis

**Analysis Date:** 2026-06-01

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
  warpEnabled?: boolean;
  warpWeight?: number;
  burstClass?: 'prolonged-peak' | 'isolated-spike' | 'valley' | 'neutral';
  burstRuleVersion?: string;
  burstScore?: number;
  burstConfidence?: number;
  burstProvenance?: string;
  burstinessCoefficient?: number;
  tieBreakReason?: string;
  thresholdSource?: string;
  neighborhoodSummary?: string;
  isLocked: boolean;
  isVisible: boolean;
  startDateTimeMs?: number | null;
  endDateTimeMs?: number | null;
}
```

### Slice Domain State (Combined Store State)
**Location:** `src/store/slice-domain/types.ts` (lines 148-153)

```typescript
export type SliceDomainState =
  & SliceCoreState        // Core slice operations
  & SliceSelectionState   // Multi-select functionality
  & SliceCreationState    // Drag-to-create new slices
  & SliceAdjustmentState; // Handle dragging for resize
```

### Burst Window Type
**Location:** `src/store/useDashboardDemoCoordinationStore.ts`

```typescript
export interface DemoBurstWindowSelection {
  id: string;
  start: number;           // Epoch seconds
  end: number;             // Epoch seconds
  metric: 'density' | 'burstiness';
  peak: number;            // Normalized density/burstiness value
  count: number;
  duration: number;         // Seconds
  burstClass?: 'prolonged-peak' | 'isolated-spike' | 'valley' | 'neutral';
  burstConfidence?: number;
  burstScore?: number;
  burstRationale: string;
  burstRuleVersion: string;
  burstProvenance: string;
  tieBreakReason: string;
  thresholdSource: string;
  neighborhoodSummary: string;
}
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
**Source:** `src/lib/binning/burst-taxonomy.ts`, `src/lib/interval-detection.ts`

1. Crime data is binned into time windows via DuckDB queries
2. Burst windows are detected via density peaks or burstiness coefficient
3. Taxonomy classification assigns classes (`prolonged-peak`, `isolated-spike`, `valley`, `neutral`)

**Taxonomy Classification:**
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
Computes pixel positions for each slice from normalized range → pixel coordinates via domain scaling.

#### Rendering Styles

| Slice Type | Fill Color | Stroke | Special Effects |
|------------|------------|--------|----------------|
| Burst | `rgba(251, 146, 60, 0.26)` | `rgba(251, 146, 60, 0.85)` | Orange tint |
| Suggestion | `rgba(139, 92, 246, 0.2)` | `rgba(167, 139, 250, 0.85)` | Violet tint |
| Generated Applied | `rgba(16, 185, 129, 0.18)` | `rgba(74, 222, 128, 0.92)` | Green tint |
| Active | + pulsing glow animation | +2.3px stroke | Pulsing opacity |
| Overlap ≥2 | Hatching pattern overlay | Dashed stroke | Hatch fill |

#### Stacking Order
Active slices render on top; higher overlap count = lower in stack.

---

## 5. Cube/Map Synchronization

### 5.1 Cube Slice Planes
**Location:** `src/components/viz/TimeSlices.tsx`

```typescript
export function TimeSlices() {
  const slices = useSliceStore((state) => state.slices);
  const addSlice = useSliceStore((state) => state.addSlice);
  const updateSlice = useSliceStore((state) => state.updateSlice);
  
  // Maps normalized time → Y position in cube using adaptive or linear scale
  const scale = useMemo(() => {
    if (timeScaleMode === 'linear') {
      return scaleLinear().domain([0, 100]).range([0, 100]);
    }
    // Adaptive relational projection
    let config;
    if (columns) {
      config = getAdaptiveScaleConfigColumnar(columns.timestamp, [0, 100], [0, 100]);
    } else {
      config = getAdaptiveScaleConfig(data, [0, 100], [0, 100]);
    }
    return scaleLinear().domain(config.domain).range(config.range);
  }, [timeScaleMode, data, columns]);
  
  return (
    <group>
      {slices.map((slice) => (
        <group key={slice.id}>
          <SlicePlane .../>
          <SliceClusterOverlay slice={slice} y={scale(slice.time)} />
          <SliceCrimePoints points={...} />
        </group>
      ))}
      <BurstEvolutionOverlay .../>
      <EvolutionFlowOverlay .../>
    </group>
  );
}
```

### 5.2 DataPoints Shader Integration
**Location:** `src/components/viz/DataPoints.tsx`

Slices are passed to shader uniforms to highlight points within slice ranges:
- `uSliceCount` uniform — number of active slices
- `uSliceRanges` uniform — array of [start, end] normalized values

### 5.3 Coordination via Shared Store
**Location:** `src/store/useDashboardDemoCoordinationStore.ts`

```typescript
interface DashboardDemoCoordinationState {
  selectedIndex: number | null;
  selectedSource: DemoSelectionSource;  // 'cube' | 'timeline' | 'map'
  brushRange: [number, number] | null;
  selectedBurstWindows: DemoBurstWindowSelection[];
  syncStatus: DemoSyncStatus;
  // ... warp, STKDE, volume, inspect, comparison state
}
```

Selection sync flow:
1. Any component calls `setSelectedIndex(index, source)`
2. Coordination store tracks which component initiated
3. Other components subscribe and react to changes

### 5.4 Active Slice Focus
**Multiple locations sync via `activeSliceId`:**

| Component | Behavior on Active Slice |
|-----------|-------------------------|
| `DualTimeline.tsx` | Renders pulsing highlight |
| `TimeSlices.tsx` | 3D plane gets enhanced rendering via `evolutionState` |
| `DataPoints.tsx` | Shader highlights points within slice |
| `DemoSlicePanel.tsx` | Opens analysis panel for selected slice |

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
| Timeline Rendering | `src/components/timeline/DualTimeline.tsx` |
| Cube Slice Planes | `src/components/viz/TimeSlices.tsx` |
| Shader Integration | `src/components/viz/DataPoints.tsx` |
| Demo Coordination Store | `src/store/useDashboardDemoCoordinationStore.ts` |
| Adaptive Store | `src/store/useAdaptiveStore.ts` |
| Demo Slice Panel | `src/components/dashboard-demo/DemoSlicePanel.tsx` |
| Demo Timeslicing Mode | `src/store/useDashboardDemoTimeslicingModeStore.ts` |

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
│                   Burst window detection                        │
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

*Slice system analysis: 2026-06-01*

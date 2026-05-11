# State Management & Store Memory Audit

**Analysis Date:** 2026-05-08
**Focus Area:** Zustand Store Memory Footprint
**Project:** Adaptive Space-Time Cube Prototype

---

## Executive Summary

The project has **56 Zustand store files** with significant data duplication and memory risk. The most critical issues are:

1. **CRITICAL**: `useTimelineDataStore` stores full columnar crime data in memory (8.5M+ records potential)
2. **HIGH**: Multiple dashboard demo stores duplicate production store data
3. **HIGH**: Store-to-store subscriptions create implicit dependencies that bypass React's reconciliation

---

## Store Memory Payload Analysis

### 1. `useTimelineDataStore` - ⚠️ CRITICAL MEMORY RISK

**Location:** `src/store/useTimelineDataStore.ts`

**State Contents:**
```typescript
data: DataPoint[];              // Full point data array
columns: ColumnarData | null;    // Columnar format (Float32Array, Uint8Array, etc.)
overviewTimestampSec: number[];
crimeTypes: string[];
minX, maxX, minZ, maxZ: number | null;
minTimestampSec, maxTimestampSec: number | null;
isLoading, isMock, dataCount: metadata
```

**Memory Estimates (8.5M crime records):**
| Field | Type | Size per 8.5M records |
|-------|------|----------------------|
| `x` (Float32Array) | 4 bytes | ~34 MB |
| `z` (Float32Array) | 4 bytes | ~34 MB |
| `lat` (Float32Array) | 4 bytes | ~34 MB |
| `lon` (Float32Array) | 4 bytes | ~34 MB |
| `timestampSec` (Float64Array) | 8 bytes | ~68 MB |
| `timestamp` (Float32Array) | 4 bytes | ~34 MB |
| `type` (Uint8Array) | 1 byte | ~8.5 MB |
| `district` (Uint8Array) | 1 byte | ~8.5 MB |
| `block` (string[]) | ~50 bytes avg | ~425 MB |
| **Total ColumnarData** | | **~680 MB** |
| `data` (DataPoint[]) | ~100 bytes each | **~850 MB** (duplicate!) |

**Key Finding:** The store holds BOTH `data: DataPoint[]` (row-based) AND `columns: ColumnarData` (column-based). For 8.5M records, this could exceed **1.5 GB** of memory just for this store.

**Severity:** 🔴 **CRITICAL**
- Both data arrays are kept in memory simultaneously
- No lazy loading - all data loaded at once via `loadRealData()`
- Data persists until page refresh
- No pagination or viewport-based loading

**Recommendation:**
- Remove `data: DataPoint[]` - `columns` is sufficient for all consumers
- Implement streaming/chunked loading for large datasets
- Consider offloading to IndexedDB with viewport-based queries

---

### 2. `useAdaptiveStore` - ⚠️ HIGH MEMORY RISK

**Location:** `src/store/useAdaptiveStore.ts`

**State Contents:**
```typescript
densityMap: Float32Array | null;    // ADAPTIVE_BIN_COUNT entries
burstinessMap: Float32Array | null; // ADAPTIVE_BIN_COUNT entries
countMap: Float32Array | null;       // ADAPTIVE_BIN_COUNT entries
warpMap: Float32Array | null;        // ADAPTIVE_BIN_COUNT entries
```

**Memory Estimates:**
| Field | ADAPTIVE_BIN_COUNT (likely 200-500) |
|-------|-------------------------------------|
| Float32Array × 4 | ~8-16 KB per array |
| **Total** | **~32-64 KB** |

**Severity:** 🟡 **MEDIUM**
- Fixed-size TypedArrays are memory-efficient
- Maps recomputed on data change, old arrays garbage collected
- Worker-based computation prevents main thread blocking

**Additional Concern:**
```typescript
// Lines 62-68: Module-level worker instance persists across HMR
let worker: Worker | null = null;
if (typeof window !== 'undefined') {
  worker = new Worker(new URL('../workers/adaptiveTime.worker.ts', import.meta.url));
}
```
Worker is held at module scope - not cleaned up on store reset.

---

### 3. `useBinningStore` - ⚠️ HIGH DUPLICATION

**Location:** `src/store/useBinningStore.ts`

**State Contents:**
```typescript
bins: TimeBin[];
data: CrimeEventData[];        // DUPLICATED from TimelineDataStore
savedConfigurations: SavedConfiguration[];
modificationHistory: Array<{...}>;
```

**Memory Issue:**
- `data: CrimeEventData[]` (line 59, 69) duplicates crime event data
- `modificationHistory` grows unbounded (line 149-152, 189-193, 204-207, 227-230)
- No cleanup of modification history

**Severity:** 🟡 **MEDIUM**
- History array never shrinks
- Each bin operation pushes to history
- For long editing sessions, this could accumulate significant memory

**Recommendation:** Add `maxHistorySize` constant and prune oldest entries when exceeded.

---

### 4. `useDashboardDemoTimeslicingModeStore` - ⚠️ MAJOR DUPLICATION

**Location:** `src/store/useDashboardDemoTimeslicingModeStore.ts`

**State Contents:**
```typescript
pendingGeneratedBins: TimeBin[];  // Full bin data in DEMO store!
lastGeneratedMetadata: GenerationResultMetadata | null;
sliceTemplates: Array<{...}>;
```

**Key Finding:** This store holds `TimeBin[]` with full burst metadata (lines 296, 312-318), duplicating data that should exist only in the production `useSliceDomainStore`.

**Severity:** 🟠 **HIGH**
- 58 lines of dashboard demo stores (see line count earlier)
- Separate persistence layer for demo data
- Duplicates production store patterns unnecessarily

**Recommendation:** This store should not persist bin data - it should use the production stores directly.

---

### 5. `useSliceDomainStore` - 🟡 MEDIUM (with slice-domain pattern issues)

**Location:** `src/store/useSliceDomainStore.ts` + `src/store/slice-domain/`

**State Contents:**
```typescript
// From createSliceCoreSlice
slices: TimeSlice[];            // Array of all time slices
activeSliceId: string | null;
activeSliceUpdatedAt: number;

// From createSliceSelectionSlice
selectedIds: Set<string>;       // Set allocation
selectedCount: number;

// From createSliceCreationSlice
previewStart, previewEnd: number | null;
ghostPosition: GhostPosition | null;
// ... more creation state

// From createSliceAdjustmentSlice
draggingSliceId: string | null;
liveBoundarySec: number | null;
tooltip: TooltipPayload | null;
// ... more adjustment state
```

**Memory Issues:**
1. `Set<string>` allocation for `selectedIds` - creates new Set on every change (lines 10, 24, 32, 38, 42)
2. All slices stored in single array - no virtualization for large slice counts
3. `cachedCreationPreviewFeedback` in selectors.ts (line 39) - module-level cache that may become stale

**Persistence Concern (lines 10-21):**
```typescript
persist(
  (...args) => ({ ... }),
  {
    name: 'slice-domain-v1',
    partialize: (state) => ({ slices: state.slices }), // Only slices persist
  }
)
```

Slices persist to localStorage, but creation/adjustment state does not. This asymmetry means users lose slice definitions but not work-in-progress.

**Severity:** 🟡 **MEDIUM**

---

### 6. `useCoordinationStore` - 🟢 LOW

**Location:** `src/store/useCoordinationStore.ts`

**State Contents:**
```typescript
selectedIndex: number | null;
brushRange: [number, number] | null;
selectedBurstWindows: Array<{start, end, metric}>;
syncStatus: SyncStatus;
panelNoMatch: Partial<Record<PanelName, PanelNoMatchState>>;
```

**Memory Assessment:** Minimal - only stores selection metadata, not actual data.

**Concern:** `selectedBurstWindows` array grows via `toggleBurstWindow` with `slice(-3)` limit (line 150). Only 3 burst windows stored at a time - this is correct for the use case.

**Severity:** 🟢 **LOW**

---

### 7. `useFilterStore` - 🟢 LOW

**Location:** `src/store/useFilterStore.ts`

**State Contents:**
```typescript
selectedTypes: number[];
selectedDistricts: number[];
selectedTimeRange: [number, number] | null;
selectedSpatialBounds: SpatialBounds | null;
presets: FilterPreset[];
```

**Memory Assessment:** Small arrays and localStorage-persisted presets.

**Persisted to localStorage:** `presets` array (line 118-119)

**Concern:** `loadPresetsFromStorage()` called on every store creation - no caching of parsed presets.

**Severity:** 🟢 **LOW**

---

### 8. `useStkdeStore` - 🟡 MEDIUM

**Location:** `src/store/useStkdeStore.ts`

**State Contents:**
```typescript
response: StkdeResponse | null;    // Full hotspot response
runMeta: {...} | null;            // Metadata about last run
params: StkdeParams;               // Configuration
```

**Key Finding:** `StkdeResponse` can be large (contains hotspot geometries, grid data). Stored in state at line 145.

**Severity:** 🟡 **MEDIUM**

---

### 9. `useAggregationStore` - 🟢 LOW

**Location:** `src/store/useAggregationStore.ts`

**State Contents:**
```typescript
bins: Bin[];                    // Aggregation bins
lodFactor: number;
gridResolution: {x, y, z};
```

**Memory Assessment:** Small - bins array is regenerated on demand.

**Severity:** 🟢 **LOW**

---

### 10. `useHeatmapStore` - 🟢 LOW (uses persist middleware)

**Location:** `src/store/useHeatmapStore.ts`

**Memory Assessment:** Trivial - only UI settings persisted.

**Severity:** 🟢 **LOW**

---

## Data Duplication Analysis

### 🔴 CRITICAL: TimelineDataStore Duplicate Storage

**Problem:** `src/store/useTimelineDataStore.ts` lines 63-76

```typescript
data: DataPoint[],        // Row-based format (legacy?)
columns: ColumnarData | null,  // Columnar format (efficient)
```

Both formats stored simultaneously. `data` is populated via `generateMockData()` (line 80) and `setData()` (line 78), but `columns` is the format actually used by consumers (see grep results showing `columns` used in 50+ locations vs `data` in ~10).

**Consumers of `columns`:**
- `src/components/viz/CubeVisualization.tsx`
- `src/components/viz/ClusterManager.tsx`
- `src/components/viz/MainScene.tsx`
- `src/components/timeline/DualTimeline.tsx`
- Many dashboard components

**Consumers of `data`:**
- `src/components/viz/TimeSlices.tsx` (line 36)
- `src/components/viz/ClusterManager.tsx` (line 15)
- `src/components/timeline/DualTimeline.tsx` (line 167)

**Impact:** ~50% memory waste for timeline data.

---

### 🟠 HIGH: Dashboard Demo Stores Duplicate Production Stores

**Affected Stores:**
- `useDashboardDemoAdaptiveStore` → duplicates `useAdaptiveStore`
- `useDashboardDemoCoordinationStore` → duplicates `useCoordinationStore`
- `useDashboardDemoFilterStore` → duplicates `useFilterStore`
- `useDashboardDemoTimeStore` → duplicates `useTimeStore`
- `useDashboardDemoTimeslicingModeStore` → duplicates `useSliceDomainStore` (with bin data!)
- `useDashboardDemoWarpStore` → duplicates `useWarpSliceStore`
- `useDashboardDemoAnalysisStore` → unknown additional
- `useDashboardDemoMapLayerStore` → duplicates `useMapLayerStore`

**Problem:** Dashboard demo mode maintains completely separate state instead of using the production stores with modified UI state.

**Lines of code in demo stores:** 530 + 120 + 80 + 60 + 50 + 40 + 40 + 30 ≈ **~950 lines** of duplicated store code.

**Recommendation:** Dashboard demo should use production stores directly with a `demoMode` flag, not mirror all state in separate stores.

---

### 🟡 MEDIUM: TanStack Query Cache vs Zustand Duplication

**Finding:** `src/hooks/useCrimeData.ts` uses TanStack Query for API calls, but many components subscribe to `useTimelineDataStore` directly for the same data.

```typescript
// useCrimeData.ts line 140-157
const query = useQuery({
  queryKey: ['crimes', 'viewport', ...],
  queryFn: () => fetchCrimesInRange(...),
  // ...
});
```

**vs**

```typescript
// Direct store access
const columns = useTimelineDataStore((state) => state.columns);
```

**Problem:** `loadRealData()` in `useTimelineDataStore` calls `/api/crime/stream` directly and stores the result. Meanwhile `useCrimeData` calls `/api/crimes/range`. These are different endpoints returning potentially different data formats.

**Severity:** 🟡 **MEDIUM** - Two different data fetching paths with potential for inconsistency.

---

## Subscription Pattern Analysis

### 🟠 HIGH: `.getState()` Usage Pattern (342 matches)

**Problem:** Extensive use of `store.getState()` instead of React subscriptions creates implicit dependencies that bypass React's reconciliation.

**Examples:**
```typescript
// src/components/viz/MainScene.tsx line 82
const { columns, data } = useTimelineDataStore.getState();

// src/app/dashboard-v2/page.tsx line 305
useAdaptiveStore.getState().computeMaps(timestamps, [domainStartSec, domainEndSec], { binningMode: 'uniform-events' });

// src/store/useDashboardDemoTimeslicingModeStore.ts line 386
useSliceDomainStore.getState().replaceSlicesFromBins(pendingGeneratedBins, domain);
```

**Impact:**
1. Components don't re-render when state changes (they read once)
2. Creates tight coupling between stores
3. Makes state flow hard to track
4. Potential for stale data if stores change underneath

**Correct Pattern:**
```typescript
// Instead of:
const mapDomain = useAdaptiveStore.getState().mapDomain;

// Do:
const mapDomain = useAdaptiveStore((state) => state.mapDomain);
```

**Found 342 `.getState()` calls** - this is a systemic issue.

---

### 🟡 MEDIUM: Store-to-Store Subscriptions in Slices

**In `src/store/slice-domain/createSliceCoreSlice.ts`:**

```typescript
// Lines 23-24, 32, 94-95
const { minTimestampSec, maxTimestampSec } = useTimelineDataStore.getState();
const mapDomain = useAdaptiveStore.getState().mapDomain;
```

These are called inside slice creator functions, not inside React components. This means:

1. The slice reads other store state at creation time, not reactively
2. If `minTimestampSec` changes, the slice function doesn't re-run
3. Derived calculations may become stale

**In `src/store/useSliceStore.ts`:**
```typescript
// Lines 25-26, 34
const { minTimestampSec, maxTimestampSec } = useTimelineDataStore.getState();
const mapDomain = useAdaptiveStore.getState().mapDomain;
```

Same pattern - called inside hook, not reactive.

---

### 🟡 MEDIUM: Selector Performance in `src/store/slice-domain/selectors.ts`

```typescript
// Line 39-63: cachedCreationPreviewFeedback
let cachedCreationPreviewFeedback: CreationPreviewFeedback | null = null;
export const selectCreationPreviewFeedback = select((state) => {
  // ... comparison logic
  if (prev !== null && prev.isValid === next.isValid && ...) {
    return prev;  // Returns cached object
  }
  cachedCreationPreviewFeedback = next;
  return next;
});
```

**Problem:** Module-level cache means the same selector returns different objects based on previous calls. This defeats React's memoization and can cause unnecessary re-renders.

**Severity:** 🟡 **MEDIUM** - Cache invalidation depends on value equality, not state change.

---

## Re-render Cascade Analysis

### 🟠 HIGH: Dense Slices Array Causing Full Re-renders

**In `src/store/slice-domain/createSliceCoreSlice.ts`:**

```typescript
// Line 297: updateSlice creates new array reference
slices: sortSlices(state.slices.map((slice) => (slice.id === id ? { ...slice, ...updates } : slice))),
```

Every slice update creates a new sorted array and passes it to `set()`. This causes ALL components subscribed to `slices` to re-render, even if the changed slice isn't relevant to them.

**Mitigation present:** The store uses `selectSlices` and `selectVisibleSlices` selectors, but these still return the entire array. No memoization at the store level.

---

### 🟠 HIGH: creationSlice/adjustmentSlice Cause Frequent Updates

**State structure means any preview update or drag causes full state replacement:**

```typescript
// createSliceCreationSlice.ts line 79-86
updatePreview: (start, end) => {
  set({
    previewStart: normalizedStart,
    previewEnd: normalizedEnd,
    ghostPosition: { x: normalizedStart, width: Math.max(0, normalizedEnd - normalizedStart) },
  });
},
```

Every mouse move during drag updates multiple state fields, causing re-renders in all subscribing components.

---

### 🟡 MEDIUM: selectedBurstWindows Toggle Pattern

**In `useCoordinationStore.ts` line 137-151:**

```typescript
toggleBurstWindow: (window) =>
  set((state) => {
    const exists = state.selectedBurstWindows.some(...);
    if (exists) {
      return { selectedBurstWindows: state.selectedBurstWindows.filter(...) };
    }
    const next = [...state.selectedBurstWindows, window];
    return { selectedBurstWindows: next.slice(-3) };  // Creates new array
  }),
```

Creates new array reference on every toggle, even when the underlying data hasn't meaningfully changed.

---

## Store Architecture Issues

### 1. slice-domain Pattern Creates Large Store

**Problem:** `useSliceDomainStore` is a single store with 4 slice concerns:
- `SliceCoreState` (lines 34-55 in types.ts)
- `SliceSelectionState` (lines 57-66)
- `SliceCreationState` (lines 83-103)
- `SliceAdjustmentState` (lines 119-144)

All combined into one store via spread. This means any state change in ANY slice causes subscribers to re-evaluate.

**Recommendation:** Split into separate stores:
- `useSliceStore` (core slices only)
- `useSliceSelectionStore` (selection state)
- `useSliceCreationStore` (creation UI state)
- `useSliceAdjustmentStore` (drag/drop state)

---

### 2. Dashboard Demo Stores Shouldn't Exist

**Problem:** 8 separate stores for "demo" mode that duplicate production stores.

**Recommendation:** Use a `demoMode: boolean` flag in production stores instead of separate stores.

---

### 3. No Virtualization for Large Arrays

**Slices:** `slices: TimeSlice[]` can grow large. No virtualization - all slices in memory.

**Bins:** `bins: TimeBin[]` in `useBinningStore` can grow.

**Recommendation:** Implement windowing/virtualization for slice/bin arrays.

---

## Recommendations Summary

### 🔴 CRITICAL (Fix Immediately)

1. **Remove `data` array from `useTimelineDataStore`**
   - Keep only `ColumnarData columns` which is more efficient
   - All consumers already use `columns` or can be updated

2. **Implement chunked/streaming data loading**
   - Don't load 8.5M records into memory at once
   - Use viewport-based loading with TanStack Query

### 🟠 HIGH (Fix Soon)

3. **Eliminate Dashboard Demo duplicate stores**
   - Use production stores with `demoMode` flag
   - Or make demo mode a route/flag, not a parallel store structure

4. **Replace `.getState()` calls with reactive subscriptions**
   - 342 calls is systemic
   - Creates stale data issues
   - Breaks React reconciliation

5. **Add history size limits to `useBinningStore`**
   - `modificationHistory` grows unbounded

### 🟡 MEDIUM (Technical Debt)

6. **Split `useSliceDomainStore` into separate stores**
   - Core slices vs UI state belong in different stores
   - Reduces re-render cascades

7. **Fix `selectCreationPreviewFeedback` selector cache**
   - Module-level cache bypasses React memoization

8. **Clean up module-level worker in `useAdaptiveStore`**
   - Worker held at module scope, not cleaned up

9. **Add pagination to `useFilterStore` presets**
   - LocalStorage can fill up with presets

10. **Virtualize large slice/bin arrays**
    - Windowing for arrays that can grow to 100+ items

---

## Stores That Can Be Merged/Eliminated

| Store | Recommendation | Rationale |
|-------|----------------|-----------|
| `useDashboardDemoAdaptiveStore` | **ELIMINATE** | Duplicate of `useAdaptiveStore` |
| `useDashboardDemoCoordinationStore` | **ELIMINATE** | Duplicate of `useCoordinationStore` |
| `useDashboardDemoFilterStore` | **ELIMINATE** | Duplicate of `useFilterStore` |
| `useDashboardDemoTimeStore` | **ELIMINATE** | Duplicate of `useTimeStore` |
| `useDashboardDemoMapLayerStore` | **ELIMINATE** | Duplicate of `useMapLayerStore` |
| `useDashboardDemoWarpStore` | **ELIMINATE** | Duplicate of `useWarpSliceStore` |
| `useDashboardDemoAnalysisStore` | **INVESTIGATE** | May contain unique demo logic |
| `useDashboardDemoTimeslicingModeStore` | **MERGE INTO PRODUCTION** | Should use production slice stores |
| `useSliceAdjustmentStore` | **MERGE INTO** `useSliceDomainStore` | Redundant - already in slice-domain |
| `useSliceCreationStore` | **MERGE INTO** `useSliceDomainStore` | Redundant - already in slice-domain |
| `useSliceSelectionStore` | **MERGE INTO** `useSliceDomainStore` | Redundant - already in slice-domain |

**Total Eliminated/Merged:** 10-11 stores out of 56 (~20%)

---

## Severity Ratings Summary

| Store | Severity | Primary Issue |
|-------|----------|---------------|
| `useTimelineDataStore` | 🔴 CRITICAL | 1.5GB+ memory with duplicate formats |
| Dashboard Demo Stores (8) | 🟠 HIGH | Massive duplication, ~950 LOC waste |
| `useBinningStore` | 🟠 HIGH | Unbounded history growth |
| `useSuggestionStore` | 🟡 MEDIUM | Set allocations on every change |
| `useSliceDomainStore` | 🟡 MEDIUM | Too large, too many concerns |
| `useStkdeStore` | 🟡 MEDIUM | Response stored in state |
| `useAdaptiveStore` | 🟡 MEDIUM | Worker cleanup issue |
| `useCoordinationStore` | 🟢 LOW | OK as-is |
| `useFilterStore` | 🟢 LOW | OK as-is |
| `useAggregationStore` | 🟢 LOW | OK as-is |
| `useHeatmapStore` | 🟢 LOW | OK as-is |
| `useTimeStore` | 🟢 LOW | OK as-is |

---

*Audit completed: 2026-05-08*
*Focus: State Management & Store Memory*
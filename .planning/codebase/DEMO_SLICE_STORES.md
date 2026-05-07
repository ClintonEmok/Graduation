# Dashboard Demo Slice Stores Analysis

**Analysis Date:** 2026-05-07

## Overview

Five demo-specific stores mirror shared stores with slight variations. Three are pure state mirrors (Time, Coordination, Adaptive), while two carry significant state and logic that can diverge from shared stores (Timeslicing Mode, Warp). The Slice store is an isolated fork.

## 1. `useDashboardDemoSliceStore.ts`

**File:** `src/store/useDashboardDemoSliceStore.ts`

### What It Is

A namespaced fork of `SliceDomainState` persisted separately under key `dashboard-demo-slice-domain-v1`. Uses identical slice-domain composition as `useSliceDomainStore`.

```typescript
// Composes same four slices as useSliceDomainStore:
...createSliceCoreSlice(...args),
...createSliceSelectionSlice(...args),
...createSliceCreationSlice(...args),
...createSliceAdjustmentSlice(...args),

// Persists only slices field:
partialize: (state) => ({ slices: state.slices }),

// Guard prevents new root state creation
const noNewRootGuard = <T>(store: T): T => store;
```

### Relationship to Shared Store

- **Identity:** Completely separate Zustand store with its own persistence key.
- **Shared code:** Re-exports identical selectors and types from `slice-domain/selectors.ts`.
- **No synchronization:** No mechanism syncs slices between `useDashboardDemoSliceStore` and `useSliceDomainStore`.

### Duplication

| Aspect | Shared `useSliceDomainStore` | Demo `useDashboardDemoSliceStore` |
|--------|------------------------------|-----------------------------------|
| Persistence key | `slice-domain-v1` | `dashboard-demo-slice-domain-v1` |
| Re-exports | Same selectors | Identical re-exports |
| State shape | `SliceDomainState` | `SliceDomainState` |

### Issues

- **Isolated fork:** Slices created in demo store are invisible to shared `useSliceDomainStore`.
- **Selective persistence:** Only `slices` persisted; selection/creation/adjustment state is ephemeral in both stores.
- **No conflict resolution:** If both stores have slices, no mechanism decides which takes precedence.

### Consumed By

`src/store/useDashboardDemoSliceStore.ts` itself is consumed by slice tool components. Which components use it vs. the shared store is the critical question — current analysis shows this store is fully isolated.

---

## 2. `useDashboardDemoTimeslicingModeStore.ts`

**File:** `src/store/useDashboardDemoTimeslicingModeStore.ts`

### What It Is

A timeslicing workflow store managing a generate → review → apply cycle. Persisted under `dashboard-demo-timeslicing-mode-v1`.

### State Shape

```typescript
interface DashboardDemoTimeslicingState {
  mode: 'auto' | 'manual';
  customIntervals: Array<{ name: string; startHour: number; endHour: number }>;
  autoConfig: { minBurstEvents: number; burstThreshold: number; maxSlices: number; };
  isCreatingSlice: boolean;
  creationStart: number | null;
  sliceTemplates: Array<{ id: string; name: string; duration: number; color: string; }>;
  generationInputs: GenerationInputs;
  generationStatus: GenerationStatus;
  generationError: string | null;
  pendingGeneratedBins: TimeBin[];
  lastGeneratedMetadata: GenerationResultMetadata | null;
  lastAppliedAt: number | null;
  // ... actions
}
```

### Key Actions

**`generateBurstDraftBinsFromWindows()`** (lines 315-363):
1. Validates time window from `generationInputs`
2. Fetches up to 100,000 crime records via `/api/crimes/range`
3. Calls `buildNonUniformDraftBinsFromSelection()` from `@/components/dashboard-demo/lib/demo-burst-generation`
4. Stores result in `pendingGeneratedBins` with metadata

**`applyGeneratedBins(domain)`** (lines 375-391):
```typescript
applyGeneratedBins: (domain) => {
  const { pendingGeneratedBins } = get();
  if (!pendingGeneratedBins.length) return false;
  useSliceDomainStore.getState().replaceSlicesFromBins(pendingGeneratedBins, domain);
  // ...
}
```
Calls **shared** `useSliceDomainStore.getState().replaceSlicesFromBins()` — this is the ONLY link between demo timeslicing and shared store.

### Normalization Mismatches

**Merge bins** (lines 73-109):
```typescript
const mergeBins = (bins: TimeBin[], binIds: string[]): TimeBin[] => {
  // ...
  const preservedWarpWeight = Math.max(...selected.map((bin) => bin.warpWeight ?? 1));
  // ...
  warpWeight: preservedWarpWeight,
  isNeutralPartition: selected.every((bin) => bin.isNeutralPartition),
  ...copyBurstMetadata(preservedMetadataSource),  // copies full burst metadata
  mergedFrom: selected.map((bin) => bin.id),
};
```

**Split bin** (lines 111-149):
```typescript
const splitBin = (bins: TimeBin[], binId: string, splitPoint: number): TimeBin[] => {
  // ...
  const inheritedMetadata = copyBurstMetadata(target);
  // Both children inherit ALL burst metadata
  ...inheritedMetadata,
  isModified: true,
  // No mergedFrom reference
};
```

**Delete bin** (line 151): Simple filter, no special handling.

### Comparison with Shared `useTimeslicingModeStore`

| Feature | Demo Store | Shared Store |
|---------|-----------|--------------|
| Persistence key | `dashboard-demo-timeslicing-mode-v1` | `timeslicing-mode-v2` |
| Mode | `auto \| manual` | `auto \| manual` |
| `preset` field | **Missing** | Present (hourly/daily/weekly/monthly/weekday-weekend/etc.) |
| `generationStatus` persistence | Excluded from partialize | Included |
| Merge bins | Copies all burst metadata + warpWeight + isNeutralPartition | Only copies count, crimeTypes, districts, avgTimestamp |
| Split bins | Inherits all burst metadata to both children | Only copies crimeTypes, districts |
| Delete bins | Simple filter | Simple filter |
| Preset interval definitions | None | Full `PRESET_DEFINITIONS` object |
| `getPresetIntervals()` | Missing | Present |

### Stale/Wrapping Patterns

**Stale state in pendingGeneratedBins:** `pendingGeneratedBins` can become stale if:
- Time range changes (not monitored)
- Crime data updates (not monitored)
- Applied to outdated domain

**No reconciliation:** When `applyGeneratedBins` is called, the domain passed may not match current `timeRange` in either demo time store or shared time store.

**Incomplete normalization of bins:** The demo store copies `isNeutralPartition` and `warpWeight` which are not present in all TimeBin shapes — `hasBurstMetadata()` check catches this but relies on `undefined` propagation.

---

## 3. `useDashboardDemoWarpStore.ts`

**File:** `src/store/useDashboardDemoWarpStore.ts`

### What It Is

A lightweight warp state store with precomputed maps. Not persisted.

```typescript
interface DashboardDemoWarpState {
  timeScaleMode: 'linear' | 'adaptive';
  warpSource: 'density' | 'slice-authored';
  warpFactor: number;
  densityMap: Float32Array | null;
  warpMap: Float32Array | null;
  mapDomain: [number, number];
  isComputing: boolean;
  // ... actions
}
```

### Relationship to Shared `useAdaptiveStore`

| Field | Demo Store | Shared Store |
|-------|-----------|--------------|
| `warpFactor` | Present (0-1 normalized) | Present (0 = Linear, 1 = Fully Adaptive) |
| `warpSource` | `'density' \| 'slice-authored'` | `'density' \| 'slice-authored' \| 'proposal-applied'` |
| `timeScaleMode` | `'linear' \| 'adaptive'` | No equivalent field |
| `warpControlMode` | Not present | `'automatic' \| 'manual'` |
| `warpGranularity` | Not present | `ComparableWarpGranularity` |
| `peerRelativeWarping` | Not present | Present |
| `manualWarpWeightOverrides` | Not present | Present |
| `densityScope` | Not present | `'viewport' \| 'global'` |
| `densityMap` | `Float32Array \| null` | `Float32Array \| null` |
| `burstinessMap` | Not present | `Float32Array \| null` |
| `countMap` | Not present | `Float32Array \| null` |
| `warpMap` | `Float32Array \| null` | `Float32Array \| null` |
| `burstMetric` | Not present | `'density' \| 'burstiness'` |
| `burstThreshold` | Not present | Present |
| `burstCutoff` | Not present | Present |
| `mapDomain` | `[number, number]` | `[number, number]` |
| `isComputing` | boolean | boolean |
| Web Worker | Not used | Used (`adaptiveTime.worker.ts`) |

### Key Differences

1. **No Web Worker:** Demo warp store does not have `computeMaps()` — it only stores precomputed maps set externally via `setPrecomputedMaps()`.
2. **No burstinessMap/countMap:** Only `densityMap` and `warpMap`.
3. **No dynamic computation:** Maps must be provided from external source (likely shared `useAdaptiveStore` or some computation layer).
4. **Simpler state:** Only tracks what visualization needs, not computation configuration.

### How It Differs from `useAdaptiveStore`

The demo warp store is a **simplified view** of adaptive state for visualization. The shared `useAdaptiveStore` manages the full adaptive computation pipeline with web workers, density/burstiness/count maps, threshold management, and manual overrides.

The demo store appears designed to hold already-computed maps for rendering without triggering new computation.

---

## 4. `useDashboardDemoCoordinationStore.ts`

**File:** `src/store/useDashboardDemoCoordinationStore.ts`

### What It Is

Cross-panel coordination store tracking selection, brush range, burst windows, and workflow phase.

### State Shape

```typescript
interface DashboardDemoCoordinationState {
  selectedIndex: number | null;
  selectedSource: 'cube' | 'timeline' | 'map' | null;
  lastInteractionAt: number | null;
  lastInteractionSource: DemoSelectionSource;
  brushRange: [number, number] | null;
  selectedBurstWindows: DemoBurstWindowSelection[];  // Rich burst window objects
  selectedDetailPeriod: DemoDetailPeriodSelection | null;
  detailsOpen: boolean;
  workflowPhase: 'generate' | 'review' | 'applied' | 'refine';
  syncStatus: DemoSyncStatus;
  panelNoMatch: Partial<Record<DemoPanelName, DemoPanelNoMatchState>>;
  comparisonSliceIds: Record<'left' | 'right', string | null>;
  comparisonSelectionOrder: DemoComparisonSlot[];
  // ... many actions
}
```

### Relationship to Shared `useCoordinationStore`

| Field | Demo Store | Shared Store |
|-------|-----------|--------------|
| `brushRange` | `[number, number] \| null` | `[number, number] \| null` (marked as "Normalized time range for brush") |
| `selectedBurstWindows` | Rich `DemoBurstWindowSelection[]` with full burst metadata | `{ start, end, metric }[]` — simple shape |
| `selectedDetailPeriod` | Present (Demo-specific) | Not present |
| `detailsOpen` | Present | Present |
| `workflowPhase` | Same enum | Same enum |
| `syncStatus` | `DemoSyncStatus` | `SyncStatus` (same shape) |
| `panelNoMatch` | Same | Same |
| `comparisonSliceIds` | Demo-specific left/right comparison | Not present |
| `comparisonSelectionOrder` | Demo-specific | Not present |

### Normalization Mismatch

**`DemoBurstWindowSelection`** (lines 10-27):
```typescript
export interface DemoBurstWindowSelection {
  id: string;
  start: number;
  end: number;
  metric: DemoBurstMetric;  // 'density' | 'burstiness'
  peak: number;
  count: number;
  duration: number;
  burstClass: 'prolonged-peak' | 'isolated-spike' | 'valley' | 'neutral';
  burstConfidence: number;
  burstScore: number;
  burstRationale: string;
  burstRuleVersion: string;
  burstProvenance: string;
  tieBreakReason: string;
  thresholdSource: string;
  neighborhoodSummary: string;
}
```

vs. shared store's simple `{ start: number; end: number; metric: 'density' | 'burstiness' }`.

**The demo store stores full burst metadata** (confidence, score, class, provenance, etc.) in the coordination store. The shared `useCoordinationStore` only tracks the time range and metric.

### Stale/Wrapping Patterns

1. **`selectedBurstWindows` can desync:** If burst generation runs multiple times, old windows remain in `selectedBurstWindows` until explicitly cleared.
2. **`toggleBurstWindow` behavior** (lines 180-192): Replaces entire array with single window if ID matches, otherwise replaces with single new window — effectively single selection only, despite array storage.
3. **Comparison slots independent:** `comparisonSliceIds` and `comparisonSelectionOrder` track slice IDs that may not exist in either demo slice store or shared slice store.

---

## 5. `useDashboardDemoTimeStore.ts`

**File:** `src/store/useDashboardDemoTimeStore.ts`

### What It Is

Simple time navigation store — current time, playback, range, resolution.

### State Shape

```typescript
interface DashboardDemoTimeState {
  currentTime: number;
  isPlaying: boolean;
  timeRange: [number, number];
  speed: number;
  timeWindow: number;
  timeResolution: 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years';
  timeScaleMode: 'linear' | 'adaptive';
  // ... actions
}
```

### Relationship to Shared `useTimeStore`

**Virtually identical.** Both have:
- Same initial state values (from `@/lib/constants`)
- Same `clampToRange()` and `normalizeRange()` logic
- Same state interface
- Both are ephemeral (not persisted)

The demo time store has **no distinguishing features** — it's a plain copy with no overrides or extensions.

---

## Summary: Store Relationships

```
SHARED LAYER
├── useSliceDomainStore (persisted: 'slice-domain-v1')
│   └── Core slice state
├── useSliceStore  ─── thin wrapper of useSliceDomainStore with normalization hooks
├── useAdaptiveStore (not persisted)
│   ├── Full adaptive computation (Web Worker)
│   ├── densityMap, burstinessMap, countMap, warpMap
│   └── burstThreshold, burstCutoff, warpGranularity, etc.
├── useTimeslicingModeStore (persisted: 'timeslicing-mode-v2')
│   ├── generationInputs, pendingGeneratedBins
│   ├── applyGeneratedBins() → calls useSliceDomainStore.replaceSlicesFromBins()
│   └── Preset definitions, full merge/split/delete with metadata
├── useCoordinationStore (not persisted)
│   ├── brushRange, workflowPhase, syncStatus
│   └── Simple { start, end, metric } burst windows
└── useTimeStore (not persisted)
    └── Pure time state

DEMO LAYER (isolated)
├── useDashboardDemoSliceStore (persisted: 'dashboard-demo-slice-domain-v1')
│   └── Identical composition to useSliceDomainStore, separate persistence
├── useDashboardDemoTimeslicingModeStore (persisted: 'dashboard-demo-timeslicing-mode-v1')
│   ├── generationInputs, pendingGeneratedBins
│   ├── applyGeneratedBins() → calls useSliceDomainStore.getState().replaceSlicesFromBins()
│   ├── Rich burst metadata in merge/split (isNeutralPartition, warpWeight)
│   └── Missing preset system and getPresetIntervals()
├── useDashboardDemoWarpStore (not persisted)
│   ├── Precomputed maps only (no worker, no dynamic computation)
│   └── Simplification of useAdaptiveStore for visualization
├── useDashboardDemoCoordinationStore (not persisted)
│   ├── Rich DemoBurstWindowSelection (full burst metadata)
│   ├── selectedDetailPeriod, comparisonSliceIds (demo-specific)
│   └── toggleBurstWindow replaces array (single-selection behavior)
└── useDashboardDemoTimeStore (not persisted)
    └── Pure duplicate of useTimeStore
```

## Key Findings

### Duplicate State

1. **Time:** `useTimeStore` and `useDashboardDemoTimeStore` are identical — no synchronization mechanism.

2. **Coordination:** Demo store has rich `DemoBurstWindowSelection[]` with full metadata; shared has simple `{start, end, metric}[]` — both represent the same logical burst windows but at different fidelity levels.

3. **Slice domain:** `useSliceDomainStore` and `useDashboardDemoSliceStore` maintain separate slice arrays with no sync.

### Normalization Mismatches

1. **Bin metadata on split/merge:** Demo store copies full burst metadata (`isNeutralPartition`, `warpWeight`, all provenance fields); shared store only copies basic fields (count, crimeTypes, districts, avgTimestamp).

2. **Burst window shape:** Demo coordination store preserves full burst metadata on selected windows; shared store only keeps time range and metric.

3. **Time range normalization:** Demo time store and shared time store both have `normalizeRange()` but could produce different results if called with different input types (the functions are identical though).

### Stale/Wrapping Patterns

1. **`pendingGeneratedBins` in demo timeslicing:** No invalidation when time range or data changes; can be applied to stale domain.

2. **`applyGeneratedBins` bridge:** Demo timeslicing writes to shared `useSliceDomainStore` via direct state access (`useSliceDomainStore.getState().replaceSlicesFromBins(...)`) — this is the only sync point but it's a one-way push with no feedback loop.

3. **`toggleBurstWindow` single-selection behavior:** Despite `selectedBurstWindows` being an array, `toggleBurstWindow` replaces the entire array when a window is toggled — effectively single selection with array storage, different from shared store's "append + slice(-3)" behavior.

4. **No synchronization between demo stores:** Demo time store doesn't sync with shared time store; demo warp store doesn't sync with shared adaptive store; demo slice store doesn't sync with shared slice domain store.

### Which Stores Are Actually Consumed by Slice Tools

Based on the architecture:
- **Direct slice manipulation:** `useSliceDomainStore` (via shared) or `useDashboardDemoSliceStore` (isolated) — components must choose one
- **Burst generation workflow:** `useDashboardDemoTimeslicingModeStore` or `useTimeslicingModeStore` — must choose one
- **Applying bins:** Both timeslicing stores call `useSliceDomainStore.getState().replaceSlicesFromBins()` — so shared slice domain receives the applied slices regardless of which timeslicing store is used

### Recommendations

1. **Eliminate duplicate stores:** Demo time store is a pure duplicate — use shared `useTimeStore` directly or remove.

2. **Sync or isolate:** Either establish bidirectional sync between demo and shared stores (complex) or ensure components consistently pick one (demo OR shared, not both).

3. **Unify burst metadata model:** Decide if coordination stores should hold rich burst window metadata or simple references — current dual model causes desync risk.

4. **Validate pendingGeneratedBins before apply:** Add domain/timestamp validation to prevent applying stale bins.

5. **Consider `useSliceStore` normalization hooks for demo:** The `useAutoBurstSlices` hook in shared `useSliceStore` handles range normalization — demo store lacks equivalent logic.
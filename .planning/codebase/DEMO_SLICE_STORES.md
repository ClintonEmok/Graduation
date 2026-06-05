# Dashboard Demo Slice Stores Analysis

**Analysis Date:** 2026-06-01

## Overview

The demo previously had five isolated stores (`useDashboardDemoSliceStore`, `useDashboardDemoTimeslicingModeStore`, `useDashboardDemoWarpStore`, `useDashboardDemoCoordinationStore`, `useDashboardDemoTimeStore`). After Phase 76 consolidation, **two stores were removed** (slice store and warp store) and their responsibilities absorbed:

- **`useDashboardDemoSliceStore`** — **REMOVED.** The demo now uses `useSliceDomainStore` directly.
- **`useDashboardDemoWarpStore`** — **REMOVED.** Warp state fully merged into `useDashboardDemoCoordinationStore`.

Three stores remain:
1. `useDashboardDemoCoordinationStore` — now consolidated with warp, STKDE, volume, inspect, comparison state
2. `useDashboardDemoTimeslicingModeStore` — persisted burst generation workflow
3. `useDashboardDemoTimeStore` — time navigation (still a pure duplicate of `useTimeStore`)

---

## 1. Store Status Summary

| Store | Status | Notes |
|-------|--------|-------|
| **`useDashboardDemoSliceStore`** | **REMOVED** | Demo uses `useSliceDomainStore` directly via `import { useSliceDomainStore } from '@/store/useSliceDomainStore'` |
| **`useDashboardDemoWarpStore`** | **REMOVED** | All warp fields merged into `useDashboardDemoCoordinationStore` |
| **`useDashboardDemoCoordinationStore`** | **CONSOLIDATED** | Now includes warp state, STKDE params, inspect settings, volume settings, comparison slots |
| **`useDashboardDemoTimeslicingModeStore`** | **ACTIVE** | Persisted independently under key `dashboard-demo-timeslicing-mode-v1` |
| **`useDashboardDemoTimeStore`** | **ACTIVE** | Pure duplicate of `useTimeStore`, not persisted |

---

## 2. `useDashboardDemoCoordinationStore.ts` — Consolidated Store

**File:** `src/store/useDashboardDemoCoordinationStore.ts` (425 lines)

### What It Is

A superset of the original coordination store that absorbed warp, STKDE, volume, inspect, and comparison state. This is the central hub for all demo cross-view state.

### State Shape

```typescript
interface DashboardDemoCoordinationState {
  // Selection sync (original)
  selectedIndex: number | null;
  selectedSource: DemoSelectionSource;
  lastInteractionAt: number | null;
  lastInteractionSource: DemoSelectionSource;
  brushRange: [number, number] | null;
  selectedBurstWindows: DemoBurstWindowSelection[];
  selectedDetailPeriod: DemoDetailPeriodSelection | null;
  detailsOpen: boolean;
  syncStatus: DemoSyncStatus;
  panelNoMatch: Partial<Record<DemoPanelName, DemoPanelNoMatchState>>;

  // Comparison (original)
  comparisonSliceIds: Record<DemoComparisonSlot, string | null>;
  comparisonSelectionOrder: DemoComparisonSlot[];

  // Inspect (merged)
  activeSliceIndex: number;
  viewMode: DemoSliceViewMode;
  inspectIsPlaying: boolean;
  inspectPlaybackSpeed: number;
  inspectInterpolation: boolean;
  inspectTrailEnabled: boolean;
  inspectTrailDecay: number;
  inspectIsScrubbing: boolean;
  inspectSliceOpacity: number;

  // Volume settings (merged)
  volumeScaleSeconds: number;
  volumeExaggeration: number;
  volumeNormalizationMode: DemoVolumeNormalizationMode;

  // Crime fetch (merged)
  crimeFetchStatus: DemoCrimeFetchStatus;
  sliceCrimeCounts: Record<string, number>;

  // Rail tab (merged)
  activeRailTab: DemoRailTab;

  // WARP STATE (formerly useDashboardDemoWarpStore)
  burstThreshold: number;
  timeScaleMode: DemoWarpScaleMode;     // 'linear' | 'adaptive'
  warpSource: DemoWarpSource;            // 'density' | 'slice-authored'
  warpFactor: number;                    // 0-3
  densityMap: Float32Array | null;
  warpMap: Float32Array | null;
  mapDomain: [number, number];
  isComputing: boolean;

  // Analysis/District (merged)
  selectedDistricts: string[];
  timeRange: DemoAnalysisTimeRange;

  // STKDE state (merged)
  stkdeScopeMode: DemoStkdeScopeMode;
  stkdeParams: StkdeParams;
  selectedHotspotId: string | null;
  hoveredHotspotId: string | null;
  spatialFilter: StkdeSpatialFilter | null;
  temporalFilter: StkdeTemporalFilter | null;
  stkdeResponse: StkdeResponse | null;

  // ... actions for all of the above
}
```

### Key Changes from Original Analysis

- **No separate slice store.** The coordination store tracks `comparisonSliceIds` referencing `useSliceDomainStore` slices.
- **No separate warp store.** Warp state (`timeScaleMode`, `warpFactor`, `densityMap`, `warpMap`, `mapDomain`, `isComputing`) lives in the coordination store.
- **Precomputed maps via `setPrecomputedMaps`:** Like the removed `useDashboardDemoWarpStore`, this store only stores precomputed maps set externally — no Web Worker. The shared `useAdaptiveStore` has the full computation pipeline.

### DemoBurstWindowSelection

```typescript
export interface DemoBurstWindowSelection {
  id: string;
  start: number;
  end: number;
  metric: 'density' | 'burstiness';
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

### toggleBurstWindow Behavior

Unlike the shared store's "append + slice(-3)" behavior, this replaces the entire array with a single window (effectively single selection):

```typescript
toggleBurstWindow: (window) =>
  set((state) => {
    const active = state.selectedBurstWindows[0];
    const isSameWindow = active?.id === window.id && ...;
    return { selectedBurstWindows: isSameWindow ? [active] : [window] };
  }),
```

---

## 3. `useDashboardDemoTimeslicingModeStore.ts`

**File:** `src/store/useDashboardDemoTimeslicingModeStore.ts` (544 lines)

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
  // ... all actions
}
```

### Key Actions

**`generateBurstDraftBinsFromWindows()`** (lines ~315-363):
1. Validates time window from `generationInputs`
2. Fetches up to 100,000 crime records via `/api/crimes/range`
3. Calls `buildNonUniformDraftBinsFromSelection()` from `@/components/dashboard-demo/lib/demo-burst-generation`
4. Stores result in `pendingGeneratedBins` with metadata

**`applyGeneratedBins(domain)`** (lines ~375-391):
```typescript
applyGeneratedBins: (domain) => {
  const { pendingGeneratedBins } = get();
  if (!pendingGeneratedBins.length) return false;
  useSliceDomainStore.getState().replaceSlicesFromBins(pendingGeneratedBins, domain);
  // ...
}
```
Calls **shared** `useSliceDomainStore.getState().replaceSlicesFromBins()`.

**New actions added:**
- `applySingleGeneratedBin(binId, domain)` — applies a single draft bin
- `addManualDraftRange(range)` — creates a manual draft from epoch ms bounds
- `updatePendingBinRange(binId, startMs, endMs)` — resizes a draft bin
- `computeManualDraftBin(binId)` — computes burst metadata for a manual draft
- `replacePendingGeneratedBins(bins)` — replaces all pending bins (not just merge)

### Normalization on Merge/Split

**Merge bins** copies all burst metadata (`warpWeight`, `isNeutralPartition`, burst taxonomy fields, `mergedFrom`).

**Split bin** creates two children inheriting ALL burst metadata from the parent, plus `isModified: true`.

### Stale/Wrapping Patterns

- `pendingGeneratedBins` can become stale if time range or data changes (not monitored)
- `applyGeneratedBins` bridges to shared `useSliceDomainStore` via direct state access — one-way push with no feedback loop

---

## 4. `useDashboardDemoTimeStore.ts`

**File:** `src/store/useDashboardDemoTimeStore.ts` (81 lines)

### What It Is

Simple time navigation store — current time, playback, range, resolution. Pure duplicate of `useTimeStore`.

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

## 5. What Changed: Stores Removed

### `useDashboardDemoSliceStore.ts` — **REMOVED**

The demo previously had a namespaced fork of `SliceDomainState` persisted under key `dashboard-demo-slice-domain-v1`. It is completely gone. The demo now uses the shared `useSliceDomainStore` directly.

**Consumer impact:** All demo components (`DemoSlicePanel`, etc.) now read/write slices from the shared `useSliceDomainStore`, same as non-demo components.

### `useDashboardDemoWarpStore.ts` — **REMOVED**

The demo warp store was a simplified view of adaptive state (precomputed maps only, no Web Worker). Its state (`timeScaleMode`, `warpFactor`, `densityMap`, `warpMap`, `mapDomain`, `isComputing`) was merged directly into `useDashboardDemoCoordinationStore`.

**Consumer impact:** Components that previously accessed `useDashboardDemoWarpStore` now read from `useDashboardDemoCoordinationStore`:
```typescript
// Before:
const warpMode = useDashboardDemoWarpStore((s) => s.timeScaleMode);
// After:
const warpMode = useDashboardDemoCoordinationStore((s) => s.timeScaleMode);
```

---

## 6. Store Architecture

```
SHARED LAYER
├── useSliceDomainStore (persisted: 'slice-domain-v1')
│   └── Core slice state (used by both demo and non-demo components)
├── useTimeStore (not persisted)
│   └── Pure time state (duplicated by demo)
├── useAdaptiveStore (not persisted)
│   ├── Full adaptive computation (Web Worker)
│   ├── densityMap, burstinessMap, countMap, warpMap
│   └── burstThreshold, burstCutoff, warpGranularity, etc.
├── useCoordinationStore (not persisted)
│   ├── brushRange, syncStatus
│   └── Simple { start, end, metric } burst windows
└── useTimeslicingModeStore (persisted: 'timeslicing-mode-v2')
    └── Shared timeslicing store

DEMO LAYER
├── useDashboardDemoCoordinationStore (not persisted)
│   ├── Warp state (absorbed from removed useDashboardDemoWarpStore)
│   ├── STKDE analysis state
│   ├── Volume/inspect settings
│   ├── Comparison slots
│   └── Rich DemoBurstWindowSelection (full burst metadata)
├── useDashboardDemoTimeslicingModeStore (persisted: 'dashboard-demo-timeslicing-mode-v1')
│   ├── generationInputs, pendingGeneratedBins
│   ├── applyGeneratedBins() → calls useSliceDomainStore.replaceSlicesFromBins()
│   ├── Rich burst metadata in merge/split (isNeutralPartition, warpWeight)
│   └── Manual draft + single-bin apply
└── useDashboardDemoTimeStore (not persisted)
    └── Pure duplicate of useTimeStore
```

---

## 7. Key Findings

### Duplicate State

1. **Time:** `useTimeStore` and `useDashboardDemoTimeStore` are identical — no synchronization mechanism. This was not addressed in Phase 76.

2. **Coordination:** Demo store has rich `DemoBurstWindowSelection[]` with full metadata; shared `useCoordinationStore` has simple `{start, end, metric}[]` — both represent the same logical burst windows but at different fidelity levels.

### Normalization Mismatches

1. **Bin metadata on split/merge:** Demo store copies full burst metadata (`isNeutralPartition`, `warpWeight`, all provenance fields); shared store only copies basic fields (count, crimeTypes, districts, avgTimestamp).

2. **Burst window shape:** Demo coordination store preserves full burst metadata on selected windows; shared store only keeps time range and metric.

### Stale/Wrapping Patterns

1. **`pendingGeneratedBins` in demo timeslicing:** No invalidation when time range or data changes; can be applied to stale domain.

2. **`applyGeneratedBins` bridge:** Demo timeslicing writes to shared `useSliceDomainStore` via direct state access — this is the only connection between demo and shared layers, but it's a one-way push with no feedback loop.

3. **`toggleBurstWindow` single-selection behavior:** Despite `selectedBurstWindows` being an array, `toggleBurstWindow` replaces the entire array when a window is toggled — effectively single selection with array storage.

### Which Stores Are Actually Consumed by Slice Tools

- **Direct slice manipulation:** `useSliceDomainStore` (shared) — used by both demo and non-demo components
- **Burst generation workflow:** `useDashboardDemoTimeslicingModeStore` (demo-specific)
- **Applying bins:** Demo timeslicing calls `useSliceDomainStore.getState().replaceSlicesFromBins()` — shared slice domain receives the applied slices regardless
- **Warp controls:** `useDashboardDemoCoordinationStore` (consolidated)
- **Time navigation:** `useDashboardDemoTimeStore` or `useTimeStore` — either, depending on component

### Recommendations

1. **Eliminate duplicate time store:** Demo time store is a pure duplicate — use shared `useTimeStore` directly.

2. **Unify burst metadata model:** Decide if coordination stores should hold rich burst window metadata or simple references — current dual model causes desync risk.

3. **Validate `pendingGeneratedBins` before apply:** Add domain/timestamp validation to prevent applying stale bins.

4. **Sync or remove `useDashboardDemoTimeStore`:** Either establish sync with `useTimeStore` or migrate consumers to use the shared store.

---

*Demo slice stores analysis: 2026-06-01*

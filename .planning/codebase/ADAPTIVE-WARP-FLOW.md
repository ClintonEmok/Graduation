# Adaptive Warp Data Flow

**Analysis Date:** 2026-06-09

## Overview

The adaptive warp system allows the time axis to compress/expand based on event density or slice-authored rules. Warp is a **display-only transform** on D3 time scales — it does not change what data is queried, only how it is plotted horizontally.

---

## 1. Warp Computation Pipeline

There are **four** computation paths:

### Path A: Density-based worker (preferred for real data)

| File | Role |
|------|------|
| `src/workers/adaptiveTime.worker.ts` | Web Worker. Receives `Float32Array` timestamps + domain, computes density/burstiness/warp maps in `computeAdaptiveMaps()`. Outputs `densityMap`, `burstinessMap`, `warpMap`, `countMap` (all `Float32Array`). |
| `src/store/useAdaptiveStore.ts` | Manages worker lifecycle. `computeMaps(timestamps, domain)` posts to worker. `setPrecomputedMaps(densityMap, burstinessMap, warpMap, domain)` bypasses worker. Also tracks `warpFactor`, `warpSource`, `warpControlMode`, `burstMetric`, etc. |

- Worker uses `binningMode: 'uniform-time' | 'uniform-events'` (default: `uniform-time`)
- Kernel smoothing: `ADAPTIVE_BIN_COUNT = 1024`, `ADAPTIVE_KERNEL_WIDTH = 3` (`src/lib/adaptive-utils.ts`)
- Warp map is built by weighting bins by `1 + normalizedDensity * 5`, then accumulating to produce warped positions
- **Note:** `useAdaptiveStore` is the canonical adaptive store but is **NOT used by the dashboard-demo** — the demo duplicates warp state in its coordination store instead.

### Path B: Inline density-based computation (used by DemoDualTimeline)

| File | Role |
|------|------|
| `src/components/timeline/DemoDualTimeline.tsx` (lines 62–109) | Contains a **local** `buildDensityWarpMap()` function that reimplements the worker's density→warp logic in the same way (weight = `1 + normalizedDensity * 5`, accumulate, map to domain span). |
| `src/components/timeline/hooks/useDensityStripDerivation.ts` | Provides `computeDensityMap()` — bins timestamps, smooths with kernel, normalizes to [0,1]. |

The flow inside `DemoDualTimeline.tsx`:

```
raw timestamps → computeDensityMap() → nextDensityMap
                                          ↓
nextDensityMap → buildDensityWarpMap() → nextDensityWarpMap
                                          ↓
useEffect → coordinationStore.setPrecomputedMaps(densityMap, warpMap, domain)
```

### Path C: Slice-authored warp map

| File | Role |
|------|------|
| `src/components/dashboard-demo/lib/demo-warp-map.ts` | Provides `buildDemoSliceAuthoredWarpMap()`. Takes `TimeSlice[]` with `warpEnabled`/`warpWeight` flags. Uses `scoreComparableWarpBins()` + `buildComparableWarpMap()` from `warp-scaling.ts`. |
| `src/lib/binning/warp-scaling.ts` | Provides `scoreComparableWarpBins()` (peer-relative scoring) and `buildComparableWarpMap()` (weight→width-share→boundaries interpolation). |

Flow inside `DemoDualTimeline.tsx`:

```
slices (from useSliceDomainStore) → buildDemoSliceAuthoredWarpMap() → authoredWarpMap
```

### Path D: Comparable warp map system (available but not in dashboard-demo flow)

| File | Role |
|------|------|
| `src/lib/binning/warp-scaling.ts` | `ComparableWarpBinInput[]` → `scoreComparableWarpBins()` → `buildComparableWarpMap()` → boundaries + weights. Used by the slice-authored path above. |

---

## 2. Where Warp State Lives

### Primary: `useDashboardDemoCoordinationStore` (`src/store/useDashboardDemoCoordinationStore.ts`)

This is the **single source of truth** for dashboard-demo warp state:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `timeScaleMode` | `'linear' \| 'adaptive'` | `'linear'` | Master enable/disable |
| `warpSource` | `'density' \| 'slice-authored'` | `'density'` | Which warp map to use |
| `warpFactor` | `number` (0–3) | `0` | Blend: 0 = linear, 1 = full adaptive, 2-3 = exaggerated |
| `densityMap` | `Float32Array \| null` | `null` | Normalized [0,1] density per bin |
| `warpMap` | `Float32Array \| null` | `null` | Warped time positions per bin |
| `mapDomain` | `[number, number]` | `[0, 100]` | Domain the maps cover |
| `isComputing` | `boolean` | `false` | Whether warp is being computed |

| Action | Description |
|--------|-------------|
| `setTimeScaleMode(mode)` | Toggle linear/adaptive |
| `setWarpSource(source)` | Switch density vs slice-authored |
| `setWarpFactor(value)` | Set 0–3 blend factor |
| `setPrecomputedMaps(density, warp, domain)` | Store computed maps |
| `setIsComputing(bool)` | Flag for loading state |
| `resetWarp()` | Reset to defaults |

### Secondary: `useDashboardDemoTimeStore` (`src/store/useDashboardDemoTimeStore.ts`)

Has its own `timeScaleMode: 'linear' | 'adaptive'` field but this is **not consumed** by any component. It appears to be a parallel, unused declaration — the actual warp mode comes from the coordination store.

### Legacy: `useAdaptiveStore` (`src/store/useAdaptiveStore.ts`)

Maintains its own separate worker + state (warpFactor, warpSource, densityMap, warpMap). **Not consumed** by any dashboard-demo component. Appears to be the original adaptive store predating the demo.

---

## 3. How the Consumer Chain Works

### Trigger chain

Warp computations are **not explicitly triggered by a single action**. They happen as **reactive side-effects** inside `DemoDualTimeline.tsx`:

1. When `timestampSeconds` or `warpDomain` changes → `nextDensityMap` is computed via `computeDensityMap()` (useMemo)
2. When `nextDensityMap` changes → `nextDensityWarpMap` is computed via `buildDensityWarpMap()` (useMemo)
3. When either map changes → `setPrecomputedMaps()` is called (useEffect stores back to coordination store)
4. When `slices` change → `authoredWarpMap` is computed via `buildDemoSliceAuthoredWarpMap()` (useMemo)
5. The effective warp map is chosen: `warpSource === 'density' ? precomputedWarpMap : authoredWarpMap`
6. When `warpSource === 'slice-authored'` and visible warp-enabled slices exist → `effectiveTimeScaleMode` is forced to `'adaptive'` and `effectiveWarpFactor` is forced to at least `1`

### Scale transform

`useScaleTransforms` (`src/components/timeline/hooks/useScaleTransforms.ts`):

```
applyAdaptiveWarping(linearScale, timeScaleMode, warpFactor, warpMap, innerWidth, warpDomain)
  → if not adaptive or no warpMap → return linearScale unchanged
  → otherwise → create adaptive d3 scale with custom mapping function
    → toDisplaySeconds(linearSec, warpFactor, warpMap, warpDomain)
      → sampleWarpSeconds() interpolates from warpMap
      → blend: linearSec * (1-warpFactor) + warpedSec * warpFactor
    → invert uses binary search (24 iterations) on toDisplaySeconds
```

The resulting adaptive scale is used for:
- Histogram bar positions (`overviewScale`)
- Tick positions (`overviewScale`, `detailScale`)
- Point marker positions (`detailScale`)
- Slice geometry positions (`detailInteractionScale` for raw, `detailScale` for display)
- Selection/cursor X positions

### Dual timeline view model

`useDualTimelineViewModel` (`src/components/timeline/hooks/useDualTimelineViewModel.ts`) wraps `useScaleTransforms` and generates ticks using the adaptive scales.

---

## 4. Per-View Analysis

### Timeline (`DemoDualTimeline` + `DualTimelineSurface`)

| Aspect | Status |
|--------|--------|
| **Uses adaptive warp?** | ✅ **Yes** — primary consumer |
| **Renders density strip?** | ✅ Yes — `DensityHeatStrip` uses `densityMap` from coordination store |
| **Renders warp axis?** | ✅ Yes — overview SVG shows amber gradient (`#adaptiveAxisGradient`) when `timeScaleMode === 'adaptive'` |
| **Renders warp overlay bands?** | ✅ Yes — `userWarpOverlayBands` from slices render as violet rectangles on overview (solid if warpEnabled, dashed with cyan if debug preview) |
| **Linear/adaptive toggle?** | ✅ Yes — `timeScaleMode`, `warpFactor`, `warpSource` all drive scale transforms |
| **Slice geometries on timeline?** | ✅ Yes — `detailInteractionScale` (unwarped) vs `detailScale` (warped) both tracked for raw vs display geometry |

### 3D View (`Demo3dSpatialView` / `Stkde3DScene` / `StkdeSliceStack`)

| Aspect | Status |
|--------|--------|
| **Uses adaptive warp?** | ❌ **No** — zero references to warp maps, warp factor, or adaptive mode |
| **How are slices positioned?** | Fixed Y-spacing via `SLICE_SPACING = 7.25`, `START_Y = -32.625`. Time ordering is applied but no time scaling. |
| **How is time axis rendered?** | No time axis. Slices are labeled with burst score + crime count. |
| **Gap for adaptive:** | Slice Y positions could be warped based on warp map density. 3D cube columns could have variable width based on adaptive time scaling. Currently no warp-aware rendering exists. |

### Map View (`DemoMapVisualization` → `MapVisualization`)

| Aspect | Status |
|--------|--------|
| **Uses adaptive warp?** | ❌ **No** — zero references to warp maps, adaptive, or timeScaleMode |
| **What filters time?** | Uses `sliceTimeRange` from `DemoMapVisualization` (derived from active slice epoch range) to filter crime data via `data.filter()` |
| **Gap for adaptive:** | Map could show a temporal heatmap/overlay that reflects adaptive density. Currently no warp-aware rendering. |

### Slices Tab (`DemoSlicePanel`)

| Aspect | Status |
|--------|--------|
| **Uses adaptive warp?** | ✅ Yes — **controls the warp** |
| **Linear/adaptive toggle?** | ✅ Yes — two buttons for `setTimeScaleMode('linear'/'adaptive')` |
| **Warp factor slider?** | ✅ Yes — `Slider` 0–3, step 0.05, calls `setWarpFactor()` |
| **Warp state display?** | ✅ Yes — badge shows `"{warpMode} · {warpFactor}x"` |
| **Auto-toggle on slice creation?** | ✅ Yes — `useEffect` watches `visibleWarpSliceCount`; when > 0, forces `adaptive` mode + warpFactor ≥ 1 |
| **Per-slice warp display?** | ✅ Yes — applied slices show `"Warp {weight}x"` or `"Warp disabled"` badge |
| **Warp source selection?** | ❌ No — no UI for switching between `'density'` and `'slice-authored'` warp sources |

### Inspect Tab (`DemoInspectPanel`)

| Aspect | Status |
|--------|--------|
| **Uses adaptive warp?** | ❌ No — handles slice playback, opacity, trails, interpolation. No warp integration. |
| **Gap for adaptive:** | Could show warp factor or allow toggling adaptive mode during playback. |

### Configure Tab (`DemoConfigurePanel`)

| Aspect | Status |
|--------|--------|
| **Uses adaptive warp?** | ❌ Unknown — not checked in detail |
| **Gap for adaptive:** | Could expose advanced warp settings (warp source selection, peer-relative weighting). |

---

## 5. Filter/Time Selection Relationship

| Store | Field | Relationship to Warp |
|-------|-------|---------------------|
| `useDashboardDemoFilterStore` | `selectedTimeRange: [number, number] \| null` | Determines `detailRangeSec` on the timeline. Warp does NOT change this — it transforms the visual scale within this range. |
| `useDashboardDemoTimeStore` | `currentTime`, `timeRange` | Playback position and range. Warp doesn't affect playback — it's purely visual. |
| `useDashboardDemoCoordinationStore` | `brushRange: [number, number] \| null` | Represents brushed selection. Warp doesn't change this. |

**Key insight:** Warp is purely a visual scaling transform. It does not:
- Change query parameters (data remains unfiltered by warp)
- Change selection/brush ranges
- Change filter store state
- Affect which data is loaded from DuckDB

---

## 6. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         COMPUTATION                              │
│                                                                   │
│  raw timestamps (Float32Array)                                    │
│         │                                                         │
│         ├──→ computeDensityMap()  ──→ densityMap (Float32Array)   │
│         │         │                   │                           │
│         │         │                   └──→ buildDensityWarpMap()  │
│         │         │                        → warpMap (Float32)   │
│         │         │                                              │
│         │         └──→ coordinationStore.setPrecomputedMaps()    │
│         │                                                        │
│         └──→ adaptiveTime.worker.ts (web worker)                 │
│              → computeAdaptiveMaps()                              │
│              → densityMap, burstinessMap, warpMap, countMap       │
│              → useAdaptiveStore.setPrecomputedMaps()              │
│                                                                   │
│  slices (TimeSlice[])                                             │
│         │                                                         │
│         └──→ buildDemoSliceAuthoredWarpMap()                      │
│              → scoreComparableWarpBins()                          │
│              → buildComparableWarpMap()                           │
│              → authoredWarpMap (Float32Array)                     │
│                                                                   │
│  effectiveWarpMap = density ? precomputedWarpMap : authoredWarpMap │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      D3 SCALE TRANSFORM                          │
│                                                                   │
│  useScaleTransforms()                                             │
│                                                                   │
│  linearScale (d3.scaleUtc)                                        │
│      │                                                            │
│      └──→ applyAdaptiveWarping(linearScale,                       │
│      │       timeScaleMode, warpFactor,                           │
│      │       warpMap, innerWidth, warpDomain)                     │
│      │       → toDisplaySeconds(linearSec)                        │
│      │           → sampleWarpSeconds() → interpolated warp map    │
│      │           → linear * (1 - factor) + warped * factor         │
│      │       → invert(x) via binary search                        │
│      │                                                            │
│      └──→ overviewScale (warped)                                  │
│      └──→ detailScale (warped)                                    │
│      └──→ overviewInteractionScale (linear, for brush/zoom)       │
│      └──→ detailInteractionScale (linear, for raw geometry)       │
└─────────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  TIMELINE VIEW  │ │   3D VIEW       │ │   MAP VIEW      │
│                 │ │                 │ │                 │
│ ✅ Density strip │ ❌ No warp       │ │ ❌ No warp      │
│ ✅ Warp axis    │   (fixed Y-spacing)│   (time filter   │
│ ✅ Warp overlays│                  │ │  via slice epoch)│
│ ✅ Adaptive scale│                 │ │                 │
│ ✅ Slice geometry│                 │ │                 │
│   (warped + raw) │                  │ │                 │
│                 │ │                 │ │                 │
└─────────────────┘ └─────────────────┘ └─────────────────┘
         │
         ▼
┌─────────────────┐
│  SLICES TAB     │
│                 │
│ ✅ Linear/Adapt │
│ ✅ Warp slider  │
│ ✅ Auto-toggle  │
│ ✅ Per-slice     │
│    warp weight   │
│ ❌ Source switch │
└─────────────────┘
```

---

## 7. Gaps Summary

| Gap | Impact | Priority |
|-----|--------|----------|
| **3D view ignores warp** | Slices are evenly spaced in Y even if time is highly non-uniform. Cube columns have uniform width. No visual indication of density-based time scaling. | High |
| **Map view ignores warp** | Crime points on map are filtered by slice time range but the heatmap/temporal overlay doesn't reflect adaptive density. No warp-aware rendering. | Medium |
| **No warp source selector UI** | `warpSource` can be `'density'` or `'slice-authored'` but there's no UI to switch between them. Currently only toggled programmatically. | Medium |
| **Duplicate warp state** | `useAdaptiveStore` (legacy) and `useDashboardDemoCoordinationStore` (active) both hold warp state. The legacy store has its own worker but is not consumed. | Low |
| **Duplicate timeScaleMode** | `useDashboardDemoTimeStore` has its own `timeScaleMode` that is never read by any component. | Low |
| **No warp map in web worker for demo** | The demo computes density/warp maps inline in the component instead of using the web worker. This could block the main thread with 8.5M+ records. | Medium |
| **Warp invert uses brute-force binary search** | `toLinearSeconds()` in `useScaleTransforms.ts` uses 24 iterations of binary search. This runs on every pointer move during brush/zoom. | Low |
| **DemoSlicePanel auto-toggle logic** | When visible warp slices exist, the effect forces `adaptive` mode and `warpFactor >= 1`. But `resetWarp()` is called when slices go to 0, which also resets `warpSource` to `'density'`. This may cause unexpected mode switches. | Low |

---

## 8. Key File Index

| File | Purpose |
|------|---------|
| `src/store/useDashboardDemoCoordinationStore.ts` | Master warp state for dashboard-demo |
| `src/store/useDashboardDemoTimeStore.ts` | Time playback state (+ orphan `timeScaleMode`) |
| `src/store/useDashboardDemoFilterStore.ts` | Filter state (time range, types, districts) |
| `src/store/useAdaptiveStore.ts` | Legacy adaptive store with worker management |
| `src/workers/adaptiveTime.worker.ts` | Web Worker: core `computeAdaptiveMaps()` |
| `src/lib/adaptive-utils.ts` | Constants `ADAPTIVE_BIN_COUNT`, `ADAPTIVE_KERNEL_WIDTH` |
| `src/lib/binning/warp-scaling.ts` | Comparable warp: `scoreComparableWarpBins()`, `buildComparableWarpMap()` |
| `src/components/dashboard-demo/lib/demo-warp-map.ts` | `buildDemoSliceAuthoredWarpMap()` |
| `src/components/timeline/DemoDualTimeline.tsx` | Primary warp consumer + density/warp map computation |
| `src/components/timeline/hooks/useScaleTransforms.ts` | `applyAdaptiveWarping()`, `toDisplaySeconds()`, `toLinearSeconds()` |
| `src/components/timeline/hooks/useDualTimelineViewModel.ts` | Wraps `useScaleTransforms` for tick generation |
| `src/components/timeline/hooks/useDensityStripDerivation.ts` | `computeDensityMap()`, `deriveDetailDensityMap()` |
| `src/components/timeline/DensityHeatStrip.tsx` | Canvas-based density strip renderer |
| `src/components/timeline/DualTimelineSurface.tsx` | SVG timeline rendering (histograms, axis, slices) |
| `src/components/dashboard-demo/DemoSlicePanel.tsx` | Warp controls: toggle, slider, per-slice warp display |
| `src/components/dashboard-demo/Demo3dSpatialView.tsx` | 3D view (no warp — gap) |
| `src/components/dashboard-demo/DemoMapVisualization.tsx` | Map view (no warp — gap) |
| `src/components/map/MapVisualization.tsx` | Base map (no warp — gap) |
| `src/app/stkde-3d/page.tsx` | STKDE 3D page (no warp — gap) |
| `src/app/stkde-3d/components/Stkde3DScene.tsx` | 3D scene container (no warp) |
| `src/app/stkde-3d/components/StkdeSliceStack.tsx` | Slice stack renderer (no warp — fixed Y spacing) |
| `src/components/dashboard-demo/DashboardDemoShell.tsx` | Top-level layout, viewport toggle, generate trigger |
| `src/components/dashboard-demo/DashboardDemoRailTabs.tsx` | Rail tabs: Overview, Detect, Slices, Inspect, Configure |

# Timeline Component Research

**Research Date:** 2025-07-03
**Scope:** Dashboard timeline visualization, data flow, interactions, and adaptive time scaling

---

## 1. Visualization Type

The timeline uses a **dual-panel layout** with two distinct visualization layers:

### Overview Panel (top)
- **Type:** SVG bar histogram (50 bins)
- **File:** `src/components/timeline/DualTimelineSurface.tsx` (lines 248-256)
- **Render:** `<rect>` elements for each bin, height proportional to `(bucket.length / overviewMax) * OVERVIEW_HEIGHT`
- **Height:** 42px (`OVERVIEW_HEIGHT`)
- **Purpose:** Shows sampled full-dataset distribution across entire time range
- **Brush:** D3 brushX for selecting a sub-range (`src/components/timeline/hooks/useBrushZoomSync.ts`)

### Detail Panel (bottom)
- **Type:** Adaptive — either **points** or **bins** depending on time span
- **File:** `src/components/timeline/DualTimelineSurface.tsx` (lines 305-359)
- **Render mode:** Controlled by `resolvedDetailRenderMode`:
  - `'points'` — individual `<circle>` elements for each crime timestamp (used when span ≤ 60 days)
  - `'bins'` — histogram bars (used when span > 60 days)
- **Height:** 60px (`DETAIL_HEIGHT`)
- **Purpose:** Shows full-resolution data within the brushed time window

### Density Heat Strips
- **Type:** Canvas-based heatmap strips
- **Files:** `src/components/timeline/DensityHeatStrip.tsx`, `src/components/timeline/DensityTrack.tsx`
- **Render:** 1px tall image data stretched to fill strip height
- **Colors:** Gradient from blue (low density) → cyan → yellow → red (high density)
- **Purpose:** Visual indicator of crime density across time — shows where adaptive warping expands/compresses

### Slice Overlays
- **Type:** Semi-transparent colored rectangles overlaid on the detail panel
- **File:** `src/components/timeline/DualTimelineSurface.tsx` (lines 361-426)
- **Render:** `<rect>` with fill/stroke based on slice type (burst, suggestion, generated, active)
- **Purpose:** Show time slices (manual or auto-generated) as visual regions on the timeline

---

## 2. Data Displayed

### Primary Data: Crime Timestamps Over Time

The timeline displays **crime event counts over time**. Each data point represents a crime incident timestamp.

**Data source chain:**
1. `useTimelineDataStore` (`src/store/useTimelineDataStore.ts`) — loads data from API or DuckDB
2. `useViewportCrimeData` (`src/hooks/useViewportCrimeData.ts`) — viewport-scoped query with 30-day buffer
3. API endpoints: `/api/crime/overview`, `/api/crime/meta`, `/api/crime/stream`

**Data formats:**
- `overviewTimestampSec: number[]` — sampled timestamps for overview panel (max ~5000 points)
- `columns.timestampSec: Float64Array` — full dataset timestamps in epoch seconds
- `columns.timestamp: Float32Array` — normalized 0-100 values
- `detailPoints: number[]` — filtered timestamps within the brushed detail range

### Secondary Data: Adaptive Density Maps
- `densityMap: Float32Array` — computed by Web Worker (`src/workers/adaptiveTime.worker.ts`)
- Used for: density heat strip visualization, warp map generation
- Computed via: `src/components/timeline/hooks/useDensityStripDerivation.ts`

### Slice Data
- From `useSliceDomainStore` — time slices (point or range selections)
- From `useTimeslicingModeStore` — pending generated bins (auto-partitioned time periods)
- Burst windows from `useBurstWindows()` — detected bursty intervals

---

## 3. Interaction Patterns with Other Components

### Map ↔ Timeline Sync

**Timeline → Map:**
1. User brushes a time range on the overview timeline
2. `useBrushZoomSync` hook captures the brush selection
3. Calls `applyRangeToStoresContract()` which updates:
   - `useFilterStore.setTimeRange([startSec, endSec])` — epoch seconds range
   - `useTimeStore.setRange([normalizedStart, normalizedEnd])` — 0-100 normalized
   - `useCoordinationStore.setBrushRange([normalizedStart, normalizedEnd])` — coordination state
4. `useViewportCrimeData` hook re-queries with new viewport bounds (30-day buffer)
5. Map re-renders with filtered data

**Map → Timeline:**
- Map selection events call `useCoordinationStore.setSelectedIndex(index, 'map')`
- Timeline renders a selection indicator at the corresponding x position

### Cube ↔ Timeline Sync

**Timeline → Cube:**
1. User clicks on detail panel → `usePointSelection` hook fires
2. `setSelectedIndex(index, 'timeline')` updates coordination store
3. `setTime(normalized)` updates the time cursor position
4. Cube component reads `useTimeStore.currentTime` and highlights the corresponding slice

**Cube → Timeline:**
- Cube selection calls `useCoordinationStore.setSelectedIndex(index, 'cube')`
- Timeline renders a `selectionX` cursor indicator (animated dashed line)

### Adaptive Time Scaling → Timeline

1. `useAdaptiveStore.computeMaps()` sends timestamps to Web Worker
2. Worker computes `densityMap`, `burstinessMap`, `warpMap`
3. When `timeScaleMode === 'adaptive'`:
   - `useScaleTransforms` applies warp function to d3 scales
   - `sampleWarpSeconds()` maps linear time to warped display time
   - High-density regions get more pixel space (expanded)
   - Low-density regions get less pixel space (compressed)
4. Density heat strip shows the compression/expansion visually

### Selection Coordination Flow

```
User interaction (brush/click)
  → useBrushZoomSync / usePointSelection
    → applyRangeToStoresContract()
      → useFilterStore.setTimeRange()     [epoch seconds]
      → useTimeStore.setRange()           [normalized 0-100]
      → useCoordinationStore.setBrushRange()
        → useViewportCrimeData re-queries
          → Map/Cube/Timeline re-render
```

---

## 4. File Inventory

### Core Components
| File | Purpose | Lines |
|------|---------|-------|
| `src/components/timeline/DualTimeline.tsx` | Main timeline orchestrator — manages all state, scales, interactions | 725 |
| `src/components/timeline/DualTimelineSurface.tsx` | Pure rendering surface — SVG/Canvas output | 445 |
| `src/components/timeline/TimelinePanel.tsx` | Wrapper with playback controls, resolution slider, scale mode toggle | 224 |
| `src/components/timeline/Timeline.tsx` | Legacy single-panel timeline (histogram + markers) | 189 |
| `src/components/timeline/TimelineContainer.tsx` | Fixed-position container with adaptive controls | 24 |

### Visualization Layers
| File | Purpose |
|------|---------|
| `src/components/timeline/layers/HistogramLayer.tsx` | SVG bar chart using `@visx/shape` |
| `src/components/timeline/layers/MarkerLayer.tsx` | Individual point markers |
| `src/components/timeline/layers/AxisLayer.tsx` | X-axis with time labels using `@visx/axis` |
| `src/components/timeline/DensityHeatStrip.tsx` | Canvas-based density heatmap strip |
| `src/components/timeline/DensityTrack.tsx` | Canvas-based density visualization (legacy) |
| `src/components/timeline/TimelineBrush.tsx` | `@visx/brush` wrapper for range selection |

### Hooks
| File | Purpose |
|------|---------|
| `src/components/timeline/hooks/useDualTimelineViewModel.ts` | Computes scales, ticks, tick formats for both panels |
| `src/components/timeline/hooks/useScaleTransforms.ts` | Applies adaptive warping to d3 scales |
| `src/components/timeline/hooks/useBrushZoomSync.ts` | D3 brush + zoom bidirectional sync |
| `src/components/timeline/hooks/usePointSelection.ts` | Click/hover selection on detail panel |
| `src/components/timeline/hooks/useDensityStripDerivation.ts` | Computes detail density map from points |

### Library Utilities
| File | Purpose |
|------|---------|
| `src/components/timeline/lib/interaction-guards.ts` | Clamp, normalize, coordinate transforms |
| `src/components/timeline/lib/tick-ux.ts` | Tick label strategy logic |
| `src/components/timeline/lib/burst-score-series.ts` | Burst scoring for timeline series |

### Stores
| File | Purpose |
|------|---------|
| `src/store/useTimelineDataStore.ts` | Timeline data state — loads from API/DuckDB |
| `src/store/useTimeStore.ts` | Current time, playback, resolution, scale mode |
| `src/store/useFilterStore.ts` | Time range filter (epoch seconds) |
| `src/store/useCoordinationStore.ts` | Cross-component selection sync |
| `src/store/useAdaptiveStore.ts` | Adaptive warping — density maps, warp factor |
| `src/store/useSliceDomainStore.ts` | Time slices (point/range selections) |
| `src/store/useTimeslicingModeStore.ts` | Auto-generated time partitions |

### Demo/Test Variants
| File | Purpose |
|------|---------|
| `src/components/timeline/DemoDualTimeline.tsx` | Dashboard demo variant with demo-specific stores |
| `src/components/timeline/DemoTimelinePanel.phase13.test.ts` | Phase 13 test |
| `src/components/timeline/DemoDualTimeline.refactor.test.ts` | Refactor test |

---

## 5. Dashboard Layout

### Overall Layout (`src/app/dashboard/page.tsx`)
```
┌─────────────────────────────────────────────────────┐
│                   DashboardHeader                    │
├────────────────────────┬────────────────────────────┤
│                        │                            │
│    MapVisualization    │   CubeVisualization        │
│    (left panel)        │   (top-right panel)        │
│                        │                            │
├────────────────────────┴────────────────────────────┤
│                                                     │
│                   TimelinePanel                     │
│                   (bottom panel)                    │
│                                                     │
├─────────────────────────────────────────────────────┤
│  StudyControls  │  ContextualSlicePanel             │
└─────────────────────────────────────────────────────┘
```

### Layout Implementation (`src/components/layout/DashboardLayout.tsx`)
- Uses `react-resizable-panels` for drag-to-resize
- Outer group: vertical split (top area / bottom timeline)
- Inner group: horizontal split (map left / cube right)
- Layout ratios persisted via `useLayoutStore`
- Default: top=70%, bottom=30%

### Timeline Panel Internal Structure
```
┌─────────────────────────────────────────────────────┐
│  Phase 1 temporal control                           │
│  ┌─────────────────────────────────────────────┐    │
│  │ Active window: Jan 1, 2001 → Dec 31, 2002  │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ⏪ ▶ ⏩  Current Time: 2001-06-15  Scale: [Linear]│
│           Speed: [1.0x ▾]                           │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │ Density heat strip (gradient)               │    │
│  │ Overview histogram (50 bins)                │    │
│  │ ████████████████████████████████████████████│    │
│  │ Jan 2001    Jul 2001    Jan 2002    Jul 2002│    │
│  ├─────────────────────────────────────────────┤    │
│  │ Detail density strip                        │    │
│  │ Detail points/bins (adaptive render)        │    │
│  │ ●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●│    │
│  │ [slice overlays] [cursor] [selection]       │    │
│  │ Jun 15    Jun 16    Jun 17    Jun 18        │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  Temporal Resolution: [——●—————————] days           │
└─────────────────────────────────────────────────────┘
```

---

## 6. Adaptive Time Scaling Logic

### Architecture
- **Worker:** `src/workers/adaptiveTime.worker.ts` — computes density/burstiness/warp maps off main thread
- **Store:** `src/store/useAdaptiveStore.ts` — holds warp factor (0=linear, 1=fully adaptive), warp map, density map
- **Scale transforms:** `src/components/timeline/hooks/useScaleTransforms.ts` — applies warp to d3 scales

### How Adaptive Warping Works

1. **Density Computation:**
   - Worker bins timestamps into `ADAPTIVE_BIN_COUNT` bins
   - Applies kernel smoothing (`ADAPTIVE_KERNEL_WIDTH`)
   - Produces normalized `densityMap: Float32Array` (0-1)

2. **Warp Map Generation:**
   - `buildDensityWarpMap()` in `DemoDualTimeline.tsx` (lines 53-100)
   - High density → higher weight → more pixel space
   - `warpMap[i]` = display position for linear bin `i`

3. **Scale Application:**
   ```typescript
   // src/components/timeline/hooks/useScaleTransforms.ts
   const toDisplaySeconds = (linearSec, warpFactor, warpMap, warpDomain) => {
     const warpedSec = sampleWarpSeconds(linearSec, warpMap, warpDomain);
     return linearSec * (1 - warpFactor) + warpedSec * warpFactor;
   };
   ```
   - `warpFactor = 0`: pure linear scale
   - `warpFactor = 1`: fully density-warped scale
   - Intermediate values: blended

4. **UI Controls:**
   - `AdaptiveControls.tsx` — warp factor slider (0-100%), density scope selector, burst metric selector
   - `TimelinePanel.tsx` — linear/adaptive toggle button
   - Burst threshold percentile slider

5. **Burst Detection:**
   - `useBurstWindows()` detects bursty intervals
   - `classifyBurstWindow()` in `src/lib/binning/burst-taxonomy.ts` categorizes as:
     - `prolonged-peak` — sustained high activity
     - `isolated-spike` — brief burst
     - `valley` — low activity period
     - `neutral` — normal activity
   - Auto-creates burst slices via `useAutoBurstSlices()`

---

## 7. Key State Flow Summary

```
User brushes timeline
  │
  ▼
useBrushZoomSync → applyRangeToStoresContract()
  │
  ├─► useFilterStore.setTimeRange([startSec, endSec])
  │     └─► useViewportCrimeData re-fetches
  │           └─► Map, Cube, Timeline re-render with filtered data
  │
  ├─► useTimeStore.setRange([normStart, normEnd])
  │     └─► Normalized 0-100 range for 3D cube positioning
  │
  └─► useCoordinationStore.setBrushRange()
        └─► Cross-component coordination state

User clicks detail panel
  │
  ▼
usePointSelection → handlePointerUpWithSelection()
  │
  ├─► findNearestIndexByTime(epochSeconds)
  │     └─► Returns nearest crime record index
  │
  ├─► useCoordinationStore.setSelectedIndex(index, 'timeline')
  │     └─► Map highlights, Cube highlights
  │
  └─► useTimeStore.setTime(normalized)
        └─► Time cursor moves, playback position updates
```

---

## 8. Notable Implementation Details

1. **Dual render modes:** The detail panel automatically switches between points (≤60 days) and bins (>60 days) to maintain performance.

2. **Viewport-based loading:** `useViewportCrimeData` only fetches data for the visible time range + 30-day buffer, not the entire dataset.

3. **Brush-zoom bidirectional sync:** D3 brush and zoom behaviors are kept in sync via `useBrushZoomSync` with a guard (`isSyncingRef`) to prevent infinite loops.

4. **Canvas vs SVG:** Density strips use Canvas for performance (pixel-level rendering), while histogram/points use SVG for interactivity.

5. **Normalized time domain:** All time values are normalized to 0-100 range in `useTimeStore`, converted to epoch seconds via `normalizedToEpochSeconds()` from `src/lib/time-domain.ts`.

6. **Demo variant:** `DemoDualTimeline.tsx` uses separate demo stores (`useDashboardDemoCoordinationStore`, etc.) for isolated testing without affecting production state.

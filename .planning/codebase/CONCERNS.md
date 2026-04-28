# Timeline Refactor Runtime Analysis

**Analysis Date:** 2026-04-23
**Files Analyzed:**
- `src/components/timeline/DualTimeline.tsx`
- `src/components/timeline/DemoDualTimeline.tsx`
- `src/components/timeline/DualTimelineSurface.tsx`
- `src/components/timeline/DensityHeatStrip.tsx`
- `src/components/timeline/hooks/useDualTimelineViewModel.ts`
- `src/components/timeline/hooks/useScaleTransforms.ts`
- `src/components/timeline/hooks/useBrushZoomSync.ts`
- `src/components/timeline/hooks/useDensityStripDerivation.ts`
- `src/components/timeline/hooks/usePointSelection.ts`
- `src/components/timeline/lib/interaction-guards.ts`
- `src/components/timeline/lib/tick-ux.ts`

---

## 1. Current Runtime Data Path

### DualTimeline.tsx

```
useTimelineDataStore
  ├── columns (Arrow columnar format) → normalizedToEpochSeconds() → timestampSeconds
  └── data (row CrimeRecord[])      → timestamp fallback

useViewportCrimeData → viewportCrimes (CrimeRecord[])  [via useCrimeData]
  └── CrimeRecord.timestamp

timestampSeconds ─────────────────┬─→ overviewBins (d3 bin, 50 thresholds)
                                   └─→ detailPoints (filtered by detailRangeSec, max 4000)
                                        └── detailBins (d3 bin, detailBinCount=60)

useScaleTransforms ─────────────────┬─→ overviewScale (adaptive warping applied)
                                   └─→ detailScale (adaptive warping applied)

useDualTimelineViewModel ──────────┬─→ overviewTicks / detailTicks
                                   └─→ overviewTickFormat / detailTickFormat

detailPoints ──→ useDensityStripDerivation ──→ detailDensityMap
                                                     └── detailSpanDays (decides render mode)

useBurstWindows ─────────────────→ burstWindows ──→ useAutoBurstSlices(burstWindows)
                                                     └── burstTaxonomySummary

surfaceProps ──→ DualTimelineSurface → SVG + canvas render
```

### DemoDualTimeline.tsx

```
useTimelineDataStore (same store)
  ├── columns → timestampSeconds
  └── data fallback

timestampSeconds ──→ computeDensityMap() → nextDensityWarpMap
        │
        └──→ nextDensityMap → setPrecomputedMaps() [useEffect, store update]
                                 │
                                 └──→ store: useDashboardDemoWarpStore.densityMap

timestampSeconds ─────────────────┬─→ overviewBins
                                   └─→ detailPoints (uses store densityMap, NOT local)
                                        └── detailBins

useScaleTransforms ─────────────────┬─→ overviewScale
                                   ├─→ detailScale
                                   └─→ detailInteractionScale [DEAD: not passed to surface]

useDensityStripDerivation (uses store densityMap)

surfaceProps ──→ DualTimelineSurface
```

**Key structural difference:** DualTimeline uses `useViewportCrimeData` for detail points (live viewport-filtered fetch), while DemoDualTimeline derives density locally then writes to store then reads back from store for detailPoints.

---

## 2. Likely Regressions Introduced by Refactor

### ISSUE A: Dead DensityHeatStrip import in DualTimeline.tsx

**File:** `src/components/timeline/DualTimeline.tsx` line 25
**Code:**
```typescript
import { DensityHeatStrip } from '@/components/timeline/DensityHeatStrip';
```
This import is dead — `DensityHeatStrip` is rendered inside `DualTimelineSurface`, not `DualTimeline`. The surface receives `densityMap` and constructs the strip internally (lines 76, 138 in `DualTimelineSurface.tsx`). If a refactor accidentally removes the internal usage or if the import is meant to be a breaking-change marker, this is at minimum a dead import.

### ISSUE B: `useAutoBurstSlices` called in DualTimeline but NOT in DemoDualTimeline

**DualTimeline.tsx line 527:**
```typescript
useAutoBurstSlices(burstWindowsForAutoSlices);
```

**DemoDualTimeline.tsx:** No equivalent call. Both call `useBurstWindows()` but only DualTimeline drives the auto-slice generation from it. This means:
- Dashboard demo (which uses `DemoDualTimeline`) never auto-generates burst slices
- The burst taxonomy summary counts in DemoDualTimeline will always be zero unless slices are manually authored
- If Phase 12 moved `useAutoBurstSlices` out of a shared helper or store initialization and into DualTimeline specifically, DemoDualTimeline loses that behavior

### ISSUE C: `detailInteractionScale` computed but never used in DemoDualTimeline

**DemoDualTimeline.tsx lines 399-409 and 754:**
```typescript
const { detailInteractionScale } = useScaleTransforms({...});
// ...
}, [activeSliceId, detailInnerWidth, detailInteractionScale, detailScale, ...]);
```
`detailInteractionScale` is returned from `useScaleTransforms` and included in the dependency array, but it's never referenced in `surfaceProps` (only `overviewScale` and `detailScale` are passed). This is either a cut-and-leave from the refactor or a missing feature where the raw (non-warp-distorted) detail scale should be passed to the surface for something.

### ISSUE D: DualTimeline imports unused constants also duplicated in Surface

**DualTimeline.tsx lines 42-49:**
```typescript
const OVERVIEW_HEIGHT = 42;
const DETAIL_HEIGHT = 60;
const AXIS_HEIGHT = 28;
const DENSITY_DOMAIN: [number, number] = [0, 1];
const DENSITY_COLOR_LOW: [number, number, number] = [59, 130, 246];
const DENSITY_COLOR_HIGH: [number, number, number] = [239, 68, 68];
const TIME_CURSOR_COLOR = '#10b981';
```
These are all duplicated in `DualTimelineSurface.tsx` (lines 10-13) and are never read from DualTimeline's scope — they're forwarded as part of props or hardcoded in the surface. They represent the old monolith pattern where DualTimeline owned the render. Post-refactor, they're inert.

### ISSUE E: `TimelineSliceGeometry` interface diverges between the two components

**DualTimeline.tsx lines 105-117** — 12 fields (no `rawLeft`, `rawWidth`, `warpEnabled`, `warpWeight`).
**DemoDualTimeline.tsx lines 157-173** — 15 fields (adds `rawLeft`, `rawWidth`, `warpEnabled`, `warpWeight`).

Both feed `orderedSliceGeometries` to `DualTimelineSurface`, which uses it as `geometry: any`. If geometries from DualTimeline are missing `rawLeft`/`rawWidth`, the surface will receive `undefined` for those fields. The surface does `geometry.left` and `geometry.width` (not the raw variants), so rendering isn't broken, but any future code expecting `rawLeft`/`rawWidth` on DualTimeline geometries will silently get `undefined`.

---

## 3. Empty or Inconsistent Output Causes

### CAUSE 1: Empty overviewBins on initial render (no data loaded yet)

**Path:** `minTimestampSec`/`maxTimestampSec` are `null` → `domainStart`/`domainEnd` fallback to `[0, 100]` → `overviewBins` d3 bin with domain `[0, 100]` on an empty `timestampSeconds` → returns `[]`.

This is not a crash — `DensityHeatStrip` handles empty `densityMap` gracefully (line 74-78 draws a low-opacity bar). The overview SVG bars render nothing. The detail shows "No data in this range" via `isDetailEmpty`.

**Risk level:** Low — this is handled, but the UX is a blank timeline until data loads.

### CAUSE 2: Race between density map computation and consumption in DemoDualTimeline

**Sequence:**
1. Render: `nextDensityMap` computed locally, `densityMap` (from store) is whatever was last there (likely empty)
2. `useEffect` fires: `setPrecomputedMaps(nextDensityMap, ...)` updates store
3. Re-render: store now has the density data, `detailPoints` recalculates

On a slow DuckDB query or initial load, DemoDualTimeline could render detail before the density map is in the store. DualTimeline avoids this by reading `viewportCrimes` directly for detail points (no store round-trip).

**Risk level:** Medium — causes brief "no data" flash in demo mode.

### CAUSE 3: `normalizedToEpochSeconds` called with null guard but fallback path also returns empty

**DualTimeline.tsx lines 274-286:**
```typescript
const timestampSeconds = useMemo<number[]>(() => {
  if (columns && columns.length > 0 && minTimestampSec !== null && maxTimestampSec !== null) {
    // ... compute from columns
  }
  if (data && data.length > 0) {
    return data.map((point) => point.timestamp as number);
  }
  return [];
}, [...]);
```
If both paths are empty, `timestampSeconds = []`. Downstream: `overviewBins` returns `[]`, `detailPoints` returns `[]`, `isDetailEmpty = true`. The "No data in this range" message appears.

This is correct behavior when there's genuinely no data, but if the intent is to show a loading state, the `isLoading` flag from `useViewportCrimeData` (`isViewportLoading`) should suppress the empty message. However, `isDetailEmpty` is set to `!isTimelineLoading && detailPoints.length === 0`, so it correctly waits for load to finish before showing the empty state.

### CAUSE 4: DualTimeline's `timestampSeconds` uses different property name than expected

**DualTimeline.tsx line 309:**
```typescript
const points = viewportCrimes
  .map(crime => crime.timestamp)  // Use 'timestamp' not 'date'
```
This comment indicates a potential property name mismatch. If `CrimeRecord` types have been updated so that the correct field is `date` instead of `timestamp`, this `.map(crime => crime.timestamp)` silently returns `undefined` for every record, resulting in an empty `detailPoints` array.

### CAUSE 5: `useViewportCrimeData` is deprecated and wraps `useCrimeData`

**`src/hooks/useViewportCrimeData.ts` lines 10-11:**
```typescript
* @deprecated Use useCrimeData directly for new code.
* This hook is kept for backward compatibility with existing consumers.
```
If `useCrimeData` has any behavioral differences from the old `useViewportCrimeData`, DualTimeline inherits those differences without anyone noticing. This should be audited.

---

## 4. Top 3 Issues to Inspect First on localhost:3000

### INSPECT 1: Dashboard demo — verify burst auto-generation works

**What to check:** Load the dashboard demo page (`/dashboard` or wherever `DemoDualTimeline` is used). Create a viewport/time range with bursty crime patterns. Look at whether any burst slices are auto-generated in the timeline.

**Expected:** Auto-generated purple burst slices appear in the detail view.
**Bug signal:** No burst slices appear despite dense crime clusters. The `useAutoBurstSlices` call is missing from DemoDualTimeline entirely.

**Files to verify:** `src/components/timeline/DemoDualTimeline.tsx` — confirm whether `useAutoBurstSlices` should be called after `useBurstWindows()`.

### INSPECT 2: DualTimeline — check detail panel for data vs "No data in this range"

**What to check:** Load the main dashboard or timeline page using `DualTimeline`. Open browser devtools, watch the network tab for the `/api/crime` (or viewport data fetch). Check whether:
1. `viewportCrimes` returns data
2. `detailPoints` is non-empty
3. The detail panel shows actual points/bars, not the empty state overlay

**Expected:** Points or bins render in the detail SVG.
**Bug signal:** The detail panel consistently shows "No data in this range" even for date ranges that should have crime data. Check:
- `src/components/timeline/DualTimeline.tsx` line 309: is `crime.timestamp` the correct property?
- `useViewportCrimeData` fetching correct epoch range
- `minTimestampSec`/`maxTimestampSec` populating in `useTimelineDataStore`

### INSPECT 3: Verify adaptive warping renders correctly when enabled

**What to check:** Toggle time scale mode to `'adaptive'` (via store/state). The overview density strip and detail strip should show compressed time for high-density regions and expanded time for low-density regions.

**Expected:** Warped rendering with non-linear tick spacing.
**Bug signal:** The scale looks linear despite warp being enabled. Check:
- `useScaleTransforms` (`src/components/timeline/hooks/useScaleTransforms.ts` line 71-119): does `applyAdaptiveWarping` return the adaptive scale?
- `warpMap` is non-null and length ≥ 2
- `warpFactor > 0`
- `useDualTimelineViewModel` receives correct `timeScaleMode` (`'adaptive'`)

Also verify that `DualTimelineSurface` correctly renders the adaptive axis gradient (line 113 checks `timeScaleMode === 'adaptive'`).

---

## Summary Table

| # | Severity | Location | Issue |
|---|----------|----------|-------|
| A | Low | `DualTimeline.tsx:25` | Dead `DensityHeatStrip` import |
| B | **High** | `DemoDualTimeline.tsx` missing | `useAutoBurstSlices` not called — burst auto-generation broken in demo |
| C | Low | `DemoDualTimeline.tsx:399` | `detailInteractionScale` computed but unused |
| D | Low | `DualTimeline.tsx:42-49` | 7 unused constants duplicated in surface |
| E | Medium | Both components | `TimelineSliceGeometry` interface divergence — raw fields missing in DualTimeline |
| 1 | Low | Data path init | Initial blank render until data loads |
| 2 | **Medium** | `DemoDualTimeline.tsx:331-334` | Density map store race — brief empty state |
| 3 | Low | Data path | Correct empty-state handling, but loading UX |
| 4 | **High** | `DualTimeline.tsx:309` | `crime.timestamp` vs `crime.date` — silent data loss |
| 5 | Medium | `useViewportCrimeData.ts:10` | Deprecated hook — behavioral drift risk |

**Priority fix order:** Issue 4 (timestamp field) → Issue B (auto burst slices in demo) → Issue 2 (store race in DemoDualTimeline) → then inspect adaptive warping.

# Project State

**Project:** Adaptive Space-Time Cube
**Core Value:** Users can visually compare uniform vs adaptive time mapping to understand how local density-based time scaling reveals patterns hidden in traditional Space-Time Cubes.
**Current Phase:** Phase 34: Performance Optimization
**Status:** Phase 33 complete (Data Integration); Phase 34 next
**Next:** Phase 34: Performance Optimization

## Current Position
Phase: **34 of 42** (Performance Optimization)
Plan: **9 of 9** in current phase
Status: **Complete**
Last activity: 2026-02-22 - Completed 34-09-PLAN.md (Gap closure - DataStore cleanup)

Progress: overall ████████████████░░░ 83% (123/143 plans) | v1.2 ██████░░░░░░░░░ 71% phases (5/7)

```
v1.0 Complete:
[x] Phase 1-25: All thesis prototype phases

v1.1 Complete:
[x] Phase 26: Timeline Density Visualization (5/5 plans complete)
[x] Phase 27: Manual Slice Creation (6/6 plans complete)
[x] Phase 28: Slice Boundary Adjustment (4/4 plans complete)
[x] Phase 29: Remake burstlist as first-class slices (7/7 plans complete)
[x] Phase 30: Timeline Adaptive Time Scaling (3/3 plans complete)
[x] Phase 31: Multi-Slice Management (3/3 plans complete)
[x] Phase 32: Slice Metadata & UI (3/3 plans complete)
[x] Phase 33: Data Integration (5/5 plans complete)

v1.2 In Progress:
[ ] Phase 34: Performance Optimization (9/9 plans complete)

v1.2 Planned:
[ ] Phase 35-37: Semi-Automated Timeslicing

v1.3 Planned:
[ ] Phase 38-42: Fully Automated Timeslicing
```

## Performance Metrics
| Metric | v1.0 | v1.1 |
|--------|------|------|
| Requirement Coverage | 25/26 core (96%) | 22/22 (100%) |
| Phase Completion | 25/25 | 7/7 |
| Milestone Status | ✅ Shipped | ✅ Shipped |

## Project Reference
See: `.planning/PROJECT.md` (updated 2026-02-16)

**Core value:** Timeline as active analysis engine
**Current focus:** Phase 33 complete; Phase 34 Performance Optimization ready to plan
**Guiding principle:** "Timeline is the engine" - timeline-only for v1.1

## Context & Decisions
**v1.1 Scope Defined:**
- Manual timeslicing strictly on timeline
- Visual density regions
- Click/drag slice creation
- Boundary adjustment handles
- Multi-slice support
- Metadata (name, color, notes)
- NO 2D/3D sync (v1.2+)

**Technical Foundation:**
- Visx/D3 timeline established (Phase 21)
- Density data available (Phase 25 adaptive store)
- Zustand patterns proven
- Ready for timeline enhancements

**Three-Milestone Roadmap:**
1. v1.1: Manual (user creates/adjusts everything)
2. v1.2: Semi-automated (AI suggests, user confirms)
3. v1.3: Fully automated (system creates, user reviews)

**Phase 26 Decision Log (Execution):**
- Added `@visx/gradient` and standardized area chart rendering on Visx primitives.
- Established `/timeline-test` as isolated density visualization harness with adaptive-store fallback to mock `Float32Array` data.
- Integrated `DensityHeatStrip` as a 12px Canvas density context track above DualTimeline overview/detail views.
- Standardized blue→red density interpolation with devicePixelRatio scaling and minimum-opacity empty baseline behavior.
- Added `useDebouncedDensity` with 400ms lodash debounce tied to filter-store changes and adaptive recomputation.
- Standardized loading-state UX with opacity fade + `aria-busy` while preserving previous density visuals to prevent flash.
- Wired test-route simulation controls and DualTimeline loading integration to validate end-to-end density recomputation feedback.
- Confirmed production density path is `TimelinePanel` → `DualTimeline`; `TimelineContainer` remains a legacy wrapper for TimeControls.
- Mounted debounced density recompute hook in production timeline panel and surfaced compute state via `aria-busy`.
- Added filter/column signature triggers for production debounced recompute flow.
- Adopted normalized density domain (0-1) as the stable scale contract for timeline density rendering.

**Phase 27 Decision Log (Execution):**
- Added non-persisted `useSliceCreationStore` for create-mode, preview, and commit/cancel lifecycle state.
- Added mode-toggle toolbar with amber active indicators and clear-all slice control.
- Added slice list component with auto-named slices, selection highlighting, and delete actions.
- Added `slice-utils` module for adaptive snap intervals, duration constraints, and tooltip time formatting.
- Added snap toggle state and preview feedback channel to slice creation store for transient interaction polish.
- Added Escape/resize cancellation handling and invalid-duration visual feedback in creation hook and layer.
- Removed drag-only commit guard so click-created previews with valid start/end persist as range slices.
- Added fixed 2024 UTC mock time constants (`MOCK_START_*`, `MOCK_END_*`) for timeline mock generation.
- Updated mock timestamp/domain wiring so timeline-test renders date-based axes and tooltips from real epoch ranges.
- Added committed slice timeline overlay subscribed to persisted `useSliceStore` slices and active selection state.
- Aligned committed slice geometry with live detail timeline scale/domain for zoom-safe rendering.
- Ensured active overlay highlight remains visible in overlaps and made list selection state explicit/toggleable.

**Phase 28 Decision Log (Execution):**
- Kept boundary adjustment lifecycle in dedicated `useSliceBoundaryAdjustment` with pointer capture and real-time constrained writes through `useSliceStore.updateSlice`.
- Added an interactive `SliceBoundaryHandlesLayer` with distinct start/end handles (8px visual / 12px hit) and drag-time boundary+duration tooltip feedback.
- Used transient drag state from `useSliceAdjustmentStore` to dim non-active committed slices only while adjustment drag is active.
- Added inline boundary snap controls in `SliceToolbar` for default-on enable state, adaptive/fixed mode switching, and compact fixed presets.
- Added Alt/Option per-move snap bypass and cancellation of active drags when scale/domain context changes.
- Expanded deterministic snap tests for fixed-precedence, neighbor tie preference, dense-candidate stability, and normalized conversion round-trips.
- Removed active handle movement interpolation during drag and switched visual lock to live pointer-update boundary positions.
- Added transient `liveBoundarySec`/`liveBoundaryX` drag fields with regression coverage for update and reset lifecycle behavior.

**Phase 29 Decision Log (Execution):**
- Extended `TimeSlice` with burst metadata (`isBurst`, `burstSliceId`) and added store APIs for burst creation/reuse (`addBurstSlice`, `findMatchingSlice`).
- Standardized burst range matching tolerance at 0.5% of range span (`0.005 * span`) to absorb float jitter while preventing duplicate burst slices.
- Added shared `src/lib/slice-utils.ts` range matching helpers with dedicated unit coverage.
- Moved slice ordering to store-level timeline start sorting with manual-before-burst tie-breaking, and aligned `SliceList` fallback naming to store order.
- Added a subtle `Burst` chip treatment in `SliceList` for burst-derived slices that still use default Burst naming.
- Added defensive UI sorting and accessibility labels in `SliceList` so mixed manual/burst entries stay chronological and announce burst origin.
- Rewired BurstList and DualTimeline burst interactions to create/reuse + activate slices through `useSliceStore` rather than burst toggle selection state.
- Standardized burst-driven timeline focusing with shared `focusTimelineRange` utility used by both burst click entry points.
- Restricted burst reuse matching to burst-derived slices so manual ranges do not block burst deletion/recreation lifecycle.
- Synced burst overlay highlighting from active burst slice range matching, preventing manual-only selections from lighting burst overlays.
- Added burst lifecycle verification and accessibility affordances (pressed states, labels, origin metadata) across burst list and timeline-test layers.
- Added inline rename controls in `SliceList` (edit button + Enter/Escape/blur behavior) wired to `updateSlice` for accessible in-list editing.
- Added per-slice rename input in `SliceManagerUI` wired to `updateSlice`, with empty-name clearing to preserve fallback naming and burst chip behavior.
- Fixed DualTimeline SVG interaction layering by rendering burst windows after the zoom overlay and making pointer-events explicit (`zoom: auto`, `burst: all`) so burst clicks create/reuse slices.
- Implemented automatic burst slice creation via `useAutoBurstSlices` hook that runs when burst data becomes available.
- Converted burst interactions from create-to-select pattern — burst windows are automatically slices, UI selects existing ones.

**Phase 30 Decision Log (Execution):**
- Added global `timeScaleMode` (`linear`/`adaptive`) controls to timeline-test `SliceToolbar`, intentionally persisting to `useTimeStore` for parity with production timeline behavior.
- Added timeline-test warp factor control bound to `useAdaptiveStore` with a phase-specific 0-2 range and 0.1 increments.
- Kept warp slider visible but disabled in linear mode to preserve control discoverability while preventing out-of-mode edits.
- Applied adaptive render-time scale warping in `DualTimeline` using `timeScaleMode`, `warpFactor`, and `warpMap` so adaptive mode visibly changes axis spacing.
- Added binary-search inverse mapping for warped scales so scrubbing and click selection still resolve accurate timestamps in adaptive mode.
- Kept brush/zoom synchronization on linear interaction scales to preserve stable d3 behavior while adaptive warping drives visual spacing.
- Added adaptive-only axis tint gradient to overview/detail axis bands as a subtle visual mode cue.
- Mirrored adaptive scale wrapping in timeline-test overlay scale so slice creation/display/boundary drag remain aligned in both modes.

**Phase 31 Decision Log (Execution):**
- Added optional injected `scale` support to `DensityHeatStrip` so density rendering can follow the same warped coordinate system as timeline axes.
- Wired `DualTimeline` overview and detail heat strips to use adaptive-aware scales (`overviewScale`, `detailScale`) for consistent tick alignment.
- Added dedicated `useSliceSelectionStore` with Set-backed `selectedIds` and derived `selectedCount` for transient multi-select state.
- Implemented overlay click UX for multi-select: click selects one, Ctrl/Cmd click toggles, and empty-area click clears selection.
- Added blue selected-state styling and toolbar `selectedCount` indicator while keeping amber active-slice emphasis.
- Added `mergeSlices(ids)` store action that merges contiguous touching/overlapping selections into a single normalized range slice.
- Added toolbar bulk actions `Delete Selected (N)` and `Merge Selected`, both gated by explicit selection count.
- Standardized bulk-operation cleanup to clear transient selection state after merge/delete and clear-all actions.

**Phase 32 Decision Log (Execution):**
- Extended `TimeSlice` with optional `color` and `notes` metadata fields for slice annotation and coloring.
- Kept metadata fields optional and persist-compatible to avoid migrations for existing `slice-store-v1` records.
- Confirmed TypeScript/Next compilation remains healthy after schema extension.
- Added 8-color preset selector UI in `SliceList` and wired per-slice updates through `updateSlice(..., { color })`.
- Added color-aware rendering in `CommittedSliceLayer` so `slice.color` controls timeline overlay fill and border classes.

**Phase 33 Decision Log (Execution):**
- Added `getDataPath()` helper in db.ts pointing to CSV file at data/sources/Crimes_-_2001_to_Present_20260114.csv
- Added `parseDate()` and `epochSeconds()` helpers for date parsing
- Updated stream route to use read_csv_auto for automatic CSV type inference
- Date column auto-parsed by read_csv_auto - used EXTRACT(EPOCH FROM "Date") for epoch conversion
- Fixed DuckDB function issues: epoch_seconds doesn't exist, used EXTRACT(EPOCH FROM Date) instead
- Fixed BigInt serialization by converting all numeric values to Number
- Stream endpoint now serves ~8.3M rows with date filtering and coordinate computation
- Meta endpoint returns real date range: 2001-2026 (978307200 to 1767571200), 8.3M count, 33 crime types
- Added mock fallback to stream route with generateMockData() and X-Data-Warning header
- Added mock fallback to meta route with MOCK_METADATA and isMock flag
- Updated duckdb-aggregator.ts to query CSV instead of parquet with proper date parsing
- Fixed bins aggregator coordinate bounds bug: normalized to correct Chicago bounds (lon -87.9 to -87.5, lat 41.6 to 42.1)
- Wired data store to load real metadata from API (minTime, maxTime, count)
- Added isMock and dataCount tracking to data store
- Fixed field mapping: minLon/maxLon for x bounds, minLat/maxLat for z bounds
- Added demo data warning banner in TopBar when isMock is true
- Timeline automatically uses real epoch seconds for scale domain (2001-2026)
- Added dataCount display in TopBar: in demo warning banner when isMock is true, and in toolbar area when dataCount is defined

**Phase 34 Decision Log (Execution):**
- Added Zustand viewport store with fine-grained selectors (useViewportBounds, useViewportZoom, useCrimeFilters, etc.)
- Installed @tanstack/react-query@^5 for server state caching
- Created QueryProvider wrapper with 5-min staleTime, 10-min gcTime
- Integrated QueryProvider into root layout for app-wide caching
- Created useViewportCrimeData hook with 30-day buffer logic
- Hook subscribes to viewport state from store (reactive), builds queryKey with buffered range
- Added ensureSortedCrimesTable() function for zone map optimization
- Created queryCrimesInRange(), queryCrimeCount(), queryDensityBins() with parameterized queries
- Created /api/crimes/range endpoint accepting viewport bounds (startEpoch, endEpoch)
- Implemented buffer zone logic (default 30 days before/after visible range)
- Returns JSON with metadata (viewport, buffer, count, limit)
- Added useCrimePointCloud hook with LOD sampling (zoom < 0.3 = 1%, < 0.7 = 10%, >= 0.7 = 100%)
- Created TimelinePoints component using THREE.Points with BufferGeometry
- Crime type colors from PALETTE.categoryColors with fallback to 'OTHER'
- Uses ~12 bytes/point vs 200+ for InstancedMesh (10x memory efficiency)
- Created canonical CrimeRecord type in src/types/crime.ts as single source of truth
- Created unified useCrimeData hook accepting explicit parameters (not from store)
- Refactored useViewportCrimeData to wrap useCrimeData with backward compatibility
- Updated SimpleCrimePoints (3D cube) to use useCrimeData instead of DataStore
- Updated MapVisualization (2D map) to use useCrimeData with viewport bounds
- Marked useDataStore as deprecated for data fetching (use useCrimeData instead)
- API endpoint /api/crimes/range confirmed to have no mock fallback (returns 500 on error)

## Blockers/Concerns

**Performance (Phase 34 to address):**
- Loading 8.4 million crime records makes the application slow
- Need to optimize: data streaming, point rendering, query performance, caching

**None currently**

## Session Continuity

Last session: 2026-02-22 18:00 UTC
Stopped at: Completed 34-09-PLAN.md (Gap closure - DataStore cleanup)
Next: Phase 35-37: Semi-Automated Timeslicing

## Accumulated Context

### Milestone Evolution
- v1.0: Complete thesis prototype shipped
- v1.1: Manual timeslicing complete (shipped 2026-02-21)
- v1.2: Performance Optimization (Phase 34) - optimizing for 8.4M records
- v1.2: Semi-automated timeslicing (Phases 35-37)
- v1.3: Fully automated (Phases 38-42, future)

### Roadmap Evolution
- Phase 29 inserted: remake burstlist as first-class slices (downstream phases shifted)
- Phase 34 inserted: Performance Optimization for 8.4M record dataset

### Phase 34 Completion
**Prerequisites from Phase 33:**
- ✅ Real crime data loaded from DuckDB (8.3M records)
- ✅ Date range: 2001-2026
- ✅ TanStack Query installed

**Delivered in 34-01:**
- Zustand viewport store with fine-grained selectors
- TanStack Query provider wrapping app
- useViewportCrimeData hook with 30-day buffer
- QueryProvider integrated in root layout

**Next focus:**
- Execute 34-03-PLAN.md (Viewport API endpoint)

---
*Last updated: 2026-02-22 - completed 34-02 DuckDB query optimization*

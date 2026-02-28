# Project State

**Project:** Adaptive Space-Time Cube
**Core Value:** Users can visually compare uniform vs adaptive time mapping to understand how local density-based time scaling reveals patterns hidden in traditional Space-Time Cubes.
**Current Phase:** Phase 37: Algorithm Integration
**Status:** Phase 37 in progress
**Next:** Phase 37 gap-closure plans (remaining: 37-05)

## Current Position
Phase: **37 of 42** (Algorithm Integration)
Plan: **7 of 9** in current phase
Status: **In progress**
Last activity: 2026-02-27 - Completed 37-04-PLAN.md

Progress: overall ███████████████████░ 99% (138/140 plans) | v1.2 █████████░░░░░ 100% phases (7/7)

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
[x] Phase 34: Performance Optimization (9/9 plans complete)

v1.2 Complete:
[x] Phase 35: Semi-Automated Timeslicing Workflows (3/3 plans complete)
[x] Phase 36: Suggestion Generation Algorithms (4/4 plans complete)
[ ] Phase 37: Algorithm Integration (7/9 plans complete)

v1.3 Planned:
[ ] Phase 38-42: Fully Automated Timeslicing Workflows
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
**Current focus:** Phase 34 complete; preparing Phase 35-37 semi-automated timeslicing workflows
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
2. v1.2: Semi-automated timeslicing workflows (system suggests warp profiles + intervals, user confirms)
3. v1.3: Fully automated timeslicing workflows (system proposes warp + interval sets, user reviews)

**Terminology clarification:**
- Timeslicing = adaptive time warping (density-driven or user-authored warp source)
- Slice workflows = interval suggestion/acceptance/rejection built on top of timeslicing

**Current status clarification:**
- Implemented now: automated timeslicing (density-driven warp) + manual timeslicing (user-authored warp slices)
- Not yet implemented: semi-automated proposal workflow (suggest/review loop), full auto orchestration
- Planned future breakthrough: 3D spatially-constrained timeslicing (warp and interval quality informed by spatial context)
- Requested next capability: context-aware timeslicing by data facets (e.g., focus on a specific crime type)

**Context-aware timeslicing direction (requested):**
- v1.2: suggestions respect active data context/filters and generate context-specific warp + interval proposals
- v1.3: full-auto generation supports context profiles (single crime type, grouped categories, comparison mode)
- v2.0: add spatial constraints in 3D so context-aware timeslicing incorporates where events occur, not just when

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
- Added adaptive warp source toggle (`density` vs `slice-authored`) while keeping existing `timeScaleMode` unchanged.
- Added separate `useWarpSliceStore` for user-authored warp slices (independent from timeline annotation slices).
- Added `WarpSliceEditor` to timeline-test so users can define warp intervals and strengths manually.
- Updated warp editor inputs to use date-time fields (mapped to domain percent internally) so user-authored non-uniform slices are timestamp-driven.

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

**Phase 35 Decision Log (Execution):**
- Created /timeslicing route with DualTimeline and useCrimeData integration
- Added useSuggestionStore with Zustand for suggestion state management
- Store supports warp-profile and interval-boundary suggestion types
- Accept/Modify/Reject actions wired to store
- Added SuggestionPanel, SuggestionCard, ConfidenceBadge UI components
- Side panel pattern per context decision (not inline or modal)
- Numerical confidence percentage per context decision
- Added useSuggestionTrigger hook with mock suggestion generation
- Added SuggestionToolbar with Generate, Clear All, and Toggle Panel buttons
- Mock generates 3 warp profiles (61-87% confidence) + 3 interval boundaries

**Phase 36 Decision Log (Execution):**
- Created confidence-scoring.ts with four exported functions
- calculateDataClarity: measures variance in crime density over time
- calculateCoverage: measures temporal distribution and uniformity
- calculateStatisticalConfidence: measures signal-to-noise ratio, peak prominence, entropy
- calculateConfidence: composite scoring with default weights (clarity 0.4, coverage 0.3, statistical 0.3)
- Created warp-generation.ts with hybrid density-weighting + event detection
- analyzeDensity: bins crimes, calculates normalized density, identifies peaks/lows
- detectEvents: finds significant density transitions (>1.5 std dev)
- generateWarpProfiles: creates 2-3 profiles with different emphasis (aggressive/balanced/conservative)
- Created interval-detection.ts with three detection methods
- detectPeaks: finds local maxima in density distribution
- detectChangePoints: finds significant density transitions using sliding window
- applyRuleBased: equal-time interval division
- snapToBoundary: snaps epochs to hour/day boundaries
- detectBoundaries: main function combining all methods with sensitivity and snapping options

## Blockers/Concerns

**Performance (Phase 34 to address):**
- Loading 8.4 million crime records makes the application slow
- Need to optimize: data streaming, point rendering, query performance, caching

**None currently**

## Session Continuity

Last session: 2026-02-27 17:42 UTC
Stopped at: Completed 37-04-PLAN.md
Next: Execute remaining Phase 37 gap-closure plan (37-05)

## Accumulated Context

### Milestone Evolution
- v1.0: Complete thesis prototype shipped
- v1.1: Manual timeslicing complete (shipped 2026-02-21)
- v1.2: Semi-automated timeslicing workflows (Phases 35-37) - SHIPPED 2026-02-27
- v1.3: Fully automated timeslicing workflows (Phases 38-42, future)

### Roadmap Evolution
- Phase 29 inserted: remake burstlist as first-class slices (downstream phases shifted)
- Phase 34 inserted: Performance Optimization for 8.4M record dataset
- Phase 38 added: context aware timeslicing based on crime type

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
- Execute 35-02-PLAN.md (Suggestion generation)

### Phase 35-01 Completion
**Prerequisites from Phase 34:**
- ✅ useCrimeData hook available
- ✅ DualTimeline component available

**Delivered in 35-01:**
- /timeslicing route with DualTimeline and crime data
- useSuggestionStore with Zustand
- SuggestionPanel, SuggestionCard, ConfidenceBadge UI

### Phase 35 Completion (2026-02-25)
- /timeslicing route (dedicated route per CONTEXT.md)
- useSuggestionStore with Suggestion type and CRUD actions
- SuggestionPanel (fixed right-side, scrollable, empty state)
- ConfidenceBadge ("X% confidence" numerical display per CONTEXT.md)
- SuggestionCard with Accept/Modify/Reject button hierarchy
- SuggestionToolbar with Generate/Clear/Toggle controls
- useSuggestionTrigger hook with mock suggestion generator
- Core workflow: generate, accept, reject, modify all functional
- 3/3 plans complete, verification passed

**Next focus:**
- Phase 36-37: Suggestion generation algorithms (warp profiles + interval boundaries)

### Phase 36 Wave 1 Completion (2026-02-25)
**Prerequisites from Phase 35:**
- ✅ useSuggestionStore with Suggestion types
- ✅ CrimeRecord type available

**Delivered in 36-01:**
- Confidence scoring module (src/lib/confidence-scoring.ts)
- Composite scoring: clarity 0.4, coverage 0.3, statistical 0.3
- Returns 0-100 scores matching ConfidenceBadge format

**Delivered in 36-02:**
- Warp profile generation (src/lib/warp-generation.ts)
- Hybrid density-weighting + event detection algorithm
- 2-3 profiles with different emphasis (aggressive/balanced/conservative)

**Delivered in 36-03:**
- Interval boundary detection (src/lib/interval-detection.ts)
- Three methods: peak detection, change-point, rule-based
- Sensitivity levels and boundary snapping support

**Delivered in 36-04 (UI Integration):**
- Created useSuggestionGenerator hook with real algorithm integration
- Added isEmptyState flag to suggestion store for empty data handling
- Added UI controls: interval count slider (3-12), snapping toggle, method selector
- Added context display ("Based on:") to SuggestionPanel
- Added low-confidence visual warnings (amber border, warning icon)
- Added automatic re-analysis with 400ms debounce on filter changes

**Phase 37 Progress (2026-02-27)**
**Prerequisites from Phase 36:**
- ✅ confidence-scoring.ts, warp-generation.ts, interval-detection.ts algorithms available
- ✅ useSuggestionStore with Suggestion types and CRUD actions

**Delivered in 37-01 (Generation triggers and controls):**
- Added user-configurable warp count and interval count (0-6 range, default 3 each)
- Implemented 500ms debounced auto-regeneration on filter changes
- Added visual distinction: warp profiles (violet), intervals (teal) with type badges

**Delivered in 37-02 (Accept/modify workflow):**
- Accept workflow: warp profiles create WarpSlices, interval boundaries create TimeSlices
- Used CustomEvent for decoupled event-driven slice creation
- Added inline modify controls: sliders for interval start/end/strength, number inputs for boundaries
- Parameterized addSlice in both useSliceStore and useWarpSliceStore

**Delivered in 37-08 (Gap closure - single active warp):**
- Enforced single active warp behavior: accepting a new warp clears previous warp slices
- Added profile-scoped active warp tracking in useWarpSliceStore via warp profile IDs
- Added active warp UI indicators: ACTIVE badge on the current card and panel header active warp label
- Added replacement warning on warp accept hover: "This will replace your current warp"

**Delivered in 37-03 (Gap closure - timeline feedback and readability):**
- Converted suggestion time values to readable dates in card previews and inline editors
- Added hover preview overlays on timeline for warp intervals and interval boundaries
- Added accepted suggestion-warp highlight overlay + legend to timeline view
- Added smooth accept/reject card transitions and processed-list expand/collapse animation

**Delivered in 37-06 (Gap closure - decision support UX):**
- Added side-by-side comparison mode with two-slot selection and visual diff summaries
- Added explanatory tooltips for suggestion generation controls (Generate, Warps, Intervals, Snapping, Method)
- Added dedicated history mode with accepted metadata and one-click re-apply actions

**Delivered in 37-09 (Gap closure - feedback, filtering, and failures):**
- Added undo completion toast feedback to round out accept/reject action feedback
- Added confidence threshold filtering with quick presets and visible/total suggestion counts
- Added generation error handling with store-backed error state, logging, and retry affordance in toolbar

**Delivered in 37-05 (Gap closure - bulk actions and presets):**
- Added pending-suggestion multi-select with panel-level accept/reject batch actions
- Added per-card selection controls and selected-count visibility in the panel header
- Added preset persistence behavior for generation settings in suggestion store state

**Delivered in 37-04 (Gap closure - interaction patterns):**
- Added undo tracking in suggestion store to support five-second accept/reject reversal
- Added keyboard shortcut guidance text for Enter/Escape/Arrow card actions
- Kept processed section explicitly grouped as a collapsible processed container

**Next focus:**
- Continue Phase 37 gap closure (remaining: 37-05)

---
*Last updated: 2026-02-27 - Completed 37-04 gap-closure interaction patterns execution*

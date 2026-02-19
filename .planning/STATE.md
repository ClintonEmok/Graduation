# Project State

**Project:** Adaptive Space-Time Cube
**Core Value:** Users can visually compare uniform vs adaptive time mapping to understand how local density-based time scaling reveals patterns hidden in traditional Space-Time Cubes.
**Current Phase:** v1.1 Manual Timeslicing - Phase 30 ready
**Status:** Phase 29 complete (29-05 shipped)
**Next:** Plan 30-01 multi-slice management kickoff

## Current Position
Milestone: **v1.1 Manual Timeslicing** (IN PROGRESS)
Previous: **v1.0 Thesis Prototype** (SHIPPED 2026-02-07)
Phase: 30 of 41 (Multi-Slice Management)
Plan: Not started (next: 30-01)
Status: ✅ **Phase 29 complete / Ready for next phase**
Last activity: 2026-02-19 - Completed 29-05-PLAN.md

Progress: overall ████████████████████░ 98% (99/101 plans) | v1.1 █████░ 83% phases

```
v1.0 Complete:
[x] Phase 1-25: All thesis prototype phases

v1.1 Planned:
[x] Phase 26: Timeline Density Visualization (5/5 plans complete)
[x] Phase 27: Manual Slice Creation (6/6 plans complete)
[x] Phase 28: Slice Boundary Adjustment (4/4 plans complete)
[x] Phase 29: Remake burstlist as first-class slices (5/5 plans complete)
[ ] Phase 30: Multi-Slice Management
[ ] Phase 31: Slice Metadata & UI

v1.2 Planned:
[ ] Phase 32-36: Semi-Automated Timeslicing

v1.3 Planned:
[ ] Phase 37-41: Fully Automated Timeslicing
```

## Performance Metrics
| Metric | v1.0 | v1.1 Target |
|--------|------|-------------|
| Requirement Coverage | 25/26 core (96%) | 22/22 (100%) |
| Phase Completion | 25/25 | 5/6 |
| Milestone Status | ✅ Shipped | 🚧 Execution In Progress |

## Project Reference
See: `.planning/PROJECT.md` (updated 2026-02-16)

**Core value:** Timeline as active analysis engine
**Current focus:** Transitioning from completed Phase 29 burstlist-as-slices into Phase 30 multi-slice management workflows
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

## Blockers/Concerns

**None currently**

## Session Continuity

Last session: 2026-02-19 15:55 UTC
Stopped at: Completed 29-05-PLAN.md
Resume file: None

## Accumulated Context

### Milestone Evolution
- v1.0: Complete thesis prototype shipped
- v1.1: Manual timeslicing (current focus)
- v1.2: Semi-automated (future)
- v1.3: Fully automated (future)

### Roadmap Evolution
- Phase 29 inserted: remake burstlist as first-class slices (downstream phases shifted)

### Phase 26 Completion
**Prerequisites from v1.0:**
- ✅ Visx/D3 timeline component
- ✅ KDE density data in adaptive store
- ✅ Filter store for data updates
- ✅ TypeScript codebase established

**Delivered in 26-01/26-02:**
- Timeline density area chart component (`DensityAreaChart`)
- Canvas density heat strip component (`DensityHeatStrip`)
- Integrated dual timeline density track (above overview/detail)
- Expanded isolated test route (`/timeline-test`) with standalone and integrated checks
- Gradient visualization dependency (`@visx/gradient`)

**Delivered in 26-03:**
- Debounced density recomputation hook (`useDebouncedDensity`) with 400ms delay and cleanup cancellation
- Loading-aware `DensityAreaChart`/`DensityHeatStrip` props with visual continuity during recompute
- `/timeline-test` controls for filter simulation and live compute status visibility
- DualTimeline loading-state pass-through (`isComputing` -> `isLoading`)

**Next focus:**
- Start 30-01 multi-slice management execution.

---
*Last updated: 2026-02-19 - completed 29-05 rename parity*

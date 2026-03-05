# Roadmap: Adaptive Space-Time Cube

## Milestones

- ✅ **v1.0 Thesis Prototype** — Phases 01-25 (shipped 2026-02-07)
- ✅ **v1.1 Manual Timeslicing** — Phases 26-33 (shipped 2026-02-22)
- ✅ **Performance Optimization** — Phase 34 (shipped 2026-02-22)
- 📋 **v1.2 Semi-Automated Timeslicing Workflows** — Phase 35-37 (suggested warp profiles + suggested intervals + review)
- 📋 **v1.3 Fully Automated Timeslicing Workflows** — Phase 38-42 (automatic warp + interval generation + review)
- 🚧 **v2.0 Cube-First Space-Time Slicing Sandbox** — Phases 43-50 (planning)

---

## Completed Milestone

<details>
<summary>✅ v1.0 Thesis Prototype (Phases 01-25) — SHIPPED 2026-02-07</summary>

Full details: `.planning/milestones/v1.0-ROADMAP.md`

**Summary:**
- 25 phases, 82 plans
- 3D Space-Time Cube with React Three Fiber
- GPU-accelerated adaptive time scaling
- Coordinated Map-Cube-Timeline views
- Advanced filtering with presets
- Feature flags system
- Interaction logging
- Performance: 1.2M records at 60fps

</details>

---

## Active Milestone: v1.1 Manual Timeslicing

**Goal:** Transform timeline into active analysis tool for manual region selection.

**Core Principle:** "Timeline is the engine" — all logic timeline-centric, no 2D/3D yet.

### Phase 26: Timeline Density Visualization

**Goal:** Render clear density regions on the timeline.
**Depends on:** Phase 25 (adaptive store with density data)
**Plans:** 5 plans (26-01, 26-02, 26-03, 26-04, 26-05)

**Requirements:** DENS-01 through DENS-04

**Details:**
- Leverage existing KDE density data from Phase 25
- Visual representation: area chart + heat strip
- Must work with both overview and detail timeline views
- Update when filters change

**Plan Overview:**
- **26-01:** Test route & area chart setup
- **26-02:** Heat strip & timeline integration
- **26-03:** Filter sync & polish
- **26-04:** Production debounced density wiring
- **26-05:** Density gap closure for detail pane + stable scale legend

### Phase 27: Manual Slice Creation

**Goal:** Enable users to create time slices via click or drag.
**Depends on:** Phase 26
**Plans:** 6 plans (27-01, 27-02, 27-03, 27-04, 27-05, 27-06)

**Requirements:** SLICE-01 through SLICE-05

**Details:**
- Click-to-create (default duration)
- Drag-to-create (custom duration)
- Visual preview during creation
- Immediate visual feedback

**Plan Overview:**
- **27-01:** Foundation — Mode toggle, transient store, slice list
- **27-02:** Interaction — Drag handling, ghost preview, click/drag discrimination
- **27-03:** Polish — Snap behavior, duration constraints, edge cases
- **27-04:** Gap Closure — Fix click-to-create range persistence (stores as point instead of range)
- **27-05:** Gap Closure — Fix mock data date realism (0-100 normalized → real Date objects)
- **27-06:** Gap Closure — Render committed slices on timeline + sync active highlight with list selection

### Phase 28: Slice Boundary Adjustment

**Goal:** Allow precise adjustment of slice boundaries.
**Depends on:** Phase 27
**Plans:** 4 plans (28-01, 28-02, 28-03, 28-04)

**Requirements:** ADJUST-01 through ADJUST-06

**Details:**
- Draggable start/end handles
- Real-time boundary updates
- Minimum duration constraints
- Optional snap behavior

Plans:
- [x] 28-01-PLAN.md — Boundary adjustment math + transient interaction store
- [x] 28-02-PLAN.md — Handle layer and real-time drag wiring
- [x] 28-03-PLAN.md — Snap controls, bypass behavior, and edge-case hardening
- [x] 28-04-PLAN.md — Gap closure: eliminate fast-drag handle trailing and re-verify precision UX

### Phase 29: Remake burstlist as first-class slices

**Goal:** Transform burst windows into first-class timeline slices with full UX parity.
**Depends on:** Phase 28
**Plans:** 7 plans (29-01, 29-02, 29-03, 29-04, 29-05, 29-06, 29-07)

Plans:
- [x] 29-01-PLAN.md — Burst-to-slice mapping foundation (range matching, creation/reuse)
- [x] 29-02-PLAN.md — Unified slice list with burst chip indicator
- [x] 29-03-PLAN.md — Burst interaction wiring (create/select slices on click)
- [x] 29-04-PLAN.md — Full lifecycle parity (edit, delete, recreate, sync)
- [x] 29-05-PLAN.md — Gap closure: Slice rename UI/UX
- [x] 29-06-PLAN.md — Gap closure: Timeline burst click SVG layering fix
- [x] 29-07-PLAN.md — Gap closure: Automatic burst-to-slice conversion (no interaction required)

**Details:**
- Burst windows automatically appear as slices without user interaction
- Unified slice list with subtle "Burst" chip for burst-derived slices
- Clicking burst selects existing slice (creates automatically when computed)
- Full editability: boundaries, rename, lock/visibility
- Deletion and recreation work seamlessly

### Phase 30: Timeline Adaptive Time Scaling

**Goal:** Add adaptive (non-uniform) time scaling to timeline-test for visual comparison with uniform time.
**Depends on:** Phase 29
**Plans:** 3 plans (30-01, 30-02, 30-03)

**Details:**
- Add time scale mode toggle (linear/adaptive) to timeline-test
- Make DualTimeline respond to timeScaleMode from time store
- Integrate warp factor control
- Show density-based time warping on timeline axis
- Add user-authored warp slices (date-based intervals) as a separate adaptive warp source
- Enable A/B comparison between uniform and adaptive views

Plans:
- [x] 30-01-PLAN.md — Add toggle and warp factor slider to SliceToolbar
- [x] 30-02-PLAN.md — Make DualTimeline respond to timeScaleMode with adaptive scaling
- [x] 30-03-PLAN.md — Polish: visual indicators, verify slice functionality in both modes

### Phase 31: Multi-Slice Management

**Goal:** Support multiple simultaneous slices with management tools.
**Depends on:** Phase 30
**Plans:** 3 plans (31-01, 31-02, 31-03)

**Requirements:** MULTI-01 through MULTI-06

**Details:**
- Overlap visualization
- Merge adjacent slices
- Selection mechanism
- Individual and bulk delete

Plans:
- [x] 31-01-PLAN.md — Gap closure: Adaptive DensityHeatStrip
- [x] 31-02-PLAN.md — Multi-select foundation (store + UI)
- [x] 31-03-PLAN.md — Merge and bulk delete functionality

### Phase 32: Slice Metadata & UI

**Goal:** Enable naming, coloring, and annotating slices.
**Depends on:** Phase 31
**Plans:** 3 plans (32-01, 32-02, 32-03)

**Requirements:** META-01 through META-05, INTEG-01 through INTEG-04

**Details:**
- Inline editing panel
- Color picker
- Notes/annotation field
- Hover tooltips
- Session persistence

Plans:
- [x] 32-01-PLAN.md — Data model extension (add color and notes fields to TimeSlice)
- [x] 32-02-PLAN.md — Color palette UI (color selector + rendering)
- [x] 32-03-PLAN.md — Notes/annotation UI (tooltip + inline expand)

### Phase 33: Data Integration

**Goal:** Combine CSV data sources into DuckDB and wire timeline to real data.
**Depends on:** Phase 32
**Plans:** 3 plans (33-01, 33-02, 33-03)

**Details:**
- Query full 8.5M row CSV directly with DuckDB (no preprocessing)
- Handle date parsing for "MM/DD/YYYY HH:MM:SS A" format
- Filter null coordinates at query level (~1.1%)
- Add error handling with mock fallback
- Wire timeline to real 2001-2026 date range

Plans:
- [ ] 33-01-PLAN.md — DuckDB setup and CSV querying
- [ ] 33-02-PLAN.md — API refactor with error handling
- [ ] 33-03-PLAN.md — Timeline integration with real dates

---

## Planned Milestones

### Phase 34: Performance Optimization

**Goal:** Optimize data loading and rendering for 8.4M record dataset.
**Depends on:** Phase 33 (Data Integration)
**Plans:** 5 plans (34-01 through 34-05)

**Details:**
- **The Issue:** Loading 8.4 million crime records makes the application slow
- **Areas to Optimize:**
  - Data streaming and pagination
  - Point rendering performance (THREE.Points, level-of-detail)
  - Query performance (DuckDB zone maps, sorted tables)
  - Caching strategies (TanStack Query with select)

**Success Criteria:**
1. Initial load time < 3 seconds for 8.4M records
2. Maintain 30+ fps during timeline interactions with full dataset
3. Filter changes respond within 500ms
4. Memory usage stays under 2GB during normal operation

**Plans:**
- [x] 34-01-PLAN.md — Zustand viewport store + TanStack Query setup
- [x] 34-02-PLAN.md — DuckDB query optimization (sorted tables)
- [x] 34-03-PLAN.md — Viewport API endpoint (/api/crimes/range)
- [x] 34-04-PLAN.md — THREE.Points rendering with LOD
- [ ] 34-05-PLAN.md — Integration & performance verification

**Gap Closure Plans:**
- [x] 34-06-PLAN.md — Canonical CrimeRecord type and unified useCrimeData hook
- [ ] 34-07-PLAN.md — Gap closure: Update visualizations to use useCrimeData
- [ ] 34-08-PLAN.md — Gap closure: Update data store to use unified hook
- [ ] 34-09-PLAN.md — Gap closure: Remove legacy DataStore usage

---

### v1.2 Semi-Automated Timeslicing Workflows

**Goal:** AI-assisted timeslicing where the system proposes warp profiles and interval candidates for user confirmation.

**Terminology note:** In this project, timeslicing refers to adaptive time warping (already supports density-driven and user-authored warp sources). Slice workflows are built on top of timeslicing and manage interval suggestions/review.

**Key Features:**
- System suggests warp profiles (candidate non-uniform warp slices/weights)
- System suggests interval boundaries based on density peaks/events under the current warp
- Context-aware suggestions scoped by active data context (e.g., crime type/category, filters, selected cohorts)
- User reviews and adjusts both warp proposals and interval proposals
- "Accept/Modify/Reject" workflow
- Confidence scores for suggestions and profile quality

**Phases:** 35-37 (planned)

### v1.3 Fully Automated Timeslicing Workflows

**Goal:** Optimal automatic timeslicing with full warp + interval generation and user review.

**Key Features:**
- System creates complete warp profile and interval set automatically
- Optimization for coverage, relevance, minimal overlap, and temporal continuity
- Context-aware optimization per active investigation context (e.g., burglary-only, violent-crime-only, mixed comparisons)
- User reviews and fine-tunes generated outputs
- Multiple algorithm options (density-based, event-based, etc.)

**Phases:** 38-42 (planned)

### v2.0 Cube-First Space-Time Slicing Sandbox (planning)

**Overview:** v2.0 focuses on a dedicated 3D timeslicing sandbox route where space-time slicing can be created, tested, and validated quickly. Timeline/map parity is deferred unless needed for cube outcomes.

#### Phase 43: 3D Sandbox Route Foundation

**Goal:** Users can run 3D timeslicing experiments in a dedicated sandbox route with fast reset and clear context.
**Depends on:** Phase 42 (v1.3 completion)
**Requirements:** ROUTE-01, ROUTE-02, ROUTE-03, ROUTE-04
**Plans:** 2 plans

Plans:
- [ ] 43-01-PLAN.md — Create isolated `/cube-sandbox` route scaffold and entry navigation
- [ ] 43-02-PLAN.md — Add sandbox defaults, compact context panel, and hard reset orchestration

**Success Criteria:**
1. Dedicated 3D timeslicing sandbox route is available and isolated from production workflows.
2. Sandbox route loads thesis-scale defaults with cube state and tooling.
3. User can reset sandbox state rapidly without app reload.

#### Phase 44: Cube Spatial Context Setup

**Goal:** Users can define and control cube spatial constraints used by timeslicing proposals.
**Depends on:** Phase 43
**Requirements:** CSPAT-01, CSPAT-02, CSPAT-03, CSPAT-04
**Plans:** 3 plans

Plans:
- [ ] 44-01-PLAN.md — Spatial constraint store foundation + reset persistence + tests
- [ ] 44-02-PLAN.md — Sandbox constraint manager UI and context rail integration
- [ ] 44-03-PLAN.md — Cube overlay indicators for enabled/active constraints

**Success Criteria:**
1. User can create one or more spatial constraint regions.
2. Constraints can be toggled on/off while preserving definitions.
3. Constraints appear consistently in cube context cues.

#### Phase 45: Cube-Constrained Warp Proposals

**Goal:** Users can generate and apply warp proposals informed by selected cube spatial constraints.
**Depends on:** Phase 44
**Requirements:** CWARP-01, CWARP-02, CWARP-03

**Success Criteria:**
1. System generates warp proposals tied to active spatial constraints.
2. Each proposal shows rationale indicators users can inspect.
3. Applying a proposal immediately changes adaptive mapping in cube axes.

#### Phase 46: Cube-Aware Interval Proposals

**Goal:** Users can work with interval proposals that reflect both temporal bursts and cube spatial context.
**Depends on:** Phase 45
**Requirements:** CINTV-01, CINTV-02, CINTV-03

**Success Criteria:**
1. System suggests interval boundaries for constrained spatial context.
2. Intervals expose quality/confidence indicators.
3. User can adjust interval boundaries and still receive constraint-aware feedback.

#### Phase 47: Cube-First Validation

**Goal:** Users can validate proposal outcomes consistently within cube views and panels.
**Depends on:** Phase 46
**Requirements:** CVAL-01, CVAL-02, CVAL-03

**Success Criteria:**
1. Selecting a slice highlights matching events across cube representations.
2. Accept/reject/edit states propagate in one interaction cycle.
3. Uniform vs adaptive comparison keeps cube overlays aligned.

#### Phase 48: Review Workflow

**Goal:** Users can complete proposal review decisions with reversible actions and clear provenance.
**Depends on:** Phase 47
**Requirements:** REVIEW-01, REVIEW-02, REVIEW-03

**Success Criteria:**
1. User can accept, modify, or reject each proposal.
2. Review list shows clear status and supports quick navigation.
3. User can undo the latest review action without losing provenance.

#### Phase 49: Cube Diagnostics and Analytics

**Goal:** Users can evaluate spatial quality of accepted slices before finalizing analysis.
**Depends on:** Phase 48
**Requirements:** DIAG-01, DIAG-02, DIAG-03

**Success Criteria:**
1. User can inspect per-slice spatial coverage diagnostics.
2. User can compare accepted slicing against uniform baseline metrics.
3. Diagnostics can be filtered by active data context.

#### Phase 50: Quality and Responsiveness

**Goal:** Users can run the full cube-first v2.0 workflow at interactive speed under thesis-scale data.
**Depends on:** Phase 49
**Requirements:** QUAL-01, QUAL-02, QUAL-03

**Success Criteria:**
1. Proposal generation plus first render completes within interactive threshold.
2. Slice edits and cross-view highlight updates feel real-time.
3. Workflow remains stable with high proposal/slice counts.

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-25 | v1.0 | 82/82 | ✅ Complete | 2026-02-07 |
| 26 | v1.1 | 5/5 | ✅ Complete | 2026-02-18 |
| 27 | v1.1 | 6/6 | ✅ Complete | 2026-02-18 |
| 28 | v1.1 | 4/4 | ✅ Complete | 2026-02-19 |
| 29 | v1.1 | 7/7 | ✅ Complete | 2026-02-19 |
| 30 | v1.1 | 3/3 | ✅ Complete | 2026-02-20 |
| 31 | v1.1 | 3/3 | ✅ Complete | 2026-02-21 |
| 32 | v1.1 | 3/3 | ✅ Complete | 2026-02-21 |
| 33 | v1.1 | 5/5 | ✅ Complete | 2026-02-22 |
| 34 | v1.2 Perf | 9/9 | ✅ Complete | 2026-02-22 |
| 35-37 | v1.2 Timeslicing Workflows | 0/TBD | 📋 Planned | - |
| 38-42 | v1.3 Timeslicing Workflows | 0/TBD | 📋 Planned | - |
| 43-50 | v2.0 Cube-First Space-Time Slicing Sandbox | 0/TBD | 🚧 Planning | - |

---

*For current project status, see .planning/PROJECT.md*  
*For milestone history, see .planning/MILESTONES.md*  
*For v1.1 scope details, see .planning/milestones/v1.1-manual-timeslicing-SCOPE.md*

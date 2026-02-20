# Roadmap: Adaptive Space-Time Cube

## Milestones

- ✅ **v1.0 Thesis Prototype** — Phases 01-25 (shipped 2026-02-07)
- 🚧 **v1.1 Manual Timeslicing** — Timeline-based manual region selection (in progress)
- 📋 **v1.2 Semi-Automated Timeslicing** — AI-assisted suggestions (planned)
- 📋 **v1.3 Fully Automated Timeslicing** — Optimal automatic generation (planned)
- 📋 **v2.0** — Additional datasets and advanced analytics (future)

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
- [ ] 32-01-PLAN.md — Data model extension (add color and notes fields to TimeSlice)
- [ ] 32-02-PLAN.md — Color palette UI (color selector + rendering)
- [ ] 32-03-PLAN.md — Notes/annotation UI (tooltip + inline expand)

---

## Planned Milestones

### v1.2 Semi-Automated Timeslicing

**Goal:** AI-assisted region detection with user confirmation.

**Key Features:**
- System suggests slice boundaries based on density peaks
- User reviews and adjusts suggestions
- "Accept/Modify/Reject" workflow
- Confidence scores for suggestions

**Phases:** 32-36 (planned)

### v1.3 Fully Automated Timeslicing

**Goal:** Optimal automatic generation with user review.

**Key Features:**
- System creates complete slice set automatically
- Optimization for coverage, relevance, minimal overlap
- User reviews and fine-tunes
- Multiple algorithm options (density-based, event-based, etc.)

**Phases:** 37-41 (planned)

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
| 31 | v1.1 | 0/3 | 🚧 Planned | - |
| 32 | v1.1 | 0/3 | 🚧 Planned | - |
| 33-36 | v1.2 | 0/TBD | 📋 Planned | - |
| 37-41 | v1.3 | 0/TBD | 📋 Planned | - |

---

*For current project status, see .planning/PROJECT.md*  
*For milestone history, see .planning/MILESTONES.md*  
*For v1.1 scope details, see .planning/milestones/v1.1-manual-timeslicing-SCOPE.md*

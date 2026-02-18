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
**Plans:** 3 plans (27-01, 27-02, 27-03)

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

### Phase 28: Slice Boundary Adjustment

**Goal:** Allow precise adjustment of slice boundaries.
**Depends on:** Phase 27
**Plans:** TBD

**Requirements:** ADJUST-01 through ADJUST-06

**Details:**
- Draggable start/end handles
- Real-time boundary updates
- Minimum duration constraints
- Optional snap behavior

### Phase 29: Multi-Slice Management

**Goal:** Support multiple simultaneous slices with management tools.
**Depends on:** Phase 28
**Plans:** TBD

**Requirements:** MULTI-01 through MULTI-06

**Details:**
- Overlap visualization
- Merge adjacent slices
- Selection mechanism
- Individual and bulk delete

### Phase 30: Slice Metadata & UI

**Goal:** Enable naming, coloring, and annotating slices.
**Depends on:** Phase 29
**Plans:** TBD

**Requirements:** META-01 through META-05, INTEG-01 through INTEG-04

**Details:**
- Inline editing panel
- Color picker
- Notes/annotation field
- Hover tooltips
- Session persistence

---

## Planned Milestones

### v1.2 Semi-Automated Timeslicing

**Goal:** AI-assisted region detection with user confirmation.

**Key Features:**
- System suggests slice boundaries based on density peaks
- User reviews and adjusts suggestions
- "Accept/Modify/Reject" workflow
- Confidence scores for suggestions

**Phases:** 31-35 (planned)

### v1.3 Fully Automated Timeslicing

**Goal:** Optimal automatic generation with user review.

**Key Features:**
- System creates complete slice set automatically
- Optimization for coverage, relevance, minimal overlap
- User reviews and fine-tunes
- Multiple algorithm options (density-based, event-based, etc.)

**Phases:** 36-40 (planned)

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-25 | v1.0 | 82/82 | ✅ Complete | 2026-02-07 |
| 26 | v1.1 | 5/5 | ✅ Complete | 2026-02-18 |
| 27 | v1.1 | 0/3 | 🚧 Planned | - |
| 28 | v1.1 | 0/TBD | 🚧 Planned | - |
| 29 | v1.1 | 0/TBD | 🚧 Planned | - |
| 30 | v1.1 | 0/TBD | 🚧 Planned | - |
| 31-35 | v1.2 | 0/TBD | 📋 Planned | - |
| 36-40 | v1.3 | 0/TBD | 📋 Planned | - |

---

*For current project status, see .planning/PROJECT.md*  
*For milestone history, see .planning/MILESTONES.md*  
*For v1.1 scope details, see .planning/milestones/v1.1-manual-timeslicing-SCOPE.md*

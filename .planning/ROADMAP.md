### Phase 23: Map Interaction & Debugging

**Goal:** Enable point selection on the 2D map and add debug visualization lines.
**Depends on:** Phase 22
**Plans:** 1 plan

Plans:
- [x] 23-01-PLAN.md — Map Interaction & Debugging

### Phase 24: Interaction Synthesis & 3D Debugging

**Goal:** Harmonize interactions across Timeline, Map (2D), and Space-Time Cube (3D). Fix selection state syncing and 3D click targeting.
**Depends on:** Phase 23
**Plans:** 5 plans (3 completed, 2 gap closure)

Plans:
- [x] 24-01-PLAN.md — Coordination Store & Focus+Context
- [x] 24-02-PLAN.md — 3D Click Targeting & Raycast Debug
- [x] 24-03-PLAN.md — Conductor Logic (useSelectionSync hook)
- [ ] 24-04-PLAN.md — Gap: Connect Brush Range to Coordination Store
- [ ] 24-05-PLAN.md — Gap: Add Visual Raycast Line

**Status:** Gap Closure In Progress (3/5 complete)
**Details:**
- Plan 24-01: Centralized selection state, ghosting shader improvements, timeline-3D sync
- Plan 24-02: Raycast debug info, point targeting fixes
- Plan 24-03: useSelectionSync hook for multi-view coordination
- Plan 24-04: Connect Timeline brush selection to coordinationStore brushRange for ghosting shader
- Plan 24-05: Create RaycastLine component for visual click feedback in 3D view

**Gap Closure Context:**
Verification found 2 gaps preventing full "truth" achievement:
1. Brush range dimming not connected (Timeline components don't call setBrushRange)
2. Visual raycast line missing (no visual feedback on 3D click)

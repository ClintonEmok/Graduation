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
- [x] 24-04-PLAN.md — Gap: Connect Brush Range to Coordination Store
- [x] 24-05-PLAN.md — Gap: Add Visual Raycast Line

### Phase 25: Adaptive Time Intervals & Burstiness

**Goal:** Implement adaptive time scaling based on burstiness intervals.
**Depends on:** Phase 24
**Plans:** 2 plans

Plans:
- [ ] 25-01-PLAN.md — Core Warp Logic (KDE & Hooks)
- [ ] 25-02-PLAN.md — Visualization & Adaptive Binning

**Details:**
- Implement KDE-based time warping with Linear Blend (Option C).
- Upgrade Timeline to use Screen Pixel Density binning.
- Add Slider to blend between Uniform and Adaptive time.
- Synchronize 3D Cube and Timeline in adaptive mode.

# Roadmap: Adaptive Space-Time Cube Prototype

## Overview

This roadmap keeps the existing Next.js modular-monolith architecture and hardens it in the order the product needs to be trustworthy: data provenance and validation first, shared cross-view coordination second, workerized adaptive compute third, and large-dataset responsiveness last. The result is a stable desktop research prototype where users can trust what they see, keep cube/map/timeline in sync, and then rely on adaptive warping without freezing the UI.

## Phases

- [ ] **Phase 1: Trust + contracts first** — make startup state, provenance, and validation explicit.
- [ ] **Phase 2: Coordination spine + core interaction loop** — unify brushing, selection, detail inspection, resolution changes, and playback.
- [ ] **Phase 3: Workerized adaptive compute** — move adaptive warping and burst highlighting into the worker-backed analysis path.
- [ ] **Phase 4: Performance hardening** — keep large-dataset brushing, playback, and filtering responsive.

## Phase Details

### Phase 1: Trust + contracts first
**Goal**: Users can immediately tell whether the app is ready, what data they are seeing, and whether inputs are valid.
**Depends on**: Nothing
**Requirements**: TRUST-01, TRUST-02, TRUST-03, TRUST-04
**Success Criteria** (what must be TRUE):
  1. User can tell whether the app is loading, ready, or degraded during startup.
  2. User can tell whether displayed data is real, mock, or partial.
  3. User sees distinct loading, empty, error, and degraded states instead of a blank or misleading panel.
  4. User can apply date, crime type, and geography filters, and invalid filter inputs are rejected with clear feedback.

### Phase 2: Coordination spine + core interaction loop
**Goal**: The cube, map, and timeline behave as one synchronized interaction surface.
**Depends on**: Phase 1
**Requirements**: SYNC-01, SYNC-02, SYNC-03, TIME-01, TIME-02
**Success Criteria** (what must be TRUE):
  1. User can brush or select a time range in the timeline and see the cube and map reflect the same range.
  2. User can select a point or range in the cube or map and see the same selection reflected in the timeline.
  3. User can inspect the selected record’s details in a focused view.
  4. User can change time resolution from coarse to fine and see the detail window update.
  5. User can play and step through time at the selected resolution.

### Phase 3: Workerized adaptive compute
**Goal**: Adaptive time warping runs off the main thread and presents bursty intervals consistently.
**Depends on**: Phase 2
**Requirements**: ADAP-01, ADAP-02, ADAP-03, PERF-02
**Success Criteria** (what must be TRUE):
  1. User can enable adaptive time warping to expand dense intervals and compress sparse intervals.
  2. User can adjust warp strength, burst metric, and highlight percentile.
  3. User can see bursty intervals highlighted consistently in both the cube and map.
  4. Heavy adaptive computations and data transforms run off the main thread.

### Phase 4: Performance hardening
**Goal**: Users can keep working through large datasets without the interface freezing.
**Depends on**: Phase 3
**Requirements**: PERF-01
**Success Criteria** (what must be TRUE):
  1. User can brush large datasets without visible UI freezes.
  2. User can play through large datasets without playback stalling the interface.
  3. User can apply filters on large datasets without the UI becoming unresponsive.

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Requirements | Status | Completed |
|-------|--------------|--------|-----------|
| 1. Trust + contracts first | 4 | Not started | - |
| 2. Coordination spine + core interaction loop | 5 | Not started | - |
| 3. Workerized adaptive compute | 4 | Not started | - |
| 4. Performance hardening | 1 | Not started | - |

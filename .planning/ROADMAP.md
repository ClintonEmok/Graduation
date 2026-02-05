# Project Roadmap

**Project:** Adaptive Space-Time Cube
**Status:** Active
**Total Phases:** 19

## Overview

This roadmap delivers a research prototype for evaluating adaptive time scaling in Space-Time Cubes. The project progresses from core 3D visualization and temporal controls to the novel adaptive scaling algorithms, followed by real data integration, coordinated views, and finally the user study infrastructure.

## Phase 1: Core 3D Visualization

**Goal:** Users can view and navigate the 3D environment with mock data.

**Dependencies:** None
**Focus:** Infrastructure, React Three Fiber, Navigation

| Requirement | Description |
|-------------|-------------|
| **VIS-01** | User can orbit, zoom, and pan the 3D Space-Time Cube |
| **VIS-02** | User can reset camera to initial default view |
| **VIS-03** | System renders crime events as 3D points with color encoding by attribute |
| **VIS-05** | User can toggle 2D view between real Mapbox/Leaflet map and abstract spatial plane |

**Success Criteria:**
1. User can orbit, pan, and zoom smoothly around the 3D scene.
2. User can click a reset button to return the camera to the start position.
3. User sees mock crime events rendered as colored 3D spheres/points.
4. User can switch the base layer between a geographic map and a plain grid.

## Phase 2: Temporal Controls

**Goal:** Users can manipulate time flow (play, pause, scrub) in the linear view.

**Dependencies:** Phase 1
**Focus:** Time State, Animation Loop

| Requirement | Description |
|-------------|-------------|
| **TIME-01** | User can select time range via slider |
| **TIME-02** | System displays current timestamp/range clearly |
| **TIME-03** | User can play/pause animated temporal playback |
| **TIME-04** | User can step forward/backward through time increments |
| **TIME-05** | User can filter data to specific temporal ranges |

**Success Criteria:**
1. User can change the visualized time range using a slider interaction.
2. User sees the current date/time displayed textually.
3. User can start and stop the temporal animation playback.
4. User can incrementally step through time (forward/back) via buttons.
5. System restricts visualized data to the selected time window.

## Phase 3: Adaptive Scaling Logic

**Goal:** Users can toggle between linear and adaptive time (density-based deformation).

**Dependencies:** Phase 2
**Focus:** Adaptive Algorithm, Z-axis Deformation

| Requirement | Description |
|-------------|-------------|
| **ADAPT-01** | System supports Uniform time mapping (linear baseline) |
| **ADAPT-02** | System supports Adaptive time scaling (density-based expansion) |
| **ADAPT-03** | User can toggle between Uniform and Adaptive modes with animated transition |

**Success Criteria:**
1. User sees data distributed linearly along the Z-axis in Uniform mode.
2. User sees dense temporal clusters expanded along the Z-axis in Adaptive mode.
3. User observes a smooth animated transition when switching between modes.

## Phase 4: UI Layout Redesign

**Goal:** Users interact with a polished, research-grade interface with improved layout stability.

**Dependencies:** Phase 3
**Focus:** Layout Structure, Sidebar, Dashboard styling

| Requirement | Description |
|-------------|-------------|
| **UI-01** | System presents a unified layout with collapsible sidebar and main view area |
| **UI-02** | Controls are grouped logically (Time, Filter, View) |
| **UI-03** | Layout is responsive and prevents overlap with 3D scene |

**Success Criteria:**
1. Application loads reliably with no white screen (fixes Phase 3 regression).
2. Users see a clean layout with controls organized in a sidebar or panel.
3. 3D view is unobstructed by floating controls.

**Plans:**
- [x] 04-01-PLAN.md — Foundation: Layout shell & dependencies
- [x] 04-02-PLAN.md — Map Integration: Left panel
- [x] 04-03-PLAN.md — Cube Integration: Right panel
- [x] 04-04-PLAN.md — Assembly: Timeline & Final Polish
- [x] 04-05-PLAN.md — Fix Layout Structure
- [ ] 04-06-PLAN.md — Reintegrate 3D Scene

## Phase 5: Adaptive Visualization Aids

**Goal:** Users can understand the time deformation via visual guides (axis, histogram).

**Dependencies:** Phase 4
**Focus:** Visual Feedback, D3 Scales

| Requirement | Description |
|-------------|-------------|
| **ADAPT-04** | System visualizes the time scale (axis) to show deformation |
| **ADAPT-05** | System displays event density indicator (histogram) to explain scaling |

**Success Criteria:**
1. User sees the time axis ticks shift dynamically to match the current scale (linear vs. adaptive).
2. User sees a density histogram displayed alongside the axis.
3. The axis and histogram align visually with the 3D data distribution.

## Phase 6: Data Backend & Loading

**Goal:** System serves and loads real Chicago crime data efficiently.

**Dependencies:** Phase 5
**Focus:** FastAPI/Next.js API, Performance, progressive loading

| Requirement | Description |
|-------------|-------------|
| **DATA-01** | Backend API serves Chicago crime data |
| **DATA-04** | System loads data progressively or uses server-side aggregation for performance |

**Success Criteria:**
1. System successfully fetches and renders real Chicago crime records.
2. Application remains responsive while loading large datasets (using progression or aggregation).
3. User sees loading indicators during data fetching states.

**Plans:**
- [x] 06-01-PLAN.md — Infrastructure & Data Prep
- [x] 06-02-PLAN.md — Streaming API Endpoint
- [x] 06-03-PLAN.md — Frontend Integration & Optimization

## Phase 7: Advanced Filtering

**Goal:** Users can slice the data by attributes and geography.

**Dependencies:** Phase 6
**Focus:** Data Querying, Spatial Filtering

| Requirement | Description |
|-------------|-------------|
| **DATA-02** | System supports multi-faceted filtering (type, district, time) |
| **DATA-03** | User can save and apply filter presets |
| **VIS-04** | User can filter displayed events by geographic region (spatial filtering) |

**Success Criteria:**
1. User can filter the dataset by specific crime types, districts, and time ranges (multi-faceted filtering - DATA-02).
2. User can save a current filter configuration and restore it later with named presets (DATA-03).
3. User can define a geographic boundary to filter shown events (VIS-04).

**Plans:**
- [x] 07-01-PLAN.md — State & Data Prep (types, districts, time range)
- [x] 07-02-PLAN.md — Backend Facets API
- [x] 07-03-PLAN.md — Visual Ghosting (Shader)
- [x] 07-04-PLAN.md — Filter UI Overlay (Controls.tsx integration)
- [x] 07-05-PLAN.md — Filter Presets (localStorage persistence)
- [x] 07-06-PLAN.md — Time Range Ghosting (Shader)
- [x] 07-07-PLAN.md — Spatial Boundary Filtering (Map selection)

## Phase 8: Coordinated Views

**Goal:** Users experience synchronized exploration across Map, Cube, and Timeline.

**Dependencies:** Phase 7
**Focus:** State Synchronization, D3 Timeline

| Requirement | Description |
|-------------|-------------|
| **COORD-01** | System displays Dual-scale timeline (overview + zoomed detail) |
| **COORD-02** | System synchronizes selection/highlighting across Map, Cube, and Timeline (Bidirectional sync) |
| **COORD-03** | System synchronizes filtering across all views |
| **COORD-04** | System synchronizes current time state across all views |

**Success Criteria:**
1. User sees a detailed timeline view synchronized with an overview timeline.
2. Selecting an element in the 3D cube highlights it in the timeline and map.
3. Changing a filter (e.g., crime type) updates the Map, Cube, and Timeline simultaneously.
4. Scrubbing time in the timeline updates the 3D cube state instantly.

**Plans:**
- [x] 08-01-PLAN.md — Dual-scale timeline + time/filter synchronization
- [x] 08-02-PLAN.md — Selection highlighting across map/cube/timeline
- [x] 08-03-PLAN.md — Map time-range filtering

## Phase 9: Study Logging Infrastructure

**Goal:** System captures all user interactions and manages participant sessions.

**Dependencies:** Phase 8
**Focus:** Telemetry, Session Management

| Requirement | Description |
|-------------|-------------|
| **STUDY-02** | System logs user interactions (clicks, view changes) with timestamps |
| **STUDY-06** | System manages participant IDs for data association |

**Success Criteria:**
1. Every user interaction (click, toggle, filter) is logged to the backend/console with a timestamp.
2. System requires or assigns a participant ID at the start of a session.
3. Logs are correctly associated with the active participant ID.

**Plans:**
- [x] 09-01-PLAN.md — Logging Infrastructure
- [x] 09-02-fix-3d-viz-PLAN.md — Fix 3D Visualization

## Phase 10: Study Content & Flow (Deferred to v2)

**Status:** Deferred
**Goal:** Users are guided through the complete study protocol (tutorial -> tasks).

**Dependencies:** Phase 9
**Focus:** Tutorial, Task State Machine

| Requirement | Description |
|-------------|-------------|
| **STUDY-01** | System presents guided tutorial to train participants |
| **STUDY-03** | System presents specific exploration tasks to participants |
| **STUDY-04** | System measures time-on-task |
| **STUDY-05** | System tracks participant progress through study session |

**Success Criteria:**
1. User can step through an interactive tutorial explaining the interface.
2. User is presented with specific tasks (e.g., "Find the densest cluster") in sequence.
3. System automatically records the duration taken to complete each task.
4. User sees a progress indicator showing their status in the study session.

## Phase 11: Focus+Context Visualization

**Goal:** Users can distinguish focus (selected) data from context (unselected) data via visual de-emphasis.

**Dependencies:** Phase 9
**Focus:** Shader effects, dithered transparency, context controls

| Requirement | Description |
|-------------|-------------|
| **VIZ-FC-01** | System renders focus points at full opacity with type coloring |
| **VIZ-FC-02** | System renders context points with dithered transparency (ghosting) |
| **VIZ-FC-03** | User can toggle context visibility on/off |

**Success Criteria:**
1. Selected/filtered points are fully visible and colored by type.
2. Unselected context points are visible but de-emphasized without alpha sorting artifacts.
3. User can toggle context layer via UI control.

**Plans:**
- [x] 11-01-PLAN.md — Dithered transparency shader + context controls

## Phase 12: Feature Flags Infrastructure

**Goal:** System supports toggling experimental features via settings panel.

**Dependencies:** Phase 11
**Focus:** Settings UI, localStorage persistence, flag system

| Requirement | Description |
|-------------|-------------|
| **FLAG-01** | System stores feature flags in localStorage |
| **FLAG-02** | User can access Settings panel to toggle features |
| **FLAG-03** | Feature flags control visibility of experimental viz modes |

**Success Criteria:**
1. Settings panel accessible via gear icon.
2. Toggle switches persist across browser sessions.
3. Disabled features are completely hidden from UI.

**Plans:**
- [x] 12-01-PLAN.md — Core infrastructure: shadcn components + store + flag definitions
- [ ] 12-02-PLAN.md — Settings UI: draggable toolbar + Settings panel
- [ ] 12-03-PLAN.md — URL sharing with conflict resolution + verification

## Phase 13: UI Polish

**Goal:** Users experience a polished, responsive interface with clear feedback.

**Dependencies:** Phase 12
**Focus:** Loading states, error handling, visual consistency, tooltips

| Requirement | Description |
|-------------|-------------|
| **POLISH-01** | System displays loading indicators during data operations |
| **POLISH-02** | System provides clear error messages and recovery options |
| **POLISH-03** | UI elements have consistent spacing, colors, typography |
| **POLISH-04** | Tooltips explain controls and features on hover |
| **POLISH-05** | First-time users see optional onboarding guidance |

**Success Criteria:**
1. Users never see blank/frozen states during loading.
2. Errors are explained with actionable next steps.
3. Visual design is cohesive across all panels.
4. Hovering controls reveals helpful tooltips.

**Plans:**
- [x] 13-01-PLAN.md — Feedback Infrastructure: Loading, Errors, Toasts
- [x] 13-02-PLAN.md — Interaction Polish: Tooltips & Consistency
- [x] 13-03-PLAN.md — User Guidance: Onboarding Tour
- [ ] 13-04-PLAN.md — Feedback Gaps: Toasts, Loading, Errors

## Phase 14: Color Schemes & Accessibility

**Goal:** Users can choose color schemes including colorblind-safe and dark mode options.

**Dependencies:** Phase 12
**Focus:** Palette system, accessibility, theme switching

| Requirement | Description |
|-------------|-------------|
| **COLOR-01** | System provides default, colorblind-safe, and dark mode palettes |
| **COLOR-02** | User can switch palettes via Settings |
| **COLOR-03** | Palette choice persists via feature flag system |

**Success Criteria:**
1. At least 3 color palettes available (default, colorblind-safe, dark).
2. Palette switch updates all visualizations immediately.
3. Selected palette persists across sessions.

**Plans:**
- [ ] TBD (created by /gsd/plan-phase)

## Phase 15: Time Slices Visualization

**Goal:** Users can see horizontal planes showing temporal cross-sections through the data.

**Dependencies:** Phase 12
**Focus:** 3D geometry, temporal markers, slice controls

| Requirement | Description |
|-------------|-------------|
| **SLICE-01** | System renders horizontal plane(s) at user-specified time values |
| **SLICE-02** | User can add/remove/move time slice planes |
| **SLICE-03** | Feature toggleable via feature flag |

**Success Criteria:**
1. Semi-transparent horizontal planes visible at specified Y positions.
2. User can interactively position slices.
3. Feature can be disabled in Settings.

**Plans:**
- [x] 15-01-PLAN.md — Foundation: Slice Store & 3D Components
- [x] 15-02-PLAN.md — UI Controls: Manager Panel
- [x] 15-03-PLAN.md — Visualization: Shader Highlighting
- [x] 15-04-PLAN.md — Refactor Time Slices to Date/Range UX
- [x] 15-05-PLAN.md — Range Visualization & Shader

## Phase 16: Heatmap Layer

**Goal:** Users can view a 2D density overlay on the map showing spatial concentration.

**Dependencies:** Phase 12
**Focus:** Density calculation, canvas/WebGL overlay, map integration

| Requirement | Description |
|-------------|-------------|
| **HEAT-01** | System calculates 2D spatial density from visible points |
| **HEAT-02** | System renders heatmap overlay on map panel |
| **HEAT-03** | Heatmap updates when filters change |
| **HEAT-04** | Feature toggleable via feature flag |

**Success Criteria:**
1. Heatmap shows high-density areas in warm colors.
2. Heatmap responds to filter/time changes.
3. Feature can be disabled in Settings.

**Plans:**
- [ ] TBD (created by /gsd/plan-phase)

## Phase 17: Cluster Highlighting

**Goal:** Users can auto-detect and label dense regions in the 3D cube.

**Dependencies:** Phase 12
**Focus:** Clustering algorithm, 3D labels, highlight geometry

| Requirement | Description |
|-------------|-------------|
| **CLUSTER-01** | System identifies dense clusters using spatial-temporal proximity |
| **CLUSTER-02** | System renders bounding indicators around clusters |
| **CLUSTER-03** | User can click cluster to zoom/focus |
| **CLUSTER-04** | Feature toggleable via feature flag |

**Success Criteria:**
1. Dense regions are automatically identified and marked.
2. Visual indicators (boxes, labels) highlight cluster boundaries.
3. Clicking a cluster focuses the view on that region.

**Plans:**
- [ ] TBD (created by /gsd/plan-phase)

## Phase 18: Trajectories Visualization

**Goal:** Users can see connected paths showing event sequences over time.

**Dependencies:** Phase 12
**Focus:** Line geometry, temporal ordering, path rendering

| Requirement | Description |
|-------------|-------------|
| **TRAJ-01** | System connects related events with line geometry |
| **TRAJ-02** | Trajectories show temporal direction (color gradient or arrows) |
| **TRAJ-03** | User can filter which trajectories are shown |
| **TRAJ-04** | Feature toggleable via feature flag |

**Success Criteria:**
1. Related events connected by visible paths in 3D space.
2. Path direction (time flow) is visually indicated.
3. Feature can be disabled in Settings.

**Plans:**
- [ ] TBD (created by /gsd/plan-phase)

## Phase 19: Aggregated Bins (LOD)

**Goal:** Users see 3D bars instead of points at far zoom levels for better overview.

**Dependencies:** Phase 12
**Focus:** LOD system, binning algorithm, instanced geometry

| Requirement | Description |
|-------------|-------------|
| **AGG-01** | System aggregates points into spatial-temporal bins at zoom-out |
| **AGG-02** | System renders bins as 3D bars with height = count |
| **AGG-03** | System transitions smoothly between points and bins based on zoom |
| **AGG-04** | Feature toggleable via feature flag |

**Success Criteria:**
1. Zooming out transitions from individual points to aggregated bars.
2. Bar height encodes event count per bin.
3. Transition is smooth, not jarring.

**Plans:**
- [ ] TBD (created by /gsd/plan-phase)

## Progress

| Phase | Status | Completion |
|-------|--------|------------|
| 1. Core 3D Visualization | **Complete** | 100% |
| 2. Temporal Controls | **Complete** | 100% |
| 3. Adaptive Scaling Logic | **Complete** | 100% |
| 4. UI Layout Redesign | **Complete** | 100% |
| 5. Adaptive Visualization Aids | **Complete** | 100% |
| 6. Data Backend & Loading | **Complete** | 100% |
| 7. Advanced Filtering | **Complete** | 100% |
| 8. Coordinated Views | **Complete** | 100% |
| 9. Study Logging Infrastructure | **Complete** | 100% |
| 10. Study Content & Flow | Deferred | 0% |
| 11. Focus+Context Visualization | **Complete** | 100% |
| 12. Feature Flags Infrastructure | **Complete** | 100% |
| 13. UI Polish | **Complete** | 100% |
| 14. Color Schemes & Accessibility | **Complete** | 100% |
| 15. Time Slices Visualization | **Complete** | 100% |
| 16. Heatmap Layer | Planned | 0% |
| 17. Cluster Highlighting | Planned | 0% |
| 18. Trajectories Visualization | Planned | 0% |
| 19. Aggregated Bins (LOD) | Planned | 0% |

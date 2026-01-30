# Project Roadmap

**Project:** Adaptive Space-Time Cube
**Status:** Planning
**Total Phases:** 9

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

## Phase 4: Adaptive Visualization Aids

**Goal:** Users can understand the time deformation via visual guides (axis, histogram).

**Dependencies:** Phase 3
**Focus:** Visual Feedback, D3 Scales

| Requirement | Description |
|-------------|-------------|
| **ADAPT-04** | System visualizes the time scale (axis) to show deformation |
| **ADAPT-05** | System displays event density indicator (histogram) to explain scaling |

**Success Criteria:**
1. User sees the time axis ticks shift dynamically to match the current scale (linear vs. adaptive).
2. User sees a density histogram displayed alongside the axis.
3. The axis and histogram align visually with the 3D data distribution.

## Phase 5: Data Backend & Loading

**Goal:** System serves and loads real Chicago crime data efficiently.

**Dependencies:** Phase 4
**Focus:** FastAPI/Next.js API, Performance, progressive loading

| Requirement | Description |
|-------------|-------------|
| **DATA-01** | Backend API serves Chicago crime data |
| **DATA-04** | System loads data progressively or uses server-side aggregation for performance |

**Success Criteria:**
1. System successfully fetches and renders real Chicago crime records.
2. Application remains responsive while loading large datasets (using progression or aggregation).
3. User sees loading indicators during data fetching states.

## Phase 6: Advanced Filtering

**Goal:** Users can slice the data by attributes and geography.

**Dependencies:** Phase 5
**Focus:** Data Querying, Spatial Filtering

| Requirement | Description |
|-------------|-------------|
| **DATA-02** | System supports multi-faceted filtering (type, district, time) |
| **DATA-03** | User can save and apply filter presets |
| **VIS-04** | User can filter displayed events by geographic region (spatial filtering) |

**Success Criteria:**
1. User can filter the dataset by specific crime types and districts.
2. User can save a current filter configuration and restore it later.
3. User can define a geographic boundary to filter shown events.

## Phase 7: Coordinated Views

**Goal:** Users experience synchronized exploration across Map, Cube, and Timeline.

**Dependencies:** Phase 6
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

## Phase 8: Study Logging Infrastructure

**Goal:** System captures all user interactions and manages participant sessions.

**Dependencies:** Phase 7
**Focus:** Telemetry, Session Management

| Requirement | Description |
|-------------|-------------|
| **STUDY-02** | System logs user interactions (clicks, view changes) with timestamps |
| **STUDY-06** | System manages participant IDs for data association |

**Success Criteria:**
1. Every user interaction (click, toggle, filter) is logged to the backend/console with a timestamp.
2. System requires or assigns a participant ID at the start of a session.
3. Logs are correctly associated with the active participant ID.

## Phase 9: Study Content & Flow

**Goal:** Users are guided through the complete study protocol (tutorial -> tasks).

**Dependencies:** Phase 8
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

## Progress

| Phase | Status | Completion |
|-------|--------|------------|
| 1. Core 3D Visualization | **Pending** | 0% |
| 2. Temporal Controls | Pending | 0% |
| 3. Adaptive Scaling Logic | Pending | 0% |
| 4. Adaptive Visualization Aids | Pending | 0% |
| 5. Data Backend & Loading | Pending | 0% |
| 6. Advanced Filtering | Pending | 0% |
| 7. Coordinated Views | Pending | 0% |
| 8. Study Logging Infrastructure | Pending | 0% |
| 9. Study Content & Flow | Pending | 0% |

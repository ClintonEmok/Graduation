# Requirements: Adaptive Space-Time Cube

**Defined:** 2025-01-30
**Core Value:** Users can visually compare uniform vs adaptive time mapping to understand how local density-based time scaling reveals patterns hidden in traditional Space-Time Cubes.

## v1 Requirements

### Visualization (3D & Spatial)

- [x] **VIS-01**: User can orbit, zoom, and pan the 3D Space-Time Cube
- [x] **VIS-02**: User can reset camera to initial default view
- [x] **VIS-03**: System renders crime events as 3D points with color encoding by attribute
- [x] **VIS-04**: User can filter displayed events by geographic region (spatial filtering)
- [x] **VIS-05**: User can toggle 2D view between real Mapbox/Leaflet map and abstract spatial plane

### Temporal System

- [x] **TIME-01**: User can select time range via slider
- [x] **TIME-02**: System displays current timestamp/range clearly
- [x] **TIME-03**: User can play/pause animated temporal playback
- [x] **TIME-04**: User can step forward/backward through time increments
- [x] **TIME-05**: User can filter data to specific temporal ranges

### Adaptive Scaling (Research Core)

- [x] **ADAPT-01**: System supports Uniform time mapping (linear baseline)
- [x] **ADAPT-02**: System supports Adaptive time scaling (density-based expansion)
- [x] **ADAPT-03**: User can toggle between Uniform and Adaptive modes with animated transition
- [x] **ADAPT-04**: System visualizes the time scale (axis) to show deformation
- [x] **ADAPT-05**: System displays event density indicator (histogram) to explain scaling

### Coordinated Views

- [x] **COORD-01**: System displays Dual-scale timeline (overview + zoomed detail)
- [x] **COORD-02**: System synchronizes selection/highlighting across Map, Cube, and Timeline (Bidirectional sync)
- [x] **COORD-03**: System synchronizes filtering across all views
- [x] **COORD-04**: System synchronizes current time state across all views

### Data & Backend

- [x] **DATA-01**: Backend API serves Chicago crime data
- [x] **DATA-02**: System supports multi-faceted filtering (type, district, time)
- [x] **DATA-03**: User can save and apply filter presets
- [x] **DATA-04**: System loads data progressively or uses server-side aggregation for performance

### User Study Infrastructure

- [ ] **STUDY-01**: System presents guided tutorial to train participants
- [x] **STUDY-02**: System logs user interactions (clicks, view changes) with timestamps
- [ ] **STUDY-03**: System presents specific exploration tasks to participants
- [ ] **STUDY-04**: System measures time-on-task
- [ ] **STUDY-05**: System tracks participant progress through study session
- [x] **STUDY-06**: System manages participant IDs for data association

## v2 Requirements

### Advanced Analysis
- **ANALYSIS-01**: Linked 2D charts for attribute distribution (deferred)
- **ANALYSIS-02**: Session replay capability (deferred)

### Advanced Visualization
- [x] **SLICE-01**: System renders horizontal plane(s) at user-specified time values
- [x] **SLICE-02**: User can add/remove/move time slice planes
- [x] **SLICE-03**: Feature toggleable via feature flag
- [ ] **HEAT-01**: System calculates 2D spatial density from visible points
- [ ] **HEAT-02**: System renders heatmap overlay on map panel
- [ ] **HEAT-03**: Heatmap updates when filters change
- [ ] **HEAT-04**: Feature toggleable via feature flag

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multiple datasets | Focus on Chicago crime for thesis; architecture extensible but only one implemented |
| Real-time streaming | Historical data sufficient for research |
| Mobile support | Desktop-based controlled study environment |
| User accounts | Session-based ID tracking sufficient for study |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| **VIS-01** | Phase 1 | Complete |
| **VIS-02** | Phase 1 | Complete |
| **VIS-03** | Phase 1 | Complete |
| **VIS-04** | Phase 7 | Complete |
| **VIS-05** | Phase 1 | Complete |
| **TIME-01** | Phase 2 | Complete |
| **TIME-02** | Phase 2 | Complete |
| **TIME-03** | Phase 2 | Complete |
| **TIME-04** | Phase 2 | Complete |
| **TIME-05** | Phase 2 | Complete |
| **ADAPT-01** | Phase 3 | Complete |
| **ADAPT-02** | Phase 3 | Complete |
| **ADAPT-03** | Phase 3 | Complete |
| **ADAPT-04** | Phase 5 | Complete |
| **ADAPT-05** | Phase 5 | Complete |
| **COORD-01** | Phase 8 | Complete |
| **COORD-02** | Phase 8 | Complete |
| **COORD-03** | Phase 8 | Complete |
| **COORD-04** | Phase 8 | Complete |
| **DATA-01** | Phase 6 | Complete |
| **DATA-02** | Phase 7 | Complete |
| **DATA-03** | Phase 7 | Complete |
| **DATA-04** | Phase 6 | Complete |
| **STUDY-01** | Phase 10 | Pending |
| **STUDY-02** | Phase 9 | Complete |
| **STUDY-03** | Phase 10 | Pending |
| **STUDY-04** | Phase 10 | Pending |
| **STUDY-05** | Phase 10 | Pending |
| **STUDY-06** | Phase 9 | Complete |
| **SLICE-01** | Phase 15 | Complete |
| **SLICE-02** | Phase 15 | Complete |
| **SLICE-03** | Phase 15 | Complete |

---
*Requirements defined: 2025-01-30*

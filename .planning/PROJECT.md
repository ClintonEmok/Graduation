# Adaptive Space-Time Cube

## What This Is

An interactive web prototype that redesigns the Space-Time Cube visualization to better support exploration of bursty spatiotemporal event data. The system links a timeline, 2D spatial view, and 3D Space-Time Cube, using adaptive (non-uniform) time scaling so dense temporal bursts receive more visual space than quiet periods. Built for a graduation thesis demonstrating how time deformation improves interpretability of spatiotemporal patterns.

## Core Value

Users can visually compare uniform vs adaptive time mapping to understand how local density-based time scaling reveals patterns hidden in traditional Space-Time Cubes.

## Current State (v1.0)

**Shipped:** 2026-02-07  
**Milestone:** v1.0 Thesis Prototype  
**Status:** ✅ Complete - Ready for thesis evaluation

**Capabilities:**
- Full 3D Space-Time Cube with 1.2M point rendering
- GPU-accelerated adaptive time scaling (KDE-based warping)
- Coordinated Map-Cube-Timeline with bidirectional sync
- Advanced filtering (type, district, time, spatial) with presets
- Feature flags for experimental features
- Interaction logging for study analysis
- Multiple visualization aids (slices, heatmap, trajectories, clusters)

**Tech Stack:** Next.js 15, React Three Fiber, Visx, DuckDB, Apache Arrow

## Requirements

### Validated (v1.0)

- ✅ **Preprocessed Chicago crime dataset** — existing (`datapreprocessing/`)
- ✅ **Space-Time Cube with React Three Fiber** — v1.0, 3D rendering with InstancedMesh
- ✅ **Adaptive time scaling on Z-axis** — v1.0, KDE-based density warping
- ✅ **Uniform vs adaptive toggle** — v1.0, animated transition via shader
- ✅ **Dual-scale timeline** — v1.0, Visx focus+context with brush
- ✅ **2D spatial view with map toggle** — v1.0, MapLibre integration
- ✅ **Full bidirectional sync** — v1.0, selection/time sync across all views
- ✅ **Advanced filtering with presets** — v1.0, multi-faceted with localStorage
- ✅ **Backend API for large dataset** — v1.0, DuckDB + Arrow streaming
- ✅ **Interaction logging** — v1.0, comprehensive event tracking
- ✅ **Free exploration mode** — v1.0, fully functional

### Active (v1.1)

- [ ] **Guided task mode** — tutorial and task system for structured study
- [ ] **Time-on-task measurement** — automatic timing metrics
- [ ] **Study progress tracking** — participant session management

### Out of Scope

- Multiple datasets — architecture extensible, Chicago only for thesis
- Real-time streaming — static dataset sufficient
- Mobile responsiveness — desktop-focused research tool
- User accounts — session-based ID tracking sufficient

## Context

**Shipped v1.0 with:**
- 14,813 LOC TypeScript
- 25 phases, 82 plans executed
- 8 days active development
- 1.2M record dataset handled smoothly

**Key Technical Achievements:**
- Web Worker for non-blocking density calculation
- GPU texture-based time warping (60fps)
- Columnar Arrow format for efficient data transfer
- Server-side aggregation for large-scale queries

**User Study Approach (v1.0):**
- Free exploration mode with logging
- Researcher observation for task evaluation
- Participant ID management for data association
- Export capability for interaction analysis

**User Study Improvements (v1.1 planned):**
- Guided tutorial for first-time users
- Specific task presentation with instructions
- Automatic time-on-task measurement
- Progress tracking through study session

## Constraints

- **Tech stack**: Next.js with React Three Fiber ✓ Validated at scale
- **Data scale**: Handles 1.2M records with aggregation
- **Backend**: Next.js API routes with DuckDB integration
- **Rendering**: Three.js via React Three Fiber
- **Maps**: MapLibre GL for 2D spatial view

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| React Three Fiber for 3D | React ecosystem integration | ✅ Excellent DX and performance |
| Local density-based scaling | Intuitive: more events = more space | ✅ Reveals hidden patterns effectively |
| Toggle with transition | Same data morphing, clearer comparison | ✅ Smooth 60fps animation |
| Extensible data architecture | Generalizable thesis claim | ✅ Proven with multiple viz modes |
| Next.js API routes | Simpler than separate service | ✅ DuckDB integration successful |
| Visx for Timeline | React-native D3 | ✅ Focus+Context working well |
| Web Worker + Store | Non-blocking computation | ✅ UI stays responsive |
| Texture-based GPU warp | Performance at scale | ✅ 60fps with complex warping |
| Arrow IPC streaming | Binary columnar format | ✅ Efficient 1.2M record handling |
| Phase 10 deferred | Prioritize core visualization | ✅ Thesis answerable without guided tasks |

## Technical Debt

**Non-blocking for thesis:**
- 2 feature flags defined but not enforced (timeSlices, trajectories)
- /api/crime/facets endpoint unused
- Console.log statements in debug paths
- LSP false positives (non-blocking)
- React 19 vs Visx peer deps (workaround acceptable)

**Address in v1.1:**
- Implement or remove orphaned feature flags
- Add guided study mode infrastructure

---
*Last updated: 2026-02-16 after v1.0 milestone*

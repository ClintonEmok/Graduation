# Adaptive Space-Time Cube

## What This Is

An interactive web prototype that redesigns the Space-Time Cube visualization to better support exploration of bursty spatiotemporal event data. The system links a timeline, 2D spatial view, and 3D Space-Time Cube, using adaptive (non-uniform) time scaling so dense temporal bursts receive more visual space than quiet periods. Built for a graduation thesis demonstrating how time deformation improves interpretability of spatiotemporal patterns.

## Core Value

Users can visually compare uniform vs adaptive time mapping to understand how local density-based time scaling reveals patterns hidden in traditional Space-Time Cubes.

## Current State (v1.1 In Progress)

**Shipped:** v1.0 Thesis Prototype (2026-02-07)
**Active:** v1.1 Manual Timeslicing
**Status:** 🚧 Planning Phase

**v1.1 Goal:** Transform the timeline from a passive navigation tool into an active analysis instrument where users manually create, visualize, and adjust time regions based on event density patterns.

**Timeline-First Approach:**
- Visual density regions on timeline
- Manual slice creation (click/drag)
- Boundary adjustment with handles
- Multi-slice support with metadata
- Timeline-only (2D/3D sync in v1.2+)

## Requirements

### Validated (v1.0)

- ✅ **Preprocessed Chicago crime dataset** — existing (`datapreprocessing/`)
- ✅ **Space-Time Cube with React Three Fiber** — v1.0
- ✅ **Adaptive time scaling on Z-axis** — v1.0
- ✅ **Uniform vs adaptive toggle** — v1.0
- ✅ **Dual-scale timeline** — v1.0
- ✅ **2D spatial view with map toggle** — v1.0
- ✅ **Full bidirectional sync** — v1.0
- ✅ **Advanced filtering with presets** — v1.0
- ✅ **Backend API for large dataset** — v1.0
- ✅ **Interaction logging** — v1.0
- ✅ **Free exploration mode** — v1.0

### Active (v1.1 - Manual Timeslicing)

- [ ] **DENS-01 to DENS-04**: Timeline density visualization
- [ ] **SLICE-01 to SLICE-05**: Manual slice creation
- [ ] **ADJUST-01 to ADJUST-06**: Boundary adjustment
- [ ] **MULTI-01 to MULTI-06**: Multi-slice management
- [ ] **META-01 to META-05**: Slice metadata
- [ ] **INTEG-01 to INTEG-04**: Timeline integration

### Planned (Future Milestones)

**v1.2 Semi-Automated:**
- [ ] AI-assisted slice suggestions
- [ ] User review/confirm/adjust workflow
- [ ] Confidence scores

**v1.3 Fully Automated:**
- [ ] Optimal automatic generation
- [ ] Multiple algorithm options
- [ ] Complete user review

**v1.2+ Cross-View:**
- [ ] 2D/3D slice visualization
- [ ] Cross-view synchronization
- [ ] Slice statistics/analytics

### Out of Scope

- Multiple datasets — architecture extensible, Chicago only for thesis
- Real-time streaming — static dataset sufficient
- Mobile responsiveness — desktop-focused research tool
- User accounts — session-based ID tracking sufficient

## Context

**Shipped v1.0 with:**
- 14,813 LOC TypeScript
- 25 phases, 82 plans executed
- 1.2M record dataset handled smoothly
- GPU-accelerated adaptive scaling

**v1.1 Foundation:**
- Existing Visx/D3 timeline (Phase 21)
- Existing density data from KDE (Phase 25)
- Zustand state management pattern established

**Key Insight:** "Timeline is the engine"
- Timeline becomes primary interaction surface
- All logic timeline-centric in v1.1
- 2D/3D visualization deferred to v1.2+
- This ensures solid foundation before cross-view complexity

## Constraints

- **Tech stack**: Next.js with React Three Fiber (proven at scale)
- **Data scale**: 1.2M records with aggregation
- **Backend**: Next.js API routes with DuckDB
- **Rendering**: Three.js via React Three Fiber
- **Maps**: MapLibre GL for 2D spatial view
- **Timeline**: Visx/D3 (established in v1.0)

## Key Decisions

### From v1.0 (Validated)

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| React Three Fiber for 3D | React ecosystem integration | ✅ Excellent DX and performance |
| Visx for Timeline | React-native D3 | ✅ Focus+Context working well |
| Web Worker + Store | Non-blocking computation | ✅ UI stays responsive |
| Texture-based GPU warp | Performance at scale | ✅ 60fps with complex warping |
| Arrow IPC streaming | Binary columnar format | ✅ Efficient 1.2M record handling |
| Phase 10 deferred | Prioritize core visualization | ✅ Thesis answerable without guided tasks |

### For v1.1 (New)

| Decision | Rationale | Status |
|----------|-----------|--------|
| Timeline-first approach | Solid foundation before cross-view | 🚧 Decided |
| Manual before automated | Learn user needs, then optimize | 🚧 Decided |
| Three milestone approach | Clarity, incremental complexity | 🚧 Decided |
| v1.1 = manual only | Focus, avoid scope creep | 🚧 Decided |

## Technical Debt

**From v1.0 (Non-blocking):**
- 2 feature flags defined but not enforced
- /api/crime/facets endpoint unused
- Console.log statements in debug paths
- LSP false positives
- React 19 vs Visx peer deps

**v1.1 Opportunities:**
- Clean up orphaned feature flags or implement gating
- Consider removing unused /api/crime/facets endpoint

---
*Last updated: 2026-02-16 - v1.1 Manual Timeslicing planning*

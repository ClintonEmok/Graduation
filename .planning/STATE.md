# Project State

**Project:** Adaptive Space-Time Cube
**Core Value:** Users can visually compare uniform vs adaptive time mapping to understand how local density-based time scaling reveals patterns hidden in traditional Space-Time Cubes.
**Current Phase:** 4 - UI Layout Redesign

## Current Position

Phase: 4 of 9 (UI Layout Redesign)
Plan: 5 of 5 in current phase
Status: Phase complete
Last activity: 2026-01-31 - Completed 04-05-SUMMARY.md

Progress: ████▌░░░░░ 44%

```
[x] Phase 1: Core 3D
[x] Phase 2: Temporal
[x] Phase 3: Adaptive Logic
[x] Phase 4: Adaptive Viz
[ ] Phase 5: Data Backend
[ ] Phase 6: Filtering
[ ] Phase 7: Coordinated
[ ] Phase 8: Logging
[ ] Phase 9: Study Flow
```

## Performance Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Requirement Coverage | 100% | 100% |
| Phase Completion | 4/9 | 9/9 |

## Context & Decisions

- **Roadmap Structure:** 9 phases selected ("Comprehensive" depth) to isolate complex features (Adaptive Scaling, Real Data, Coordinated Views) into manageable work units.
- **Mock Data First:** Phases 1-4 will use mock data to validate the adaptive algorithm and UI before integrating the complex Chicago crime dataset in Phase 5.
- **Study-Driven:** The final two phases focus exclusively on the user study infrastructure, ensuring the research goals are met after the technical system is solid.

## Decisions Made

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 1 | Use src/ directory | Cleaner root structure |
| 1 | Use Import Alias @/* | Cleaner imports |
| 1 | Use CameraControls from drei | Smooth navigation, better constraint control than OrbitControls |
| 1 | Use InstancedMesh | Performance for 1000+ points |
| 1 | Map Y-axis to Time | Standard Three.js Y-up compatibility |
| 1 | Use @math.gl/web-mercator | Robust projection math |
| 1 | Center scene at (0,0) | Precision/Jitter avoidance |
| 1 | Use Zustand for UI State | Lightweight global state for mode switching/reset |
| 1 | Conditional View Toggle | Manage Abstract/Map modes via transparency and conditional rendering |
| 2 | Initialized shadcn with defaults | Missing configuration blocked component installation |
| 2 | Time Range 0-100 | Align with Phase 1 mock data Y-axis mapping |
| 2 | Use meshBasicMaterial for TimePlane | Ensure visibility without lighting dependency |
| 2 | Inject shader logic via onBeforeCompile | Avoid custom shader material complexity while enabling GLSL filtering |
| 2 | Dim points outside time range | Maintain context instead of discarding completely |
| 2 | Use useFrame for animation loop | Ensure smooth updates decoupled from React render cycle where possible |
| 2 | Pass shader uniforms via userData | Allow direct updates without re-compiling the material |
| 3 | Manual Binning | Ensure strict index correspondence for inversion |
| 3 | Use Vitest | Lightweight TS testing |
| 4 | Use react-resizable-panels | Robust split-pane behavior |
| 4 | Persist layout to localStorage | Preserve user preference |
| 4 | 3-pane layout | Map Left, Cube Top-Right, Timeline Bottom-Right |
| 4 | Wrapper Component | Wrapped MapBase in MapVisualization to support future UI overlays |
| 4 | Placeholder Cube | Implemented visual structure first to ensure layout stability before WebGL implementation |
| 4 | Organized Components | Moved viz components to `src/components/viz` and layout to `src/components/layout` |
| 4 | Renamed Layout Keys | Renamed layout keys to outerLayout/innerLayout for clarity |

## Session Continuity

Last session: 2026-01-31T14:48:30Z
Stopped at: Completed 04-05-SUMMARY.md
Resume file: None


Config (if exists):
{
  "project_name": "Adaptive Space-Time Cube",
  "model_profile": "custom",
  "commit_docs": true,
  "workflow": {
    "verifier": true
  }
}

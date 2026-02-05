# Project State

**Project:** Adaptive Space-Time Cube
**Core Value:** Users can visually compare uniform vs adaptive time mapping to understand how local density-based time scaling reveals patterns hidden in traditional Space-Time Cubes.
**Current Phase:** 20 - Server-Side Aggregation
**Status:** In progress

## Current Position

Phase: 20 of 20 (Server-Side Aggregation)
Plan: 1 of 2 in current phase
Status: In progress
Last activity: 2026-02-05 - Completed 20-01-PLAN.md (Backend Aggregation API)

Progress: ████████████████████████░ 96%

```
[x] Phase 1: Core 3D
[x] Phase 2: Temporal
[x] Phase 3: Adaptive Logic
[x] Phase 4: UI Layout
[x] Phase 5: Adaptive Visualization Aids
[x] Phase 6: Data Backend
[x] Phase 7: Filtering
[x] Phase 8: Coordinated
[x] Phase 9: Logging/Study
[x] Phase 10: Study Content (Deferred)
[x] Phase 11: Focus+Context
[x] Phase 12: Feature Flags
[x] Phase 13: UI Polish
[x] Phase 14: Color Schemes & Accessibility
[x] Phase 15: Time Slices Visualization
[x] Phase 16: Heatmap Layer
[x] Phase 17: Cluster Highlighting
[x] Phase 18: Trajectories Visualization
[x] Phase 19: Aggregated Bins (LOD)
[>] Phase 20: Server-Side Aggregation
```

## Performance Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Requirement Coverage | 100% | 100% |
| Phase Completion | 19/20 | 20/20 |

## Context & Decisions

- **Roadmap Structure:** Extended to Phase 20 for server-side optimizations.
- **Aggregation Rendering:** Used `InstancedMesh` with a fixed buffer (20,000) for performance.

## Decisions Made

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 19 | InstancedMesh for Bins | Thousands of bins require efficient rendering to maintain 60FPS. |
| 19 | Bin Capacity (20k) | Covers the maximum possible bins (16,384) in a 32x16x32 grid. |
| 19 | Smoothstep LOD | Mapping camera distance to lodFactor via smoothstep provides natural feeling transitions. |
| 19 | Dithered Fading | Used screen-space dithering in shaders to avoid transparency sorting issues while fading. |
| 20 | mode() in DuckDB | Efficiently find most frequent crime type per bin in a single pass. |
| 20 | Int counts | DuckDB BigInt counts cast to Integer for JSON safety. |

## Blockers/Concerns Carried Forward

- **LSP Errors:** Persistent false positives for `lucide-react` and `@react-three/fiber` in the editor environment.
- **Dependency Conflicts:** React 19 causing peer dependency issues with `visx` and `sonner`, requiring `--legacy-peer-deps`.

## Session Continuity

Last session: 2026-02-05 18:41 UTC
Stopped at: Completed 20-01-PLAN.md
Resume file: None

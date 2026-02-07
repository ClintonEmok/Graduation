# Project State

**Project:** Adaptive Space-Time Cube
**Core Value:** Users can visually compare uniform vs adaptive time mapping to understand how local density-based time scaling reveals patterns hidden in traditional Space-Time Cubes.
**Current Phase:** 25 - Adaptive Time Intervals & Burstiness
**Status:** Complete

## Current Position

Phase: 25 of 25 (Adaptive Time Intervals & Burstiness)
Plan: 2 of 2 in current phase
Status: Phase complete
Last activity: 2026-02-06 - Completed 25-03-SUMMARY.md
**Next:** Project Complete (or Maintenance)

Progress: █████████████████████████ 100%

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
[x] Phase 20: Server-Side Aggregation
[x] Phase 21: Timeline Redesign
[x] Phase 22: Contextual Slice Analysis
[x] Phase 23: Map Interaction & Debugging
[x] Phase 24: Interaction Synthesis & 3D Debugging
[x] Phase 25: Adaptive Time Intervals & Burstiness
```

## Performance Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Requirement Coverage | 100% | 100% |
| Phase Completion | 25/25 | 25/25 |

## Context & Decisions

- **Timeline Stack:** Migrated to Visx/D3 for "Focus+Context" interactions.
- **Responsiveness:** Implemented mobile blocking overlay.

## Decisions Made

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 21 | Visx for Timeline | React-native D3 integration provides better DX and performance than raw D3. |
| 21 | Mobile Blocking | Complex interactions require desktop precision; mobile is explicitly out of scope. |
| 21 | Store Integration | Timeline drives `useTimeStore` directly, acting as the primary navigation control. |
| 22 | Side Panel | Contextual analysis lives in a slide-in sidebar to preserve map visibility. |
| 22 | On-Demand Stats | Stats are calculated only when a slice is active to save resources. |
| 23 | Map Click | Switched from `onMouseUp` to `onClick` for robust point selection on map. |
| 23 | Debug Overlay | Added visualization connecting clicks to resolved points to verify projection logic. |
| 24 | Deferred Sync Hook | Selection-to-time sync deferred to Plan 03 via `useSelectionSync` hook for cleaner separation. |
| 24 | Opacity Dithering | Dynamic dithering based on `uContextOpacity` provides smoother ghosting than fixed patterns. |
| 24 | Normalized Time | All components use 0-100 normalized range as common currency for cross-compatibility. |
| 24 | Drag vs Click | 5px threshold distinguishes drag (camera rotate) from click (point selection). |
| 24 | Brush-based Dimming | Points outside brush range get 0.1x opacity via uBrushStart/uBrushEnd uniforms. |
| 24 | Conductor Pattern | Central hook (useSelectionSync) orchestrates multiple stores for cross-view sync. |
| 24 | Effect-driven Sync | useEffect listens to store changes and propagates updates reactively. |
| 24 | Hook in MainScene | Sync hook runs in always-mounted component for guaranteed availability. |
| 24 | Cyan Raycast Line | Cyan (#00ffff) provides high visibility for raycast feedback against dark 3D background. |
| 24 | Raycast Animation | 500ms fade-out balances visibility with non-intrusiveness for user feedback. |
| 25 | Worker-Store Pattern | Offload density calcs to Worker, managed by Zustand singleton |
| 25 | Texture Warp | Using DataTexture for GPU warp lookup ensures performance with complex adaptive maps. |
| 25 | Debounced Raycast | Updating CPU matrices only after warp settles (500ms) preserves interaction accuracy without lag. |
| 25 | Density Heatmap | Canvas-based strip visualizes density (Red=High, Blue=Low) for intuitive understanding of warp. |

## Blockers/Concerns Carried Forward

- **LSP Errors:** Persistent false positives for `lucide-react` and `@react-three/fiber`.
- **Peer Deps:** React 19 vs Visx 3.x required `--legacy-peer-deps`.

## Session Continuity

Last session: 2026-02-07
Stopped at: Session resumed, proceeding to execute Phase 25 Plan 04
Resume file: None

## Phase 25 - Adaptive Time Intervals & Burstiness
**Status:** Complete
**Completed:** 2026-02-06
**Key Outcomes:**
- Implemented Kernel Density Estimation in a Web Worker for non-blocking adaptive time calculation.
- GPU-accelerated adaptive warping using Data Textures and custom shader logic.
- Accurate raycasting for warped points via debounced CPU matrix sync.
- Adaptive Controls UI and Density Heatmap integrated into Timeline.

## Accumulated Context
### Roadmap Evolution
- Phase 21 added: timeline redesign
- Phase 22 added: contextual slice analysis
- Phase 23 added: map interaction & debugging
- Phase 24 added: interaction synthesis & 3d debugging
- Phase 25 added: adaptive time intervals & burstiness

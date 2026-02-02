# Project State

**Project:** Adaptive Space-Time Cube
**Core Value:** Users can visually compare uniform vs adaptive time mapping to understand how local density-based time scaling reveals patterns hidden in traditional Space-Time Cubes.
**Current Phase:** 7 - Advanced Filtering

## Current Position

Phase: 7 of 10 (Advanced Filtering)
Plan: 7 of 7 in current phase
Status: Phase complete
Last activity: 2026-02-02 - Completed 07-07-PLAN.md

Progress: █████████░ 93%

```
[x] Phase 1: Core 3D
[x] Phase 2: Temporal
[x] Phase 3: Adaptive Logic
[x] Phase 4: UI Layout
[x] Phase 5: Adaptive Visualization Aids
[x] Phase 6: Data Backend
[ ] Phase 7: Filtering
[ ] Phase 8: Coordinated
[ ] Phase 9: Logging/Study
[ ] Phase 10: Study Content
```

## Performance Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Requirement Coverage | 100% | 100% |
| Phase Completion | 7/10 | 10/10 |

## Context & Decisions

- **Roadmap Structure:** 10 phases selected ("Comprehensive" depth) to isolate complex features (Adaptive Scaling, Real Data, Coordinated Views) into manageable work units.
- **Mock Data First:** Phases 1-5 will use mock data to validate the adaptive algorithm and UI before integrating the complex Chicago crime dataset in Phase 6.
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
| 5 | Used d3-scale polylinear scale | Map adaptive time domains to screen coordinates seamlessly |
| 5 | Created useDataStore with mock data | Unblock UI development before Data Backend phase |
| 5 | Used @visx/axis with legacy-peer-deps | Support React 19 while using robust visualization primitives |
| 5 | Stacked Layout (Histogram/Axis/Slider) | Provide clear vertical hierarchy for time controls |
| 5 | Linear Slider + Adaptive Viz | Keep interaction simple (linear) while visualizing distortion (adaptive) |
| 6 | Pre-calculate Viz Coords | Offload client CPU by computing X/Z/Y in ETL |
| 6 | Use serverComponentsExternalPackages | Fix DuckDB bundling in Next.js |
| 6 | Used apache-arrow serialization | Fallback when DuckDB native arrow streaming failed |
| 6 | Updated Next.js config for v16 | Rename serverComponentsExternalPackages to serverExternalPackages |
| 6 | In-Memory DB for API | Query Parquet file via path without persistent DB |
| 6 | Columnar Store | Stored data as Float32Arrays for memory efficiency |
| 6 | Shader Attributes | Used custom attributes instead of instanceMatrix for performance |
| 6 | Normalization | Normalized timestamps to 0-100 range in store |
| 7 | Empty = All Selected | Empty arrays for selectedTypes/selectedDistricts means "all selected" for intuitive UX |
| 7 | Integer IDs for GPU | Store IDs not strings to match GPU filtering requirements |
| 7 | Unix Timestamps | Use Unix timestamps for time range filtering for backend consistency |
| 7 | Unknown district fallback | Keep facets endpoint functional when district column is missing |
| 7 | Uniform selection maps | Use uniform float arrays (36 entries) to avoid bitmask limits for shader filtering |
| 7 | Close overlay on preset load | Faster confirmation of applied preset changes |

## Blockers/Concerns Carried Forward

- **LSP Errors:** Detected module resolution issues in `DashboardLayout.tsx` and `test-layout/page.tsx`.
- **Lint Timeout:** `npm run lint` scans `datapreprocessing/.venv` and times out; exclude large assets to unblock verification.

## Session Continuity

Last session: 2026-02-02 17:40 UTC
Stopped at: Completed 07-07-PLAN.md
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

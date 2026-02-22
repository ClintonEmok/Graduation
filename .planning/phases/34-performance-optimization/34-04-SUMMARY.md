---
phase: 34-performance-optimization
plan: 04
subsystem: rendering
tags: [three.js, points, lod, performance, buffer-geometry]

# Dependency graph
requires:
  - phase: 34-01
    provides: Zustand viewport store, TanStack Query setup, useViewportCrimeData hook
  - phase: 34-02
    provides: DuckDB query optimization, queryCrimesInRange function
provides:
  - useCrimePointCloud hook with LOD sampling
  - TimelinePoints component for crime data rendering
  - THREE.Points with BufferGeometry for efficient rendering
affects: [35-37, 38-42 - point cloud integration with timeline]

# Tech tracking
tech-stack:
  added: [three.js]
  patterns: [Level-of-Detail (LOD) sampling, BufferGeometry, PointsMaterial with vertexColors]

key-files:
  created:
    - src/hooks/useCrimePointCloud.ts - Hook for creating BufferGeometry with LOD sampling
    - src/components/timeline/TimelinePoints.tsx - THREE.Points component for crime data
    - src/app/api/crimes/range/route.ts - Viewport API endpoint (bonus: already on disk)
  modified: []

key-decisions:
  - "Used THREE.Points instead of InstancedMesh for efficiency (~12 bytes/point vs 200+)"
  - "LOD sampling: zoom < 0.3 = 1%, < 0.7 = 10%, >= 0.7 = 100%"
  - "Crime type colors from existing palette system"

patterns-established:
  - "LOD-based point cloud rendering with zoom level sampling"
  - "BufferGeometry with Float32Array for position/color attributes"

# Metrics
duration: 5 min
completed: 2026-02-22
---

# Phase 34 Plan 04: THREE.Points Rendering with LOD Summary

**Efficient crime point cloud rendering with THREE.Points and Level-of-Detail sampling**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-22T12:18:06Z
- **Completed:** 2026-02-22T12:23:30Z
- **Tasks:** 2/2
- **Files modified:** 3 (2 created + 1 bonus)

## Accomplishments
- Created useCrimePointCloud hook with LOD sampling based on zoom level
- Created TimelinePoints component that renders crime data using THREE.Points
- Implemented crime type-based coloring using existing palette system
- BufferGeometry with position and color attributes for efficient GPU rendering
- PointsMaterial with vertexColors, sizeAttenuation for proper rendering at different zoom levels

## Task Commits

1. **Task 1: Create useCrimePointCloud hook with LOD** - `8f54345` (feat)
2. **Task 2: Create TimelinePoints component** - `9e26da2` (feat)

**Plan metadata:** (will be created after SUMMARY)

## Files Created/Modified
- `src/hooks/useCrimePointCloud.ts` - Hook creating THREE.BufferGeometry with LOD sampling
- `src/components/timeline/TimelinePoints.tsx` - React component rendering THREE.Points
- `src/app/api/crimes/range/route.ts` - Viewport API endpoint (already existed on disk)

## Decisions Made
- Used THREE.Points instead of InstancedMesh for ~10x memory efficiency (12 bytes/point vs 200+)
- LOD sampling thresholds: zoom < 0.3 = 1% sample, < 0.7 = 10%, >= 0.7 = all points
- Crime type colors from PALETTE.categoryColors with fallback to 'OTHER'

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - both tasks completed without issues.

## Next Phase Readiness
- TimelinePoints component ready for integration into timeline visualization
- LOD sampling will automatically reduce point count at lower zoom levels
- Memory usage stays reasonable through LOD (100% at max zoom, 1% at min zoom)

---
*Phase: 34-performance-optimization*
*Completed: 2026-02-22*

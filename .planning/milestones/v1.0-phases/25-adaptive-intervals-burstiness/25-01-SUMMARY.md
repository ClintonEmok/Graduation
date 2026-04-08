---
phase: 25-adaptive-intervals-burstiness
plan: 01
subsystem: ui
tags: [worker, zustand, adaptive-time, density-estimation]

requires:
  - phase: 06-backend
    provides: Data Store and columnar data
provides:
  - Adaptive Worker for off-thread calculation
  - Adaptive Store for state management
affects:
  - 25-02-shader-integration

tech-stack:
  added: []
  patterns: [web-worker-offloading, store-managed-worker]

key-files:
  created:
    - src/workers/adaptiveTime.worker.ts
    - src/store/useAdaptiveStore.ts
    - src/lib/adaptive-utils.ts
  modified:
    - src/components/viz/MainScene.tsx

key-decisions:
  - "Used Web Worker to offload O(N) density and CDF calculations to prevent main thread blocking during data updates."
  - "Managed Worker instance via module-level singleton in Zustand store to ensure persistence and easy access."
  - "Implemented adaptive logic (density weighting) directly in worker to keep main thread light."

patterns-established:
  - "Worker-Store pattern: Store manages worker lifecycle and exposes async actions that trigger worker messages."

duration: 15min
completed: 2026-02-06
---

# Phase 25 Plan 01: Adaptive Worker & Store Summary

**Web Worker for O(N) density/CDF calculation and Zustand store for adaptive state management**

## Performance

- **Duration:** 15 min
- **Started:** 2026-02-06T22:05:00Z (Estimated)
- **Completed:** 2026-02-06T22:20:45Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Implemented `adaptiveTime.worker.ts` to compute density and warp maps (CDF) from timestamps.
- Created `useAdaptiveStore` to manage the worker, hold the maps, and track `isComputing` state.
- Integrated `computeMaps` trigger in `MainScene` to automatically process data when `useDataStore` updates.
- Handled both Columnar (real) and Object (mock) data sources for robust testing.

## Task Commits

1. **Task 1: Create Adaptive Worker** - `836f322` (feat)
2. **Task 2: Create Adaptive Store** - `ef5749d` (feat)
3. **Task 3: Connect Data to Store** - `1de64aa` (feat)

## Files Created/Modified
- `src/workers/adaptiveTime.worker.ts` - Off-thread density estimation and CDF generation.
- `src/store/useAdaptiveStore.ts` - Zustand store managing `densityMap`, `warpMap`, and `warpFactor`.
- `src/lib/adaptive-utils.ts` - Constants for bin count (1024) and kernel width.
- `src/components/viz/MainScene.tsx` - Added `useEffect` to trigger adaptive computation on data load.

## Decisions Made
- **Zero-Copy Transfer:** Used `Float32Array.slice()` before `postMessage` (with transfer) to prevent detaching the original store data while still efficient.
- **Density Weighting:** Replicated the `1 + (density/max * 5)` logic from `adaptive-scale.ts` to maintain visual consistency with the prototype logic.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added Mock Data Handling**
- **Found during:** Task 3 (Connect Data to Store)
- **Issue:** Plan focused on `columns` (Real Data), but app starts with Mock Data which uses `data` array.
- **Fix:** Added logic to extract timestamps from `data` array and trigger worker if `columns` is missing.
- **Files modified:** src/components/viz/MainScene.tsx
- **Committed in:** 1de64aa

---

**Total deviations:** 1 auto-fixed (missing critical functionality).
**Impact on plan:** Improved robustness for dev/demo modes.

## Next Phase Readiness
- Store now holds `warpMap` and `densityMap`.
- Next plan (02) can consume these textures in shaders for the adaptive visual effect.
- `warpFactor` is ready to be bound to a UI slider.

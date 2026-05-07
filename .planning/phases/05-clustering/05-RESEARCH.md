# Phase 5: Clustering - Research

**Gathered:** 2026-05-07
**Status:** Ready for planning

<summary>
## What matters for this phase

Phase 5 is a clustering pass over the existing cube: extract the DBSCAN logic into a shared helper, render cluster hulls in the 3D scene, add per-slice cluster overlays, and wire cluster selection into the existing spatial filter path.

</summary>

<findings>
## Findings from source inspection

### DBSCAN already exists in the codebase
- `src/components/viz/ClusterManager.tsx` already imports `DBSCAN` from `density-clustering` and computes cluster metadata from filtered crime points.
- The current logic is render-adjacent and should be lifted into a shared helper so global clusters and per-slice clusters can reuse it.

### The cluster store is currently too small
- `src/store/useClusterStore.ts` currently tracks `clusters`, `enabled`, `sensitivity`, and `selectedClusterId` only.
- The phase needs richer cluster metadata (type counts, time span, per-slice buckets, hover state) for labels and per-slice overlays.

### Existing render surfaces are already in place
- `ClusterHighlights.tsx` already draws transparent 3D boxes.
- `ClusterLabels.tsx` already provides cluster selection behavior and camera framing.
- `MainScene.tsx` and `TimeSlices.tsx` are the natural wiring points for cube-wide and slice-plane overlays.

### Filtering can reuse the current spatial-bound path
- `src/components/viz/SimpleCrimePoints.tsx` already respects `selectedSpatialBounds` from `useFilterStore`.
- A cluster click can isolate points by writing the selected cluster's bounds into the existing filter store instead of creating a new point-filter pipeline.

### Per-slice overlays can stay lightweight
- `src/components/viz/TimeSlices.tsx` already owns the slice render loop and overlay composition.
- A per-slice cluster overlay can key off the same slice IDs and adaptive Y scale without changing the scene architecture.

</findings>

<implementation_constraints>
## Constraints to preserve

- Keep clustering behind the existing feature flag.
- Reuse the existing cube / slice scene structure; do not introduce a second visualization shell.
- Keep the cluster helper pure and testable.
- Keep the interaction local to the cube and existing spatial filter state.

</implementation_constraints>

<verification_anchors>
## Useful grep anchors

- `DBSCAN`
- `selectedClusterId`
- `selectedSpatialBounds`
- `ClusterHighlights`
- `ClusterLabels`
- `TimeSlices`
- `sliceClustersById`

</verification_anchors>

---

*Phase: 05-clustering*
*Context gathered: 2026-05-07 via source inspection*

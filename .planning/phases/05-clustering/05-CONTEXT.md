# Phase 5: Clustering - Context

**Gathered:** 2026-05-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Integrate DBSCAN clustering into the cube analysis stack. The phase covers the shared cluster model, 3D cube hulls, per-slice cluster overlays, and cluster interaction (hover/select/filter) inside the dashboard-demo cube surfaces.

</domain>

<decisions>
## Implementation Decisions

### Clustering library
- **D-01:** Use the existing `density-clustering` package and its `DBSCAN` export; do not introduce a second clustering library.
- **D-02:** Keep clustering logic in shared `src/lib/` helpers so cube rendering components stay thin.

### Cluster data model
- **D-03:** Cluster metadata must include count, dominant crime type, type counts, spatial bounds, and time span.
- **D-04:** The same cluster shape should support both global cube clusters and per-slice clusters.
- **D-05:** Cluster store state should remain the source of truth for cluster renderers and selection state.

### Interaction model
- **D-06:** Hover should reveal cluster summary state.
- **D-07:** Click should select a cluster and isolate the cube using the existing spatial-bound filter path.
- **D-08:** Cluster interaction stays cube-first; no new route or separate analysis shell is introduced.

### Feature gating
- **D-09:** Clustering remains behind the existing `clustering` feature flag until explicitly enabled in the UI.

### the agent's Discretion
- Exact helper module names and whether the per-slice overlay is a dedicated component or a helper-driven renderer.
- The visual treatment for hulls vs labels as long as the cluster layers remain readable and lightweight.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap scope
- `.planning/ROADMAP.md` — canonical phase 5 goal, requirements, and success criteria.
- `.planning/MVP-FINALE-ROADMAP.md` — canonical phase 5 mirror used by the updated milestone.

### Existing cube / clustering code
- `src/components/viz/ClusterManager.tsx` — current DBSCAN logic and cluster metadata shape.
- `src/components/viz/ClusterHighlights.tsx` — existing 3D volume rendering pattern.
- `src/components/viz/ClusterLabels.tsx` — existing cluster label / selection pattern.
- `src/store/useClusterStore.ts` — current cluster store and selection state.
- `src/components/viz/MainScene.tsx` — cube scene composition entry point.
- `src/components/viz/CubeVisualization.tsx` — cube shell overlay and info panel.
- `src/components/viz/TimeSlices.tsx` — slice rendering and overlay extension point.
- `src/components/viz/SlicePlane.tsx` — slice-plane render contract.

### Existing data/filter contracts
- `src/lib/data/selectors.ts` — filtered point extraction with `originalIndex`.
- `src/lib/data/types.ts` — filtered point and data point types.
- `src/types/crime.ts` — crime record shape and spatial-bound filter support.
- `src/store/useFilterStore.ts` — existing selected spatial bounds filter path.
- `src/components/viz/SimpleCrimePoints.tsx` — point renderer already honors `selectedSpatialBounds`.

### Feature flag / UI wiring
- `src/lib/feature-flags.ts` — `clustering` feature flag definition.
- `src/components/viz/SliceManagerUI.tsx` — existing clustering toggle surface.

</canonical_refs>

<specifics>
## Specific Ideas

- The current `ClusterManager` already computes DBSCAN clusters and bounding boxes; the phase should lift that logic into a reusable helper and enrich it with time span and per-slice support.
- Cluster labels should be able to show count, dominant crime type, and an easy-to-read time span.
- Clicking a cluster should be able to filter the cube through the already-existing spatial-bounds path rather than inventing a new filter store.

</specifics>

<deferred>
## Deferred Ideas

None — the phase scope is focused on clustering visuals and interaction.

</deferred>

---

*Phase: 05-clustering*
*Context gathered: 2026-05-07*

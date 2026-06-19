---
phase: 01-overview-pattern-summaries
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/map/MapVisualization.tsx
  - src/components/map/MapHeatmapOverlay.tsx
  - src/components/map/MapClusterHighlights.tsx
  - src/components/map/MapTypeLegend.tsx
autonomous: true
requirements: [VIEW-01]
must_haves:
  truths:
    - "User can inspect a 2D density projection with opacity modulation to reveal clusters without losing the overview."
    - "Recurring spatial patterns remain legible through cluster outlines and a compact legend."
    - "Hover and selection interactions still work while the overview stays uncluttered."
  artifacts:
    - path: "src/components/map/MapVisualization.tsx"
      provides: "Overview-surface orchestration"
      contains: "MapHeatmapOverlay"
    - path: "src/components/map/MapHeatmapOverlay.tsx"
      provides: "Density overlay rendering"
      contains: "HeatmapOverlay"
    - path: "src/components/map/MapClusterHighlights.tsx"
      provides: "Readable cluster boundaries"
      contains: "fill-opacity"
    - path: "src/components/map/MapTypeLegend.tsx"
      provides: "Compact categorical legend"
      contains: "Crime Types"
  key_links:
    - from: "src/components/map/MapVisualization.tsx"
      to: "src/store/useMapLayerStore.ts"
      via: "visibility gates"
      pattern: "visibility\\.(heatmap|clusters|trajectories|stkde)"
    - from: "src/components/map/MapClusterHighlights.tsx"
      to: "src/store/useClusterStore.ts"
      via: "cluster selection"
      pattern: "selectedClusterId"
    - from: "src/components/map/MapTypeLegend.tsx"
      to: "src/store/useFilterStore.ts"
      via: "crime-type toggles"
      pattern: "onToggleType"
---

<objective>
Make the 2D overview surface the clearest place to read broad patterns, recurring clusters, and active selections.

Purpose: Phase 1 succeeds only if the density view communicates global structure without hiding the map beneath decorative layers.
Output: A readable map surface with density, cluster, and legend cues tuned for overview-first analysis.
</objective>

<execution_context>
@~/.opencode/get-shit-done/workflows/execute-plan.md
@~/.opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/01-overview-pattern-summaries/01-CONTEXT.md
@src/components/map/MapVisualization.tsx
@src/components/map/MapHeatmapOverlay.tsx
@src/components/map/MapClusterHighlights.tsx
@src/components/map/MapTypeLegend.tsx
@src/store/useMapLayerStore.ts
@src/store/useClusterStore.ts
@src/store/useFilterStore.ts
</context>

<tasks>

<task type="auto">
  <name>Rebalance the map stack for overview readability</name>
  <files>src/components/map/MapVisualization.tsx, src/components/map/MapHeatmapOverlay.tsx</files>
  <read_first>
    @src/components/map/MapVisualization.tsx
    @src/components/map/MapHeatmapOverlay.tsx
    @.planning/phases/01-overview-pattern-summaries/01-CONTEXT.md
    @.planning/REQUIREMENTS.md
  </read_first>
  <action>
    Keep the existing visibility gates and selection plumbing, but tune the rendering order and copy so density and cluster cues are the dominant read, not a decorative layer cake. Preserve the current event, heatmap, cluster, trajectory, and STKDE toggles; only adjust opacity, prominence, and explanatory text so the overview stays readable at a glance.
  </action>
  <acceptance_criteria>
    - `MapVisualization.tsx` still gates `MapEventLayer`, `MapHeatmapOverlay`, `MapClusterHighlights`, `MapTrajectoryLayer`, and `MapStkdeHeatmapLayer` behind the same visibility conditions.
    - `MapHeatmapOverlay.tsx` still uses `HeatmapOverlay` inside a synced `Canvas` and continues to short-circuit when the feature flag is disabled.
    - No new map overlay introduces burst-decoding or support-feature language into the phase-1 surface copy.
  </acceptance_criteria>
  <verify>
    `pnpm typecheck` and `pnpm lint src/components/map/MapVisualization.tsx src/components/map/MapHeatmapOverlay.tsx`
  </verify>
  <done>
    The overview surface reads as a density-first map, with cluster and heat cues visible but not overwhelming the scene.
  </done>
</task>

<task type="auto">
  <name>Make cluster and legend cues communicate recurring patterns clearly</name>
  <files>src/components/map/MapClusterHighlights.tsx, src/components/map/MapTypeLegend.tsx</files>
  <read_first>
    @src/components/map/MapClusterHighlights.tsx
    @src/components/map/MapTypeLegend.tsx
    @src/store/useClusterStore.ts
    @src/store/useFilterStore.ts
  </read_first>
  <action>
    Keep the current cluster selection and crime-type toggles, but sharpen the visual hierarchy so recurring patterns are easy to spot without opening another panel. Use the existing selected/unselected styles to preserve contrast, keep the legend compact, and make sure the labels still map cleanly to the crime-type store IDs.
  </action>
  <acceptance_criteria>
    - `MapClusterHighlights.tsx` still derives a GeoJSON feature collection from `clusters` and `selectedClusterId`.
    - `MapTypeLegend.tsx` still renders the ordered crime types and calls `onHoverType` / `onToggleType`.
    - The cluster and legend copy remains focused on overview cues, not burst or support semantics.
  </acceptance_criteria>
  <verify>
    `pnpm lint src/components/map/MapClusterHighlights.tsx src/components/map/MapTypeLegend.tsx`
  </verify>
  <done>
    The map now makes recurring cluster structure readable at overview scale without sacrificing the existing interaction model.
  </done>
</task>

</tasks>

<verification>
1. `pnpm typecheck` passes.
2. `pnpm lint src/components/map/MapVisualization.tsx src/components/map/MapHeatmapOverlay.tsx src/components/map/MapClusterHighlights.tsx src/components/map/MapTypeLegend.tsx` passes.
3. The `/dashboard` map panel shows density-first overview cues at default state.
</verification>

<success_criteria>
1. The map surface reveals global trends and high-activity clusters without hiding the overview.
2. Cluster boundaries and type legend cues help users recognize recurring patterns.
3. Phase-1 map copy does not leak later-phase burst/support vocabulary.
4. The phase outputs are ready for `.planning/phases/01-overview-pattern-summaries/01-02-SUMMARY.md`.
</success_criteria>

<output>
After completion, create `.planning/phases/01-overview-pattern-summaries/01-02-SUMMARY.md`.
</output>

# Phase 6: Category Encoding - Context

**Gathered:** 2026-05-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the hardcoded crime-type legends with data-driven legends, let legend clicks continue to drive category filtering through the shared filter store, and introduce broad-category shape encoding in the cube.

</domain>

<decisions>
## Implementation Decisions

### Legend source of truth
- **D-01:** Legend entries must come from actual viewport crime data, not from a static crime-type array.
- **D-02:** The shared `useFilterStore` remains the source of truth for category selection state.
- **D-03:** The map and cube legends should share the same category registry so counts, labels, and colors stay aligned.

### Interaction model
- **D-04:** Clicking a legend item toggles that crime type in `selectedTypes`.
- **D-05:** Hover is a presentation detail only; it must not create a second category selection state.
- **D-06:** Category filters must continue to affect both map and cube surfaces.

### Shape encoding
- **D-07:** Shape encoding is a cube presentation concern, not a map concern.
- **D-08:** The cube needs three stable broad-category shapes (sphere, cube, cone) so users can visually distinguish crime groups.
- **D-09:** The broad-category mapping should be centralized in a helper so the visual meaning stays consistent.

### the agent's Discretion
- Exact broad-category boundaries (which crime types map to sphere/cube/cone) as long as the mapping is stable and test-locked.
- Whether the cube shape encoding replaces the point cloud or overlays it with a category-encoded layer, provided the cube remains interactive and readable.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap scope
- `.planning/ROADMAP.md` — canonical phase 6 goal, requirements, and success criteria.
- `.planning/MVP-FINALE-ROADMAP.md` — canonical phase 6 mirror used by the updated milestone.

### Existing legend / filter surfaces
- `src/components/viz/SimpleCrimeLegend.tsx` — current cube legend, still hardcoded.
- `src/components/map/MapTypeLegend.tsx` — current map legend, still backed by a fixed order list but already interactive.
- `src/components/map/MapVisualization.tsx` — map shell that renders the map legend.
- `src/components/viz/CubeVisualization.tsx` — cube shell that renders the cube legend.
- `src/store/useFilterStore.ts` — category filter state and toggle helpers.
- `src/lib/category-maps.ts` — crime-type naming / ID mapping.
- `src/lib/palettes.ts` — category color palettes.

### Existing data sources
- `src/hooks/useCrimeData.ts` — current viewport crime records.
- `src/types/crime.ts` — crime record and viewport filter shapes.
- `src/components/map/MapEventLayer.tsx` — map point rendering that already respects `selectedTypes`.
- `src/components/viz/SimpleCrimePoints.tsx` — cube point rendering that already respects `selectedTypes`.

### Shape-encoding reference points
- `src/components/viz/DataPoints.tsx` — instanced-mesh pattern already present in the codebase.
- `src/components/viz/MainScene.tsx` — cube scene composition entry point.

</canonical_refs>

<specifics>
## Specific Ideas

- The map legend already exposes click affordances; the missing work is making legend content data-driven and shared.
- The cube legend should be able to show the same actual crime types as the map, with the same palette mapping.
- A small helper that derives legend entries from `CrimeRecord[]` will make both legend surfaces consistent.

</specifics>

<deferred>
## Deferred Ideas

None — the phase scope is limited to category legends, filtering, and cube shape encoding.

</deferred>

---

*Phase: 06-category-encoding*
*Context gathered: 2026-05-07*

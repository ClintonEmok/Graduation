# Phase 6: Category Encoding - Research

**Gathered:** 2026-05-07
**Status:** Ready for planning

<summary>
## What matters for this phase

Phase 6 is a presentation and wiring pass: extract a shared category legend model from actual viewport data, reuse the existing filter store for category toggles, and add a cube-only broad-category shape layer.

</summary>

<findings>
## Findings from source inspection

### The current legends are still partially hardcoded
- `src/components/viz/SimpleCrimeLegend.tsx` is fully static and only renders a fixed 6-type list.
- `src/components/map/MapTypeLegend.tsx` already handles hover/click interaction, but the category list is still a hardcoded ordered array.

### Filter plumbing already exists
- `src/store/useFilterStore.ts` already owns `selectedTypes`, `toggleType`, and `setTypes`.
- `src/components/map/MapEventLayer.tsx` and `src/components/viz/SimpleCrimePoints.tsx` already honor `selectedTypes`, so legend clicks already have a working data path once the UI is wired.

### Actual viewport crime data is available
- `src/hooks/useCrimeData.ts` returns the current viewport crime records and already accepts crime-type and district filters.
- That makes it a good source for a dynamic legend that only shows types present in the visible data window.

### Shape encoding needs a new category taxonomy helper
- There is no existing broad-category mapping for "sphere / cube / cone" presentation.
- `src/components/viz/DataPoints.tsx` shows the existing instanced-mesh pattern that can inform the cube shape layer.

### Design constraint
- The cube should stay category-readable and interactive; the shape layer must not break category filtering or the current selection flow.

</findings>

<implementation_constraints>
## Constraints to preserve

- Keep the filter store as the single category-selection source of truth.
- Keep map and cube legends consistent in labels and colors.
- Keep shape encoding cube-only.
- Keep the current map point rendering unchanged except for category legend wiring.

</implementation_constraints>

<verification_anchors>
## Useful grep anchors

- `SimpleCrimeLegend`
- `MapTypeLegend`
- `useCrimeData`
- `selectedTypes`
- `toggleType`
- `buildCrimeLegendEntries`
- `sphereGeometry`
- `boxGeometry`
- `coneGeometry`

</verification_anchors>

---

*Phase: 06-category-encoding*
*Context gathered: 2026-05-07 via source inspection*

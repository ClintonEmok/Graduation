# Phase 5: Demo Stats + STKDE Interaction - Research

**Gathered:** 2026-04-09
**Status:** Ready for planning

<summary>
## What matters for this phase

Phase 5 is mostly a wiring and framing pass: make the demo stats surface feel like the entry point, push district selection into STKDE, and lock the one-way contract with regression coverage.

</summary>

<findings>
## Findings from source inspection

### Stats side already has the right primitives
- `useDemoNeighborhoodStats` already pads selected districts before querying crime data.
- `DemoStatsPanel` already owns the district selection UI, time range controls, summary cards, and hourly pulse.
- `getDistrictDisplayName` exists in `src/lib/category-maps.ts` and is already used elsewhere for friendly district labels.

### STKDE side already has the right hooks
- `useDemoStkde` already tracks `selectedDistricts`, `stkdeScopeMode`, `stkdeParams`, and the selected/hovered hotspot state.
- The hook currently sends `/api/stkde/hotspots` requests without district filters, so the key phase 5 change is request construction plus summary labeling.
- `DemoStkdePanel` already keeps hotspot clicks local to STKDE by mutating only STKDE-side state and applying spatial/temporal filters.

### Backend support exists, but district filtering is missing
- `/api/stkde/hotspots` already supports sampled and full-population compute paths.
- `validateAndNormalizeStkdeRequest` already normalizes request shape; `filters` currently allows `crimeTypes` and `bbox` only.
- `buildFullPopulationStkdeInputs` already appends crime type and bbox filters using parameter placeholders, so district filtering should follow the same pattern.

### Verification is best handled by source-inspection tests
- The current shell test already inspects source strings for the demo shell composition.
- The STKDE route test already covers compute-mode behavior and is the right place to lock district filter forwarding.
- Phase 5 verification should fail if the demo rail stops opening on Stats, if the stats panel stops using district-first wording, or if district filters stop reaching both STKDE compute paths.

</findings>

<implementation_constraints>
## Constraints to preserve

- Keep the demo flow one-way: stats can filter STKDE, but STKDE must not write back into stats selection.
- Keep the demo compact; do not rebuild the shared stats route or introduce a second demo-specific data pipeline.
- Preserve the existing sampled/full-population STKDE behavior while threading district filters through both paths.
- Use friendly district names in summaries and labels; keep raw codes out of the primary copy.
- Keep regression checks source-inspection-based where possible so phase 5 remains fast and deterministic.

</implementation_constraints>

<verification_anchors>
## Useful grep anchors

- `defaultValue="stats"`
- `getDistrictDisplayName`
- `Spatial distribution`
- `districts: paddedDistricts`
- `"District" IN`
- `setSelectedDistricts`
- `setTimeRange`

</verification_anchors>

---

*Phase: 05-stats-stkde-interaction*
*Context gathered: 2026-04-09 via source inspection*

Phase 4 turns the adjacent-slice work into a time-sequenced evolution view inside `/dashboard-demo`.

Locked scope from the roadmap and user objective:
- Show all slices in temporal order as a dedicated evolution view component.
- Support stepping through slices and automatic playback at a configurable speed.
- Animate slice-to-slice transitions in the cube so the current step reads as motion, not a static list.
- Visualize pattern flow between consecutive slice positions with lines/arrows or equivalent directional hints.
- Keep the demo map-first layout and fixed right rail intact.

## Canonical refs

- `.planning/ROADMAP.md`
- `.planning/MVP-FINALE-ROADMAP.md`
- `.planning/STATE.md`
- `.planning/phases/03-adjacent-slice-comparison-burst-evolution/03-01-SUMMARY.md`
- `.planning/phases/03-adjacent-slice-comparison-burst-evolution/03-03-SUMMARY.md`
- `.planning/phases/03-adjacent-slice-comparison-burst-evolution/03-04-SUMMARY.md`
- `src/store/useDashboardDemoTimeStore.ts`
- `src/store/useDashboardDemoSliceStore.ts`
- `src/components/dashboard-demo/DashboardDemoShell.tsx`
- `src/components/dashboard-demo/DashboardDemoRailTabs.tsx`
- `src/components/dashboard-demo/DemoTimelinePanel.tsx`
- `src/components/timeline/DemoDualTimeline.tsx`
- `src/components/viz/TimeSlices.tsx`
- `src/components/viz/SlicePlane.tsx`

## Phase boundary

- Phase 4 is about the evolution view only; do not rebuild the stats/STKDE demo rail.
- Reuse the existing demo stores and timeline/cube surfaces rather than introducing a second analysis architecture.
- The evolution surface should feel like a progression mode layered into the existing demo shell, not a separate app.

## Working assumptions

- Slice ordering can be derived from the existing demo slice store and current time state.
- Playback can reuse the demo time store’s play/pause and speed controls.
- The cube motion layer should be lightweight and deterministic enough to source-check.

---

*Phase: 04-evolution-view*
*Context gathered: 2026-05-07 via canonical roadmap and adjacent-phase summaries*

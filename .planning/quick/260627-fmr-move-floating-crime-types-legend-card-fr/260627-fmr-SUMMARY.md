# 260627-fmr — Move Floating Crime Types Legend Card Summary

**Status:** complete

## What was implemented

Moved the large floating Card overlay from `MapVisualization` into a new "Legend" tab inside the existing `ContextualSlicePanel`, and replaced the card with a small Layers icon toggle button on the map.

- Lifted `hoveredTypeId`, `lastClick`, and a new `mapOverlayOpen` boolean (plus their setters) from `MapVisualization` local state into `useCoordinationStore` so the map and the side panel can read/write them. Mirrored the same fields in `useDashboardDemoCoordinationStore` so the override pattern in `DemoMapVisualization` keeps working.
- Extracted the inline `PoiBreakdownCard` out of `MapVisualization` into its own file under `src/components/map/`, and created `src/components/viz/MapLegendPanel.tsx` to host the former card content (Clear button, density caption, click debug, active filter indicator, `MapTypeLegend`, and `PoiBreakdownCard` when a POI is selected). The POI lookup and `/api/crime/around` fetch effect move to `MapLegendPanel` so the side panel is self-contained.
- Removed the floating Card overlay and the inline `PoiBreakdownCard` from `MapVisualization`, deleted the now-unused `isControlsOpen` / `poiBreakdown` / `useEffect` / `POI_DATA` imports, and added a small `Layers` icon toggle button at the previous overlay's anchor (`absolute left-4 top-4 z-10`) that flips `mapOverlayOpen` on the coordination store.
- Wired the new state into `ContextualSlicePanel`: the panel now also opens when `mapOverlayOpen` is true, gains a `Legend` tab that renders `<MapLegendPanel />`, the header reads "Map Legend" when only `mapOverlayOpen` is driving the panel, and `handleClose` resets `mapOverlayOpen` to `false`.
- All new coordination-store reads in `MapVisualization` use the existing cast-to-optional pattern so the dashboard-demo coordination store override still works without `selectedPoiId` / `setSelectedPoi` / etc. being defined on the non-demo store.

## Files changed

| File | Change |
| --- | --- |
| `src/store/useCoordinationStore.ts` | Added `hoveredTypeId`, `lastClick`, `mapOverlayOpen` and their setters to the `CoordinationState` interface, the `create` call's initial values, and the setter implementations. |
| `src/store/useDashboardDemoCoordinationStore.ts` | Mirrored the same three fields and setters so the override pattern keeps working for `/dashboard-demo`. |
| `src/store/useCoordinationStore.test.ts` | Extended the `beforeEach` `setState` reset to include `hoveredTypeId: null`, `lastClick: null`, `mapOverlayOpen: false` for test isolation. |
| `src/components/map/PoiBreakdownCard.tsx` | **New file** — extracted the inline `PoiBreakdownCard` from `MapVisualization` (props and JSX unchanged). |
| `src/components/viz/MapLegendPanel.tsx` | **New file** — renders the former Card content; accepts an optional `activeSliceLabel` prop. |
| `src/components/map/MapVisualization.tsx` | Deleted the Card overlay, the inline `PoiBreakdownCard`, the `isControlsOpen` / `hoveredTypeId` / `lastClick` / `poiBreakdown` local state, the `selectedPoi` lookup, the `poiBreakdown` fetch effect, and the `POI_DATA` / `Card` / `CardContent` / `MapTypeLegend` / `ChevronDown` / `ChevronUp` / `X` / `useState` / `useEffect` imports. Reads `hoveredTypeId` / `lastClick` / `mapOverlayOpen` (and their setters) from the coordination store via the cast-to-optional pattern. Added a small `Layers` icon toggle button at the previous anchor. Kept `setSelectedPoi` and `handlePoiClick` so the demo's POI click flow still works. |
| `src/components/viz/ContextualSlicePanel.tsx` | Read `mapOverlayOpen` and `setMapOverlayOpen` from `useCoordinationStore`, opened the panel when `mapOverlayOpen` is true, added a `Legend` `TabsTrigger` and a `<TabsContent value="legend">` rendering `<MapLegendPanel />`, updated the `defaultValue` ternary, made the header read "Map Legend" when only `mapOverlayOpen` is driving the panel, and extended `handleClose` to reset `mapOverlayOpen`. |

## Commit hashes

| Commit | Message |
| --- | --- |
| `cfbeb24` | `chore(map-overlay): add hoveredTypeId, lastClick, mapOverlayOpen to coordination stores` |
| `9e591a9` | `refactor(map-overlay): extract PoiBreakdownCard and create MapLegendPanel` |
| `96462ca` | `feat(map-overlay): remove floating card from MapVisualization and add Legend tab to ContextualSlicePanel` |

## Verification

- `pnpm tsc --noEmit` — no new errors vs. the pre-existing baseline (15 unrelated pre-existing errors in API routes, tests, and the UI map component remain untouched).
- `pnpm vitest run src/store/useCoordinationStore.test.ts` — 5/5 tests pass.
- `pnpm lint` on the seven touched files — 0 errors; 2 pre-existing-style warnings (`activeSliceLabel` prop kept for API compatibility with `DemoMapVisualization`, and `setHoveredTypeId` read per the plan's cast-to-optional spec but not used inside `MapVisualization`).

## Deviations / blockers

- **Plan said remove `setSelectedPoi` from `MapVisualization`**; kept it (and `handlePoiClick`) so POI clicks still propagate to the dashboard-demo coordination store. The plan's step 4 was internally contradictory ("remove `setSelectedPoi` reads here" but also "Pass `handlePoiClick` to `MapPoiLayer` as before so the demo can still record POI clicks"). The conservative read preserves the POI click flow.
- **Plan said remove the `activeSliceLabel` prop** — it is not used inside `MapVisualization` any more (the filter indicator moved to `MapLegendPanel`). Kept the prop on the `MapVisualizationProps` interface to avoid a breaking change to `DemoMapVisualization`'s pass-through, since `DemoMapVisualization.tsx` is out of scope for this plan. This produces a `no-unused-vars` lint warning (not an error).
- **Added an `eslint-disable-next-line react-hooks/set-state-in-effect` directive** in `MapLegendPanel.tsx` for the synchronous POI-clear reset inside `useEffect`. The pre-existing `MapVisualization` had the same lint error at the same effect; removing the code from `MapVisualization` and re-introducing the same pattern in a new file would have introduced a new lint error. The disable matches the project's existing pattern (see `src/app/stkde-3d/components/StkdeSliceStack.tsx`).
- **`setHoveredTypeId` is read but not used inside `MapVisualization`** (lint warning, not an error). The plan explicitly specified the cast-to-optional read of the setter even though `MapTypeLegend` (the only previous consumer) moved out of `MapVisualization`. Left the read in place to match the plan verbatim.

No other blockers. Manual smoke testing of `/dashboard` was not performed by the executor; the user can verify the toggle button and Legend tab by loading the dashboard and clicking the Layers icon at the map's top-left.

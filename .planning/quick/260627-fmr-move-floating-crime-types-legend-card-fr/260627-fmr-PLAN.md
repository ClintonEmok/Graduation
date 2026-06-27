---
id: 260627-fmr-move-floating-crime-types-legend-card-fr
description: Move floating crime types legend card from MapVisualization overlay to a Legend tab in ContextualSlicePanel; add a toggle button on the map to show it
status: ready
mode: quick
---

# Move Floating Crime Types Legend Card to Side Panel

## Goal

Remove the large floating Card overlay (`absolute left-4 top-4 z-10 w-[20rem]`) from `MapVisualization` and replace it with a small icon toggle button. The card's full content (Clear button, click debug info, active filter indicators, `MapTypeLegend`/`CrimeCategoryLegend`, and `PoiBreakdownCard`) moves into a new "Legend" tab inside the existing `ContextualSlicePanel`. The toggle button on the map opens that tab.

The state that used to be local to `MapVisualization` (`hoveredTypeId`, `lastClick`) plus a new `mapOverlayOpen` boolean must be lifted into `useCoordinationStore` so the map and the side panel can read/write them. The dashboard-demo coordination store mirrors the same fields so the store-override pattern keeps working.

## Constraints

- `MapVisualization` is reused by `/dashboard`, `/dashboard-v2`, and `/dashboard-demo`; the override pattern (`coordinationStoreOverride`, `filterStoreOverride`) must still work for all three.
- The demo already replaces the overlay with `DemoStatsMapOverlay` and has its own rail; the Legend tab in `ContextualSlicePanel` is only rendered in the main dashboard, so the toggle button on the demo map is effectively a no-op (sets the flag in the demo store, which has no panel consumer). That is acceptable.
- TypeScript strict, 2-space indent, single quotes, trailing commas. No code comments unless asked.
- Use existing project patterns: `Button` from `@/components/ui/button`, `Card` from `@/components/ui/card`, `Tabs` from `@/components/ui/tabs`, `Layers` icon from `lucide-react`.

## State Changes (shared)

Add to `src/store/useCoordinationStore.ts`:

```ts
hoveredTypeId: number | null;
setHoveredTypeId: (id: number | null) => void;
lastClick: { lat: number; lon: number } | null;
setLastClick: (click: { lat: number; lon: number } | null) => void;
mapOverlayOpen: boolean;
setMapOverlayOpen: (open: boolean) => void;
```

Mirror the same fields in `src/store/useDashboardDemoCoordinationStore.ts` (declare in the state interface, initialise to the same defaults, and add the same setters) so the override pattern in `DemoMapVisualization` keeps working without optional chaining.

`MapVisualization` currently reads `selectedPoiId` / `setSelectedPoi` from the coordination store via the cast-to-optional pattern. Continue using the same pattern for the new fields in `MapVisualization` (it is the only place that needs to read them defensively from the possibly-overridden store).

## Tasks

### Task 1: Extend coordination stores and update test setup

<task type="auto">
  <name>Extend coordination stores with legend state and reset test fields</name>
  <files>
    src/store/useCoordinationStore.ts
    src/store/useDashboardDemoCoordinationStore.ts
    src/store/useCoordinationStore.test.ts
  </files>
  <action>
    In `src/store/useCoordinationStore.ts`:
    1. Add to `CoordinationState` interface: `hoveredTypeId: number | null;`, `setHoveredTypeId: (id: number | null) => void;`, `lastClick: { lat: number; lon: number } | null;`, `setLastClick: (click: { lat: number; lon: number } | null) => void;`, `mapOverlayOpen: boolean;`, `setMapOverlayOpen: (open: boolean) => void;`.
    2. Initialise in the `create` call: `hoveredTypeId: null,`, `lastClick: null,`, `mapOverlayOpen: false,` alongside existing defaults.
    3. Add setter implementations: `setHoveredTypeId: (hoveredTypeId) => set({ hoveredTypeId }),`, `setLastClick: (lastClick) => set({ lastClick }),`, `setMapOverlayOpen: (mapOverlayOpen) => set({ mapOverlayOpen }),`.

    In `src/store/useDashboardDemoCoordinationStore.ts`:
    1. Add the same six fields to the state interface (mirroring the `selectedPoiId` / `setSelectedPoi` pattern) and initialise them to `null` / `false` in the same area as `selectedPoiId: null,`.
    2. Add the three setter implementations next to `setSelectedPoi: (selectedPoiId) => set({ selectedPoiId }),` at the bottom of the create call.

    In `src/store/useCoordinationStore.test.ts`:
    - Extend the `beforeEach` `setState` reset to include `hoveredTypeId: null,`, `lastClick: null,`, `mapOverlayOpen: false,` so test isolation is preserved.
  </action>
  <verify>
    - `pnpm vitest run src/store/useCoordinationStore.test.ts` passes.
    - `pnpm tsc --noEmit` reports no new errors in the three files.
  </verify>
  <done>
    - Both coordination stores expose `hoveredTypeId`, `setHoveredTypeId`, `lastClick`, `setLastClick`, `mapOverlayOpen`, `setMapOverlayOpen`.
    - `useCoordinationStore.test.ts` still passes (existing five tests).
  </done>
</task>

### Task 2: Extract PoiBreakdownCard and create MapLegendPanel

<task type="auto">
  <name>Create MapLegendPanel and extract PoiBreakdownCard into its own file</name>
  <files>
    src/components/map/PoiBreakdownCard.tsx (new)
    src/components/viz/MapLegendPanel.tsx (new)
  </files>
  <action>
    1. Create `src/components/map/PoiBreakdownCard.tsx` by lifting the inline `PoiBreakdownCard` function component out of `MapVisualization.tsx` (lines 344-418). Keep the exact same JSX, props interface, and behaviour. The component will later be imported by `MapVisualization` (used elsewhere via the `selectedPoi` data passed from the parent) and by `MapLegendPanel`.
    2. Create `src/components/viz/MapLegendPanel.tsx` exporting a `MapLegendPanel` component that renders the same content the floating card used to show (minus the outer Card chrome and the `isControlsOpen` collapse — it lives in the side panel now so it does not need to collapse):
       - "Clear" button bound to `useFilterStore` `clearSpatialBounds`, disabled when `selectedSpatialBounds` is null.
       - "Density-first overview" / "Overview density with hotspot cues" caption driven by `isStkdeVisible` (read from `useMapLayerStore` `visibility.stkde`).
       - Click debug line: `Click: {lastClick.lat.toFixed(4)}, {lastClick.lon.toFixed(4)}` when `lastClick` is non-null. Read `lastClick` from the coordination store via the cast-to-optional pattern (same shape as `selectedPoiId`).
       - Active filter indicator line joining `Slice: <label>` (only when `activeSliceLabel` prop is non-null), `Types N`, `Districts N`, `Time`, `Region`.
       - `MapTypeLegend` with `selectedTypes`, `hoveredTypeId`, `onHoverType={setHoveredTypeId}`, `onToggleType={toggleType}` (all from coordination store + filter store, again with cast-to-optional for `setHoveredTypeId`).
       - `PoiBreakdownCard` when `selectedPoi` is non-null, using the same fetch effect against `/api/crime/around` that was inline in `MapVisualization`. To keep this self-contained, copy the `selectedPoi` lookup (`POI_DATA.find`), the `poiBreakdown` `useState` + `useEffect` block, and pass `loading`, `error`, `total`, `byType`, `onClose={() => setSelectedPoi?.(null)}` to `PoiBreakdownCard`.
    3. Accept an optional `activeSliceLabel?: string | null` prop on `MapLegendPanel` (default `null`) so the slice line in the filter indicator can be preserved if a parent decides to pass it. The main dashboard leaves it as the default.
  </action>
  <verify>
    - `pnpm tsc --noEmit` reports no new errors in the two new files.
    - `pnpm vitest run src/store/useCoordinationStore.test.ts` still passes (this task only adds new files, no store changes).
  </verify>
  <done>
    - `src/components/map/PoiBreakdownCard.tsx` exports `PoiBreakdownCard` with the same props and JSX as the previous inline version.
    - `src/components/viz/MapLegendPanel.tsx` exports `MapLegendPanel` rendering Clear button, density caption, click debug line, active filter line, `MapTypeLegend`, and `PoiBreakdownCard` (when a POI is selected).
  </done>
</task>

### Task 3: Refactor MapVisualization and add Legend tab to ContextualSlicePanel

<task type="auto">
  <name>Remove floating overlay from MapVisualization, add toggle button, and wire Legend tab in ContextualSlicePanel</name>
  <files>
    src/components/map/MapVisualization.tsx
    src/components/viz/ContextualSlicePanel.tsx
  </files>
  <action>
    In `src/components/map/MapVisualization.tsx`:
    1. Delete the local `useState<number | null>` for `hoveredTypeId` and the local `useState<{ lat, lon } | null>` for `lastClick`. Replace them with reads from the coordination store using the same cast-to-optional pattern used for `selectedPoiId`:
       ```ts
       const hoveredTypeId = useStore(coordinationStore, (state) => (state as { hoveredTypeId?: number | null }).hoveredTypeId) as number | null | undefined;
       const setHoveredTypeId = useStore(coordinationStore, (state) => (state as { setHoveredTypeId?: (id: number | null) => void }).setHoveredTypeId) as ((id: number | null) => void) | undefined;
       const lastClick = useStore(coordinationStore, (state) => (state as { lastClick?: { lat: number; lon: number } | null }).lastClick) as { lat: number; lon: number } | null | undefined;
       const setLastClick = useStore(coordinationStore, (state) => (state as { setLastClick?: (click: { lat: number; lon: number } | null) => void }).setLastClick) as ((click: { lat: number; lon: number } | null) => void) | undefined;
       const mapOverlayOpen = useStore(coordinationStore, (state) => (state as { mapOverlayOpen?: boolean }).mapOverlayOpen) as boolean | undefined;
       const setMapOverlayOpen = useStore(coordinationStore, (state) => (state as { setMapOverlayOpen?: (open: boolean) => void }).setMapOverlayOpen) as ((open: boolean) => void) | undefined;
       ```
    2. Update `handleClick` to call `setLastClick?.({ lat, lon: lng })` instead of the old local setter.
    3. Remove the `isControlsOpen` local state, the entire Card overlay block (lines 267-339), and the inline `PoiBreakdownCard` component (lines 344-418). Also remove now-unused imports: `Card`, `CardContent`, `MapTypeLegend`, `ChevronDown`, `ChevronUp`, and the `X` icon if it is no longer used after removing the inline `PoiBreakdownCard` close button.
    4. Remove the `poiBreakdown` state, the fetch effect, and the `selectedPoi` lookup from `MapVisualization` — those move to `MapLegendPanel`. Also remove the now-unused `POI_DATA` import, the `useCoordinationStore` `selectedPoiId` / `setSelectedPoi` reads here (they are consumed by `MapLegendPanel` now), and the `handlePoiClick` if the only caller was the POI layer. Pass `handlePoiClick` to `MapPoiLayer` as before so the demo can still record POI clicks in its own store.
    5. In place of the old overlay, render a single small icon button:
       ```tsx
       <div className="absolute left-4 top-4 z-10">
         <Button
           type="button"
           variant="outline"
           size="icon-sm"
           onClick={() => setMapOverlayOpen?.(!mapOverlayOpen)}
           aria-label={mapOverlayOpen ? 'Hide map legend' : 'Show map legend'}
           title={mapOverlayOpen ? 'Hide map legend' : 'Show map legend'}
           className="border-border/70 bg-background/85 shadow-sm backdrop-blur-sm"
         >
           <Layers className="size-3.5" />
         </Button>
       </div>
       ```
       Use the same `absolute left-4 top-4 z-10` position so the toggle sits exactly where the old card did. Add `Layers` to the existing `lucide-react` import.

    In `src/components/viz/ContextualSlicePanel.tsx`:
    1. Read `mapOverlayOpen` and `setMapOverlayOpen` from `useCoordinationStore` alongside the existing selectors.
    2. Update the `isOpen` line so the panel is also visible when `mapOverlayOpen` is true: `const isOpen = detailsOpen || activeSliceId !== null || selectedIndex !== null || mapOverlayOpen;`
    3. Extend `handleClose` to also call `setMapOverlayOpen(false)`.
    4. Add a new `TabsTrigger value="legend"` to the `TabsList` after the existing three triggers.
    5. Add a new `<TabsContent value="legend">` that renders `<MapLegendPanel />`.
    6. Update the `defaultValue` ternary so when `mapOverlayOpen` is true and none of the other tabs is contextually active, the Legend tab is the default: `defaultValue={mapOverlayOpen ? 'legend' : selectedIndex !== null ? 'point' : activeSliceId ? 'slice' : 'bursts'}`.
    7. Update the header `<h2>` so the title reads "Map Legend" when only `mapOverlayOpen` is driving the panel open. Keep existing titles for the other modes.
    8. Import `MapLegendPanel` from `@/components/viz/MapLegendPanel`.

    Note: the Legend tab remains in the `TabsList` even when the panel is opened for a point/slice/burst — that matches the existing UX of always showing all triggers and is a behaviour match for how the other tabs are presented.
  </action>
  <verify>
    - `pnpm tsc --noEmit` reports no new errors in the two edited files.
    - `pnpm vitest run src/store/useCoordinationStore.test.ts` still passes.
    - `pnpm lint` reports no new errors in the edited files.
    - Manual smoke: `/dashboard` still loads, the map shows a small Layers icon at top-left, clicking it opens the right-side panel with the Legend tab active and showing Clear button, density caption, MapTypeLegend, and the PoiBreakdownCard when a POI is selected. Clicking the panel close button hides the panel and the toggle reverts to its off state.
  </verify>
  <done>
    - `MapVisualization` no longer renders a floating Card overlay; only the small Layers icon button remains at the same anchor.
    - `hoveredTypeId`, `lastClick`, `mapOverlayOpen` are sourced from the coordination store and the map hover still drives the legend highlight (verified by hovering a legend item while points are visible).
    - `ContextualSlicePanel` opens on `mapOverlayOpen` and shows the Legend tab; the existing Point/Bursts/Slice tabs continue to work unchanged.
  </done>
</task>

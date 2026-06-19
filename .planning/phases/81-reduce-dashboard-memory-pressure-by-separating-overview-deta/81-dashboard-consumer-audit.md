# Phase 81 Dashboard Consumer Audit

**Phase:** 81 — Reduce dashboard memory pressure by separating overview/detail loading
**Plan:** 81-02 (Wave 2)
**Status:** Complete
**Gathered:** 2026-06-19

## Purpose

This audit inventories every dashboard-facing `useTimelineDataStore` / `columns` consumer that is impacted by removing the eager `loadRealData()` call from `CubeVisualization`. It captures the contract each consumer needs from the store going forward (summary-safe on mount vs. detail-gated) and what concrete migration action Phase 81 will take.

The audit is intentionally phase-local and implementation-oriented. It is not a broad architecture document.

## Methodology

1. Grep all consumers of `useTimelineDataStore`, `columns`, `loadRealData`, `overviewTimestampSec`, `overviewBins`, `/api/crime/overview`, and `/api/crime/meta` across `src/components/dashboard-demo/**` and `src/app/dashboard-demo/**`.
2. For each consumer, identify whether it reads the full-detail `columns` Arrow payload, reads the summary-backed fields, or only reads safe non-`columns` fields (`minTimestampSec`, `maxTimestampSec`, etc.).
3. Decide per consumer: (a) summary-safe on mount, (b) preview-only until detail intent, (c) detail-gated but currently relying on a separate `/api/crimes/range` path that already does not need the store, or (d) untouched.
4. Record the explicit user-intent gate that should trigger a detail load (brush/zoom) for consumers that still need detail.

## Consumer Inventory

### A. Summary-safe on mount (no change required for D-05 / D-06)

These consumers only read summary-level fields (`minTimestampSec`, `maxTimestampSec`, `crimeTypes`) that `loadSummaryData()` already populates. They do not need `columns`. They can stay on the summary-first path with no further changes for Phase 81.

| File | Store fields used | Migration status |
| --- | --- | --- |
| `src/components/dashboard-demo/DashboardDemoShell.tsx` | `loadSummaryData`, `minTimestampSec`, `maxTimestampSec` | None — already summary-first; calls `loadSummaryData()` on mount, then sets the viewport range from the dataset metadata. |
| `src/components/dashboard-demo/DemoMapVisualization.tsx` | `minTimestampSec`, `maxTimestampSec` | None — uses summary bounds only to resolve slice epoch ranges. |
| `src/components/dashboard-demo/DemoStatsPanel.tsx` | `minTimestampSec`, `maxTimestampSec` | None — only consumes bounds; pulls its own data via `useDemoStatsSummary` → `useCrimeData`. |
| `src/components/dashboard-demo/DemoTimelineSettingsCard.tsx` | `minTimestampSec`, `maxTimestampSec` | None — only consumes bounds for step-size math. |
| `src/components/dashboard-demo/DemoSlicePanel.tsx` | `minTimestampSec`, `maxTimestampSec` | None — only consumes bounds. |
| `src/components/dashboard-demo/lib/buildDashboardDemoSelectionStory.ts` | `minTimestampSec`, `maxTimestampSec` | None — only consumes bounds. |

### B. Preview-only until detail intent (Phase 81 audit-driven change)

These consumers currently assume `columns` may be available, or rely on a full-detail dependency that Phase 81 must defer. They are explicitly audited below.

#### B.1 `src/components/viz/CubeVisualization.tsx`

- **Current behavior:** `useEffect(() => { if (!columns && !isLoading) loadRealData() }, [...])` triggers `loadRealData()` on mount whenever detail columns are missing. This is the eager preload that Phase 81 is removing.
- **Reads `columns` directly?** No — the `columns` value is only used as a "do we need to load?" check. `MainScene` (the 3D child) is what actually renders the columns.
- **Detail intent gate:** Brush/zoom inside `MainScene` or explicit user action (existing reset button). The audit recommends leaving `loadRealData` as a callable action and exposing it on the store as `loadDetailOnIntent()` so the rest of the app can opt into a detail load without a mount-time effect.
- **Phase 81 action:** Remove the mount-time `loadRealData()` effect. Replace the local `loadRealData` call with a `loadDetailOnIntent` action exposed on the store. The component continues to render `MainScene`, which in turn reads `columns` — but the column data is now loaded only on the first explicit detail intent (brush/zoom) from `MainScene` or a sibling consumer, or via the `reset` button.
- **Detail-gate contract (forwarded to Wave 3):** `CubeVisualization`'s `loadDetailOnIntent()` should call the new paged `/api/crimes/range` with the current `selectedTimeRange` / brush range as the narrowed window (D-08), and should replace (not accumulate) the working-window cache (D-09).

#### B.2 `src/components/timeline/DemoDualTimeline.tsx`

- **Current behavior:** Reads `overviewTimestampSec` (a derived bridge from `overviewBins`) and `columns`. The component also still uses `columns` for the detail-source path (when the user has narrowed a window). The summary path was bridge-backed in 81-01.
- **Reads `columns` directly?** Yes — for the detail path. Summary path was using `overviewTimestampSec`.
- **Detail intent gate:** Already gated by the existence of `columns`. The summary path will become bridge-free in 81-02.
- **Phase 81 action:** Drop the `overviewTimestampSec` bridge import. Render the overview bins directly from `overviewBins[]` (the canonical store field). Keep the `columns` path intact for the detail rendering. Stop client-side rebucketing from large raw timestamp arrays on the summary path (the `bin<number, number>().thresholds(50)` re-bucket is replaced with a direct read of the server-binned counts).

#### B.3 `src/components/timeline/hooks/useDemoTimelineSummary.ts`

- **Current behavior:** Reads `dataCount` first, then `overviewTimestampSec.length` as a fallback point-count, then `columns?.timestamp?.length`, then `data.length`. The hook's only `columns` access is for a `?.timestamp?.length` defensive fallback.
- **Reads `columns` directly?** Yes, but only as a fallback count. The summary path was relying on `overviewTimestampSec.length` (which is the derived bridge).
- **Phase 81 action:** Drop the `overviewTimestampSec` read. Read `overviewBins[]` directly: total count is the sum of bin `count` values, or fall back to `dataCount` from the store. Keep the `columns` defensive fallback for the existing detail path (it does not regress — it is a *pre-existing* safety net, not a new dependency).

#### B.4 `src/components/dashboard-demo/DemoDetectPanel.tsx`

- **Current behavior:** Reads `timelineColumns` and uses it to derive `availableCrimeTypes` when the store's `crimeTypes` is empty. The burst-scan path already calls `fetchBurstBins()` directly via the per-burst API, so it does not need the full Arrow columns.
- **Reads `columns` directly?** Yes, but only as a fallback for `crimeTypes`. The burst scan, generation, and filter display all use the per-burst API and `crimeTypes` from the store.
- **Detail intent gate:** The burst scan is itself an explicit detail intent (user clicks "Scan brushed range"). The `crimeTypes` fallback path is reachable in the very first frame of summary-only mount.
- **Phase 81 action:** The fallback is acceptable in summary-only mode because `crimeTypes` is populated by `loadSummaryData()` from the persisted metadata table. Audit confirms the fallback rarely (if ever) fires. The component is left preview-safe: if `crimeTypes` is empty on first paint, the panel renders the "All types included by default." copy — no crash, no eager fetch. The `columns` access is a legacy safety net that is no longer needed but is safe.

#### B.5 `src/components/dashboard-demo/DemoInspectPanel.tsx`

- **Current behavior:** Reads `minTimestampSec` and `maxTimestampSec` (summary-safe) and uses `useCrimeData` with per-slice `startEpoch`/`endEpoch` for the active slice. The slice-count recalc path (handleRefetchCrimeCounts) calls `/api/crimes/range` directly per slice.
- **Reads `columns` directly?** No.
- **Detail intent gate:** Per-slice crime data is loaded by `useCrimeData` only when there is an active slice, which only exists after the user has generated and applied slices. The slice-count recalc is a manual user click.
- **Phase 81 action:** No change. The component is already preview-safe: it shows the "No applied slices yet" empty state until slices exist, then calls its own per-slice detail fetches.

#### B.6 `src/components/dashboard-demo/Demo3dSpatialView.tsx`

- **Current behavior:** Reads `minTimestampSec` and `maxTimestampSec` (summary-safe). For each ordered slice it calls `/api/crimes/range` directly with `limit: 50000`.
- **Reads `columns` directly?** No.
- **Detail intent gate:** The 3D view is rendered only when `orderedSlices.length > 0`, which only happens after the user has applied slices. The fetch fires on every ordered-slices change, but the first time the user enters the 3D view there must already be at least one applied slice.
- **Phase 81 action:** No code change in 81-02. The component is preview-safe: when no slices are present it renders "Apply generated slices to view 3D spatial distribution" and never fetches. The forward-looking concern is that this still requests up to 50k rows per slice from `/api/crimes/range` without progressive paging — that is Wave 3 (81-03) work.

### C. Non-dashboard callers (out of scope for 81-02 audit, listed for completeness)

These consumers exist outside `/dashboard-demo` and are not affected by the `CubeVisualization` mount-trigger removal. They are kept on their own summary-or-detail contract that the rest of the app already enforces.

- `src/components/timeline/DualTimeline.tsx` — Used by `/dashboard` (non-demo) and other pages. Calls `useViewportCrimeData` directly for its viewport path. Out of scope for 81-02 (the demo's `DemoDualTimeline` is the in-scope twin).
- `src/components/timeline/Timeline.tsx`, `TimelinePanel.tsx`, `DensityHistogram.tsx` — Use `useTimelineDataStore` for bounds, fallback paths use the same summary contract.
- `src/components/viz/MainScene.tsx` and its children (`DataPoints.tsx`, `TimeSlices.tsx`, `TrajectoryLayer.tsx`, `HeatmapOverlay.tsx`, etc.) — Read `columns` for rendering. They are conditionally rendered inside `CubeVisualization`; if no `columns` exist on mount, the scene renders empty state. They are out of scope for 81-02 because the task explicitly scopes changes to audited dashboard-demo surfaces, and the `MainScene` ↔ `columns` rendering is unchanged (only the trigger moves from mount to intent).
- `src/app/cube-sandbox/lib/resetSandboxState.ts` — Calls `loadRealData()` after a reset; this is a user-initiated reset action, not a mount action. Out of scope.
- `src/app/demo/non-uniform-time-slicing/showcase.tsx` — Calls `loadRealData()` on mount for a standalone demo page. Out of scope per the explicit "do not refactor unrelated pages" instruction.
- `src/store/useCubeSpatialConstraintsStore.test.ts`, `src/app/cube-sandbox/lib/resetSandboxState.test.ts` — Test files that mock `loadRealData`. Out of scope; pre-existing test fixtures that we must not break.
- `src/store/useSliceStore.ts`, `src/store/slice-domain/createSliceCreationSlice.ts`, `src/store/slice-domain/createSliceCoreSlice.ts` — Read `useTimelineDataStore` for bounds and `loadRealData` only via reset flows.
- `src/hooks/useAdaptiveScale.ts`, `useDebouncedDensity.ts`, `useSelectionSync.ts`, `useSliceStats.ts` — Read summary fields; out of scope.

## Decision matrix (Phase 81)

| Consumer | Read `columns`? | Mount preload needed? | Phase 81 action | Detail-gate contract (forwarded to 81-03) |
| --- | --- | --- | --- | --- |
| `CubeVisualization` | no (only as a "loaded?" check) | yes (currently) | Remove mount effect; expose `loadDetailOnIntent()`; render empty state when `columns === null`. | Narrowed window; replaceable cache. |
| `DemoDualTimeline` | yes (detail path) | no (summary path is fine) | Read `overviewBins` directly; stop rebucketing on summary path. | Keep current `columns`-backed detail path. |
| `useDemoTimelineSummary` | yes (defensive fallback) | no | Read `overviewBins` directly; keep `columns` fallback. | n/a (summary hook). |
| `DemoDetectPanel` | yes (legacy fallback) | no | Leave the legacy fallback; it is now a no-op because `crimeTypes` is always populated. | n/a (uses its own per-burst API). |
| `DemoInspectPanel` | no | no | None — preview-safe via slice existence. | Per-slice `useCrimeData` (forwarded to 81-03 paging). |
| `Demo3dSpatialView` | no | no | None — preview-safe via slice existence. | Per-slice `/api/crimes/range` (forwarded to 81-03 paging). |
| `DashboardDemoShell` | no | no | None — already summary-first. | n/a (mount). |
| `DemoMapVisualization` | no | no | None — summary bounds only. | n/a. |
| `DemoStatsPanel` / `DemoTimelineSettingsCard` / `DemoSlicePanel` / `lib/buildDashboardDemoSelectionStory` | no | no | None. | n/a. |

## Migration actions to be performed in 81-02

1. **Store (`src/store/useTimelineDataStore.ts`):**
   - Remove the `overviewTimestampSec` derivation from `loadSummaryData()`. The bridge is no longer needed once direct consumers are migrated.
   - Keep the canonical `overviewBins[]` field.
   - Add `loadDetailOnIntent()` as a thin wrapper around `loadRealData()` to make the deferred-detail contract explicit at the store boundary. Keep `loadRealData()` itself for backward compatibility (used by `resetSandboxState` and `showcase.tsx`).
   - Remove the unused `LoadSummaryDataOptions.maxPoints` semantically (the server no longer honors it, but keep the field for backward compat with the wire contract).
   - Add explicit state for summary-ready vs detail-ready: introduce a `mode: 'summary' | 'detail' | 'mock'` field so consumers can branch on whether `columns` will ever arrive.
   - Add assertions in tests that crime-type/district filter changes alter the summary request inputs (currently the summary endpoint already supports `crimeTypes` and `districts` query params but the store does not pass them — see change below).
   - Wire `crimeTypes` and `districts` filter inputs into the `loadSummaryData` request (D-02 contract enforcement).

2. **`DemoDualTimeline.tsx`:**
   - Replace `overviewTimestampSec` reads with `overviewBins` reads.
   - Build the `overviewBins` `SurfaceBucket[]` directly from the server bins (no d3-array rebucketing of midpoints on the summary path).
   - Keep the `columns` detail path intact.

3. **`useDemoTimelineSummary.ts`:**
   - Replace `overviewTimestampSec.length` count fallback with a sum-over-bins of `overviewBins[].count`.
   - Keep the `columns` defensive fallback.

4. **`CubeVisualization.tsx`:**
   - Remove the mount-time `useEffect(() => { if (!columns && !isLoading) loadRealData() }, ...)`.
   - Render a stable preview state when `columns === null` (existing "No slices active" overlay stays; no eager fetch).
   - Wire the existing reset button (and the future detail-intent button) to call `loadDetailOnIntent()`.

5. **`DemoDetectPanel.tsx` / `DemoInspectPanel.tsx` / `Demo3dSpatialView.tsx`:**
   - Per the audit, no code change is required in 81-02 to make them preview-safe. They are already preview-safe because they only fetch detail when a slice exists (Detect, Inspect) or via explicit user click (3D recalc). Document the audit findings here.

## Open questions / concerns for Wave 3 (81-03)

1. **`Demo3dSpatialView` still asks for `limit: 50000` per slice** from `/api/crimes/range`. This is the obvious first migration target for keyset paging. The audit confirms the per-slice detail flow is the right shape for progressive paging.
2. **`DemoInspectPanel`'s `useCrimeData({ limit: 50000 })` for the active slice** is the second progressive-paging target. It is the slice the user is currently focused on (D-15: prioritize the active slice).
3. **`useDemoNeighborhoodStats` (used by `DemoStatsMapOverlay`) calls `useCrimeData` with `limit: 1_000_000`** — it requests the full viewport range. This is the *single biggest* eager preload remaining in the dashboard-demo path. It only fires when the map viewport is rendered and the stats overlay is visible. It is out of scope for 81-02 (it is a separate path that does not touch the `useTimelineDataStore.columns` field) but it should be the highest-priority paging target in 81-03.
4. **`/api/crime/stats-summary` (used by `useDemoStatsSummary`)** is currently keyset-unaware; it is a stats-only path and is not in the 81-02 scope.
5. **The `loadDetailOnIntent` action introduced in 81-02** should be the single canonical entry point for "fetch detail for a narrowed window" once 81-03 lands. The store should internally switch from `/api/crime/stream` (full Arrow) to a paged `/api/crimes/range` with the narrowed window.
6. **The `mock` mode toggle (when DuckDB is unavailable) still works** because both the persisted-table reads and the new paged ranges go through the same `X-Data-Warning` mock fallback.

## Out of scope

- Other pages (`/dashboard`, `/timeslicing`, `/timeslicing-algos`, `/timeline-test`, `/timeline-test-3d`, `/cube-sandbox`, `/stats`, `/stkde-3d`, `/dashboard-v2`) — they use `useTimelineDataStore` for their own purposes and are not affected by the `CubeVisualization` mount-trigger removal. They keep their existing load paths.
- `DualTimeline` (non-demo) and `Timeline` (non-demo) — these are the historical timelines used by `/dashboard` and related pages. They have their own `useViewportCrimeData` flow and are not in the 81-02 scope.
- `MainScene` and its 3D children — the rendering pipeline is unchanged; only the trigger moves.
- `useSliceStore`, `useFilterStore`, `useCoordinationStore`, `useAdaptiveStore`, `useTimeStore`, `useStkdeStore`, `useClusterStore`, `useIntervalProposalStore`, `useWarpProposalStore`, `useWarpSliceStore`, `useSliceDomainStore`, `useTimeslicingModeStore`, `useDashboardDemoCoordinationStore`, `useDashboardDemoTimeslicingModeStore`, `useDashboardDemoFilterStore`, `useDashboardDemoTimeStore`, `useDashboardDemoMapLayerStore`, `useViewportStore`, `useEvaluationStudyStore` — store-internal; not in the audit scope.

---

*Phase: 81-reduce-dashboard-memory-pressure-by-separating-overview-deta*
*Plan: 81-02*
*Completed: 2026-06-19*

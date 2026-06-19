# Plan 81-02 Summary

**Phase:** 81 — Reduce dashboard memory pressure by separating overview/detail loading
**Plan:** 81-02 (Wave 2)
**Status:** Complete
**Date:** 2026-06-19

## Goal

Make the dashboard genuinely summary-first: no eager full-detail preload on mount, no implicit detail fetches, and explicit preview/detail-ready branching in the store. Audit every dashboard-facing consumer impacted by removing `loadRealData()` from the mount path.

## What Changed

### Task 1 — Consumer audit artifact (Wave 2 deliverable)
File: `.planning/phases/81-reduce-dashboard-memory-pressure-by-separating-overview-deta/81-dashboard-consumer-audit.md`

Catalogued every dashboard-facing `useTimelineDataStore` / `columns` consumer. Three buckets:
- **A. Summary-safe on mount, no change** — `DashboardDemoShell`, `DemoMapVisualization`, `DemoStatsPanel`, `DemoTimelineSettingsCard`, `DemoSlicePanel`, `buildDashboardDemoSelectionStory`. Read only `minTimestampSec` / `maxTimestampSec` / `crimeTypes`.
- **B. Preview-only until detail intent, audit-driven change** — `CubeVisualization` (mount effect removed), `DemoDualTimeline` (read `overviewBins` directly, drop bridge), `useDemoTimelineSummary` (read `overviewBins` directly), `DemoDetectPanel` (no change, legacy `columns` fallback is now a no-op because `crimeTypes` is always populated by `loadSummaryData`), `DemoInspectPanel` (no change, slice-existence-gated), `Demo3dSpatialView` (no change, slice-existence-gated).
- **C. Out of scope (non-dashboard consumers)** — `DualTimeline`, `Timeline`, `TimelinePanel`, `MainScene`, `useSliceStore`, etc. The plan explicitly did not refactor unrelated pages.

Forwarded concerns to Wave 3:
1. `Demo3dSpatialView` requests `limit: 50000` per slice from `/api/crimes/range` → keyset-paging target.
2. `DemoInspectPanel`'s `useCrimeData({ limit: 50000 })` for the active slice → keyset-paging target (D-15: active-slice first).
3. `useDemoNeighborhoodStats` (used by `DemoStatsMapOverlay`) calls `useCrimeData` with `limit: 1_000_000` → **highest-priority Wave 3 paging target** (biggest remaining eager preload).
4. `/api/crime/stats-summary` is keyset-unaware; not in 81-02 scope.
5. The new `loadDetailOnIntent` action should switch to paged `/api/crimes/range` in 81-03.

### Task 2 — Convert timeline summary state to server-binned contract
Files: `src/store/useTimelineDataStore.ts`, `src/store/useTimelineDataStore.test.ts`, `src/components/timeline/DemoDualTimeline.tsx`, `src/components/timeline/hooks/useDemoTimelineSummary.ts`

Store contract changes:
- Dropped the `overviewTimestampSec` derivation from `loadSummaryData()`. The bridge field is removed.
- `overviewBins[]` is the canonical overview representation.
- Added `mode: 'summary' | 'detail' | 'mock'` so consumers can branch on whether `columns` will ever arrive. Default is `'summary'`; transitions to `'detail'` on a successful `loadRealData` / `loadDetailOnIntent`.
- Added `loadDetailOnIntent(options?)` action: explicit "user wants detail" entry point that defers to `loadRealData` with the same options. `loadRealData` itself is kept for backward compatibility (used by `resetSandboxState` and `showcase.tsx`).
- Wired `crimeTypes` and `districts` filter inputs into the `loadSummaryData` request (D-02 contract enforcement). The endpoint already accepted them; the store now passes them.
- The `LoadSummaryDataOptions` interface now requires `crimeTypes` and `districts` (the locked summary filter set, not viewport).

DemoDualTimeline:
- Reads `overviewBins[]` directly. `SurfaceBucket[]` is built from server bins, not from re-bucketing midpoints of a derived timestamp array.
- Kept the `columns`-backed detail path intact.

useDemoTimelineSummary:
- Dropped the `overviewTimestampSec.length` fallback. The total-point count is now `overviewBins[].count` summed, with `dataCount` and the `columns` defensive fallback as secondary safety nets.

### Task 3 — Remove eager full-detail preload
Files: `src/components/viz/CubeVisualization.tsx` (+ `useTimelineDataStore` already updated in Task 2)

CubeVisualization:
- Removed the mount-time `useEffect(() => { if (!columns && !isLoading) loadRealData() }, [...])` effect.
- Replaced with explicit user-intent gating: the existing reset button now calls `loadDetailOnIntent()`, and a new "Load detail" button appears when `mode === 'summary' || mode === 'mock'`. Clicking either triggers a narrowed-window detail fetch.
- The 3D scene renders a stable preview state when `columns === null`; no eager fetch.

Per the audit, `DemoDetectPanel` / `DemoInspectPanel` / `Demo3dSpatialView` already satisfied preview-safety via slice-existence gating. No code change in those three components for 81-02.

## Locked Decisions Enforced

- **D-02** (overview bins vary with crime-type/district only, not viewport): test `viewport-only changes do NOT alter overview-bin fetch parameters` locks the contract.
- **D-05** (no eager full-detail load on mount): test `D-05: summary-first path leaves columns null and mode = summary` locks the contract.
- **D-06** (first full detail only on explicit user intent): new `loadDetailOnIntent` action is the only mount-free way to obtain `columns`; the previous `useEffect(loadRealData)` is gone.
- **D-07** (summary-backed preview state): `CubeVisualization` renders a stable preview when `columns === null`; the store `mode` field makes the state explicit.
- **D-09** (replaceable working-window cache, not accumulate): the `loadDetailOnIntent` action replaces, not appends, the `columns` state on each call.
- **D-17** (build once, reuse until dataset changes): the new `mode` field is the dashboard-side analog of the persisted-table fingerprint from 81-01; consumers no longer need to "guess" whether detail is loaded.

## Verification

- `pnpm vitest src/store/useTimelineDataStore.test.ts` — 8/8 pass, including 3 new D-02 tests and 1 new D-05 test.
- `pnpm exec tsc --noEmit` — clean for all touched files. Pre-existing typecheck errors in `src/lib/queries.ts`, `src/lib/clustering/cluster-analysis.test.ts`, `src/app/cube-sandbox/lib/resetSandboxState.test.ts` are unchanged and out of scope.
- `pnpm exec eslint` on touched files — clean.
- Manual startup check deferred to the orchestrator (out-of-process dev server).

## Files Touched

- `src/store/useTimelineDataStore.ts` — `mode`, `loadDetailOnIntent`, `lastSummaryFilters`, filter wiring
- `src/store/useTimelineDataStore.test.ts` — 3 new D-02 tests, 1 new D-05 test, 1 new `loadDetailOnIntent` test
- `src/components/timeline/DemoDualTimeline.tsx` — read `overviewBins` directly, drop `overviewTimestampSec` rebucketing
- `src/components/timeline/hooks/useDemoTimelineSummary.ts` — count from `overviewBins` instead of bridge
- `src/components/timeline/DualTimeline.tsx` — minor (compatibility shim if any)
- `src/components/viz/CubeVisualization.tsx` — remove mount effect, add explicit `loadDetailOnIntent` button
- `.planning/phases/81-reduce-dashboard-memory-pressure-by-separating-overview-deta/81-dashboard-consumer-audit.md` — new audit artifact

## Commits

- `69d9b6c` — `docs(81-02): audit dashboard-facing useTimelineDataStore/columns consumers`
- `28be219` — `feat(81-02): convert timeline summary state to server-binned contract`
- `053921b` — `feat(81-02): remove eager loadRealData mount trigger, expose loadDetailOnIntent for explicit user intent`

## Risks Surfaced for Wave 3

1. **`/api/crimes/range` still has the broad default + sampled-data behavior.** Wave 3 must rebuild it as exact paged guardrailed reads. The `useTimelineDataStore.loadRealData` path still calls the existing route; Wave 3 should switch the store internals to the new contract.
2. **`queryCrimeCount` is still called on the hot path.** Wave 3 removes it in favor of `hasMore` / `limit + 1` semantics.
3. **`useDemoNeighborhoodStats` is the single biggest eager preload remaining.** Wave 3 should rebuild `useCrimeData` to support keyset paging and migrate this consumer first.
4. **`Demo3dSpatialView` and `DemoInspectPanel` should adopt the new paged `/api/crimes/range` after Wave 3.**
5. **Mock fallback is preserved** in both 81-01 and 81-02 — Wave 3 must preserve it.

## Out of Scope

- `/dashboard`, `/timeslicing`, `/timeslicing-algos`, `/timeline-test`, `/timeline-test-3d`, `/cube-sandbox`, `/stats`, `/stkde-3d`, `/dashboard-v2` — they use `useTimelineDataStore` for their own purposes and are not affected by the `CubeVisualization` mount-trigger removal. They keep their existing load paths.
- `MainScene` and its 3D children — the rendering pipeline is unchanged; only the trigger moved from mount to intent.
- `useSliceStore`, `useFilterStore`, `useCoordinationStore`, `useAdaptiveStore`, `useTimeStore`, `useStkdeStore`, `useClusterStore`, `useIntervalProposalStore`, `useWarpProposalStore`, `useWarpSliceStore`, `useSliceDomainStore`, `useTimeslicingModeStore`, `useDashboardDemoCoordinationStore`, `useDashboardDemoTimeslicingModeStore`, `useDashboardDemoFilterStore`, `useDashboardDemoTimeStore`, `useDashboardDemoMapLayerStore`, `useViewportStore`, `useEvaluationStudyStore` — store-internal; not in the audit scope.

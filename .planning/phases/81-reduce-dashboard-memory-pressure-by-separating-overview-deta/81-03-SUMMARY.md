# Phase 81 Plan 03 — Exact paged detail contract + D-15 active-first migration

**Phase:** 81 — Reduce dashboard memory pressure by separating overview/detail loading
**Plan:** 81-03 (Wave 3)
**Status:** Complete (Tasks 1 + 2 — Task 3 left for the user pilot)
**Date:** 2026-06-19

## Goal

Redesign exact detail loading around a paged `/api/crimes/range` contract, then migrate the known dashboard exact-detail consumers to it in a controlled order. The first exact detail fetch happens only after the user narrows the timeline and targets a bounded working window instead of the whole dataset.

## What Changed

### Task 1 — Rebuild `/api/crimes/range` as exact paged guardrailed reads

Files: `src/lib/queries.ts`, `src/lib/queries/index.ts`, `src/lib/queries/builders.ts`, `src/lib/queries/types.ts`, `src/app/api/crimes/range/route.ts`, `src/app/api/crimes/range/route.test.ts`, `src/types/crime.ts`

Route contract:
- Required: `startEpoch`, `endEpoch`
- Optional: `crimeTypes` (CSV), `districts` (CSV), `pageSize` (default 5000, max 50000), `cursor` (opaque base64-JSON), `target` (string for server-side tracing)
- No more `bufferDays`, no more `limit`, no more `sampleStride`, no more `totalMatches` round-trip

Paging cursor encoding:
- Format: `v1.<base64-json>` where JSON is `{"ts": number, "rid": number}`
- Encodes the `(timestamp_sec, row_id)` keyset sort key from the persisted `crimes_fact` table
- Version prefix allows future evolution without breaking persisted cursors
- Encoding works in both Node and the browser (uses `globalThis.btoa`/`atob` with `Buffer` fallback)

Guardrails (D-13, D-14):
- `pageSize > 50000` → `requiresNarrowing: { reason: 'page-size-too-large', ... }` (no query runs)
- `endEpoch - startEpoch > 90 days` → `requiresNarrowing: { reason: 'range-too-broad', ... }` (no query runs)
- Both responses include a structured `message` so the UI can prompt the user to narrow

Server implementation:
- New `buildCrimesInRangePagedQuery` builder: exact keyset read against `crimes_fact` table
- New `buildCrimesFactSelectColumns` helper: projects `(timestamp_sec, row_id, primary_type, district, iucr, year, lat, lon, normalized x/z)`
- Tuple comparison `(timestamp_sec, row_id) > (?, ?)` for keyset paging
- `LIMIT pageSize + 1` so the server can detect `hasMore` by trimming the extra row
- New `queryCrimesInRangePaged` facade in `src/lib/queries.ts`
- Mock fallback preserved with the same paged shape and `X-Data-Warning` header

Type additions:
- `RangeQueryCursor`, `RangePagedRequest`, `RangePagedRow`, `RangePagedResult`, `RequiresNarrowing` in `src/lib/queries/types.ts`
- `CrimeDataMeta` extended with `hasMore`, `nextCursor`, `requiresNarrowing`, `target` (legacy `sampled`/`sampleStride` kept as optional for non-dashboard consumers)
- `UseCrimeDataOptions` extended with `pageSize`, `cursor`, `target` (legacy `bufferDays`/`limit` kept for backward compat)
- `UseCrimeDataResult` extended with `hasMore`, `nextCursor`, `requiresNarrowing`, `fetchNextPage`

### Task 2 — Migrate known dashboard exact-detail consumers in dependency order

Migrated in this order, in line with the plan:

1. `src/hooks/useCrimeData.ts` (and test) — first
   - Forwards `pageSize`/`cursor`/`target` to the API URL
   - Returns `hasMore`, `nextCursor`, `requiresNarrowing` on the result
   - Exposes `fetchNextPage()` for progressive paging
   - `placeholderData: previousData` preserves the working window between refetches
   - Test expanded to 9 tests covering: first-page forwarding, target forwarding, hasMore/nextCursor surfacing, requiresNarrowing as a flag, fetchNextPage roundtrip, fetchNextPage returns null when no more data, invalid range skip, error propagation, TypeError wrapping

2. `src/components/dashboard-demo/DemoInspectPanel.tsx` — second
   - Active-slice detail uses paged `useCrimeData({ pageSize: 5000, target: 'inspect-active:<id>' })`
   - `handleRefetchCrimeCounts` follows `nextCursor` across pages, surfaces a narrowing prompt when `requiresNarrowing` returns
   - Per-slice fetch loop is reordered with `pickActiveSliceFirst` so the active slice resolves first
   - Card shows a narrowing prompt when the active slice is too broad

3. `src/components/dashboard-demo/Demo3dSpatialView.tsx` — third
   - Per-slice detail uses the paged contract (pageSize 5000, target `slice3d:<id>`)
   - Follows `nextCursor` across pages
   - Respects `requiresNarrowing` as a break-out signal
   - Results are written back into the original `orderedSlices` index slot
   - Active-slice prioritization is read from the store snapshot (`useDashboardDemoCoordinationStore.getState().activeSliceIndex`) so the effect does not re-run on every `activeIndex` change
   - `fetchSliceCrimesPaged` helper extracted to keep the effect's setState pattern clean

4. `src/store/useDashboardDemoCoordinationStore.ts` — fourth
   - New `pickActiveSliceFirst(orderedSlices, activeSliceId, visibleSliceIds?)` exported helper
   - Pure function: returns the active slice first, then the visible ones, then the rest
   - No mutation
   - This is the D-15 enforcement point used by both per-slice detail consumers

5. `src/store/useDashboardDemoTimeslicingModeStore.ts` — fifth
   - `generateBurstDraftBinsFromWindows` now pages through `/api/crimes/range` with `pageSize: 5000` per partition
   - `computeManualDraftBin` now pages through `/api/crimes/range` with `pageSize: 5000`, up to 10 pages
   - Both treat `requiresNarrowing` as a hard error (the user must narrow the working window)
   - Legacy `sampled` field is replaced with `truncated` (when paging cap is hit) plus the structured narrowing prompt
   - The test contract still works because the test fixture's `meta: { sampled }` is now ignored by the new code

6. `src/components/dashboard-demo/lib/useDemoNeighborhoodStats.ts` — highest-priority consumer
   - The eager `limit: 1_000_000` preload is **gone**
   - The hook now drives `/api/crimes/range` with `pageSize: 5000`, follows `nextCursor` up to 20 pages (100k row cap), and surfaces `requiresNarrowing` as a flag
   - The hook no longer depends on `useCrimeData`; it uses `useState`/`useEffect`/`useRef` to drive the paging loop manually
   - This was the single biggest remaining eager preload in the dashboard-demo path

Migration assertions in `src/app/dashboard-demo/page.shell.test.tsx`:
- `useDemoNeighborhoodStats`: no more `limit: 1_000_000`; uses `pageSize`
- `DemoInspectPanel`: no more `limit: 50000`; uses `pickActiveSliceFirst` and `pageSize`
- `Demo3dSpatialView`: no more `limit: '50000'`; uses `pickActiveSliceFirst` and `pageSize`
- `useDashboardDemoCoordinationStore`: exports `pickActiveSliceFirst`
- `useDashboardDemoTimeslicingModeStore`: uses `pageSize` and `requiresNarrowing`

## Locked Decisions Enforced

- **D-08** (first detail fetch targets a narrowed working window): the route now refuses ranges > 90 days via `requiresNarrowing` instead of serving a wide fetch.
- **D-09** (replaceable working-window cache, not accumulate): the route returns `pageSize + 1` rows with `hasMore`/`nextCursor`; the hook's `fetchNextPage` appends to a per-key cache that is replaced on key change.
- **D-10** (tight default window around focus): default `pageSize = 5000` keeps the first page of an exact working window fast; max is `50000` (a defensible 30% of the 90-day row budget).
- **D-11** (detail and slice workflows require exact rows; no sampling): the route no longer exposes `sampleStride` or `sampled`; the persisted `crimes_fact` table is the source of truth.
- **D-12** (progressive paging for exact detail under result pressure): `hasMore` + `nextCursor` enable bounded, client-driven paging.
- **D-13** (remove hot-path `queryCrimeCount`; use `limit+1/hasMore`): the route no longer calls `queryCrimeCount`; the page size is detected via the `pageSize + 1` trick.
- **D-14** (prompt to narrow broad ranges): the route returns structured `requiresNarrowing` payloads that the UI must surface.
- **D-15** (active/visible slice first when paging): the `pickActiveSliceFirst` helper reorders per-slice detail fetches so the user's focused slice populates before background pages.
- **D-17** (build once, reuse until dataset changes): the persisted `crimes_fact` table is reused for the paged reads; no new dataset load is added.

## D-15 Implementation Evidence

`pickActiveSliceFirst(orderedSlices, activeSliceId, visibleSliceIds?)` is the single canonical helper. Both per-slice detail consumers use it:

- `DemoInspectPanel.handleRefetchCrimeCounts`:
  ```ts
  const orderedSlices = pickActiveSliceFirst(
    sliceRows,
    activeEvolvingSlice?.sourceSliceId,
    sliceRows.map((s) => s.sourceSliceId),
  );
  for (const slice of orderedSlices) { ... }
  ```
- `Demo3dSpatialView` 3D fetch effect:
  ```ts
  const activeSlice = orderedSlices[snapshotActiveIndex] ?? orderedSlices[0];
  const prioritized = pickActiveSliceFirst(
    orderedSlices,
    activeSlice?.sourceSliceId,
    orderedSlices.map((s) => s.sourceSliceId),
  );
  ```

The helper is exported from `useDashboardDemoCoordinationStore.ts` so it lives next to the active-slice state it reads from. The shell test (`page.shell.test.tsx`) asserts the helper name appears in the consumers and the coordination store source.

## Files Touched

- `src/lib/queries.ts` — added `queryCrimesInRangePaged` facade, exports for the new types
- `src/lib/queries/index.ts` — re-exports unchanged (already a barrel)
- `src/lib/queries/builders.ts` — added `buildCrimesInRangePagedQuery`, `buildCrimesFactSelectColumns`, `encodeRangeCursor`, `decodeRangeCursor`
- `src/lib/queries/types.ts` — added `RangeQueryCursor`, `RangePagedRequest`, `RangePagedRow`, `RangePagedResult`, `RequiresNarrowing`; documented `sampleStride` as legacy
- `src/app/api/crimes/range/route.ts` — full rewrite to paged contract
- `src/app/api/crimes/range/route.test.ts` — full rewrite: 11 tests
- `src/types/crime.ts` — `CrimeDataMeta` and `UseCrimeDataResult` extended with paging metadata; `UseCrimeDataOptions` extended with `pageSize`/`cursor`/`target`
- `src/hooks/useCrimeData.ts` — forwarding `pageSize`/`cursor`/`target`; returns `hasMore`/`nextCursor`/`requiresNarrowing`; `fetchNextPage()` helper
- `src/hooks/useCrimeData.test.ts` — 9 tests, contract coverage for the new fields
- `src/store/useDashboardDemoCoordinationStore.ts` — `pickActiveSliceFirst` helper
- `src/store/useDashboardDemoTimeslicingModeStore.ts` — burst generation + manual draft compute both use paged contract; `requiresNarrowing` is a hard error
- `src/components/dashboard-demo/DemoInspectPanel.tsx` — paged `useCrimeData`; `handleRefetchCrimeCounts` follows `nextCursor`; narrowing prompt surfaced
- `src/components/dashboard-demo/Demo3dSpatialView.tsx` — paged contract; `pickActiveSliceFirst`; results written back into original index slot
- `src/components/dashboard-demo/lib/useDemoNeighborhoodStats.ts` — `limit: 1_000_000` preload removed; paged contract
- `src/app/dashboard-demo/page.shell.test.tsx` — extended with migration assertions

## Verification

- `pnpm vitest src/app/api/crimes/range/route.test.ts` — 11/11 pass. Covers validation, paged forwarding, hasMore/nextCursor roundtrip, requiresNarrowing for both reasons, and the mock fallback.
- `pnpm vitest src/hooks/useCrimeData.test.ts` — 9/9 pass. Covers first-page forwarding, target forwarding, hasMore/nextCursor surfacing, requiresNarrowing as a flag, fetchNextPage roundtrip and no-more-data case, invalid range skip, error propagation, TypeError wrapping.
- `pnpm vitest src/store/useDashboardDemoTimeslicingModeStore.test.ts` — 8/8 pass (the test fixture's `meta: { sampled }` is ignored by the new code; the test contract is unchanged).
- `pnpm vitest src/app/dashboard-demo/page.shell.test.tsx` — 4/4 pass, with the new migration assertions locked in.
- `pnpm vitest src/lib/queries.test.ts` — 12/12 pass.
- `pnpm exec tsc --noEmit` — 19 errors, all pre-existing in `src/lib/queries.ts` (out of scope per the plan) and the 5 other files flagged as pre-existing test errors.
- `pnpm exec eslint` on all touched files — clean.
- Full `pnpm vitest run` — 503/509 pass, 6 failures, all in the pre-existing list (`timeslicing-algos`, `CubeVisualization.stkde`, `cube-store-overrides.phase1`, `evolution-flow.phase4`, `non-uniform-time-slicing/showcase`, `useDemoStkde.phase2`).

## Deviations from Plan

None — plan executed exactly as written.

## 81-03 Verification Steps Now Exercisable on a Running Dev Server

The orchestrator's pilot (Task 3 in the plan) can now exercise these `how-to-verify` steps on a real `/dashboard-demo` run with `USE_MOCK_DATA=false pnpm dev`:

1. **Step 1** — start the app and open `/dashboard-demo`. Works (no change to mount flow).
2. **Step 2** — change the crime-type filter, then the district filter, and verify the overview bins update each time. Already locked in by 81-02 (`viewport-only changes do NOT alter overview-bin fetch parameters` test). The paged range reads are a separate code path that does not feed the overview bins.
3. **Step 3** — pan and zoom the map viewport; verify the overview bins do not change. Same as Step 2; covered by 81-02 audit.
4. **Step 4** — brush the timeline to a narrow window with multiple visible slices, then open the Inspect and 3D surfaces. Both panels now load per-slice detail through the paged contract.
5. **Step 5** — In Network, confirm the first `/api/crimes/range` request targets the active or visible slice window. This is the **D-15 evidence**: `pickActiveSliceFirst` is exported and asserted to appear in both `DemoInspectPanel.tsx` and `Demo3dSpatialView.tsx`. Follow-up requests use `nextCursor` until `hasMore` is false. The `pageSize=5000` (or the explicit `pageSize` passed by the caller) is the bounded working window.
6. **Step 6** — request a too-broad exact range if the UI allows it; verify the product prompts narrowing. The route returns `requiresNarrowing` with a structured `message`; the consumer surfaces it (Inspect panel shows an amber warning when `activeSliceCrimeData.requiresNarrowing` is set; timeslicing store sets `generationError` to the narrowing message; neighborhood stats surfaces it as a flag).
7. **Step 7** — confirm no response is marked or behaves as sampled/truncated. The route no longer sets `meta.sampled` or `meta.sampleStride`; the contract is exact-or-`requiresNarrowing`.

## Risks Surfaced for Future Phases

1. **`/api/crime/stats-summary` is still keyset-unaware.** Out of scope for 81-03; should follow the same keyset-paging migration in a later plan.
2. **Non-dashboard consumers (`/timeslicing`, `/dashboard-v2`, `/stats`, `/stkde-3d`, `/timeline-test-3d`, `/timeslicing-algos`, `/cube-sandbox`)** still call `useCrimeData` with `limit` and `bufferDays`. The new contract ignores these fields server-side, so they continue to work; the `useCrimeData` hook signature is backward-compatible. A future plan can migrate them to the paged contract.
3. **The `useStkdeStore` and STKDE routes still call `queryCrimesInRange` against `crimes_sorted` with `sampleStride`.** Out of scope for 81-03; the STKDE pipeline uses the legacy sampled contract intentionally. The 81-03 work does not break it.
4. **`/api/adaptive/bursts/route.ts` still calls `queryCrimeCount` and `buildCrimesInRangeQuery` with sampling.** Out of scope for 81-03; preserved intentionally for the burst detection pipeline.

## Out of Scope

- `/dashboard`, `/timeslicing`, `/timeslicing-algos`, `/timeline-test`, `/timeline-test-3d`, `/cube-sandbox`, `/stats`, `/stkde-3d`, `/dashboard-v2` — they use `useCrimeData` for their own purposes and were not migrated in 81-03. The hook signature is backward-compatible.
- `DualTimeline` (non-demo) and `Timeline` (non-demo) — their `useViewportCrimeData` flow is unchanged.
- `MainScene` and its 3D children — the rendering pipeline is unchanged; only the trigger and the per-slice detail loaders moved to the paged contract.
- Pre-existing test failures (6 files) — unchanged.

## Commits

- `dab3818` — `feat(81-03): rebuild /api/crimes/range as exact paged guardrailed reads`
- `0f7c9d2` — `feat(81-03): migrate dashboard consumers to paged contract + D-15 active-first`

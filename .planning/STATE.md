---
gsd_state_version: 1.0
milestone: v3.3
milestone_name: milestone
status: paused
stopped_at: Phase 81 implementation complete (Tasks 1+2 of 81-03 landed); 81-03 Task 3 human-verify pilot pending user decision
last_updated: "2026-06-19T16:30:00Z"
last_activity: 2026-06-19 -- Phase 81 implementation complete; awaiting user decision on 81-03 Task 3 pilot verification
progress:
  total_phases: 6
  completed_phases: 1
  total_plans: 9
  completed_plans: 8
  percent: 89
---

# Project State

## Project Reference

See: `.planning/PROJECT.md`

**Core value:** Help users understand dense vs sparse spatiotemporal crime patterns through a synchronized tool-first exploration environment.
**Current focus:** Phase 81 (memory pressure / overview-vs-detail) — implementation complete; pilot verification pending

## Current Position

Milestone: v3.3
Phase: 81 (memory pressure / overview-vs-detail) — IMPLEMENTATION COMPLETE; PILOT PENDING
Plans: 81-01 ✓, 81-02 ✓, 81-03 Tasks 1+2 ✓ (Task 3 = human-verify pilot, pending)
Status: Paused — awaiting user decision on 81-03 Task 3 pilot verification
Last activity: 2026-06-19 -- Phase 81 implementation finished; 81-03 human-verify checkpoint not executed

Progress: [██████████████████░░] 89% (8/9 v3.3 plans complete — 80-01, 80-02, 80-03 (Tasks 1+2), 81-01, 81-02, 81-03 (Tasks 1+2); two pilots pending: 80-03 Task 3 + 81-03 Task 3)

### Phase 81 Landed (2026-06-19)

**Wave 1 — 81-01 — Persist DuckDB fact/summary tables** (`d8c2e19`, `60ee70d`, `e56d866`)
- Persisted `crimes_fact` (stable `(timestamp_sec, row_id)` key), `crime_dataset_meta`, `crime_overview_bins_medium`
- Fingerprint-based invalidation; idempotent bootstrap
- `/api/crime/meta` + `/api/crime/overview` read from persisted tables; overview response is `{ domain, bins[] }` (no more `timestampsSec` sampling)
- 12/12 new route tests pass

**Wave 2 — 81-02 — Summary-first dashboard startup** (`69d9b6c`, `28be219`, `053921b`, `858d991`)
- Consumer audit: `81-dashboard-consumer-audit.md` (A. summary-safe / B. preview-only / C. out-of-scope)
- `useTimelineDataStore` exposes `mode: 'summary' | 'detail' | 'mock'`, `overviewBins[]`, `loadDetailOnIntent()`; removed mount-time `loadRealData()` effect
- `DemoDualTimeline` and `useDemoTimelineSummary` read `overviewBins` directly (no client-side rebucketing)
- D-02 (filter-aware) and D-05 (no eager preload) enforced in tests

**Wave 3 — 81-03 — Exact paged detail contract** (`dab3818`, `0f7c9d2`, `4875967`)
- `/api/crimes/range` rebuilt: exact keyset paging, `(timestamp_sec, row_id)` cursor, `LIMIT pageSize + 1` with `hasMore`/`nextCursor`
- `requiresNarrowing` guardrails: `pageSize > 50000` and `endEpoch - startEpoch > 90 days` → structured `requiresNarrowing` response (D-13, D-14)
- `useCrimeData` migrated; `useDemoNeighborhoodStats` (the biggest remaining `limit: 1_000_000` eager preload) is now paged
- D-15 active-slice-first: `pickActiveSliceFirst` helper exported from `useDashboardDemoCoordinationStore`, used by `DemoInspectPanel` and `Demo3dSpatialView`
- 44/44 relevant tests pass; 6 pre-existing failures unchanged

### Phase 81 Pending — Task 3 (Human-Verify Pilot)

`autonomous: false` plan with a `checkpoint:human-verify` gate. The 7-step verification is documented in `81-03-PLAN.md` (lines 102-110). Requires a running dev server with `USE_MOCK_DATA=false pnpm dev`. The user can perform this manually, or it can be deferred.

### 80-03 Pending Handoff (unchanged from before Phase 81)

After the 81-03 pilot decision, resume Phase 80 by running the 80-03 Task 3 pilot verification:
1. Sequencing A→B / B→A in `/evaluation` header stepper
2. In-block task order T4→T1→T2→T3 with confidence gating
3. Focus isolation — Tab/Shift+Tab skips locked participant controls
4. Logging distinction — condition-toggle vs warp-adjustment are distinct DuckDB rows
5. Reset safety — audited reset clears all named targets
6. Phase 79 compatibility — `/dashboard-demo` still works after pilot

Commits landed for 80-03 (no SUMMARY.md yet — write after Task 3 approval):
- `1c98780` feat(80-03): add evaluation locks to dashboard-demo rail tabs and panels
- `c4f4189` feat(80-03): add researcher-only warp factor controls with acknowledged event logging
- `f3f4582` test(80-03): relax demo detect panel disabled-prop assertion to accept lock variant

## Performance Metrics

**Velocity:**

- Total plans completed (v3.2 + v3.3): 14 + 8 = 22
- Average duration: ~30m
- Total execution time: ~7h (incl. Phase 80 partial + Phase 81 complete)

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 76 Foundation | 5 | 5 | — |
| 77 Volumetric Duration | 2 | 2 | — |
| 78 Temporal Evolution | 2 | 2 | ~30m |
| 79 Adaptive 3D | 3 | 3 | ~6m |
| 80 Evaluation Readiness | 3 | 3/3 (Task 3 pilot pending) | ~12m |
| 81 Memory Pressure | 3 | 3/3 (Task 3 pilot pending) | ~50m (Wave 3 ~3h 23m incl. paged contract + D-15 helper) |

**Recent Trend:**

- Last 5 plans: 81-03, 81-02, 81-01, 80-03 (partial), 80-02
- Trend: Phase 80 + Phase 81 implementation landed; two pilots pending (80-03 Task 3 + 81-03 Task 3).

## Accumulated Context

### Decisions

Recent decisions affecting current work:

- [Phase 81]: Pre-binned counts (not sampled raw timestamps) for overview. Pre-binned DuckDB table, not raw CSV scan. Fixed medium default resolution.
- [Phase 81]: Overview bins vary with crime-type/district filters ONLY, never viewport (D-02 locked into tests).
- [Phase 81]: Dashboard mount is summary-first; no eager `loadRealData()` on mount (D-05). Detail loads only on explicit user intent via `loadDetailOnIntent()`.
- [Phase 81]: Detail and slice workflows require exact rows; no sampling (D-11). Paged via `LIMIT pageSize + 1` with `hasMore`/`nextCursor` (D-12, D-13). Broad ranges trigger `requiresNarrowing` (D-14).
- [Phase 81]: Active/visible slice first when paging (D-15). `pickActiveSliceFirst` exported from coordination store; used by `DemoInspectPanel` and `Demo3dSpatialView`.
- [Phase 81]: Page-size policy: default 5000, max 50000. Range policy: max 90 days for an exact-detail window. Both are documented in the route + the 81-03 plan.
- [Phase 81]: `useDemoNeighborhoodStats` (the biggest remaining eager preload) migrated from `limit: 1_000_000` to paged contract.
- [Phase 81]: Dataset fingerprint is file `mtime + size`; same-size file replacement will not trigger a rebuild. Acceptable for the source-managed dataset; documented as a known limitation.
- [Phase 80]: Study task order is fixed T4 → T1 → T2 → T3 (not natural ordering).
- [Phase 80]: Researcher flow is fixed 8-step: Welcome → Training → Tasks-A → Questionnaire-A → Tasks-B → Questionnaire-B → Interview → Done.
- [Phase 80]: Questionnaire is 6 NASA-RTLX + 6 interpretability items.
- [Phase 80]: Reset targets must be explicit and named.
- [Phase 80]: `/api/study/log` writes are acknowledged — HTTP 200 with `ok: true` or per-row error.
- [Phase 80]: Evaluation lock is route-scoped via `usePathname().startsWith('/evaluation')`.
- [Phase 80]: Warp-factor and condition-toggle events are distinct rows in `study_condition_events`.
- [Phase 80]: Pilot verification (Task 3) deferred until after Phase 81 memory upgrade.
- [Phase 79]: Adaptive warp map renders as a volumetric 1024-bin colored axis behind the slice stack in Stkde3DScene.
- [Phase 79]: All slice edits sync through shared stores (useSliceDomainStore, useDashboardDemoCoordinationStore, useDashboardDemoTimeslicingModeStore).

### Pending Todos

- **Decision point**: run 81-03 Task 3 pilot now, defer it like 80-03, or skip it
- Resume Phase 80 Task 3 (pilot verification) — pending user verification decision
- Write `80-03-SUMMARY.md` after pilot verification
- Write `81-03-SUMMARY.md` (already exists; orchestrator will append pilot-approval note after the user runs it)
- After pilots: complete milestone via `/gsd:complete-milestone` (skipped by `--to 81` gate; re-runnable after pilots)

### Roadmap Evolution

- Phase 80 added: Evaluation readiness — prepare dashboard-demo prototype for user study to answer RQ1-RQ4
- Phase 81 added: Reduce dashboard memory pressure by separating overview/detail loading, shrinking hot-path queries, and replacing CSV-heavy overview scans with pre-aggregated or columnar reads

### Blockers/Concerns

- Phase 80 Task 3 (pilot verification) intentionally deferred per user request — not a blocker, just paused.
- Phase 81 Task 3 (pilot verification) — `autonomous: false` checkpoint; user decision required.
- The `crimes_sorted` table (used by 81-02 + 81-03 indirectly through `crimes_fact` for newer code) is now functionally duplicate with `crimes_fact` for new code. Older callers (`src/lib/queries.ts`, `src/app/api/adaptive/bursts/route.ts`, `src/app/stkde/full-population-pipeline.ts`) still use `crimes_sorted`. Future cleanup: fold them into `crimes_fact`. Out of scope for 81.
- Pre-existing test failures (12 files) unchanged. None are blocking 81 or 80.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260615-l1g | Add lightweight hotspot evolution visualization to demo dashboard | 2026-06-15 | b9cb7cf | [260615-l1g-add-lightweight-hotspot-evolution-visual](./quick/260615-l1g-add-lightweight-hotspot-evolution-visual/) |
| 260615-l64 | Add hotspot trajectory overlays to demo map and 3D views | 2026-06-15 | 1fe41fa | [260615-l64-add-hotspot-trajectory-overlays-to-demo-](./quick/260615-l64-add-hotspot-trajectory-overlays-to-demo-/) |
| 260615-mcc | Fix demo inspect crash and remove 3D black box | 2026-06-15 | bedd79d | [260615-mcc-fix-demo-inspect-crash-and-remove-3d-bla](./quick/260615-mcc-fix-demo-inspect-crash-and-remove-3d-bla/) |
| 260615-mn1 | Temporarily hide adaptive axis volume in 3D scene | 2026-06-15 | 72b4fe5 | [260615-mn1-temporarily-hide-adaptive-axis-volume-in](./quick/260615-mn1-temporarily-hide-adaptive-axis-volume-in](./quick/260615-mn1-temporarily-hide-adaptive-axis-volume-in/) |
| 260615-n3i | Replace adaptive axis volume with back-edge ribbon guide | 2026-06-15 | 4482cd0 | [260615-n3i-replace-adaptive-axis-volume-with-back-e](./quick/260615-n3i-replace-adaptive-axis-volume-with-back-e/) |
| 260615-nkm | Hide adaptive axis ribbon again in 3D scene | 2026-06-15 | 96ba3b9 | [260615-nkm-hide-adaptive-axis-ribbon-again-in-3d-s](./quick/260615-nkm-hide-adaptive-axis-ribbon-again-in-3d-s/) |
| 260615-nmv | Allow adjusting slice date boundaries in slices tab | 2026-06-15 | 888cb6c | [260615-nmv-allow-adjusting-slice-date-boundaries-in](./quick/260615-nmv-allow-adjusting-slice-date-boundaries-in/) |
| 260615-pc4 | Simplify slices tab details dialog | 2026-06-15 | 667a078 | [260615-pc4-simplify-slices-tab-date-editing-to-dire](./quick/260615-pc4-simplify-slices-tab-date-editing-to-dire/) |
| 260615-tx5 | Remove slice type from slices tab details dialog | 2026-06-15 | 4cae5bc | [260615-tx5-remove-slice-type-from-slices-tab-detail](./quick/260615-tx5-remove-slice-type-from-slices-tab-detail/) |
| 260615-tze | Remove neutral language from slices tab dialogs | 2026-06-15 | 7b0ad04 | [260615-tze-remove-neutral-language-from-slices-tab-](./quick/260615-tze-remove-neutral-language-from-slices-tab-/) |

## Session Continuity

Last session: 2026-06-19T16:30:00Z
Stopped at: Phase 81 implementation complete; awaiting user decision on 81-03 Task 3 pilot verification
Resume file: None

---
gsd_state_version: 1.0
milestone: v3.4
milestone_name: Burstiness-First Adaptive Timeline
status: Phase 83 complete; Phase 84 unblocked
stopped_at: Completed 83 (Contextual Burstiness vs Goh-Barabasi Comparison, verdict GO)
last_updated: "2026-06-27T13:30:00Z"
last_activity: 2026-06-27 -- Phase 83 complete; CBP-05 decision gate GO; Phase 84 unblocked per CBP-06
progress:
  total_phases: 8
  completed_phases: 3
  total_plans: 16
  completed_plans: 12
  percent: 38
---

# Project State

## Project Reference

See: `.planning/PROJECT.md`

**Core value:** Help users understand dense vs sparse spatiotemporal crime patterns through a synchronized tool-first exploration environment.
**Current focus:** Not started (defining requirements)

## Current Position

Phase: 83 of 8 (Contextual Burstiness vs Goh-Barabasi Comparison) — **COMPLETE**
Status: Phase 83 verdict GO; Phase 84 unblocked per CBP-06
Last activity: 2026-06-27 -- Phase 83 verdict GO (CV ratio 56.7x, range ratio 10.9x, absolute floor 9.18 all pass at 1d). Phase 84 ready to plan.

### 80-03 Pending Handoff

After Phase 81 completes, resume Phase 80 by running the 80-03 Task 3 pilot verification:

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

Pilot verification auto-evidence (Tasks 1+2): typecheck ✓, lint ✓, 4/4 page.shell test pass, 4/4 storage test pass (warp vs condition distinction), 13/13 /api/study/log test pass, dev server smoke pass on both /dashboard-demo (200, no lock strip) and /evaluation (200, researcher warp control rendered once, lock strip present).

## Performance Metrics

**Velocity:**

- Total plans completed (v3.2 + v3.3 + v3.4): 9 + 5 + 1 = 15
- Average duration: ~30m
- Total execution time: ~3h 40m (incl. 80 partial, 83-01)

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 76 Foundation | 5 | 5 | — |
| 77 Volumetric Duration | 2 | 2 | — |
| 78 Temporal Evolution | 2 | 2 | ~30m |
| 79 Adaptive 3D | 3 | 3 | ~6m |
| 80 Evaluation Readiness | 3 | 2.6/3 | ~12m (80-03 partial — pilot deferred) |
| 83 Contextual Burstiness | 5 | 5/5 | ~25m (all plans complete; verdict GO) |

**Recent Trend:**

- Last 5 plans: 83-05, 83-04, 83-03, 83-02, 83-01
- Trend: Phase 83 fully complete with verdict GO. Decision gate: contextual std 9.18 / median ref CV 0.16 = 56.7x (need 2x), range 62.2 / max ref range 5.69 = 10.9x (need 3x), absolute floor 9.18 (need >=0.10). All pass. Phase 84 unblocked.

## Accumulated Context

### Decisions

Recent decisions affecting current work:

- [Phase 83]: DUCKDB_PATH defaults to project-root-relative path 'data/cache/crime.duckdb' (matches Next.js src/lib/db.ts:15); executor sets DUCKDB_PATH env var when running from the phase directory.
- [Phase 83]: Month column is zero-indexed (0-11) by subtracting 1 from `EXTRACT(MONTH FROM "Date")` in DuckDB — SQL standard returns 1-12, acceptance requires 0-11.
- [Phase 83]: Per-cell sigma uses Poisson-style `sqrt(mean_per_sec)` as null-model rate estimate for the Plan 01 sanity check. Real sigma from weekly bucket counts is Plan 02 work.
- [Phase 83]: z-preview uses dominant-cell approximation (cell containing window midpoint) for speed. Full linearised form is Plan 03 work.
- [Phase 83]: Venv bootstrapped via `uv venv --python 3.11` (miniconda Python 3.11.5) — homebrew Python 3.11/3.13/3.14 all have broken libexpat link on this host.
- [Phase 83]: Added `!output/figures/.gitkeep` exception to .gitignore so figures dir structure persists in git while generated PNGs stay untracked.
- [Phase 83]: 168-cell exploration verdict is **PASS** (n_degenerate=0, z_cv=0.445, z_max=1315.464). Peak cell hour=0 (Sun 00:00) count=76,519; trough cell hour=5 (Tue 05:00) count=14,569.
- [Phase 83]: Decision gate verdict **GO** at 1d (36,537 windows, 8.38M events). CV ratio 56.7x, range ratio 10.9x, absolute floor 9.18. Phase 84 (Burstiness Signal Contract + Density Fallback) unblocked per CBP-06.
- [Phase 83]: Baseline is **conditional rate** (events/sec at h, d), not averaged over all time. This was a critical fix — initial implementation averaged over total_seconds, producing z=14000 (168x too large). Pearson residual form: z = (O - E) / sqrt(E), with E computed by summing per-second conditional rates over the cells the window spans.
- [Phase 83]: For the contextual z-score, std is used directly as the relative-variation measure (not CV = std/|mean|) because mean(z)=0 by construction. This keeps the comparison dimensionless across all four metrics.
- [Phase 83]: Decision gate uses median (not max) for the CV test — standard robust estimator for small panels (breakdown point 50% vs 0% for mean). Defended in thesis note via Huber (1981), Rousseeuw & Leroy (1987), Maronna et al. (2019). Range test uses max because range is the property the warp visualization depends on.
- [Phase 83]: Intensity ratio r = O/E (alongside z) is the natural positive-valued form for the warp visualization (r>1 = expand, r<1 = compress). z is the signed deviation in standardized units. Both written to the contextual parquet.
- [Phase 80]: Study task order is fixed T4 → T1 → T2 → T3 (not natural ordering).
- [Phase 80]: Researcher flow is fixed 8-step: Welcome → Training → Tasks-A → Questionnaire-A → Tasks-B → Questionnaire-B → Interview → Done.
- [Phase 80]: Questionnaire is 6 NASA-RTLX + 6 interpretability items (overrides the 12 NASA-RTLX draft in `EVALUATION_PROTOCOL.md`).
- [Phase 80]: Reset targets must be explicit and named (no vague global reset).
- [Phase 80]: `/api/study/log` writes are acknowledged — HTTP 200 with `ok: true` or per-row error.
- [Phase 80]: Evaluation lock is route-scoped via `usePathname().startsWith('/evaluation')` — `/dashboard-demo` is fully unaffected.
- [Phase 80]: Locked controls are visible-but-disabled: `disabled`, `aria-disabled`, `tabIndex={-1}` plus `pointer-events-none opacity-40` for visual muting. Single `Setup locked during evaluation.` helper strip per panel.
- [Phase 80]: Researcher-only warp controls live in the researcher's zone of `EvaluationHeader` (not in participant-facing panels).
- [Phase 80]: Warp-factor and condition-toggle events are distinct rows in `study_condition_events` — `event_type` values are `'warp-adjustment'` vs `'condition-toggle'`.
- [Phase 80]: Pilot verification (Task 3) deferred until after Phase 81 memory upgrade to avoid re-piloting under load.
- [Phase 79]: Adaptive warp map renders as a volumetric 1024-bin colored axis behind the slice stack in Stkde3DScene.
- [Phase 79]: Applied slice Y-positions come from the warp map instead of fixed yForIndex spacing when in adaptive mode.
- [Phase 79]: Treat `activeSliceIndex = -1` as a true deselected state so empty-space clicks remove all 3D slice emphasis.
- [Phase 79]: Resize commits must write normalized midpoint time back to the slice store and refresh the ordered active index after resorting.
- [Phase 79]: Empty-space 3D draft creation should clamp a centered default window inside the current viewport.
- [Phase 79]: All slice edits sync through shared stores (useSliceDomainStore, useDashboardDemoCoordinationStore, useDashboardDemoTimeslicingModeStore) — no new coordination channel.
- [Phase 79]: The timeline gets a density strip matching the 3D warp axis colors when in adaptive mode.
- [Phase 79]: Deleting the active 3D slice should clear selection instead of implicitly activating a neighbor.
- [Phase 79]: Interactive Drei Html overlays in the cube must stop pointer bubbling so slider/button controls remain usable.
- [Phase 79]: Study infrastructure (task runner, NASA-TLX, structured logging) is deferred to a future milestone after adaptive 3D visualization is stable.
- [Phase 79]: 3 plans split by foundation (axis + spacing), interaction (select/resize/create), and polish (warp weight, delete, density strip, cross-view verification).

### Pending Todos

- Run Phase 81 (memory pressure / overview vs detail)
- Resume Phase 80 Task 3 (pilot verification) after Phase 81 completes
- Write `80-03-SUMMARY.md` after pilot verification
- [ ] Audit dashboard demo vs thesis design alignment — cross-reference Space_time_cube_V36.md against demo impl; address 2 gaps found (T2 trajectory missing, sync-nav vs toggle)

### Roadmap Evolution

- Phase 80 added: Evaluation readiness — prepare dashboard-demo prototype for user study to answer RQ1-RQ4
- Phase 81 added: Reduce dashboard memory pressure by separating overview/detail loading, shrinking hot-path queries, and replacing CSV-heavy overview scans with pre-aggregated or columnar reads
- Phase 82 added: add poi to 2d map on dashboard demo

### Blockers/Concerns

- Phase 80 Task 3 (pilot verification) intentionally deferred per user request — not a blocker, just paused.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260615-l1g | Add lightweight hotspot evolution visualization to demo dashboard | 2026-06-15 | b9cb7cf | [260615-l1g-add-lightweight-hotspot-evolution-visual](./quick/260615-l1g-add-lightweight-hotspot-evolution-visual/) |
| 260615-l64 | Add hotspot trajectory overlays to demo map and 3D views | 2026-06-15 | 1fe41fa | [260615-l64-add-hotspot-trajectory-overlays-to-demo-](./quick/260615-l64-add-hotspot-trajectory-overlays-to-demo-/) |
| 260615-mcc | Fix demo inspect crash and remove 3D black box | 2026-06-15 | bedd79d | [260615-mcc-fix-demo-inspect-crash-and-remove-3d-bla](./quick/260615-mcc-fix-demo-inspect-crash-and-remove-3d-bla/) |
| 260615-mn1 | Temporarily hide adaptive axis volume in 3D scene | 2026-06-15 | 72b4fe5 | [260615-mn1-temporarily-hide-adaptive-axis-volume-in](./quick/260615-mn1-temporarily-hide-adaptive-axis-volume-in/) |
| 260615-n3i | Replace adaptive axis volume with back-edge ribbon guide | 2026-06-15 | 4482cd0 | [260615-n3i-replace-adaptive-axis-volume-with-back-e](./quick/260615-n3i-replace-adaptive-axis-volume-with-back-e/) |
| 260615-nkm | Hide adaptive axis ribbon again in 3D scene | 2026-06-15 | 96ba3b9 | [260615-nkm-hide-adaptive-axis-ribbon-again-in-3d-sc](./quick/260615-nkm-hide-adaptive-axis-ribbon-again-in-3d-sc/) |
| 260615-nmv | Allow adjusting slice date boundaries in slices tab | 2026-06-15 | 888cb6c | [260615-nmv-allow-adjusting-slice-date-boundaries-in](./quick/260615-nmv-allow-adjusting-slice-date-boundaries-in/) |
| 260615-pc4 | Simplify slices tab details dialog | 2026-06-15 | 667a078 | [260615-pc4-simplify-slices-tab-date-editing-to-dire](./quick/260615-pc4-simplify-slices-tab-date-editing-to-dire/) |
| 260615-tx5 | Remove slice type from slices tab details dialog | 2026-06-15 | 4cae5bc | [260615-tx5-remove-slice-type-from-slices-tab-detail](./quick/260615-tx5-remove-slice-type-from-slices-tab-detail/) |
| 260615-tze | Remove neutral language from slices tab dialogs | 2026-06-15 | 7b0ad04 | [260615-tze-remove-neutral-language-from-slices-tab-](./quick/260615-tze-remove-neutral-language-from-slices-tab-/) |
| 260627-fmr | Move floating crime types legend card to side panel | 2026-06-27 | 96462ca | [260627-fmr-move-floating-crime-types-legend-card-fr](./quick/260627-fmr-move-floating-crime-types-legend-card-fr/) |

## Session Continuity

Last session: 2026-06-27T13:30:00Z
Stopped at: Phase 83 complete (verdict GO); Phase 84 unblocked and ready to plan
Resume file: None

### 83 Phase Roadmap

- **83-01** ✓ COMPLETE — Python scaffold + 168-cell baseline + 1d z-score preview (verdict PASS)
- **83-02** ✓ COMPLETE — Contextual z metric: 168-cell conditional-rate baseline + Pearson residual + intensity ratio
- **83-03** ✓ COMPLETE — Goh-Barabasi B + density + CV reference metrics (4-metric sweep at 1h/6h/1d/1w)
- **83-04** ✓ COMPLETE — 16-row comparison_table.csv + 3 thesis PNGs (heatmap, time series, contrast table) at 320 DPI
- **83-05** ✓ COMPLETE — Decision gate (verdict GO) + DECISION-GATE.md + thesis note at docs/CONTEXTUAL_BURSTINESS_VS_GOH_BARABASI_THESIS_NOTE.md

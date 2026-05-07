---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: complete
stopped_at: Phase 04 plan execution complete
last_updated: "2026-05-07T01:25:43Z"
progress:
  total_phases: 20
  completed_phases: 14
  total_plans: 48
  completed_plans: 47
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-09)

**Core value:** Help users understand dense vs sparse spatiotemporal crime patterns through a synchronized hybrid visualization environment.
**Current focus:** Phase 04 — Evolution View

## Current Position

Phase: 04 (Evolution View) — Complete
Plan: 02 complete / 02
Progress: █████████████████░ 47/48 plans complete

## Performance Metrics

**Velocity:**

- Total plans completed: 25
- Average duration: ~4 min
- Total execution time: 0.8 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 | 3 | 3 | - |
| 2 | 1 | 1 | 4 min |
| 3 | 1 | 1 | 24 min |
| 4 | 2 | 2 | 4 min |
| 5 | 3 | 3 | - |
| 6 | 2 | 2 | 20 min |
| 7 | 2 | 2 | 5 min |
| 8 | 1 | 0 | - |
| 9 | 0 | 0 | - |
| 10 | 4 | 0 | - |
| 11 | 0 | 0 | - |
| 12 | 8 | 8 | - |
| 13 | 0 | 0 | - |
| 14 | 0 | 0 | - |
| 15 | 0 | 0 | - |

**Recent Trend:**

- Last 5 plans: 06-01, 06-02, 07-01, 07-02, 09-01
- Trend: Stable

| Phase 12-codebase-rewrite P03 | 10 min | 5 tasks | 7 files |
| Phase 12-codebase-rewrite-to-improve-code-quality-and-proper-seperation-of-logic-from-ui-where-possible P04 | 4min | 3 tasks | 3 files |

## Accumulated Context

### Roadmap Evolution

- Phase 9 added: Burstiness-driven slice generation
- Phase 10 reworked: Non-uniform time slicing.
- Phase 11 added: Warping metric for adaptive time bin scaling.
- Phase 12 added: Codebase rewrite to improve code quality and proper separation of logic from UI where possible.
- Phase 14 updated: Decode bursts + temporal anomalies.
- Phase 16 added: 3D terrain and enhanced crime aggregation.
- Phase 03 added: Adjacent slice comparison + burst evolution.
- Phase 04 added: Evolution view with sequence playback and flow overlays.

### Decisions

- Keep the existing Next.js modular-monolith structure.
- Use the paper's task vocabulary as the primary planning structure.
- Trust/provenance stays as support-only hardening, not the main task model.
- Hotspot/STKDE and guidance/proposal features stay in scope as supporting analysis features.
- Workerize non-uniform temporal scaling and burst analysis to keep the UI responsive.
- Keep the dashboard route explicitly framed as overview-first with the map as primary context and the cube secondary.
- Preserve workflow/sync cards while retuning the header copy to overview and pattern summaries.
- Surface the timeline as the explicit overview-window control for phase 1.
- Clamp the shared time store whenever the active range changes.
- Preserve a small regression test around temporal range normalization and step clamping.
- Insert a demo stats + STKDE wiring phase before workflow isolation so the demo analysis surface feels complete first.
- Insert an isolated workflow phase after the demo analysis surfaces so generate, review, and apply stay out of the dashboard.
- Make apply-preview timeline-only, editable in place, and warning-visible.
- Make the post-apply dashboard map-first with one shared viewport that swaps between 2D and 3D, plus a fixed STKDE rail.
- Insert a dedicated dashboard-demo UI/UX hardening phase before technical workflow wiring.
- Keep `/dashboard-demo` low-density and map-first with an embedded Explore / Build / Review workflow drawer.
- Protect the stable `/dashboard` and `/timeslicing` shells with source-inspection regression tests.
- Reuse the stats and STKDE routes as learning foundations for demo-local interaction/state wiring.
- Keep the demo stats surface compact and the STKDE rail prominent inside the demo shell.
- Protect the route pivot with source-inspection regression tests that compare demo and stable shell composition.
- Make the demo stats surface the entry point with friendly district labels and an explicit spatial distribution callout.
- Thread selected districts one-way from stats into STKDE while keeping hotspot interaction local to the STKDE rail.
- Keep hotspot/place labels in district-first language and preserve lightweight recovery states inside the demo rail.
- Lock the Phase 5 contract with source-inspection and API regression tests.
- Use a two-track demo timeline with a stronger focused/adapted top track, a subtle raw baseline, and curved warp connectors when readable.
- Centralize the timeline compare story in a shared summary hook.
- Make the dual timeline read as the primary analysis driver.
- Keep the focused track and raw baseline cue visible above the compare controls.
- Recast the cube as a relational synthesis layer with compact linked-selection cues.
- Keep cube detail surfaces aggregated and quiet instead of raw-browser-like.
- Keep the slice companion secondary by compressing its copy and badges instead of expanding the shell.
- Lock the demo shell contract with source-inspection tests so stable `/dashboard` and `/timeslicing` routes stay isolated.
- Keep the Phase 6 warp follow-up demo-local, but simplify the visible warp language to a quieter bands-first presentation.
- Use the proven slice-authored warp-map path from `timeline-test` as the source of truth for demo slice warping.
- Keep the demo warp cue as subtle bands-first presentation layered over the existing slice-authored warp map.
- Keep per-preset Bias state fully demo-local in `useDashboardDemoTimeslicingModeStore` and avoid coupling with stable `/timeslicing` stores.
- Use coarse 0-100 Bias sliders in 5-point steps with friendly labels and compact helper summaries for fast preset tuning.
- Require confirmation for both per-preset and reset-all actions while restoring recommended defaults.
- Add first-iteration demo-local generation wiring through active preset plus `presetBiases[preset]` in the dashboard-demo store.
- Keep preset-driven generation profile mapping coarse and demo-focused, deferring deeper algorithm work.
- Surface generation controls inside the workflow skeleton slice rail while preserving `/timeslicing` isolation.
- Convert burst windows into draft bins in the dashboard-demo store, with preset-bias fallback and burst metadata preserved on apply.
- Keep burst draft generation deliberately user-triggered, with a visible fallback path when no burst windows overlap.
- Surface pending generated bins as burst-first drafts in both the rail and the timeline before apply.
- Route demo apply through the slice-domain replacement API before clearing pending burst drafts.
- Keep pending burst drafts in a dedicated review surface so merge, split, and delete stay pre-apply only.
- Mirror the editable draft state in the workflow shell and timeline copy so the demo reads consistently.
- Lock pending-draft edit wiring with source-inspection coverage instead of route behavior changes.
- Add a dedicated Explain rail and manual workflow stepper for Phase 13.
- Keep the timeline as the primary analysis driver with explicit compare framing.
- Recast the cube as a relational synthesis layer with linked-selection emphasis.
- Lock the Phase 13 IA, timeline, and cube contracts with source-inspection regression tests.
- Keep stable dashboard exclusion checks broad enough to catch demo-only IA leakage.
- Use source-inspection tests to protect story language rather than browser behavior for Phase 13.
- Partition brushed selections first for the phase 10 helper layer, then use burst scoring only to tune warp metadata.
- Preserve exact coverage of the brushed interval and return a neutral partition when no bin stands out.
- Expand the shared comparable-bin scorer to support monthly granularity alongside hourly, daily, and weekly bins.
- Treat the brushed selection as the canonical input for demo draft generation.
- Default the demo generator to daily granularity and all crime types unless narrowed.
- Preserve burst metadata and warp weight through merge, split, and apply operations.
- Make monthly granularity a shared contract and use calendar-month binning when monthly is selected.
- Route cube rendering through dashboard-demo store overrides so the demo shell controls the cube state.
- Keep slice planes in-scene and lower helper noise so the 3D cube reads as a usable analysis surface.
- Keep the adjacent comparison helper pure with explicit left/right slots and push-based slot rotation.
- Drive burst lifecycle connectors from selected burst windows while filtering hidden slices.
- Normalize burst score rails against the strongest visible slice and keep zero-score fallback bars readable.

### Pending Todos

- Phase 2 workflow skeleton plan is complete.
- Phase 3 demo timeline rewrite is complete.
- Phase 4 demo stats + STKDE wiring is complete.
- Phase 5 demo stats + STKDE interaction is complete.
- Phase 6 demo timeline polish is complete.
- Phase 6 warp follow-up is complete.
- Phase 7 dashboard-demo preset thresholds is complete.
- Phase 8 contextual data enrichment plan follows after the inserted threshold phase.
- Phase 9 burstiness-driven slice generation remains in progress.
- Phase 10 non-uniform time slicing has the helper layer and workflow wiring complete for plans 01-02.
- Phase 11 warping metric plan 01 is complete; plans 02-03 remain queued before workflow isolation.
- Phase 11 warping metric plan 02 is complete; plan 03 remains queued for browser verification.
- Phase 12 codebase rewrite is complete; Phase 13 UX/IA plans 01-05 are complete.
- Phase 01 foundation store sync + slice planes is complete.
- Phase 02 3D STKDE on Cube Planes is complete.
- Phase 03 adjacent slice comparison + burst evolution is complete.
- Phase 04 evolution view is complete.

### Phase 04 Completion

- Evolution sequence and playback controls are implemented in the demo rail.
- Evolution rail tab wiring, slice transition emphasis, and flow overlay visualization are complete.
- Phase 04 planning summaries have been created for both plans.

### Blockers/Concerns

- `pnpm typecheck` currently fails due unrelated pre-existing missing-module and type errors elsewhere in the repo.
- Broader lint on `DualTimeline.tsx` surfaces pre-existing React Compiler memoization warnings unrelated to this plan.
- `pnpm vitest` via Corepack failed with a signature/key mismatch during verification; local `./node_modules/.bin/vitest` worked and was used for focused checks.
- Phase 02 introduced slice-aware STKDE responses, shared heatmap palette wiring, and debounced latest-only demo refreshes.
- Phase 03 introduced the adjacent comparison model, burst lifecycle overlay, and burst score rail.
- Phase 04 introduced the evolution sequence model, rail tab wiring, slice transition emphasis, and directional flow overlays.

## Session Continuity

Last session: 2026-05-07T01:25:43Z
Stopped at: Completed 04-evolution-view
Resume file: None

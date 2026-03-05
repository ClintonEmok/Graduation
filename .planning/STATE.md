# Project State

## Project Reference

**Project:** Adaptive Space-Time Cube  
**Core value:** Users can compare uniform and adaptive temporal mapping, with v2.0 focused on cube-first space-time slicing in a dedicated sandbox route.  
**Current focus:** v2.0 cube-first roadmap initialization (Phases 43-50).

## Current Position

**Current phase:** Phase 46 - Cube-Aware Interval Proposals (in progress)  
**Current plan:** 46-02 completed (1 plan remaining in phase)  
**Status:** In progress  
**Progress:** overall ███████████████████░ 99% (133/135 plans with summaries complete)

## Performance Metrics

| Metric | Current |
|--------|---------|
| Milestones shipped | v1.0, v1.1 |
| Completed phases | 1-34 complete |
| Planned phases | 35-50 planned |
| v2.0 requirement coverage | 26/26 mapped |

## Accumulated Context

**Decisions captured for v2.0:**
- Start new milestone at Phase 43 because existing roadmap already allocates through Phase 42.
- Keep phase design vertical by user capability (sandbox route, cube constraints, proposals, validation, review, diagnostics, quality).
- Prioritize cube-first outcomes; timeline/map parity is deferred unless needed by cube validation.
- Add a dedicated 3D timeslicing sandbox route for rapid experimentation and reset.
- Keep enterprise process overhead out of roadmap; focus on executable capability milestones.

**Known constraints:**
- Desktop-first thesis tooling remains acceptable.
- Session-first persistence remains acceptable for this milestone baseline.
- Dataset scale and interactivity targets remain non-negotiable for usability.

**Open execution items:**
- Continue Phase 46 execution with plan 46-03.

## Session Continuity

**Last activity:** 2026-03-05 - Completed `46-02-PLAN.md` (interval proposal rail UI integration + lifecycle reset coverage).  
**Last session:** 2026-03-05T13:48:30Z
**Stopped at:** Phase 46 Plan 02 complete
**Resume file:** .planning/phases/46-cube-aware-interval-proposals/46-03-PLAN.md
**Next command:** `/gsd/execute-phase 46`  
**If resuming later:** Continue from Phase 46 Plan 03.

## Recent Decisions

- Use `/cube-sandbox` as direct cube-first entry without an intermediate landing view.
- Keep sandbox composition route-local and independent from `DashboardLayout`/`TopBar`.
- Label home navigation as experimental/prototype for v2.0 clarity.
- Use one reset orchestrator for both sandbox bootstrap and manual hard reset.
- Keep sandbox context diagnostics always visible in a compact right-side panel.
- Add `resetSandboxDefaults` in adaptive store to avoid brittle direct store mutation during reset.
- Model cube spatial constraints as typed store records before UI wiring for deterministic downstream consumption.
- Preserve saved spatial constraint definitions across hard reset; clear only active selection.
- Keep constraint regression tests at store/reset orchestration level for fast deterministic feedback.
- Keep cube spatial constraint authoring inline in the sandbox right rail for low-friction experimentation.
- Surface total/enabled/active constraint cues in always-on diagnostics for quick context visibility.
- Preserve sandbox shell structure by wiring new manager through existing context panel composition.
- Map constraint bounds through a pure geometry adapter before scene rendering for deterministic overlays.
- Render only enabled constraints in-scene and emphasize active selection to reduce visual noise.
- Show enabled and active constraint cues directly inside cube view during interaction.
- Keep Phase 45 proposal generation deterministic for identical constraint inputs to support reliable review.
- Keep proposal rationale visible in the sandbox rail before apply actions.
- Ensure proposal apply updates adaptive cube mapping immediately in-session.
- Keep proposal IDs deterministic as `proposal-{constraintId}` so selection state remains stable across regenerations.
- Track proposal generation metadata (`generatedAt`, sorted source constraint IDs) for diagnostics traceability.
- Keep proposal payload apply-ready (`warpFactor` + temporal `range`) for direct adaptive wiring in follow-up plans.
- Keep proposal review inline in the sandbox diagnostics rail (no modal dependency) to preserve low-friction evaluation flow.
- Clear warp proposal state on hard reset and on `/cube-sandbox` unmount to avoid stale cross-session selection artifacts.
- Use a deterministic apply adapter to map proposal payload into adaptive runtime state in one action.
- Tag adaptive source as `proposal-applied` and persist applied proposal id for diagnostics traceability.
- Keep apply action directly in selected proposal details and mirror applied cue in cube overlay.
- Model interval proposal IDs as `interval-{constraintId}-{burstId}` to keep selection deterministic across regenerations.
- Include confidence and quality blocks in interval proposal payloads so review UI can render diagnostics without recomputing scores.
- Apply overlap suppression per constraint to remove redundant interval candidates while preserving cube-context grouping semantics.
- Keep interval proposal review inline in sandbox diagnostics rail with confidence-first rationale cards.
- Keep interval rail list concise by default (top candidates) with explicit expand action for full candidate set.
- Clear interval proposal state in both hard reset orchestration and `/cube-sandbox` unmount cleanup.

---
*Last updated: 2026-03-05 - completed 46-02 and advanced Phase 46*

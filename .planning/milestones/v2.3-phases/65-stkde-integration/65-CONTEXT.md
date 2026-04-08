# Phase 65: STKDE Integration - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 65 integrates STKDE hotspot analysis directly into `dashboard-v2` so investigation remains in one unified route.

Users should be able to run STKDE against the active investigative scope, inspect hotspot output on map/heatmap and in a hotspot list, and use hotspot focus to inform timeline/cube investigation without breaking Phase 64 synchronization contracts.

This phase does not introduce deep-link sharing or cross-route STKDE surfaces. It extends the existing unified `dashboard-v2` workflow.

</domain>

<decisions>
## Implementation Decisions

### Hotspot Focus and Cross-View Sync
- **D-01:** Hotspot click sets the primary global focus to the hotspot time window + linked spatial area.
- **D-02:** Hotspot hover is preview-only and must not commit global selection state.
- **D-03:** If hotspot timing conflicts with applied slice boundaries, keep applied slices as workflow truth and show hotspot as an investigative overlay with mismatch messaging.
- **D-04:** Selection authority remains Phase 64 `last interaction wins`; later timeline/map/cube interactions can replace hotspot focus.

### Compute and Update Rhythm
- **D-05:** Default compute trigger is explicit manual run (user-controlled), not auto recompute on every change.
- **D-06:** When applied slices change, existing STKDE output is marked stale and user reruns explicitly.
- **D-07:** Long-running compute must expose inline progress status and support cancel behavior.
- **D-08:** On failure or truncation/clamp/fallback, keep available output visible and show clear warning + retry affordance.

### Result Explainability
- **D-09:** Hotspot list rows must always show location, intensity, support, and time window.
- **D-10:** Provenance/confidence is primarily run-level (compute mode + truncation/clamp/fallback indicators), shown near controls/status.
- **D-11:** Hotspot-vs-slice mismatch must be explained in plain language: hotspot is an investigative overlay, applied slices remain the workflow source of truth.
- **D-12:** Default hotspot ordering is intensity descending with support/count deterministic tie-break behavior.

### Slice Scope Coupling
- **D-13:** Default STKDE scope is current applied slices inside `dashboard-v2`.
- **D-14:** User may explicitly broaden STKDE scope to full viewport via a deliberate scope toggle.
- **D-15:** Scope state must be always visible via persistent scope indicator (for example, chip/banner: `Applied Slices` vs `Full Viewport`).
- **D-16:** If no applied slices exist, fallback scope is current viewport/filter domain with an explicit no-applied-slices notice.

### the agent's Discretion
- Exact control density/layout for parameter + scope controls in `dashboard-v2`
- Visual styling for stale-state indicators and warning hierarchy
- Exact wording of progress and mismatch copy, as long as semantics above remain intact

</decisions>

<specifics>
## Specific Ideas

- STKDE should feel like an extension of the same investigation loop, not a separate analytics mode.
- Keep interactions understandable: preview on hover, commit on click, and preserve explicit user control over recompute.
- Prefer transparent investigation trust signals (scope, staleness, provenance) over hidden automation.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and Requirement Contracts
- `.planning/PROJECT.md` - v3.0 single-route direction and STKDE-in-dashboard outcome.
- `.planning/ROADMAP.md` - Phase 65 goal, dependencies, and success criteria.
- `.planning/REQUIREMENTS.md` - `STKD-01` through `STKD-05` acceptance requirements.

### Prior Phase Decisions to Carry Forward
- `.planning/phases/62-user-driven-timeslicing-manual-mode/62-CONTEXT.md` - generate/review/apply foundation and applied-slice semantics.
- `.planning/phases/63-map-visualization/63-CONTEXT.md` - `dashboard-v2` as primary route and map/timeline investigation baseline.
- `.planning/phases/64-dashboard-redesign/64-CONTEXT.md` - synchronization authority, no-match behavior, and workflow status conventions.
- `.planning/phases/64-dashboard-redesign/64-01-SUMMARY.md` - implemented coordination contracts and invariant tests.

### Existing STKDE Assets and Contracts
- `.planning/phases/55-stkde-exploration-route-with-chicago-heatmap-and-hotspots-panel/55-01-SUMMARY.md` - route-level STKDE compute/guardrail patterns to reuse.
- `src/lib/stkde/contracts.ts` - request/response schema, coercion/clamp rules, and payload guard constants.
- `src/workers/stkdeHotspot.worker.ts` - worker projection/filter/sort pipeline for hotspot responsiveness.
- `src/components/map/MapStkdeHeatmapLayer.tsx` - current STKDE heatmap rendering primitives.
- `src/store/useStkdeStore.ts` - current STKDE selection/filter store baseline.

### Unified Route Integration Surfaces
- `src/app/dashboard-v2/page.tsx` - main v3.0 integration surface for Phase 65.
- `src/components/map/MapVisualization.tsx` - map interaction and overlay integration surface.
- `src/components/map/MapLayerManager.tsx` - layer toggles and visibility controls including STKDE switch entry point.
- `src/store/useCoordinationStore.ts` - canonical cross-panel synchronization and selection precedence contract.
- `src/store/useLayoutStore.ts` - panel composition and persistence behavior in `dashboard-v2`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `MapStkdeHeatmapLayer` already provides STKDE heatmap + active hotspot marker rendering.
- `/stkde` route shell (`StkdeRouteShell`) already includes controls, compute invocation, cancellation, and hotspot panel patterns.
- `useStkdeStore` already tracks selected/hovered hotspot and temporal/spatial filters.

### Established Patterns
- STKDE compute authority remains server-side (`/api/stkde/hotspots`) with worker-assisted client projection/filtering.
- Guardrail/provenance metadata (truncation, clamp, fallback, compute mode) is already part of STKDE response contracts.
- Cross-view selection sync follows `useCoordinationStore` semantics from Phase 64.

### Integration Points
- Wire STKDE controls + scope indicator into `dashboard-v2` without creating route split.
- Connect hotspot selection/preview behavior to timeline/cube/map focus via coordination store while preserving last-interaction precedence.
- Integrate STKDE layer visibility into existing layer management surface and map overlays.

</code_context>

<deferred>
## Deferred Ideas

- Deep-link/shareable STKDE state and permalinked investigation sessions - future phase.
- Fully automated STKDE recompute orchestration on all state changes - consider after Phase 66 hardening.

</deferred>

---

*Phase: 65-stkde-integration*
*Context gathered: 2026-03-27*

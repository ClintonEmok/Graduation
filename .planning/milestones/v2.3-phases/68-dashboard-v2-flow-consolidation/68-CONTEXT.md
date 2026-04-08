# Phase 68: Dashboard-v2 Flow Consolidation - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

## Phase Boundary

Consolidate all core investigation tasks into one less-is-more `dashboard-v2` page with explicit user flows and scenario-driven interaction design.

## Implementation Decisions

### Workflow hierarchy
- **D-01:** The dominant entry CTA is `Generate Draft Slices`.
- **D-02:** The step progression should live in a top workflow rail above the main canvas.
- **D-03:** The page should keep a single primary workflow: generate -> review -> apply -> refine -> analyze.

### Navigation and disclosure
- **D-04:** The six panel toggles should not remain equally prominent; advanced panels should be hidden by default.
- **D-05:** Header route links should be removed from `dashboard-v2` to avoid route hopping.
- **D-06:** `STKDE` must be fully hidden before apply/refine.
- **D-07:** When unlocked, `STKDE` stays in the right sidebar panel.
- **D-08:** There should be no visible header shortcut for `STKDE`.

### Draft review / refinement behavior
- **D-09:** Draft review and manual refinement stay in the same refinement surface unless the planner later splits them.
- **D-10:** The refinement surface should keep the draft-bin review pattern already used in the current UI.
- **D-11:** The exact primary action during review is left to implementation discretion, but it must stay aligned with the workflow rail and not introduce a second competing top-level CTA.

### STKDE unlock timing
- **D-12:** The exact unlock trigger for `STKDE` is left to implementation discretion.
- **D-13:** Any unlock rule must still respect the phase contract: no STKDE before apply/refine, and analysis should feel contextual rather than route-based.

### Deferred / not locked here
- **D-14:** Scenario bookmarks/presets remain deferred for later phase-level treatment unless the planner finds a direct dependency.

## Specific Ideas

- Keep the page feeling like a guided workflow, not six equal modules.
- Make status badges informative, but secondary to the top workflow rail.
- Preserve the existing draft-bin apply pattern; phase 68 is about consolidation and hierarchy, not a redesign of the underlying generation model.

## Canonical References

### Phase definition and flow contract
- `.planning/ROADMAP.md` — phase boundary, goal, and success criteria for Phase 68.
- `.planning/phases/68-dashboard-v2-flow-consolidation/68-FLOWS.md` — locked product decisions, canonical workflow, and acceptance checks.
- `.planning/phases/68-dashboard-v2-flow-consolidation/68-01-PLAN.md` — stub plan to be replaced by the planner.

### Project and requirement context
- `.planning/PROJECT.md` — v3.0 goal, unified `dashboard-v2` route, and desktop-focused constraints.
- `.planning/REQUIREMENTS.md` — v3.0 traceability for generation, refinement, synchronization, and STKDE.
- `.planning/STATE.md` — current milestone status and prior phase decisions.

### Existing UI and state implementation
- `src/app/dashboard-v2/page.tsx` — current shell with header, toggle rail, refinement sidebar, map/cube canvas, timeline, and right sidebar.
- `src/components/dashboard/DashboardHeader.tsx` — current workflow/status badges and now-out-of-contract route links.
- `src/store/useLayoutStore.ts` — persisted six-panel visibility state and default-visible advanced panels.
- `src/app/timeslicing/components/SuggestionToolbar.tsx` — existing draft review / apply pattern and review context UI.
- `src/components/stkde/DashboardStkdePanel.tsx` — contextual STKDE panel to keep, but gate more strictly.
- `src/app/dashboard-v2/hooks/useDashboardStkde.ts` — STKDE execution/cancel flow and state wiring.

## Existing Code Insights

### Reusable Assets
- `DashboardHeader`: already provides workflow/sync badges and slice counts; it can be simplified into a non-navigation status header.
- `useLayoutStore`: already persists panel visibility and map ratio, so the new disclosure model can be implemented by changing defaults and gating logic instead of inventing new state.
- `SuggestionToolbar`: already captures the draft/apply mental model with review context, pending bins, and clear/apply actions.
- `DashboardStkdePanel`: already exists as a sidebar analysis surface and can be retained behind a stricter workflow gate.

### Established Patterns
- `dashboard-v2/page.tsx` currently composes the page from a header, a toggle rail, conditional sidebars, and a central analysis canvas.
- `useLayoutStore` uses Zustand with persistence and a merge function, so phase 68 should work with the existing persisted layout model rather than replacing it.
- STKDE already uses manual run/cancel semantics and a right-sidebar placement, which aligns with the phase direction.

### Integration Points
- The top workflow rail belongs in `src/app/dashboard-v2/page.tsx` where the panel toggle strip currently lives.
- Header link removal belongs in `src/components/dashboard/DashboardHeader.tsx`.
- Advanced panel hiding belongs in `src/store/useLayoutStore.ts` and the `dashboard-v2` shell.
- STKDE reveal gating belongs in the page shell plus `DashboardStkdePanel` visibility rules.
- Draft review/refinement behavior connects `dashboard-v2/page.tsx` with `SuggestionToolbar` and the timeslicing stores.

## Deferred Ideas

- Scenario bookmarks/presets for recurring conceptual tasks.
- Any broader visual redesign beyond hierarchy and disclosure.

---

*Phase: 68-dashboard-v2-flow-consolidation*
*Context gathered: 2026-04-08*

# Phase 64: Cross-View Synchronization and Unified Workflow Dashboard - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 64 makes `dashboard-v2` behave like one synchronized workflow surface.

Applied slices, selection state, and workflow state must stay coherent across timeline, map, heatmap, and cube so users can investigate without context drift between panels. This phase defines synchronization behavior and user-visible coordination feedback inside the unified route.

</domain>

<decisions>
## Implementation Decisions

### Cross-Panel Sync Precedence
- **D-01:** Selection authority follows **last interaction wins** across timeline, map, and cube.
- **D-02:** If a panel cannot resolve the active selection, keep global selection and show a panel-local no-match warning instead of auto-clearing.
- **D-03:** Brush/range interactions preview locally during drag and commit synchronized updates across panels on release.
- **D-04:** On filter/workflow mode changes, reconcile selection against new data; keep it if valid, otherwise clear with explicit reason.

### Selection Scope and Recovery
- **D-05:** Selection supports panel-specific multi-select behavior: timeline/map may keep multiple contextual windows while global focus remains clear.
- **D-06:** Undo of selection-related actions restores both selected slice and source panel context.

### Sync Feedback and Phase Scope
- **D-07:** Show a lightweight inline sync status strip for reconciliation states (syncing, synchronized, partial/no-match reason).
- **D-08:** Deep-link/shareable synchronized state is deferred out of Phase 64.

### the agent's Discretion
- Exact UI design for workflow status model beyond required sync strip behavior.
- Header information density and arrangement (strategy/granularity/slice summaries) as long as `SYNC-05` remains clear.
- Detailed persistence defaults for panel visibility/sizing where not constrained by existing store behavior.

</decisions>

<specifics>
## Specific Ideas

- Keep panel coordination explicit and understandable rather than "magic" auto-switching.
- Avoid destructive auto-clears when only one panel lacks matching data.
- Preserve investigation continuity by restoring both selection and interaction source during undo.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and Requirement Contracts
- `.planning/PROJECT.md` — v3.0 single-route mandate and workflow expectations for `dashboard-v2`.
- `.planning/ROADMAP.md` — Phase 64 goal, success criteria, and dependency on Phase 63.
- `.planning/REQUIREMENTS.md` — `SYNC-01` through `SYNC-05` acceptance criteria.

### Prior Phase Decisions to Carry Forward
- `.planning/phases/62-user-driven-timeslicing-manual-mode/62-CONTEXT.md` — generate -> review -> apply defaults and applied-slice promotion behavior.
- `.planning/phases/63-map-visualization/63-CONTEXT.md` — `dashboard-v2` as primary v3.0 route and map/timeline investigation baseline.
- `.planning/phases/63-map-visualization/63-01-SUMMARY.md` — implemented dashboard-v2 shell and panel composition baseline.

### Current Phase Plan and Code Contracts
- `.planning/phases/64-dashboard-redesign/64-01-PLAN.md` — phase execution goals and required artifacts.
- `src/app/dashboard-v2/page.tsx` — unified route composition and current panel interactions.
- `src/store/useCoordinationStore.ts` — shared selection and brush coordination primitives.
- `src/store/useLayoutStore.ts` — persisted panel visibility and map/timeline ratio behavior.
- `src/components/dashboard/DashboardHeader.tsx` — existing header composition to redesign/align.
- `src/components/binning/BinningControls.tsx` — integrated generation/review controls that must remain coherent in synchronized flow.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useCoordinationStore` already provides cross-view primitives (`selectedIndex`, `selectedSource`, `brushRange`, burst-window toggles).
- `useLayoutStore` already persists panel visibility and split ratio in zustand `persist` middleware.
- `dashboard-v2/page.tsx` already composes map + timeline + refinement + layers and exposes workflow state banner patterns.

### Established Patterns
- Zustand stores are the coordination backbone for shared route state and panel behavior.
- Workflow UX already distinguishes draft generated bins from applied slices.
- Panel toggles and inline route-level status cues are already accepted in `dashboard-v2` interaction model.

### Integration Points
- Selection precedence and reconciliation logic should center in coordination-layer state used by timeline, map, and cube consumers.
- Sync status strip should be rendered at route level so all panels share one coordination narrative.
- Header/workflow summaries should read from the same coordinated state to avoid conflicting status between surfaces.

</code_context>

<deferred>
## Deferred Ideas

- Shareable deep-link state for synchronized selections and filters — future phase.

</deferred>

---

*Phase: 64-dashboard-redesign*
*Context gathered: 2026-03-27*

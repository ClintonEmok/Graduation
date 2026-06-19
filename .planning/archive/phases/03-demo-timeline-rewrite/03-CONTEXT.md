---
phase: 03-demo-timeline-rewrite
status: ready-for-planning
---

# Phase 3: Demo Timeline Rewrite - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Rebuild the demo timeline/dual timeline for `/dashboard-demo` so it feels polished, low-density, and purpose-built for the demo shell. This phase is about the demo timeline composition only; the actual workflow wiring stays deferred to the workflow phase.

</domain>

<decisions>
## Implementation Decisions

### Timeline structure
- **D-01:** Build a separate `DemoDualTimeline` for `/dashboard-demo` and keep the existing `DualTimeline` untouched for comparison.
- **D-02:** Keep the demo timeline as the primary temporal control surface in the shell.
- **D-03:** Do not modify the existing production `DualTimeline` in this phase; the demo timeline should be isolated so differences stay visible.

### Slice companion layout
- **D-04:** Surface slice manipulation in the same right rail as STKDE, using tabs instead of a separate top-heavy block.
- **D-05:** Keep the companion section separate from the base timeline so the timeline stays readable and the controls do not consume vertical space.

### Control chrome
- **D-06:** Keep almost all playback and temporal controls visible rather than stripping the demo down to only the minimum.
- **D-07:** The demo should simplify presentation and hierarchy, not eliminate the existing control breadth.

### Slice state presentation
- **D-08:** Present slice state in a dedicated companion section rather than as inline timeline badges.
- **D-09:** Make the companion section collapsible so the timeline can breathe when users want a cleaner view.

### Store logic investigation
- **D-10:** Investigate whether the demo dual timeline needs its own store logic boundary or can reuse the current shared stores safely.
- **D-11:** Do not assume the existing store logic is sufficient just because the current timeline works; verify the demo-specific surface against the existing stores before planning implementation.

### the agent's Discretion
- Exact spacing, typography, and control grouping inside the rewritten timeline.
- How the companion section visually separates editing, summary, and warnings while staying low-density.
- Final iconography and microcopy for the rewritten demo timeline.

</decisions>

<specifics>
## Specific Ideas

- The companion layer should sit above the timeline.
- The companion layer should sit beside the timeline as a side panel.
- The companion layer should live in the tabbed right rail alongside STKDE.
- Almost all controls should remain visible.
- Slice state should live in a dedicated companion section, not as tiny inline badges.
- The existing `DualTimeline` should remain intact so the demo version can be compared against it.
- Store logic may need a demo-specific boundary; that needs investigation before implementation.

</specifics>

## Core Intent

- Keep the timeline as the primary temporal control surface in the demo.
- Make slices and overlays feel like a separate, lighter companion system.
- Simplify the busy proof-of-concept feel without losing the analysis affordances users actually need.
- Build the demo version before the workflow isolation phase so the workflow can depend on a cleaner temporal foundation.

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap and phase context
- `.planning/ROADMAP.md` — Phase 3 boundary, goal, and success criteria.
- `.planning/REQUIREMENTS.md` — Demo timeline rewrite requirements and constraints.
- `.planning/STATE.md` — Current phase status and session continuity.
- `.planning/phases/02-dashboard-demo-ui-ux/02-CONTEXT.md` — Phase 2 demo shell decisions that the timeline rewrite must fit under.
- `.planning/phases/02-dashboard-demo-ui-ux/02-DISCUSSION-LOG.md` — Phase 2 UX tradeoffs already locked.
- `.planning/phases/03-demo-timeline-rewrite/03-DISCUSSION-LOG.md` — This phase's tradeoff record.
- `.planning/phases/03-demo-timeline-rewrite/03-01-PLAN.md` — Execution plan for the timeline rewrite.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/timeline/TimelinePanel.tsx` — current demo timeline shell and control chrome.
- `src/components/timeline/DualTimeline.tsx` — current core timeline implementation to refactor.
- `src/components/timeline/DemoDualTimeline.tsx` — planned isolated demo timeline surface for comparison.
- `src/components/viz/TimeSlices.tsx` — slice overlay behavior and interaction model.
- `src/components/viz/SliceManagerUI.tsx` — richer slice management controls and state presentation to mine for a companion-section pattern.
- `src/components/dashboard-demo/DashboardDemoShell.tsx` — the demo shell that hosts the timeline rewrite.
- `src/components/dashboard-demo/DashboardDemoRailTabs.tsx` — the right-rail tab wrapper that can host STKDE and slice panels.
- `src/store/useTimelineDataStore.ts`, `src/store/useTimeStore.ts`, `src/store/useSliceStore.ts`, `src/store/useCoordinationStore.ts`, `src/store/useTimeslicingModeStore.ts` — candidate shared stores that may need a demo-specific boundary review.

### Established Patterns
- The app already uses a dark, low-density shell for `/dashboard-demo`.
- Timeline controls are grouped as a single temporal control surface rather than separate screens.
- Slice management already exists as a distinct UI concern, which supports moving it into a separate companion section.

### Integration Points
- `DashboardDemoShell` renders `TimelinePanel`, so the rewrite stays inside the demo shell.
- `TimelinePanel` is the natural boundary for switching the demo shell over to `DemoDualTimeline`.
- `DashboardDemoRailTabs` owns the right-rail tab switch between STKDE and the slice companion.
- `SliceManagerUI` and `TimeSlices` provide the existing slice editing model that the companion section can simplify.
- Shared stores must be checked for leakage before the demo timeline gets its own isolated composition.

</code_context>

<deferred>
## Deferred Ideas

- Full workflow wiring belongs to the next phase.
- Any route-level workflow isolation stays deferred.
- Additional slice state complexity that does not support the demo story should be pushed later.

</deferred>
## Key Surfaces

- `src/components/timeline/TimelinePanel.tsx`
- `src/components/timeline/DualTimeline.tsx`
- `src/components/viz/TimeSlices.tsx`
- `src/components/viz/SliceManagerUI.tsx`
- `src/components/viz/BurstList.tsx`
- `src/components/viz/BurstDetails.tsx`
- `src/components/dashboard-demo/DashboardDemoShell.tsx`
- `src/components/ui/slider.tsx`

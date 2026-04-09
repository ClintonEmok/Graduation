# Phase 2: Dashboard Demo UI/UX Hardening - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 2 hardens the `/dashboard-demo` route as a polished UX surface before technical workflow wiring begins. The phase keeps the demo map-first, keeps the STKDE rail fixed on the right, keeps the timeline visible and usable, and focuses on visual hierarchy, interaction clarity, and overall presentation quality. It also introduces a workflow skeleton under the demo, shaped like a multistep form, so the user can understand generate/review/apply as a staged experience without the real wiring yet.

</domain>

<decisions>
## Implementation Decisions

### Shell hierarchy
- **D-01:** The bottom status chips show only the applied-state message; generation status and draft bin count are not persistent shell clutter.
- **D-02:** The demo shell does not show a persistent route label.
- **D-03:** The shared viewport does not need explanatory copy beyond the minimal existing composition.
- **D-04:** The demo should feel like a polished product UI for general users, not an experimental lab surface.
- **D-05:** Composition density stays low.
- **D-06:** The palette stays dark and neutral.
- **D-07:** Surface styling uses hard-edged panels rather than soft cards.

### Viewport swap affordance
- **D-08:** The map/cube switch is icon-only and reads as a utility toggle, not a prominent mode selector.
- **D-09:** The swap transition should be a subtle fade.
- **D-10:** Active-state feedback should stay minimal.

### Timeline rail role
- **D-11:** The timeline rail acts as the primary control surface in this demo.
- **D-12:** The timeline shows applied-state cues only; draft-vs-applied comparison cues stay out of Phase 2.
- **D-13:** The timeline can be collapsed by the user.
- **D-14:** The timeline remains balanced in weight relative to the viewport, not visually dominant.

### STKDE rail presentation
- **D-15:** The fixed right rail leads with a hotspot list.
- **D-16:** The rail should feel like a polished sidebar.
- **D-17:** When no hotspot is selected, the rail shows short guidance rather than a dense empty-state scaffold.
- **D-18:** Hotspot selection primarily updates the rail itself; broad cross-linking into the rest of the demo is not the focus of this phase.

### Workflow skeleton
- **D-19:** The workflow lives under `/dashboard-demo` as a nested skeleton, not as a separate route.
- **D-20:** The workflow skeleton should read like a multistep form with distinct generate, review, and apply stages.
- **D-21:** The skeleton can use placeholder panels and step affordances, but it should not imply completed technical wiring.
- **D-22:** The workflow surface remains subordinate to the demo shell rather than becoming a second app.

### Workflow skeleton approach
- **D-23:** The preferred layout is a compact stepper with one active stage panel at a time, because it reads like a form and keeps density low.
- **D-24:** Tabs are less desirable because they imply equal-mode navigation instead of sequential progression.
- **D-25:** Three persistent cards are less desirable because they consume more space and make the demo feel like a dashboard inside a dashboard.
- **D-26:** The workflow should still show previous/current/next stage awareness, but without turning into a full routing system.
- **D-27:** The first workflow stage is `Explore`, since the user starts by understanding the overall data field before creating slices.
- **D-28:** The slice-making and review portion should feel continuous, with editing and review blended into one builder experience instead of a hard break.

### Workflow drawer structure
- **D-29:** The workflow skeleton should be implemented as a left-anchored drawer so it stays clear of the fixed right STKDE rail.
- **D-30:** The drawer should toggle open by default rather than forcing a permanent full-height panel.
- **D-31:** The step rail should show the active step plus muted nearby context so the user can keep orientation without visual overload.
- **D-32:** The drawer can overlay the demo shell when open, but it should not obscure the primary meaning of the demo viewport.

### Workflow continuity
- **D-33:** The transition from slice creation into review should feel continuous, with the same surface carrying the user through adjustment, split, merge, and review.
- **D-34:** The flow should still end in a distinct dashboard handoff, so continuity applies to the workflow builder, not the analysis dashboard.

### the agent's Discretion
- Exact spacing, typography, and section ordering inside panels.
- Which short guidance copy appears in empty/initial states, as long as it stays brief.
- Fine-grained icon glyph choice, border thickness, and hover treatment.
- Placeholder form field labels and stepper visuals for the workflow skeleton.
- Exact stepper density and whether inactive steps collapse to short summaries or remain visible as muted headers.
- Drawer width, scrim strength, and whether the open state persists across refresh are still open implementation details.
- Whether the `Explore` step itself is mostly informational or also includes the first light slice controls is still open.

</decisions>

<specifics>
## Specific Ideas

- "polished product UI for general users"
- "low density"
- "dark neutral base"
- "hard-edged panels"
- "icon only"
- "subtle fade"
- "minimal active cue"
- "utility toggle"
- "primary control surface"
- "applied state only"
- "collapsible by user"
- "hotspot list first"
- "short guidance"

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project planning
- `.planning/PROJECT.md` — product framing, constraints, and current scope
- `.planning/REQUIREMENTS.md` — phase-mapped requirements, including the new Phase 2 UX focus
- `.planning/ROADMAP.md` — phase order, phase boundaries, and success criteria
- `.planning/STATE.md` — current phase focus and session continuity

### Prior phase context
- `.planning/phases/01-overview-pattern-summaries/01-CONTEXT.md` — phase 1 overview decisions that carry forward
- `.planning/phases/03-demo-timeline-rewrite/03-CONTEXT.md` — demo timeline rewrite follow-on phase

### Codebase maps
- `.planning/codebase/STRUCTURE.md` — route/component layout and where new demo code belongs
- `.planning/codebase/CONVENTIONS.md` — naming, import, and component patterns
- `.planning/codebase/INTEGRATIONS.md` — data/API constraints and external integration boundaries
- `.planning/codebase/CONCERNS.md` — known fragility and styling/coordination risks

### Phase surfaces
- `src/app/dashboard-demo/page.tsx` — entry route for the new demo
- `src/components/dashboard-demo/DashboardDemoShell.tsx` — new demo shell structure
- `src/components/dashboard-demo/WorkflowSkeleton` — planned nested workflow scaffold under the demo shell
- `src/components/map/MapVisualization.tsx` — shared map viewport
- `src/components/viz/CubeVisualization.tsx` — shared cube viewport
- `src/components/timeline/TimelinePanel.tsx` — timeline control surface
- `src/components/stkde/DashboardStkdePanel.tsx` — fixed right-side STKDE rail
- `src/app/dashboard/page.tsx` — existing stable dashboard shell to avoid regressing
- `src/components/layout/DashboardLayout.tsx` — existing layout composition pattern

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DashboardDemoShell`: the new isolated route shell for this phase.
- `WorkflowSkeleton`: the planned multistep-form-like scaffold nested inside the demo.
- `MapVisualization` and `CubeVisualization`: reused to preserve the shared viewport concept.
- `TimelinePanel`: reused as the timeline rail primitive.
- `DashboardStkdePanel`: reused as the fixed right analysis sidebar.
- `DashboardLayout` and `src/app/dashboard/page.tsx`: useful references for consistent dark-shell composition without reusing workflow routes.

### Established Patterns
- The app already uses dark, hard-edged dashboard shells with fixed rails and route-level composition.
- Feature routes are the right place to isolate major experiences; this phase should stay inside the new demo route.
- Shared primitives should carry the behavior while the demo shell owns presentation.

### Integration Points
- `src/app/dashboard-demo/page.tsx` mounts the demo shell.
- `src/components/dashboard-demo/DashboardDemoShell.tsx` is the main orchestration layer for layout and presentation.
- `src/components/dashboard-demo/WorkflowSkeleton` will own the staged workflow presentation when implemented.
- `src/components/timeline/TimelinePanel.tsx` and `src/components/stkde/DashboardStkdePanel.tsx` anchor the lower and right rails.
- `src/store/useTimeslicingModeStore` may surface applied-state metadata, but only as passive context in this phase.

</code_context>

<deferred>
## Deferred Ideas

- Technical workflow wiring for generate/review/apply belongs to the next phase.
- The nested workflow skeleton itself belongs to Phase 2, but its real data wiring remains deferred.
- More explicit draft-vs-applied comparison cues on the timeline belong to the technical workflow phase.
- Strong cross-linking from hotspot selection into the viewport and broader analysis flow is deferred.
- Any route-labeling or more verbose shell copy remains out of Phase 2.

</deferred>

---

*Phase: 2 - Dashboard Demo UI/UX Hardening*
*Context gathered: 2026-04-09*

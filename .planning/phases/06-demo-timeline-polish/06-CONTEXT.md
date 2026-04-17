# Phase 6: Demo Timeline Polish - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Polish the `/dashboard-demo` timeline so it becomes a calm, readable, analysis-first temporal surface. The phase keeps the demo-local warp, slice editing, and review controls available, but removes the proof-of-concept feel, simplifies the warp language, and prepares the surface for later contextual layers.

</domain>

<decisions>
## Implementation Decisions

### Timeline structure
- **D-01:** The demo uses a two-track layout: the top track is the focused/adapted timeline and the bottom track is the raw ground-truth timeline.
- **D-02:** The top focused track is the primary visual surface; the raw track stays subtle and secondary.
- **D-03:** The two tracks remain horizontally aligned so the warp is easy to compare against the raw baseline.

### Warp and slice mapping
- **D-04:** Slice regions are shown as colored bands on the focused track.
- **D-05:** The warp is explained through connector lines between the focused and raw tracks.
- **D-06:** Curved links are the preferred connector language, as long as the visual stays readable and restrained.
- **D-12:** The warp follow-up must stay demo-local and use the proven slice-authored warp-map path from `timeline-test`, but the visible treatment should shift to a quieter bands-first presentation by default.
- **D-13:** Stable `/dashboard` and `/timeslicing` remain isolated from the demo warp wiring.

### Visual hierarchy
- **D-07:** Slice editing and review are the strongest visual priority on the timeline.
- **D-08:** Playback and scrubbing stay visible and useful, but they should not overpower slice work.
- **D-09:** The overall density should be moderately rich: enough detail for analysis, but not so much that the timeline feels crowded.

### Raw baseline treatment
- **D-10:** The raw ground-truth track should act as a subtle baseline reference rather than competing with the focused track.
- **D-11:** The phase should emphasize what expanded and by how much without making the raw track visually loud.

### the agent's Discretion
- Exact connector geometry if curved links become too busy.
- Fine-grained spacing, typography, and hover treatment.
- Whether the focused/raw pairing needs one extra supporting rail or can stay as a clean two-track stack.

</decisions>

<specifics>
## Specific Ideas

- "on top I would have the focus version so the version that got adapted and then underneath like the ground truth the unadapted like the raw one"
- "there would then be lines going down showing what part of the timeline got enlarged and by how much it got enlarged"
- "I wanted it to just look good"
- "colored bands"
- "subtle baseline"
- "you decide and mention in the discussion log why"

</specifics>

<canonical_refs>
## Canonical References

### Roadmap and phase requirements
- `.planning/ROADMAP.md` — Phase 6 boundary, goal, and dependency order after the inserted timeline/context phases.
- `.planning/REQUIREMENTS.md` — `TPL-01` through `TPL-05` define the timeline polish requirements.
- `.planning/STATE.md` — Current phase/state metadata and resume pointer.

### Prior phase context
- `.planning/phases/02-dashboard-demo-ui-ux/02-CONTEXT.md` — Demo shell layout, workflow drawer, and nested `/dashboard-demo` composition.
- `.planning/phases/03-demo-timeline-rewrite/03-CONTEXT.md` — Earlier demo timeline rewrite decisions and the timeline/slice companion split.
- `.planning/phases/04-demo-stats-stkde/04-CONTEXT.md` — Demo-local analysis shell composition and map-side overlay patterns.
- `.planning/phases/05-stats-stkde-interaction/05-CONTEXT.md` — District-first analysis language and demo-local stats/STKDE interaction rules.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/timeline/DemoDualTimeline.tsx` — demo-specific timeline wrapper already exists and can carry the polished two-track presentation.
- `src/components/dashboard-demo/DemoTimelinePanel.tsx` — owns the demo timeline surface and control hierarchy.
- `src/components/dashboard-demo/DemoSlicePanel.tsx` — owns slice companion content that should stay secondary.
- `src/store/useDashboardDemoWarpStore.ts` — demo-local warp state that keeps the behavior isolated from the stable routes.
- `src/components/dashboard-demo/lib/demo-warp-map.ts` — demo-local slice-authored warp-map helper for the `/dashboard-demo` slices.
- `src/app/timeline-test/page.tsx` — proven slice-authored warp-map reference from the timeline test surface.

### Established Patterns
- The demo shell already uses isolated, demo-local surfaces instead of reusing the stable dashboard route directly.
- The demo timeline should remain analysis-first and subordinate companion content should not dominate the shell.
- The project favors clear route-level separation for demo surfaces rather than folding everything into the stable dashboard.

### Integration Points
- `src/components/dashboard-demo/DashboardDemoShell.tsx` — shell composition around the timeline and companion rail.
- `src/components/timeline/DemoDualTimeline.tsx` — the core place where the focused/raw two-track presentation lands.
- `src/components/dashboard-demo/DemoSlicePanel.tsx` — the slice companion and review surface that must remain visually secondary.
- `src/components/dashboard-demo/lib/demo-warp-map.ts` — the canonical demo-local warp helper the follow-up should keep reusing.

</code_context>

<deferred>
## Deferred Ideas

- Contextual data enrichment for socioeconomic, holiday, event, or traffic signals belongs to Phase 7.
- Workflow isolation and dashboard handoff remain later technical phases.
- Any deeper warp geometry simplification or alternate connector styles can be adjusted during planning if the chosen style becomes too dense.

</deferred>

---

*Phase: 06-demo-timeline-polish*
*Context gathered: 2026-04-09*

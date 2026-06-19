# Phase 14: Decode bursts + temporal anomalies - Context

**Gathered:** 2026-04-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Decode bursts and temporal anomalies on the timeline so non-uniform temporal scaling makes burst order, pacing, and true duration readable while preserving metric duration. The phase stays timeline-centric; map and cube remain outside the burst lens.

</domain>

<decisions>
## Implementation Decisions

### Timeline burst surface
- **D-01:** Keep the timeline minimal. Do not show inline burst text labels on the track; use only minimal visual burst marks for non-neutral bursts.
- **D-02:** Clicking a burst opens a pinned sidebar detail panel.
- **D-03:** Clicking a burst does not move the brush; the current selected window stays put.
- **D-04:** Only one burst is active at a time.

### Burst detail depth
- **D-05:** The detail panel leads with detection reason.
- **D-06:** Burst labeling is taxonomy-first with a plain-language subtitle.
- **D-07:** Detail content includes true duration plus a relative duration cue.
- **D-08:** Rationale is hover-only or in the detail panel, not inline on the timeline.

### Neutral fallback
- **D-09:** Do not show neutral burst cues on the timeline.
- **D-10:** Neutral explanation lives in the explain rail only.
- **D-11:** Neutral windows are still inspectable in the same detail panel when selected from elsewhere.
- **D-12:** Neutral wording should be plain-language first ("no clear burst", "balanced window"), with "neutral" secondary.

### the agent's Discretion
- Exact iconography and spacing for the minimal burst marks.
- Exact motion/styling for the pinned detail panel.
- Final copy polish for the detail panel and explain rail.

</decisions>

<specifics>
## Specific Ideas

- "The timeline should be as minimal as possible."
- Clicking a burst should open a detailed panel.
- "I think we shouldnt show neutral burst imho"
- Keep the burst surface quiet and move the explanation into the sidebar.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product framing and roadmap
- `Space_time_cube_V36.md` — thesis intent, adaptive temporal scaling, bursty spatiotemporal interpretation.
- `.planning/PROJECT.md` — core value, constraints, support features, and non-goals.
- `.planning/REQUIREMENTS.md` — T4/T6/T7/T8 and VIEW-05/VIEW-06 requirements.
- `.planning/ROADMAP.md` — Phase 14 scope and dependency order.

### Phase 13 decisions carried forward
- `.planning/phases/13-ux-ia-and-cube-concept/13-CONTEXT.md` — timeline-first shell, sampled overview, brush-selected detail window, timeline-only burstiness.
- `.planning/phases/13-ux-ia-and-cube-concept/13-INTERACTION-RESEARCH.md` — overview sampled across full dataset; brush selects active detail range.
- `.planning/phases/13-ux-ia-and-cube-concept/13-MASTER-DESIGN-BRIEF.md` — timeline/map/cube role separation.
- `.planning/phases/13-ux-ia-and-cube-concept/13-TIMELINE-CONCEPT.md` — timeline-led analysis contract.
- `.planning/phases/13-ux-ia-and-cube-concept/13-QUESTION-WORKFLOW.md` — guided workflow framing.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/viz/BurstList.tsx` — `useBurstWindows()` already derives burst windows from adaptive maps and selection range.
- `src/lib/binning/burst-taxonomy.ts` — already classifies windows into prolonged-peak, isolated-spike, valley, and neutral with confidence and rationale.
- `src/components/timeline/DualTimeline.tsx` and `src/components/timeline/DualTimelineSurface.tsx` — already render burst indicators, overlays, and the timeline shell that can host minimal burst marks.
- `src/components/timeline/hooks/useBrushZoomSync.ts` — owns timeline brush/zoom synchronization.
- `src/components/timeline/hooks/useDemoTimelineSummary.ts` — already exposes burst counts and timeline summary labels.
- `src/components/dashboard-demo/lib/buildDashboardDemoSelectionStory.ts` — already builds the explain/story labels for the selected window.
- `src/components/dashboard-demo/DemoExplainPanel.tsx` — already provides a pinned sidebar panel for explanation and next action.
- `src/components/dashboard-demo/lib/demo-burst-generation.ts` and `src/store/useDashboardDemoTimeslicingModeStore.ts` — selection-first draft bin generation already exists and preserves burst metadata.

### Established Patterns
- Burst decoding is already a classification and summary layer, not a new detector.
- The timeline is the primary analysis driver; the explain rail is the place for reasoning and next action.
- The codebase already favors minimal timeline surfaces with richer detail moved into side panels.
- Burst/selection state already lives in Zustand stores and can be reused for the active burst panel.

### Integration Points
- `DualTimelineSurface` for minimal burst marks and timeline rendering.
- `DemoExplainPanel` for detailed burst reasoning and next-step guidance.
- `useDashboardDemoCoordinationStore` for active burst selection and related story state.
- `useDashboardDemoTimeslicingModeStore` only if later phases want to reuse burst windows for draft generation.

</code_context>

<deferred>
## Deferred Ideas

- Showing neutral burst cues on the timeline was explicitly rejected.
- Any change that turns burst decoding into a global map/cube concern belongs in another phase.
- Any new burst detector or new anomaly family belongs in a later planning pass, not this phase.

</deferred>

---

*Phase: 14-decode-bursts-temporal-anomalies*
*Context gathered: 2026-04-30*

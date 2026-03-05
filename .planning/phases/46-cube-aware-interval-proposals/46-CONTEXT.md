# Phase 46: Cube-Aware Interval Proposals - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver interval proposals for the cube sandbox that reflect temporal bursts within active spatial context, expose confidence/quality signals, and remain useful after user boundary edits.

</domain>

<decisions>
## Implementation Decisions

### Interval proposal shape
- Generate a ranked set of interval proposals, not a single interval.
- Each proposal is one interval window with explicit linked spatial context (constraint/region labels).
- Group proposal lists by active spatial context, then rank by quality inside each group.
- Default to a small, reviewable set per group (top candidates only) with overlap suppression.

### Interval rationale format
- Show rationale as plain-language sentence first, then metrics.
- Always include interval confidence as band plus numeric score.
- Always include quality metrics that explain why the interval was selected (density concentration and hotspot coverage minimum).
- Keep cards concise by default with expandable detail for deeper inspection.

### Edit behavior for proposed intervals
- User can drag/edit interval boundaries directly from proposal state.
- Editing preserves source linkage to the originating proposal for traceability.
- Quality metrics and confidence recompute immediately after edits.
- If edits make a proposal invalid, keep it editable and mark quality downgrade instead of discarding it.

### Review and apply flow
- Use preview -> apply -> undo as the default interaction model.
- Keep review/apply controls in the right sandbox rail (inline, no modal dependency).
- After apply, immediately show impacted region/time window plus an expected-effect sentence in cube diagnostics.
- Low-confidence proposals stay visible and applicable (do not auto-hide).

### Claude's Discretion
- Exact scoring weights and tie-break policy for interval ranking.
- Exact default proposal count and overlap threshold values.
- UI microcopy for rationale and confidence badges.
- Visual style for edited-vs-original proposal cues.

</decisions>

<specifics>
## Specific Ideas

- Keep interval review fast and readable for real analyst workflows: short rationale first, detail on demand.
- Prefer deterministic ranking for identical inputs so users can trust proposal stability while iterating.

</specifics>

<deferred>
## Deferred Ideas

- Spatial variant of warping (full spatiotemporal non-uniform warp field) is a separate capability and should be planned as its own phase.

</deferred>

---

*Phase: 46-cube-aware-interval-proposals*
*Context gathered: 2026-03-05*

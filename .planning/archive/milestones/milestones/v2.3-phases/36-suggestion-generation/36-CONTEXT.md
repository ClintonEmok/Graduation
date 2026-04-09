# Phase 36: Suggestion Generation - Context

**Gathered:** 2026-02-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Algorithms that analyze crime density data to generate warp profile suggestions and interval boundary suggestions. Takes the UI infrastructure from Phase 35 and adds real algorithmic generation. Phase 37 will add review/approval workflows.

This phase focuses on the generation algorithms only — not the acceptance workflow or automation.

</domain>

<decisions>
## Implementation Decisions

### Warp Profile Generation
- **Algorithm:** Claude's discretion — hybrid approach combining density-weighting with event detection
- **Interval count:** User-configurable (3-12 intervals), user chooses in UI
- **Representation:** Absolute time (epoch seconds), tied to actual crime data dates
- **Alternatives:** Multiple profiles (2-3) with different emphasis (e.g., aggressive vs conservative), user chooses

### Interval Boundary Detection
- **Methods:** All available — peak detection, change point detection, rule-based — user selects method in UI
- **Sensitivity:** Claude's discretion (medium sensitivity as default)
- **Snapping:** User toggle in UI (snap to hour/day boundaries vs exact)
- **Overlap:** Non-overlapping intervals by default (clean partitions)

### Confidence Scoring
- **Basis:** Composite scoring — weighted combination of data clarity, coverage, and statistical measures
- **Range:** 0-100% (matches Phase 35 ConfidenceBadge format)
- **Granularity:** Per-profile scores (aggregate for entire warp profile)
- **Low-confidence:** Show all suggestions with visual warning indicator for low confidence

### Context-Awareness
- **Filter response:** Automatic re-analysis when filters change
- **Influencing factors:** All — crime type filter, time range, geographic filter
- **Context display:** User toggle in UI (explicit "Based on: ..." vs implicit)
- **Empty dataset:** Show helpful message suggesting to expand filters

### Claude's Discretion
- Specific hybrid algorithm implementation details
- Sensitivity threshold values (what counts as medium)
- Weighting of composite confidence factors
- Warning threshold for low-confidence indicators

</decisions>

<specifics>
## Specific Ideas

- Multiple warp profile alternatives (2-3) gives users meaningful choice
- Absolute time representation ties directly to real dates in crime data
- Per-profile confidence (not per-boundary) keeps UI cleaner
- Re-analyze on filter change keeps suggestions relevant to current view

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope (generation algorithms only)

</deferred>

---

*Phase: 36-suggestion-generation*
*Context gathered: 2026-02-25*

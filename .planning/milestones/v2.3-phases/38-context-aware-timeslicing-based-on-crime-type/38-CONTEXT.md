# Phase 38: context aware timeslicing based on crime type - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Add context-aware timeslicing generation that analyzes the user's current filter context (crime types, time ranges, parameters) to produce relevant warp profiles and interval boundaries. The system will support both analyzing the visible time range or the full dataset, and offer smart context profiles with custom user profiles.

This phase delivers:
- Context extraction from all active filters and user parameters
- Context-aware suggestion generation with mode selection (visible range vs all)
- Smart profile auto-detection + custom profile creation
- Persisted context metadata on accepted suggestions

Phase 38 is the first of v1.3 Fully Automated Timeslicing Workflows.

</domain>

<decisions>
## Implementation Decisions

### Context Definition
- Context includes: all user-selected filters (crime type, categories) + all user-selected parameters
- Time range mode: both options offered — "analyze visible" (current viewport) vs "analyze all" (entire dataset)
- Spatial context: NOT in scope — deferred to v2.0 Spatially-Constrained 3D Timeslicing

### Automation Trigger
- Auto-regenerate: Yes — when filters change, suggestions auto-regenerate (debounced)
- Manual trigger: Yes — "Analyze Context" button for immediate results
- Both: auto debounced + manual button available

### Context Profiles
- Smart profiles: Yes — system auto-detects common filter combinations (burglary, violent crimes, all crimes)
- Custom profiles: Yes — user can save current filter combination as named profile
- Number of smart profiles: Claude's discretion — system determines optimal

### Output Presentation
- Context badges on suggestions: Claude's discretion
- Visual distinction from non-context suggestions: Claude's discretion
- Persist context metadata on accept: YES — store which context was used
- Show context in history: Claude's discretion

### Claude's Discretion
- Exact context badge design and placement
- Number of smart profile suggestions
- Visual styling differences between context-aware and regular suggestions
- History item presentation details

</decisions>

<specifics>
## Specific Ideas

No specific references provided — open to standard approaches that work well with the existing suggestion panel UI.

</specifics>

<deferred>
## Deferred Ideas

- Spatial context (map viewport bounds) — Phase 40+ or v2.0

</deferred>

---

*Phase: 38-context-aware-timeslicing-based-on-crime-type*
*Context gathered: 2026-02-28*

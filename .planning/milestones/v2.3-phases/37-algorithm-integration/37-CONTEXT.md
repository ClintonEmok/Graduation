# Phase 37: Algorithm Integration - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Connect the confidence scoring, warp profile generation, and interval boundary detection algorithms (Phase 36) to the suggestion UI (Phase 35) to create a complete review/approval workflow. This completes the semi-automated timeslicing workflows for v1.2.

**What's built so far:**
- Phase 35: SuggestionPanel, SuggestionCard, Accept/Modify/Reject buttons, Generate mock suggestions
- Phase 36: confidence-scoring.ts, warp-generation.ts, interval-detection.ts algorithms

**Phase 37 scope:** Wire algorithms to real data, complete the accept/modify workflow, create seamless user experience.

</domain>

<decisions>
## Implementation Decisions

### Generation Triggers
- **Hybrid approach**: Manual "Generate" button + auto-regenerate on filter changes
- **500ms debounce**: Delay before auto-regenerating after filter changes
- **Preserve accepted**: (Claude's discretion) How to handle existing suggestions on filter change

### Accept Workflow - Warp Profiles
- (Claude's discretion): Apply to timeline immediately, create warp slice, or both

### Accept Workflow - Interval Boundaries
- (Claude's discretion): Create time slices, create single slice, or mark for reference

### Accept Workflow - Post-Accept
- (Claude's discretion): Keep in panel, remove from list, or archive section

### Accept Workflow - Conflicts
- (Claude's discretion): No impact, auto-reject conflicting, or suggest alternatives

### Modification - Re-scoring
- (Claude's discretion): Re-calculate always, re-calculate on save, or no re-calculation

### Modification - Warp UI
- (Claude's discretion): Inline sliders, side panel, or timeline drag

### Modification - Interval UI
- (Claude's discretion): Inline list, timeline markers, or number input

### Modification - Workflow
- (Claude's discretion): Accept immediately, review then accept, or save as draft

### Mixed Types - Generation
- (Claude's discretion): Package deal, independent, or guided sequence

### Mixed Types - Visual Distinction
- **Different colors + badges**: Warp profiles and interval boundaries have distinct accent colors AND type badges on each card
- Sections: (Claude's discretion) whether to add section headers

### Mixed Types - Suggestion Counts
- **User-configurable**: Slider to control count of each type
- Defaults: 3 warp profiles, 3 interval boundary sets

### Mixed Types - Controls
- (Claude's discretion): Unified Generate, separate controls, or tabbed interface

### Error Handling
- (Claude's discretion): Show empty state, show error state, or keep previous suggestions

</decisions>

<specifics>
## Specific Ideas

- User prefers user-configurable suggestion counts over fixed defaults
- Visual distinction is important: colors AND badges for suggestion types
- User trusts Claude to make reasonable implementation decisions on workflow details

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 37-algorithm-integration*
*Context gathered: 2026-02-26*

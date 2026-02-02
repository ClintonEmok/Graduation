# Phase 7: Advanced Filtering - Context

**Gathered:** 2026-02-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement multi-faceted filtering for the Chicago crime dataset. Users can slice data by crime type, date, and spatial region. This phase connects the UI controls to the data pipeline established in Phase 6.

</domain>

<decisions>
## Implementation Decisions

### Filtering UI
- **Floating Overlay**: Controls live in a toggleable overlay to maximize view space.
- **Faceted Search**: UI presents categories (Crime Type, District) with counts, rather than a complex query builder.

### Spatial Filtering
- **Select Predefined**: Primary interaction is clicking Chicago districts/wards to filter.
- **Visual Feedback**: **Ghosting/Dimming** for excluded points (maintain context) rather than hiding them completely.
- **Drawing Tools**: Deferred to later phases/iterations.

### Filter Persistence
- **Session Only (Initial)**: Filters reset on reload for simplicity in this phase.
- **Future-proofing**: Architect state to support URL params later.
- **Presets**: Support Hardcoded ("Violent Crimes"), User Created ("My Analysis"), and History ("Recent").

### Query Performance
- **OpenCode's Discretion**: Choose between Backend (DuckDB) vs Client-side filtering based on Phase 6 performance. (Likely Backend for "Full Historical" scale).
- **Debouncing**: "On Release" or "Apply Button" preferred for heavy backend queries; Real-time if client-side is fast enough.

</decisions>

<specifics>
## Specific Ideas

- "Floating overlay" for the filter panel.
- Spatial filtering should "ghost" excluded points, not remove them.
- Start with predefined regions (Districts) before implementing drawing tools.

</specifics>

<deferred>
## Deferred Ideas

- URL Parameter synchronization (Phase 8 or later enhancement).
- Complex polygon drawing tools (Start with predefined regions).

</deferred>

---

*Phase: 07-advanced-filtering*
*Context gathered: 2026-02-02*

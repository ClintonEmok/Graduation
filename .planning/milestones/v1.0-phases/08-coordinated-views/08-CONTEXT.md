# Phase 08: Coordinated Views - Context

**Gathered:** 2026-02-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver coordinated exploration across Map, Cube, and Timeline with a dual-scale (overview + detail) timeline, bidirectional selection/highlighting, and shared time/filter synchronization. No new capabilities beyond coordination are added in this phase.

</domain>

<decisions>
## Implementation Decisions

### Dual-scale timeline interaction
- Default detail range: full range on load (no initial zoom)
- Brush updates: live update with debounce while dragging
- Detail zoom: wheel zoom + drag pan
- Brush snapping: continuous (no snap)

### Selection behavior across views
- Selection trigger: click selects; hover highlights only
- Selection persistence: single selection replaced on new selection; cleared by explicit clear action
- Clear action: click empty space or press ESC
- Multi-selection: not supported (single selection only)

### Sync rules
- Time range changes update all views immediately (shared store)
- Current time sync is bidirectional via the shared time store
- Filters are global and shared across all views
- Selection always propagates across cube, map, and timeline

### Visual emphasis
- Cube: brighter color + slightly higher opacity + subtle scale boost for selected point
- Map: solid circle marker with contrasting outline
- Timeline: vertical line with a dot at the selected event time
- Non-selected points: slight dim when a selection exists

### OpenCode's Discretion
- Exact debounce interval for brush updates
- Exact marker styling (colors, sizes, animations)
- Precise hover highlight styling

</decisions>

<specifics>
## Specific Ideas

No specific references — open to standard approaches.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 08-coordinated-views*
*Context gathered: 2026-02-02*

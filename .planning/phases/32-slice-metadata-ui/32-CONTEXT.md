# Phase 32: Slice Metadata & UI - Context

**Gathered:** 2026-02-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Enable naming, coloring, and annotating timeline slices. Extends the existing slice model with color and notes fields. This is the final phase of v1.1 Manual Timeslicing—after this, the milestone is complete.

</domain>

<decisions>
## Implementation Decisions

### Name Editing
- Inline rename in slice list (existing Phase 29 pattern)
- Edit button + Enter/Escape/blur behavior
- Extends existing rename functionality rather than creating new UI

### Color Customization
- Preset palette of 8-10 colors
- Colors: amber, blue, green, red, purple, cyan, pink, gray (matching UI accent patterns)
- No full color picker — presets only for simplicity and consistency

### Annotation/Notes
- Simple tooltip on hover
- Expand to inline text area in slice list
- Truncated preview in list, full text on hover/expand

### Persistence
- LocalStorage only for v1.1
- Extend existing Zustand persist in useSliceStore
- No server-backed architecture yet (v2.0 concern)

### Claude's Discretion
- Exact preset color hex values
- Tooltip positioning and styling
- Notes field character limit
- Text area expand/collapse animation

</decisions>

<specifics>
## Specific Ideas

No specific references—standard timeline interaction patterns applied. Extends existing Phase 29 rename functionality.

</specifics>

<deferred>
## Deferred Ideas

- Full color picker — presets sufficient for v1.1
- Server-backed persistence — v2.0
- Sidebar detail panel — inline/hover pattern keeps it lightweight

</deferred>

---

*Phase: 32-slice-metadata-ui*
*Context gathered: 2026-02-20*

# Phase 31: Multi-Slice Management - Context

**Gathered:** 2026-02-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Support multiple simultaneous timeline slices with management tools: overlap visualization, merge capability, selection mechanism, and bulk delete. This is the multi-slice management phase within v1.1 Manual Timeslicing—visualization of density regions (Phase 26), slice creation (Phase 27), boundary adjustment (Phase 28), and burst-as-slice (Phase 29) are complete. Phase 32 covers slice metadata (name, color, notes).

</domain>

<decisions>
## Implementation Decisions

### Overlap Visualization
- Semi-transparent stacking with z-order by creation time
- Newer slices render on top with ~60% opacity
- Matches existing CommittedSliceLayer behavior
- Avoids complex side-by-side separation logic

### Selection Mechanism
- Click to select a single slice
- Ctrl/Cmd+click to toggle add/remove from selection
- Standard list selection pattern mirrors SliceList behavior
- Shift+click range selection deferred to future enhancement

### Merge Behavior
- Manual trigger only—no automatic merging when boundaries touch
- "Merge Selected" button appears in toolbar when 2+ overlapping/touching slices selected
- Avoids UX confusion about automatic boundary snapping

### Bulk Operations
- Toolbar action buttons appear only when 2+ slices selected
- "Delete Selected" and "Merge Selected" buttons in SliceToolbar
- Context menu and action bar patterns deferred
- Builds on existing toolbar infrastructure from Phase 27

### Claude's Discretion
- Exact opacity value (tune for visual clarity)
- Button styling and placement within toolbar
- Minimum overlap threshold for merge eligibility
- Keyboard accessibility for multi-select

</decisions>

<specifics>
## Specific Ideas

No specific references—standard timeline interaction patterns applied to multi-slice scenario. Recommendations follow established codebase conventions from Phases 26-30.

</specifics>

<deferred>
## Deferred Ideas

- Shift+click range selection — future enhancement
- Context menu for slice actions — Phase 32 metadata work
- Action bar for bulk operations — toolbar buttons sufficient for v1.1

</deferred>

---

*Phase: 31-multi-slice-management*
*Context gathered: 2026-02-20*

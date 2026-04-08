# Phase 12: Feature Flags Infrastructure - Context

**Gathered:** 2026-02-04
**Status:** Ready for planning

<domain>
## Phase Boundary

A settings system where users can toggle experimental visualization features on/off. Toggles persist across browser sessions via localStorage and can be shared via URL parameters. This phase builds the infrastructure that Phases 13-19 will use to enable/disable their features.

</domain>

<decisions>
## Implementation Decisions

### Settings Panel Access
- **Location:** Convert existing Controls.tsx into a floating toolbar with gear icon for settings
- **Toolbar behavior:** User-draggable (can be repositioned anywhere on screen)
- **Panel style:** Claude's discretion (modal, dropdown, or drawer)

### Flag Organization
- **Structure:** Tabs for organizing features by category
- **Tab groupings:** Claude decides appropriate groupings based on implemented features
- **Labels:** Name + short description + status indicator (experimental/stable/beta)
- **Order:** Fixed — Claude determines sensible ordering

### Toggle Behavior
- **Apply mode:** Batch with Save — user makes changes, clicks Save to apply
- **Close without save:** Discard silently (no warning, changes lost)
- **Disable confirmation:** Only for destructive actions where user state would be lost (e.g., positioned time slices)
- **Unsaved indicator:** Prominent — Save button highlighted + "Unsaved changes" label visible

### Default States
- **New features:** Off by default — users opt-in to enable
- **Reset option:** Global "Reset to defaults" button
- **Sharing:** URL params encode active features for shareable configurations
- **Conflict resolution:** URL wins over localStorage, but prompt user before overriding ("This link wants to enable X. Apply these settings?")

### Claude's Discretion
- Settings panel presentation style (modal vs dropdown vs drawer)
- Tab category names and groupings
- Feature ordering within tabs
- Exact visual styling of toggle switches and status indicators

</decisions>

<specifics>
## Specific Ideas

- Floating toolbar should feel unobtrusive — don't block the 3D cube or map
- URL sharing is important for research collaboration (sharing specific visualization configs)
- Status indicators help users understand feature maturity (experimental vs stable)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-feature-flags*
*Context gathered: 2026-02-04*

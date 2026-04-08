# Phase 43: 3D Sandbox Route Foundation - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a dedicated sandbox route for 3D timeslicing experiments that is isolated from production workflows, opens directly into cube analysis, provides clear active context, and supports rapid reset/reload for repeated testing.

</domain>

<decisions>
## Implementation Decisions

### Sandbox entry flow
- Sandbox opens directly into the cube view; no landing or pre-step.
- No special experimental warning/badge is required in v2.0.

### Default startup state
- Default load uses the latest thesis dataset.
- Initial timeslicing mode defaults to uniform mode.
- No first-load tutorial hints.

### Reset and reload behavior
- Primary reset action is hard reset to sandbox defaults.
- Reset does not require confirmation.
- Reset clears proposal review decisions (accepted/rejected/edited state).
- No keyboard shortcut is required for reset in this phase.

### Context panel behavior
- Compact debug/context panel is on the right side.
- Warp and mode state must always be visible without expansion.
- No export/copy/share action is required for context in this phase.

### Claude's Discretion
- Exact sandbox access pattern in the app shell/navigation.
- Final route title/label wording.
- Initial cube camera/orientation defaults.
- Whether the right-side context panel starts open or collapsed.

</decisions>

<specifics>
## Specific Ideas

- Keep the workflow focused on immediate cube experimentation with minimal ceremony.

</specifics>

<deferred>
## Deferred Ideas

- Broader timeline/map parity remains deferred to later phases unless needed for cube outcomes.

</deferred>

---

*Phase: 43-3d-sandbox-route-foundation*
*Context gathered: 2026-03-05*

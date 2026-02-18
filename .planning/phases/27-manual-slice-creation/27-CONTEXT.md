# Phase 27: Manual Slice Creation - Context

**Gathered:** 2026-02-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Enable users to create time slices via click or drag on the timeline. Supports click-to-create (default duration) and drag-to-create (custom duration), with visual preview during creation and immediate visual feedback. Slice boundary adjustment and multi-slice management are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Interaction Mode
- Mode toggle approach with context-aware behavior
- Subtle indicator (small icon/cursor change)
- Default state and mid-action switching: Claude's discretion

### Default Duration Behavior
- All aspects: Claude's discretion (fixed vs zoom-relative vs density-adaptive, click anchoring, override methods, presets)

### Visual Feedback During Creation
- Combination approach: ghost slice + highlighted region + duration tooltip
- Color/styling for creation mode: Claude's discretion
- Invalid slice handling: Claude's discretion
- Completion animation: Claude's discretion

### Post-Creation State
- Newly created slice is automatically selected (always)
- Auto-generated name for new slices (numbered or timestamp-based)
- Post-creation mode and overlap handling: Claude's discretion (auto-merge preferred)

### Interaction Conflicts
- Minimum drag threshold: Claude's discretion
- Pan/zoom vs create conflict resolution: Claude's discretion
- Out-of-bounds release behavior: Claude's discretion
- Pan/zoom in create mode: Claude's discretion

### Duration Constraints
- Minimum/maximum duration: Claude's discretion
- Zoom-relative maximum duration preferred
- Snap behavior: Configurable (user can enable/disable)
- Visual limit indicators: Claude's discretion

### Test Environment Integration
- **Build in test environment first** — Develop in `/timeline-test` route before production
- **Test environment includes:** Full slice creation, mock slice data, overlap scenarios, persistence testing
- **Migration to production:** On user request ("when I ask")

</decisions>

<specifics>
## Specific Ideas

- Follow Phase 26 pattern: Build in isolated test route first, then migrate to production
- Test environment should validate all edge cases (overlaps, constraints, persistence)
- User controls when features move from test to production timeline

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 27 scope

</deferred>

---

*Phase: 27-manual-slice-creation*
*Context gathered: 2026-02-18*

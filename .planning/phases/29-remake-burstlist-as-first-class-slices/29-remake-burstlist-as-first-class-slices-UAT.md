---
status: testing
phase: 29-remake-burstlist-as-first-class-slices
source: 29-01-SUMMARY.md, 29-02-SUMMARY.md, 29-03-SUMMARY.md, 29-04-SUMMARY.md, 29-05-SUMMARY.md
started: 2026-02-19T16:03:00Z
updated: 2026-02-19T16:06:00Z
---

## Current Test

number: 3
name: Unified List Shows Manual and Burst Slices
expected: |
  The slice list shows both manual and burst-derived slices in one chronological list, sorted by timeline start time. Both types use consistent card styling.
awaiting: user response

## Tests

### 1. Burst Windows Create Slices on Click
expected: Clicking a burst window in the burst list or on the timeline creates a new time slice with matching range. The slice appears in the unified slice list with a "Burst" chip.
result: issue
reported: "cant create bursts onclick and the UX is not logical when can we do this."
severity: major

### 2. Duplicate Burst Clicks Reuse Existing Slices
expected: Clicking the same burst window again does not create a duplicate slice; it selects/reuses the existing slice with matching range.
result: skipped
reason: "Depends on Test 1 functionality"

### 3. Unified List Shows Manual and Burst Slices
expected: The slice list shows both manual and burst-derived slices in one chronological list, sorted by timeline start time. Both types use consistent card styling.
result: pending

### 4. Burst Chip Appears on Unrenamed Burst Slices
expected: Burst-derived slices that still have default "Burst N" names show a small "Burst" chip badge. Renamed burst slices hide the chip.
result: pending

### 5. Burst Click Focuses Timeline to Slice Range
expected: After clicking a burst window, the timeline automatically zooms/focuses to show the burst's time range.
result: pending

### 6. Burst Slices Render on Timeline
expected: Both manual and burst slices appear as overlays on the detail timeline view. Burst slices use the same visual treatment as manual slices.
result: pending

### 7. Boundary Adjustment Works for Burst Slices
expected: Clicking on a burst slice in the list or timeline selects it and shows draggable start/end boundary handles. Dragging a handle adjusts the slice boundaries in real-time.
result: pending

### 8. Burst Slice Delete and Recreate Lifecycle
expected: Deleting a burst slice from the slice list removes it. Clicking the original burst window again recreates a new burst slice (not reusing the deleted one).
result: pending

### 9. Inline Rename in SliceList
expected: In the unified slice list, clicking the edit button next to a slice name opens an inline text field. Typing a new name and pressing Enter saves it. Escape cancels. The renamed slice updates immediately across all UI surfaces.
result: pending

### 10. Rename in SliceManagerUI
expected: Opening the Slice Manager UI (via sheet/panel) shows a name input field for each slice. Typing updates the name in real-time. Clearing the input restores the fallback name (Slice N or Burst N).
result: pending

### 11. Burst Chip Visibility Responds to Rename
expected: Renaming a burst slice from "Burst 1" to "My Event" immediately hides the Burst chip. Renaming back to "Burst 1" makes it reappear.
result: pending

### 12. Accessibility - Burst Origin Announcements
expected: Screen readers announce the burst origin when focusing on burst-derived slice list items (e.g., "Burst 1, burst slice, selected").
result: pending

## Summary

total: 12
passed: 0
issues: 1
pending: 10
skipped: 1

## Gaps

- truth: "Clicking a burst window in the burst list or on the timeline creates a new time slice with matching range"
  status: failed
  reason: "User reported: cant create bursts onclick and the UX is not logical when can we do this."
  severity: major
  test: 1
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

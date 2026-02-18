---
status: complete
phase: 27-manual-slice-creation
source:
  - 27-01-SUMMARY.md
  - 27-02-SUMMARY.md
  - 27-03-SUMMARY.md
  - 27-04-SUMMARY.md
  - 27-05-SUMMARY.md
started: 2026-02-18T18:44:05Z
updated: 2026-02-18T18:59:06Z
---

## Current Test

[testing complete]

## Tests

### 1. Click-to-create shows a visible default-duration range slice
expected: |
  Clicking the timeline (without dragging) creates a range slice with default duration.
  The new slice is visible on the timeline and appears in the slice list as a time range.
result: issue
reported: "there is an issue user slices are created but are not shown on the timeline"
severity: major

### 2. Drag-to-create shows ghost preview and persists a custom range
expected: |
  In create mode, dragging across the timeline shows an amber ghost region while dragging.
  Releasing pointer creates a slice covering the dragged range.
  The slice is visible on the timeline and appears in the slice list with a range label.
result: issue
reported: "amber region is visble while dragging but it disappears when created"
severity: major

### 3. Snap and duration constraints behave during creation
expected: |
  Snap toggle changes boundary behavior between snapped and unsnapped creation.
  Very small slices are constrained to minimum duration and oversized slices are clamped.
  Constraint feedback is visible during preview when limits are hit.
result: pass

### 4. Creation cancellation works via Escape and mode changes
expected: |
  Pressing Escape during active creation cancels preview without committing a slice.
  Switching out of create mode also cancels active creation cleanly.
result: pass

### 5. Slice list interactions support selection and deletion
expected: |
  Created slices appear in the list with auto names and readable date range labels.
  Clicking a list item selects it as active.
  Deleting removes the slice from list and timeline.
result: issue
reported: "list and names work but the clicking to make active deosnt work and it doesnt show on the timeline"
severity: major

### 6. Timeline axis and tooltips use real calendar dates
expected: |
  Timeline labels and related time displays show readable dates (2024 range), not normalized 0-100 numbers.
  Slice labels and hover text use meaningful calendar time formatting.
result: pass

## Summary

total: 6
passed: 3
issues: 3
pending: 0
skipped: 0

## Gaps

- truth: "Clicking the timeline creates a visible range slice on the timeline and in the slice list"
  status: failed
  reason: "User reported: there is an issue user slices are created but are not shown on the timeline"
  severity: major
  test: 1
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
- truth: "Drag-created slice remains visible on the timeline after pointer release"
  status: failed
  reason: "User reported: amber region is visble while dragging but it disappears when created"
  severity: major
  test: 2
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
- truth: "Clicking a slice in the list sets it active and the slice remains visible on the timeline"
  status: failed
  reason: "User reported: list and names work but the clicking to make active deosnt work and it doesnt show on the timeline"
  severity: major
  test: 5
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

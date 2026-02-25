---
status: complete
phase: 29-remake-burstlist-as-first-class-slices
source: 29-01-SUMMARY.md, 29-02-SUMMARY.md, 29-03-SUMMARY.md, 29-04-SUMMARY.md, 29-05-SUMMARY.md, 29-06-SUMMARY.md, 29-07-SUMMARY.md
started: 2026-02-19T22:40:00Z
updated: 2026-02-19T22:45:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Automatic burst slices appear
expected: When burst data is available/computed, burst slices appear automatically in the unified slice list without any user interaction. No clicking required.
result: pass

### 2. Burst list items select slices
expected: Clicking a burst item in the burst list selects the existing auto-created burst slice (not creating a new one). The slice becomes highlighted/active.
result: pass

### 3. Timeline burst overlays select slices
expected: Clicking a burst overlay on the timeline selects the corresponding existing auto-created burst slice (not creating a new one).
result: pass

### 4. Burst chips appear on auto-created slices
expected: Auto-created burst slices that still have default "Burst N" names display a small "Burst" chip/badge in the slice list. Renamed burst slices hide the chip.
result: pass

### 5. Timeline renders auto-created burst slices
expected: Both manual and auto-created burst slices appear as overlays on the detail timeline. Burst slices use the same visual treatment as manual slices.
result: pass

### 6. Boundary adjustment works on burst slices
expected: Selecting an auto-created burst slice shows draggable start/end boundary handles. Dragging a handle adjusts the slice boundaries in real-time.
result: pass

### 7. Rename works on auto-created burst slices
expected: Clicking the edit button next to an auto-created burst slice allows renaming it inline. The new name persists and hides the "Burst" chip.
result: pass

### 8. Delete and recreate works
expected: Deleting an auto-created burst slice removes it from the list. The slice can be recreated automatically when burst data recomputes (or via click select).
result: pass

### 9. No duplicate slices on recompute
expected: When burst data recomputes or the page refreshes, the reuse logic prevents creating duplicate burst slices. Existing slices are reused.
result: pass

## Summary

total: 9
passed: 9
issues: 0
pending: 0
skipped: 0

## Gaps

[none]

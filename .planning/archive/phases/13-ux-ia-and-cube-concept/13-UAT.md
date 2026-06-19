---
status: testing
phase: 13-ux-ia-and-cube-concept
source:
  - .planning/phases/13-ux-ia-and-cube-concept/13-01-SUMMARY.md
  - .planning/phases/13-ux-ia-and-cube-concept/13-02-SUMMARY.md
  - .planning/phases/13-ux-ia-and-cube-concept/13-03-SUMMARY.md
  - .planning/phases/13-ux-ia-and-cube-concept/13-04-SUMMARY.md
  - .planning/phases/13-ux-ia-and-cube-concept/13-05-SUMMARY.md
started: 2026-04-24T00:00:00Z
updated: 2026-04-24T00:00:00Z
---

## Current Test

number: 2
name: Timeline compare summary
expected: |
  The timeline panel clearly presents compare-friendly copy, with the dual timeline
  reading as the primary analysis driver.
awaiting: user response

## Tests

### 1. Guided workflow shell and explain rail
expected: The dashboard-demo page opens as a timeline-first guided workflow with a visible left workflow drawer and a right-side Explain rail.
result: issue
reported: "The result of getServerSnapshot should be cached to avoid an infinite loop src/components/timeline/hooks/useDemoTimelineSummary.ts (8:49) @ useDemoTimelineSummary"
severity: blocker

### 2. Timeline compare summary
expected: The timeline panel clearly presents compare-friendly copy, with the dual timeline reading as the primary analysis driver.
result: pending

### 3. Relational cube wording
expected: The cube explains grouped structure and linked selection rather than reading like a raw data browser or generic scatterplot.
result: pending

### 4. Shared selection story across views
expected: The timeline, map, and cube describe the same active window and linked highlight using consistent story text.
result: pending

### 5. Stable dashboard isolation
expected: The stable dashboard route stays isolated from demo-only Phase 13 wording and does not show the guided workflow copy.
result: pending

## Summary

total: 5
passed: 0
issues: 1
pending: 4
skipped: 0

## Gaps

- truth: "The dashboard-demo page opens as a timeline-first guided workflow with a visible left workflow drawer and a right-side Explain rail."
  status: failed
  reason: "User reported: The result of getServerSnapshot should be cached to avoid an infinite loop src/components/timeline/hooks/useDemoTimelineSummary.ts (8:49) @ useDemoTimelineSummary"
  severity: blocker
  test: 1
  root_cause: "useDemoTimelineSummary subscribed to useTimelineDataStore with a selector that returned a new object on every render, causing unstable store snapshots and an infinite loop in React's server snapshot handling."
  artifacts:
    - path: "src/components/timeline/hooks/useDemoTimelineSummary.ts"
      issue: "Store selector returned a fresh object literal instead of cached primitive selectors"
  missing:
    - "Use separate store selectors or a shallow comparator so the snapshot remains stable"
  debug_session: ""

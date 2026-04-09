---
status: testing
phase: 06-demo-timeline-polish
source: 06-01-SUMMARY.md
started: 2026-04-09T21:38:10Z
updated: 2026-04-09T21:46:05Z
---

## Current Test

number: 1
name: Simplified focused/raw hierarchy
expected: |
  `/dashboard-demo` shows a cleaner two-track timeline with the focused/adapted track on top, the raw baseline subtle underneath, and only light slice emphasis.
  The demo should feel calmer and less visually busy than the first pass.
awaiting: user response

## Tests

### 1. Focused/raw timeline hierarchy
expected: `/dashboard-demo` shows a polished two-track timeline with the focused/adapted track clearly stronger on top, the raw baseline subtle underneath, and visible slice bands/connectors.
result: issue
reported: "it doesnt look good maybe we need a simpler way"
severity: cosmetic

### 2. Temporal controls and slice companion balance
expected: The timeline card keeps playback, scrub, temporal-resolution, and warp controls readable while the slice companion stays compact and secondary.
result: [pending]

### 3. Stable route isolation
expected: `/dashboard` and `/timeslicing` stay free of demo timeline polish changes or demo chrome leakage.
result: [pending]

## Summary

total: 3
passed: 0
issues: 1
pending: 3
skipped: 0
blocked: 0

## Gaps

- truth: "The demo timeline should feel simpler and less visually busy while keeping the focused/raw hierarchy readable."
  status: failed
  reason: "User reported: it doesnt look good maybe we need a simpler way"
  severity: cosmetic
  test: 1
  root_cause: "The demo timeline presentation is over-layered: the connector art, overlay bands, and redundant labels create too much visual noise and make the track stack feel awkwardly tall."
  artifacts:
    - path: "src/components/timeline/DemoDualTimeline.tsx"
      issue: "Adds extra focus/raw captioning and connector art on top of the underlying timeline."
    - path: "src/components/dashboard-demo/DemoTimelinePanel.tsx"
      issue: "Adds helper copy above an already dense timeline card."
    - path: "src/components/timeline/DualTimeline.tsx"
      issue: "Supports the more elaborate connector language that is too busy for this phase."
  missing:
    - "Remove or hide the connector art by default"
    - "Compress the header copy to a single short legend"
    - "Keep only the aligned focused/raw tracks and subtle slice emphasis"
  debug_session: ""

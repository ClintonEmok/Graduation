---
status: testing
phase: 02-dashboard-demo-ui-ux
source: 02-05-SUMMARY.md
started: 2026-04-09T11:30:00Z
updated: 2026-04-09T11:35:00Z
---

## Current Test

number: 2
name: Route isolation regressions
expected: |
  `/dashboard` and `/timeslicing` stay free of demo chrome leakage from the new dashboard demo shell.
awaiting: user response

## Tests

### 1. Demo shell chrome
expected: `/dashboard-demo` opens as a low-density, map-first shell with icon-only viewport controls and applied-state-only status.
result: issue
reported: "pass but when switching to 3d the toggle doesnt show anymore, believe the 3d cube overlay the toggle"
severity: major

### 2. Route isolation regressions
expected: `/dashboard` and `/timeslicing` stay free of demo chrome leakage from the new dashboard demo shell.
result: [pending]

### 3. Nested workflow drawer
expected: The workflow appears as a left-anchored drawer inside `/dashboard-demo` with Explore, Build, and Review stages.
result: [pending]

## Summary

total: 3
passed: 0
issues: 1
pending: 2
skipped: 0
blocked: 0

## Gaps

- truth: "The 3D cube view must not obscure the map/cube viewport toggle in `/dashboard-demo`."
  status: failed
  reason: "User reported: pass but when switching to 3d the toggle doesnt show anymore, believe the 3d cube overlay the toggle"
  severity: major
  test: 1
  root_cause: "The viewport toggle shared the same top-right stacking neighborhood as the 3D scene layer and was rendered at a lower z-index, so the cube view could cover it."
  artifacts:
    - path: "src/components/dashboard-demo/DashboardDemoShell.tsx"
      issue: "Viewport toggle used z-10 inside the shared viewport while the 3D scene layer also occupied z-10."
    - path: "src/components/viz/MainScene.tsx"
      issue: "3D scene is rendered in an absolute overlay layer that sits above the base map surface."
  missing:
    - "Raise the viewport control stack above the 3D scene overlay"
    - "Add a regression assertion for the higher z-index on the demo viewport controls"
  debug_session: "src/components/dashboard-demo/DashboardDemoShell.tsx"

---
created: 2026-06-24T16:49:51.324Z
title: Showcase adaptive time scaling in dashboard demo
area: ui
files:
  - src/components/dashboard-demo/DemoTimelinePanel.tsx
  - src/components/dashboard-demo/Demo3dSpatialView.tsx
  - src/components/dashboard-demo/lib/useDemoStkde.ts
---

## Problem

The dashboard demo's adaptive time scaling (warp map, non-uniform temporal axis) is the project's core analytical value but is under-explained to a new user. Reviewers and study participants will ask "why non-uniform?" and the current UI doesn't answer that in one glance. The 3D cube shows warped slice spacing, but the linear-vs-adaptive delta is implicit, not visible.

## Solution

Pick one of four approaches and implement it:

- **A. Side-by-side dual timeline** (linear + adaptive stacked) — most pedagogically clear; ~30% less vertical space
- **B. Cube A/B morph toggle** — animated transition between linear/adaptive slice positions; most visceral
- **C. Burst annotations on the adaptive timeline** — auto-callouts on detected bursts (e.g., "14 events in 2h — 7× density"); cheap, high readability
- **D. "Without adaptive" ghost slices in the 3D cube** — translucent linear-time positions behind the adaptive ones; visualizes the delta

Recommendation: **A (dual timeline)** for max pedagogical clarity; **B (cube morph)** for max demo "wow".

Scope: medium. Touches timeline + 3D views. May need a brief `/gsd-spec-phase` before planning if a non-trivial variant is picked.

## Acceptance Criteria

- [ ] Approach chosen (A/B/C/D) and rationale logged
- [ ] Implementation in dashboard demo (`/dashboard-demo` route)
- [ ] No regression to existing 3D widget adaptive behavior
- [ ] Demo can be shown to a thesis reviewer without verbal explanation of "why adaptive"

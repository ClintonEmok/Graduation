---
phase: 03-demo-timeline-rewrite
status: complete
---

# Phase 3: Demo Timeline Rewrite - Research

**Gathered:** 2026-04-09
**Status:** Complete

## Key Findings

### 1) The production baseline should stay untouched
- `src/components/timeline/TimelinePanel.tsx` is shared by `/dashboard` and `/dashboard-demo`.
- `src/components/timeline/DualTimeline.tsx` is large and already coupled to shared stores.
- Rewriting either file in place would risk leaking demo polish into the stable dashboard route.

### 2) The demo needs a route-specific wrapper, not a new store system
- The current store set (`useTimeStore`, `useTimelineDataStore`, `useSliceStore`, `useTimeslicingModeStore`) already provides the demo timeline inputs.
- A new Zustand boundary is not required for this phase.
- The safer boundary is component composition: create a demo-only panel and keep the state passive.

### 3) The slice companion should be lighter than the existing manager UI
- `src/components/viz/SliceManagerUI.tsx` already contains rich slice controls, but it is too dense for the demo shell.
- The demo phase should borrow the companion-section pattern, not copy the whole drawer.
- A compact, collapsible companion above the timeline matches the phase decisions.

### 4) Route isolation belongs in the shell test
- `src/app/dashboard-demo/page.shell.test.tsx` already uses source inspection to protect route structure.
- The new plan should extend that test so the demo shell points at the new demo components while `/dashboard` remains on its stable composition.

## Recommendation

Build `DemoDualTimeline` and `DemoTimelinePanel`, wire them into `DashboardDemoShell`, and keep `DualTimeline` / `TimelinePanel` untouched.

## Risks

- Overusing the full `SliceManagerUI` would make the demo timeline busy again.
- Modifying the shared timeline shell would risk phase bleed into `/dashboard`.
- Adding a new store boundary would be unnecessary complexity unless the demo composition later proves leaky.

---
status: diagnosed
trigger: "/gsd:debug Investigate why selection-first burst drafts are fed no data in the dashboard demo. Focus on the data path from the demo shell through `useBurstWindows(...)` into `buildBurstWindowsFromSeries(...)`, and determine which store/hook is returning empty input and why. Report the exact cause, the minimal fix, and any tests that should be updated. Do not edit files; just inspect and summarize findings."
created: 2026-04-30T00:00:00Z
updated: 2026-04-30T00:00:00Z
---

## Current Focus

hypothesis: confirmed - useBurstWindows reads global adaptive maps that never get hydrated in the dashboard demo, so buildBurstWindowsFromSeries receives null/empty series input
test: traced which store hydrates burst window inputs in the demo shell and whether useAdaptiveStore ever gets the computed maps
expecting: useAdaptiveStore density/burstiness/count maps stay null in demo mode, while demo-specific maps live in useDashboardDemoWarpStore
next_action: report root cause and minimal fix; no file edits requested

## Symptoms

expected: selection-first burst drafts in the dashboard demo should receive series data and produce burst windows
actual: burst drafts are fed no data
errors: none provided
reproduction: dashboard demo, selection-first burst draft flow
started: unknown

## Eliminated

## Evidence

- timestamp: 2026-04-30T00:00:00Z
  checked: src/components/viz/BurstList.tsx
  found: useBurstWindows pulls densityMap, burstinessMap, countMap, burstMetric, burstCutoff, and mapDomain from useAdaptiveStore, then passes them to buildBurstWindowsFromSeries.
  implication: if useAdaptiveStore is not hydrated, buildBurstWindowsFromSeries will see null/empty maps and return no windows.

- timestamp: 2026-04-30T00:00:00Z
  checked: src/components/dashboard-demo/DemoDualTimeline.tsx and src/components/dashboard-demo/DemoMapVisualization.tsx
  found: the demo shell uses useDashboardDemoWarpStore (via setPrecomputedMaps/warpMap/mapDomain override) instead of the global useAdaptiveStore.
  implication: the demo's adaptive data lives in a separate store, so the global burst-window hook is looking at the wrong source.

- timestamp: 2026-04-30T00:00:00Z
  checked: src/components/timeline/hooks/useDemoTimelineSummary.ts
  found: the demo timeline summary also calls useBurstWindows() and would therefore report "No burst windows" unless the global adaptive store is populated.
  implication: the empty-input bug affects both the selection-first draft generator and the demo summary UI.

- timestamp: 2026-04-30T00:00:00Z
  checked: src/components/viz/MainScene.tsx and src/components/dashboard-demo/DashboardDemoShell.tsx
  found: MainScene is the only place that hydrates the global adaptive store, but DashboardDemoShell renders DemoMapVisualization and DemoTimelinePanel instead of MainScene.
  implication: useAdaptiveStore remains at defaults in the dashboard demo, so useBurstWindows receives null maps.

## Resolution

root_cause: Dashboard demo selection-first burst flows call useBurstWindows(), which reads densityMap/burstinessMap/countMap from the global useAdaptiveStore. The demo shell never hydrates that store; it hydrates useDashboardDemoWarpStore instead, so buildBurstWindowsFromSeries gets null maps and returns [] immediately.
fix: 
verification: 
files_changed: []

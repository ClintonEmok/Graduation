---
status: diagnosed
trigger: "/gsd:debug Investigate why the dashboard demo timeline appears not to initialize properly. Focus on DashboardDemoShell, DemoTimelinePanel, DemoDualTimeline, useTimelineDataStore, and any viewport/store bootstrap. Identify the root cause, confirm the minimal fix, and report any tests or files that should change. Do not modify files yet; research only."
created: 2026-04-21T00:00:00Z
updated: 2026-04-21T00:00:00Z
---

## Current Focus
hypothesis: demo timeline is querying from the stale viewport default instead of the loaded crime-domain bootstrap
test: trace shell load flow, viewport store defaults, and DemoDualTimeline bootstrap effects
expecting: find a mismatch between loaded data range and the viewport range used by useViewportCrimeData
next_action: verify whether any component seeds viewport/time stores from loaded metadata

## Symptoms
expected: dashboard demo timeline initializes and renders with data/viewport state
actual: timeline appears not to initialize properly
errors: []
reproduction: open dashboard demo timeline view
started: unknown

## Eliminated

## Evidence

- timestamp: 2026-04-21T00:00:00Z
  checked: DashboardDemoShell.tsx + DemoTimelinePanel.tsx + DemoDualTimeline.tsx
  found: the shell loads real timeline data, the panel renders DemoDualTimeline, and DemoDualTimeline reads viewport-based crimes from useViewportCrimeData while also having its own viewport bootstrap effect
  implication: initialization depends on both data metadata and viewport state staying in sync

- timestamp: 2026-04-21T00:00:00Z
  checked: src/lib/stores/viewportStore.ts + src/hooks/useViewportCrimeData.ts + src/app/api/crime/meta/route.ts
  found: viewport defaults are 2001-01-01 → 2002-01-01, useViewportCrimeData queries from that store, and crime metadata in this repo can resolve to a very different range (mock metadata is 2024-01-01 → 2025-01-01)
  implication: if no bootstrap updates the viewport promptly, the timeline can query an empty/wrong window on first mount

- timestamp: 2026-04-21T00:00:00Z
  checked: DemoDualTimeline bootstrap effect
  found: the component does try to sync viewport/time stores from currentTime and domainStart/domainEnd, but that sync is indirect and still starts from the stale default until metadata is available
  implication: the demo shell would be more deterministic if it seeded the viewport from loaded metadata directly

- timestamp: 2026-04-21T00:00:00Z
  checked: DashboardDemoShell + timeline store bootstrap search
  found: no dashboard-demo component writes the viewport store from timeline metadata after loadRealData completes
  implication: the demo route has no explicit bootstrap boundary; it relies on downstream timeline effects to correct the viewport later

## Resolution
root_cause: The demo route never establishes a single, immediate viewport bootstrap from the loaded crime metadata. DashboardDemoShell loads the data, but the viewport store still starts from the hardcoded default and only gets corrected indirectly by DemoDualTimeline later, so the timeline can render/query the wrong window on initial paint.
fix: 
verification: 
files_changed: []

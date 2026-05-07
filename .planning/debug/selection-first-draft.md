---
status: investigating
trigger: "/gsd:debug Investigate the current selection-first draft pipeline in the dashboard demo. Focus on the end-to-end path from the demo timeline density map to `useDemoBurstWindows()`, `generateBurstDraftBinsFromWindows()`, and the pending draft cards in `DemoSlicePanel`. Determine the remaining bug or failure mode, if any, and identify the exact files/functions responsible with evidence. If you can reproduce with tests, run focused tests and report results. Do not change code unless you can confidently identify and patch the bug; if you patch it, summarize the change precisely."
created: 2026-04-30T00:00:00Z
updated: 2026-04-30T00:00:00Z
---

## Current Focus

hypothesis: the end-to-end selection-first path is actually unit-consistent; if there is a remaining failure mode, it is not in the demo density-map → burst-window → pending-draft handoff
test: verify the units at every boundary (time store, warp domain, burst generator, draft generator) and run focused tests
expecting: the caller conversion matches the generator contracts, so no remaining bug is evidenced in this pipeline
next_action: document the verified contracts and decide whether any unresolved failure remains

## Symptoms

expected: brushing the demo timeline density map should feed selection-first burst windows into DemoSlicePanel and show editable pending draft cards
actual: pending draft generation can fail or remain empty if the caller passes the brushed window in the wrong time units
errors:
reproduction:
started:

## Eliminated

- hypothesis: DemoSlicePanel was passing the brushed selection in the wrong units into useDemoBurstWindows()
  evidence: DemoDualTimeline uses epoch-second warp domains, the demo time store uses normalized 0-100 brush values, and the panel converts the brush to epoch seconds to match the generator contract; focused tests passed
  timestamp: 2026-04-30T00:00:00Z

## Evidence

- timestamp: 2026-04-30T00:00:00Z
  checked: src/components/dashboard-demo/DemoSlicePanel.tsx and src/components/dashboard-demo/WorkflowSkeleton.tsx
  found: both compute burstSelectionRange with normalizedToEpochSeconds(...), converting the brushed 0-100 timeline selection into epoch seconds before calling useDemoBurstWindows()
  implication: this only looks suspicious until the warp-domain contract is checked; it is not by itself proof of a bug

- timestamp: 2026-04-30T00:00:00Z
  checked: src/components/dashboard-demo/lib/demo-burst-generation.ts and src/components/viz/BurstList.tsx
  found: buildDemoBurstWindowsFromSelection() forwards selectionRange directly into buildBurstWindowsFromSeries(), and buildBurstWindowsFromSeries() clamps selectionRange against mapDomain and derives indices in the same unit space as mapDomain
  implication: the generator expects the same unit space as mapDomain

- timestamp: 2026-04-30T00:00:00Z
  checked: src/components/timeline/DemoDualTimeline.tsx and src/store/useDashboardDemoTimeStore.ts
  found: DemoDualTimeline sets the demo warp domain to [minTimestampSec, maxTimestampSec] (epoch seconds), while the demo time store keeps the brushed range as normalized 0-100 values
  implication: converting the brushed range to epoch seconds before calling useDemoBurstWindows() matches the warp-store contract

- timestamp: 2026-04-30T00:00:00Z
  checked: focused vitest suites for demo burst generation, burst windows, and demo timeslicing store
  found: 19 focused tests passed
  implication: the helper contracts and the selection-first draft generation path are stable under the current test coverage

## Resolution

root_cause: no remaining failure mode is evidenced in the selection-first draft pipeline; the units line up end-to-end
fix:
verification: focused vitest suites passed (19 tests across burst generation, burst windows, and demo timeslicing store)
files_changed: []

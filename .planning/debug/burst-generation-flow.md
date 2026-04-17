---
status: investigating
trigger: "Investigate the burst generation flow for the dashboard demo and recommend the minimal code change to calculate burst windows within the selected timeframe instead of globally and then filtering. Focus on `src/components/viz/BurstList.tsx`, `src/components/dashboard-demo/DemoSlicePanel.tsx`, `src/components/dashboard-demo/WorkflowSkeleton.tsx`, and `src/components/dashboard-demo/lib/demo-burst-generation.ts`. Return:\n1. The smallest safe implementation approach.\n2. Any unit test(s) that should be added or updated.\n3. Any pitfalls around time units or map domain boundaries.\nDo not edit files; just research and recommend."
created: 2026-04-16T00:00:00Z
updated: 2026-04-16T00:00:00Z
---

## Current Focus
<!-- OVERWRITE on each update - reflects NOW -->

hypothesis: burst windows are computed from the global adaptive map domain, then clipped against the selected demo window during draft generation
test: trace useBurstWindows -> demo call sites -> buildBurstDraftBinsFromWindows and compare units/domains
expecting: confirm the selection is applied only after window generation, not during window ranking/creation
next_action: inspect unit conversions and selection boundaries before recommending a minimal fix

## Symptoms
<!-- IMMUTABLE after gathering complete -->

expected: burst windows should be calculated only for the selected timeframe in the dashboard demo
actual: burst windows are likely generated globally and filtered afterward
errors: []
reproduction: review demo burst generation flow in dashboard demo components
started: unknown

## Eliminated
<!-- APPEND only -->

## Evidence
<!-- APPEND only -->

- timestamp: 2026-04-16T00:00:00Z
  checked: src/components/viz/BurstList.tsx
  found: useBurstWindows derives burst windows from adaptiveStore.mapDomain and returns the top 10 windows globally over that domain
  implication: selection is not part of burst window creation in the shared hook

- timestamp: 2026-04-16T00:00:00Z
  checked: src/components/dashboard-demo/DemoSlicePanel.tsx
  found: selected timeRange is converted to epoch ms, stored in generationInputs.timeWindow, then generateBurstDraftBinsFromWindows is called with the globally derived burstWindows
  implication: demo generation uses post-hoc filtering/clipping rather than selection-scoped burst window derivation

- timestamp: 2026-04-16T00:00:00Z
  checked: src/components/dashboard-demo/WorkflowSkeleton.tsx
  found: preview and generate paths both convert the brushed selection to epoch ms and reuse the same global burstWindows source
  implication: both preview and generation can drift from the actual selected timeframe if the source windows were computed globally

- timestamp: 2026-04-16T00:00:00Z
  checked: src/components/dashboard-demo/lib/demo-burst-generation.ts
  found: buildBurstDraftBinsFromWindows only filters overlapping windows and clips them to the active selection after the fact
  implication: this file cannot fix the root cause alone because it only receives already-generated windows

- timestamp: 2026-04-16T00:00:00Z
  checked: src/lib/time-domain.ts
  found: selected demo windows are normalized 0-100 and converted to epoch seconds/ms at the call sites
  implication: any fix must preserve the ms/seconds boundary and avoid double conversion

- timestamp: 2026-04-16T00:00:00Z
  checked: src/components/viz/BurstList.tsx
  found: BurstList itself depends on the global burst hook for the main product UI, so the demo fix should be additive rather than replacing the default global behavior
  implication: a new selection-aware helper or optional range parameter is safer than changing the existing global default

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: 
fix: 
verification: 
files_changed: []

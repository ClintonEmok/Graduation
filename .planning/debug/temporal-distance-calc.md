---
status: resolved
trigger: "Diagnose why \"Move a slice through a cluster of points...\" failed. User report: \"how is small temporal distance calculated\""
created: 2026-02-05T00:00:00Z
updated: 2026-02-05T00:05:00Z
---

## Current Focus
hypothesis: The "small temporal distance" is hardcoded in the shader and not exposed.
test: Checked src/components/viz/shaders/ghosting.ts and src/components/viz/DataPoints.tsx.
expecting: Found uSliceThreshold hardcoded to 1.0 and never updated.
next_action: Report findings.

## Symptoms
expected: Configurable or documented temporal distance.
actual: Hardcoded value of 1.0.
errors: N/A
reproduction: Code analysis.
started: N/A

## Eliminated
- hypothesis: It is configurable via props.
  evidence: Checked DataPointsProps and GhostingShaderOptions, it is not there.

## Evidence
- timestamp: 2026-02-05T00:02:00Z
  checked: src/components/viz/shaders/ghosting.ts
  found: `shader.uniforms.uSliceThreshold = { value: 1.0 };` and usage `if (abs(vLinearY - uSlices[i]) < uSliceThreshold)`
  implication: The logic is simple linear distance with a fixed threshold.
- timestamp: 2026-02-05T00:03:00Z
  checked: src/components/viz/DataPoints.tsx
  found: No updates to `uSliceThreshold` in any `useEffect` or `useFrame`.
  implication: The value remains 1.0 and cannot be changed by the application logic.

## Resolution
root_cause: `uSliceThreshold` is hardcoded to `1.0` in `src/components/viz/shaders/ghosting.ts` and is not updated by `DataPoints.tsx`.
fix: Expose `sliceThreshold` as a prop in `DataPoints` and update the uniform in `useEffect`.
verification: Verified by code inspection.
files_changed: []

---
status: diagnosed
trigger: "Diagnose why 'Drag the slice in the 3D view; the time value in the UI should update' failed."
created: 2026-02-05T00:00:00Z
updated: 2026-02-05T00:00:00Z
---

## Current Focus
<!-- OVERWRITE on each update - reflects NOW -->

hypothesis: The drag implementation relies on a single, small, hard-to-reach handle, leading to poor UX.
test: Code review of `src/components/viz/SlicePlane.tsx` completed.
expecting: Confirmed that drag logic is bound to a small sphere at `[50, 0, 50]`.
next_action: Report diagnosis.

## Symptoms
<!-- Written during gathering, then IMMUTABLE -->

expected: Dragging the slice in the 3D view should smoothly and intuitively update the time value in the UI.
actual: User reports "i think we can remove that or implement it better", indicating dissatisfaction with the current behavior.
errors: None reported.
reproduction: Drag the slice in the 3D view.
started: User report during UAT.

## Eliminated
<!-- APPEND only - prevents re-investigating -->

## Evidence
<!-- APPEND only - facts discovered -->

- timestamp: 2026-02-05T00:01:00Z
  checked: `src/components/viz/SlicePlane.tsx`
  found: Drag logic is attached to a `<mesh>` with `sphereGeometry args={[1.5, 16, 16]}` positioned at `[50, 0, 50]`.
  implication: The drag handle is small (radius 1.5 vs 100 scene size) and located at the extreme corner.

- timestamp: 2026-02-05T00:01:00Z
  checked: `src/components/viz/SlicePlane.tsx`
  found: The main plane `<mesh>` (lines 110-119) does not have `onPointerDown` handlers.
  implication: Users cannot drag the plane itself, which is the most intuitive target.

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: The `SlicePlane` component restricts drag interaction to a single, small sphere handle located at the corner `(50, 0, 50)` of the visualization volume. This requires precise targeting and finding the handle, which may be occluded or far from the user's focus. The plane itself is not interactive.
fix: 
verification: 
files_changed: []

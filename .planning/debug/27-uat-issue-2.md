---
status: resolved
trigger: "Diagnose Phase 27 UAT gap #2."
created: 2026-02-18T18:59:48Z
updated: 2026-02-18T19:00:39Z
---

## Current Focus

hypothesis: Timeline has only preview-layer rendering tied to `isCreating`, so committed slices have no timeline artifact after creation completes.
test: Trace `onPointerUp -> commitCreation -> timeline rendering subscriptions` across hook, stores, and page/component wiring.
expecting: `commitCreation` adds slice data, then UI removes preview because creation mode resets and no committed slice layer is mounted.
next_action: Return root-cause diagnosis with missing artifacts and concise fix items.

## Symptoms

expected: Drag-created slice remains visible on timeline after pointer release.
actual: Amber region is visible while dragging but disappears when created.
errors: none reported
reproduction: Drag on timeline to create a slice, then release pointer.
started: Reported during Phase 27 UAT gap #2.

## Eliminated

- hypothesis: Slice is not being committed to store on pointer release.
  evidence: `useSliceCreation.ts` always calls `commitCreation()` in `onPointerUp`, and `useSliceCreationStore.ts` calls `useSliceStore.getState().addSlice(createdSlice)`.
  timestamp: 2026-02-18T19:00:39Z

## Evidence

- timestamp: 2026-02-18T19:00:39Z
  checked: `src/app/timeline-test/hooks/useSliceCreation.ts`
  found: `onPointerUp` computes final range, calls `updatePreviewFromSeconds`, then unconditionally calls `commitCreation()`, and finally resets drag state.
  implication: Creation action does run on release; disappearance is not caused by missing pointer-up commit call.

- timestamp: 2026-02-18T19:00:39Z
  checked: `src/store/useSliceCreationStore.ts`
  found: `commitCreation()` builds a `TimeSlice`, writes it via `useSliceStore.getState().addSlice(createdSlice)`, then calls `set(resetCreationState())` which sets `isCreating: false` and clears preview/ghost state.
  implication: Preview state is intentionally ephemeral and removed immediately after commit.

- timestamp: 2026-02-18T19:00:39Z
  checked: `src/app/timeline-test/components/SliceCreationLayer.tsx`
  found: Component short-circuits with `if (!isCreating) return null;` and only renders amber/red ghost from preview values/drag ghost.
  implication: The amber region can only exist while creation mode is active; it cannot display committed slices.

- timestamp: 2026-02-18T19:00:39Z
  checked: `src/app/timeline-test/page.tsx` and timeline-test component usage of `useSliceStore`
  found: Timeline overlay mounts only `SliceCreationLayer`; no component in timeline-test renders persisted `useSliceStore().slices` onto the timeline track.
  implication: After commit ends creation mode, there is no persistent timeline layer to keep the new slice visible.

## Resolution

root_cause: "The timeline-test route only renders an ephemeral creation preview (`SliceCreationLayer`) gated by `isCreating`, while committed slices are stored in `useSliceStore` but never rendered on the timeline, so the amber region disappears as soon as creation mode resets on pointer release."
fix: "Add a committed-slices timeline overlay subscribed to `useSliceStore().slices` and mount it alongside `SliceCreationLayer`; keep `SliceCreationLayer` strictly for in-progress preview during creation mode."
verification: "Code-path verification: pointer-up commits to slice store, then creation state reset unmounts preview layer; no timeline component consumes persisted slices in timeline-test."
files_changed: [".planning/debug/27-uat-issue-2.md"]

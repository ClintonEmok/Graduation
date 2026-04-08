# Phase 64: Cross-View Synchronization and Unified Workflow Dashboard - Research

**Phase:** 64
**Created:** 2026-03-27
**Status:** Research Complete

---

## Research Objective

Answer: "What do I need to know to PLAN this phase well?"

---

## 1. What This Phase Delivers

`dashboard-v2` becomes the single synchronized investigation route where timeline, map/heatmap, cube, and workflow controls share one state narrative and one selection model.

---

## 2. Existing Infrastructure We Should Reuse

### Already-implemented workflow foundation (Phases 62-63)
- Draft-vs-applied generated bins are already modeled (`useTimeslicingModeStore` + slice-domain promotion).
- `dashboard-v2/page.tsx` already composes refinement + map + timeline and includes workflow status cues.
- `useLayoutStore` already persists panel visibility and split ratio.

### Existing cross-view synchronization primitives
- `useCoordinationStore` currently exposes `selectedIndex`, `selectedSource`, and `brushRange`.
- `DualTimeline` already consumes coordination store (`setSelectedIndex`, `setBrushRange`).
- `MapVisualization` already writes selection into coordination store and includes `MapHeatmapOverlay`.
- `CubeVisualization` runs `MainScene`, and `MainScene` invokes `useSelectionSync`, which already propagates selection context.

### Practical implication
Phase 64 should **not** build a new sync system; it should extend `useCoordinationStore` contract and compose existing synchronized components into `dashboard-v2`.

---

## 3. Key Planning Decisions from Context

From `64-CONTEXT.md`:
- Last interaction wins across timeline/map/cube.
- Do not auto-clear global selection when one panel has no match; preserve selection and show panel-local reason.
- Drag/brush previews can be local during gesture; commit synchronized update on release.
- On workflow/filter changes, reconcile selection and clear only when globally invalid, with explicit reason.
- Deep-link/shareable synchronized state is deferred out of Phase 64.

---

## 4. Risks and Mitigations

1. **Conflicting status sources (page-level ad-hoc state vs store state)**
   - Mitigation: centralize workflow/sync tokens in `useCoordinationStore` and render from one header source.

2. **Cross-view mismatch if dashboard-v2 uses low-level map layer stack instead of synchronized map component**
   - Mitigation: use `MapVisualization` in dashboard-v2 for selection/heatmap behavior tied to coordination store.

3. **Cube omitted from unified route**
   - Mitigation: integrate `CubeVisualization` directly into dashboard-v2 layout and persist panel visibility in `useLayoutStore`.

---

## 5. Recommended Plan Structure

### Plan 64-01 (Wave 1): Coordination contract hardening
- Extend `useCoordinationStore` with workflow phase and sync/reconciliation status.
- Add deterministic store tests for precedence and no-match behavior.

### Plan 64-02 (Wave 2): Unified dashboard-v2 composition
- Route-level header/status based on shared workflow/sync state.
- Compose timeline + map/heatmap + cube in dashboard-v2.
- Persist cube panel visibility in layout store.
- End with human verification checkpoint for interaction-level confidence.

---

## Validation Architecture

Phase 64 should validate continuously:

1. **Store contract tests (fast loop):**
   - `pnpm vitest src/store/useCoordinationStore.test.ts --run`

2. **Type safety on each task:**
   - `pnpm -s tsc --noEmit`

3. **Manual interaction verification before completion:**
   - `pnpm dev` and verify generate/review/apply + cross-view selection + panel persistence in `/dashboard-v2`.

---

*Research completed: 2026-03-27*

# Dashboard V2 Rebuild Plan

**Purpose:** Rebuild the `dashboard-v2` shell around a simpler workflow-first demo without rewriting the core algorithms.

**Status:** Draft for April 10 freeze

---

## Why Rebuild

- The current route exposes too many valid paths at once.
- The problem is orchestration, not the binning, map, cube, or STKDE math.
- The demo needs one story: raw data -> choose a lens -> review draft timeslices -> apply -> compare burstiness/event rate -> optional inspect.

---

## Keep

- Data loading and normalization.
- The core stores: `useTimelineDataStore`, `useFilterStore`, `useCoordinationStore`, `useSliceDomainStore`, `useAdaptiveStore`.
- `DualTimeline` and `MapVisualization` as the main demo pair.
- Draft/apply slice behavior.
- STKDE compute logic.
- `CubeVisualization` as an advanced view, not the opening surface.

---

## Cut From The Opening Shell

- Cube-first framing.
- Layers/debug panels in the main path.
- Multiple workflow inferences from separate stores.
- Exposing all sampling presets at once.
- STKDE as a first-class opening panel.

---

## New Shell Shape

- Keep the same URL, but replace the page composition.
- Top bar: story, current stage, active lens.
- Main area: timeline and 2D map as the primary pair.
- Side rail: draft bins, burstiness/event-rate cards, apply/reset.
- Advanced drawer: cube and STKDE, collapsed by default.

---

## State Boundary

Use one route-local controller for the shell.

- `workflowStage`: `raw`, `lens`, `draft`, `review`, `applied`, `inspect`.
- `activeLens`: the current sampling or analysis preset.
- `activeRange`: the current time window.
- `advancedOpen`: whether cube/STKDE are visible.

Do not infer the same stage from multiple stores in the page component.

Sampling should happen after the slice structure exists, not before it. The shell can request full or authoritative slice inputs, then thin the rendered points per slice if needed.

---

## Build Phases

1. Freeze the current behavior contract.
2. Build the new shell skeleton with static stage text.
3. Reattach timeline and map first.
4. Reintroduce draft/review/apply flow.
5. Add burstiness and event-rate readouts.
6. Move cube and STKDE behind the advanced drawer.
7. Remove the old toggle-heavy orchestration.

---

## Success Criteria

- The demo opens on the workflow story, not the feature list.
- Timeline and map explain the binning changes clearly.
- Cube and STKDE remain available but do not compete with the main narrative.
- The shell feels stable enough that the April 10 demo can be narrated without caveats.

---

## Risks

- If more than one store decides the stage, the shell is still too chaotic.
- If all presets remain visible, the demo becomes a toolkit instead of a narrative.
- If cube or STKDE surface too early, the primary workflow loses clarity.

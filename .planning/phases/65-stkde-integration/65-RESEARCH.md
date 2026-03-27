# Phase 65: STKDE Integration - Research

**Phase:** 65
**Created:** 2026-03-27
**Status:** Research Complete

---

## Research Objective

Answer: "What do I need to know to PLAN this phase well?"

---

## 1. What This Phase Delivers

`dashboard-v2` gains an in-route STKDE investigation loop (run/cancel, scope selection, heatmap overlay, hotspot panel, and cross-view focus cues) without sending users to `/stkde`.

---

## 2. Existing Infrastructure We Should Reuse

### Existing STKDE compute contract and guardrails (Phase 55)
- `/api/stkde/hotspots` already validates and clamps requests via `validateAndNormalizeStkdeRequest` and returns provenance (`requested/effective mode`, `clampsApplied`, `fallbackApplied`, `truncated`).
- `StkdeRouteShell` already implements newest-request-wins cancellation (`AbortController`) and worker projection (`stkdeHotspot.worker.ts`).
- `MapStkdeHeatmapLayer` already renders STKDE heatmap + active hotspot marker.

### Existing dashboard-v2 synchronization baseline (Phases 63-64)
- `dashboard-v2/page.tsx` is already the unified route with map/timeline/cube composition.
- `useCoordinationStore` already defines interaction precedence and panel-no-match semantics for route-level status.
- `useFilterStore` already provides canonical time/spatial filter actions that cube/timeline/map consumers respect.

### Practical implication
Phase 65 should **compose and adapt** existing STKDE modules into `dashboard-v2`, not rebuild STKDE math or duplicate route-level logic.

---

## 3. Key Decisions from Phase Context

From `65-CONTEXT.md`:
- Compute is manual by default (no auto-run on every input edit).
- Applied-slice changes mark STKDE output stale and require explicit rerun.
- Hover is preview-only; click commits focus.
- Hotspot conflicts with applied slices must keep slices as truth and present mismatch messaging.
- Scope visibility is mandatory (`Applied Slices` vs `Full Viewport`) and must be persistent/obvious.

---

## 4. Risks and Mitigations

1. **Risk: route split regression (`/stkde` behavior copied but not integrated with dashboard flow).**
   - Mitigation: centralize dashboard STKDE orchestration in dashboard-level hook/store wiring and keep panel mounted in `dashboard-v2`.

2. **Risk: layer toggles are currently local-only in `MapLayerManager` and not authoritative for map rendering.**
   - Mitigation: introduce shared map layer state store or equivalent single source of truth used by both manager and map renderer.

3. **Risk: STKD-04 (3D cube visibility) under-implemented if only map receives STKDE context.**
   - Mitigation: expose STKDE run/provenance/selected-hotspot context in cube panel and bind hotspot commit to global filters that cube consumes.

---

## 5. Recommended Plan Structure

### Plan 65-01 (Wave 1): Dashboard STKDE orchestration foundation
- Extend `useStkdeStore` for dashboard-grade run state, scope, stale state, and provenance.
- Add dashboard STKDE orchestration hook that reuses API + worker patterns from Phase 55.

### Plan 65-02 (Wave 2): dashboard-v2 map + panel integration
- Add STKDE controls/hotspot panel in dashboard-v2.
- Wire STKDE heatmap layer into `MapVisualization` and synchronize with shared layer visibility.

### Plan 65-03 (Wave 3): Cross-view focus + cube visibility + regression tests
- Commit hotspot click into global filter/coordination semantics.
- Surface STKDE context in cube and add focused integration tests.

---

## Validation Architecture

Phase 65 should validate continuously:

1. **Store and worker logic loop (fast):**
   - `pnpm vitest src/store/useStkdeStore.test.ts src/workers/stkdeHotspot.worker.test.ts --run`

2. **Dashboard integration loop (targeted):**
   - `pnpm vitest src/app/dashboard-v2/page.stkde.test.ts --run`

3. **Type and suite safety per wave:**
   - `pnpm -s tsc --noEmit`
   - `pnpm vitest --run`

---

*Research completed: 2026-03-27*

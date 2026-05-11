# Milestone Context: v3.0 — Burstiness-Driven Adaptive Slicing

## Objective

Deliver adaptive time slicing driven by burstiness scores. Equal-width temporal bins
get non-uniform widths proportional to their burstiness (temporal B), so the timeline
expands around dense/spiky intervals and compresses quiet periods. The same bins
render as 3D slice planes with KDE heatmaps, creating a unified burst-aware
spatiotemporal view.

## Why Now

The prototype has all prerequisite infrastructure: dashboard-demo as main app, cube
with slice planes + KDE, DBSCAN clustering, category encoding, evolution view,
and an adaptive helper layer. The missing link is burstiness-driven allocation —
without it, bins are static equal-width partitions and the "adaptive" label is aspirational.

## Previous Milestone

v2.2 "Timeslicing Fidelity" (2026-03-11) — equal-count slicing, warp factor, dual
timeline with focused/raw tracks.

## What's Changed Since v2.2

| Area | v2.2 | Now |
|------|------|-----|
| Dashboard route | Stable `/dashboard` | `/dashboard-demo` is main app |
| 3D cube | Basic scene | Slice planes + KDE heatmaps + clusters |
| Clustering | None | DBSCAN with 3D hulls + per-slice overlays |
| Category encoding | Hardcoded 6-type legend | Dynamic data-driven legend + shapes |
| Evolution | None | Sequence playback + flow overlays |
| Burst awareness | None | Brushed-interval partition + draft slice generation |
| Codebase | Mixed concerns | Better separation (lib, queries, workers) |

## Scope

### Phase 1: Burstiness Engine

Backend computation + client lib + slice allocator.

- Compute temporal B per bin (CV of inter-event intervals)
- Compute spatial B per bin (1 - meanKDE/peakKDE) as cross-reference
- Combined B = 0.5 x temporalB + 0.5 x spatialB
- Allocate N slices across bins proportional to combined B score
- Same bins used for timeline display and 3D KDE planes

### Phase 2: UI Redesign

Simplify the dashboard-demo shell:

- Remove WorkflowSkeleton.tsx (500+ line stepper, ~21rem left panel)
- Map/3D toggle replaces Map/Cube toggle
- 5-tab right rail: Scan / Detect / Slices / Inspect / Configure
- Auto-transition: apply slices → viewport goes 3D, rail switches to Inspect

### Phase 3: STKDE-3D Port

Move standalone `/stkde-3d` page into the dashboard 3D view:

- Demo3dSpatialView component (R3F Canvas, camera, lighting, MapTileSource)
- Reads applied slices from useSliceDomainStore
- Crime data: single fetch → partition by slice ranges → computeSliceKde per slice
- DemoInspectPanel: scrubber, playback, slice labels, opacity controls
- DemoDetectPanel: burst detection controls + results table (consolidates stepper + slice panel)
- DemoConfigurePanel: warp factor, adaptive/linear, burst threshold

### Phase 4: Coordination Flow

- Extract computeSliceKde to shared lib (`src/lib/kde/`)
- Remove workflowPhase from coordination store (no stepper phases)
- Auto-transition logic (Detect → apply → Inspect tab + 3D view)
- Update STATE.md, ROADMAP.md, REQUIREMENTS.md to reflect v3.0

## Files Changed

| File | Action |
|------|--------|
| `src/app/api/adaptive/bursts/route.ts` | New — burstiness API |
| `src/lib/burst-detection.ts` | New — client burst lib |
| `src/lib/slice-allocator.ts` | New — non-uniform slice allocation |
| `src/lib/kde/compute-slice-kde.ts` | New — shared KDE |
| `src/components/dashboard-demo/Demo3dSpatialView.tsx` | New — 3D view |
| `src/components/dashboard-demo/DemoDetectPanel.tsx` | New — detect tab |
| `src/components/dashboard-demo/DemoInspectPanel.tsx` | New — inspect tab |
| `src/components/dashboard-demo/DemoConfigurePanel.tsx` | New — configure tab |
| `src/components/dashboard-demo/WorkflowSkeleton.tsx` | Delete |
| `src/components/dashboard-demo/ComparisonPanel.tsx` | Delete |
| `src/components/dashboard-demo/EvolutionPanel.tsx` | Delete |
| `src/components/dashboard-demo/ExplainPanel.tsx` | Delete |
| `src/components/dashboard-demo/DashboardDemoShell.tsx` | Edit — new rail tabs, no stepper |
| `src/components/dashboard-demo/RailTabs.tsx` | Edit — 5 tabs |
| `src/components/dashboard-demo/DemoSlicePanel.tsx` | Edit — remove generation controls |
| `src/components/dashboard-demo/DemoStkdePanel.tsx` | Edit — simplify |
| `src/store/useCoordinationStore.ts` | Edit — remove workflowPhase |
| `.planning/STATE.md` | Edit — new milestone state |
| `.planning/ROADMAP.md` | Edit — v3.0 roadmap |
| `.planning/REQUIREMENTS.md` | Edit — update traceability |

## Dependencies

- Phase 1 independent (new API + lib)
- Phase 2 depends on Phase 1 (detect tab needs burst scores)
- Phase 3 depends on Phase 2 (3D view needs new shell)
- Phase 4 depends on 1-3 (coordination ties everything together)

## Risks

1. **Spatial B performance**: KDE on server per bin could be slow for many bins. Mitigation: limit bins to ~50, compute asynchronously.
2. **3D view integration**: STKDE-3D uses different data pipeline. Mitigation: route through shared KDE lib, single crime fetch.
3. **Non-uniform slice UX**: Timeline with variable-width bins may confuse. Mitigation: keep equal-height visual rhythm, vary only horizontal span.

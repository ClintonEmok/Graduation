---
id: SEED-001
status: dormant
planted: 2026-04-10
planted_during: .planning/STATE.md milestone v1.0, current focus Phase 7 complete
trigger_when: planning a milestone that expands 3D analysis, burst decoding, trace/compare flows, or contextual data enrichment around district/type/time aggregation
scope: Large
---

# SEED-001: Make 3D an aggregation-first district/type lens

## Why This Matters

Raw 3D event clouds will not scale once the dataset gets dense. The 3D surface should become a transformative analytic lens that summarizes structure instead of rendering every event, so users can see district/type/time patterns, burst concentration, and comparative behavior without visual overload.

## When to Surface

**Trigger:** planning a milestone that expands 3D analysis, burst decoding, trace/compare flows, or contextual data enrichment around district/type/time aggregation.

This seed should be presented during `/gsd-new-milestone` when the milestone scope includes any of these conditions:
- 3D cube or spatial-temporal view work that would otherwise rely on raw event rendering
- burstiness, anomaly, or duration interpretation that needs multiscale aggregation
- district-first or type-first contextual analysis that would benefit from cube-like summaries

## Scope Estimate

**Large** — this is a full milestone-level shift in how the 3D view works. It likely needs a new aggregation model, revised encodings, and coordinated drill-down interactions rather than a small UI tweak.

## Breadcrumbs

Related code and decisions found in the current codebase:

- `.planning/STATE.md` - current milestone and roadmap context; Phase 10/11 are the natural future surface for this idea.
- `.planning/ROADMAP.md` - Phase 10 (trace/comparison) and Phase 11 (burst decoding) describe the likely trigger boundary.
- `src/app/timeline-test-3d/page.tsx` - current 3D route orchestration and shared timeline/slice integration.
- `src/app/timeline-test-3d/components/TimelineTest3DScene.tsx` - current 3D scene composition.
- `src/app/timeline-test-3d/components/TimelineTest3DPoints.tsx` - point-cloud rendering that would likely be replaced or complemented by aggregation.
- `src/app/timeline-test-3d/components/TimeSlices3D.tsx` - existing time-slice geometry and adaptive mapping layer.
- `src/app/timeline-test-3d/components/WarpSlices3D.tsx` - warp-slice visualization and overlap handling.
- `src/components/timeline/DualTimeline.tsx` - synchronized timeline already supports burst overlays and drill-down style interactions.
- `src/components/viz/BurstList.tsx` - burst taxonomy and selection logic that could feed aggregate 3D summaries.
- `src/lib/binning/burst-taxonomy.ts` - burst classification rules and confidence metadata.
- `src/app/docs/page.tsx` - prototype framing already describes the 3D cube as part of a synchronized hybrid visualization environment.

## Notes

Session idea recap: 3D should probably not scale by showing more events; it should scale by aggregating across `district + type + time` and using the 3D space to reveal structure, burstiness, and drill-down targets.

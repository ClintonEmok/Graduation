# Backlog: Adaptive Space-Time Cube Crime Monitoring Prototype

Based on the recent hotspot-policing / visual-analytics research, this backlog is ordered from must-haves to nice-to-haves.

## Must-haves

| Priority | Item | Why it matters |
|----------|------|----------------|
| P0 | Explainable adaptive timeslicing | Core to trust: users need to understand why time windows expand or compress. |
| P0 | Metric-duration and warp context cues | The warped view must always preserve true duration and show the distortion context. |
| P0 | Raw vs normalized count comparison | Prevents misleading hotspot judgments caused by area, population, or reporting volume. |
| P0 | Hotspot confidence / significance overlay | Shows uncertainty and rationale instead of a black-box “red map.” |
| P0 | Linked brushing across cube, map, and timeline | Essential for coordinated analysis across all views. |
| P0 | Compare slices / periods side by side | Supports place/time comparison and before/after assessment. |
| P0 | Incident drill-down from hotspots | Lets analysts inspect the incidents driving a hotspot. |
| P0 | Filter by offense, geography, time, and severity | Core query controls for analyst workflow. |
| P0 | Data provenance and binning rules | Makes the source window, aggregation, and parameters auditable. |
| P0 | Performance feedback for large datasets | Keeps the prototype usable when data loads or computations are heavy. |

## Nice-to-haves

| Priority | Item | Why it helps |
|----------|------|--------------|
| P1 | Outlier and burst annotations | Helps users spot unusual intervals and explain notable patterns. |
| P1 | Burstiness-driven relative expansion | Lets positive `B` widen slices and negative `B` compress them while keeping the brushed range covered. |
| P1 | Crime-type-scoped burstiness filters | Lets analysts narrow burstiness analysis to selected offense types when they need a more targeted read. |
| P1 | Playback / time animation | Useful for storytelling and pattern discovery, but not essential. |
| P1 | Export/share snapshots and reports | Supports briefings and documentation; keep it internal/export-focused. |
| P1 | Intervention tracking / before-after review | Important for evaluation, but dependent on stronger analysis context. |
| P1 | Accessibility and 2D fallback for 3D views | Improves reach and resilience when 3D is not ideal. |

## Deferred from v3.4 (removed 2026-06-27)

| Old phase | Item | Reason deferred |
|-----------|------|-----------------|
| 83 | Burstiness Signal Contract + Density Fallback (TypeScript prototype integration) | Superseded by phase 86 contextual-burstiness comparison — proven analytically first, then prototype-wired if results support it |
| 84 | Histogram Timeline Warping (bin spacing changes for bursty windows) | Depends on 83; deferred until new metric is validated |
| 85 | Burst Onset + Ramp-Up Readability (onset/ramp-up UI cues) | Depends on 83, 84; deferred until new metric is validated |


## Research Alignment

- Core tasks emphasized by the research: find, rank, validate, compare, brief, and re-evaluate hotspots.
- Highest-value prototype work is trust + comparison + drill-down, not generic BI output.
- Performance and provenance are required to avoid false certainty on large crime datasets.

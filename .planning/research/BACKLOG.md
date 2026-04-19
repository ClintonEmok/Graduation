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
| P1 | Crime-type-scoped burstiness filters | Lets analysts narrow burstiness analysis to selected offense types when they need a more targeted read. |
| P1 | Playback / time animation | Useful for storytelling and pattern discovery, but not essential. |
| P1 | Export/share snapshots and reports | Supports briefings and documentation; keep it internal/export-focused. |
| P1 | Intervention tracking / before-after review | Important for evaluation, but dependent on stronger analysis context. |
| P1 | Accessibility and 2D fallback for 3D views | Improves reach and resilience when 3D is not ideal. |

## Research Alignment

- Core tasks emphasized by the research: find, rank, validate, compare, brief, and re-evaluate hotspots.
- Highest-value prototype work is trust + comparison + drill-down, not generic BI output.
- Performance and provenance are required to avoid false certainty on large crime datasets.

# STKDE QA Guide

This guide explains how the `/stkde` route works and how to tune parameters for citywide vs neighborhood hotspot analysis.

## What STKDE Does

STKDE (spatiotemporal kernel density estimation) transforms crime events into:

- a spatial heatmap (`heatmap.cells`)
- ranked hotspot rows (`hotspots`)
- provenance metadata (`meta`)

At a high level:

1. Events are mapped into a spatial grid (`gridCellMeters`).
2. Cell support counts are smoothed with a spatial kernel (`spatialBandwidthMeters`).
3. Intensities are normalized to `[0..1]`.
4. Candidate hotspots are filtered by `minSupport` and ranked by intensity/support.
5. Each hotspot gets a peak time window (`timeWindowHours`).

## Compute Modes

The route supports two modes:

- `sampled`
  - Faster, bounded path.
  - Uses capped event input (`limits.maxEvents`).
  - Good for quick iteration.
- `full-population`
  - Higher-fidelity QA path.
  - Uses SQL/chunked aggregated inputs from the full eligible population (no naive 8M row JS load).
  - Can still fall back to sampled if guardrails trigger.

Always confirm provenance in the UI:

- `requested=<mode>`
- `effective=<mode>`
- `fallback=<reason>` (if present)
- `truncated` (if response payload guard applied)

## Important: Compute Radius vs Zoom Radius

- `Spatial BW (m)` is the algorithm smoothing radius used during STKDE compute.
- Map zoom changes only display radius (heatmap pixels) for readability.
- Zoom does not recompute hotspot intensity unless you run STKDE again.

## Parameter Tuning Cheatsheet

### 1) `gridCellMeters`

- Larger cells (e.g. `800-1500m`): smoother, macro patterns, fewer cells, faster.
- Smaller cells (e.g. `100-300m`): finer local structure, more cells, heavier compute.

### 2) `spatialBandwidthMeters` (SBW)

- Larger SBW (e.g. `1200-3000m`): broad regional hotspots, less local noise.
- Smaller SBW (e.g. `200-700m`): sharper neighborhood clusters.

Rule of thumb: start SBW at `~1.5x` to `3x` grid cell size.

### 3) `temporalBandwidthHours` (TBW)

- Larger TBW (e.g. `48-168h`): smoother temporal behavior.
- Smaller TBW (e.g. `4-24h`): more responsive to short spikes.

### 4) `timeWindowHours`

- Defines hotspot peak-window reporting width.
- Smaller windows highlight burst periods.
- Larger windows capture broader sustained activity.

### 5) `minSupport`

- Higher values reduce low-signal hotspots.
- Lower values increase sensitivity but can include noisy cells.

### 6) `topK`

- Number of hotspot rows shown/ranked.
- Start low (`10-20`) for readability.

## Preset Suggestions

### Citywide Macro Scan

- Mode: `full-population`
- `gridCellMeters`: `1000`
- `spatialBandwidthMeters`: `2000`
- `temporalBandwidthHours`: `72`
- `timeWindowHours`: `72`
- `minSupport`: `20`
- `topK`: `15`

Use when you want stable, broad city pattern comparisons.

### Neighborhood Micro Scan

- Mode: `full-population` (preferred) or `sampled` for quick iteration
- `gridCellMeters`: `150-300`
- `spatialBandwidthMeters`: `300-800`
- `temporalBandwidthHours`: `8-24`
- `timeWindowHours`: `12-24`
- `minSupport`: `5-10`
- `topK`: `20-40`

Use when you want localized clusters and tighter temporal peaks.

### Fast Iteration (Exploratory)

- Mode: `sampled`
- `gridCellMeters`: `500-800`
- `spatialBandwidthMeters`: `750-1500`
- `temporalBandwidthHours`: `24-48`
- `timeWindowHours`: `24`
- `minSupport`: `5-15`
- `topK`: `10-20`

Use for rapid parameter sweeps before final full-pop checks.

## Interpreting Results Safely

When comparing two runs, keep these fixed unless intentionally testing sensitivity:

- time domain
- compute mode
- bbox/filter scope
- grid cell size

Then change one parameter at a time (SBW, TBW, minSupport, etc.).

## QA Verification Checklist

1. Run the same request twice and confirm stable top hotspot ordering.
2. Verify provenance (`requested/effective/fallback`) is as expected.
3. Compare sampled vs full-pop on the same domain and note intensity/hotspot drift.
4. Confirm map/list linkage still behaves correctly after parameter changes.
5. For large domains, record compute latency (`meta.computeMs`) and whether truncation occurred.

# STKDE Decision Notes

These notes translate the exported experiment figures into practical prototype decisions.

## 1. Spatial bandwidth

Primary figures:

- `exp1_spatial_bw_hotspots.png`
- `exp1_spatial_bw_metrics.png`
- `exp1_stability.png`

Observed pattern:

- Small bandwidths (`200-400m`) keep hotspots sharper.
- Mid bandwidth (`750-1200m`) gives smoother clusters without the largest runtime jump.
- Large bandwidths (`2000-3000m`) cost much more and visually over-smooth local structure.

Practical choice:

- Start with `750m` as the balanced baseline.
- Consider `1200m` for broader neighborhood-level views.
- Avoid `3000m` unless the goal is explicitly macro-scale summarization.

## 2. Grid resolution

Primary figures:

- `exp3_grid_hotspots.png`
- `exp3_grid_resolution.png`

Observed pattern:

- `100m` grid is expensive and likely too fine for routine interaction.
- `250m` preserves more local detail but is still noticeably heavier.
- `500m` is a strong middle ground.
- `1500-2000m` becomes too coarse for local hotspot interpretation.

Practical choice:

- Use `500m` as the main default.
- Use `250m` only when doing focused local analysis.
- Use `1000m+` only for fast macro scans.

## 3. Kernel family

Primary figures:

- `exp4_kernel_hotspots.png`
- `exp4_kernel_metrics.png`

Observed pattern:

- The hotspot geography stays broadly similar across kernels.
- Gaussian is a sensible default because it is smooth and already matches the prototype logic.
- Alternative kernels are useful for methodological comparison, but do not appear to change conclusions dramatically in this run.

Practical choice:

- Keep Gaussian as the prototype default.
- Use side-by-side kernel figures to show robustness rather than to justify a switch.

## 4. Joint parameter region

Primary figure:

- `exp5_parameter_sweep.png`

Observed pattern:

- Fine grids paired with very large spatial bandwidths are the most computationally expensive combinations.
- Moderate grids with moderate bandwidths provide the best tradeoff region.

Practical choice:

- Safe operating zone for interactive use: `grid 400-800m` with `SBW 500-1500m`.
- Best single baseline from this run: `grid 500m`, `SBW 750m`.

## 5. Stability

Primary figure:

- `exp7_stability.png`

Observed pattern:

- The main hotspot cores recur across bootstrap resamples.
- That supports the argument that top hotspots are not purely sampling artifacts.

Practical choice:

- Use this figure in the thesis to support a robustness claim for the chosen baseline parameters.

## 6. Recommended side-by-side set for thesis discussion

If you only want a compact set of figures for writing and supervision meetings, use:

1. `thesis_summary_figure.png`
2. `exp1_spatial_bw_hotspots.png`
3. `exp3_grid_hotspots.png`
4. `exp5_parameter_sweep.png`
5. `exp7_stability.png`

## 7. Working recommendation

Recommended prototype baseline after this experiment run:

- `spatialBandwidthMeters = 750`
- `gridCellMeters = 500`
- `kernel = gaussian`
- `topK = 15`
- `minSupport = 5`

This is the best current balance between:

- readable hotspot structure
- stable comparison behavior
- reasonable compute time

# STKDE Experiment Outputs

This folder contains exported figures for parameter sensitivity experiments run on the 2020 Chicago crime subset.

## Recommended review order

1. `thesis_summary_figure.png`
2. `exp1_spatial_bw_hotspots.png`
3. `exp3_grid_hotspots.png`
4. `exp4_kernel_hotspots.png`
5. `exp5_parameter_sweep.png`
6. `exp7_stability.png`

## What each figure shows

- `kernel_functions.png`: kernel shape reference
- `exp1_spatial_bw_hotspots.png`: side-by-side hotspot maps for spatial bandwidth values
- `exp1_spatial_bw_metrics.png`: runtime and surface metrics for spatial bandwidth
- `exp1_stability.png`: hotspot overlap across adjacent spatial bandwidth settings
- `exp2_temporal_bw.png`: peak-window comparison under different temporal reporting windows
- `exp3_grid_hotspots.png`: side-by-side hotspot maps for grid cell sizes
- `exp3_grid_resolution.png`: compute and coverage tradeoffs for grid resolution
- `exp4_kernel_hotspots.png`: side-by-side hotspot maps across kernel families
- `exp4_kernel_metrics.png`: runtime and intensity differences across kernels
- `exp5_parameter_sweep.png`: 2D sweep of spatial bandwidth x grid size
- `exp6_minsupport.png`: candidate filtering effect of minSupport
- `exp7_stability.png`: bootstrap recurrence and centroid stability
- `thesis_summary_figure.png`: compact thesis-ready summary board

## Suggested thesis use

- Use `thesis_summary_figure.png` as the overview figure.
- Use one side-by-side map panel (`exp1`, `exp3`, or `exp4`) to justify parameter choice visually.
- Use `exp5_parameter_sweep.png` to justify a practical operating region.
- Use `exp7_stability.png` to support robustness claims.

## Raw results

- `all_experiment_results.csv`: tabular results exported from the experiment runner.

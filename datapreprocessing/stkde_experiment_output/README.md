# STKDE Experiment Outputs

This folder contains exported figures for parameter sensitivity experiments run on the 2020 Chicago crime subset.

The `hotspot_visuals/` figures use a smaller sampled subset to make hotspot appearance differences easier to read.

## Recommended review order

1. `visualizations/stkde_parameter_dashboard.png`
2. `visualizations/stkde_spatial_bandwidth_tradeoff.png`
3. `visualizations/stkde_grid_resolution_tradeoff.png`
4. `visualizations/stkde_kernel_comparison.png`
5. `visualizations/stkde_parameter_sweep_heatmap.png`
6. `hotspot_visuals/stkde_hotspot_spatial_bandwidth.png`
7. `hotspot_visuals/stkde_hotspot_grid_resolution.png`
8. `hotspot_visuals/stkde_hotspot_kernel_comparison.png`
9. `hotspot_visuals/stkde_hotspot_temporal_bandwidth.png`
10. `exp7_stability.png`

## What each figure shows

- `kernel_functions.png`: kernel shape reference
- `visualizations/stkde_parameter_dashboard.png`: compact overview of the key parameter sweeps
- `visualizations/stkde_spatial_bandwidth_tradeoff.png`: compute and intensity tradeoff for spatial bandwidth
- `visualizations/stkde_temporal_bandwidth_tradeoff.png`: compute and intensity tradeoff for temporal bandwidth
- `visualizations/stkde_grid_resolution_tradeoff.png`: compute and active-cell tradeoff for grid resolution
- `visualizations/stkde_kernel_comparison.png`: compute and intensity comparison across kernels
- `visualizations/stkde_parameter_sweep_heatmap.png`: joint spatial bandwidth x grid-size sweep heatmap
- `hotspot_visuals/stkde_hotspot_spatial_bandwidth.png`: appearance-focused hotspot maps for spatial bandwidth values on a data subset
- `hotspot_visuals/stkde_hotspot_temporal_bandwidth.png`: appearance-focused hotspot maps for temporal bandwidth values on a data subset
- `hotspot_visuals/stkde_hotspot_grid_resolution.png`: appearance-focused hotspot maps for grid cell sizes on a data subset
- `hotspot_visuals/stkde_hotspot_kernel_comparison.png`: appearance-focused hotspot maps across kernel families on a data subset
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

- Use `visualizations/stkde_parameter_dashboard.png` as the overview figure.
- Use `visualizations/stkde_spatial_bandwidth_tradeoff.png` and `visualizations/stkde_grid_resolution_tradeoff.png` to justify parameter choice visually.
- Use `visualizations/stkde_parameter_sweep_heatmap.png` to justify a practical operating region.
- Use `hotspot_visuals/` if you want to show how the hotspot appearance changes under different settings on a smaller, more legible subset.
- Use `exp7_stability.png` to support robustness claims.

## Raw results

- `all_experiment_results.csv`: tabular results exported from the experiment runner.

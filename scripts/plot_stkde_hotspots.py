#!/usr/bin/env python3
"""Generate visual STKDE hotspot comparison figures on a data subset."""

from __future__ import annotations

import argparse
from pathlib import Path

import matplotlib

matplotlib.use('Agg')
import matplotlib.pyplot as plt

from stkde_core import STKDEConfig, STKDEEngine, load_chicago_subset, plot_comparison_grid


SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
DEFAULT_INPUT = PROJECT_ROOT / 'data' / 'sources' / 'Crimes_-_2001_to_Present_20260114.csv'
DEFAULT_OUTPUT_DIR = PROJECT_ROOT / 'datapreprocessing' / 'stkde_experiment_output' / 'hotspot_visuals'


def save_fig(fig, path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path, dpi=300, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    return path


def make_experiment_figures(lons, lats, timestamps, output_dir: Path) -> list[Path]:
    generated: list[Path] = []

    spatial_bandwidths = [200, 400, 750, 1200, 2000, 3000]
    spatial_results = {}
    for sbw in spatial_bandwidths:
        cfg = STKDEConfig(spatial_bw_m=sbw, temporal_bw_h=24, grid_cell_m=500, top_k=15, min_support=5, time_window_h=24, kernel='gaussian')
        hotspots, _ = STKDEEngine(cfg).run(lons, lats, timestamps)
        spatial_results[f'SBW {sbw}m'] = (hotspots, cfg)
    fig = plot_comparison_grid(spatial_results, lons, lats, ncols=3, fw=5.2, fh=4.2)
    generated.append(save_fig(fig, output_dir / 'stkde_hotspot_spatial_bandwidth.png'))

    temporal_bandwidths = [4, 12, 24, 48, 72, 168]
    temporal_results = {}
    for tbw in temporal_bandwidths:
        cfg = STKDEConfig(spatial_bw_m=750, temporal_bw_h=tbw, grid_cell_m=500, top_k=15, min_support=5, time_window_h=tbw, kernel='gaussian')
        hotspots, _ = STKDEEngine(cfg).run(lons, lats, timestamps)
        temporal_results[f'TBW {tbw}h'] = (hotspots, cfg)
    fig = plot_comparison_grid(temporal_results, lons, lats, ncols=3, fw=5.2, fh=4.2)
    generated.append(save_fig(fig, output_dir / 'stkde_hotspot_temporal_bandwidth.png'))

    grid_sizes = [100, 250, 500, 750, 1000, 1500]
    grid_results = {}
    for gcm in grid_sizes:
        cfg = STKDEConfig(spatial_bw_m=750, temporal_bw_h=24, grid_cell_m=gcm, top_k=15, min_support=5, time_window_h=24, kernel='gaussian')
        hotspots, _ = STKDEEngine(cfg).run(lons, lats, timestamps)
        grid_results[f'Grid {gcm}m'] = (hotspots, cfg)
    fig = plot_comparison_grid(grid_results, lons, lats, ncols=3, fw=5.2, fh=4.2)
    generated.append(save_fig(fig, output_dir / 'stkde_hotspot_grid_resolution.png'))

    kernels = ['gaussian', 'epanechnikov', 'uniform', 'quartic', 'triangular']
    kernel_results = {}
    for kernel in kernels:
        cfg = STKDEConfig(spatial_bw_m=750, temporal_bw_h=24, grid_cell_m=500, top_k=15, min_support=5, time_window_h=24, kernel=kernel)
        hotspots, _ = STKDEEngine(cfg).run(lons, lats, timestamps)
        kernel_results[kernel.capitalize()] = (hotspots, cfg)
    fig = plot_comparison_grid(kernel_results, lons, lats, ncols=3, fw=5.2, fh=4.2)
    generated.append(save_fig(fig, output_dir / 'stkde_hotspot_kernel_comparison.png'))

    return generated


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Generate subset-based STKDE hotspot comparison figures.')
    parser.add_argument('--input-csv', type=Path, default=DEFAULT_INPUT, help=f'Crime CSV to sample from (default: {DEFAULT_INPUT})')
    parser.add_argument('--output-dir', type=Path, default=DEFAULT_OUTPUT_DIR, help=f'Output directory for hotspot figures (default: {DEFAULT_OUTPUT_DIR})')
    parser.add_argument('--sample-size', type=int, default=12000, help='Subset size for hotspot visualizations (default: 12000)')
    parser.add_argument('--year', type=int, default=2020, help='Year to sample from (default: 2020)')
    parser.add_argument('--seed', type=int, default=42, help='Random seed for sampling (default: 42)')
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)

    lons, lats, timestamps = load_chicago_subset(args.input_csv, sample_size=args.sample_size, year=args.year, seed=args.seed)
    generated = make_experiment_figures(lons, lats, timestamps, args.output_dir)

    for path in generated:
        print(path)


if __name__ == '__main__':
    main()
